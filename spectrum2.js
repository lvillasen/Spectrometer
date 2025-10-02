let calibratedLambda = null;
const data = [
  { peak: 1, wavelength: 405.4, species: "mercury" },
  { peak: 2, wavelength: 436.6, species: "mercury" },
  { peak: 3, wavelength: 487.7, species: "terbium (Tb³⁺)" },
  { peak: 4, wavelength: 542.4, species: "terbium (Tb³⁺)" },
  { peak: 5, wavelength: 546.5, species: "mercury" },
  { peak: 6, wavelength: 577.7, species: "Tb³⁺ or Hg" },
  { peak: 7, wavelength: 580.2, species: "Hg or Tb³⁺" },
  { peak: 8, wavelength: 584.0, species: "Tb³⁺ or Eu³⁺" },
  { peak: 9, wavelength: 587.6, species: "Eu³⁺ in Y₂O₃" },
  { peak: 10, wavelength: 593.4, species: "Eu³⁺ in Y₂O₃" },
  { peak: 11, wavelength: 599.7, species: "Eu³⁺ in Y₂O₃" },
  { peak: 12, wavelength: 611.6, species: "Eu³⁺ in Y₂O₃" },
  { peak: 13, wavelength: 625.7, species: "likely Tb³⁺" },
  { peak: 14, wavelength: 631.1, species: "likely Eu³⁺" },
  { peak: 15, wavelength: 650.8, species: "likely Eu³⁺" },
  { peak: 16, wavelength: 662.6, species: "likely Eu³⁺" },
  { peak: 17, wavelength: 687.7, species: "likely Eu³⁺" },
  { peak: 18, wavelength: 693.7, species: "likely Eu³⁺" },
  { peak: 19, wavelength: "707 & 709", species: "likely Eu³⁺" },
  { peak: 20, wavelength: 712.3, species: "likely Eu³⁺" },
  { peak: 21, wavelength: 760.0, species: "likely argon" },
  { peak: 22, wavelength: 811.0, species: "likely argon" },
];

let html =
  "<table><thead><tr><th>Peak #</th><th>Wavelength (nm)</th><th>Species</th></tr></thead><tbody>";
for (let row of data) {
  html += `<tr>
    <td>${row.peak}</td>
    <td>${row.wavelength}</td>
    <td>${row.species}</td>
  </tr>`;
}
html += "</tbody></table>";

document.getElementById("spectral-table").innerHTML = html;

document.getElementById("cflBlock").style.display = "none";
document.getElementById("sunBlock").style.display = "none";

document.getElementById("introBlock").style.display = "none";
document.getElementById("gratingBlock").style.display = "none";

document.getElementById("connectBlock").style.display = "none";

const calibrateBtn = document.getElementById("calibrateBtn");
calibrateBtn.style.backgroundColor = "rgb(147, 234, 17)";
calibrateBtn.addEventListener("click", getData);
calibrateBtn.textContent = "Calibrate";
const saveCSV = document.getElementById("saveCSV");

let calibrated = false;
let xAxisPixels = [];

let m = null,
  b = null;

const canvas1 = document.getElementById("canvas1");
const ctx1 = canvas1.getContext("2d");
ctx1.imageSmoothingEnabled = false; // desactiva suavizado

let combined = [];
let accumCombined = [];
let averageArray = [];
let frameCount = 0;

let weigthR = 0.33;
let weigthG = 0.33;
let weigthB = 0.34;

let currentR = [];
let currentG = [];
let currentB = [];

const h = 6.626e-34; // J·s
const c = 3e8; // m/s
const k = 1.381e-23; // J/K
const sliders = {
  R: document.getElementById("sliderR"),
  G: document.getElementById("sliderG"),
  B: document.getElementById("sliderB"),
};

const values = {
  R: document.getElementById("valR"),
  G: document.getElementById("valG"),
  B: document.getElementById("valB"),
};

const normOut = {
  R: document.getElementById("normR"),
  G: document.getElementById("normG"),
  B: document.getElementById("normB"),
};

for (let key in sliders) {
  sliders[key].addEventListener("input", updateWeights);
}

updateWeights();
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const cropCanvas = document.getElementById("cropCanvas");
const ctx = overlay.getContext("2d");
const cropCtx = cropCanvas.getContext("2d");
const realResSpan = document.getElementById("realRes");

let rect = null;
cropActive = false;
let dragging = false;
let startX, startY;

const resolutions = [
  { w: 4096, h: 2160 },
  { w: 2560, h: 1440 },
  { w: 1920, h: 1080 },
  { w: 1280, h: 720 },
  { w: 640, h: 480 },
];

let currentStream;

function startCamera() {
  const [w, h] = document
    .getElementById("resSelect")
    .value.split("x")
    .map(Number);
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }

  navigator.mediaDevices
    .getUserMedia({
      video: { width: { ideal: w }, height: { ideal: h } },
      /*
      video: {
        width: { exact: w },
        height: { exact: h },
      },
      */
    })
    .then((stream) => {
      video.srcObject = stream;

      video.addEventListener(
        "loadedmetadata",
        () => {
          overlay.width = video.videoWidth;
          overlay.height = video.videoHeight;
          overlay.style.width = "100%";
          overlay.style.height = "auto";
          video.style.width = "100%";
          video.style.height = "auto";

          realResSpan.innerText = `Resolution in Use: ${video.videoWidth} x ${video.videoHeight}`;
          requestAnimationFrame(drawOverlay);
          requestAnimationFrame(updateCrop);
        },
        { once: true }
      );
    });
}

resSelect.addEventListener("change", () => {
  rect = null;
  cropCanvas.width = 0;
  cropCanvas.height = 0;
  startCamera(resSelect.selectedIndex);
});

// Mouse events
overlay.addEventListener("mousedown", (e) => {
  const rectBounds = overlay.getBoundingClientRect();
  startX = (e.clientX - rectBounds.left) * (overlay.width / rectBounds.width);
  startY = (e.clientY - rectBounds.top) * (overlay.height / rectBounds.height);
  dragging = true;
  cropActive = false;
});

overlay.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const rectBounds = overlay.getBoundingClientRect();
  const x = (e.clientX - rectBounds.left) * (overlay.width / rectBounds.width);
  const y = (e.clientY - rectBounds.top) * (overlay.height / rectBounds.height);
  rect = {
    x: Math.min(startX, x),
    y: Math.min(startY, y),
    w: Math.abs(x - startX),
    h: Math.abs(y - startY),
  };
});

overlay.addEventListener("mouseup", () => {
  dragging = false;

  if (rect && rect.w > 0 && rect.h > 0) {
    cropCanvas.width = rect.w;
    cropCanvas.height = rect.h;

    const scale = overlay.clientWidth / overlay.width;
    cropCanvas.style.width = rect.w * scale + "px";
    cropCanvas.style.height = rect.h * scale + "px";

    cropActive = true;

    const ctx = cropCanvas.getContext("2d");
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

    accumCombined = null;
    frameCount = 0;
    averageArray = null;
  }
});

function drawOverlay() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (rect) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  requestAnimationFrame(drawOverlay);
}

function updateCrop() {
  if (!video.videoWidth || !video.videoHeight) {
    requestAnimationFrame(updateCrop);
    return;
  }

  if (!overlay.width || !overlay.height) {
    requestAnimationFrame(updateCrop);
    return;
  }

  if (rect && rect.w > 0 && rect.h > 0) {
    if (document.getElementById("invert").checked) {
      cropCtx.save();
      cropCtx.scale(-1, 1);
      cropCtx.drawImage(
        video,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        -rect.w,
        0,
        rect.w,
        rect.h
      );
      cropCtx.restore();
    } else {
      cropCtx.drawImage(
        video,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        0,
        0,
        rect.w,
        rect.h
      );
    }

    combined = getRGBColumnAverages(cropCanvas);

    if (document.getElementById("average").checked) {
      if (!accumCombined || accumCombined.length !== combined.length) {
        accumCombined = new Array(combined.length).fill(0);
        frameCount = 0;
      }

      frameCount++;
      for (let i = 0; i < combined.length; i++) {
        accumCombined[i] += combined[i];
      }
      averageArray = accumCombined.map((val) => val / frameCount);
    } else {
      averageArray = combined.slice();
      frameCount = 0;
      accumCombined = new Array(combined.length).fill(0);
    }
    drawCurve();
  }
  requestAnimationFrame(updateCrop);
}

function getRGBColumnAverages(cropCanvas) {
  const ctx = cropCanvas.getContext("2d");
  const { width, height } = cropCanvas;
  if (width === 0 || height === 0) {
    console.warn("⚠️ cropCanvas sin dimensiones válidas");
    return [];
  }
  const imageData = ctx.getImageData(0, 0, width, height).data;

  const avgR = new Array(width).fill(0);
  const avgG = new Array(width).fill(0);
  const avgB = new Array(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4; // RGBA
      avgR[x] += imageData[idx]; // Red
      avgG[x] += imageData[idx + 1]; // Green
      avgB[x] += imageData[idx + 2]; // Blue
    }
  }

  for (let x = 0; x < width; x++) {
    avgR[x] /= height;
    avgG[x] /= height;
    avgB[x] /= height;
  }

  currentR = avgR;
  currentG = avgG;
  currentB = avgB;
  const combined = currentR.map(
    (valR, i) => weigthR * valR + weigthG * currentG[i] + weigthB * currentB[i]
  );

  return combined;
}

function updateWeights() {
  let r = parseFloat(sliders.R.value);
  let g = parseFloat(sliders.G.value);
  let b = parseFloat(sliders.B.value);
  values.R.textContent = r.toFixed(2);
  values.G.textContent = g.toFixed(2);
  values.B.textContent = b.toFixed(2);

  let sum = r + g + b;
  if (sum === 0) sum = 1;
  let nr = r / sum;
  let ng = g / sum;
  let nb = b / sum;

  normOut.R.textContent = nr.toFixed(2);
  normOut.G.textContent = ng.toFixed(2);
  normOut.B.textContent = nb.toFixed(2);

  weigthR = nr;
  weigthG = ng;
  weigthB = nb;
}

function drawCurve() {
  const autoScale = document.getElementById("autoScale").checked;
  const markers = document.getElementById("markers").checked;
  const logScale = document.getElementById("logScale").checked;

  let w = averageArray.length;
  xAxisPixels = [...Array(w).keys()];

  let xToUse;
  if (calibrated && calibratedLambda) {
    xToUse = xAxisPixels.map((px) => calibratedLambda(px));
  } else {
    xToUse = xAxisPixels;
  }

  const data = {
    x: xToUse,
    y: averageArray,
    type: "scatter",
    mode: markers ? "lines+markers" : "lines",
    name: "Intensidad",
    line: { color: "black" },
    hovertemplate: "x: %{x:.2f}<br>Int: %{y:.1f}<extra></extra>",
    ...(markers && { marker: { size: 4, color: "blue" } }), // solo agrega marker si markers es true
  };

  const layout = {
    margin: { t: 10, b: 40, l: 40, r: 10 },
    xaxis: {
      title: calibrated ? "Wavelength (nm)" : "Pixel X",
      showgrid: true,
      gridcolor: "rgba(0,0,0,0.1)",
      gridwidth: 2,
    },
    yaxis: {
      title: "Intensity",
      type: logScale ? "log" : "linear",
      range: autoScale ? undefined : logScale ? [0, 2.4] : [0, 255],
      autorange: autoScale,
    },
    hovermode: "x unified",
    showlegend: true,
  };

  if (document.getElementById("peaks").checked === true) {
    let maxima = [];
    for (let i = 1; i < averageArray.length - 1; i++) {
      if (
        averageArray[i] > averageArray[i - 1] &&
        averageArray[i] > averageArray[i + 1]
      ) {
        maxima.push({ x: xToUse[i], y: averageArray[i] });
      }
    }

    maxima.forEach((max) => {
      layout.shapes.push({
        type: "line",
        x0: max.x,
        x1: max.x,
        y0: 0,
        y1: max.y,
        line: { color: "red", width: 1, dash: "dot" },
      });
    });
  }

  if (document.getElementById("pause").checked) {
    return;
  } else {
    Plotly.react("plot", [data], layout, { staticPlot: false });
    if (calibrated) {
      spectrum();
      drawScale();
    }
  }
}

function spectrum() {
  const width = canvas1.width;
  const height = canvas1.height;
  ctx1.clearRect(0, 0, width, height);
  ctx1.fillStyle = "white";
  ctx1.fillRect(0, 0, width, height);

  let xToUse;
  if (calibrated && calibratedLambda) {
    xToUse = xAxisPixels.map((px) => calibratedLambda(px));
  } else {
    xToUse = xAxisPixels;
  }

  xMin = xToUse[0];
  xMax = xToUse[xToUse.length - 1];
  yMin = 0;
  yMax = Math.max(...averageArray) * 1.1;

  const gradient = ctx1.createLinearGradient(0, 0, width, 0);
  for (let i = 0; i < xToUse.length; i++) {
    const xCanvas = ((xToUse[i] - xMin) / (xMax - xMin)) * width;
    const color = wavelengthToHSL(xToUse[i]);
    gradient.addColorStop(xCanvas / width, color);
  }
  ctx1.fillStyle = gradient;

  ctx1.beginPath();
  ctx1.moveTo(0, height);
  for (let i = 0; i < xToUse.length; i++) {
    const xCanvas = ((xToUse[i] - xMin) / (xMax - xMin)) * width;
    const yVal = averageArray[i];
    const yCanvas = height - ((yVal - yMin) / (yMax - yMin)) * height;
    ctx1.lineTo(xCanvas, yCanvas);
  }

  ctx1.lineTo(width, height);
  ctx1.closePath();
  ctx1.fill();

  const gridScale = parseInt(document.getElementById("gridScale").value);
  ctx1.lineWidth = 1;

  ctx1.beginPath();
  let prevX = ((xToUse[0] - xMin) / (xMax - xMin)) * width;
  let prevY = height - ((averageArray[0] - yMin) / (yMax - yMin)) * height;
  ctx1.moveTo(prevX, prevY);
  for (let i = 1; i < xToUse.length; i++) {
    const xCanvas = ((xToUse[i] - xMin) / (xMax - xMin)) * width;
    const yVal = averageArray[i];
    const yCanvas = height - ((yVal - yMin) / (yMax - yMin)) * height;

    ctx1.lineTo(xCanvas, yCanvas);
  }

  ctx1.strokeStyle = "black";

  ctx1.stroke();

  if (calibrated && gridScale > 0) {
    ctx1.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx1.lineWidth = 1;
    ctx1.setLineDash([5, 5]);

    const startNm = Math.ceil(xMin / gridScale) * gridScale;

    for (let nm = startNm; nm <= xMax; nm += gridScale) {
      const xCanvas = ((nm - xMin) / (xMax - xMin)) * width;

      if (xCanvas >= 0 && xCanvas <= width) {
        ctx1.beginPath();
        ctx1.moveTo(xCanvas, 0);
        ctx1.lineTo(xCanvas, height);
        ctx1.stroke();
      }
    }
  }

  ctx1.setLineDash([]);
}

function drawScale() {
  const scaleCanvas = document.getElementById("scaleCanvas");
  const ctxScale = scaleCanvas.getContext("2d");
  const width = scaleCanvas.width;
  const height = scaleCanvas.height;

  ctxScale.clearRect(0, 0, width, height);
  ctxScale.fillStyle = "white";
  ctxScale.fillRect(0, 0, width, height);

  let xToUse;
  if (calibrated && calibratedLambda) {
    xToUse = xAxisPixels.map((px) => calibratedLambda(px));
  } else {
    xToUse = xAxisPixels;
  }

  xMin = xToUse[0];
  xMax = xToUse[xToUse.length - 1];
  yMin = 0;
  yMax = Math.max(...averageArray) * 1.1;

  ctxScale.fillStyle = "black";
  ctxScale.font = "14px sans-serif";
  ctxScale.textAlign = "center";

  const yOffset = 15;

  if (calibrated) {
    const stepNm = 20;

    const startNm = Math.ceil(xMin / stepNm) * stepNm;

    for (
      let valueNm = startNm + stepNm;
      valueNm <= xMax - stepNm;
      valueNm += stepNm
    ) {
      const xCanvas = ((valueNm - xMin) / (xMax - xMin)) * width;

      if (xCanvas >= 0 && xCanvas <= width) {
        ctxScale.beginPath();
        ctxScale.moveTo(xCanvas, yOffset + 5);
        ctxScale.lineTo(xCanvas, yOffset - 5);
        ctxScale.strokeStyle = "black";
        ctxScale.stroke();

        ctxScale.fillText(valueNm.toFixed(0), xCanvas, yOffset + 20);
      }
    }
  } else {
    const numTicks = 10;

    for (let t = 1; t <= numTicks - 1; t++) {
      const frac = t / numTicks;
      const x = frac * width;
      const value = xMin + frac * (xMax - xMin);

      ctxScale.beginPath();
      ctxScale.moveTo(x, yOffset + 5);
      ctxScale.lineTo(x, yOffset - 5);
      ctxScale.strokeStyle = "black";
      ctxScale.stroke();

      ctxScale.fillText(value.toFixed(0), x, yOffset + 20);
    }
  }

  ctxScale.fillText(
    calibrated ? "Wavelength (nm)" : "Pixels",
    width / 2,
    yOffset + 40
  );
}

function wavelengthToHSL(wavelength) {
  if (wavelength < 400 || wavelength > 700) {
    return "hsl(0, 0%, 50%)";
  }

  // mapear [400,650] → [240,0]
  const clamped = Math.min(wavelength, 650);
  const hue = 240 - ((clamped - 400) / 250) * 240;

  return `hsl(${hue}, 100%, 50%)`;
}

document.getElementById("saveCSV").addEventListener("click", function () {
  saveCSV.style.backgroundColor = "red";

  setTimeout(() => {
    saveCSV.style.backgroundColor = "rgb(147, 234, 17)";
  }, 500);

  let nombre = getTime();

  let w = averageArray.length;
  xAxisPixels = [...Array(w).keys()];

  let xToUse;
  let contenido;
  if (calibrated && m !== null && b !== null) {
    xToUse = xAxisPixels.map((px) => Number(m * px + b));
    contenido = "Wavelength (nm),Intensity (AU)\n";
  } else {
    xToUse = xAxisPixels;
    contenido = "Pixel Number,Intensity (AU)\n";
  }

  for (let i = 0; i < xToUse.length; i++) {
    contenido += `${xToUse[i].toFixed(2)},${averageArray[i].toFixed(2)}\n`;
  }

  let blob = new Blob([contenido], { type: "text/csv" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = nombre + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
function getTime() {
  let ahora = new Date();
  let dd = String(ahora.getDate()).padStart(2, "0");
  let mm = String(ahora.getMonth() + 1).padStart(2, "0"); // Mes empieza en 0
  let yyyy = ahora.getFullYear();
  let hh = String(ahora.getHours()).padStart(2, "0");
  let min = String(ahora.getMinutes()).padStart(2, "0");
  let ss = String(ahora.getSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy}-${hh}-${min}-${ss}`;
}

function saveCalibration() {
  const numPointsSelect = document.getElementById("numPoints");
  const numPoints = parseInt(numPointsSelect.value);

  // 1. Guardar los datos de calibración dinámicamente
  const calibPoints = [];
  let success = true;

  for (let i = 0; i < numPoints; i++) {
    const pixelInput = document.getElementById(`px${i}`);
    const lambdaInput = document.getElementById(`lam${i}`);

    // Verificación básica de que los inputs existen y tienen valor
    if (pixelInput && lambdaInput && pixelInput.value && lambdaInput.value) {
      calibPoints.push({
        pixel: parseFloat(pixelInput.value),
        lambda: parseFloat(lambdaInput.value),
      });
    } else {
      success = false;
      console.error(`Error: No se encontró el valor para el punto ${i + 1}`);
      alert(
        "Error: Asegúrate de que todos los puntos de calibración estén visibles y tengan valores."
      );
      break;
    }
  }

  if (!success) return; // Detener si hubo un error

  // 2. Estructura final del objeto a guardar
  const calibration = {
    // Almacena la configuración del ROI
    rect: rect,
    // Almacena el número de puntos usados para la calibración (2, 3, o 4)
    order: numPoints,
    // Almacena el array con los pares (pixel, lambda)
    points: calibPoints,
    // Guarda la marca de tiempo en UTC
    timestamp: new Date().toISOString(),
  };

  // 3. Proceso de descarga (igual que antes)

  const blob = new Blob([JSON.stringify(calibration, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  // === Generar nombre con fecha/hora UTC ===
  const now = new Date();
  const utcString = now.toISOString().replace(/[:.]/g, "-");

  // Nombre de archivo más específico
  const filename = `calib_N${numPoints}_${utcString}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  alert("Calibración (Orden " + numPoints + ") guardada como " + filename);
}

// Asociar el botón
document
  .getElementById("saveCalibBtn")
  .addEventListener("click", saveCalibration);

// Función de carga de calibración
function loadCalibrationFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const calibration = JSON.parse(e.target.result);

      // Verificación de estructura moderna
      if (!calibration.rect || !calibration.points || !calibration.order) {
        throw new Error(
          "El archivo no tiene la estructura de calibración esperada."
        );
      }

      const numPoints = calibration.order;
      const points = calibration.points;

      // 1. Restaurar el rectángulo ROI global
      rect = calibration.rect;

      // 2. Configurar el número de puntos en el SELECT
      const numPointsSelect = document.getElementById("numPoints");
      numPointsSelect.value = numPoints;

      // 3. Crear dinámicamente los inputs para el número de puntos cargado
      // Esto llama a tu función modificada que genera px0, lam0, px1, lam1, etc.
      createInputs(numPoints);

      // 4. Rellenar los valores en los inputs recién creados
      for (let i = 0; i < numPoints; i++) {
        const pixelValue = points[i].pixel;
        const lambdaValue = points[i].lambda;

        // Asignar valores
        document.getElementById(`px${i}`).value = pixelValue;
        document.getElementById(`lam${i}`).value = lambdaValue;
      }

      // 5. Ajustar cropCanvas al ROI cargado y activar el procesamiento
      if (rect.w > 0 && rect.h > 0) {
        cropCanvas.width = rect.w;
        cropCanvas.height = rect.h;
        cropActive = true;

        // Escalar el canvas recortado para visualización
        const overlayElement = document.getElementById("overlay");
        const scale = overlayElement.clientWidth / overlayElement.width;
        cropCanvas.style.width = rect.w * scale + "px";
        cropCanvas.style.height = rect.h * scale + "px";
      }

      // 6. Recalcular calibración
      // Asumo que tu función para calcular los coeficientes de calibración es getData()
      getData();

      // Feedback visual
      //alert(`Calibración cargada con ${numPoints} puntos.\nGuardada en UTC: ${calibration.timestamp}`);
    } catch (error) {
      alert(`Error al cargar el archivo de calibración: ${error.message}`);
      console.error(error);
    }
  };

  reader.readAsText(file);

  // Limpiar input para poder volver a elegir el mismo archivo
  event.target.value = "";
}

// Asociar input oculto
const loadCalibFile = document.getElementById("loadCalibFile");
loadCalibFile.addEventListener("change", loadCalibrationFromFile);

// Botón que dispara el diálogo
document.getElementById("loadCalibBtn").addEventListener("click", () => {
  loadCalibFile.click();
});

function loadCalibration(data) {
  rect = data.rect;
  m = data.m;
  b = data.b;
  calibrated = data.calibrated;

  // recalcular tamaño del cropCanvas en relación al overlay
  cropCanvas.width = rect.w;
  cropCanvas.height = rect.h;

  const scale = overlay.clientWidth / overlay.width;
  cropCanvas.style.width = rect.w * scale + "px";
  cropCanvas.style.height = rect.h * scale + "px";

  // cambiar color del botón calibrate
  calibrateBtn.style.backgroundColor = calibrated ? "rgb(147, 234, 17)" : "red";
  calibrateBtn.textContent = calibrated ? "Re-Calibrate" : "Calibrate";
}

const numPointsSelect = document.getElementById("numPoints");
const inputsDiv = document.getElementById("inputs");

// Asigna el estilo de Flexbox al contenedor principal
inputsDiv.style.display = "flex";
inputsDiv.style.justifyContent = "space-between";
inputsDiv.style.gap = "20px";

function createInputs(num) {
  inputsDiv.innerHTML = ""; // limpiar

  // 1. Definir los rangos de inicio y fin
  const pixelRange = averageArray.length > 0 ? averageArray.length - 1 : 800; // Máximo índice de píxel (N-1)
  const lambdaMin = 400; // nm
  const lambdaMax = 700; // nm

  // Función auxiliar para obtener un valor interpolado uniformemente
  const getUniformValue = (start, end, index, totalPoints) => {
    if (totalPoints <= 1) return start;
    // La fórmula para espaciar 'totalPoints' uniformemente entre 'start' y 'end'
    return start + (end - start) * (index / (totalPoints - 1));
  };

  for (let i = 0; i < num; i++) {
    // 2. Calcular los valores iniciales para este punto (i)

    // Píxel: desde 0 hasta pixelRange (longitud-1)
    const initialPixel = Math.round(getUniformValue(0, pixelRange, i, num));

    // Lambda: desde 400 hasta 700
    const initialLambda = getUniformValue(lambdaMin, lambdaMax, i, num).toFixed(
      1
    );

    const div = document.createElement("div");
    div.className = "point";

    // Aplica el estilo Flexbox a cada "point"
    div.style.display = "flex";
    div.style.flexDirection = "column";

    // 3. Asignar los valores iniciales al atributo 'value' del input
    div.innerHTML = `
      <div>
        <label>Pixel ${i + 1}:</label>
        <input type="number" id="px${i}" step="1" value="${initialPixel}">
      </div>
      <div>
        <label>λ ${i + 1}:</label>
        <input type="number" id="lam${i}" step="0.1" value="${initialLambda}">
      </div>
    `;
    inputsDiv.appendChild(div);
  }
}

numPointsSelect.addEventListener("change", () => {
  createInputs(parseInt(numPointsSelect.value));
});

function getData() {
  if (calibrated) {
    calibrated = false;
    document.getElementById("calibrateBtn").textContent = "Calibrate";
    calibrateBtn.style.backgroundColor = "rgb(147, 234, 17)";
  } else {
    // 1. Obtener los valores de los inputs
    const num = parseInt(numPointsSelect.value);
    const pixelPoints = [];
    const lambdaPoints = [];

    for (let i = 0; i < num; i++) {
      // Asumiendo que has capturado los IDs correctamente:
      pixelPoints.push(parseFloat(document.getElementById(`px${i}`).value));
      lambdaPoints.push(parseFloat(document.getElementById(`lam${i}`).value));
    }

    // 2. Ejecutar el ajuste de calibración
    try {
      // 🔥 Aquí se llama a la función que devuelve el ajuste
      calibratedLambda = fitCalib(pixelPoints, lambdaPoints);

      // 3. Marcar la calibración como exitosa
      calibrated = true;

      // Opcional: Si quieres guardar los coeficientes para inspección
      // m = coefficients[1]; // Pendiente, si es lineal.
      // b = coefficients[0]; // Intercepto, si es lineal.

      // Actualizar la interfaz (color del botón, mensaje, etc.)
      calibrateBtn.textContent = "Re-Calibrate";
      calibrateBtn.style.backgroundColor = "red";
    } catch (e) {
      console.error("Error durante la calibración:", e.message);
      calibratedLambda = null; // Asegurar que no se usa una función rota
      calibrated = false;
      // Mostrar un error al usuario...
    }
  }
}

function introBlock() {
  const elementOut = document.getElementById("introBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}
function gratingBlock() {
  const elementOut = document.getElementById("gratingBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}
function connectBlock() {
  const elementOut = document.getElementById("connectBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
    // Inicializa
    //startCamera(resSelect.selectedIndex);
  } else {
    elementOut.style.display = "none";
  }
}
function cflBlock() {
  var elementOut = document.getElementById("cflBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}
function sunBlock() {
  var elementOut = document.getElementById("sunBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}

function fitCalib(pixels, lambdas) {
  const N = pixels.length;

  if (N < 2 || N > 4 || pixels.length !== lambdas.length) {
    throw new Error(
      "Se requieren 2, 3 o 4 pares de (pixel, lambda) para la calibración."
    );
  }
  function solveLinearSystem(A, b) {
    const M = [];
    for (let i = 0; i < N; i++) {
      M[i] = A[i].slice();
      M[i].push(b[i]);
    }

    for (let k = 0; k < N; k++) {
      let i_max = k;
      for (let i = k + 1; i < N; i++) {
        if (Math.abs(M[i][k]) > Math.abs(M[i_max][k])) {
          i_max = i;
        }
      }
      [M[k], M[i_max]] = [M[i_max], M[k]]; // Intercambio de filas

      for (let i = k + 1; i < N; i++) {
        const f = M[i][k] / M[k][k];
        for (let j = k; j < N + 1; j++) {
          M[i][j] -= M[k][j] * f;
        }
      }
    }

    const x = new Array(N);
    for (let i = N - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < N; j++) {
        sum += M[i][j] * x[j];
      }
      x[i] = (M[i][N] - sum) / M[i][i];
    }
    return x; // Array de coeficientes [c0, c1, c2, ...]
  }

  const A = [];
  for (let i = 0; i < N; i++) {
    A[i] = [];
    for (let j = 0; j < N; j++) {
      A[i][j] = Math.pow(pixels[i], j);
    }
  }

  const coefficients = solveLinearSystem(A, lambdas);

  return function (p) {
    let lambda = 0;
    for (let i = 0; i < N; i++) {
      lambda += coefficients[i] * Math.pow(p, i);
    }
    return lambda;
  };
}

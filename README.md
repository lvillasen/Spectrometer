# Visualizing and Analyzing Light Spectra with a Webcam-Based Spectrometer
Web app to visualize and analyze data webcam-based spectrometer

## Features of this Web Application

### A. Video & Region of Interest (ROI) Controls

- **Resolution Selection:** A dropdown menu allows the user to choose the webcam's video resolution (e.g., 1920x1080, 640x480). The app displays the **"Resolution in Use"** in real-time.
- **ROI Definition:** Users click and drag on the live video feed to define a red bounding box, the **Region of Interest**, to isolate the spectral stripe for analysis.
- **Cropped View:** A dedicated canvas shows the live image data only from the **Selected Region**, confirming the area being analyzed.
- **Invert:** A checkbox to horizontally **invert** the video and cropped image, useful if the spectrometer optics flip the spectrum.

---

### B. Signal Processing & Weighting

This controls how the three color channels (RGB) are combined to produce a single intensity value.

- **RGB Weights (Pesos RGB):** Three range sliders allow the user to adjust the weight (0.00 to 1.00) for the **Red (R)**, **Green (G)**, and **Blue (B)** channels.
- **Normalized Weights:** Displays the final, normalized weights (where R + G + B = 1) used in the intensity calculation.

---

### C. Spectrum Plot Controls

These options manage the real-time visualization and basic analysis of the spectrum data.

| Control       | Function                                                                 |
|---------------|-------------------------------------------------------------------------|
| **Markers**   | Toggles the display of individual data points along the spectrum line. |
| **Auto Scale**| Automatically adjusts the Y-axis (Intensity) range based on the live data. |
| **Peaks**     | Automatically detects local maxima in the spectrum and marks them with vertical red dotted lines. |
| **Pause**     | Freezes the real-time data acquisition and plot updates.               |
| **Average**   | Activates frame averaging, accumulating data from multiple video frames to significantly reduce signal noise. |

---

### D. Calibration Pixel/Wavelength

- **Number of Points for Calibration:** A dropdown to select the number of reference points (2, 3, or 4) required for the calibration curve.
- **Calibration Inputs:** Dynamic input fields are generated for the user to enter known **Pixel X** coordinates and their corresponding **Wavelengths (nm)** (e.g., from a calibration lamp).
- **Calibrate Button:** Executes the calculation to transform the X-axis from pixels into physical **Wavelength (nm)**.
- **Save/Load Calibration:** Buttons to save the calibration factors as a JSON file and load a previously saved calibration file.
- **Save CSV File:** Exports the current spectral data (X-axis values and Intensity) into a CSV file for external analysis.

**This web application does not calibrate the light intensity (maybe in a next version).**

---

### E. Visual Display

A secondary visualization area used for detailed display after calibration.

- **Spectrum Fill:** When calibrated, the canvas fills the area under the curve with colors corresponding to the calculated wavelength, creating a visual spectrum.
- **Flexible X-Axis grid.**
- **Scale Canvas:** A separate canvas that draws the X-axis scale.



## Live Demo

https://ciiec.buap.mx/Spectrum2
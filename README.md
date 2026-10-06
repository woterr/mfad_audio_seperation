# mfad_audio_seperation

cd /mnt/shared/Projects/audio_seperation

.venv/bin/python app.py
# Audio Source Separation Using Linear Algebra

This application takes two independent mono audio signals (speech and piano music), mixes them into three virtual microphone recordings using a known 3×2 linear mixing matrix, and then mathematically recovers the original source signals from the mixed recordings.


## Core Mathematical Concepts

The project emphasizes explicit matrix operations over black-box digital signal processing libraries.

### 1. Source Signal Representation
Two independent 1D audio signals—speech ($s_1$) and piano ($s_2$)—are trimmed/padded to equal length $N$ and stacked into a matrix $S$:

$$S = \begin{bmatrix} s_1 \\ s_2 \end{bmatrix} \in \mathbb{R}^{2 \times N}$$

### 2. Linear Transformation (Mixing)
A fixed 3×2 mixing matrix $A$ simulates spatial acoustic mixing across three virtual microphones:

$$A = \begin{bmatrix} 0.8 & 0.2 \\ 0.3 & 0.9 \\ 0.6 & 0.5 \end{bmatrix}$$

The virtual microphone matrix $X \in \mathbb{R}^{3 \times N}$ is computed by matrix multiplication:

$$X = A S$$

### 3. Singular Value Decomposition (SVD)
Because $A$ is non-square (3×2), it cannot be inverted directly. We perform SVD on $A$:

$$A = U \Sigma V^T$$

Where:
* $U \in \mathbb{R}^{3 \times 3}$ is orthogonal (left singular vectors).
* $\Sigma \in \mathbb{R}^{3 \times 2}$ is a rectangular diagonal matrix containing singular values $\sigma_1, \sigma_2$.
* $V^T \in \mathbb{R}^{2 \times 2}$ is orthogonal (right singular vectors transposed).

### 4. Moore-Penrose Pseudoinverse Construction
To recover $S$ from $X$, we construct the pseudoinverse $A^+$ explicitly:
1. Compute the reciprocal of all non-zero singular values in $\Sigma$.
2. Transpose the dimensions to obtain $\Sigma^+ \in \mathbb{R}^{2 \times 3}$:

$$\Sigma^+ = \begin{bmatrix} 1/\sigma_1 & 0 & 0 \\ 0 & 1/\sigma_2 & 0 \end{bmatrix}$$

3. Compute the pseudoinverse $A^+ \in \mathbb{R}^{2 \times 3}$:

$$A^+ = V \Sigma^+ U^T$$

### 5. Source Recovery & Reconstruction Error
The estimated source matrix $\hat{S}$ is recovered via:

$$\hat{S} = A^+ X$$

To measure precision, we evaluate the reconstruction residual $E$ and its Frobenius norm:

$$E = X - A \hat{S}$$

---

## Audio Files (`.wav` Files)

The project relies on local `.wav` files stored in the repository.

| File Name | Matrix Representation | Role & Description |
| :--- | :--- | :--- |
| `speech.wav` | $S[0, :]$ | Clean original speech recording (Source 1). |
| `piano.wav` | $S[1, :]$ | Clean original piano music recording (Source 2). |
| `mic1.wav` | $X[0, :]$ | Microphone 1 recording: $0.8 \cdot \text{speech} + 0.2 \cdot \text{piano}$. |
| `mic2.wav` | $X[1, :]$ | Microphone 2 recording: $0.3 \cdot \text{speech} + 0.9 \cdot \text{piano}$. |
| `mic3.wav` | $X[2, :]$ | Microphone 3 recording: $0.6 \cdot \text{speech} + 0.5 \cdot \text{piano}$. |
| `recovered_speech.wav` | $\hat{S}[0, :]$ | Reconstructed speech audio extracted via $A^+ X$. |
| `recovered_piano.wav` | $\hat{S}[1, :]$ | Reconstructed piano audio extracted via $A^+ X$. |

---

## Repository Structure

```text
 separation/
 ├── audio.py              # Audio I/O, sample rate alignment, normalization
 ├── linear_algebra.py     # Explicit SVD, pseudoinverse, and matrix math
 ├── pipeline.py           # End-to-end separation execution pipeline
 ├── app.py                # Web server exposing API endpoints
 ├── speech.wav            # Input Source 1
 ├── piano.wav             # Input Source 2
 ├── mic1.wav              # Generated Microphone 1
 ├── mic2.wav              # Generated Microphone 2
 ├── mic3.wav              # Generated Microphone 3
 ├── recovered_speech.wav  # Output Recovered Source 1
 ├── recovered_piano.wav   # Output Recovered Source 2
 ├── static/               # Frontend HTML, CSS, and Vanilla JS
 └── requirements.txt      # Project dependencies (NumPy, SciPy, Flask)
Detailed Code Explanationlinear_algebra.pyContains all explicit matrix math functions.compute_svd_pinv(A): Computes SVD using np.linalg.svd(A, full_matrices=True) to obtain $U$, singular values $\sigma$, and $V^T$. Manually constructs the 2×3 matrix $\Sigma^+$ by placing reciprocal values $1/\sigma_i$ along the diagonal. Explicitly multiplies $V \cdot \Sigma^+ \cdot U^T$ to construct $A^+$.mix_sources(A, S): Performs matrix multiplication $X = A @ S$.recover_sources(A_pinv, X): Multiplies $\hat{S} = A^+ @ X$.compute_reconstruction_error(X, A, S_hat): Computes error matrix $E = X - A \hat{S}$ and its Frobenius norm.audio.pyHandles audio signal preparation and file I/O operations.load_and_preprocess_audio(filepath): Reads WAV files, converts multi-channel to mono, and normalizes into floating-point representation between $[-1.0, 1.0]$.align_signals(signal1, signal2): Ensures both signals have identical length $N$ via padding/trimming.save_wav(filepath, sample_rate, data): Normalizes peak amplitudes safely before writing 16-bit PCM WAV files.pipeline.pyOrchestrates the full scientific experiment from end to end. Loads audio, constructs the matrices, computes the SVD pipeline, saves the output .wav files, and returns the numerical data and downsampled waveforms for the frontend.app.pyA lightweight Flask web application server. Serves static frontend assets and exposes the /api/run endpoint that triggers pipeline.py and returns the JSON payload to the UI.static/Vanilla HTML5, CSS3, and JavaScript frontend. Renders signal shapes using HTML5 Canvas elements fed by downsampled waveform data and uses native browser HTML5 audio elements for playback.


# Audio Source Separation Using Linear Algebra


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

### 4. Pseudoinverse Construction
To recover $S$ from $X$, we construct the pseudoinverse $A^+$ explicitly:
1. Compute the reciprocal of all non-zero singular values in $\Sigma$.
2. Transpose the dimensions to obtain $\Sigma^+ \in \mathbb{R}^{2 \times 3}$:

```
Σ =

[σ₁  0
 0   σ₂
 0   0]
```

```
Σ⁺ =

[1/σ₁   0    0
 0     1/σ₂  0]
```

For the above mixing matrix, the pseudoinverse matrix is:
```
A⁺ =
[ 1.1019   -0.4909    0.4429 ]
[-0.5495    1.1440    0.1606 ]
```

3. Compute the pseudoinverse $A^+ \in \mathbb{R}^{2 \times 3}$:

$$A^+ = V \Sigma^+ U^T$$

### 5. Source Recovery & Reconstruction Error
The estimated source matrix $\hat{S}$ is recovered via:

$$\hat{S} = A^+ X$$

To measure precision, we evaluate the reconstruction residual $E$ and its Frobenius norm:

$$E = X - A \hat{S}$$

---

## Audio Files (`.wav` Files)

The project relies on local `.wav` files stored in the repository. You can play the audio directly below.

*(Note: If the audio player does not render in your markdown viewer, you can click the file names to view them directly).*

| File Name | Play Audio | Matrix Representation | Role & Description |
| :--- | :--- | :--- | :--- |
| `speech.wav` | <audio controls src="https://raw.githubusercontent.com/woterr/mfad_audio_seperation/main/speech.wav"></audio> | $S[0, :]$ | Clean original speech recording (Source 1). |
| `piano.wav` | <audio controls src="https://raw.githubusercontent.com/woterr/mfad_audio_seperation/main/piano.wav"></audio> | $S[1, :]$ | Clean original piano music recording (Source 2). |
| `mic1.wav` | <audio controls src="https://raw.githubusercontent.com/woterr/mfad_audio_seperation/main/mic1.wav"></audio> | $X[0, :]$ | Microphone 1: $0.8 \cdot \text{speech} + 0.2 \cdot \text{piano}$. |
| `mic2.wav` | <audio controls src="https://raw.githubusercontent.com/woterr/mfad_audio_seperation/main/mic2.wav"></audio> | $X[1, :]$ | Microphone 2: $0.3 \cdot \text{speech} + 0.9 \cdot \text{piano}$. |
| `mic3.wav` | <audio controls src="https://raw.githubusercontent.com/woterr/mfad_audio_seperation/main/mic3.wav"></audio> | $X[2, :]$ | Microphone 3: $0.6 \cdot \text{speech} + 0.5 \cdot \text{piano}$. |
| `recovered_speech.wav` | <audio controls src="https://raw.githubusercontent.com/woterr/mfad_audio_seperation/main/recovered_speech.wav"></audio> | $\hat{S}[0, :]$ | Reconstructed speech audio extracted via $A^+ X$. |
| `recovered_piano.wav` | <audio controls src="https://raw.githubusercontent.com/woterr/mfad_audio_seperation/main/recovered_piano.wav"></audio> | $\hat{S}[1, :]$ | Reconstructed piano audio extracted via $A^+ X$. |

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

static/               # Frontend HTML, CSS, and Vanilla JS
requirements.txt      # Project dependencies (NumPy, SciPy, Flask)

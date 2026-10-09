
# Audio Source Separation Using Linear Algebra
<img width="1295" height="1051" alt="image" src="https://github.com/user-attachments/assets/43cf8dcc-9d2d-4032-b250-c0c2ad72af65" />


## Core Mathematical Concepts

The project emphasizes explicit matrix operations over black-box digital signal processing libraries.

### 1. Source Signal Representation
Two independent 1D audio signals—speech ($s_1$) and piano ($s_2$)—are trimmed to a common length $N$ and stacked into a matrix $S$:

$$S = \begin{bmatrix} s_1 \\ s_2 \end{bmatrix} \in \mathbb{R}^{2 \times N}$$

### 2. Linear Transformation (Mixing)
A fixed 3×2 mixing matrix $A$ simulates spatial acoustic mixing across three virtual microphones:

$$A = \begin{bmatrix} 0.8 & 0.2 \\ 0.3 & 0.9 \\ 0.6 & 0.5 \end{bmatrix}$$

The virtual microphone matrix $X \in \mathbb{R}^{3 \times N}$ is computed by matrix multiplication:

$$X = A S$$

### 3. Noisy Microphone
In a real recording the microphones are not perfect, so the clean matrix $X_{\text{clean}}$ is not what we actually observe. The pipeline adds a small amount of Gaussian noise to simulate imperfect measurement:

$$X = A S + N$$

where $N \in \mathbb{R}^{3 \times N}$ contains independent Gaussian noise with mean $0$ and standard deviation $0.01$.

The important points are:

1. The noise is added **after** the mixing, not to the source recordings. It represents noise introduced by the microphones themselves, not noise already present in the speech or the piano.
2. It is added **before** the recovery step, so the recovery only ever sees the noisy observations $X$. It is never told the noise is there.
3. Because $X$ now contains noise, the recovered sources will generally **not** reproduce $X$ exactly. An exact solution to $A S = X$ no longer exists.

The noise level is deliberately small relative to the audio, so the recovery is still clearly audible and the waveforms still look almost identical. Its effect is easy to see in the numbers rather than the ear: the reconstruction error below is small and nonzero, rather than numerically zero.

### 4. Singular Value Decomposition (SVD)
Because $A$ is non-square (3×2), it cannot be inverted directly. We perform SVD on $A$:

$$A = U \Sigma V^T$$

Where:
* $U \in \mathbb{R}^{3 \times 3}$ is orthogonal (left singular vectors).
* $\Sigma \in \mathbb{R}^{3 \times 2}$ is a rectangular diagonal matrix containing singular values $\sigma_1, \sigma_2$.
* $V^T \in \mathbb{R}^{2 \times 2}$ is orthogonal (right singular vectors transposed).

### 5. Pseudoinverse Construction
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

### 6. Source Recovery & Reconstruction Error
The estimated source matrix $\hat{S}$ is recovered via:

$$\hat{S} = A^+ X$$

This is the part where the noise matters. Without noise the system $A S = X$ is exactly consistent, so $A^+$ recovers $S$ perfectly. With noise there is generally no matrix that satisfies $A S = X$ exactly, so the recovery becomes a **least squares** problem: $A^+$ returns the estimate $\hat{S}$ that minimises the squared reconstruction error,

$$\hat{S} = \arg\min_{S} \; \lVert A S - X \rVert_F^2$$

The Moore-Penrose pseudoinverse *is* the solution to that problem. We never call a least squares routine — the property is built into $A^+$, which is precisely why the project constructs it explicitly.

To measure how closely the recovered sources reproduce the noisy microphone observations, we evaluate the reconstruction residual $E$ and its Frobenius norm:

$$E = X - A \hat{S} \qquad \lVert E \rVert_F = \sqrt{\sum_{i,j} E_{ij}^2}$$

$\lVert E \rVert_F$ is therefore a small but nonzero value, roughly $5.5$. The component of the noise that lies along the columns of $A$ gets absorbed into the recovered sources and cannot be removed; what remains is the part orthogonal to that subspace, which no choice of $\hat{S}$ could have explained. In the clean noiseless case this quantity would be approximately $1 \times 10^{-14}$, i.e. pure floating point rounding. The gap between those two numbers is the effect of the noise, and it is a more honest measure of the recovery than an error of zero would be.

---

## Audio Files (`.wav` Files)

The project relies on local `.wav` files stored in the repository. You can play the audio directly below.

`speech.wav` and `piano.wav` are clean originals. The three microphone files are noisy simulated recordings. The recovered files are least squares estimates recovered from those noisy microphones.

| File Name | Matrix Representation | Role & Description |
| :--- | :--- | :--- |
| `speech.wav` | $S[0, :]$ | Clean original speech recording (Source 1). |
| `piano.wav` | $S[1, :]$ | Clean original piano music recording (Source 2). |
| `mic1.wav` | $X[0, :]$ | Noisy simulated microphone 1: $0.8 \cdot \text{speech} + 0.2 \cdot \text{piano} + \text{noise}$. |
| `mic2.wav` | $X[1, :]$ | Noisy simulated microphone 2: $0.3 \cdot \text{speech} + 0.9 \cdot \text{piano} + \text{noise}$. |
| `mic3.wav` | $X[2, :]$ | Noisy simulated microphone 3: $0.6 \cdot \text{speech} + 0.5 \cdot \text{piano} + \text{noise}$. |
| `recovered_speech.wav` | $\hat{S}[0, :]$ | Recovered speech, extracted via $A^+ X$ from the noisy microphone signals. A least squares estimate, so close to but not identical to `speech.wav`. |
| `recovered_piano.wav` | $\hat{S}[1, :]$ | Recovered piano, extracted via $A^+ X$ from the noisy microphone signals. A least squares estimate, so close to but not identical to `piano.wav`. |

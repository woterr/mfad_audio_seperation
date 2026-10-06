# Code Architecture and Explanation

This document provides a detailed breakdown of the modules and scripts that make up the Audio Source Separation demonstration project.

---

## 1. `linear_algebra.py`
This module contains all the explicit matrix mathematics. To ensure the mathematical concepts are visible, it intentionally avoids using black-box digital signal processing libraries or shortcuts like `np.linalg.pinv()`.

### The Mixing Matrix
```python
import numpy as np

# the mixing matrix. row = microphone, column = source
A = np.array([
    [0.8, 0.2],
    [0.3, 0.9],
    [0.6, 0.5],
])
```
Explanation: This establishes the acoustic properties of our virtual room. It is a 3×2 matrix, meaning there are 3 microphones (rows) and 2 audio sources (columns). The values represent the volume (amplitude) at which each source is picked up by each microphone.
Computing the Pseudoinverse
```def factorise(A):
    # numpy splits A into three parts: A = U Sigma Vt
    U, sigma, Vt = np.linalg.svd(A)

    # A is 3x2 so m is 3 and n is 2
    m, n = A.shape
    i = np.arange(n)

    # sigma+ is 2x3, the values go down the diagonal upside down
    Sigma_plus = np.zeros((n, m))
    Sigma_plus[i, i] = 1.0 / sigma

    # put the three parts back together in the right order
    return Vt.T @ Sigma_plus @ U.T
```
Explanation: Because $A$ is a 3×2 matrix, it is not square and cannot be inverted directly. We compute the Singular Value Decomposition (SVD) of $A$ ($A = U \Sigma V^T$).
sigma is returned as a 1D array of singular values. We create an empty 2×3 matrix (Sigma_plus) and place the reciprocals of the singular values ($1/\sigma$) along its diagonal.
The formula for the pseudoinverse is $A^+ = V \Sigma^+ U^T$. The function returns the fully constructed 2×3 pseudoinverse matrix $A^+$.```
Simulating the Recording (Mixing)
```def mix(A, S):
    # X = A S, this makes the three microphones
    return A @ S
```
Explanation: A is the 3×2 mixing matrix and S is the 2×N source matrix containing the original speech and piano signals. The matrix multiplication `A @ S` yields the clean microphone matrix $X_{\text{clean}} \in \mathbb{R}^{3 \times N}$: each row is one microphone hearing both sources at its own gain. This is the ideal result, before any noise is introduced.```
Recovering the Sources
```**def recover(A_plus, X):
    # S^ = A+ X, this pulls the sources back out
    return A_plus @ X**
```
Explanation: A_plus is the 2×3 pseudoinverse matrix $A^+$, and X is the 3×N noisy microphone matrix. Multiplying $A^+ X$ reverses the linear combination, outputting $\hat{S}$—a 2×N matrix containing the estimated, separated signals.

Note that X here is the *noisy* matrix. In the clean case the system $AS = X$ is consistent and $A^+$ inverts the mixing exactly. With noise there is generally no matrix satisfying $AS = X$ exactly, so $A^+ X$ is instead the least squares estimate: the $\hat{S}$ that minimises $\lVert A S - X \rVert_F^2$. That minimising property is a property of the pseudoinverse itself, which is why it does not need to be called explicitly.```
Calculating Reconstruction Error
```def leftover(A, S_hat, X):
    # work out E = X - A S^, the part we couldnt explain
    # then take the square root of all the squares added up
    return float(np.sqrt(((X - A @ S_hat) ** 2).sum()))
```
Explanation: Validates the recovery by calculating the Frobenius norm of the residual error matrix. `A @ S_hat` re-mixes the recovered sources, so `X - A @ S_hat` is the residual $E = X - A\hat{S}$. The function squares every element, sums them, and takes the square root ($\lVert E \rVert_F$).

Because X contains noise, this value is small but nonzero—around 5.5 in practice. It measures how closely the recovered sources can reproduce the noisy microphone observations. In the clean noiseless case it would be approximately $1 \times 10^{-14}$, which is only floating point rounding. The residual is orthogonal to the column space of $A$, so it represents exactly the part of the noise that no choice of $\hat{S}$ could have explained.```


## 2. `audio.py`

Handles audio signal preparation and file I/O so the linear algebra pipeline receives consistently formatted data. It contains no noise: the noise in this project is added later, in `pipeline.py`, so that it clearly belongs to the microphones rather than to the source recordings.

**load(name):** Reads a WAV file using `scipy.io.wavfile`. Multi-channel (stereo) audio is averaged down to mono by taking the mean across channels. Integer PCM samples are converted to floating point and scaled by $1/32768$ so amplitudes lie in $[-1.0, 1.0]$. If the file's sample rate differs from the project rate of 22050 Hz, it is resampled with `resample_poly` so both sources share one rate. Finally the signal is scaled so its loudest sample sits at 0.5, which keeps the piano from overwhelming the speech once mixed and leaves headroom so nothing clips.

**save(name, signal):** Writes a mono 16-bit PCM WAV file. Before writing, the signal is scaled down if it would exceed a peak of 0.95, and samples are clipped into $[-1.0, 1.0]$. This scaling applies only to the files written to disk; it does not affect the matrices used in the calculation.

**envelope(signal, buckets=900):** Reduces a full-resolution signal to 900 (min, max) pairs using `np.minimum.reduceat` and `np.maximum.reduceat`. The browser receives this compact array instead of the hundreds of thousands of individual samples, which is enough to draw the waveform shape.

## 3. `pipeline.py`

The orchestration script that acts as the bridge between the audio files, the mathematics, and the web server. It runs in the following order.

### The Pipeline, Step by Step

**1. Load the source signals.**
**2. Build S**
**3. Mix, using X = AS.**
**4. Add small Gaussian microphone noise.** (to demonstrate practicality)
**5. Compute A⁺.**
**6. Recover Ŝ = A⁺X.**
**7. Calculate the reconstruction residual.**
**8. Apply a shared output gain.**1
**9. Save the microphone and recovered audio.**


---

## 4. `app.py`

A small Flask server with four routes:

- `GET /` returns `static/index.html`.
- `GET /static/<name>` serves the CSS and JavaScript.
- `GET /api/sources` calls `pipeline.sources()` so the page can show the two originals before anything is run.
- `POST /api/run` calls `pipeline.run()`, which performs the whole experiment and returns the microphone signals, the recovered signals, and the residual as JSON.
- `GET /audio/<name>` serves any `.wav` file from the `separation/` folder, which covers both the two original recordings and the five generated ones.

The server is started directly with `python app.py`, defaulting to `127.0.0.1:5000`, with `--host` and `--port` available as options.

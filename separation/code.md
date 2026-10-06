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
'''Explanation: This establishes the acoustic properties of our virtual room. It is a 3×2 matrix, meaning there are 3 microphones (rows) and 2 audio sources (columns). The values represent the volume (amplitude) at which each source is picked up by each microphone.'''
Computing the Pseudoinverse
def factorise(A):
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
'''Explanation: Because $A$ is a 3×2 matrix, it is not square and cannot be inverted directly. We compute the Singular Value Decomposition (SVD) of $A$ ($A = U \Sigma V^T$).
sigma is returned as a 1D array of singular values. We create an empty 2×3 matrix (Sigma_plus) and place the reciprocals of the singular values ($1/\sigma$) along its diagonal.
The formula for the pseudoinverse is $A^+ = V \Sigma^+ U^T$. The function returns the fully constructed 2×3 pseudoinverse matrix $A^+$.'''
Simulating the Recording (Mixing)
def mix(A, S):
    # X = A S, this makes the three microphones
    return A @ S
'''Explanation: A is the 3×2 mixing matrix and S is the 2×N source matrix containing the original speech and piano signals. The matrix multiplication A @ S yields $X$, a 3×N matrix representing the audio captured by the 3 microphones.'''
Recovering the Sources
**def recover(A_plus, X):
    # S^ = A+ X, this pulls the sources back out
    return A_plus @ X**
'''Explanation: A_plus is the 2×3 pseudoinverse matrix $A^+$, and X is the 3×N mixed microphone matrix. Multiplying $A^+ X$ reverses the linear combination, outputting $\hat{S}$—a 2×N matrix containing the estimated, separated original signals.'''
Calculating Reconstruction Error
def leftover(A, S_hat, X):
    # work out E = X - A S^, the part we couldnt explain
    # then take the square root of all the squares added up
    return float(np.sqrt(((X - A @ S_hat) ** 2).sum()))
'''Explanation: Validates the mathematical accuracy of the recovery by calculating the Frobenius norm of the residual error matrix. A @ S_hat simulates re-mixing the recovered sources. X - A @ S_hat calculates the error matrix $E$. The function squares every element, sums them, and takes the square root ($\Vert{}E\Vert{}_F$).'''

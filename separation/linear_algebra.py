import numpy as np

# row = microphone, column = source
A = np.array([
    [0.8, 0.2],
    [0.3, 0.9],
    [0.6, 0.5],
])


def factorise(A):
    """A = U Sigma Vt, then A+ = V Sigma+ Ut.

    Sigma+ is the singular values flipped onto the other diagonal and turned
    upside down. That flip is what turns a 3x2 into a 2x3.
    """
    U, sigma, Vt = np.linalg.svd(A)
    m, n = A.shape
    i = np.arange(n)

    Sigma_plus = np.zeros((n, m))
    Sigma_plus[i, i] = 1.0 / sigma

    return Vt.T @ Sigma_plus @ U.T


def mix(A, S):
    """X = A S"""
    return A @ S


def recover(A_plus, X):
    """Shat = A+ X"""
    return A_plus @ X


def leftover(A, S_hat, X):
    """||E||_F where E = X - A Shat. Basically zero if the recovery worked."""
    return float(np.sqrt(((X - A @ S_hat) ** 2).sum()))

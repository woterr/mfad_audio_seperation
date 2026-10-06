import numpy as np

# the mixing matrix. row = microphone, column = source

A = np.array([
    [0.8, 0.2],
    [0.3, 0.9],
    [0.6, 0.5],
])



def factorise(A):
    U, sigma, Vt = np.linalg.svd(A) # A = U Sigma Vt

    m, n = A.shape # m = 3, n = 2
    i = np.arange(n)

    Sigma_plus = np.zeros((n, m)) # null matrix
    Sigma_plus[i, i] = 1.0 / sigma # sigma becomes 1/sigma and dimension = 2x3

    return Vt.T @ Sigma_plus @ U.T # A+ (pesudoinv)


def mix(A, S):

    return A @ S # A * S



def recover(A_plus, X):
    return A_plus @ X # S^


def leftover(A, S_hat, X):
    return float(np.sqrt(((X - A @ S_hat) ** 2).sum())) # E = X - A S^: forbenius norm

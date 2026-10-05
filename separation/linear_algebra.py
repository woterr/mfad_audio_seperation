import numpy as np

# the mixing matrix. row = microphone, column = source

A = np.array([
    [0.8, 0.2],
    [0.3, 0.9],
    [0.6, 0.5],
])



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


def mix(A, S):

    # X = A S, this makes the three microphones
    return A @ S



def recover(A_plus, X):
    # S^ = A+ X, this pulls the sources back out
    return A_plus @ X


def leftover(A, S_hat, X):



    # work out E = X - A S^, the part we couldnt explain
    # then take the square root of all the squares added up
    return float(np.sqrt(((X - A @ S_hat) ** 2).sum()))

import numpy as np

from . import audio, linear_algebra as la

NAMES = ("speech", "piano")


def sources():
    S = load() # from audio.py

    return {
        "rate": audio.RATE,
        "duration": S.shape[1] / audio.RATE,
        "signals": [
            {"label": n.capitalize(), "url": f"/audio/{n}.wav", "peaks": audio.envelope(S[i])}
            for i, n in enumerate(NAMES)
        ],
    }


def run():
    S = load() # from audio.py

    X = la.mix(la.A, S) # microphone reading

    noise = np.random.normal(0, 0.001, X.shape) # ADD NOISE
    X = X + noise

    A_plus = la.factorise(la.A) # psuedo inverse
    S_hat = la.recover(A_plus, X) # recovered source

    error = la.leftover(la.A, S_hat, X) # leftover error


    # normalize gain so nothing clips
    loudest = max(float(np.abs(X).max()), float(np.abs(S_hat).max()))
    gain = audio.OUT_PEAK / loudest if loudest > audio.OUT_PEAK else 1.0

    return {
        "rate": audio.RATE,
        "duration": S.shape[1] / audio.RATE,
        "error": error,
        "microphones": emit([(f"mic{i + 1}", f"Microphone {i + 1}", X[i] * gain) for i in range(3)]),
        "recovered": emit([(f"recovered_{n}", f"Recovered {n}", S_hat[i] * gain) for i, n in enumerate(NAMES)]),
    }


def load():
    rows = [audio.load(f"{n}.wav") for n in NAMES]

    # they have to be the same length, so use the shorter one
    length = min(row.size for row in rows)


    # cut the long one down and add zeros to the short one
    rows = [np.pad(row[:length], (0, max(0, length - row.size))) for row in rows]

    # stack them on top of each other, this is S: 2 x N
    return np.vstack(rows).astype(np.float64)


def emit(items):



    # save each one as a wav, then tell the page about it
    out = []
    for name, label, data in items:
        audio.save(f"{name}.wav", data)
        out.append({"label": label, "url": f"/audio/{name}.wav", "peaks": audio.envelope(data)})
    return out

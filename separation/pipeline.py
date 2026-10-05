import numpy as np

from . import audio, linear_algebra as la

NAMES = ("speech", "piano")


def sources():
    S = load()
    return {
        "rate": audio.RATE,
        "duration": S.shape[1] / audio.RATE,
        "signals": [
            {"label": n.capitalize(), "url": f"/audio/{n}.wav", "peaks": audio.envelope(S[i])}
            for i, n in enumerate(NAMES)
        ],
    }


def run():
    S = load()
    X = la.mix(la.A, S)
    S_hat = la.recover(la.factorise(la.A), X)

    loudest = max(float(np.abs(X).max()), float(np.abs(S_hat).max()))
    gain = audio.OUT_PEAK / loudest if loudest > audio.OUT_PEAK else 1.0

    return {
        "rate": audio.RATE,
        "duration": S.shape[1] / audio.RATE,
        "error": la.leftover(la.A, S_hat, X),
        "microphones": emit([(f"mic{i + 1}", f"Microphone {i + 1}", X[i] * gain) for i in range(3)]),
        "recovered": emit([(f"recovered_{n}", f"Recovered {n}", S_hat[i] * gain)
                           for i, n in enumerate(NAMES)]),
    }


def load():
    rows = [audio.load(f"{n}.wav") for n in NAMES]
    length = min(row.size for row in rows) # trim or pad so rows line up
    rows = [np.pad(row[:length], (0, max(0, length - row.size))) for row in rows]
    return np.vstack(rows).astype(np.float64)


def emit(items):
    out = []
    for name, label, data in items:
        audio.save(f"{name}.wav", data)
        out.append({"label": label, "url": f"/audio/{name}.wav", "peaks": audio.envelope(data)})
    return out

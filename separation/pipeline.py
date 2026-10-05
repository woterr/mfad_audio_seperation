"""Loads the two recordings, mixes them, and pulls them back apart."""

import numpy as np

from . import audio, linear_algebra as la

# the two files we start with, speech on top
NAMES = ("speech", "piano")


def sources():
    # just the two originals, nothing has been run yet
    S = load()

    # send the page the label, the link and the shape of each one
    return {
        "rate": audio.RATE,
        "duration": S.shape[1] / audio.RATE,
        "signals": [
            {"label": n.capitalize(), "url": f"/audio/{n}.wav", "peaks": audio.envelope(S[i])}
            for i, n in enumerate(NAMES)
        ],
    }


def run():
    # start with the two sources, 2 x N
    S = load()

    # X = A S gives us the three microphones, 3 x N
    X = la.mix(la.A, S)

    # build A+ from the SVD, then Shat = A+ X brings the sources back, 2 x N
    S_hat = la.recover(la.factorise(la.A), X)



    # one scale factor for everything so nothing clips
    # using the same one everywhere means A Shat = X still holds
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
    # read both wav files
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

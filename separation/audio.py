import wave
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

FOLDER = Path(__file__).parent
RATE = 22050
PEAK = 0.5
OUT_PEAK = 0.95


class AudioError(Exception):
    pass


def load(name):
    path = FOLDER / name
    if not path.is_file():
        raise AudioError(f"cant find {name}")

    rate, data = wavfile.read(path)
    if data.ndim > 1:
        data = data.mean(axis=1)
    if np.issubdtype(data.dtype, np.integer):
        data = data / 32768.0
    data = data.astype(np.float32)

    if rate != RATE:
        div = np.gcd(rate, RATE)
        data = resample_poly(data, RATE // div, rate // div)

    loudest = float(np.abs(data).max())
    return data * (PEAK / loudest) if loudest else data


def save(name, signal):
    loudest = float(np.abs(signal).max())
    if loudest > OUT_PEAK:
        signal = signal * (OUT_PEAK / loudest)

    data = (np.clip(signal, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(FOLDER / name), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(data.tobytes())


def envelope(signal, buckets=900):
    edges = np.linspace(0, signal.size, buckets + 1).astype(int)
    lows = np.minimum.reduceat(signal, edges[:-1])
    highs = np.maximum.reduceat(signal, edges[:-1])
    return [[round(float(a), 4), round(float(b), 4)] for a, b in zip(lows, highs)]

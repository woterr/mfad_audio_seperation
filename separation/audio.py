import wave
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

FOLDER = Path(__file__).parent


RATE = 22050 # we use one sample rate for everything

PEAK = 0.5 # sources sit at half volume so higher vol music isnt overridding lower vol music

OUT_PEAK = 0.95 # never write anything louder than this (prevent clipping)



def load(name):
    path = FOLDER / name

    # read the wav, this gives us the rate and the numbers
    rate, data = wavfile.read(path)

    # if its stereo then average the two sides into one mono channel
    if data.ndim > 1:
        data = data.mean(axis=1)

    # wav files store whole numbers, so turn them into decimals
    if np.issubdtype(data.dtype, np.integer):
        data = data / 32768.0
    data = data.astype(np.float32)



    if rate != RATE: # if the rate is wrong then resample it to one rate (defined above
        div = np.gcd(rate, RATE)
        data = resample_poly(data, RATE // div, rate // div)


    # find the loudest sample and turn everything down to PEAK
    loudest = float(np.abs(data).max())
    return data * (PEAK / loudest) if loudest else data


def save(name, signal):
    loudest = float(np.abs(signal).max()) # remove too loud samples
    if loudest > OUT_PEAK:
        signal = signal * (OUT_PEAK / loudest)

    # decimals back into whole numbers, and stop anything past 1.0
    data = (np.clip(signal, -1.0, 1.0) * 32767).astype(np.int16)

    # write it out as a mono
    with wave.open(str(FOLDER / name), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(data.tobytes())


def envelope(signal, buckets=900):

    # split the signal into 900 bits
    edges = np.linspace(0, signal.size, buckets + 1).astype(int)

    # for each bit find the smallest and biggest sample in it
    lows = np.minimum.reduceat(signal, edges[:-1])
    highs = np.maximum.reduceat(signal, edges[:-1])

    # send back the pairs, rounded so they arent too big
    return [[round(float(a), 4), round(float(b), 4)] for a, b in zip(lows, highs)]

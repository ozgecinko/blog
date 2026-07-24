---
title: "How Shazam Identifies Songs in 5 Seconds"
date: "2026-07-20"
original_date: "2026-05-30"
description: "A practical walkthrough of audio fingerprinting: turning noisy sound into spectrogram peaks, compact hashes, and fast database matches."
tags:
  - shazam
  - audio-fingerprinting
  - signal-processing
  - python
  - pycon
image: "https://miro.medium.com/v2/resize:fit:1400/1*87QlQ0ViaVox8uEviWoNag.png"
source: "https://medium.com/@ozgecinko/how-shazam-identifies-songs-in-5-seconds-32607d45303b"
---

# How Shazam Identifies Songs in 5 Seconds

![A stylized audio fingerprint constellation with a Shazam-inspired blue palette.](https://miro.medium.com/v2/resize:fit:1400/1*87QlQ0ViaVox8uEviWoNag.png)

Turning a few noisy seconds of sound into a constellation of stars a machine can recognize.

Shazam feels almost magical: you hold up your phone in a noisy cafe, wait a few seconds, and the song title appears. Under the hood, though, the trick is a beautifully practical engineering pipeline. A short, messy recording is transformed into a compact fingerprint that can be searched quickly against a large database of known songs.

The core pipeline is:

1. Capture and simplify the sound.
2. Build a spectrogram and find its strongest peaks.
3. Turn relationships between peaks into searchable fingerprints.
4. Match those fingerprints against a database using time-aligned voting.

## From Sound Waves to Spectrograms

Sound is pressure changing over time. A recording stores that pressure as thousands of samples per second. The raw waveform is useful, but it mixes vocals, drums, instruments, and noise into one line. To identify a song, we need to know which frequencies appear at which moments.

![The first 1,000 samples of a recorded "Hello World", shown as raw amplitude over time.](https://miro.medium.com/v2/resize:fit:1400/1*0OzEvjZxpvHIcCrh8j-0OA.jpeg)

That is what a spectrogram gives us. It maps time on one axis, frequency on the other, and loudness as color or intensity. In Python, this is commonly built with the Short-Time Fourier Transform: split the signal into small overlapping windows, transform each window, and stack the results into a frequency-over-time view.

![A 10-second spectrogram recording captured while Tarkan - Simarik was playing.](https://miro.medium.com/v2/resize:fit:1400/1*n9b_8-U21bVq9fIYZoNF8Q.jpeg)

![STFT splits the signal into overlapping windows before transforming each one.](https://miro.medium.com/v2/resize:fit:704/1*Yw8cmmF2IG_CwpQ_KfMXmQ.jpeg)

```python
import numpy as np
import librosa
import librosa.display
import sounddevice as sd

fs = 44100
duration = 10

audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype="int16")
sd.wait()

y = audio.flatten()
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
S_dB = librosa.amplitude_to_db(S, ref=np.max)

librosa.display.specshow(S_dB, sr=fs, x_axis="time", y_axis="log", cmap="magma")
```

## What Makes a Song Unique

The full spectrogram contains too much information. Shazam-style fingerprinting keeps only the strongest local peaks: points that are louder than their neighbors in both time and frequency. These peaks form a constellation map of the song.

This representation is robust because the loudest peaks often survive real-world noise better than weaker details. Even if people are talking nearby or the speaker is bad, many of the same peaks remain visible.

![Detected peaks from Simarik forming a constellation map.](https://miro.medium.com/v2/resize:fit:1400/1*kYVShDVQMyglT8oZ9xkYnA.jpeg)

```python
from scipy.ndimage import maximum_filter

neighborhood_size = (20, 20)
local_max = maximum_filter(S, size=neighborhood_size) == S
amp_threshold = np.percentile(S, 90)
peaks = local_max & (S > amp_threshold)
```

## Building Audio Fingerprints

Individual peaks are not enough. The useful signal comes from relationships between peaks. For each anchor peak, we connect it to a few nearby peaks ahead of it in time. Each pair can be described by:

- The frequency of the first peak.
- The frequency of the second peak.
- The time difference between them.

That triplet becomes a compact hash. Instead of comparing raw audio, the system compares these hashes.

![An example fingerprint built from two frequencies and a time difference.](https://miro.medium.com/v2/resize:fit:1400/1*1gSG6WZbSXXAZFqGGyrfNA.png)

![Spectrogram peaks linked to nearby future peaks; each line becomes a hashable fingerprint.](https://miro.medium.com/v2/resize:fit:1400/1*dywBiAK12Zlm2nMKUBUstA.jpeg)

```python
import hashlib

freqs, times = np.where(peaks)
fingerprints = []
fan_value = 5

for i in range(len(times)):
    for j in range(1, fan_value):
        if i + j >= len(times):
            continue

        f1, f2 = freqs[i], freqs[i + j]
        t1, t2 = times[i], times[i + j]
        delta_t = t2 - t1

        if 0 < delta_t <= 200:
            fingerprints.append((f1, f2, delta_t, t1))


def hash_fingerprint(f1, f2, dt):
    return hashlib.sha1(f"{f1}|{f2}|{dt}".encode()).hexdigest()[:20]


hashes = [
    (hash_fingerprint(f1, f2, dt), offset)
    for f1, f2, dt, offset in fingerprints
]
```

## Matching Songs in the Database

A simple prototype can store songs and fingerprints in SQLite:

![Two tables linked by song ID: songs and fingerprints.](https://miro.medium.com/v2/resize:fit:1400/1*DT4OsPyh8wYmvtA7WayglQ.png)

```sql
CREATE TABLE songs (
  id INTEGER PRIMARY KEY,
  title TEXT,
  artist TEXT
);

CREATE TABLE fingerprints (
  hash TEXT,
  song_id INTEGER,
  offset INTEGER
);
```

Each known track is processed once. Its fingerprints are inserted with the song ID and the time offset where each fingerprint appears.

When a query recording comes in, the same fingerprinting process runs on the short clip. The system looks up matching hashes and compares their offsets.

## How the Match Happens

The clever part is not only finding matching hashes. Random collisions can happen, especially with noisy recordings. The real confirmation comes from time alignment.

If the query is from a specific song, many matching fingerprints should agree on the same offset difference:

```python
votes = {}

for f1, f2, dt, q_offset in query_fps:
    h = hash_fingerprint(f1, f2, dt)
    cursor.execute(
        "SELECT song_id, offset FROM fingerprints WHERE hash = ?",
        (h,),
    )

    for song_id, song_offset in cursor.fetchall():
        delta = int(song_offset) - int(q_offset)
        key = (song_id, delta)
        votes[key] = votes.get(key, 0) + 1

best_match = max(votes.items(), key=lambda item: item[1])
(song_id, delta), score = best_match
```

The correct song is the one with the strongest cluster of votes for the same `(song_id, delta)` pair. Random matches scatter across different offsets; real matches pile up.

## A Mini Shazam in Python

Putting these pieces together gives a small working recognizer:

![A mini Shazam Streamlit app with controls for recording and identifying audio.](https://miro.medium.com/v2/resize:fit:1400/1*CPiX5j-roYFxdhRudGgwcw.png)

1. Record a short sample.
2. Extract peaks from the spectrogram.
3. Build peak-pair hashes.
4. Search matching hashes in the database.
5. Pick the song with the strongest time-aligned vote cluster.

A lightweight Streamlit interface can turn this into a tap-to-listen demo for talks, workshops, or experiments.

![Mini Shazam identifying "Fusion" by Ludwig Goransson, with score 6 and delta 42.](https://miro.medium.com/v2/resize:fit:1400/1*8IkYgPWrgQhb_diGM9D8Jw.jpeg)

## The World Does Not Sound Like the Lab

Real environments are messy. A music recognizer has to survive:

- Noise and distortion from crowds, traffic, rooms, and speakers.
- Time offsets, because the listener rarely starts recording at the beginning.
- Database scale, because production systems search across huge catalogs.

The peak-and-pair design handles these problems well. Peaks are more resistant to noise, offset voting makes the recording start time irrelevant, and hashes make lookup fast.

## Beyond Music

Audio fingerprinting is not limited to songs. The same idea, reducing a messy signal into robust searchable landmarks, can be applied to speech and speaker identification, environmental sound detection, TV and ad tracking, and other audio-heavy domains.

The bigger lesson is that good representation design can make a hard search problem much smaller. Before any model or database can help, the signal needs to be transformed into something compact, durable, and searchable.

## Has Shazam Changed?

Modern Shazam is deeply integrated into Apple devices and services, and the implementation has almost certainly evolved since the original 2003 paper by Avery Wang. Still, the central idea remains powerful: constellation-style peak pairs, compact fingerprints, and time-aligned voting.

The method did not become obsolete. It became infrastructure.

This post is based on my PyCon Netherlands 2025 and PyCon Italia 2026 talk, "How Shazam Identifies Songs in 5 Seconds: Audio Fingerprinting with Python."

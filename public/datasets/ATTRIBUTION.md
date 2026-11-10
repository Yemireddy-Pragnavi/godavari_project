# MOT20 research assets
Source: https://motchallenge.net/data/MOT20/
Video: https://motchallenge.net/sequenceVideos/MOT20-01-raw.mp4
Authors: Patrick Dendorfer, Hamid Rezatofighi, Anton Milan, Javen Shi, Daniel Cremers, Ian Reid, Stefan Roth, Konrad Schindler, Laura Leal-Taixé.
MOT20: A benchmark for multi object tracking in crowded scenes (2020).

MOT20-01 is recorded train-station footage, not India/Pushkar Ghat CCTV.
The resized video and derived detector output are licensed CC BY-NC-SA 3.0:
https://creativecommons.org/licenses/by-nc-sa/3.0/
Non-commercial research/demo use only. Preserve attribution and this license when redistributing these assets. Dataset licensing does not automatically license unrelated application code.
Changes: resized to 640×360, re-encoded H.264 without audio; sampled OpenCV HOG detections computed with services/vision/analyze.py. No identities are inferred. Bounding-box scores are uncalibrated classifier margins. This baseline undercounts crowded scenes; no accuracy or safety certification is claimed.
Reproduce: python scripts/prepare-dataset.py

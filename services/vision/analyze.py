"""Bounded local OpenCV HOG person detector, not a drowning or clinical detector.
Use on authorized prerecorded clips only. Perspective and occlusion severely limit counts.
"""
import argparse, json, time
from pathlib import Path
import cv2

def analyze(path, roi=None, max_seconds=30, sample_every=15):
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise ValueError('Video could not be decoded')
    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
    events=[]; frame_no=0; start=time.perf_counter()
    fps=cap.get(cv2.CAP_PROP_FPS) or 25
    while frame_no/fps <= max_seconds:
        success, frame=cap.read()
        if not success: break
        if frame_no % sample_every == 0:
            frame=cv2.resize(frame,(640,360))
            gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
            boxes, weights=hog.detectMultiScale(frame,winStride=(8,8),padding=(8,8),scale=1.05)
            region=roi or [0,0,640,360]
            in_roi=[]
            for box,score in zip(boxes,weights):
                x,y,w,h=map(int,box)
                if region[0]<=x+w/2<=region[2] and region[1]<=y+h/2<=region[3]:
                    in_roi.append({'box':[x,y,w,h],'score':float(score)})
            events.append({'second':round(frame_no/fps,2),'category':'Person observation','count':len(in_roi),
                           'detections':in_roi,'roi':region,'blur_variance':float(cv2.Laplacian(gray,cv2.CV_64F).var()),
                           'brightness':float(gray.mean()),'model':'OpenCV HOG default people detector',
                           'review':'Pending','inference':'actual local model','uncertainty':'Uncalibrated; occlusion may hide people'})
        frame_no+=1
    cap.release()
    return {'observations':events,'frames_decoded':frame_no,'elapsed_seconds':time.perf_counter()-start,
            'restriction':'No automatic clearance, drowning classification, or emergency confirmation'}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('video');parser.add_argument('--output',default='observations.json')
    args=parser.parse_args();Path(args.output).write_text(json.dumps(analyze(args.video),indent=2))

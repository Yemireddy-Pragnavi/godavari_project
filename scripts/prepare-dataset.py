"""Reproduce the non-commercial MOT20-01 video evidence bundle. Requires ffmpeg and OpenCV."""
import hashlib,json,subprocess,sys,tempfile,urllib.request
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from services.vision.analyze import analyze
root=Path(__file__).resolve().parents[1]; out=root/'public/datasets';out.mkdir(exist_ok=True)
url='https://motchallenge.net/sequenceVideos/MOT20-01-raw.mp4'
source=Path(sys.argv[1]) if len(sys.argv)>1 else Path(tempfile.gettempdir())/'guardian-mot20.mp4'
if not source.exists():urllib.request.urlretrieve(url,source)
clip=out/'mot20-01.mp4'
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(source),'-vf','scale=640:360','-an','-c:v','libx264','-crf','28','-movflags','+faststart',str(clip)],check=True)
r=analyze(clip)
r.update(source=url,dataset='MOT20-01',license='CC BY-NC-SA 3.0',video_sha256=hashlib.sha256(clip.read_bytes()).hexdigest(),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),opencv_version=__import__('cv2').__version__,width=640,height=360)
(out/'mot20-01-inference.json').write_text(json.dumps(r,indent=2))
(root/'lib/video-evidence.ts').write_text('export const videoEvidence = '+json.dumps(r)+';\n')
print(json.dumps({'samples':len(r['observations']),'counts':[x['count'] for x in r['observations']],'elapsed':r['elapsed_seconds']}))

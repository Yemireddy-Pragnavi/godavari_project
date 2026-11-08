"""Python research service. The hosted UI uses its own Worker persistence adapter.
This companion provides the requested CP-SAT, NetworkX, PostGIS and Gnani interfaces.
"""
import os, secrets, json
from typing import Any
from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File, Form, Response
from pydantic import BaseModel, Field
from services.raise_engine.optimizer import optimize, accessible_path
from services.api.gnani import transcribe, synthesize, NotConfigured
app=FastAPI(title='YatraRaksha RAISE research service',version='0.1.0')

def authorize(authorization: str = Header(default='')):
    key=os.getenv('SERVICE_API_KEY','')
    if not key or not secrets.compare_digest(authorization,'Bearer '+key):
        raise HTTPException(401,'Valid service token required')

class PlanningRequest(BaseModel):
    constraints:list[str]=Field(max_length=30)
    actions:list[dict[str,Any]]=Field(max_length=50)
    resources:dict[str,int]

class GraphRequest(BaseModel):
    nodes:list[str]=Field(max_length=1000)
    edges:list[dict[str,Any]]=Field(max_length=3000)
    source:str
    target:str

class SpeechRequest(BaseModel):
    text:str=Field(min_length=1,max_length=1000)
    language:str='en-IN'

@app.get('/health')
def health():
    return {'service':'RAISE','mode':'research','official_dispatch':False,
            'gnani_configured':bool(os.getenv('GNANI_API_KEY'))}

@app.post('/v1/optimize',dependencies=[Depends(authorize)])
def planning(body:PlanningRequest):
    if any(v<0 for v in body.resources.values()):raise HTTPException(422,'Capacities cannot be negative')
    return optimize(body.constraints,body.actions,body.resources)

@app.post('/v1/route',dependencies=[Depends(authorize)])
def routing(body:GraphRequest):
    return accessible_path(body.nodes,body.edges,body.source,body.target)

@app.post('/v1/transcribe',dependencies=[Depends(authorize)])
async def stt(audio:UploadFile=File(...),language:str=Form('en-IN')):
    if not audio.filename.lower().endswith(('.wav','.mp3','.ogg','.flac','.aac','.m4a')):
        raise HTTPException(415,'Use a documented supported audio format, up to 30 seconds')
    try:return await transcribe(await audio.read(10*1024*1024+1),audio.filename,language)
    except NotConfigured as e:raise HTTPException(503,str(e))
    except ValueError as e:raise HTTPException(422,str(e))
    except Exception:raise HTTPException(502,'Voice provider failed; no transcript was fabricated')

@app.post('/v1/synthesize',dependencies=[Depends(authorize)])
async def tts(body:SpeechRequest):
    try:
        audio,mime=await synthesize(body.text,body.language)
        return Response(audio,media_type=mime)
    except NotConfigured as e:raise HTTPException(503,str(e))
    except Exception:raise HTTPException(502,'Speech synthesis unavailable')

@app.get('/v1/postgis/corridors',dependencies=[Depends(authorize)])
def corridors():
    import psycopg
    from psycopg.rows import dict_row
    with psycopg.connect(os.environ['DATABASE_URL'],row_factory=dict_row) as conn:
        return conn.execute('SELECT id,name,state,version,ST_AsGeoJSON(geometry)::json geometry FROM access_edges').fetchall()

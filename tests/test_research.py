from datetime import datetime,timedelta,timezone
import os
import pytest
from services.raise_engine.optimizer import optimize,accessible_path
from services.api.gnani import config,NotConfigured,language_allowed
from fastapi.testclient import TestClient
from services.api.main import app

def action(id='inspection',**kwargs):
    return dict(id=id,authorized=True,safe=True,role='Access officer',covers=['unknown'],effort=2,**kwargs)

def test_minimal_plan():
    r=optimize(['unknown'],[action(),action('costly',disruption=3)],{'Access officer':1})
    assert r['status']=='OPTIMAL' and r['actions'][0]['id']=='inspection'

def test_unsafe_action_excluded():
    a=action();a['safe']=False
    assert optimize(['unknown'],[a],{'Access officer':1})['actions']==[]

def test_unauthorized_excluded():
    a=action();a['authorized']=False
    assert optimize(['unknown'],[a],{'Access officer':1})['actions']==[]

def test_resource_shortage():
    assert optimize(['unknown'],[action()],{'Access officer':0})['actions']==[]

def test_missing_role_is_infeasible():
    assert optimize(['unknown'],[action()],{'Volunteer':4})['actions']==[]

def test_multiple_constraints():
    a=action();b=action('verify');b['covers']=['stale']
    assert len(optimize(['unknown','stale'],[a,b],{'Access officer':2})['actions'])==2

def test_conflicting_actions_rejected():
    a=action(conflicts=['verify']);b=action('verify');b['covers']=['stale']
    assert optimize(['unknown','stale'],[a,b],{'Access officer':2})['actions']==[]

def test_route_requires_fresh_evidence():
    edge={'id':'AB','from':'A','to':'B','length':30,'state':'VERIFIED_ACCESSIBLE','authorized':True,'expires':(datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()}
    assert accessible_path(['A','B'],[edge],'A','B')['eligible']
    edge['expires']=(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat()
    assert not accessible_path(['A','B'],[edge],'A','B')['eligible']

def test_restricted_route_is_not_accessible():
    edge={'id':'AB','from':'A','to':'B','length':30,'state':'RESTRICTED','authorized':True,'expires':(datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()}
    assert not accessible_path(['A','B'],[edge],'A','B')['eligible']

def test_no_fake_transcript(monkeypatch):
    monkeypatch.delenv('GNANI_API_KEY',raising=False)
    with pytest.raises(NotConfigured):config('STT')

def test_service_auth(monkeypatch):
    monkeypatch.setenv('SERVICE_API_KEY','local-test-only')
    c=TestClient(app)
    assert c.post('/v1/optimize',json={'constraints':[],'actions':[],'resources':{}}).status_code==401
    r=c.post('/v1/optimize',headers={'Authorization':'Bearer local-test-only'},json={'constraints':['unknown'],'actions':[action()],'resources':{'Access officer':1}})
    assert r.status_code==200 and r.json()['status']=='OPTIMAL'

def test_video_pipeline(tmp_path):
    import cv2,numpy as np
    from services.vision.analyze import analyze
    path=str(tmp_path/'blank.avi');writer=cv2.VideoWriter(path,cv2.VideoWriter_fourcc(*'MJPG'),10,(640,360))
    for _ in range(20):writer.write(np.zeros((360,640,3),dtype=np.uint8))
    writer.release();r=analyze(path)
    assert r['frames_decoded']==20
    assert all(o['count']==0 for o in r['observations'])
    assert all(o['inference']=='actual local model' for o in r['observations'])

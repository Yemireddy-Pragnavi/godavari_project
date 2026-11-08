"""Contract from docs.gnani.ai/api/STT/speech-to-text and /api/TTS/tts-inference.
No request is made without explicitly configured model, endpoint and API key.
"""
import os
import httpx
from urllib.parse import urlparse

class NotConfigured(Exception): pass

def config(kind):
    key=os.getenv('GNANI_API_KEY')
    endpoint=os.getenv('GNANI_'+kind+'_ENDPOINT')
    model=os.getenv('GNANI_'+kind+'_MODEL')
    if not all([key,endpoint,model]): raise NotConfigured('Gnani '+kind+' is not configured')
    if urlparse(endpoint).scheme!='https' or urlparse(endpoint).hostname!='api.vachana.ai':
        raise ValueError('Only the documented HTTPS Gnani API host is permitted')
    return key,endpoint,model

def language_allowed(language):
    if language not in os.getenv('GNANI_SUPPORTED_LANGUAGES','en-IN,te-IN,hi-IN').split(','):
        raise ValueError('Language is not configured for this account')

async def transcribe(audio,filename,language):
    key,endpoint,model=config('STT'); language_allowed(language)
    if not audio or len(audio)>10*1024*1024: raise ValueError('Audio must be between 1 byte and 10 MB')
    async with httpx.AsyncClient(timeout=25) as client:
        response=await client.post(endpoint,headers={'X-API-Key-ID':key},
            data={'model':model,'language_code':language},files={'audio_file':(filename,audio)})
        response.raise_for_status(); result=response.json()
        if not result.get('success') or not isinstance(result.get('transcript'),str):
            raise ValueError('Unexpected Gnani transcription response')
        return {'transcript':result['transcript'],'model':result.get('model'),'source':'Gnani Prisma','requires_review':True}

async def synthesize(text,language):
    key,endpoint,model=config('TTS'); language_allowed(language)
    voice=os.getenv('GNANI_TTS_VOICE')
    if not voice: raise NotConfigured('Configure a voice authorized for the selected Timbre model')
    if not text or len(text)>1000: raise ValueError('Text must contain 1–1000 characters')
    async with httpx.AsyncClient(timeout=25) as client:
        response=await client.post(endpoint,headers={'X-API-Key-ID':key},json={
            'text':text,'model':model,'voice':voice,'language':language,
            'audio_config':{'container':'wav','encoding':'linear_pcm','num_channels':1,'sample_rate':24000,'sample_width':2}})
        response.raise_for_status()
        return response.content,response.headers.get('content-type','audio/wav')

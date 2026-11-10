// Server-side provider adapter. Never import this module into client components.
export const speechLanguages=['en-IN','te-IN','hi-IN'];
export function validateWav(bytes:Uint8Array){
 if(bytes.length<44||bytes.length>2000000)throw Error('400:Use a WAV recording up to 30 seconds and 2 MB');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const str=(p:number,n:number)=>String.fromCharCode(...bytes.slice(p,p+n));
 if(str(0,4)!=='RIFF'||str(8,4)!=='WAVE')throw Error('400:Audio must be PCM WAV');
 let rate=0,bits=0,channels=0,size=0,format=0;for(let p=12;p+8<=bytes.length;){const n=v.getUint32(p+4,true);if(p+8+n>bytes.length)throw Error('400:Truncated WAV');if(str(p,4)==='fmt '&&n>=16){format=v.getUint16(p+8,true);channels=v.getUint16(p+10,true);rate=v.getUint32(p+12,true);bits=v.getUint16(p+22,true)}if(str(p,4)==='data')size=n;p+=8+n+(n%2)}
 const duration=size/(rate*channels*bits/8);if(format!==1||bits!==16||channels!==1||rate!==16000||!Number.isFinite(duration)||duration<=0||duration>30)throw Error('400:Use mono 16 kHz 16-bit PCM WAV, at most 30 seconds');return duration;
}
export function extractReport(text:string){
 let hazard='Unclassified';if(/drown|water rescue|మునిగ|నీటిలో|నీళ్లలో|నీళ్ళలో|डूब/i.test(text))hazard='Water rescue';else if(/blocked|obstruct|crowd|మూసు|రద్దీ|గుంపు|भीड़|रास्ता.*बंद/i.test(text))hazard='Safety obstruction';else if(/fire|smoke|మంట|పొగ|आग|धुआँ/i.test(text))hazard='Fire or smoke';else if(/medical|injur|ambulance|వైద్య|గాయ|అంబులెన్స్|घायल|एम्बुलेंस/i.test(text))hazard='Medical emergency';
 const landmarks=[['Pushkar Ghat',/pushkar|పుష్కర|पुष्कर/i],['East steps',/east steps|తూర్పు.*మెట్ల|पूर्व.*सीढ़/i],['North entrance',/north entrance|ఉత్తర.*ప్రవేశ|उत्तरी.*प्रवेश/i],['Gate B',/corridor b|gate b|గేట్ బి|గేటు బి|గేట్ బీ|गेट बी/i],['Second staircase',/second stair|రెండో మెట్ల|రెండవ మెట్ల|दूसरी सीढ़/i]];return {category:hazard,landmark:landmarks.filter(([,r])=>(r as RegExp).test(text)).map(([n])=>n).join(' · '),method:'Keyword suggestions — operator confirmation required'};
}
function providerError(status:number){return status===401||status===403?'502:Gnani rejected the configured key or service scope':status===402?'502:Gnani credits are unavailable':status===429?'429:Gnani is busy or rate limited; retry shortly':'502:Gnani could not process this request. Manual reporting remains available';}
export async function transcribeGnani(key:string,bytes:Uint8Array,language:string,fetcher:typeof fetch=fetch){
 if(!key)throw Error('503:Gnani is not configured');if(!speechLanguages.includes(language))throw Error('400:Unsupported language');const duration=validateWav(bytes);const form=new FormData();form.set('model','prisma-v3.0');form.set('language_code',language);form.set('audio_file',new Blob([bytes as BlobPart],{type:'audio/wav'}),'report.wav');
 const start=performance.now();let response:Response;try{response=await fetcher('https://api.vachana.ai/stt/v3',{method:'POST',headers:{'X-API-Key-ID':key},body:form,signal:AbortSignal.timeout(25000)})}catch{throw Error('504:Gnani timed out or is unreachable; use manual reporting')}
 if(!response.ok)throw Error(providerError(response.status));const r:any=await response.json();if(r.success!==true||typeof r.transcript!=='string'||!r.transcript.trim())throw Error('422:No usable speech recognized; try again or type the report');
 return {transcript:r.transcript.slice(0,3000),model:r.model||'prisma-v3.0',requestId:r.request_id||null,language:r.detected_language_code||language,duration,elapsedMs:Math.round(performance.now()-start),extracted:extractReport(r.transcript)};
}
export async function synthesizeGnani(key:string,text:string,language:string,fetcher:typeof fetch=fetch){
 if(!key)throw Error('503:Gnani is not configured');if(!speechLanguages.includes(language))throw Error('400:Unsupported language');if(!text.trim()||text.length>500)throw Error('400:Speech text must contain 1–500 characters');
 let r:Response;try{r=await fetcher('https://api.vachana.ai/api/v1/tts/inference',{method:'POST',headers:{'X-API-Key-ID':key,'Content-Type':'application/json'},body:JSON.stringify({text,model:'timbre-v3.0',voice:'Shivani',language,audio_config:{container:'wav',encoding:'linear_pcm',num_channels:1,sample_rate:24000,sample_width:2}}),signal:AbortSignal.timeout(25000)})}catch{throw Error('504:Gnani speech is unreachable; device speech remains available')}
 if(!r.ok)throw Error(providerError(r.status));const audio=await r.arrayBuffer();const b=new Uint8Array(audio);if(b.length<44||String.fromCharCode(...b.slice(0,4))!=='RIFF')throw Error('502:Provider returned invalid audio');return audio;
}

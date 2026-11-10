import {validateAdvisory,comparePlans,benchmark} from '../../../lib/assurance';
import {transcribeGnani,synthesizeGnani} from '../../../lib/gnani';
import {videoEvidence} from '../../../lib/video-evidence';
import {env} from 'cloudflare:workers';
import {seed} from '../../../lib/seed';
import {roles,allowed,effective,transition,plan,category} from '../../../lib/engine';
export const dynamic='force-dynamic';
const db=()=> (env as any).DB;
const now=()=>new Date().toISOString();
const id=(p:string)=>p+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
const json=(x:any,status=200,headers:any={})=>Response.json(x,{status,headers:{'Cache-Control':'no-store',...headers}});
async function all(kind?:string){const r=await db().prepare(kind?'SELECT * FROM records WHERE kind=? ORDER BY updated DESC':'SELECT * FROM records ORDER BY updated DESC').bind(...(kind?[kind]:[])).all();return r.results.map((r:any)=>({...JSON.parse(r.data),version:r.version}));}
async function get(key:string){const r=await db().prepare('SELECT * FROM records WHERE id=?').bind(key).first();if(!r)throw Error('404:Record not found');return {...JSON.parse(r.data),version:r.version};}
function insert(x:any){return db().prepare('INSERT INTO records(id,kind,data,version,updated) VALUES(?,?,?,1,?)').bind(x.id,x.kind,JSON.stringify(x),now());}
async function log(actor:string,action:string,record:string,before:any,after:any){await db().prepare('INSERT INTO audit(id,actor,action,record,before,after,time) VALUES(?,?,?,?,?,?,?)').bind(id('AUD'),actor,action,record,JSON.stringify(before),JSON.stringify(after),now()).run();}
async function put(x:any,version:number){const result=await db().prepare('UPDATE records SET data=?, version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(x),now(),x.id,version).run();if(!result.meta.changes)throw Error('409:Record changed. Refresh before trying again');return {...x,version:version+1};}
async function guardedBatch(checks:any[],writes:any[]){const guards=checks.map(x=>({id:id('GUARD'),x}));await db().batch([...guards.map(g=>db().prepare("INSERT INTO records(id,kind,data,version,updated) VALUES(?,'internal',(SELECT data FROM records WHERE id=? AND version=?),1,?)").bind(g.id,g.x.id,g.x.version,now())),...writes,...guards.map(g=>db().prepare('DELETE FROM records WHERE id=?').bind(g.id))]);}
async function proposed(c:any,source?:string){const resources=(await db().prepare('SELECT * FROM reservations').all()).results;const start=performance.now();return {id:id('PLAN'),kind:'plan',corridor:c.id,corridorVersion:c.version,...plan(c,await all('responder'),resources),sourceObservation:source||null,created:now(),status:'Proposed',elapsedMs:Math.round((performance.now()-start)*100)/100,simulated:true};}
async function notify(title:string,message:string){await insert({id:id('NOTE'),kind:'notification',title,message,read:false,created:now()}).run();}
async function incident(b:any){if(!b.category||!b.location)throw Error('400:Category and location are required');const recent=(await all('incident')).filter((x:any)=>x.category===b.category&&x.location===b.location&&Date.now()-Date.parse(x.created)<300000);const x={id:id('INC'),kind:'incident',title:String(b.title||b.category+' reported').slice(0,120),category:b.category,location:String(b.location).slice(0,160),description:String(b.description||'').slice(0,2000),priority:'Needs review',status:'RECEIVED',created:now(),source:b.source||'Public report',simulated:true,assignment:'Pending',access:'Awaiting review',handoff:'Not requested',possibleDuplicates:recent.map((r:any)=>r.id),trackingToken:crypto.randomUUID()};await insert(x).run();await notify('New report · '+x.id,x.title);return x;}
async function handler(req:Request){try{
 const path=new URL(req.url).pathname.replace(/^\/api\//,'');const method=req.method;const bearer=req.headers.get('authorization')?.replace(/^Bearer /,'');const cookie=bearer||req.headers.get('cookie')?.match(/guardian_session=([^;]+)/)?.[1];const session=cookie?await db().prepare('SELECT * FROM sessions WHERE token=? AND expires>?').bind(cookie,Date.now()).first():null;let b:any={};if(method!=='GET'){if(path!=='voice-transcribe')b=await req.json().catch(()=>({}));if(JSON.stringify(b).length>25000)throw Error('413:Request too large');const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('403:Cross-origin mutation rejected');}
 if(path==='session'&&method==='POST'){
  // The entire hosted site is owner-private. These are deliberate synthetic role sessions, not employee accounts.
  if(!roles.includes(b.role))throw Error('400:Unknown role');const members=(await all('responder')).filter((r:any)=>r.role===b.role);const selected=members.find((r:any)=>r.id===b.responderId)||members[0];if(b.responderId&&!members.some((r:any)=>r.id===b.responderId))throw Error('403:Responder does not match selected role');const token=crypto.randomUUID();await db().prepare('INSERT INTO sessions(token,role,name,responder,expires) VALUES(?,?,?,?,?)').bind(token,b.role,selected?.name||'Demo '+b.role,selected?.id||null,Date.now()+8*3600000).run();return json({role:b.role,name:selected?.name||'Demo '+b.role,responderId:selected?.id||null,token},200,{'Set-Cookie':`guardian_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(req.url).protocol==='https:'?'; Secure':''}`});
 }
 if(path==='session'&&method==='GET'){if(!session)throw Error('401:No active session');return json({role:session.role,responderId:session.responder});}
 if(path==='advisories'&&method==='GET')return json((await all('advisory')).filter((x:any)=>x.audience!=='Field personnel'));
 if(path==='sos'&&method==='POST'){const x=await incident(b);await log('Public user','SOS received',x.id,null,{id:x.id});return json({id:x.id,trackingToken:x.trackingToken,status:x.status},201);}
 if(path==='track'&&method==='POST'){const x=await get(b.id);if(x.kind!=='incident'||x.trackingToken!==b.token)throw Error('404:Report not found');return json({id:x.id,status:x.status,assignment:x.assignment,access:x.access,handoff:x.handoff});}
 if(!session)throw Error('401:Sign in to a demo role');const role=session.role;
 const permit=(a:string)=>{if(!allowed(role,a))throw Error('403:This role cannot perform '+a)};
 if(path==='voice-status'&&method==='GET')return json({configured:!!(env as any).GNANI_API_KEY,transcription:'prisma-v3.0',speech:'timbre-v3.0'});
 if(['voice-transcribe','voice-synthesize'].includes(path)&&method==='POST'){
  if(role==='Devotee')throw Error('403:Operational session required');
  const owner=crypto.randomUUID(),stamp=Date.now();
  const lock=await db().prepare("INSERT INTO records(id,kind,data,version,updated) VALUES('VOICE-LEASE','internal',?,1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated WHERE CAST(json_extract(records.data,'$.until') AS INTEGER)<?").bind(JSON.stringify({owner,until:stamp+45000}),now(),stamp).run();
  if(!lock.meta.changes)throw Error('429:Another speech request is running. Retry shortly');
  try{
   if(path==='voice-synthesize'){const audio=await synthesizeGnani((env as any).GNANI_API_KEY,String(b.text||''),String(b.language||'en-IN'));await log(session.name,'Gnani speech generated','voice',null,{model:'timbre-v3.0',language:b.language});return new Response(audio,{headers:{'Content-Type':'audio/wav','Cache-Control':'no-store'}})}
   if(Number(req.headers.get('content-length')||0)>2100000)throw Error('413:Audio request too large');
   const form=await req.formData(),file=form.get('audio');if(!file||typeof file==='string'||file.size>2000000)throw Error('400:Attach a WAV recording under 2 MB');
   const result=await transcribeGnani((env as any).GNANI_API_KEY,new Uint8Array(await file.arrayBuffer()),String(form.get('language')||'en-IN'));
   const x={...result,id:id('VOICE'),kind:'voice',role,responder:session.responder,source:'Gnani Prisma API',created:now(),status:'Needs operator review',simulated:false};await insert(x).run();await log(session.name,'Gnani transcript received',x.id,null,{model:x.model,requestId:x.requestId});return json(x,201);
  }finally{await db().prepare("DELETE FROM records WHERE id='VOICE-LEASE' AND json_extract(data,'$.owner')=?").bind(owner).run()}
 }
 if(path==='voice-incident'&&method==='POST'){
  permit('assign');const voice=await get(b.id);if(voice.kind!=='voice')throw Error('400:Select a voice report');if(!b.confirmed)throw Error('400:Review the transcript and location first');
  const x=await incident({category:b.category,location:b.location,description:b.transcript,source:'Reviewed voice report '+voice.id});await log(session.name,'Voice report reviewed and incident created',x.id,{voiceId:voice.id,original:voice.transcript},{reviewed:b.transcript,category:b.category,location:b.location});return json(x,201);
 }
 if(path==='bootstrap'&&method==='POST'){if(!['Supervisor','Administrator'].includes(role))throw Error('403:Demo initialization requires a supervisor');const count=await db().prepare('SELECT count(*) n FROM records').first();if(!count.n)await db().batch(seed().map(insert));return json({ok:true});}
 if(path==='state'&&method==='GET'){
  const records=(await all()).filter((x:any)=>x.kind!=='internal').map((x:any)=>x.kind==='corridor'?{...x,state:effective(x)}:x);const publicOnly=role==='Devotee';const field=['Access officer','Medical responder','Water-rescue responder','Volunteer'].includes(role);
  const ownIncidents=new Set(records.filter((x:any)=>x.kind==='task'&&x.responder===session.responder).map((x:any)=>x.incident));const visible=records.filter((x:any)=> publicOnly?x.kind==='advisory'&&x.audience!=='Field personnel':field?['corridor','advisory','settings'].includes(x.kind)||(x.kind==='incident'&&ownIncidents.has(x.id))||(x.kind==='observation'&&role==='Access officer')||(x.kind==='voice'&&x.role===role)||(x.kind==='task'&&x.responder===session.responder)||(x.kind==='responder'&&x.role===role)||(x.kind==='notification'&&x.responder===session.responder):true).map((x:any)=>{const {trackingToken,...rest}=x;return rest});
  const auditRows=!publicOnly&&!field?(await db().prepare('SELECT * FROM audit ORDER BY time DESC LIMIT 100').all()).results:[];return json({role,responderId:session.responder,displayName:session.name,records:visible,audit:auditRows,permissions:Object.keys({approve:1,restrict:1,verify:1,observe:1,assign:1,scenario:1,settings:1,advisory:1}).filter(a=>allowed(role,a)),serverTime:now()});
 }

 if(path==='heartbeat'&&method==='POST'){
  if(role==='Devotee')throw Error('403:Operational session required');
  const config=await get('CFG');const pending=(await all('task')).filter((t:any)=>t.status==='ASSIGNED'&&!t.escalatedAt&&(role==='Supervisor'||role==='Dispatcher'||t.responder===session.responder)&&Date.now()>=Date.parse(t.ackDue||new Date(Date.parse(t.created)+(config.ackMinutes||5)*60000).toISOString()));
  let escalations=0;
  for(const t of pending){const stamp=now();const note={id:'ESC-'+t.id,kind:'notification',title:'Acknowledgment overdue · '+t.id,message:t.name+' has not acknowledged '+(t.corridor||t.incident||'the assignment')+'. Review or contact the responder.',task:t.id,role:'Supervisor',created:stamp,read:false,simulated:true};
   const results=await db().batch([
    db().prepare("INSERT OR IGNORE INTO records(id,kind,data,version,updated) SELECT ?,?,?,1,? FROM records WHERE id=? AND version=? AND json_extract(data,'$.status')='ASSIGNED' AND json_extract(data,'$.escalatedAt') IS NULL").bind(note.id,note.kind,JSON.stringify(note),stamp,t.id,t.version),
    db().prepare("UPDATE records SET data=json_set(data,'$.escalatedAt',?),version=version+1,updated=? WHERE id=? AND version=? AND json_extract(data,'$.status')='ASSIGNED' AND json_extract(data,'$.escalatedAt') IS NULL").bind(stamp,stamp,t.id,t.version)
   ]);if(results[1].meta.changes){escalations++;await log('Acknowledgment monitor','Overdue assignment escalated',t.id,t,{escalatedAt:stamp});}
  }
  return json({escalations,checked:now(),mode:'Active-session monitor; no background server scheduler'});
 }
 if(path==='alert-delivery'&&method==='POST'){
  const t=await get(b.id);if(t.kind!=='task'||t.responder!==session.responder)throw Error('403:Only the assigned responder can record presentation');
  const delivery={id:'DEL-'+t.id,kind:'delivery',task:t.id,responder:session.responder,channel:'Foreground browser',status:'Presented on device — not proof of hearing',created:now()};
  await db().prepare('INSERT OR IGNORE INTO records(id,kind,data,version,updated) VALUES(?,?,?,1,?)').bind(delivery.id,delivery.kind,JSON.stringify(delivery),now()).run();return json({ok:true});
 }
 if(path==='demo-task'&&method==='POST'){
  permit('assign');const r=await get(b.responder||'R-03');if(r.kind!=='responder'||r.role!=='Access officer'||!r.available)throw Error('409:An available access officer is required');
  const t={id:id('TASK'),kind:'task',title:'Inspect designated passage · rehearsal',corridor:'COR-B',role:r.role,responder:r.id,name:r.name,status:'ASSIGNED',priority:'High',instructions:['Acknowledge this simulated assignment','Inspect the designated passage without directing crowd movement','Report findings; field verification is a separate authorized action'],created:now(),ackDue:new Date(Date.now()+60000).toISOString(),simulated:true};
  try{await db().batch([db().prepare('INSERT INTO reservations(responder,task) VALUES(?,?)').bind(r.id,t.id),insert(t)]);}catch{throw Error('409:Officer already assigned. Complete their task or select another officer');}
  await log(role,'Rehearsal assignment dispatched',t.id,null,t);return json(t);
 }
 if(path==='video-observation'&&method==='POST'){
  permit('observe');const sample=Number(b.sample),threshold=Number(b.threshold);if(!Number.isInteger(sample)||sample<0||sample>=videoEvidence.observations.length||!Number.isInteger(threshold)||threshold<1||threshold>100)throw Error('400:Invalid evidence sample or trigger');
  const c=await get(b.corridor);if(c.kind!=='corridor')throw Error('400:Select a corridor');const frame=videoEvidence.observations[sample];
  const key='MOT20-'+c.id+'-'+sample+'-'+threshold;const existing=await db().prepare('SELECT id FROM records WHERE id=?').bind(key).first();if(existing){const saved=await get(key);const linked=(await all('plan')).find((p:any)=>p.sourceObservation===key);return json({...saved,plan:linked||null})}
  const triggered=frame.count>=threshold;const x={id:key,kind:'observation',camera:'MOT20-01 dataset',corridor:c.id,category:triggered?'Dataset count trigger — inspect':'Dataset person observation',count:frame.count,sampleSecond:frame.second,threshold,review:'Pending',created:now(),confidence:'Uncalibrated HOG classifier; undercounts dense scenes',model:frame.model,description:frame.count+' detected boxes at '+frame.second+'s. Recorded train-station footage mapped to a demo corridor; not local CCTV.',source:videoEvidence.source,videoSha256:videoEvidence.video_sha256,inference:'Actual offline inference replay',simulated:true};
  const updated=triggered&&c.state!=='RESTRICTED'?{...c,state:'POSSIBLE_OBSTRUCTION',expires:null,latestObservation:x.id}: {...c,latestObservation:x.id};
  const next={...updated,version:c.version+1};const proposal=triggered?await proposed(next,x.id):null;
  try{await guardedBatch([c],[insert(x),db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(updated),now(),c.id,c.version),...(proposal?[insert(proposal)]:[])]);}catch{throw Error('409:Corridor changed while saving evidence. Refresh and retry')}
  await log(session.name,'Dataset evidence attached and readiness recomputed',x.id,null,{...x,plan:proposal?.id});return json({...x,plan:proposal});
 }
 if(path==='coordinate'&&method==='POST'){
  permit('assign');const i=await get(b.incident);if(i.kind!=='incident'||i.category!=='Water rescue')throw Error('400:Select a water-rescue incident');if(['RESOLVED','CLOSED'].includes(i.status))throw Error('409:Incident is already resolved');if(i.status!=='UNDER_REVIEW')throw Error('409:Dispatcher review is required before team coordination');if(i.version!==b.version)throw Error('409:Incident changed; refresh');
  const c=await get(b.corridor);if(c.kind!=='corridor')throw Error('400:Select an access corridor');const reservations=(await db().prepare('SELECT * FROM reservations').all()).results;const roster=await all('responder');
  const required=['Water-rescue responder','Medical responder','Access officer'];const chosen=required.map(role=>roster.filter((r:any)=>r.role===role&&r.available&&!reservations.some((x:any)=>x.responder===r.id)).sort((a:any,b:any)=>(a.distance||150)-(b.distance||150))[0]);if(chosen.some((r:any)=>!r))throw Error('409:No complete qualified team available. Existing assignments are retained.');
  const team=chosen.map((r:any)=>({id:id('TASK'),kind:'task',title:r.role==='Access officer'?'Inspect rescue access corridor':r.role==='Medical responder'?'Prepare medical handoff':'Assess water-rescue report',incident:i.id,corridor:r.role==='Access officer'?c.id:undefined,role:r.role,responder:r.id,name:r.name,priority:'High',status:'ASSIGNED',instructions:['Acknowledge the simulated assignment','Coordinate with control room within your qualifications','Report findings; completion does not certify corridor access'],created:now(),simulated:true}));
  const marker={id:'TEAM-'+i.id,kind:'coordination',incident:i.id,corridor:c.id,tasks:team.map((t:any)=>t.id),created:now()};
  const updated={...i,status:'ASSIGNED',assignment:chosen.map((r:any)=>r.name).join(', '),teamTasks:marker.tasks,corridor:c.id,access:'Requires current field verification',handoff:'Medical task assigned'};
  try{await db().batch([db().prepare('INSERT INTO records(id,kind,data,version,updated) VALUES(?,?,(SELECT ? FROM records WHERE id=? AND version=?),1,?)').bind(marker.id,marker.kind,JSON.stringify(marker),i.id,b.version,now()),...team.flatMap((t:any)=>[db().prepare('INSERT INTO reservations(responder,task) VALUES(?,?)').bind(t.responder,t.id),insert(t)]),db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(updated),now(),i.id,b.version)]);}catch{throw Error('409:Team or incident changed. Refresh before retrying');}
  await log(role,'Three-role response coordinated',i.id,i,{tasks:marker.tasks,corridor:c.id});return json({...updated,version:i.version+1});
 }
 if(path==='plan'&&method==='POST'){permit('assign');const c=await get(b.corridor);const reservations=(await db().prepare('SELECT * FROM reservations').all()).results;const start=performance.now();const result=plan(c,await all('responder'),reservations);const x={id:id('PLAN'),kind:'plan',corridor:c.id,corridorVersion:c.version,...result,created:now(),status:'Proposed',elapsedMs:Math.round((performance.now()-start)*100)/100,simulated:true};await insert(x).run();await log(role,'Interventions computed',x.id,null,x);return json(x);}
 if(path==='approve'&&method==='POST'){
  permit('approve');const p=await get(b.id);if(p.status!=='Proposed')throw Error('409:Plan already processed');const c=await get(p.corridor);if(c.version!==p.corridorVersion)throw Error('409:Corridor changed since planning. Recompute the plan');const option=p.options.find((o:any)=>o.id===b.option);if(!option)throw Error('400:Select a feasible option');const r=await get(option.officer);if(!r.available||r.role!=='Access officer')throw Error('409:Qualified officer unavailable');const task={id:id('TASK'),kind:'task',title:option.title,corridor:c.id,plan:p.id,responder:r.id,role:r.role,name:r.name,status:'ASSIGNED',priority:'High',instructions:option.actions,created:now(),simulated:true};
  try{await guardedBatch([p,c,r],[db().prepare('INSERT INTO reservations(responder,task) VALUES(?,?)').bind(r.id,task.id),insert(task),db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify({...p,status:'Approved',approvedBy:role,approved:now()}),now(),p.id,p.version)]);}catch{throw Error('409:Resource already reserved. Recompute the plan');}await log(role,'Intervention authorized',p.id,p,{task:task.id});await notify('Intervention assigned',task.title+' · '+r.name);return json(task);
 }
 if(path==='corridor'&&method==='POST'){
  const c=await get(b.id);if(c.kind!=='corridor')throw Error('400:Expected corridor');let updated;
  if(b.action==='lift'){permit('approve');if(c.version!==b.version)throw Error('409:Stale corridor version');updated={...c,state:'POSSIBLY_CLEAR',expires:null};}
  else updated=transition(c,b.action,role,b.version);
  const result=await put({...updated,verifier:b.action==='verify'?session.name:updated.verifier},b.version);await log(session.name,b.action+' corridor',c.id,c,result);await notify('Access state updated',c.name+' · '+result.state);return json(result);
 }
 if(path==='observation'&&method==='POST'){
  permit('observe');const camera=await get(b.camera);const config=await get('CFG');if(!Number.isFinite(Number(b.value))||Number(b.value)<0||Number(b.value)>100)throw Error('400:Occupancy must be between 0 and 100');const x={id:id('OBS'),kind:'observation',camera:camera.id,corridor:camera.corridor,category:b.category||'Possible obstruction',value:Number(b.value)||0,description:String(b.description||'Synthetic camera event'),created:now(),review:'Pending',confidence:'Synthetic annotation',model:'Demo replay v1',simulated:true};await insert(x).run();const c=await get(camera.corridor);if(c.state!=='RESTRICTED'&&Number(b.value)>=config.threshold)await put({...c,state:'POSSIBLE_OBSTRUCTION',expires:null},c.version);await put({...camera,occupancy:Number(b.value)},camera.version);await log(role,'Observation ingested',x.id,null,x);return json(x);
 }
 if(path==='review'&&method==='POST'){permit('review');const x=await get(b.id);const result=await put({...x,review:b.review==='Dismissed'?'Dismissed':'Reviewed',reviewer:role},b.version);await log(role,'Evidence reviewed',x.id,x,result);return json(result);}
 if(path==='assign'&&method==='POST'){
  permit('assign');const i=await get(b.incident),r=await get(b.responder);if(!r.available)throw Error('409:Responder is off shift');if(i.category==='Water rescue'&&r.role!=='Water-rescue responder')throw Error('403:Water rescue requires a qualified water-rescue responder');if(i.category==='Medical emergency'&&r.role!=='Medical responder')throw Error('403:Medical assistance requires a medical responder');
  const t={id:id('TASK'),kind:'task',title:i.title,incident:i.id,role:r.role,responder:r.id,name:r.name,priority:i.priority,status:'ASSIGNED',instructions:['Acknowledge the assignment','Assess the scene within your qualifications','Report status to the dispatcher'],created:now(),simulated:true};
  try{await db().batch([db().prepare('INSERT INTO reservations(responder,task) VALUES(?,?)').bind(r.id,t.id),insert(t)]);}catch{throw Error('409:Responder is already reserved for another task');}await put({...i,status:'ASSIGNED',assignment:r.name},i.version);await log(role,'Responder assigned',i.id,i,t);return json(t);
 }
 if(path==='task'&&method==='POST'){
  permit('task');const t=await get(b.id);if(t.kind!=='task')throw Error('400:Expected field task');if((t.role!==role||t.responder!==session.responder)&&role!=='Supervisor')throw Error('403:Task belongs to another role');const next:Record<string,string[]>={ASSIGNED:['ACKNOWLEDGED','ESCALATED'],ACKNOWLEDGED:['IN_PROGRESS','ESCALATED'],IN_PROGRESS:['COMPLETED','ESCALATED'],ESCALATED:['ACKNOWLEDGED']};if(!next[t.status]?.includes(b.status))throw Error('409:Invalid task transition');const result=await put({...t,status:b.status,lastUpdate:now(),...(b.status==='ACKNOWLEDGED'?{acknowledgedAt:now()}:{}),...(b.status==='COMPLETED'?{completedAt:now()}:{}),note:String(b.note||'')},b.version);if(b.status==='COMPLETED')await db().prepare('DELETE FROM reservations WHERE task=?').bind(t.id).run();await log(role,'Task '+b.status,t.id,t,result);return json(result);
 }
 if(path==='timeline'&&method==='POST'){
  const i=await get(b.id);if(i.kind!=='incident')throw Error('400:Select an incident');const tasks=(await all('task')).filter((t:any)=>t.incident===i.id);if(!['Supervisor','Dispatcher','Administrator'].includes(role)&&!tasks.some((t:any)=>t.responder===session.responder))throw Error('403:Incident is not assigned to this responder');
  const keys=new Set([i.id,i.corridor,...tasks.map((t:any)=>t.id)]);const audits=(await db().prepare('SELECT * FROM audit ORDER BY time ASC').all()).results.filter((a:any)=>keys.has(a.record));return json({incident:i.id,events:[{id:'received',time:i.created,actor:i.source,action:'Incident received'},...audits]});
 }
 if(path==='handoff'&&method==='POST'){
  if(role!=='Medical responder')throw Error('403:Only the assigned medical responder can confirm handoff');
  const i=await get(b.id);if(i.kind!=='incident'||!i.teamTasks||i.status!=='ON_SCENE')throw Error('409:Handoff requires an on-scene coordinated incident');if(i.handoffConfirmedAt)throw Error('409:Handoff already recorded');
  const team=await Promise.all(i.teamTasks.map((key:string)=>get(key))),medical=team.find((t:any)=>t.role==='Medical responder');if(medical?.responder!==session.responder)throw Error('403:This incident belongs to another medical responder');
  const c=await get(i.corridor);if(team.some((t:any)=>t.status!=='COMPLETED')||effective(c)!=='VERIFIED_ACCESSIBLE')throw Error('409:Complete rescue, medical and access tasks and obtain fresh corridor verification first');
  const note=String(b.note||'').trim(),destination=String(b.destination||'').trim();if(note.length<20||destination.length<5||note.length>1000||destination.length>160||b.confirmed!==true)throw Error('400:Confirm receiving team, destination and handoff details; omit patient identifiers');
  const x={...i,handoff:'Medical handoff confirmed',handoffConfirmedAt:now(),handoffBy:session.name,handoffResponder:session.responder,handoffNote:note,handoffDestination:destination};
  try{await guardedBatch([{...i,version:b.version},c,...team],[db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(x),now(),i.id,b.version)]);}catch{throw Error('409:Evidence or incident changed. Refresh before confirming handoff')}
  await log(session.name,'Medical handoff confirmed',i.id,i,x);return json({...x,version:i.version+1});
 }
 if(path==='incident'&&method==='POST'){
  permit('incident');const x=await get(b.id);if(x.kind!=='incident')throw Error('400:Expected incident');
  if(!['Supervisor','Dispatcher'].includes(role))throw Error('403:Control-room authority is required for incident transitions');if(b.status==='CLOSED'&&role!=='Supervisor')throw Error('403:Only a supervisor may close an incident');
  const next:Record<string,string[]>={RECEIVED:['UNDER_REVIEW'],REPORTED:['RECEIVED'],UNDER_REVIEW:['RESOLVED'],ASSIGNED:['RESPONSE_ACKNOWLEDGED'],RESPONSE_ACKNOWLEDGED:['ON_SCENE'],ON_SCENE:['RESOLVED'],RESOLVED:['CLOSED']};if(!next[x.status]?.includes(b.status))throw Error('409:Invalid incident transition');
  const checks:any[]=[{...x,version:b.version}];
  if(x.category==='Water rescue'&&['RESOLVED','CLOSED'].includes(b.status)&&!x.teamTasks)throw Error('409:Water rescue requires coordinated team completion and medical handoff');
  if(x.teamTasks){const team=await Promise.all(x.teamTasks.map((key:string)=>get(key)));checks.push(...team);
   if(['RESPONSE_ACKNOWLEDGED','ON_SCENE'].includes(b.status)&&team.some((t:any)=>!t.acknowledgedAt||t.status==='ESCALATED'))throw Error('409:All assigned responders must acknowledge before progressing');
   if(['RESOLVED','CLOSED'].includes(b.status)){const c=await get(x.corridor);checks.push(c);if(team.some((t:any)=>t.status!=='COMPLETED')||effective(c)!=='VERIFIED_ACCESSIBLE'||!x.handoffConfirmedAt)throw Error('409:Complete all tasks, fresh access verification and explicit medical handoff before resolution or closure');}
  }
  const result={...x,status:b.status,updated:now()};try{await guardedBatch(checks,[db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(result),now(),x.id,b.version)]);}catch{throw Error('409:Incident or evidence changed. Refresh and retry')}
  await log(session.name,'Incident '+b.status,x.id,x,result);return json({...result,version:x.version+1});
 }
 if(path==='field-obstruction'&&method==='POST'){
  const t=await get(b.task);if(role!=='Access officer'||t.responder!==session.responder||!t.corridor)throw Error('403:Only the assigned access officer may report this obstruction');if(!['ACKNOWLEDGED','IN_PROGRESS'].includes(t.status))throw Error('409:Acknowledge the active inspection first');
  const c=await get(t.corridor);if(c.version!==b.version)throw Error('409:Stale corridor evidence');const note=String(b.note||'').trim();if(note.length<15)throw Error('400:Describe the observed obstruction in at least 15 characters');
  const x={id:id('FIELD'),kind:'observation',corridor:c.id,task:t.id,incident:t.incident||null,description:note.slice(0,1000),category:'Field-reported obstruction',review:'Pending',created:now(),source:session.name,simulated:true};const updated={...c,state:c.state==='RESTRICTED'?'RESTRICTED':'REPORTED_OBSTRUCTED',expires:null,latestObservation:x.id};
  const proposal=await proposed({...updated,version:c.version+1},x.id);try{await guardedBatch([c,t],[insert(x),insert(proposal),db().prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(updated),now(),c.id,c.version)]);}catch{throw Error('409:Field state changed; refresh and retry')};await log(session.name,'Obstruction reported and RAISE recomputed',t.incident||t.id,null,{observation:x.id,plan:proposal.id});return json({observation:x,plan:proposal});
 }
 if(path==='plan-comparison'&&method==='POST'){permit('assign');const c=await get(b.corridor);if(c.kind!=='corridor')throw Error('400:Select a corridor');const result=comparePlans(c,await all('responder'),(await db().prepare('SELECT * FROM reservations').all()).results,b.change,b.officer);const x={id:id('COMPARE'),kind:'comparison',...result,created:now()};await insert(x).run();return json(x);}
 if(path==='benchmark'&&method==='POST'){permit('scenario');const x={id:id('BENCH'),kind:'benchmark',...benchmark(),created:now()};await insert(x).run();return json(x);}
 if(path==='voice'&&method==='POST'){if(!String(b.transcript||'').trim())throw Error('400:Transcript is required');const x={id:id('VOICE'),kind:'voice',role,transcript:String(b.transcript).slice(0,3000),language:b.language||'English',location:b.location||'',category:category(b.transcript),source:'Manual transcript — not Gnani output',created:now(),status:'Needs operator review',simulated:true};await insert(x).run();return json(x);}
 if(path==='settings'&&method==='POST'){permit('settings');const c=await get('CFG');const x=await put({...c,threshold:Math.max(1,Math.min(100,Number(b.threshold)||75)),ackMinutes:Math.max(1,Math.min(60,Number(b.ackMinutes)||5)),retention:Math.max(1,Number(b.retention)||30)},c.version);await log(role,'Configuration changed','CFG',c,x);return json(x);}
 if(path==='availability'&&method==='POST'){const r=await get(b.id);if(role!=='Administrator'&&r.id!==session.responder)throw Error('403:Only own role or administrator can change availability');return json(await put({...r,available:!!b.available},b.version));}
 if(path==='advisory'&&method==='POST'){permit('advisory');const validated=validateAdvisory(b);const x={id:id('ADV'),kind:'advisory',...validated,approved:true,approvedBy:session.name,approvedRole:role,publishedBy:session.name,approvedAt:now(),created:now(),simulated:true};await insert(x).run();await log(session.name,'Public advisory approved and published',x.id,null,x);return json(x);}
 if(path==='read'&&method==='POST'){const n=await get(b.id);if(n.kind!=='notification')throw Error('400:Invalid notification');if(['Access officer','Medical responder','Water-rescue responder','Volunteer','Devotee'].includes(role)&&n.responder!==session.responder)throw Error('403:Notification is not addressed to this responder');return json(await put({...n,read:true},n.version));}
 if(path==='scenario'&&method==='POST'){
  permit('scenario');const n=Number(b.number);let result:any={};
  if(n===1||n===4){const c=await get('COR-B');if(c.state!=='RESTRICTED')await put({...c,state:'POSSIBLE_OBSTRUCTION',expires:null},c.version);const o={id:id('OBS'),kind:'observation',camera:'CAM-02',corridor:'COR-B',category:'Possible obstruction',value:88,review:'Pending',created:now(),confidence:'Synthetic annotation',model:'Scenario replay',description:'Scenario occupancy rise in east passage',simulated:true};await insert(o).run();result={observation:o.id};if(n===4){const v={id:id('VOICE'),kind:'voice',transcript:'తూర్పు మెట్ల వద్ద దారి మూసుకుపోయింది',language:'తెలుగు',location:'East steps',source:'Synthetic transcript — not Gnani output',category:'Safety obstruction',linkedObservation:o.id,created:now(),simulated:true};await insert(v).run();result.voice=v.id;}}
  if(n===2)result=await incident({category:'Water rescue',location:'Bathing steps · Zone A',title:'Simulated water-rescue report',source:'Scenario 2'});
  if(n===3||n===6){const c=await get('COR-C');await put({...c,state:'RESTRICTED',expires:null},c.version);result={corridor:c.id,state:'RESTRICTED'};if(n===6){const camera=await get('CAM-04');await put({...camera,health:'Offline'},camera.version);try{transition({...c,version:c.version+1,state:'RESTRICTED'},'verify','Access officer',c.version);}catch(e:any){result.staleUpdate=e.message;}await log('Scenario','Stale clearance rejected',c.id,c,result);}}
  if(n===5){const a=await incident({category:'Medical emergency',location:'North entrance',source:'Scenario 5'});const z=await incident({category:'Medical emergency',location:'East steps',source:'Scenario 5'});result={incidents:[a.id,z.id],note:'Assign the same responder to both to test reservation conflict protection.'};}
  if(n<1||n>6)throw Error('400:Unknown scenario');const run={id:id('RUN'),kind:'simulation',number:n,result,created:now(),status:'Completed',simulated:true};await insert(run).run();await log(role,'Scenario '+n+' replay',run.id,null,result);return json(run);
 }
 if(path==='export'&&method==='GET'){
  if(role==='Devotee'||['Volunteer','Access officer','Medical responder','Water-rescue responder'].includes(role))throw Error('403:Export requires control-room access');const rows=await all('incident');const safe=(s:any)=>'"'+String(s??'').replace(/^[=+@-]/,"'").replaceAll('"','""')+'"';const csv=['ID,Title,Category,Status,Location,Created',...rows.map((r:any)=>[r.id,r.title,r.category,r.status,r.location,r.created].map(safe).join(','))].join('\r\n');return new Response(csv,{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="guardian-incidents.csv"'}});
 }
 throw Error('404:Endpoint not found');
 }catch(e:any){const match=e.message?.match(/^(\d{3}):(.*)$/);return json({error:match?match[2]:'The operation could not be completed. Please retry.'},match?Number(match[1]):500);}}
export const GET=handler;export const POST=handler;

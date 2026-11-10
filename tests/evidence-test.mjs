import assert from 'node:assert/strict';
let count=0;
async function call(p,b,token,status=200){const r=await fetch('http://localhost/api/'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(b?{body:JSON.stringify(b)}:{})});const x=await r.json();assert.equal(r.status,status,p+JSON.stringify(x));count++;return x}
const sup=await call('session',{role:'Supervisor'});const volunteer=await call('session',{role:'Volunteer'});
await call('video-observation',{sample:0,corridor:'COR-B',threshold:1},volunteer.token,403);
await call('video-observation',{sample:-1,corridor:'COR-B',threshold:1},sup.token,400);
let state=await call('state',null,sup.token);let c=state.records.find(x=>x.id==='COR-C');
if(c.state!=='RESTRICTED')c=await call('corridor',{id:c.id,version:c.version,action:'restrict'},sup.token);
const evidence=await call('video-observation',{sample:0,corridor:'COR-C',threshold:1,count:999},sup.token);assert.notEqual(evidence.count,999);assert(evidence.videoSha256);
const duplicate=await call('video-observation',{sample:0,corridor:'COR-C',threshold:1},sup.token);assert.equal(duplicate.id,evidence.id);
state=await call('state',null,sup.token);assert.equal(state.records.find(x=>x.id==='COR-C').state,'RESTRICTED');
await globalThis.__guardianDB.prepare('DELETE FROM reservations').run();
const incident=await call('sos',{category:'Water rescue',location:'Coordination test'},sup.token,201);
state=await call('state',null,sup.token);let i=state.records.find(x=>x.id===incident.id);
await call('coordinate',{incident:i.id,version:i.version,corridor:'COR-C'},volunteer.token,403);
i=await call('incident',{id:i.id,version:i.version,status:'UNDER_REVIEW'},sup.token);
await call('coordinate',{incident:i.id,version:i.version-1,corridor:'COR-C'},sup.token,409);
i=await call('coordinate',{incident:i.id,version:i.version,corridor:'COR-C'},sup.token);assert.equal(i.teamTasks.length,3);
await call('coordinate',{incident:i.id,version:i.version,corridor:'COR-C'},sup.token,409);
state=await call('state',null,sup.token);const tasks=state.records.filter(t=>i.teamTasks.includes(t.id));assert.deepEqual(new Set(tasks.map(t=>t.role)),new Set(['Water-rescue responder','Medical responder','Access officer']));
for(let t of tasks){const updated=await call('task',{id:t.id,version:t.version,status:'ACKNOWLEDGED'},sup.token);Object.assign(t,updated)}
i=await call('incident',{id:i.id,version:i.version,status:'RESPONSE_ACKNOWLEDGED'},sup.token);
i=await call('incident',{id:i.id,version:i.version,status:'ON_SCENE'},sup.token);
await call('incident',{id:i.id,version:i.version,status:'RESOLVED'},sup.token,409);
for(let t of tasks){for(const status of ['IN_PROGRESS','COMPLETED'])t=await call('task',{id:t.id,version:t.version,status},sup.token)}
await call('incident',{id:i.id,version:i.version,status:'RESOLVED'},sup.token,409);
c=(await call('state',null,sup.token)).records.find(x=>x.id==='COR-C');c=await call('corridor',{id:c.id,version:c.version,action:'lift'},sup.token);
const officer=await call('session',{role:'Access officer',responderId:'R-03'});await call('corridor',{id:c.id,version:c.version,action:'verify'},officer.token);
await call('incident',{id:i.id,version:i.version,status:'RESOLVED'},sup.token,409);
const med=await call('session',{role:'Medical responder',responderId:tasks.find(t=>t.role==='Medical responder').responder});
i=await call('handoff',{id:i.id,version:i.version,destination:'Training medical post',note:'Receiving team accepted the simulated patient transfer.',confirmed:true},med.token);
i=await call('incident',{id:i.id,version:i.version,status:'RESOLVED'},sup.token);assert.equal(i.status,'RESOLVED');
console.log(JSON.stringify({evidenceAndTeamApiChecks:count,result:'passed'}));

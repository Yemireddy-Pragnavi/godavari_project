import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://127.0.0.1:4173';let cookie='';let count=0;const timings=[];
async function request(path,body,status=200){const start=performance.now();const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})});const x=await r.json();assert.equal(r.status,status,path+': '+JSON.stringify(x));if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];timings.push({path,ms:Math.round(performance.now()-start),status});count++;return x}
await request('state',undefined,401);
await request('session',{role:'Supervisor'});await request('bootstrap',{});
let state=await request('state');assert(state.records.some(r=>r.kind==='corridor'));
const sos=await request('sos',{category:'Medical emergency',location:'TEST north entrance'},201);assert(sos.id&&sos.trackingToken);
await request('track',{id:sos.id,token:'incorrect'},404);await request('track',{id:sos.id,token:sos.trackingToken});
await request('session',{role:'Volunteer'});await request('corridor',{id:'COR-B',version:1,action:'verify'},403);await request('plan',{corridor:'COR-B'},403);
state=await request('state');assert(!state.records.some(r=>r.kind==='incident'||r.kind==='camera'));
await request('session',{role:'Administrator'});await request('corridor',{id:'COR-B',version:1,action:'lift'},403);await request('settings',{threshold:80,ackMinutes:4,retention:30});
await request('session',{role:'Supervisor'});state=await request('state');let c=state.records.find(r=>r.id==='COR-B');
await request('corridor',{id:c.id,version:c.version-1,action:'restrict'},409);
const restriction=await request('corridor',{id:c.id,version:c.version,action:'restrict'});
await request('session',{role:'Access officer'});await request('corridor',{id:c.id,version:restriction.version,action:'verify'},409);
await request('session',{role:'Supervisor'});c=await request('corridor',{id:c.id,version:restriction.version,action:'lift'});
await request('session',{role:'Access officer'});c=await request('corridor',{id:c.id,version:c.version,action:'verify'});assert.equal(c.state,'VERIFIED_ACCESSIBLE');
await request('corridor',{id:c.id,version:c.version-1,action:'restrict'},409);
await request('session',{role:'Supervisor'});const empty=await request('plan',{corridor:c.id});assert.equal(empty.options.length,0);
for(let number=1;number<=6;number++){const run=await request('scenario',{number});assert.equal(run.status,'Completed');if(number===6)assert.match(run.result.staleUpdate,/409/)}
await request('voice',{transcript:''},400);await request('voice',{transcript:'The corridor is blocked',language:'English',location:'East steps'});
await request('observation',{camera:'CAM-02',category:'Possible obstruction',value:90});
const inc=await request('sos',{category:'Water rescue',location:'TEST east steps'},201);
await request('assign',{incident:inc.id,responder:'R-04'},403);await request('assign',{incident:inc.id,responder:'R-01'});await request('assign',{incident:inc.id,responder:'R-01'},409);
await request('session',{role:'Devotee'});state=await request('state');assert(state.records.every(r=>r.kind==='advisory'));await request('export',undefined,403);
await request('session',{role:'Supervisor'});state=await request('state');assert(state.audit.length>0);assert(state.records.some(r=>r.id===sos.id));assert(!state.records.some(r=>r.trackingToken));
console.log(JSON.stringify({passed:count,checks:'authentication, role isolation, immediate SOS, tracking privacy, restriction precedence, optimistic concurrency, valid verification, no-action plan, six scenario replay, transcript validation, observation ingestion, qualification enforcement, resource conflict, persistence and audit',timings},null,2));

import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
let checks=0;async function call(p,b,token,status=200){const r=await fetch('http://localhost/api/'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(b?{body:JSON.stringify(b)}:{})});const x=await r.json();assert.equal(r.status,status,p+JSON.stringify(x));checks++;return x}
const sup=(await call('session',{role:'Supervisor'})).token,vol=(await call('session',{role:'Volunteer'})).token,disp=(await call('session',{role:'Dispatcher'})).token;
await call('advisory',{title:'hebound',message:'test'},sup,400);
await call('advisory',{title:'Keep emergency access clear',message:'Please use the designated public walkway and keep emergency access clear for medical teams.',audience:'All visitors',confirmed:true},vol,403);
await call('advisory',{title:'Keep emergency access clear',message:'Please use the designated public walkway and keep emergency access clear for medical teams.',audience:'All visitors'},sup,400);
const advisory=await call('advisory',{title:'Keep emergency access clear',message:'Please use the designated public walkway and keep emergency access clear for medical teams.',audience:'All visitors',confirmed:true},sup);assert.equal(advisory.approvedRole,'Supervisor');assert(advisory.publishedBy);
let state=await call('state',null,sup);let i=state.records.find(x=>x.kind==='incident'&&x.handoffConfirmedAt);assert(i);
await call('incident',{id:i.id,version:i.version,status:'CLOSED'},disp,403);
i=await call('incident',{id:i.id,version:i.version,status:'CLOSED'},sup);assert.equal(i.status,'CLOSED');
const timeline=await call('timeline',{id:i.id},sup);assert(timeline.events.some(e=>e.action==='Medical handoff confirmed'));assert(timeline.events.some(e=>e.action==='Incident CLOSED'));
await call('timeline',{id:i.id},vol,403);await call('handoff',{id:i.id,version:i.version},sup,403);
// Planning comparison uses isolated copies; availability changes actually affect selected personnel.
const comparison=await call('plan-comparison',{corridor:'COR-B',change:'restriction'},sup);assert.equal(comparison.after.corridor.state,'RESTRICTED');assert.equal(comparison.noFeasible.options.length,0);
await call('plan-comparison',{corridor:'COR-B',change:'officer',officer:'R-01'},sup,400);
const benchmark=await call('benchmark',{},sup);assert.equal(benchmark.rows.length,24);assert.equal(benchmark.summary[3].inappropriateRecommendations,0);assert.equal(benchmark.summary[3].resourceConflicts,0);assert(benchmark.summary[0].inappropriateRecommendations>0);assert.equal(benchmark.summary[3].unresolvedConfirmations,5);
writeFileSync('docs/benchmark-results.json',JSON.stringify(benchmark,null,2));
// Dataset evidence creates an actual plan, stays restricted, and dispatch requires supervisor approval.
state=await call('state',null,sup);let c=state.records.find(x=>x.id==='COR-D');
const observation=await call('video-observation',{sample:24,corridor:c.id,threshold:1},sup);assert(observation.plan);assert.equal(observation.plan.sourceObservation,observation.id);
if(observation.plan.options.length){await call('approve',{id:observation.plan.id,option:observation.plan.options[0].id},vol,403);const task=await call('approve',{id:observation.plan.id,option:observation.plan.options[0].id},sup);const officer=(await call('session',{role:'Access officer',responderId:task.responder})).token;let t=await call('task',{id:task.id,version:1,status:'ACKNOWLEDGED'},officer);state=await call('state',null,officer);c=state.records.find(x=>x.id===task.corridor);const field=await call('field-obstruction',{task:t.id,version:c.version,note:'Training barrier blocks the ambulance access passage.'},officer);assert(field.plan);await call('field-obstruction',{task:t.id,version:c.version,note:'An older report must not overwrite newer restrictions.'},officer,409)}
state=await call('state',null,sup);assert(state.records.some(x=>x.id===i.id&&x.status==='CLOSED'));assert(!state.records.some(x=>x.kind==='internal'));
console.log(JSON.stringify({completionApiChecks:checks,result:'passed'}));

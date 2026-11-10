import {effective,plan} from './engine';
export function validateAdvisory(b:any){
 const title=String(b.title||'').trim(),message=String(b.message||'').trim();
 const meaningful=(s:string,min:number,words:number)=>s.length>=min&&s.length<=2000&&(s.match(/[\p{L}\p{N}]+/gu)||[]).length>=words&&new Set(s.toLowerCase().replace(/\s/g,'')).size>=8&&!/^(test|testing|hello|asdf|qwerty|hebound)(\W|$)/i.test(s);
 if(title.length>120||!meaningful(title,12,3)||!meaningful(message,40,8))throw Error('400:Use a specific title (at least 3 words / 12 characters) and actionable guidance (at least 8 words / 40 characters). Test or placeholder text is not publishable');
 if(!['All visitors','Pushkar Ghat visitors','Field personnel'].includes(b.audience))throw Error('400:Select the intended audience');
 if(b.confirmed!==true)throw Error('400:Supervisor must confirm review before publication');
 return {title,message,audience:b.audience};
}
export function comparePlans(c:any,roster:any[],reserved:any[],change:string,officer:string){
 const before=plan(c,roster,reserved);let afterCorridor={...c},afterRoster=roster.map(r=>({...r}));let explanation='';
 if(change==='restriction'){afterCorridor={...c,state:'RESTRICTED',expires:null};explanation='An active restriction adds mandatory supervisor review. It cannot be cleared by camera evidence.'}
 else if(change==='officer'){if(!roster.some(r=>r.id===officer&&r.role==='Access officer'))throw Error('400:Select a qualified access officer');afterRoster=afterRoster.map(r=>r.id===officer?{...r,available:false}:r);explanation='Selected officer is unavailable. Existing reservations remain constraints.'}
 else if(change==='coverage'){afterCorridor.coverage='Partial';explanation='Partial camera coverage adds a field coverage-gap inspection.'}
 else throw Error('400:Select a supported constraint change');
 return {before:{corridor:c,plan:before},after:{corridor:afterCorridor,plan:plan(afterCorridor,afterRoster,reserved)},noFeasible:plan(afterCorridor,afterRoster.map(r=>({...r,available:false})),reserved),explanation,change,officer,simulation:true,mutatesOperationalState:false};
}
// Reproducible policy simulation. Baselines below are explicitly defined toy policies, not named products.
export function benchmark(){
 const officers=[{id:'B1',name:'Benchmark officer',role:'Access officer',available:true,distance:100}];
 const scenarios=[
  {name:'Unverified clear-looking image',state:'UNKNOWN',cameraClear:true,available:true,occupied:false,coverage:'Covered'},
  {name:'Restriction despite clear image',state:'RESTRICTED',cameraClear:true,available:true,occupied:false,coverage:'Covered'},
  {name:'Expired field clearance',state:'VERIFICATION_EXPIRED',cameraClear:true,available:true,occupied:false,coverage:'Covered'},
  {name:'Officer already reserved',state:'POSSIBLE_OBSTRUCTION',cameraClear:false,available:true,occupied:true,coverage:'Covered'},
  {name:'No officer on shift',state:'UNKNOWN',cameraClear:false,available:false,occupied:false,coverage:'Partial'},
  {name:'Fresh verified access',state:'VERIFIED_ACCESSIBLE',cameraClear:true,available:true,occupied:false,coverage:'Covered'},
 ];
 const policies=['A · Camera alert only','B · Camera + assignment','C · Dynamic availability','D · RAISE verified interventions'];const rows:any[]=[];
 for(const s of scenarios){const c={id:'BENCH',state:s.state,coverage:s.coverage,length:240,expires:new Date(Date.now()+300000).toISOString()},roster=officers.map(r=>({...r,available:s.available})),reservations=s.occupied?[{responder:'B1'}]:[];
  for(let p=0;p<4;p++){let output:any;const start=performance.now();for(let n=0;n<100;n++){
   if(p===0)output={recommend:s.cameraClear,tasks:0,officer:null,actions:0};
   if(p===1)output={recommend:s.cameraClear,tasks:1,officer:'B1',actions:1};
   if(p===2)output={recommend:s.cameraClear&&s.state!=='RESTRICTED',tasks:s.available&&!s.occupied&&s.state!=='VERIFIED_ACCESSIBLE'?1:0,officer:s.available&&!s.occupied?'B1':null,actions:1};
   if(p===3){const r=plan(c,roster,reservations);output={recommend:effective(c)==='VERIFIED_ACCESSIBLE',tasks:r.options.length?1:0,officer:r.options[0]?.officer||null,actions:r.options[0]?.actionCount||0}}
  }
  rows.push({scenario:s.name,policy:policies[p],meanComputeMs:Number(((performance.now()-start)/100).toFixed(5)),inappropriateRecommendations:Number(output.recommend&&s.state!=='VERIFIED_ACCESSIBLE'),resourceConflicts:Number(output.tasks>0&&(!s.available||s.occupied)),taskCount:output.tasks,plannedActions:output.actions,unresolvedConfirmations:Number(s.state!=='VERIFIED_ACCESSIBLE'),recommended:output.recommend});
 }}
 return {benchmarkVersion:'policy-simulation-v1',iterations:100,scenarios,rows,summary:policies.map(policy=>({policy,...Object.fromEntries(['inappropriateRecommendations','resourceConflicts','taskCount','unresolvedConfirmations'].map(k=>[k,rows.filter(r=>r.policy===policy).reduce((a,r)=>a+r[k],0)])),meanComputeMs:Number((rows.filter(r=>r.policy===policy).reduce((a,r)=>a+r.meanComputeMs,0)/scenarios.length).toFixed(5))})),definitions:['A: clear camera image recommends access; no task.','B: camera rule plus one assignment regardless of availability.','C: camera rule excludes restrictions and only assigns unreserved on-shift officers; does not require fresh field evidence.','D: existing RAISE solver; only fresh verified access is recommended; qualified unreserved personnel only.'],limits:'Synthetic policy comparison; baseline behaviors are assumptions, not industry performance. All unverified cases remain unresolved until real field confirmation. Timing uses the runtime clock; zero means below timer resolution. CPU measurements exclude network, human response and travel. No emergency response-time improvement is claimed.'};
}

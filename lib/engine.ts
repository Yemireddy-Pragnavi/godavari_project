export const roles=['Supervisor','Dispatcher','Camera operator','Access officer','Medical responder','Water-rescue responder','Volunteer','Administrator','Devotee'];
export const commands:Record<string,string[]>={approve:['Supervisor'],restrict:['Supervisor','Access officer'],verify:['Access officer'],observe:['Camera operator','Access officer','Supervisor'],assign:['Dispatcher','Supervisor'],scenario:['Administrator','Supervisor'],settings:['Administrator'],advisory:['Supervisor'],review:['Supervisor','Dispatcher','Camera operator'],incident:['Supervisor','Dispatcher','Medical responder','Water-rescue responder'],task:['Access officer','Medical responder','Water-rescue responder','Volunteer','Supervisor']};
export function allowed(role:string,action:string){return commands[action]?.includes(role)??false}
export function effective(c:any,now=Date.now()){return c.state==='VERIFIED_ACCESSIBLE'&&Date.parse(c.expires)<now?'VERIFICATION_EXPIRED':c.state}
export function transition(c:any,action:string,role:string,version:number,now=Date.now()){
 if(!['restrict','verify'].includes(action))throw Error('400:Unsupported corridor transition');
 if(!allowed(role,action))throw Error('403:This role is not authorized for this action');
 if(version!==c.version)throw Error('409:Stale evidence. Reload the current corridor version');
 if(action==='verify'&&c.state==='RESTRICTED')throw Error('409:An active restriction must be lifted by a supervisor before field verification');
 if(action==='verify'&&!['POSSIBLY_CLEAR','UNKNOWN','VERIFICATION_EXPIRED','POSSIBLE_OBSTRUCTION','REPORTED_OBSTRUCTED'].includes(effective(c,now)))throw Error('409:This corridor is not awaiting field verification');
 return {...c,state:action==='restrict'?'RESTRICTED':'VERIFIED_ACCESSIBLE',verified:action==='verify'?new Date(now).toISOString():c.verified,expires:action==='verify'?new Date(now+300000).toISOString():null,verifier:action==='verify'?role:null};
}
export function plan(c:any,responders:any[],reservations:any[]=[]){
 const state=effective(c);const available=responders.filter(r=>r.role==='Access officer'&&r.available&&!reservations.some(x=>x.responder===r.id)).sort((a,b)=>(a.distance||150)-(b.distance||150)||a.id.localeCompare(b.id));
 if(state==='VERIFIED_ACCESSIBLE')return {options:[],reason:'No intervention required. Current field verification is valid.',algorithm:'Exhaustive constrained action selection',evaluated:0};
 if(!available.length)return {options:[],reason:'No verified feasible intervention: no authorized access officer is available.',algorithm:'Exhaustive constrained action selection',evaluated:0};
 const required=['inspection','field_evidence',...(state==='RESTRICTED'?['authority_review']:[]),...(c.coverage==='Partial'?['coverage_gap']:[])];
 const effort=Math.max(2,Math.ceil((Number(c.length)||180)/60));
 const catalog=[
  {id:'walkthrough',title:'Targeted inspection with evidence',covers:['inspection','field_evidence'],effort:effort+2,disruption:1,safe:true,steps:['Inspect the designated passage','Submit observed conditions and request separate field verification']},
  {id:'inspect',title:'Inspect affected passage',covers:['inspection'],effort,disruption:0,safe:true,steps:['Inspect the affected passage without directing crowd movement']},
  {id:'evidence',title:'Record field evidence',covers:['field_evidence'],effort:3,disruption:0,safe:true,steps:['Record field findings; corridor verification remains a separate authorized action']},
  {id:'review',title:'Supervisor restriction review',covers:['authority_review'],effort:2,disruption:0,safe:true,steps:['Send inspection findings to the supervisor for restriction review; do not reopen the route']},
  {id:'blindspot',title:'Inspect camera coverage gap',covers:['coverage_gap'],effort:4,disruption:1,safe:true,steps:['Inspect the camera coverage gap from an authorized safe vantage point']},
  {id:'clear',title:'Automatically declare passage clear',covers:required,effort:0,disruption:0,safe:false,steps:[]}
 ];
 const combinations:any[]=[];let evaluated=0,rejected=0;
 for(let mask=1;mask<(1<<catalog.length);mask++){
  evaluated++;const selected=catalog.filter((_,i)=>mask&(1<<i));
  if(selected.some(a=>!a.safe)||!required.every(need=>selected.some(a=>a.covers.includes(need)))){rejected++;continue;}
  // Reject irrelevant work and supersets. This is an exact small-set search, not an LLM suggestion.
  if(selected.some(a=>!a.covers.some(need=>required.includes(need)))){rejected++;continue;}
  const total=selected.reduce((v,a)=>v+a.effort,0)+Math.ceil((available[0].distance||150)/100);
  const disruption=selected.reduce((v,a)=>v+a.disruption,0);
  combinations.push({id:selected.map(a=>a.id).join('-'),title:selected.some(a=>a.id==='walkthrough')?'Targeted inspection with evidence':'Separate inspection and evidence tasks',actions:selected.flatMap(a=>a.steps),officer:available[0].id,officerName:available[0].name,people:1,effort:total,disruption:disruption>1?'Medium':'Low',score:selected.length*1000+total*10+disruption,actionCount:selected.length,constraints:required,assumptions:['Actions are sequential and use one available qualified officer','Demo action catalogue is pre-approved only for this simulation','Effort units are illustrative, not response-time predictions','No plan authorizes physical crowd movement or automatic clearance'],outcome:'Eligibility remains pending until authorized field verification'});
 }
 combinations.sort((a,b)=>a.score-b.score||a.id.localeCompare(b.id));
 return {options:combinations.slice(0,3),reason:'Enumerated '+evaluated+' action combinations; rejected '+rejected+' unsafe, incomplete or irrelevant combinations. Minimized action count, then illustrative effort and disruption.',algorithm:'Exact exhaustive constrained search · TypeScript',evaluated,rejected,required,resource:available[0].name,objective:'Action count → effort → disruption; safety is a hard constraint'};
}
export function category(text:string){if(/water|drown|మునిగి/i.test(text))return 'Water rescue';if(/crowd|blocked|obstruct/i.test(text))return 'Safety obstruction';if(/fire|smoke/i.test(text))return 'Fire or smoke';return 'Medical emergency'}

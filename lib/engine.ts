export const roles=['Supervisor','Dispatcher','Camera operator','Access officer','Medical responder','Water-rescue responder','Volunteer','Administrator','Devotee'];
export const commands:Record<string,string[]>={approve:['Supervisor'],restrict:['Supervisor','Access officer'],verify:['Access officer'],observe:['Camera operator','Access officer','Supervisor'],assign:['Dispatcher','Supervisor'],scenario:['Administrator','Supervisor'],settings:['Administrator'],advisory:['Supervisor'],review:['Supervisor','Dispatcher','Camera operator'],incident:['Supervisor','Dispatcher','Medical responder','Water-rescue responder'],task:['Access officer','Medical responder','Water-rescue responder','Volunteer','Supervisor']};
export function allowed(role:string,action:string){return commands[action]?.includes(role)??false}
export function effective(c:any,now=Date.now()){return c.state==='VERIFIED_ACCESSIBLE'&&Date.parse(c.expires)<now?'VERIFICATION_EXPIRED':c.state}
export function transition(c:any,action:string,role:string,version:number,now=Date.now()){
 if(!allowed(role,action))throw Error('403:This role is not authorized for this action');
 if(version!==c.version)throw Error('409:Stale evidence. Reload the current corridor version');
 if(action==='verify'&&c.state==='RESTRICTED')throw Error('409:An active restriction must be lifted by a supervisor before field verification');
 if(action==='verify'&&!['POSSIBLY_CLEAR','UNKNOWN','VERIFICATION_EXPIRED','POSSIBLE_OBSTRUCTION','REPORTED_OBSTRUCTED'].includes(effective(c,now)))throw Error('409:This corridor is not awaiting field verification');
 return {...c,state:action==='restrict'?'RESTRICTED':'VERIFIED_ACCESSIBLE',verified:action==='verify'?new Date(now).toISOString():c.verified,expires:action==='verify'?new Date(now+300000).toISOString():null,verifier:action==='verify'?role:null};
}
export function plan(c:any,responders:any[],reservations:any[]=[]){
 const state=effective(c);const available=responders.filter(r=>r.role==='Access officer'&&r.available&&!reservations.some(x=>x.responder===r.id));
 if(state==='VERIFIED_ACCESSIBLE')return {options:[],reason:'No intervention required. Current field verification is valid.'};
 if(!available.length)return {options:[],reason:'No verified feasible intervention: no authorized access officer is available.'};
 const actions=state==='RESTRICTED'?['Inspect restriction and report findings','Supervisor reviews restriction removal','Reverify the designated passage']:['Inspect affected segment','Submit time-limited field verification'];
 return {options:[{id:'minimal',title:'Targeted field inspection',actions,officer:available[0].id,people:1,effort:state==='RESTRICTED'?8:4,disruption:'Low',score:actions.length*10+4,assumptions:['Inspection is permitted in this sector','Officer remains available','No physical crowd movement is automatically authorized'],outcome:'Eligibility remains pending until authorized field verification'},{id:'alternative',title:'Inspect alternative access',actions:['Inspect alternate approach','Confirm continuity to medical post','Submit field verification'],officer:available[0].id,people:1,effort:10,disruption:'Medium',score:40,assumptions:['Alternative passage is pre-approved in demo configuration','All critical segments need fresh verification'],outcome:'Alternative availability is unknown until inspection'}],reason:'Smallest permitted action set; authority and resource eligibility are hard constraints.'};
}
export function category(text:string){if(/water|drown|మునిగి/i.test(text))return 'Water rescue';if(/crowd|blocked|obstruct/i.test(text))return 'Safety obstruction';if(/fire|smoke/i.test(text))return 'Fire or smoke';return 'Medical emergency'}

// Executes the actual API handler against SQLite through a D1-compatible test adapter.
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
const dir=resolve('.sites-runtime/api-tests');mkdirSync(dir,{recursive:true});
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_brave_jamie_braddock.sql','utf8').replaceAll('--> statement-breakpoint',''));
function statement(query){let values=[];return{bind(...v){values=v;return this},async all(){return {results:sql.prepare(query).all(...values)}},async first(){return sql.prepare(query).get(...values)||null},async run(){const r=sql.prepare(query).run(...values);return {meta:{changes:Number(r.changes)}}}}}
globalThis.__guardianDB={prepare:statement,async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
for(const name of ['engine','seed'])writeFileSync(dir+'/'+name+'.mjs',ts.transpileModule(readFileSync('lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
let route=readFileSync('app/api/[...path]/route.ts','utf8').replace("import {env} from 'cloudflare:workers';","const env={DB:globalThis.__guardianDB};").replaceAll("'../../../lib/seed'","'./seed.mjs'").replaceAll("'../../../lib/engine'","'./engine.mjs'");
writeFileSync(dir+'/route.mjs',ts.transpileModule(route,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {GET,POST}=await import(dir+'/route.mjs');
globalThis.fetch=async(url,options={})=>(options.method==='POST'?POST:GET)(new Request(url,options));
await import('./api-test.mjs');

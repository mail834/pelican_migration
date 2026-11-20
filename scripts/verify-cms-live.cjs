/* eslint-disable @typescript-eslint/no-require-imports -- Read-only query contract checks. */
const fs=require('fs'),ts=require('typescript'),Module=require('module'),assert=require('node:assert/strict');
const compiled=new Module(require('node:path').resolve('src/lib/cms/queries.ts'),module);
compiled._compile(ts.transpileModule(fs.readFileSync('src/lib/cms/queries.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,require("node:path").resolve("src/lib/cms/queries.ts"));
const {PAGE,APPROVALS,HOME_TESTIMONIALS,BLOGS,BLOG}=compiled.exports;
// Private dataset: pass SANITY_API_READ_TOKEN (viewer token), e.g. `node --env-file=.env.local scripts/verify-cms-live.cjs`.
const token=process.env.SANITY_API_READ_TOKEN;
const endpoint=()=>new URL('https://th8gmrhr.api.sanity.io/v2025-02-19/data/query/production');
(async()=>{
 for(const [name,query,params] of [['page',PAGE,{path:'/canada-migration'}],['gallery',APPROVALS,{home:false}],['homepage gallery',APPROVALS,{home:true}],['homepage videos',HOME_TESTIMONIALS,{}],['blog listing',BLOGS,{}],['blog detail',BLOG,{slug:'essential-documents-australia'}]]){
  const url=endpoint();url.searchParams.set('query',query);url.searchParams.set('perspective','published');for(const [key,value] of Object.entries(params))url.searchParams.set('$'+key,JSON.stringify(value));
  const response=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(15000)});assert.ok(response.ok,`${name}: ${response.status}`);const result=await response.json();assert.ok(!result.error,name);console.log(`${name}: valid published GROQ query`);
 }
 // DATA-001: once the dataset is private, anonymous queries must not see any documents.
 const anon=endpoint();anon.searchParams.set('query','count(*)');
 const response=await fetch(anon,{signal:AbortSignal.timeout(15000)});const body=await response.json().catch(()=>({}));
 if(token){assert.ok(!response.ok||body.result===0,`DATA-001: anonymous query returned ${body.result} documents; dataset is still public`);console.log('DATA-001: dataset is not publicly readable');}
 else console.warn(`DATA-001 skipped: no SANITY_API_READ_TOKEN set (anonymous query sees ${body.result ?? response.status} documents)`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});

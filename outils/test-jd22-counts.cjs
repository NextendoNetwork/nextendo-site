const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/jd22-counts.js'), 'utf8');
const tid = '0100ea6014bb8000';
async function run(stats, ok = true, failure = false) {
  const context = {window:{nxOnlineCounts:async()=>({counts:{other:7,[tid]:99},jeux:[{nom:'other',titres:['other']}],availability:{other:true}})},
    fetch:async()=>{if(failure) throw new Error('offline');return {ok,json:async()=>stats};}};
  vm.runInNewContext(source, context);
  return context.window.nxOnlineCounts();
}
(async()=>{
  for(const count of [0,2]){
    const data=await run({game:'Just Dance 2022',titleId:tid,online:true,connected:count});
    assert.equal(data.counts[tid],count);assert.equal(data.availability[tid],true);assert.equal(data.counts.other,7);
  }
  for(const stats of [null,{}, {game:'Just Dance 2022',titleId:tid,online:true,connected:-1},
      {game:'Other',titleId:tid,online:true,connected:2},{game:'Just Dance 2022',titleId:'other',online:true,connected:2},
      {game:'Just Dance 2022',titleId:tid,online:true,connected:1.5}]){
    const data=await run(stats);assert.equal(data.counts[tid],undefined);assert.equal(data.availability[tid],false);assert.equal(data.counts.other,7);
  }
  for(const data of [await run(null,false),await run(null,true,true)]) assert.equal(data.availability[tid],false);
  console.log('JD22: real zero/two players, invalid replies and unreachable server handled; unrelated counts preserved');
})().catch(e=>{console.error(e);process.exitCode=1;});

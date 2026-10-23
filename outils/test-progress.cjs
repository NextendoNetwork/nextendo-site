// Regression: a long game section may never reach 25% viewport intersection.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const file=process.argv[2]||path.join(__dirname,'../assets/js/rework.js');
const source=fs.readFileSync(file,'utf8');
const start=source.indexOf('  var PROGRES = [');
const end=source.indexOf('\n  ];',start)+6;
const fnStart=source.indexOf('  function progres()');
const fnEnd=source.indexOf('\n  // --- The team:',fnStart);
function node(){return {textContent:'0%',attributes:{},children:[],fields:{},style:{setProperty(k,v){this[k]=v;}},
 classList:{add(k){this[k]=true;}},setAttribute(k,v){this.attributes[k]=v;},
 querySelector(k){return this.fields[k]||(this.fields[k]=node());},appendChild(n){this.children.push(n);}};}
for(const observe of [true,false]){
 const nodes={};for(const id of ['progres','progres-liste','anneau','anneau-pct'])nodes[id]=node();
 let target,callback,disconnected=false;
 const context={window:{},document:{getElementById:id=>nodes[id],createElement:node},$:id=>nodes[id],iconeDe:()=>'',
 IntersectionObserver:class{constructor(cb){callback=cb;}observe(n){target=n;}disconnect(){disconnected=true;}}};
 if(observe)context.window.IntersectionObserver=context.IntersectionObserver;
 vm.createContext(context);vm.runInContext(source.slice(start,end)+'\n'+source.slice(fnStart,fnEnd)+'\nprogres();',context);
 const expected=vm.runInContext('Math.round(PROGRES.reduce((sum,g)=>sum+g.pct,0)/PROGRES.length)',context);
 assert.ok(expected>0);assert.equal(nodes['anneau-pct'].textContent,expected+'%');
 assert.equal(nodes.anneau.attributes['aria-label'],'Overall progress: '+expected+'%');
 if(observe){assert.equal(target,nodes.anneau);callback([{isIntersecting:true}]);assert.equal(disconnected,true);}
 assert.equal(nodes.anneau.style['--pct'],expected);assert.equal(nodes.progres.classList['est-visible'],true);
}
console.log('Progress average remains accurate before animation; ring observation and no-observer fallback passed for '+file);

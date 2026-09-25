// Translations of the rework. a_traduire.txt = English strings (one per line); t_<lang>.txt = "<line number>	<translation>";
// reprises.json = strings already translated on the live site. Run: node outils/i18n/construire.js
// Builds Site Rework/assets/js/i18n/<lang>.js from the live site's translations and t_<lang>.txt.
const fs=require('fs');
const path=require('path');process.chdir(__dirname);const OUT=path.join(__dirname,'../../assets/js/i18n/');
const reprises=JSON.parse(fs.readFileSync('reprises.json','utf8'));
const cles=fs.readFileSync('a_traduire.txt','utf8').split('\n').filter(Boolean);
const propre=s=>String(s).replace(/<[^>]+>/g,'').replace(/\s*—\s*/g,', ').replace(/\s+/g,' ').trim();
for(const l of ['es','fr','pt','de','it','ru','zh','ja','ar']){
  const f='t_'+l+'.txt'; if(!fs.existsSync(f)) continue;
  const d={}; let err=0;
  for(const c in reprises) if(reprises[c][l]) d[c]=propre(reprises[c][l]);
  const lignes=fs.readFileSync(f,'utf8').split('\n').filter(Boolean);
  const vus=new Set();
  for(const ln of lignes){
    const m=ln.match(/^(\d+)\t(.*)$/); if(!m){console.log(l,'format',ln.slice(0,40));err++;continue;}
    const i=+m[1]-1, t=m[2].trim(), c=cles[i];
    if(!c){console.log(l,'index',m[1]);err++;continue;}
    vus.add(i);
    const ph=s=>(s.match(/\{\d\}/g)||[]).sort().join();
    const pc=ph(c), pt=ph(t);
    if(pc!==pt && !(pt.length<pc.length && pt.split(',').every(x=>!x||pc.includes(x)))){console.log(l,'placeholders',m[1],t);err++;}
    if(/—/.test(t)){console.log(l,'tiret cadratin',m[1]);err++;}
    d[c]=t;
  }
  const manque=cles.map((c,i)=>vus.has(i)?null:i+1).filter(Boolean);
  if(manque.length){console.log(l,'manquent',manque.join(','));err++;}
  fs.writeFileSync(OUT+l+'.js','/* Nextendo Network, '+l+' translations of the English interface (keyed by the English text). */\nwindow.NXT = window.NXT || {};\nwindow.NXT["'+l+'"] = '+JSON.stringify(d,null,0).replace(/","/g,'",\n"')+';\n');
  console.log(l,Object.keys(d).length,'entrées',err?err+' erreurs':'ok');
}

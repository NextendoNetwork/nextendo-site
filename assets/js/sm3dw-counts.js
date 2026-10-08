(function () {
 "use strict";
 window.nxOnlineCounts = function () {
  return Promise.all([
   fetch("/api/online-counts", {cache:"no-store"}).then(function(r){if(!r.ok) throw new Error("Counts unavailable");return r.json();}),
   fetch("/game-stats/sm3dw", {cache:"no-store"}).then(function(r){if(!r.ok) throw new Error("SM3DW unavailable");return r.json();})
  ]).then(function(results){
   var d=results[0], s=results[1], tid="010028600ebda000";
   d.counts=d.counts||{}; d.counts[tid]=s.connected;
   d.jeux=(d.jeux||[]).filter(function(g){return (g.titres||[]).indexOf(tid)<0;});
   d.jeux.push({nom:"Super Mario 3D World + Bowser's Fury",titres:[tid],joueurs:s.connected});
   return d;
  });
 };
})();

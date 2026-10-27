(function () {
 "use strict";
 window.nxOnlineCounts = function () {
  return Promise.all([
   fetch("/api/online-counts", {cache:"no-store"}).then(function(r){if(!r.ok) throw new Error("Counts unavailable");return r.json();}),
   fetch("/game-stats/sm3dw", {cache:"no-store"}).then(function(r){if(!r.ok) throw new Error("SM3DW unavailable");return r.json();}),
   fetch("/game-stats/jamboree", {cache:"no-store"}).then(function(r){if(!r.ok) return null;return r.json();}).catch(function(){return null;}),
   fetch("/game-stats/stardew", {cache:"no-store"}).then(function(r){if(!r.ok) return null;return r.json();}).catch(function(){return null;}),
   fetch("/game-stats/kirby", {cache:"no-store"}).then(function(r){if(!r.ok) return null;return r.json();}).catch(function(){return null;})
  ]).then(function(results){
   var d=results[0], s=results[1], tid="010028600ebda000";
   d.counts=d.counts||{}; d.counts[tid]=s.connected;
   d.jeux=(d.jeux||[]).filter(function(g){return (g.titres||[]).indexOf(tid)<0;});
   d.jeux.push({nom:"Super Mario 3D World + Bowser's Fury",titres:[tid],joueurs:s.connected});
   var jamboree=results[2], jamboreeTitle="0100965017338000";
   delete d.counts[jamboreeTitle];
   d.jeux=d.jeux.filter(function(g){return (g.titres||[]).indexOf(jamboreeTitle)<0;});
   if(jamboree && jamboree.online===true && typeof jamboree.connected==="number") {
    d.counts[jamboreeTitle]=jamboree.connected;
    d.jeux.push({nom:"Super Mario Party Jamboree",titres:[jamboreeTitle],joueurs:jamboree.connected});
   }
   var stardew=results[3], stardewTitle="0100e65002bb8000";
   delete d.counts[stardewTitle];
   d.jeux=d.jeux.filter(function(g){return (g.titres||[]).indexOf(stardewTitle)<0;});
   if(stardew && stardew.online===true && typeof stardew.connected==="number") {
    d.counts[stardewTitle]=stardew.connected;
    d.jeux.push({nom:"Stardew Valley",titres:[stardewTitle],joueurs:stardew.connected});
   }
   var kirby=results[4], kirbyTitle="0100a8e016236000";
   delete d.counts[kirbyTitle];
   d.jeux=d.jeux.filter(function(g){return (g.titres||[]).indexOf(kirbyTitle)<0;});
   if(kirby && kirby.online===true && typeof kirby.connected==="number") {
    d.counts[kirbyTitle]=kirby.connected;
    d.jeux.push({nom:"Kirby's Dream Buffet",titres:[kirbyTitle],joueurs:kirby.connected});
   }
   return d;
  });
 };
})();

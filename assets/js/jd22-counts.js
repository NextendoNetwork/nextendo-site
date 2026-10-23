// Aggregate JD health comes from its server; a failed probe never means "0 online".
(function () {
  "use strict";
  var previous = window.nxOnlineCounts;
  var title = "0100ea6014bb8000";
  window.nxOnlineCounts = function () {
    return Promise.all([
      previous(),
      fetch("/game-stats/justdance22", { cache: "no-store" }).then(function (r) {
        return r.ok ? r.json() : null;
      }).catch(function () { return null; })
    ]).then(function (results) {
      var data = results[0], stats = results[1];
      data.counts = data.counts || {};
      data.availability = data.availability || {};
      delete data.counts[title];
      data.availability[title] = false;
      data.jeux = (data.jeux || []).filter(function (g) { return (g.titres || []).indexOf(title) < 0; });
      if (stats && stats.game === "Just Dance 2022" && stats.titleId === title &&
          stats.online === true && Number.isSafeInteger(stats.connected) && stats.connected >= 0) {
        data.counts[title] = stats.connected;
        data.availability[title] = true;
        data.jeux.push({ nom: "Just Dance 2022", titres: [title], joueurs: stats.connected });
      }
      return data;
    });
  };
})();

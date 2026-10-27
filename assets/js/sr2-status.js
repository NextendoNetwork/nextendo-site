(function () {
  "use strict";
  var previous = window.nxOnlineCounts;
  var title = "01004cc023582000";
  if (typeof previous !== "function") return;
  function readStatus() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 4500);
    return fetch("/service-catalog/v1/sr2-status", {cache: "no-store", credentials: "omit", signal: controller.signal})
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .finally(function () { clearTimeout(timer); });
  }
  window.nxOnlineCounts = function () {
    return Promise.all([previous(), readStatus()]).then(function (results) {
      var data = Object.assign({}, results[0]);
      data.counts = Object.assign({}, data.counts);
      data.availability = Object.assign({}, data.availability);
      data.jeux = (data.jeux || []).filter(function (g) { return (g.titres || []).indexOf(title) < 0; });
      delete data.counts[title];
      data.availability[title] = false;
      var stats = results[1];
      if (stats && stats.game === "SpeedRunners 2: King of Speed" && stats.titleId === title && stats.online === true && stats.countScope === "recent_game_presence") {
        data.availability[title] = true;
        if (Number.isSafeInteger(stats.players) && stats.players >= 0 && stats.players <= 50000) {
          data.counts[title] = stats.players;
          data.jeux.push({nom: stats.game, titres: [title], joueurs: stats.players});
        }
      }
      return data;
    });
  };
})();

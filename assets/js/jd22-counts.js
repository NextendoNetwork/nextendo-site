// Aggregate JD health comes from its server; a failed probe never means "0 online".
(function () {
  "use strict";
  var previous = window.nxOnlineCounts;
  var title = "0100ea6014bb8000";
  var classics = {
    "0100d870045b6000": "NES - Nintendo Classics",
    "01008d300c50c000": "SNES - Nintendo Classics",
    "0100c62011050000": "Game Boy - Nintendo Classics",
    "010012f017576000": "Game Boy Advance - Nintendo Classics",
    "0100b3c014bda000": "SEGA Genesis - Nintendo Classics"
  };
  function read(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      return r.ok ? r.json() : null;
    }).catch(function () { return null; });
  }
  window.nxOnlineCounts = function () {
    return Promise.all([
      previous(),
      read("/game-stats/justdance22"),
      read("/service-catalog/v1/online-counts")
    ]).then(function (results) {
      // The base response may be cached by the shared loader; do not mutate it.
      var data = Object.assign({}, results[0]), stats = results[1];
      data.counts = Object.assign({}, data.counts);
      data.availability = Object.assign({}, data.availability);
      delete data.counts[title];
      data.availability[title] = false;
      data.jeux = (data.jeux || []).filter(function (g) { return (g.titres || []).indexOf(title) < 0; });
      if (stats && stats.game === "Just Dance 2022" && stats.titleId === title &&
          stats.online === true && Number.isSafeInteger(stats.connected) && stats.connected >= 0) {
        data.counts[title] = stats.connected;
        data.availability[title] = true;
        data.jeux.push({ nom: "Just Dance 2022", titres: [title], joueurs: stats.connected });
      }
      var counts = results[2] && results[2].counts;
      Object.keys(classics).forEach(function (id) {
        delete data.counts[id];
        data.availability[id] = false;
        data.jeux = data.jeux.filter(function (g) { return (g.titres || []).indexOf(id) < 0; });
        var n = counts && counts[id];
        if (Number.isSafeInteger(n) && n >= 0) {
          data.counts[id] = n;
          data.availability[id] = true;
          data.jeux.push({ nom: classics[id], titres: [id], joueurs: n });
        }
      });
      return data;
    });
  };
})();

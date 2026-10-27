(function () {
  "use strict";
  var counts = window.nxOnlineCounts;
  if (typeof counts !== "function") return;
  var unoTitle = "0100b6e012ebe000";

  // Probe UNO's live aggregate endpoint. Counts and details come from verified live sessions and room memberships.
  function checkUNO() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 4500);
    return fetch("/game-stats/uno-count", { cache: "no-store", credentials: "omit", signal: controller.signal })
      .then(function (r) { if (!r.ok) return null; return r.json(); })
      .then(function (data) {
        return data && data.game === "UNO" && data.titleId === unoTitle && Number.isInteger(data.connected) && data.connected >= 0 ? data : null;
      })
      .catch(function () { return null; })
      .finally(function () { clearTimeout(timer); });
  }

  window.nxOnlineCounts = function () {
    return Promise.all([counts(), checkUNO()]).then(function (results) {
      var data = results[0];
      data.availability = data.availability || {};
      data.availability[unoTitle] = !!results[1];
      data.counts = data.counts || {};
      if (results[1]) {
        data.counts[unoTitle] = results[1].connected;
        data.jeux = (data.jeux || []).filter(function (game) { return (game.titres || []).indexOf(unoTitle) < 0; });
        data.jeux.push({nom: "UNO", titres: [unoTitle], joueurs: results[1].connected});
      }
      return data;
    });
  };
})();

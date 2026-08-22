/* [Nextendo] Status page — polls /api/online-counts and renders live per-game status.
   The endpoint returns { counts: { "<titleId>": <players>, ... } }: a title present (even at 0)
   means its server answered = UP; a title absent means the server did not answer = DOWN.
   Game names are hard-coded (not taken from the response) and counts are numeric, so nothing
   from the network is ever injected as HTML.

   All dynamic strings are generated here (not via data-i18n), so we re-render whenever the site
   language changes — nx-ui sets <html lang> when it applies the saved language, which can happen
   AFTER our first render. */
(function () {
  "use strict";

  var GAMES = [
    { name: "Mario Kart 8 Deluxe", ids: ["0100152000022000"] },
    { name: "Splatoon 2", ids: ["0100f8f0000a2000", "01003bc0000a0000", "01003c700009c800"] },
    { name: "Splatoon 3", ids: ["0100c2500fc20000"] },
    { name: "Super Smash Bros. Ultimate", ids: ["01006a800016e000"] },
    { name: "Animal Crossing: New Horizons", ids: ["01006f8002326000"] },
    { name: "Luigi's Mansion 3", ids: ["0100dca0064a6000"] },
    { name: "Minecraft: Nintendo Switch Edition", ids: ["01006bd001e06000"] }
  ];

  var POLL_MS = 15000;

  var grid = document.getElementById("status-grid");
  var banner = document.getElementById("status-banner");
  var bannerTitle = document.getElementById("status-banner-title");
  var bannerSub = document.getElementById("status-banner-sub");
  var totalEl = document.getElementById("status-total");
  var updatedEl = document.getElementById("status-updated");

  if (!grid) { return; }

  // Latest known data. draw() renders it in the CURRENT language, so re-drawing on a language
  // change is enough to translate everything.
  var state = { counts: null, error: false, stamp: null };

  function t(key, fallback) {
    var v = window.NXI18N && typeof window.NXI18N.t === "function" ? window.NXI18N.t(key) : null;
    return v || fallback;
  }

  function lookup(game, counts) {
    for (var i = 0; i < game.ids.length; i++) {
      var id = game.ids[i];
      if (Object.prototype.hasOwnProperty.call(counts, id)) {
        return { up: true, players: Number(counts[id]) || 0 };
      }
    }
    return { up: false, players: 0 };
  }

  function playersLabel(n) {
    return n + " " + (n === 1 ? t("status.player", "player") : t("status.players", "players"));
  }

  function stampText() {
    if (!state.stamp) { return ""; }
    try {
      var lang = (window.NXI18N && window.NXI18N.lang && window.NXI18N.lang()) || document.documentElement.lang || "en";
      return t("status.updated", "Updated") + " " + state.stamp.toLocaleTimeString(lang);
    } catch (e) {
      return t("status.updated", "Updated");
    }
  }

  function drawData(counts) {
    var total = 0, up = 0;
    var frag = document.createDocumentFragment();

    GAMES.forEach(function (game) {
      var r = lookup(game, counts);
      if (r.up) { up++; total += r.players; }

      var row = document.createElement("div");
      row.className = "status-row " + (r.up ? "is-up" : "is-down");

      var dot = document.createElement("span");
      dot.className = "status-row__dot";

      var name = document.createElement("span");
      name.className = "status-row__name";
      name.textContent = game.name;

      var st = document.createElement("span");
      st.className = "status-row__state";
      st.textContent = r.up ? t("status.online", "Online") : t("status.offline", "Offline");

      var players = document.createElement("span");
      players.className = "status-row__players";
      players.textContent = r.up ? playersLabel(r.players) : "—";

      row.appendChild(dot);
      row.appendChild(name);
      row.appendChild(st);
      row.appendChild(players);
      frag.appendChild(row);
    });

    grid.textContent = "";
    grid.appendChild(frag);
    totalEl.textContent = String(total);

    banner.classList.remove("is-up", "is-partial", "is-down");
    if (up === GAMES.length) {
      banner.classList.add("is-up");
      bannerTitle.textContent = t("status.allUp", "All systems operational");
      bannerSub.textContent = t("status.allUpSub", "Every game server is responding.");
    } else if (up === 0) {
      banner.classList.add("is-down");
      bannerTitle.textContent = t("status.allDown", "Servers unreachable");
      bannerSub.textContent = t("status.allDownSub", "No game server is responding right now.");
    } else {
      banner.classList.add("is-partial");
      bannerTitle.textContent = t("status.partial", "Partial outage");
      bannerSub.textContent = (GAMES.length - up) + " / " + GAMES.length + " " + t("status.partialSub", "server(s) not responding.");
    }

    updatedEl.textContent = stampText();
  }

  function drawError() {
    banner.classList.remove("is-up", "is-partial");
    banner.classList.add("is-down");
    bannerTitle.textContent = t("status.unreachable", "Status unavailable");
    bannerSub.textContent = t("status.unreachableSub", "Could not reach the status endpoint.");
    updatedEl.textContent = stampText();
  }

  function draw() {
    if (state.error) { drawError(); }
    else if (state.counts) { drawData(state.counts); }
    else { bannerTitle.textContent = t("status.checking", "Checking…"); }
  }

  function poll() {
    fetch("/api/online-counts", { cache: "no-store" })
      .then(function (r) { if (!r.ok) { throw new Error("http"); } return r.json(); })
      .then(function (j) { state.counts = (j && j.counts) || {}; state.error = false; state.stamp = new Date(); draw(); })
      .catch(function () { state.error = true; state.stamp = new Date(); draw(); });
  }

  // Re-render on language change: nx-ui sets <html lang> when it applies the language, possibly
  // after our first render. Without this the JS-generated strings stay in the initial language.
  try {
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  } catch (e) { /* MutationObserver unsupported: the 15s poll will still refresh strings */ }

  draw();
  poll();
  setInterval(poll, POLL_MS);
})();

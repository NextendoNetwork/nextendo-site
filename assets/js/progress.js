/* [Nextendo] Homepage "Progression" section — per-game completion, an overall ring, done items
   with a check. Edit the ITEMS array to update: names are proper nouns (no translation needed),
   pct is 0–100, detail is a short line of WHAT CURRENTLY WORKS. The overall percentage is the
   average and is computed here. */
(function () {
  "use strict";

  var T = function (k, fb) { var v = window.NXI18N && typeof window.NXI18N.t === "function" ? window.NXI18N.t(k) : null; return (v == null || v === k) ? fb : v; };

  // detail = what works today (not what's missing). pct 0–100.
  var ITEMS = [
    { name: "Mario Kart 8 Deluxe", pct: 91, detailKey: "progress.detail.mario-kart", detail: "Courses en ligne mondiales, salons et amis" },
    { name: "Splatoon 2", pct: 87, detailKey: "progress.detail.splatoon-2", detail: "Turf War à 8, amis et Salmon Run" }, // Splatfest: matchmaking ET dessins KO (2 sujets distincts)
    { name: "Super Smash Bros. Ultimate", pct: 84, detailKey: "progress.detail.smash", detail: "Arènes en ligne et amis" },
    { name: "Animal Crossing: New Horizons", pct: 73, detailKey: "progress.detail.animal-crossing", detail: "Visites d'île entre amis" },
    { name: "Mario Strikers: Battle League", pct: 56, detailKey: "progress.detail.mario-strikers", detail: "Matchmaking et clubs en ligne" },
    { name: "Minecraft", pct: 51, detailKey: "progress.detail.minecraft", detail: "Connexion au serveur en ligne" },
    { name: "Mario Party Jamboree", pct: 34, detailKey: "progress.detail.mario-party", detail: "Le jeu démarre correctement" },
    { name: "Splatoon 3", pct: 27, detailKey: "progress.detail.splatoon-3", detail: "Le jeu démarre correctement" },
    { name: "Super Mario Maker 2", pct: 16, detailKey: "progress.detail.mario-maker-2", detail: "En préparation" }
  ];

  var list = document.getElementById("progress-list");
  var ring = document.getElementById("progress-ring");
  var pctEl = document.getElementById("progress-pct");
  if (!list) { return; }

  var sum = 0;
  var frag = document.createDocumentFragment();
  var detailRefs = [];

  ITEMS.forEach(function (it) {
    var pct = Math.max(0, Math.min(100, Number(it.pct) || 0));
    sum += pct;
    var done = pct >= 100;

    var row = document.createElement("div");
    row.className = "progress-item" + (done ? " is-done" : "");

    if (done) {
      var ic = document.createElement("i");
      ic.className = "ph ph-check-circle progress-item__ic";
      ic.setAttribute("aria-hidden", "true");
      row.appendChild(ic);
    } else {
      var icw = document.createElement("span");
      icw.className = "progress-item__ic";
      var d = document.createElement("span");
      d.className = "progress-item__dot";
      icw.appendChild(d);
      row.appendChild(icw);
    }

    var main = document.createElement("div");
    main.className = "progress-item__main";

    var name = document.createElement("span");
    name.className = "progress-item__name";
    name.textContent = it.name;
    main.appendChild(name);

    if (it.detailKey) {
      var det = document.createElement("span");
      det.className = "progress-item__detail";
      det.textContent = T(it.detailKey, it.detail || "");
      detailRefs.push({ el: det, key: it.detailKey, fb: it.detail || "" });
      main.appendChild(det);
    }
    row.appendChild(main);

    var p = document.createElement("span");
    p.className = "progress-item__pct";
    p.textContent = "[" + pct + "%]";
    row.appendChild(p);

    frag.appendChild(row);
  });

  list.textContent = "";
  list.appendChild(frag);

  var overall = ITEMS.length ? Math.round(sum / ITEMS.length) : 0;
  if (ring) { ring.style.setProperty("--p", String(overall)); }
  if (pctEl) { pctEl.textContent = overall + "%"; }

  if (detailRefs.length && typeof window.addEventListener === "function") {
    document.addEventListener("nx:lang", function () {
      detailRefs.forEach(function (r) { r.el.textContent = T(r.key, r.fb); });
    });
  }
})();

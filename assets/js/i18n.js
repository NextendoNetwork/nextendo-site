/* Nextendo Network, translations.
   The pages are written in English; this layer swaps every visible string for the chosen language,
   including what the scripts render later (lists, dialogs, toasts), by looking the English text up
   in assets/js/i18n/<lang>.js. Numbers inside a sentence are kept: "See all 22 games" is found as
   "See all {0} games". The language comes from localStorage "nx_lang" (shared with the live site),
   then from the browser, and never leaves the device. */
(function () {
  "use strict";

  var LANGS = [
    { code: "en", nom: "English", pays: "gb" },
    { code: "es", nom: "Español", pays: "es" },
    { code: "fr", nom: "Français", pays: "fr" },
    { code: "pt", nom: "Português", pays: "br" },
    { code: "de", nom: "Deutsch", pays: "de" },
    { code: "it", nom: "Italiano", pays: "it" },
    { code: "ru", nom: "Русский", pays: "ru" },
    { code: "zh", nom: "中文", pays: "cn" },
    { code: "ja", nom: "日本語", pays: "jp" },
    { code: "ar", nom: "العربية", pays: "sa" }
  ];
  var codes = LANGS.map(function (l) { return l.code; });
  var CLE = "nx_lang";

  function detecter() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && codes.indexOf(q) >= 0) { try { localStorage.setItem(CLE, q); } catch (e) {} return q; }
    try { var s = localStorage.getItem(CLE); if (s && codes.indexOf(s) >= 0) return s; } catch (e) {}
    var navs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < navs.length; i++) {
      var deux = String(navs[i]).slice(0, 2).toLowerCase();
      if (codes.indexOf(deux) >= 0) return deux;
    }
    return "en";
  }

  var langue = detecter();
  // Maintenance: ?nxcollecte lists every English string the page shows in window.nxManquants.
  if (/[?&]nxcollecte/.test(location.search)) { langue = "xx"; window.NXT = { xx: {} }; }
  var racine = document.documentElement;
  window.nxLangue = langue;
  window.NXT = window.NXT || {};
  racine.lang = langue;
  if (langue === "ar") racine.dir = "rtl";

  // --- Lookup -------------------------------------------------------------------------------

  var manquants = new Set();
  window.nxManquants = manquants;
  var poses = new WeakMap(); // node -> text we wrote, so our own writes are not translated twice

  function patron(n) {
    var nums = [];
    var p = n.replace(/\d+(?:[.,:]\d+)*/g, function (m) { nums.push(m); return "{" + (nums.length - 1) + "}"; });
    return { p: p, nums: nums };
  }

  function traduire(s) {
    var d = window.NXT[langue];
    if (!d) return null;
    var n = s.replace(/\s+/g, " ").trim();
    if (!n || !/[A-Za-z]/.test(n)) return null;
    if (Object.prototype.hasOwnProperty.call(d, n)) return d[n];
    var q = patron(n);
    if (q.nums.length && Object.prototype.hasOwnProperty.call(d, q.p)) {
      return d[q.p].replace(/\{(\d)\}/g, function (m, i) { return q.nums[+i]; });
    }
    manquants.add(n);
    return null;
  }
  window.nxT = function (s) { var t = traduire(s); return t == null ? s : t; };
  // A sentence with values ("Played {0}"): the template is translated whole, then filled.
  window.nxF = function (modele) {
    var v = arguments, t = window.NXT[langue] && Object.prototype.hasOwnProperty.call(window.NXT[langue], modele) ? window.NXT[langue][modele] : modele;
    if (!(window.NXT[langue] && Object.prototype.hasOwnProperty.call(window.NXT[langue], modele)) && langue !== "en") manquants.add(modele);
    return t.replace(/\{(\d)\}/g, function (m, i) { return v[+i + 1] == null ? "" : v[+i + 1]; });
  };

  var IGNORE = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, NOSCRIPT: 1, SVG: 1 };
  function ignore(el) {
    for (var e = el; e && e !== document.body; e = e.parentElement) {
      if (IGNORE[e.tagName] || IGNORE[e.tagName.toUpperCase()]) return true;
      if (e.getAttribute && (e.getAttribute("translate") === "no" || e.classList.contains("mono"))) return true;
    }
    return false;
  }

  function texte(node) {
    if (poses.get(node) === node.data) return;
    var v = node.data;
    if (!/[A-Za-z]/.test(v) || ignore(node.parentElement)) return;
    var t = traduire(v);
    if (t == null || t === v.trim()) return;
    var avant = v.match(/^\s*/)[0], apres = v.match(/\s*$/)[0];
    node.data = avant + t + apres;
    poses.set(node, node.data);
  }

  var ATTRS = ["placeholder", "aria-label", "title", "alt", "data-vide"];
  function attributs(el) {
    if (ignore(el)) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a);
      if (!v || el["__nx" + a] === v) continue;
      var t = traduire(v);
      if (t != null && t !== v) { el.setAttribute(a, t); el["__nx" + a] = t; }
    }
    if (el.tagName === "INPUT" && (el.type === "submit" || el.type === "button") && el.value) {
      var tv = traduire(el.value); if (tv != null) el.value = tv;
    }
  }

  function parcourir(racineNoeud) {
    if (racineNoeud.nodeType === 3) { texte(racineNoeud); return; }
    if (racineNoeud.nodeType !== 1) return;
    attributs(racineNoeud);
    var w = document.createTreeWalker(racineNoeud, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) texte(n); else attributs(n); }
  }

  // "Sign in, Nextendo Network": only the part before the comma is translated.
  window.nxTitre = function (titre) {
    var i = titre.indexOf(", Nextendo");
    var t = traduire(i > 0 ? titre.slice(0, i) : titre);
    return t == null ? titre : t + (i > 0 ? titre.slice(i) : "");
  };
  function tete() {
    document.title = window.nxTitre(document.title);
    var m = document.querySelector('meta[name="description"]');
    if (m) { var tm = traduire(m.content); if (tm) m.content = tm; }
  }

  // --- Language picker (navbar and mobile menu, added once commun.js built them) -------------

  function selecteur() {
    var groupe = document.querySelector(".barre .compte-groupe");
    if (!groupe || document.getElementById("choix-langue")) return;
    var cur = LANGS[Math.max(0, codes.indexOf(langue))];
    var drapeau = function (l) { return '<img src="https://flagcdn.com/' + l.pays + '.svg" alt="" width="20" height="15">'; };
    var bloc = document.createElement("div");
    bloc.className = "choix-langue";
    bloc.setAttribute("translate", "no");
    bloc.innerHTML =
      '<button type="button" id="choix-langue" aria-haspopup="true" aria-expanded="false" aria-label="Language: ' + cur.nom + '">' +
        drapeau(cur) + "<span>" + cur.code.toUpperCase() + "</span></button>" +
      '<ul class="langues" role="menu" hidden>' +
        LANGS.map(function (l) {
          return '<li role="none"><button type="button" role="menuitemradio" aria-checked="' + (l.code === langue) + '" data-lang="' + l.code + '" lang="' + l.code + '">' + drapeau(l) + l.nom + "</button></li>";
        }).join("") +
      "</ul>";
    groupe.insertBefore(bloc, groupe.firstChild);
    var bouton = bloc.querySelector("#choix-langue"), liste = bloc.querySelector(".langues");
    var fermer = function () { liste.hidden = true; bouton.setAttribute("aria-expanded", "false"); };
    bouton.addEventListener("click", function (e) {
      e.stopPropagation();
      var ouvrir = liste.hidden;
      liste.hidden = !ouvrir;
      bouton.setAttribute("aria-expanded", String(ouvrir));
      if (ouvrir) liste.querySelector('[aria-checked="true"]').focus();
    });
    document.addEventListener("click", function (e) { if (!bloc.contains(e.target)) fermer(); });
    bloc.addEventListener("keydown", function (e) { if (e.key === "Escape") { fermer(); bouton.focus(); } });
    liste.addEventListener("click", function (e) {
      var b = e.target.closest("[data-lang]");
      if (!b) return;
      try { localStorage.setItem(CLE, b.dataset.lang); } catch (er) {}
      location.reload();
    });

    var mm = document.getElementById("menu-mobile");
    if (mm && !mm.querySelector(".langues-mobile")) {
      var ligne = document.createElement("div");
      ligne.className = "langues-mobile";
      ligne.setAttribute("translate", "no");
      ligne.innerHTML = LANGS.map(function (l) {
        return '<button type="button" data-lang="' + l.code + '" aria-pressed="' + (l.code === langue) + '" lang="' + l.code + '">' + drapeau(l) + l.nom + "</button>";
      }).join("");
      ligne.addEventListener("click", function (e) {
        var b = e.target.closest("[data-lang]");
        if (!b) return;
        try { localStorage.setItem(CLE, b.dataset.lang); } catch (er) {}
        location.reload();
      });
      mm.appendChild(ligne);
    }
  }

  // --- Start ------------------------------------------------------------------------------

  // Effects that split text into words (effets.js) wait for this: the text must be in its final
  // language first.
  function pret() { window.nxLanguePrete = true; document.dispatchEvent(new Event("nx-langue-prete")); }

  function demarrer() {
    selecteur();
    if (langue === "en" || !window.NXT[langue]) { racine.classList.remove("nx-traduit-attente"); pret(); return; }
    tete();
    parcourir(document.body);
    racine.classList.remove("nx-traduit-attente");
    pret();
    var file = [], prevu = false;
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === "characterData") file.push(m.target);
        else if (m.type === "attributes") file.push(m.target);
        else m.addedNodes.forEach(function (n) { file.push(n); });
      });
      if (prevu) return;
      prevu = true;
      Promise.resolve().then(function () {
        prevu = false;
        var lot = file; file = [];
        lot.forEach(function (n) { if (n.isConnected) parcourir(n); });
        selecteur();
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  if (langue !== "en" && langue !== "xx") {
    // The dictionary loads as a parser-blocking script, so it is in place before any page script
    // renders (lists built at load time use it right away). The text stays hidden until the
    // first pass is done, never longer than 1.5 s.
    racine.classList.add("nx-traduit-attente");
    setTimeout(function () { racine.classList.remove("nx-traduit-attente"); }, 1500);
    document.write('<script src="assets/js/i18n/' + langue + '.js?v=20260925d"><\/script>');
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(demarrer, 0); });
  else setTimeout(demarrer, 0);
})();

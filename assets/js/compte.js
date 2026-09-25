// My account, rework. LIVE data: /api/me, /api/friends, /api/history, /api/saves
// through window.NX (assets/js/nx.js, same appid as the previous site).
// Every write action below really writes on the server.

(function () {
  "use strict";
  // Sentence with values, translated as a whole (see i18n.js).
  var tf = function () { return window.nxF ? window.nxF.apply(null, arguments) : [].slice.call(arguments, 1).reduce(function (s, v, i) { return s.replace("{" + i + "}", v); }, arguments[0]); };

  var $ = function (id) { return document.getElementById(id); };
  var nf = new Intl.NumberFormat((window.nxLangue || "en"));
  var PAR_PAGE = 10;
  var SENT_VISIBLES = 5;
  var etat = { donnees: null, amis: [], filtre: "tous", recherche: "", page: 1, ami: null, envoyeesTout: false };

  var photo = function (pid) { return "/api/avatar?pid=" + encodeURIComponent(pid); };
  var icone = function (tid) { return "/api/game-icon/" + encodeURIComponent(tid) + ".jpg"; };

  function duree(s) {
    if (s >= 3600) return nf.format(Math.floor(s / 3600)) + " h";
    return Math.max(1, Math.floor(s / 60)) + " min";
  }
  function ilYA(iso) {
    var t = Date.parse(iso);
    if (!t) return "";
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 3600) return tf("{0} min ago", Math.max(1, Math.round(s / 60)));
    if (s < 86400) return tf("{0} h ago", Math.round(s / 3600));
    var j = Math.round(s / 86400);
    if (j < 30) return tf(j > 1 ? "{0} days ago" : "{0} day ago", j);
    return tf("on {0}", new Date(t).toLocaleDateString((window.nxLangue || "en"), { day: "numeric", month: "long", year: "numeric" }));
  }
  function plateforme(p, pf) {
    var parCode = { 1: "Nintendo Switch", 2: "Nintendo Switch 2", 3: "Ryujinx Nextendo", 4: "Citron Nextendo", 5: "Nextendo App" };
    if (parCode[Number(pf)]) return parCode[Number(pf)];
    var noms = { "switch": "Nintendo Switch", ryujinx: "Ryujinx Nextendo", citron: "Citron Nextendo", emulator: "Ryujinx Nextendo", app: "Nextendo App" };
    return noms[p] || "";
  }
  function el(tag, cls, texte) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texte != null) e.textContent = texte;
    return e;
  }
  function imgPhoto(pid, aPhoto, nom, cls) {
    // No photo (or a 404): the default avatar, as in the Nextendo App.
    var img = el("img", cls || "");
    img.alt = ""; img.loading = "lazy";
    img.onerror = function () { img.onerror = null; img.src = window.nxSilhouette(pid); };
    img.src = aPhoto ? photo(pid) : window.nxSilhouette(pid);
    return img;
  }

  var toastTimer = null;
  function toast(texte) {
    var t = $("toast");
    t.textContent = window.nxT ? window.nxT(texte) : texte;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("visible"); }, 2800);
  }
  function erreur(m) { return (m && m.message) || "Something went wrong. Try again."; }

  // --- Live API: normalize server shapes to what the page renders --------------------------
  // me() -> {account, presence}; friends() -> {friends, requests};
  // history() -> {history}; getSaves() -> {saves, limit, totalSize, ...}.

  function normPresence(p) {
    p = p || {};
    return { statut: Number(p.status) > 0 ? 1 : 0, jeu_id: p.app_id || "", jeu: p.jeu || "", detail: String(p.app_detail || "").trim(), plateforme: p.plateforme || "", pf: Number(p.pf) || 0 };
  }
  function emailMasque(email) {
    email = String(email || "");
    var parts = email.split("@");
    if (parts.length !== 2 || !parts[0]) return email;
    return parts[0].charAt(0) + "•••@" + parts[1];
  }
  function dateISO(s) {
    s = String(s || "");
    if (!s) return "";
    if (s.indexOf("T") >= 0) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + "T12:00:00Z";
    return s;
  }
  function normAmi(f) {
    var p = normPresence(f && f.presence);
    return {
      pid: f.pid, nom: f.name || f.username || ("PID " + f.pid),
      code: f.friend_code || "", favori: !!f.favorite,
      statut: p.statut, jeu_id: p.jeu_id, jeu: p.jeu, detail: p.detail, plateforme: p.plateforme, pf: p.pf,
      photo: true, depuis: dateISO(f.created_at), historique: null
    };
  }
  function normDemande(r) {
    return { pid: r.pid, nom: r.name || r.username || ("PID " + r.pid), code: r.friend_code || "", photo: true };
  }

  // Game names for presence app_ids (cache, like the previous site).
  var cacheNomsJeux = {};
  function resoudreJeu(appId, cb) {
    if (!appId) { cb(""); return; }
    if (cacheNomsJeux[appId]) { cb(cacheNomsJeux[appId]); return; }
    NX.gameInfo(appId).then(function (f) {
      var n = (f && f.name) || "";
      cacheNomsJeux[appId] = n;
      cb(n);
    }).catch(function () { cb(""); });
  }

  // Playing first, then online, then favorites, then everyone else by name.
  function rang(a) {
    if (a.statut > 0 && a.jeu_id) return 0;
    if (a.statut > 0) return 1;
    if (a.favori) return 2;
    return 3;
  }
  function etatAmi(a) {
    var ou = plateforme(a.plateforme, a.pf);
    if (a.statut > 0 && a.jeu_id) return { cls: "ami--enjeu", texte: tf("Playing {0}", a.jeu || tf("a game")), detail: a.detail || "" };
    if (a.statut > 0) return { cls: "ami--enligne", texte: ou ? tf("Online on {0}", ou) : tf("Online") };
    return { cls: "", texte: tf("Offline") };
  }

  // --- Member card and identity ------------------------------------------------------------

  function carteMembre(moi) {
    ["membre-pseudo", "i-pseudo"].forEach(function (id) { var el = $(id); if (el) el.textContent = moi.pseudo; });
    var avt = "";
    try { avt = localStorage.getItem("nx_avt") || ""; } catch (e) {}
    ["membre-photo", "profil-photo"].forEach(function (id) {
      var im = $(id);
      if (im) {
        im.onerror = function () { im.onerror = null; im.src = AVATAR_DEFAUT; };
        im.src = photo(moi.pid) + (avt ? "&t=" + avt : "");
      }
    });
    var mini = document.querySelector(".moi-mini img");
    if (mini) {
      mini.onerror = function () { mini.onerror = null; mini.src = AVATAR_DEFAUT; };
      mini.src = photo(moi.pid) + (avt ? "&t=" + avt : "");
    }
    $("code-ami").textContent = moi.code;
    $("i-code").textContent = moi.code;
    $("i-pid").textContent = String(moi.pid);
    $("i-email").textContent = moi.email_masque || "";
    $("i-verifie").textContent = moi.email_verifie ? tf("Verified") : tf("Not verified");
    if (!moi.email_verifie) {
      $("i-verifie").classList.add("badge--attente");
      var renvoyer = el("button", "pilule", tf("resend the e-mail")); renvoyer.type = "button";
      renvoyer.addEventListener("click", function () {
        renvoyer.disabled = true;
        NX.resendVerification().then(function () {
          toast(tf("Verification e-mail sent to {0}", moi.email || tf("your address")));
        }).catch(function (e) { toast(erreur(e)); renvoyer.disabled = false; });
      });
      $("i-email").parentNode.appendChild(renvoyer);
    }
    NX.adminCheck().then(function (res) {
      if (res && res.admin) { $("lien-admin").hidden = false; }
    }).catch(function () {});

    var depuis = moi.membre_depuis ? new Date(moi.membre_depuis) : null;
    var depuisTexte = "";
    if (depuis && !isNaN(depuis.getTime())) {
      try {
        depuisTexte = depuis.toLocaleDateString((window.nxLangue || "en"), { month: "long", year: "numeric" });
        $("i-depuis").textContent = depuis.toLocaleDateString((window.nxLangue || "en"), { day: "numeric", month: "long", year: "numeric" });
      } catch (e) {
        $("i-depuis").textContent = String(moi.membre_depuis);
      }
    } else {
      $("i-depuis").textContent = "-";
    }

    var d = $("i-discord");
    d.textContent = "";
    if (moi.discord) {
      d.appendChild(el("strong", "mono", moi.discord));
      if (moi.discord_lie_le) {
        var lie = new Date(moi.discord_lie_le);
        d.appendChild(el("span", "badge", tf("linked on {0}", lie.toLocaleDateString((window.nxLangue || "en"), { month: "2-digit", day: "2-digit", year: "numeric" }))));
      }
    } else {
      var a = el("a", "pilule", tf("link on Discord"));
      a.href = "https://discord.gg/XPfeCMwnzQ";
      d.appendChild(a);
    }

    selecteurPays(moi.pays);
    dessinerPuces(moi, depuisTexte);

    var p = moi.presence || {};
    var ou = plateforme(p.plateforme, p.pf);
    if (p.statut > 0 && p.jeu) {
      $("presence").classList.add("presence--enjeu");
      $("presence-texte").textContent = (ou ? tf("Playing {0} on {1}", p.jeu, ou) : tf("Playing {0}", p.jeu)) + (p.detail ? " \u00b7 " + p.detail : "");
      $("presence-texte").title = $("presence-texte").textContent;
    } else if (p.statut > 0) {
      $("presence").classList.add("presence--enligne");
      $("presence-texte").textContent = (ou ? tf("Connected to Nextendo on {0}", ou) : tf("Connected to Nextendo"));
    } else {
      $("presence-texte").textContent = tf("Offline");
    }

    var copier = function (bouton) {
      var fini = function () {
        toast(tf("Friend code copied"));
        bouton.classList.add("est-copie");
        setTimeout(function () { bouton.classList.remove("est-copie"); }, 1400);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(moi.code).then(fini, fini); else fini();
    };
    $("copier-code").addEventListener("click", function () { copier($("copier-code")); });
    $("i-copier").addEventListener("click", function () { copier($("i-copier")); });
  }

  function drapeau(code) { return "https://flagcdn.com/w40/" + String(code).toLowerCase() + ".png"; }

  var AVATAR_DEFAUT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' width='128' height='128'><circle cx='64' cy='64' r='64' fill='%232b2b3a'/><circle cx='64' cy='48' r='24' fill='%23ffffff' opacity='0.75'/><path d='M24 108 c0 -22 18 -40 40 -40 s40 18 40 40 Z' fill='%23ffffff' opacity='0.75'/></svg>";

  function dessinerPuces(moi, depuisTexte) {
    var puces = $("puces");
    if (!puces) return;
    puces.innerHTML = "";
    if (moi && moi.pays && typeof moi.pays === "string" && moi.pays.trim().length === 2) {
      try {
        var codePays = moi.pays.trim().toUpperCase();
        var noms = new Intl.DisplayNames([window.nxLangue || "en"], { type: "region" });
        var nomP = noms.of(codePays) || codePays;
        var li = el("li", "puce-pays");
        var f = el("img"); f.src = drapeau(codePays); f.alt = ""; f.width = 20; f.height = 14;
        li.appendChild(f); li.appendChild(document.createTextNode(nomP));
        puces.appendChild(li);
      } catch (e) {}
    }
    if (depuisTexte) puces.appendChild(el("li", "", tf("Member since {0}", depuisTexte)));
    if (moi && moi.booster) puces.appendChild(el("li", "", "Server booster"));
  }

  function selecteurPays(actuel) {
    var noms;
    try {
      noms = new Intl.DisplayNames([window.nxLangue || "en"], { type: "region" });
    } catch (e) {}
    var codes = ("AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI " +
      "CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GM GN GQ GR GT GW GY HK " +
      "HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD " +
      "ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RO RS " +
      "RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ " +
      "VA VC VE VN VU WS YE ZA ZM ZW").split(" ");
    var liste = codes.map(function (c) {
      var n = c;
      if (noms) { try { n = noms.of(c) || c; } catch (e) {} }
      return { c: c, n: n };
    }).sort(function (a, b) { return a.n.localeCompare(b.n, "en"); });

    var hote = $("pays");
    if (!hote) return;
    hote.innerHTML = "";
    var bouton = el("button", "pays-bouton");
    bouton.type = "button";
    bouton.setAttribute("aria-haspopup", "listbox");
    bouton.setAttribute("aria-expanded", "false");
    bouton.setAttribute("aria-labelledby", "pays-label pays-choix");
    var fl = el("img"); fl.alt = ""; fl.width = 22; fl.height = 16;
    var nom = el("span", ""); nom.id = "pays-choix";
    var chevron = el("span", "pays-chevron");
    chevron.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    bouton.appendChild(fl); bouton.appendChild(nom); bouton.appendChild(chevron);

    var panneau = el("div", "pays-panneau");
    panneau.hidden = true;
    var filtre = el("input", "pays-filtre");
    filtre.type = "search"; filtre.placeholder = tf("Search a country"); filtre.setAttribute("aria-label", tf("Search a country"));
    var ul = el("ul", "pays-liste");
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-label", tf("Country"));
    panneau.appendChild(filtre); panneau.appendChild(ul);
    hote.appendChild(bouton); hote.appendChild(panneau);

    var choisi = (actuel && typeof actuel === "string" && actuel.trim().length === 2) ? actuel.trim().toUpperCase() : "";
    var montrer = function () {
      if (choisi) {
        fl.src = drapeau(choisi);
        fl.style.display = "";
        var nomTxt = choisi;
        if (noms) { try { nomTxt = noms.of(choisi) || choisi; } catch (e) {} }
        nom.textContent = nomTxt;
      } else {
        fl.style.display = "none";
        fl.removeAttribute("src");
        nom.textContent = tf("Choose a country");
      }
    };
    var remplir = function () {
      var q = filtre.value.trim().toLowerCase();
      ul.innerHTML = "";
      liste.filter(function (x) { return !q || x.n.toLowerCase().indexOf(q) >= 0; }).forEach(function (x) {
        var li = el("li", "pays-option");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", x.c === choisi ? "true" : "false");
        li.tabIndex = -1;
        var f = el("img"); f.src = drapeau(x.c); f.alt = ""; f.width = 22; f.height = 16; f.loading = "lazy";
        li.appendChild(f); li.appendChild(document.createTextNode(x.n));
        var prendre = function () {
          choisi = x.c; montrer(); fermer();
          var avant = etat.donnees.moi.pays;
          var refaire = function (code) {
            etat.donnees.moi.pays = code;
            selecteurPays(code);
            var dp = etat.donnees.moi.membre_depuis ? new Date(etat.donnees.moi.membre_depuis).toLocaleDateString((window.nxLangue || "en"), { month: "long", year: "numeric" }) : "";
            dessinerPuces(etat.donnees.moi, dp);
          };
          refaire(x.c);
          NX.putProfile({ country: x.c }).then(function () {
            toast(tf("Country changed to {0}", x.n));
          }).catch(function (e) {
            refaire(avant);
            toast(erreur(e));
          });
        };
        li.addEventListener("click", prendre);
        li.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); prendre(); }
          if (e.key === "ArrowDown" && li.nextSibling) { e.preventDefault(); li.nextSibling.focus(); }
          if (e.key === "ArrowUp") { e.preventDefault(); (li.previousSibling || filtre).focus(); }
        });
        ul.appendChild(li);
      });
    };
    var ouvrir = function () {
      panneau.hidden = false; hote.classList.add("est-ouvert");
      bouton.setAttribute("aria-expanded", "true");
      filtre.value = ""; remplir(); filtre.focus();
      var sel = ul.querySelector('[aria-selected="true"]');
      if (sel) sel.scrollIntoView({ block: "center" });
    };
    var fermer = function () {
      panneau.hidden = true; hote.classList.remove("est-ouvert");
      bouton.setAttribute("aria-expanded", "false");
    };
    bouton.addEventListener("click", function () { panneau.hidden ? ouvrir() : fermer(); });
    filtre.addEventListener("input", remplir);
    filtre.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" && ul.firstChild) { e.preventDefault(); ul.firstChild.focus(); }
    });
    hote.addEventListener("keydown", function (e) { if (e.key === "Escape") { fermer(); bouton.focus(); } });
    document.addEventListener("click", function (e) { if (!hote.contains(e.target)) fermer(); });
    montrer();
  }

  // --- Activity, history, cloud saves --------------------------------------------------------

  function activite(d) {
    var hist = d.historique.slice().sort(function (a, b) { return String(b.last_played).localeCompare(String(a.last_played)); });
    var total = hist.reduce(function (s, h) { return s + (h.seconds || 0); }, 0);
    $("c-temps").textContent = duree(total);
    var compter = window.nxCompter || function (e, v) { e.textContent = nf.format(v); };
    compter($("c-jeux"), hist.length);
    compter($("c-amis"), d.amis.length);
    compter($("c-enligne"), d.amis.filter(function (a) { return a.statut > 0; }).length);

    var box = $("maintenant");
    box.innerHTML = "";
    var p = d.moi.presence || {};
    if (p.statut > 0 && p.jeu_id) {
      box.appendChild(imageJeu(p.jeu_id));
      box.appendChild(bloc("Right now", p.jeu || "In game", plateforme(p.plateforme, p.pf)));
    } else if (hist.length) {
      box.appendChild(imageJeu(hist[0].title_id));
      box.appendChild(bloc("Last game played", hist[0].name || hist[0].title_id, ilYA(hist[0].last_played)));
    } else {
      box.appendChild(el("span", "vide-ico", "•"));
      box.appendChild(bloc("No games yet", "Launch an online game", "It will show up here."));
    }

    var HIST_VISIBLES = 10;
    var ul = $("historique");
    ul.innerHTML = "";
    if (!hist.length) ul.appendChild(el("li", "vide", "Your games will show up here once you play online."));
    hist.slice(0, HIST_VISIBLES).forEach(function (h) { ul.appendChild(ligneJeu(h, null)); });
    $("historique-compte").textContent = hist.length ? nf.format(hist.length) + (hist.length > 1 ? " games" : " game") : "";
    var voir = $("voir-tout");
    voir.hidden = hist.length <= HIST_VISIBLES;
    voir.textContent = tf("See all {0} games", nf.format(hist.length));
    etat.hist = hist;
    if (p.statut > 0 && p.jeu_id) box.dataset.tid = p.jeu_id;
    else if (hist.length) box.dataset.tid = hist[0].title_id;
    box.onclick = function () {
      var tid = box.dataset.tid; if (!tid) return;
      var h = hist.filter(function (x) { return x.title_id === tid; })[0] || { title_id: tid, name: p.jeu || "" };
      ouvrirJeu(h, null);
    };

    sauvegardes(d);
  }
  // One game row: icon, name, when, total time. The whole row opens the game sheet. `qui` is the
  // friend whose history it is (null = me): the sheet then says whose progress it shows.
  function ligneJeu(h, qui) {
    var li = el("li");
    var b = el("button", "ligne-jeu");
    b.type = "button";
    var mid = el("span", "ligne-milieu");
    mid.appendChild(el("span", "nom", h.name || h.title_id));
    mid.appendChild(el("span", "quand", tf("Played {0}", ilYA(h.last_played))));
    b.appendChild(imageJeu(h.title_id));
    b.appendChild(mid);
    b.appendChild(el("span", "temps", duree(h.seconds || 0)));
    b.addEventListener("click", function () { ouvrirJeu(h, qui); });
    li.appendChild(b);
    return li;
  }

  // --- All games (with search and sort) ----------------------------------------------------

  var triJeux = "recent";
  function dessinerTousJeux() {
    var q = $("jeux-recherche").value.trim().toLowerCase();
    var liste = etat.hist.filter(function (h) { return !q || (h.name || h.title_id).toLowerCase().indexOf(q) >= 0; });
    liste.sort(function (a, b) {
      if (triJeux === "temps") return (b.seconds || 0) - (a.seconds || 0);
      if (triJeux === "nom") return (a.name || "").localeCompare(b.name || "", "en");
      return String(b.last_played).localeCompare(String(a.last_played));
    });
    var ul = $("jeux-liste");
    ul.innerHTML = "";
    if (!liste.length) ul.appendChild(el("li", "vide", tf("No game matches “{0}”.", $("jeux-recherche").value)));
    liste.forEach(function (h) { ul.appendChild(ligneJeu(h, null)); });
    $("jeux-compte").textContent = nf.format(etat.hist.length);
  }
  function brancherTousJeux() {
    $("voir-tout").addEventListener("click", function () {
      $("jeux-recherche").value = "";
      dessinerTousJeux();
      $("dlg-jeux").showModal();
      $("jeux-recherche").focus();
    });
    $("jeux-recherche").addEventListener("input", dessinerTousJeux);
    document.querySelectorAll(".tri button").forEach(function (b) {
      b.addEventListener("click", function () {
        triJeux = b.dataset.tri;
        document.querySelectorAll(".tri button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        dessinerTousJeux();
      });
    });
  }

  // --- Game sheet: eShop details (/api/gameinfo), screenshots, and the progress of whoever --
  // --- played it. Opening it from a friend's history shows THEIR time, not mine. -----------

  // The API writes release dates in French ("21 juin 2019") whatever the language asked.
  function dateAnglaise(s) {
    var mois = { janvier: 0, "février": 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, "août": 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, "décembre": 11, decembre: 11 };
    var m = /^(\d{1,2})(?:er)?\s+(\S+)\s+(\d{4})$/.exec(String(s || "").trim().toLowerCase());
    if (!m || !(m[2] in mois)) return s || "";
    return new Date(Date.UTC(+m[3], mois[m[2]], +m[1], 12)).toLocaleDateString((window.nxLangue || "en"), { month: "long", day: "numeric", year: "numeric" });
  }

  // "Buy" button: Nintendo's own link service takes the title ID and a country, and redirects to
  // that country's official product page. Countries without a Nintendo store (tested: RU, AE, SA,
  // CN, KR) would land on an error page, so they fall back to the store of the site language.
  var PAYS_BOUTIQUE = "US CA MX BR AR CL CO PE GB IE FR BE NL LU DE AT CH IT ES PT DK FI NO SE PL CZ GR ZA AU NZ HK JP".split(" ");
  var PAYS_LANGUE = { fr: "FR", de: "DE", es: "ES", it: "IT", pt: "PT", ja: "JP", zh: "HK", ru: "GB", ar: "GB", en: "US" };
  function paysBoutique() {
    var langues = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < langues.length; i++) {
      var region = (String(langues[i]).split("-")[1] || "").toUpperCase();
      if (PAYS_BOUTIQUE.indexOf(region) >= 0) return region;
    }
    return PAYS_LANGUE[(window.nxLangue || "en").slice(0, 2)] || "US";
  }
  // The store knows the base game: an update (…800) or a DLC id points back to its application.
  function lienBoutique(tid) {
    var t = String(tid || "").toLowerCase();
    if (!/^[0-9a-f]{16}$/.test(t)) return "";
    var base = t.slice(0, 12) + (parseInt(t.slice(12), 16) & 0xE000).toString(16).padStart(4, "0");
    return "https://ec.nintendo.com/apps/" + base + "/" + paysBoutique();
  }

  var cacheJeux = {};
  function ouvrirJeu(h, qui) {
    var tid = h.title_id;
    $("gm-icone").src = icone(tid);
    $("gm-nom").textContent = h.name || tid;
    $("gm-sous").textContent = "";
    $("gm-progres-titre").textContent = qui ? qui.nom + "'s progress" : "Your progress";
    $("gm-temps").textContent = h.seconds ? duree(h.seconds) : "Not played yet";
    $("gm-derniere").textContent = h.last_played ? new Date(h.last_played).toLocaleDateString((window.nxLangue || "en"), { month: "short", day: "numeric", year: "numeric" }) : "…";
    $("gm-scene").removeAttribute("src");
    $("gm-fond").style.backgroundImage = "";
    $("gm-vignettes").innerHTML = "";
    $("gm-accroche").textContent = "";
    $("gm-desc").textContent = "Loading game details…";
    $("gm-details").innerHTML = "";
    $("gm-achat").hidden = true;
    var dlg = $("dlg-jeu");
    if (!dlg.open) dlg.showModal();

    var remplir = function (f) {
      if (!f || f.error) { $("gm-desc").textContent = "No eShop details for this game."; return; }
      // Only games the eShop knows get the button: homebrew and system titles have no product page.
      var achat = lienBoutique(f.title_id || tid);
      if (achat) { $("gm-achat").href = achat; $("gm-achat").hidden = false; }
      $("gm-nom").textContent = (f.name || h.name || tid).replace(/™|®/g, "");
      $("gm-sous").textContent = (f.genres || []).join(", ");
      $("gm-accroche").textContent = f.tagline || "";
      $("gm-desc").textContent = f.description || "";
      var images = [f.hero].concat(f.screenshots || []).filter(Boolean);
      if (f.hero) $("gm-fond").style.backgroundImage = "url('" + f.hero + "')";
      var montrer = function (src, bouton) {
        $("gm-scene").src = src;
        $("gm-vignettes").querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === bouton ? "true" : "false"); });
      };
      images.forEach(function (src, i) {
        var b = el("button");
        b.type = "button";
        b.setAttribute("aria-label", "Screenshot " + (i + 1));
        var im = el("img"); im.src = src; im.alt = ""; im.loading = "lazy";
        b.appendChild(im);
        b.addEventListener("click", function () { montrer(src, b); });
        $("gm-vignettes").appendChild(b);
        if (i === 0) montrer(src, b);
      });
      var det = $("gm-details");
      var ligne = function (k, v) {
        if (!v) return;
        var div = el("div"); div.appendChild(el("dt", "", k));
        var dd = el("dd"); dd.appendChild(el("strong", "", v)); div.appendChild(dd);
        det.appendChild(div);
      };
      ligne("Genres", (f.genres || []).join(", "));
      ligne("Publisher", f.publisher);
      ligne("Release date", dateAnglaise(f.release_date));
      ligne("Players", f.joueurs ? String(f.joueurs) : "");
      ligne("Age rating", f.classification ? f.classification + "+" : "");
    };
    if (cacheJeux[tid]) { remplir(cacheJeux[tid]); return; }
    fetch("/api/gameinfo?langue=en&title_id=" + encodeURIComponent(tid))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (f) { cacheJeux[tid] = f; if ($("gm-icone").src.indexOf(tid) >= 0) remplir(f); })
      .catch(function () { $("gm-desc").textContent = "Game details are unavailable right now."; });
  }

  // --- Cloud saves: one row per game, with details, download and delete ----------------------

  function taille(o) { return o >= 1048576 ? tf("{0} MB", (o / 1048576).toFixed(1)) : tf("{0} KB", Math.max(1, Math.round(o / 1024))); }
  function sauvegardes(d) {
    var gate = d.savesGate;
    var liste = d.sauvegardes || [];
    if (gate) {
      $("quota-texte").textContent = gate;
      $("quota-barre").style.width = "0%";
      $("sauvegardes-vide").hidden = true;
      var ul0 = $("sauvegardes");
      ul0.innerHTML = "";
      var li0 = el("li", "vide", gate);
      ul0.appendChild(li0);
      return;
    }
    var quota = d.savesQuota || 5 * 1048576;
    var utilise = (d.savesTotal != null) ? d.savesTotal : liste.reduce(function (s, x) { return s + (x.taille || 0); }, 0);
    $("quota-texte").textContent = tf("{0} of {1}", taille(utilise), tf("{0} MB", quota / 1048576));
    $("quota-barre").style.width = Math.min(100, (utilise / quota) * 100) + "%";
    $("sauvegardes-vide").hidden = liste.length > 0;
    var ul = $("sauvegardes");
    ul.innerHTML = "";
    liste.forEach(function (s) {
      var li = el("li", "sauvegarde");
      var mid = el("div", "ligne-milieu");
      mid.append(el("span", "nom", s.nom || s.title_id), el("span", "quand", tf("{0}, saved {1}", taille(s.taille || 0), ilYA(s.maj))));
      var act = el("div", "ligne-boutons");
      var det = el("button", "bouton bouton--verre petit-bouton", tf("Details")); det.type = "button";
      det.addEventListener("click", function () {
        $("sv-titre").textContent = s.nom || s.title_id;
        var dl = $("sv-details"); dl.innerHTML = "";
        var rangee = function (k, v) {
          var div = el("div"); div.append(el("dt", "", k)); var dd = el("dd"); dd.appendChild(el("strong", "", v)); div.appendChild(dd); dl.appendChild(div);
        };
        rangee(tf("Game"), s.nom || s.title_id);
        rangee(tf("Title ID"), s.title_id);
        rangee(tf("Size"), taille(s.taille || 0));
        rangee(tf("Last upload"), s.maj ? new Date(s.maj).toLocaleString((window.nxLangue || "en")) : "…");
        rangee(tf("Details"), tf("Loading…"));
        $("dlg-sauvegarde").showModal();
        NX.saveParsed(s.title_id).then(function (p) {
          dl.innerHTML = "";
          rangee(tf("Game"), s.nom || s.title_id);
          rangee(tf("Title ID"), s.title_id);
          rangee(tf("Size"), taille(s.taille || 0));
          rangee(tf("Last upload"), s.maj ? new Date(s.maj).toLocaleString((window.nxLangue || "en")) : "…");
          ((p && p.fields) || []).forEach(function (f) {
            rangee(f.k, f.img ? (f.v || "") : (f.v || ""));
          });
          if (!((p && p.fields) || []).length) rangee(tf("Details"), tf("No preview for this game."));
        }).catch(function () {
          dl.innerHTML = "";
          rangee(tf("Game"), s.nom || s.title_id);
          rangee(tf("Details"), tf("Preview unavailable right now."));
        });
      });
      var tel = el("button", "bouton bouton--verre petit-bouton", tf("Download")); tel.type = "button";
      tel.addEventListener("click", function () {
        tel.disabled = true;
        NX.downloadSave(s.title_id).then(function (blob) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = (s.nom || s.title_id) + ".zip";
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
          toast(tf("Download started"));
        }).catch(function (e) { toast(erreur(e)); }).then(function () { tel.disabled = false; });
      });
      var sup = el("button", "bouton bouton--sortie petit-bouton", tf("Delete")); sup.type = "button";
      sup.addEventListener("click", function () { etat.sauvegarde = s; $("svs-nom").textContent = s.nom || s.title_id; $("dlg-sauvegarde-suppr").showModal(); });
      act.append(det, tel, sup);
      li.append(imageJeu(s.title_id), mid, act);
      ul.appendChild(li);
    });
  }

  function imageJeu(tid) {
    var img = el("img");
    img.src = icone(tid); img.alt = ""; img.loading = "lazy";
    return img;
  }
  function bloc(petit, fort, bas) {
    var div = el("div");
    div.appendChild(el("small", "", petit));
    div.appendChild(el("strong", "", fort));
    div.appendChild(el("span", "", bas || ""));
    return div;
  }

  // --- Friends -----------------------------------------------------------------------------

  function amisVisibles() {
    var q = etat.recherche.trim().toLowerCase();
    return etat.amis
      .filter(function (a) {
        if (etat.filtre === "enligne" && !(a.statut > 0)) return false;
        if (etat.filtre === "favoris" && !a.favori) return false;
        return !q || a.nom.toLowerCase().indexOf(q) >= 0 || (a.code || "").toLowerCase().indexOf(q) >= 0;
      })
      .sort(function (a, b) { return rang(a) - rang(b) || a.nom.localeCompare(b.nom, "en"); });
  }

  function dessinerAmis() {
    var liste = amisVisibles();
    var pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
    if (etat.page > pages) etat.page = pages;
    var ul = $("amis");
    ul.innerHTML = "";
    if (!liste.length) {
      ul.appendChild(el("li", "vide",
        etat.recherche ? "No friend matches “" + etat.recherche + "”." :
        etat.filtre === "enligne" ? "No friends online right now." :
        etat.filtre === "favoris" ? "No favorites yet. Tap a friend's star to add one." :
        "No friends yet. Add one with their friend code above."));
    }
    liste.slice((etat.page - 1) * PAR_PAGE, etat.page * PAR_PAGE).forEach(function (a) {
      var e = etatAmi(a);
      var li = el("li", "ami " + e.cls);
      var ouvrir = el("button", "ami-ouvrir");
      ouvrir.type = "button";
      var ph = el("span", "ami-photo");
      ph.appendChild(imgPhoto(a.pid, a.photo, a.nom));
      var mid = el("span");
      mid.appendChild(el("span", "ami-nom", a.nom));
      mid.appendChild(el("br"));
      var etatEl = el("span", "ami-etat", e.texte);
      etatEl.title = e.texte + (e.detail ? " \u00b7 " + e.detail : "");
      mid.appendChild(etatEl);
      if (e.detail) mid.appendChild(el("span", "ami-detail", e.detail));
      ouvrir.appendChild(ph); ouvrir.appendChild(mid);
      ouvrir.addEventListener("click", function () { ouvrirAmi(a); });

      var et = el("button", "etoile");
      et.type = "button";
      et.setAttribute("aria-pressed", a.favori ? "true" : "false");
      et.setAttribute("aria-label", a.favori ? tf("Remove {0} from favorites", a.nom) : tf("Add {0} to favorites", a.nom));
      et.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="' + (a.favori ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
      et.addEventListener("click", function () {
        var veut = !a.favori;
        et.disabled = true;
        NX.setFavorite(a.pid, veut).then(function () {
          a.favori = veut;
          dessinerAmis();
        }).catch(function (e) { et.disabled = false; toast(erreur(e)); });
      });

      li.appendChild(ouvrir); li.appendChild(et);
      ul.appendChild(li);
    });
    $("compte-amis").textContent = nf.format(etat.amis.length);

    var nav = $("pages");
    nav.innerHTML = "";
    if (pages < 2) return;
    var bouton = function (texte, page, courant, inactif, label) {
      var b = el("button", "", texte);
      b.type = "button";
      if (label) b.setAttribute("aria-label", label);
      if (courant) b.setAttribute("aria-current", "page");
      b.disabled = !!inactif;
      b.addEventListener("click", function () { etat.page = page; dessinerAmis(); });
      nav.appendChild(b);
    };
    bouton("‹", etat.page - 1, false, etat.page === 1, "Previous page");
    var debut = Math.max(1, Math.min(etat.page - 2, pages - 4));
    for (var p = debut; p <= Math.min(pages, debut + 4); p++) bouton(String(p), p, p === etat.page, false, "Page " + p);
    bouton("›", etat.page + 1, false, etat.page === pages, "Next page");
  }

  function ouvrirAmi(a) {
    etat.ami = a;
    var e = etatAmi(a);
    // No photo on the account (404) -> the default avatar, as in the list and the app.
    $("fm-photo").onerror = function () { $("fm-photo").onerror = null; $("fm-photo").src = window.nxSilhouette(a.pid); };
    $("fm-photo").src = a.photo ? photo(a.pid) : window.nxSilhouette(a.pid);
    $("fm-nom").textContent = a.nom;
    $("fm-etat").textContent = e.texte + (e.detail ? " \u00b7 " + e.detail : "");
    $("fm-etat").title = $("fm-etat").textContent;
    $("fm-presence").className = "presence " + (e.cls === "ami--enjeu" ? "presence--enjeu" : e.cls === "ami--enligne" ? "presence--enligne" : "");
    $("fm-code").querySelector("strong").textContent = a.code || "";
    $("fm-temps").textContent = "…";
    $("fm-jeux").textContent = "…";
    $("fm-favori-jeu").textContent = "…";
    $("fm-depuis").textContent = a.depuis ? new Date(a.depuis).toLocaleDateString((window.nxLangue || "en"), { month: "long", day: "numeric", year: "numeric" }) : "…";
    $("fm-pid").textContent = String(a.pid);
    $("fm-derniere").textContent = "…";
    var ul = $("fm-historique");
    ul.innerHTML = "";
    ul.appendChild(el("li", "vide", "Loading game history…"));
    $("fm-favori").textContent = a.favori ? "Remove from favorites" : "Add to favorites";
    $("dlg-ami").showModal();
    var peindre = function () {
      var hist = (a.historique || []).slice().sort(function (x, y) { return String(y.last_played).localeCompare(String(x.last_played)); });
      var total = hist.reduce(function (s, h) { return s + (h.seconds || 0); }, 0);
      var favori = hist.slice().sort(function (x, y) { return (y.seconds || 0) - (x.seconds || 0); })[0];
      $("fm-temps").textContent = total ? duree(total) : tf("None yet");
      $("fm-jeux").textContent = nf.format(hist.length);
      $("fm-favori-jeu").textContent = favori ? favori.name || favori.title_id : tf("None yet");
      $("fm-derniere").textContent = hist.length ? ilYA(hist[0].last_played) : "No activity yet";
      ul.innerHTML = "";
      if (!hist.length) ul.appendChild(el("li", "vide", tf("{0} hasn't played online yet.", a.nom)));
      hist.forEach(function (h) { ul.appendChild(ligneJeu(h, a)); });
    };
    if (a.historique) { peindre(); return; }
    NX.friendHistory(a.pid).then(function (r) {
      a.historique = (r && r.history) || [];
      if (etat.ami === a && $("dlg-ami").open) peindre();
    }).catch(function () {
      if (etat.ami === a && $("dlg-ami").open) {
        ul.innerHTML = "";
        ul.appendChild(el("li", "vide", tf("{0} hasn't played online yet.", a.nom)));
        $("fm-temps").textContent = tf("None yet");
        $("fm-jeux").textContent = "0";
        $("fm-favori-jeu").textContent = tf("None yet");
        $("fm-derniere").textContent = "No activity yet";
      }
    });
  }
  function rechargerAmis() {
    return NX.friends().then(function (r) {
      etat.amis = (r.friends || []).map(normAmi);
      etat.donnees.demandes_recues = (r.requests || []).map(normDemande);
      demandes();
      dessinerAmis();
      resoudreNomsAmis();
    });
  }
  // Presence often carries the game id without its name: fill it in once known.
  function resoudreNomsAmis() {
    var manque = etat.amis.filter(function (a) { return a.jeu_id && !a.jeu; });
    if (!manque.length) return;
    var ids = {};
    manque.forEach(function (a) { ids[a.jeu_id] = true; });
    Object.keys(ids).forEach(function (tid) {
      resoudreJeu(tid, function (nom) {
        if (!nom) return;
        var change = false;
        etat.amis.forEach(function (a) { if (a.jeu_id === tid && !a.jeu) { a.jeu = nom; change = true; } });
        if (change) dessinerAmis();
      });
    });
  }
  function brancherFicheAmi() {
    $("fm-favori").addEventListener("click", function () {
      var a = etat.ami;
      var veut = !a.favori;
      NX.setFavorite(a.pid, veut).then(function () {
        a.favori = veut;
        $("fm-favori").textContent = veut ? "Remove from favorites" : "Add to favorites";
        dessinerAmis();
      }).catch(function (e) { toast(erreur(e)); });
    });
    $("fm-code").addEventListener("click", function () {
      var code = etat.ami.code || "";
      var fini = function () { toast("Friend code copied"); $("fm-code").classList.add("est-copie"); setTimeout(function () { $("fm-code").classList.remove("est-copie"); }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(fini, fini); else fini();
    });
    $("fm-retirer").addEventListener("click", function () {
      var a = etat.ami;
      NX.removeFriend(a.pid).then(function () {
        $("dlg-ami").close();
        toast(tf("{0} removed from your friends", a.nom));
        rechargerAmis();
      }).catch(function (e) { toast(erreur(e)); });
    });
    $("fm-bloquer").addEventListener("click", function () {
      var a = etat.ami;
      NX.blockFriend(a.pid).then(function () {
        $("dlg-ami").close();
        toast(tf("{0} blocked", a.nom));
        rechargerAmis();
      }).catch(function (e) { toast(erreur(e)); });
    });
  }

  // Friend codes are typed as digits; the dashes are added as you type.
  function brancherAjout() {
    var champ = $("code-ajout");
    champ.addEventListener("input", function () {
      var chiffres = champ.value.replace(/\D/g, "").slice(0, 12);
      var morceaux = chiffres.match(/.{1,4}/g) || [];
      champ.value = chiffres ? "SW-" + morceaux.join("-") : "";
    });
    $("form-ajout").addEventListener("submit", function (e) {
      e.preventDefault();
      var etatLigne = $("ajout-etat");
      var code = champ.value.trim();
      etatLigne.classList.remove("erreur");
      if (!/^SW-\d{4}-\d{4}-\d{4}$/.test(code)) {
        etatLigne.textContent = "Enter a full friend code, like SW-1234-5678-9012.";
        etatLigne.classList.add("erreur");
        return;
      }
      if (code === etat.donnees.moi.code) {
        etatLigne.textContent = "That's your own friend code.";
        etatLigne.classList.add("erreur");
        return;
      }
      var deja = etat.amis.filter(function (a) { return a.code === code; })[0];
      if (deja) {
        etatLigne.textContent = deja.nom + " is already your friend.";
        etatLigne.classList.add("erreur");
        return;
      }
      var btn = $("form-ajout").querySelector('button[type="submit"]');
      btn.disabled = true;
      NX.addFriend(code).then(function () {
        champ.value = "";
        etatLigne.textContent = tf("Request sent to {0}.", code);
        return rechargerAmis();
      }).catch(function (err) {
        etatLigne.textContent = erreur(err);
        etatLigne.classList.add("erreur");
      }).then(function () { btn.disabled = false; });
    });
  }

  // --- Friend requests ---------------------------------------------------------------------

  function ligneDemande(x, recue) {
    var li = el("li", "demande");
    li.appendChild(imgPhoto(x.pid, x.photo, x.nom));
    var mid = el("div");
    mid.appendChild(el("div", "demande-nom", x.nom));
    if (x.code && x.code !== x.nom) mid.appendChild(el("div", "demande-code", x.code));
    li.appendChild(mid);
    var actions = el("div", "demande-actions");
    var faire = function (texte, cls, message, appel) {
      var b = el("button", "bouton " + cls, texte);
      b.type = "button";
      b.addEventListener("click", function () {
        b.disabled = true;
        appel().then(function () {
          var liste = recue ? etat.donnees.demandes_recues : etat.donnees.demandes_envoyees;
          liste.splice(liste.indexOf(x), 1);
          demandes();
          toast(message);
          return rechargerAmis();
        }).catch(function (e) { b.disabled = false; toast(erreur(e)); });
      });
      actions.appendChild(b);
    };
    if (recue) {
      faire("Accept", "bouton--plein", x.nom + " is now your friend", function () { return NX.acceptFriend(x.pid); });
      faire("Decline", "bouton--verre", "Request from " + x.nom + " declined", function () { return NX.declineFriend(x.pid); });
    } else {
      faire("Cancel", "bouton--verre", "Request to " + x.nom + " canceled", function () { return NX.declineFriend(x.pid); });
    }
    li.appendChild(actions);
    return li;
  }
  function demandes() {
    var d = etat.donnees;
    var recues = $("recues");
    recues.innerHTML = "";
    if (!d.demandes_recues.length) recues.appendChild(el("li", "vide-bloc", "No pending requests. Share your friend code so other players can add you."));
    d.demandes_recues.forEach(function (x) { recues.appendChild(ligneDemande(x, true)); });

    var env = $("envoyees");
    env.innerHTML = "";
    if (!d.demandes_envoyees.length) env.appendChild(el("li", "vide-bloc", "You have no requests waiting for an answer."));
    var visibles = etat.envoyeesTout ? d.demandes_envoyees : d.demandes_envoyees.slice(0, SENT_VISIBLES);
    visibles.forEach(function (x) { env.appendChild(ligneDemande(x, false)); });
    var plus = $("plus-envoyees");
    var reste = d.demandes_envoyees.length - SENT_VISIBLES;
    plus.hidden = reste <= 0;
    if (reste > 0) plus.textContent = etat.envoyeesTout ? "Show fewer" : tf("Show {0} more", reste);
  }

  var PROFILE = {};
  // --- Avatar gallery: Nintendo firmware + custom icons, composed in layers ---------------
  // Same sources as the previous site: /assets/icons/manifest.json (per game) and
  // /assets/avatars/manifest.json (Switch firmware + Nextendo custom). The preview is
  // composed on a 256x256 canvas and uploaded like the emulator does.

  var ed = { bg: null, char: null, frame: null, color: "#3a2a6a", dirty: false, currentImage: "", fichier: "", retire: false };
  var MAN = null, FIRMWARE = [], CUSTOM = [];
  var CALQUES = [
    { cle: "char", cat: "characters", nom: "Character" },
    { cle: "bg", cat: "backgrounds", nom: "Background" },
    { cle: "frame", cat: "frames", nom: "Frame" }
  ];
  var JEU_FW = "__fw__", JEU_CUSTOM = "__custom__";
  var ip = { calque: "char", jeu: "", choix: [], affiches: 0 };
  var cacheImg = {};
  function chargerImg(src) {
    if (cacheImg[src]) return Promise.resolve(cacheImg[src]);
    return new Promise(function (ok) {
      var i = new Image();
      i.onload = function () { cacheImg[src] = i; ok(i); };
      i.onerror = function () { ok(null); };
      i.src = src;
    });
  }
  function urlAvatar(payload) { return payload.indexOf("/") >= 0 ? "/assets/" + payload : "/assets/avatars/" + payload; }
  function calquesUtilises() { return !!(ed.bg || ed.char || ed.frame); }
  function toileB64() {
    var c = $("avatar-toile");
    try { return (c.toDataURL("image/jpeg", 0.9).split(",")[1]) || ""; } catch (e) { return ""; }
  }
  function composer() {
    var c = $("avatar-toile"), ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = ed.color || "#3a2a6a";
    ctx.fillRect(0, 0, 256, 256);
    var calques = [ed.bg, ed.char, ed.frame].filter(Boolean);
    return new Promise(function (resolve) {
      if (!calques.length) {
        var im = $("profil-photo");
        if (im) im.src = c.toDataURL("image/jpeg", 0.9);
        resolve(c);
        return;
      }
      (function suivant(i) {
        if (i >= calques.length) {
          var im = $("profil-photo");
          if (im) im.src = c.toDataURL("image/jpeg", 0.9);
          resolve(c);
          return;
        }
        chargerImg(urlAvatar(calques[i])).then(function (img) {
          if (img) ctx.drawImage(img, 0, 0, 256, 256);
          suivant(i + 1);
        }).catch(function () {
          suivant(i + 1);
        });
      })(0);
    });
  }
  function apercuAvatar() {
    $("profil-apercu").style.background = ed.color || "#3a2a6a";
    if (ed.fichier) { $("profil-photo").src = ed.fichier; return; }
    if (ed.retire) { $("profil-photo").removeAttribute("src"); return; }
    if (calquesUtilises() || ed.dirty) { composer(); return; }
    if (ed.currentImage) {
      var v = String(ed.currentImage);
      if (v.indexOf("file:") === 0) {
        var avt = "";
        try { avt = localStorage.getItem("nx_avt") || ""; } catch (e) {}
        $("profil-photo").src = photo(etat.donnees.moi.pid) + (avt ? "&t=" + avt : "");
      } else {
        $("profil-photo").src = v.indexOf("data:image/") === 0 ? v : "data:image/jpeg;base64," + v;
      }
    } else $("profil-photo").removeAttribute("src");
  }
  function marquerChoix() {
    var cur = ed[ip.calque];
    Array.prototype.forEach.call($("avatar-grille").children, function (b) {
      b.classList.toggle("est-choisi", b.dataset.p === cur && cur != null);
    });
    document.querySelectorAll(".avatar-onglets button").forEach(function (b) {
      b.classList.toggle("est-rempli", !!ed[b.dataset.calque]);
    });
    var btnVider = $("avatar-vider");
    if (btnVider) btnVider.hidden = !cur;
  }
  function ipAppliquer() {
    ip.choix = [];
    ip.affiches = 0;
    var cat = CALQUES.filter(function (l) { return l.cle === ip.calque; })[0].cat;
    if (ip.calque === "char") {
      if (!ip.jeu || ip.jeu === JEU_CUSTOM) CUSTOM.forEach(function (f) { ip.choix.push({ p: f, url: "/assets/avatars/" + f, sombre: false }); });
      if (!ip.jeu || ip.jeu === JEU_FW) FIRMWARE.forEach(function (f) { ip.choix.push({ p: f, url: "/assets/avatars/" + f, sombre: true }); });
    }
    if (ip.jeu !== JEU_FW && ip.jeu !== JEU_CUSTOM) {
      var map = (MAN.byCat && MAN.byCat[cat]) || {};
      var ordre = {};
      (MAN.games || []).forEach(function (g, i) { ordre[g.id] = i; });
      Object.keys(map).sort(function (a, b) { return (ordre[a] == null ? 999 : ordre[a]) - (ordre[b] == null ? 999 : ordre[b]); }).forEach(function (gid) {
        if (ip.jeu && gid !== ip.jeu) return;
        map[gid].forEach(function (f) {
          ip.choix.push({ p: "icons/" + gid + "/" + cat + "/" + f, url: "/assets/icons/" + gid + "/" + cat + "/" + f, sombre: cat !== "backgrounds" });
        });
      });
    }
    $("avatar-grille").innerHTML = "";
    ipAfficherPlus();
  }
  function ipAfficherPlus() {
    var g = $("avatar-grille");
    var fin = Math.min(ip.affiches + 120, ip.choix.length);
    for (var i = ip.affiches; i < fin; i++) {
      (function (it) {
        var cls = it.sombre ? "fond-sombre avatar-opt--t" : "";
        var b = el("button", cls);
        b.type = "button";
        b.dataset.p = it.p;
        var im = el("img"); im.src = it.url; im.alt = ""; im.loading = "lazy";
        b.appendChild(im);
        b.addEventListener("click", function () {
          ed[ip.calque] = (ed[ip.calque] === it.p) ? null : it.p;
          ed.dirty = true; ed.fichier = ""; ed.retire = false;
          marquerChoix(); apercuAvatar();
        });
        g.appendChild(b);
      })(ip.choix[i]);
    }
    ip.affiches = fin;
    marquerChoix();
  }
  function ipChoisirCalque(cle) {
    ip.calque = cle;
    ip.jeu = "";
    document.querySelectorAll(".avatar-onglets button").forEach(function (b) {
      b.setAttribute("aria-selected", b.dataset.calque === cle ? "true" : "false");
    });
    var cat = CALQUES.filter(function (l) { return l.cle === cle; })[0].cat;
    var map = (MAN.byCat && MAN.byCat[cat]) || {};
    var noms = {}, ordre = {};
    (MAN.games || []).forEach(function (g, i) { ordre[g.id] = i; noms[g.id] = g.name; });
    var sel = $("avatar-jeu");
    sel.innerHTML = "";
    var total = Object.keys(map).reduce(function (n, g) { return n + map[g].length; }, 0);
    var opt0 = el("option", "", tf("All ({0})", (total + (cle === "char" ? FIRMWARE.length + CUSTOM.length : 0))));
    opt0.value = "";
    sel.appendChild(opt0);
    if (cle === "char") {
      if (CUSTOM.length) { var oc = el("option", "", tf("Custom / Nextendo ({0})", CUSTOM.length)); oc.value = JEU_CUSTOM; sel.appendChild(oc); }
      if (FIRMWARE.length) { var of = el("option", "", tf("Nintendo Switch, default ({0})", FIRMWARE.length)); of.value = JEU_FW; sel.appendChild(of); }
    }
    Object.keys(map).sort(function (a, b) { return (ordre[a] == null ? 999 : ordre[a]) - (ordre[b] == null ? 999 : ordre[b]); }).forEach(function (gid) {
      var o = el("option", "", (noms[gid] || gid) + " (" + map[gid].length + ")");
      o.value = gid;
      sel.appendChild(o);
    });
    ipAppliquer();
  }
  var galerieChargee = false;
  function chargerGalerie() {
    if (galerieChargee) return;
    galerieChargee = true;
    Promise.all([
      fetch("/assets/icons/manifest.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch("/assets/avatars/manifest.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (r) {
      MAN = r[0] || { byCat: {}, games: [] };
      FIRMWARE = (r[1] && r[1].avatars) || [];
      CUSTOM = (r[1] && r[1].custom) || [];
      // Restore the saved layers: JSON {bg,char,frame} or legacy 'img:<payload>' (= character).
      var a = (PROFILE.avatar || "");
      if (a.charAt(0) === "{") { try { var o = JSON.parse(a); ed.bg = o.bg || null; ed.char = o.char || null; ed.frame = o.frame || null; } catch (e) {} }
      else if (a.indexOf("img:") === 0) { ed.char = a.slice(4); }
      ed.color = PROFILE.color || "#3a2a6a";
      $("profil-apercu").style.background = ed.color;
      ipChoisirCalque("char");
      apercuAvatar();
    }).catch(function () {});
  }
  function brancherGalerie() {
    document.querySelectorAll(".avatar-onglets button").forEach(function (b) {
      b.addEventListener("click", function () { ipChoisirCalque(b.dataset.calque); });
    });
    $("avatar-jeu").addEventListener("change", function () { ip.jeu = $("avatar-jeu").value; ipAppliquer(); });
    $("avatar-grille").addEventListener("scroll", function () {
      var g = $("avatar-grille");
      if (g.scrollTop + g.clientHeight >= g.scrollHeight - 280) ipAfficherPlus();
    });
    $("avatar-vider").addEventListener("click", function () {
      ed[ip.calque] = null; ed.dirty = true; ed.fichier = ""; ed.retire = false;
      marquerChoix(); apercuAvatar();
    });
  }

  // --- Dialogs and live actions ------------------------------------------------------------
  function brancherDialogues() {
    document.querySelectorAll("[data-ouvre]").forEach(function (b) {
      b.addEventListener("click", function () { $(b.dataset.ouvre).showModal(); });
    });
    // Closing plays the exit animation before the dialog really closes.
    document.querySelectorAll("dialog").forEach(function (dlg) {
      var fermerVraiment = dlg.close.bind(dlg);
      dlg.close = function (v) {
        if (!dlg.open || dlg.classList.contains("sort")) return;
        dlg.classList.add("sort");
        setTimeout(function () { dlg.classList.remove("sort"); fermerVraiment(v); }, 180);
      };
      dlg.addEventListener("cancel", function (e) { e.preventDefault(); dlg.close(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    });
    document.querySelectorAll("[data-ferme]").forEach(function (b) {
      b.addEventListener("click", function () { b.closest("dialog").close(); });
    });
    document.querySelectorAll("dialog form[data-sauve]").forEach(function (f) {
      if (f.closest("#dlg-profil") || f.closest("#dlg-email")) return; // wired below, really saves
      f.addEventListener("submit", function (e) {
        e.preventDefault(); // so the dialog can play its closing animation
        if (e.submitter && e.submitter.value === "ok") toast(f.dataset.sauve);
        f.closest("dialog").close();
      });
    });
    // Edit profile: the username really changes on the server; the picture is
    // uploaded when the server accepts it, otherwise kept as a local preview.
    var formProfil = $("dlg-profil").querySelector("form");
    formProfil.addEventListener("submit", function (e) {
      e.preventDefault();
      if (e.submitter && e.submitter.value !== "ok") { $("dlg-profil").close(); return; }
      var pseudo = $("profil-pseudo").value.trim();
      if (!/^[A-Za-z0-9_-]{3,16}$/.test(pseudo)) {
        toast(tf("Invalid username: 3 to 16 characters (letters, digits, _ or -)."));
        return;
      }
      var btn = formProfil.querySelector('button[value="ok"]');
      btn.disabled = true;
      var enregistrerPhoto = function (fini) {
        var payload = { mii: PROFILE.mii || "", color: ed.color || "" };
        if (calquesUtilises() || (ed.dirty && !ed.fichier && !ed.retire)) {
          composer().then(function (c) {
            payload.image = (c.toDataURL("image/jpeg", 0.9).split(",")[1]) || "";
            payload.avatar = JSON.stringify({ bg: ed.bg || undefined, char: ed.char || undefined, frame: ed.frame || undefined });
            NX.putProfile(payload).then(function (pr) {
              PROFILE = (pr && pr.profile) || payload;
              try { localStorage.setItem("nx_color", ed.color); } catch (x) {}
              fini();
            }).catch(function (err) { btn.disabled = false; toast(erreur(err)); });
          });
          return;
        } else if (ed.fichier) {
          payload.image = String(ed.fichier.split(",")[1] || "");
          payload.avatar = "";
        } else if (ed.retire) {
          payload.image = "";
          payload.avatar = "";
        } else {
          fini();
          return;
        }
        NX.putProfile(payload).then(function (pr) {
          PROFILE = (pr && pr.profile) || payload;
          try { localStorage.setItem("nx_color", ed.color); } catch (x) {}
          fini();
        }).catch(function (err) { btn.disabled = false; toast(erreur(err)); });
      };
      var fermer = function () {
        var t = Date.now();
        try { localStorage.setItem("nx_avt", String(t)); } catch (e) {}
        var avtSrc = photo(etat.donnees.moi.pid) + "&t=" + t;
        ["membre-photo", "profil-photo"].forEach(function (id) {
          var im = $(id);
          if (im) im.src = avtSrc;
        });
        var mini = document.querySelector(".moi-mini img");
        if (mini) mini.src = avtSrc;
        toast(tf("Profile updated."));
        $("dlg-profil").close();
        btn.disabled = false;
      };
      var apresPseudo = function () { enregistrerPhoto(fermer); };
      if (pseudo === etat.donnees.moi.pseudo) { apresPseudo(); return; }
      NX.setUsername(pseudo).then(function (r) {
        var compte = (r && r.account) || {};
        etat.donnees.moi.pseudo = compte.username || pseudo;
        $("membre-pseudo").textContent = etat.donnees.moi.pseudo;
        apresPseudo();
      }).catch(function (err) { btn.disabled = false; toast(erreur(err)); });
    });
    // Change e-mail: really changes on the server (confirmation sent to the new inbox).
    var formEmail = $("dlg-email").querySelector("form");
    formEmail.addEventListener("submit", function (e) {
      e.preventDefault();
      if (e.submitter && e.submitter.value !== "ok") { $("dlg-email").close(); return; }
      var inputs = formEmail.querySelectorAll("input");
      var btn = formEmail.querySelector('button[value="ok"]');
      btn.disabled = true;
      NX.changeEmail(inputs[0].value.trim(), inputs[1].value).then(function (r) {
        var compte = (r && r.account) || {};
        etat.donnees.moi.email = compte.email || inputs[0].value.trim();
        etat.donnees.moi.email_verifie = !!compte.email_verified;
        carteMembre(etat.donnees.moi);
        toast("Check your new inbox to confirm the change.");
        $("dlg-email").close();
      }).catch(function (err) { toast(erreur(err)); }).then(function () { btn.disabled = false; });
    });
    // Reset password: the server e-mails a reset link.
    var btnReset = $("btn-reinitialiser-mdp");
    if (btnReset) {
      btnReset.addEventListener("click", function () {
        if (!etat.donnees || !etat.donnees.moi || !etat.donnees.moi.email) return;
        btnReset.disabled = true;
        NX.forgot(etat.donnees.moi.email).then(function () {
          toast(tf("We sent you a link to reset your password."));
        }).catch(function (e) { toast(erreur(e)); }).then(function () { btnReset.disabled = false; });
      });
    }

    // Sign out: end the session unconditionally.
    var btnDeconnexion = $("btn-deconnexion") || document.querySelector(".bouton--sortie");
    if (btnDeconnexion) {
      btnDeconnexion.addEventListener("click", function (e) {
        e.preventDefault();
        NX.logout();
      });
    }

    // Delete account: really deletes on the server.
    var formSuppr = $("form-supprimer");
    if (formSuppr) {
      formSuppr.addEventListener("submit", function (e) {
        e.preventDefault();
        if (e.submitter && e.submitter.value !== "ok") {
          $("dlg-supprimer").close();
          return;
        }
        var inputMdp = $("suppr-mdp");
        var mdp = (inputMdp && inputMdp.value) ? inputMdp.value : "";
        if (!mdp) return;
        var btn = $("btn-confirmer-suppr") || formSuppr.querySelector('button[value="ok"]');
        if (btn) btn.disabled = true;
        NX.deleteAccount(mdp).then(function () {
          toast(tf("Account permanently deleted."));
          $("dlg-supprimer").close();
          setTimeout(function () {
            NX.logout();
          }, 1000);
        }).catch(function (err) {
          if (btn) btn.disabled = false;
          toast(erreur(err));
        });
      });
    }

    // Remaining demo toasts (if any)
    document.querySelectorAll("[data-demo]").forEach(function (b) {
      if (b.id === "btn-deconnexion" || b.id === "btn-reinitialiser-mdp") return;
      b.addEventListener("click", function () {
        toast(b.dataset.demo);
      });
    });
    $("plus-envoyees").addEventListener("click", function () { etat.envoyeesTout = !etat.envoyeesTout; demandes(); });

    // Edit profile: the username really changes on the server; the picture is the
    // layered composition (Nintendo/custom gallery), the uploaded file, or removal.
    var formProfil = $("dlg-profil").querySelector("form");
    var ouvrirProfil = function () {
      $("profil-pseudo").value = (etat.donnees && etat.donnees.moi && etat.donnees.moi.pseudo) || "";
      ed.fichier = "";
      ed.retire = false;
      ed.currentImage = PROFILE.image || "";
      ed.color = PROFILE.color || "#3a2a6a";
      var a = PROFILE.avatar || "";
      ed.bg = ed.char = ed.frame = null;
      ed.dirty = false;
      if (a.charAt(0) === "{") { try { var o = JSON.parse(a); ed.bg = o.bg || null; ed.char = o.char || null; ed.frame = o.frame || null; } catch (e) {} }
      else if (a.indexOf("img:") === 0) { ed.char = a.slice(4); }
      $("profil-apercu").style.background = ed.color;
      var cbox = $("couleurs");
      if (cbox) {
        cbox.querySelectorAll("button").forEach(function (b) {
          b.setAttribute("aria-pressed", (b.dataset.couleur === ed.color || b.style.background === ed.color) ? "true" : "false");
        });
      }
      chargerGalerie();
      if (galerieChargee && MAN) { ipChoisirCalque("char"); }
      apercuAvatar();
    };
    document.querySelectorAll('[data-ouvre="dlg-profil"]').forEach(function (b) {
      b.addEventListener("click", ouvrirProfil);
    });
    var couleurs = ["#3a2a6a", "#e0525e", "#ff9a66", "#4fb0ff", "#62e3a4", "#ffd166", "#b86bff", "#2b2b3a"];
    var box = $("couleurs");
    couleurs.forEach(function (c, i) {
      var b = el("button");
      b.type = "button"; b.style.background = c;
      b.dataset.couleur = c;
      b.setAttribute("aria-label", tf("Background color {0}", i + 1));
      b.setAttribute("aria-pressed", c === ed.color ? "true" : "false");
      b.addEventListener("click", function () {
        box.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        ed.color = c; ed.dirty = true; ed.fichier = ""; ed.retire = false;
        apercuAvatar();
      });
      box.appendChild(b);
    });
    var pf = $("profil-fichier");
    if (pf) {
      pf.addEventListener("change", function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        var lr = new FileReader();
        lr.onload = function () {
          ed.fichier = lr.result; ed.retire = false;
          ed.bg = ed.char = ed.frame = null; ed.dirty = false;
          marquerChoix(); apercuAvatar();
        };
        lr.readAsDataURL(f);
        e.target.value = "";
      });
    }
    var pr = $("profil-retirer");
    if (pr) {
      pr.addEventListener("click", function () {
        ed.retire = true; ed.fichier = "";
        ed.bg = ed.char = ed.frame = null; ed.dirty = false;
        marquerChoix(); apercuAvatar();
      });
    }
    brancherGalerie();
  }

  function brancherFiltres() {
    document.querySelectorAll(".filtres button").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".filtres button").forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        etat.filtre = b.dataset.filtre; etat.page = 1; dessinerAmis();
      });
    });
    $("recherche").addEventListener("input", function (e) { etat.recherche = e.target.value; etat.page = 1; dessinerAmis(); });
  }

  // --- Live load -------------------------------------------------------------------------
  // No session -> sign in first. A dead/expired token behaves the same.

  function panne(texte) {
    $("membre-pseudo").textContent = "Account not found";
    $("presence-texte").textContent = texte;
  }

  function charger() {
    if (!window.NX || !NX.token) { location.replace("login.html"); return; }
    var friendsP = NX.friends().then(function (r) { return r; }, function () { return { friends: [], requests: [] }; });
    var historyP = NX.history().then(function (r) { return r; }, function () { return { history: [] }; });
    var savesP = NX.getSaves().then(function (r) { return r; }, function () { return null; });
    var profileP = NX.profile().then(function (r) { return (r && r.profile) || {}; }, function () { return {}; });
    Promise.all([NX.me(), friendsP, historyP, savesP, profileP]).then(function (r) {
      PROFILE = r[4] || {};
      var acc = (r[0] && r[0].account) || {};
      var moi = {
        pid: acc.pid,
        pseudo: acc.username || acc.name || "?",
        code: acc.friend_code || "",
        email: acc.email || "",
        email_masque: emailMasque(acc.email),
        email_verifie: !!acc.email_verified,
        pays: acc.country || "",
        discord: acc.discord || acc.discord_username || "",
        discord_lie_le: acc.discord_linked_at || "",
        membre_depuis: dateISO(acc.created_at),
        booster: !!acc.booster,
        admin: false,
        presence: normPresence(r[0] && r[0].presence)
      };
      var amis = ((r[1] && r[1].friends) || []).map(normAmi);
      var d = {
        moi: moi,
        amis: amis,
        historique: ((r[2] && r[2].history) || []).slice(),
        demandes_recues: ((r[1] && r[1].requests) || []).map(normDemande),
        demandes_envoyees: [],
        sauvegardes: [],
        savesQuota: 5 * 1048576,
        savesTotal: 0,
        savesGate: ""
      };
      var sv = r[3];
      if (sv) {
        if (sv.eligible === false) {
          d.savesGate = (sv.reasonCode === "email")
            ? "Verify your e-mail address to unlock cloud saves."
            : "Link your Discord account to unlock cloud saves.";
        } else {
          d.savesQuota = sv.limit || (sv.isBooster ? 10 * 1048576 : 5 * 1048576);
          d.savesTotal = sv.totalSize || 0;
          if (sv.isBooster) moi.booster = true;
          d.sauvegardes = (sv.saves || []).map(function (x) {
            return { nom: x.name || x.titleId, title_id: x.titleId, taille: x.size || 0, maj: x.updatedAt || "" };
          });
        }
      }
      etat.donnees = d;
      etat.amis = amis;
      try { carteMembre(moi); } catch (e) { console.error("carteMembre:", e); }
      // The game the presence points to often lacks its name: fill it in.
      if (moi.presence.statut > 0 && moi.presence.jeu_id && !moi.presence.jeu) {
        resoudreJeu(moi.presence.jeu_id, function (nom) {
          if (nom && etat.donnees) {
            etat.donnees.moi.presence.jeu = nom;
            try { carteMembre(etat.donnees.moi); } catch (e) {}
          }
        });
      }
      try { activite(d); } catch (e) { console.error("activite:", e); }
      try { demandes(); } catch (e) { console.error("demandes:", e); }
      try { brancherFiltres(); } catch (e) { console.error("brancherFiltres:", e); }
      try { brancherAjout(); } catch (e) { console.error("brancherAjout:", e); }
      try { brancherFicheAmi(); } catch (e) { console.error("brancherFicheAmi:", e); }
      try { brancherTousJeux(); } catch (e) { console.error("brancherTousJeux:", e); }
      var svsBtn = $("svs-ok");
      if (svsBtn) {
        svsBtn.addEventListener("click", function () {
          var s = etat.sauvegarde;
          if (!s) { $("dlg-sauvegarde-suppr").close(); return; }
          NX.deleteSave(s.title_id).then(function () {
            d.sauvegardes = (d.sauvegardes || []).filter(function (x) { return x !== s; });
            $("dlg-sauvegarde-suppr").close();
            toast(tf("Cloud save deleted"));
            sauvegardes(d);
          }).catch(function (e) { toast(erreur(e)); });
        });
      }
      try { brancherDialogues(); } catch (e) { console.error("brancherDialogues:", e); }
      try { dessinerAmis(); } catch (e) { console.error("dessinerAmis:", e); }
      try { resoudreNomsAmis(); } catch (e) { console.error("resoudreNomsAmis:", e); }
      document.dispatchEvent(new Event("nx-donnees-pretes"));
    }).catch(function (err) {
      document.dispatchEvent(new Event("nx-donnees-pretes"));
      var msg = String((err && err.message) || "");
      if (/401|403|token|session|sign|invalide|expir/i.test(msg)) { location.replace("login.html"); return; }
      console.error(err);
      panne("Could not load your account: " + msg);
    });
  }

  charger();
})();

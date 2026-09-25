// Every page other than home and account. Shared helpers first, then one init per page
// (body data-page). The APIs below are live: every read and every write hits the server
// with the player's session (window.NX).

(function () {
  "use strict";
  // Sentence with values, translated as a whole (see i18n.js).
  var tf = function () { return window.nxF ? window.nxF.apply(null, arguments) : [].slice.call(arguments, 1).reduce(function (s, v, i) { return s.replace("{" + i + "}", v); }, arguments[0]); };

  var $ = function (id) { return document.getElementById(id); };
  var page = document.body.getAttribute("data-page");
  var nf = new Intl.NumberFormat((window.nxLangue || "en"));

  function el(tag, cls, texte) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texte != null) e.textContent = texte;
    return e;
  }

  var toastTimer;
  function toast(texte) {
    var t = $("toast");
    if (!t) { t = el("div", "toast"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = texte;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("visible"); }, 2800);
  }

  // Dialogs close with their exit animation, by the backdrop, Escape or any [data-ferme].
  function dialogues() {
    document.querySelectorAll("dialog").forEach(function (dlg) {
      var fermer = dlg.close.bind(dlg);
      dlg.close = function (v) {
        if (!dlg.open || dlg.classList.contains("sort")) return;
        dlg.classList.add("sort");
        setTimeout(function () { dlg.classList.remove("sort"); fermer(v); }, 180);
      };
      dlg.addEventListener("cancel", function (e) { e.preventDefault(); dlg.close(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    });
    document.querySelectorAll("[data-ferme]").forEach(function (b) {
      b.addEventListener("click", function () { b.closest("dialog").close(); });
    });
    document.querySelectorAll("[data-ouvre]").forEach(function (b) {
      b.addEventListener("click", function () { $(b.dataset.ouvre).showModal(); });
    });
  }

  // Show / hide password, on every password field that has a .voir-mdp button next to it.
  function motsDePasse() {
    document.querySelectorAll(".voir-mdp:not(.voir)").forEach(function (b) {
      var champ = b.parentNode.querySelector("input");
      b.addEventListener("click", function () {
        var visible = champ.type === "text";
        champ.type = visible ? "password" : "text";
        b.setAttribute("aria-label", visible ? "Show password" : "Hide password");
        b.innerHTML = visible ? OEIL : OEIL_BARRE;
      });
      b.innerHTML = OEIL;
      b.setAttribute("aria-label", "Show password");
    });
  }
  var OEIL = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  var OEIL_BARRE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.3 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  // Password strength: length, mixed case, digit, symbol. Four bars, and a word for it.
  function force(champ, barres, texte) {
    champ.addEventListener("input", function () {
      var v = champ.value, n = 0;
      if (v.length >= 8) n++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++;
      if (/\d/.test(v)) n++;
      if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) n++;
      if (!v) n = 0;
      barres.dataset.niveau = String(n);
      texte.textContent = !v ? "At least 8 characters." : ["Too short", "Weak", "Fair", "Good", "Strong"][n];
      texte.className = n >= 3 ? "ok" : "";
    });
  }

  function correspond(a, b, texte) {
    var verifier = function () {
      if (!b.value) { texte.textContent = ""; b.removeAttribute("aria-invalid"); return; }
      var ok = a.value === b.value;
      texte.textContent = ok ? "Passwords match." : "Passwords don't match.";
      texte.className = ok ? "ok" : "erreur";
      b.setAttribute("aria-invalid", ok ? "false" : "true");
    };
    a.addEventListener("input", verifier);
    b.addEventListener("input", verifier);
    return function () { return a.value.length >= 8 && a.value === b.value; };
  }

  // --- Country picker (register), same behavior as on the account page --------------------

  function selecteurPays(hote, actuel, auChoix) {
    var noms = new Intl.DisplayNames([window.nxLangue || "en"], { type: "region" });
    var codes = ("AR AT AU BE BO BR CA CH CL CN CO CR CU CZ DE DK DO DZ EC EG ES FI FR GB GR GT HN HR HU IE IL IN IT JP KR MA MX " +
      "NI NL NO NZ PA PE PH PL PR PT PY RO RS RU SA SE SG SK SV TN TR UA US UY VE VN ZA").split(" ");
    var liste = codes.map(function (c) { return { c: c, n: noms.of(c) }; }).sort(function (a, b) { return a.n.localeCompare(b.n, "en"); });
    var drapeau = function (c) { return "https://flagcdn.com/w40/" + c.toLowerCase() + ".png"; };
    var choisi = actuel;
    hote.innerHTML = "";
    var bouton = el("button", "pays-bouton"); bouton.type = "button";
    bouton.setAttribute("aria-haspopup", "listbox"); bouton.setAttribute("aria-expanded", "false");
    var fl = el("img"); fl.alt = ""; fl.width = 22; fl.height = 16;
    var nom = el("span");
    var chev = el("span", "pays-chevron"); chev.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    bouton.append(fl, nom, chev);
    var panneau = el("div", "pays-panneau"); panneau.hidden = true;
    var filtre = el("input", "pays-filtre"); filtre.type = "search"; filtre.placeholder = "Search a country"; filtre.setAttribute("aria-label", "Search a country");
    var ul = el("ul", "pays-liste"); ul.setAttribute("role", "listbox");
    panneau.append(filtre, ul);
    hote.append(bouton, panneau);
    var montrer = function () { fl.src = drapeau(choisi); nom.textContent = noms.of(choisi); };
    var fermer = function () { panneau.hidden = true; hote.classList.remove("est-ouvert"); bouton.setAttribute("aria-expanded", "false"); };
    var remplir = function () {
      var q = filtre.value.trim().toLowerCase();
      ul.innerHTML = "";
      liste.filter(function (x) { return !q || x.n.toLowerCase().indexOf(q) >= 0; }).forEach(function (x) {
        var li = el("li", "pays-option"); li.setAttribute("role", "option"); li.tabIndex = -1;
        li.setAttribute("aria-selected", x.c === choisi ? "true" : "false");
        var f = el("img"); f.src = drapeau(x.c); f.alt = ""; f.width = 22; f.height = 16; f.loading = "lazy";
        li.append(f, document.createTextNode(x.n));
        var prendre = function () { choisi = x.c; montrer(); fermer(); bouton.focus(); if (auChoix) auChoix(x.c); };
        li.addEventListener("click", prendre);
        li.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); prendre(); }
          if (e.key === "ArrowDown" && li.nextSibling) { e.preventDefault(); li.nextSibling.focus(); }
          if (e.key === "ArrowUp") { e.preventDefault(); (li.previousSibling || filtre).focus(); }
        });
        ul.appendChild(li);
      });
    };
    bouton.addEventListener("click", function () {
      if (!panneau.hidden) { fermer(); return; }
      panneau.hidden = false; hote.classList.add("est-ouvert"); bouton.setAttribute("aria-expanded", "true");
      filtre.value = ""; remplir(); filtre.focus();
    });
    filtre.addEventListener("input", remplir);
    filtre.addEventListener("keydown", function (e) { if (e.key === "ArrowDown" && ul.firstChild) { e.preventDefault(); ul.firstChild.focus(); } });
    hote.addEventListener("keydown", function (e) { if (e.key === "Escape") { fermer(); bouton.focus(); } });
    document.addEventListener("click", function (e) { if (!hote.contains(e.target)) fermer(); });
    montrer();
    return function () { return choisi; };
  }

  function etape(id) {
    document.querySelectorAll(".auth-etape").forEach(function (s) { s.hidden = s.id !== id; });
    var cible = $(id);
    var focus = cible && cible.querySelector("h2");
    if (focus) { focus.tabIndex = -1; focus.focus(); }
  }

  // --- Pages ------------------------------------------------------------------------------

  var PAGES = {};

  PAGES.reset = function () {
    force($("mdp"), $("force"), $("force-texte"));
    var ok = correspond($("mdp"), $("mdp2"), $("mdp2-texte"));
    $("form-reset").addEventListener("submit", function (e) {
      e.preventDefault();
      var m = $("reset-message");
      var v = $("mdp").value;
      if (!ok() || !/\d/.test(v) || !/[^A-Za-z0-9]/.test(v)) { m.hidden = false; m.textContent = "Use at least 8 characters, with a digit and a symbol, typed twice the same."; return; }
      var token = new URLSearchParams(location.search).get("token") || "";
      if (!token) { m.hidden = false; m.textContent = "This reset link is missing its token. Ask for a new one."; return; }
      m.hidden = true;
      var b = $("form-reset").querySelector('button[type="submit"]');
      b.disabled = true;
      NX.reset(token, v).then(function () {
        NX.token = "";
        etape("etape-fini");
      }).catch(function (err) {
        b.disabled = false;
        m.hidden = false;
        m.textContent = (err && err.message) || "Something went wrong. Try again.";
      });
    });
  };

  PAGES.verify = function () {
    var token = new URLSearchParams(location.search).get("token") || "";
    if (!token) {
      $("titre-verif").textContent = "Invalid link";
      $("etape-attente").querySelector(".petit").textContent = "This confirmation link is missing its token.";
      return;
    }
    NX.verifyEmail(token).then(function () {
      etape("etape-verifie");
    }).catch(function (err) {
      $("titre-verif").textContent = "Verification failed";
      $("etape-attente").querySelector(".petit").textContent = (err && err.message) || "This link is invalid or expired.";
    });
  };

  PAGES.lier = function () {
    if (!window.NX || !NX.token) { location.replace("login.html?next=" + encodeURIComponent("lier.html" + location.search)); return; }
    var CODE = new URLSearchParams(location.search).get("code") || "";
    var etat = document.createElement("p");
    etat.className = "petit";
    etat.setAttribute("role", "status");
    $("etape-code").appendChild(etat);
    if (!CODE) {
      etat.textContent = "This link has no device code. Scan the QR code again.";
      $("approuver").disabled = true;
      $("refuser").disabled = true;
      return;
    }
    // Announce the scan right away: the other screen shows this account before approving.
    NX.api("/api/qr/scan", { code: CODE }).then(function (d) {
      if (d && d.pseudo) {
        var qui = document.querySelector("#etape-code .appareil strong");
        if (qui) qui.textContent = d.pseudo;
      }
    }).catch(function (err) {
      etat.textContent = (err && err.message) || "This code is expired or already used.";
      $("approuver").disabled = true;
      $("refuser").disabled = true;
    });
    var cases = Array.prototype.slice.call(document.querySelectorAll(".chiffres input"));
    cases.forEach(function (c, i) {
      c.addEventListener("input", function () {
        c.value = c.value.replace(/\D/g, "").slice(-1);
        if (c.value && cases[i + 1]) cases[i + 1].focus();
        $("approuver").disabled = cases.some(function (x) { return !x.value; });
      });
      c.addEventListener("keydown", function (e) { if (e.key === "Backspace" && !c.value && cases[i - 1]) cases[i - 1].focus(); });
      c.addEventListener("paste", function (e) {
        var t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
        if (!t) return;
        e.preventDefault();
        cases.forEach(function (x, k) { x.value = t[k] || ""; });
        $("approuver").disabled = t.length < 4;
        (cases[t.length] || cases[3]).focus();
      });
    });
    var code4 = function () { return cases.map(function (x) { return x.value; }).join(""); };
    $("approuver").addEventListener("click", function () {
      var chiffres = code4();
      $("approuver").disabled = true;
      NX.api("/api/qr/valide", { code: CODE, chiffres: chiffres }).then(function () {
        etape("etape-lie");
      }).catch(function (err) {
        var msg = String((err && err.message) || "");
        var d = err && err.data;
        if (d && d.mort) {
          $("titre-lier").textContent = "Too many tries";
          etat.textContent = "This code is now expired. Scan a new one.";
          $("approuver").disabled = true;
          return;
        }
        if (d && typeof d.restant === "number" && d.restant > 0) {
          etat.textContent = "Wrong digits. " + d.restant + " tries left.";
        } else {
          etat.textContent = msg || "This code is expired or already used.";
        }
        cases.forEach(function (x) { x.value = ""; });
        cases[0].focus();
        $("approuver").disabled = true;
      });
    });
    $("refuser").addEventListener("click", function () {
      NX.api("/api/qr/refuse", { code: CODE }).then(function () {}, function () {});
      etape("etape-refuse");
    });
  };

  PAGES.sessions = function () {
    if (!window.NX || !NX.token) { location.replace("login.html?next=sessions.html"); return; }
    var SESSIONS = [];
    var typeDe = function (kind) {
      var k = String(kind || "").toLowerCase();
      if (/switch/.test(k)) return "switch";
      if (/ryujinx|emul|citron/.test(k)) return "emu";
      if (/app|iphone|android|phone|mobile/.test(k)) return "tel";
      return "web";
    };
    var ilYA = function (iso) {
      var t = Date.parse(iso);
      if (!t) return "";
      var s = Math.max(0, (Date.now() - t) / 1000);
      if (s < 60) return "just now";
      if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
      if (s < 86400) return Math.round(s / 3600) + " h ago";
      var j = Math.round(s / 86400);
      return j + (j > 1 ? " days ago" : " day ago");
    };
    var ICO = {
      web: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      emu: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="2.5" y="7" width="19" height="10" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 10v4M5 12h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/></svg>',
      "switch": '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="2" y="5" width="5" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="17" y="5" width="5" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7" y="5" width="10" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
      tel: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M11 18h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    };
    var cible = null;
    var charger = function () {
      NX.sessions().then(function (r) {
        SESSIONS = ((r && r.sessions) || []).map(function (s) {
          var lieu = [s.geo, s.ip].filter(Boolean).join(" · ") || (s.ip || "Unknown IP");
          return {
            id: s.id, nom: s.kind_label || s.kind || "Session",
            ou: lieu + (s.playing ? " · in game" : ""), quand: ilYA(s.last_seen),
            type: typeDe(s.kind), courante: !!s.current
          };
        });
        SESSIONS.sort(function (a, b) { return (b.courante ? 1 : 0) - (a.courante ? 1 : 0); });
        dessiner();
      }).catch(function (err) {
        var msg = String((err && err.message) || "");
        if (/401|403|token|session|expir|invalid/i.test(msg)) { NX.logout(); return; }
        var ul = $("sessions");
        ul.innerHTML = "";
        ul.appendChild(el("li", "vide-bloc", "Could not load sessions: " + msg));
      });
    };
    var dessiner = function () {
      var ul = $("sessions");
      ul.innerHTML = "";
      SESSIONS.forEach(function (s) {
        var li = el("li", "session" + (s.courante ? " est-courante" : ""));
        var ico = el("span", "appareil-ico"); ico.innerHTML = ICO[s.type];
        var mid = el("div");
        var n = el("div", "session-nom", s.nom);
        if (s.courante) n.appendChild(el("span", "badge", "This device"));
        mid.append(n, el("div", "session-detail", s.ou + ", " + s.quand.toLowerCase()));
        li.append(ico, mid);
        if (!s.courante) {
          var b = el("button", "bouton bouton--sortie petit-bouton", "Sign out");
          b.type = "button";
          b.addEventListener("click", function () { cible = s; $("dlg-session-nom").textContent = s.nom; $("dlg-session").showModal(); });
          li.appendChild(b);
        } else {
          li.appendChild(el("span", "petit", "Current"));
        }
        li.dataset.id = s.id;
        ul.appendChild(li);
      });
      $("tout-fermer").disabled = SESSIONS.length < 2;
      $("sessions-compte").textContent = SESSIONS.length + (SESSIONS.length > 1 ? " devices" : " device");
    };
    var retirer = function (ids) {
      ids.forEach(function (id) {
        var li = document.querySelector('.session[data-id="' + id + '"]');
        if (li) li.classList.add("sort");
      });
      setTimeout(function () {
        SESSIONS = SESSIONS.filter(function (s) { return ids.indexOf(s.id) < 0; });
        dessiner();
      }, 260);
    };
    $("dlg-session-ok").addEventListener("click", function () {
      var id = cible.id, moi = cible.courante;
      $("dlg-session").close();
      NX.revokeSession(id).then(function () {
        if (moi) { NX.logout(); return; }
        toast("Device signed out");
        charger();
      }).catch(function (e) { toast((e && e.message) || "Something went wrong."); });
    });
    $("tout-fermer").addEventListener("click", function () { $("dlg-tout").showModal(); });
    $("dlg-tout-ok").addEventListener("click", function () {
      $("dlg-tout").close();
      NX.revokeAllSessions().then(function () { NX.logout(); }).catch(function (e) { toast((e && e.message) || "Something went wrong."); });
    });
    charger();
  };

  PAGES.status = function () {
    // Same list as the live status page, read from the same endpoint every 15 seconds.
    var JEUX = [
      { nom: "Mario Kart 8 Deluxe", ids: ["0100152000022000"] },
      { nom: "Splatoon 2", ids: ["0100f8f0000a2000", "01003bc0000a0000", "01003c700009c800"] },
      { nom: "Splatoon 3", ids: ["0100c2500fc20000"] },
      { nom: "Super Smash Bros. Ultimate", ids: ["01006a800016e000"] },
      { nom: "Animal Crossing: New Horizons", ids: ["01006f8002326000"] },
      { nom: "Luigi's Mansion 3", ids: ["0100dca0064a6000"] },
      { nom: "Minecraft", ids: ["01006bd001e06000", "0100d71004694000"] },
      { nom: "ARMS", ids: ["01009b500007c000"] },
      { nom: "Mario Tennis Aces", ids: ["0100bde00862a000"] },
      { nom: "Super Mario Maker 2", ids: ["01009b90006dc000"] },
      { nom: "PAC-MAN 99", ids: ["0100ad9012510000"] },
      { nom: "Super Mario Bros. 35", ids: ["0100277011f1a000"] },
      { nom: "Super Mario Bros. Wonder", ids: ["010015100b514000"] },
      { nom: "Clubhouse Games: 51 Worldwide Classics", ids: ["010047700d540000"] },
      { nom: "Monster Hunter Generations Ultimate", ids: ["0100770008dd8000"] },
      { nom: "Crash Team Racing Nitro-Fueled", ids: ["0100f9f00c696000"] },
      { nom: "Diablo III: Eternal Collection", ids: ["01001b300b9be000"] },
      { nom: "Mario Party Superstars", ids: ["01006fe013472000"] },
      { nom: "Overcooked! 2", ids: ["01006fd0080b2000"] }
    ];
    var ul = $("serveurs");
    var lignes = {};
    JEUX.forEach(function (j) {
      var li = el("li", "serveur");
      var img = el("img"); img.src = "/api/game-icon/" + j.ids[0] + ".jpg"; img.alt = ""; img.loading = "lazy";
      var mid = el("div");
      mid.append(el("div", "serveur-nom", j.nom), el("div", "serveur-etat", "Checking…"));
      var n = el("div", "serveur-joueurs", "…");
      li.append(img, mid, n);
      ul.appendChild(li);
      lignes[j.nom] = li;
    });
    var maj = function () {
      fetch("/api/online-counts", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
        var counts = d.counts || {};
        var total = 0;
        JEUX.forEach(function (j) {
          var n = 0;
          j.ids.forEach(function (id) { if (counts[id] != null) n = Math.max(n, counts[id]); });
          total += n;
          var li = lignes[j.nom];
          li.querySelector(".serveur-etat").textContent = "Operational";
          li.querySelector(".serveur-joueurs").innerHTML = "";
          li.querySelector(".serveur-joueurs").append(document.createTextNode(nf.format(n)), el("small", "", n === 1 ? "player" : "players"));
        });
        $("etat-bandeau").className = "bandeau-etat";
        $("etat-titre").textContent = "All systems operational";
        $("etat-texte").textContent = tf("{0} players online across {1} game servers.", nf.format(total), JEUX.length);
        $("etat-maj").textContent = tf("Updated at {0}", new Date().toLocaleTimeString((window.nxLangue || "en"), { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }).catch(function () {
        $("etat-bandeau").className = "bandeau-etat est-panne";
        $("etat-titre").textContent = "We can't reach the network right now";
        $("etat-texte").textContent = "The status check failed. It will retry in 15 seconds.";
      });
    };
    maj();
    setInterval(maj, 15000);
  };

  PAGES.telecharger = function () {
    // Same sources and file patterns as the live download page (assets/js/download.js). Asset
    // URLs are checked against the repository path before they become links.
    var SOURCES = [
      { cle: "ryu", repo: "NextendoNetwork/Ryujinx-Nextendo", mode: "latest",
        match: { win: /win[-_]x64\.zip$/i, linux: /linux[-_]x64\.tar\.gz$/i, mac: /macos.*\.tar\.gz$/i } },
      { cle: "citron", repo: "NextendoNetwork/citron-nextendo", mode: "list",
        match: { win: /x64-clangcl\.zip$/i, linux: /linux-x86_64\.AppImage$/i } },
      { cle: "ios", repo: "NextendoNetwork/Nextendo-App-Ios", mode: "latest", match: { deb: /\.deb$/i, ipa: /^NextendoApp\.ipa$/i } },
      { cle: "android", repo: "NextendoNetwork/Nextendo-App-Android", mode: "latest", match: { apk: /^NextendoApp\.apk$/i } }
    ];
    SOURCES.forEach(function (src) {
      var api = "https://api.github.com/repos/" + src.repo + (src.mode === "list" ? "/releases?per_page=10" : "/releases/latest");
      var prefixe = "https://github.com/" + src.repo + "/releases/download/";
      fetch(api, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) {
          var versions = Array.isArray(d) ? d : [d];
          var trouve = {};
          versions.forEach(function (v) {
            (v.assets || []).forEach(function (a) {
              Object.keys(src.match).forEach(function (k) {
                if (!trouve[k] && src.match[k].test(a.name) && String(a.browser_download_url).indexOf(prefixe) === 0) {
                  trouve[k] = { url: a.browser_download_url, taille: a.size, tag: v.tag_name };
                }
              });
            });
          });
          var tag = versions[0] && versions[0].tag_name;
          var ver = $("v-" + src.cle);
          if (ver && tag) ver.textContent = tag;
          Object.keys(src.match).forEach(function (k) {
            var a = $("dl-" + src.cle + "-" + k);
            if (!a) return;
            var petit = a.querySelector("small");
            if (trouve[k]) {
              a.href = trouve[k].url;
              a.classList.remove("est-indispo");
              petit.textContent = tf("{0} MB", (trouve[k].taille / 1048576).toFixed(1)) + ", " + trouve[k].tag;
            } else {
              a.href = "https://github.com/" + src.repo + "/releases";
              a.classList.add("est-indispo");
              petit.textContent = "Not in this release yet";
            }
          });
        })
        .catch(function () {
          Object.keys(src.match).forEach(function (k) {
            var a = $("dl-" + src.cle + "-" + k);
            if (a) { a.href = "https://github.com/" + src.repo + "/releases"; a.querySelector("small").textContent = "See releases on GitHub"; }
          });
        });
    });
  };

  window.nxSelecteurPays = selecteurPays;
  dialogues();
  motsDePasse();
  if (PAGES[page]) PAGES[page]();
})();

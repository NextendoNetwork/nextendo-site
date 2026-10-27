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

  function selecteurPays(hote, actuel, auChoix, codesServeur) {
    var noms = new Intl.DisplayNames([window.nxLangue || "en"], { type: "region" });
    var codes = ("AR AT AU BE BO BR CA CH CL CN CO CR CU CZ DE DK DO DZ EC EG ES FI FR GB GR GT HN HR HU IE IN IT JP KR MA MX " +
      "NI NL NO NZ PA PE PH PL PR PT PY RO RS RU SA SE SG SK SV TN TR UA US UY VE VN ZA").split(" ");
    // Liste du serveur (GET /api/country, la seule acceptee a l inscription) ; la liste ci-dessus
    // ne sert que s il n a pas repondu. IL n y figure pas : il devient PS.
    if (codesServeur && codesServeur.length) codes = codesServeur.slice();
    codes = codes.filter(function (c) { return c !== "IL"; });
    if (actuel === "IL") actuel = "PS";
    var liste = codes.map(function (c) { return { c: c, n: noms.of(c) }; }).sort(function (a, b) { return a.n.localeCompare(b.n, "en"); });
    var drapeau = function (c) { return "assets/img/drapeaux/" + c.toLowerCase() + ".png"; };
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
        f.onerror = function () { f.style.visibility = "hidden"; };
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
    var sp = new URLSearchParams(location.search);
    var CODE = sp.get("c") || sp.get("code") || "";
    if (!window.NX || !NX.token) {
      location.replace("login.html?next=" + encodeURIComponent("/lier.html" + location.search));
      return;
    }
    var etat = document.createElement("p");
    etat.className = "petit";
    etat.setAttribute("role", "status");
    $("etape-code").appendChild(etat);
    if (!CODE) {
      etat.textContent = window.nxT ? window.nxT("This link has no device code. Scan the QR code again.") : "This link has no device code. Scan the QR code again.";
      $("approuver").disabled = true;
      $("refuser").disabled = true;
      return;
    }
    // Announce the scan right away: the other screen shows this account before approving.
    NX.api("/api/qr/scan", { code: CODE }).then(function (d) {
      var qui = document.querySelector("#etape-code .appareil strong");
      if (qui) qui.textContent = window.nxT ? window.nxT("Nintendo Switch") : "Nintendo Switch";
    }).catch(function (err) {
      etat.textContent = (err && err.message) || (window.nxT ? window.nxT("This code is expired or already used.") : "This code is expired or already used.");
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
          $("titre-lier").textContent = window.nxT ? window.nxT("Too many tries") : "Too many tries";
          etat.textContent = window.nxT ? window.nxT("This code is now expired. Scan a new one.") : "This code is now expired. Scan a new one.";
          $("approuver").disabled = true;
          return;
        }
        if (d && typeof d.restant === "number" && d.restant > 0) {
          etat.textContent = tf("Wrong digits. {0} tries left.", d.restant);
        } else {
          etat.textContent = msg || (window.nxT ? window.nxT("This code is expired or already used.") : "This code is expired or already used.");
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
    var fr = (window.nxLangue === "fr");
    var typeDe = function (kind) {
      var k = String(kind || "").toLowerCase();
      if (/switch/.test(k)) return "switch";
      if (/ryujinx|emul|citron/.test(k)) return "emu";
      if (/app|iphone|android|phone|mobile/.test(k)) return "tel";
      return "web";
    };
    var traduireNom = function (kind, label) {
      var k = String(kind || "").toLowerCase();
      var s = String(label || "").toLowerCase();
      if (k === "browser" || /navigateur|browser/.test(s)) return fr ? "Navigateur" : "Browser";
      if (k === "switch" || /switch/.test(s)) return "Nintendo Switch";
      if (k === "ryujinx" || /ryujinx/.test(s)) return fr ? "Ryujinx (émulateur)" : "Ryujinx (emulator)";
      if (k === "citron" || /citron/.test(s)) return fr ? "Citron (émulateur)" : "Citron (emulator)";
      return label || k || "Session";
    };
    var ilYA = function (iso) {
      var t = Date.parse(iso);
      if (!t) return "";
      var s = Math.max(0, (Date.now() - t) / 1000);
      if (s < 60) return fr ? "à l'instant" : "just now";
      if (s < 3600) {
        var m = Math.max(1, Math.round(s / 60));
        return fr ? "il y a " + m + " min" : m + " min ago";
      }
      if (s < 86400) {
        var h = Math.round(s / 3600);
        return fr ? "il y a " + h + " h" : h + " h ago";
      }
      var j = Math.round(s / 86400);
      return fr ? (j > 1 ? "il y a " + j + " jours" : "il y a 1 jour") : (j + (j > 1 ? " days ago" : " day ago"));
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
        var rawList = ((r && r.sessions) || []).map(function (s) {
          var lieu = [s.geo, s.ip].filter(Boolean).join(" · ") || (s.ip || (fr ? "IP inconnue" : "Unknown IP"));
          var tSeen = Date.parse(s.last_seen) || 0;
          return {
            id: s.id, nom: traduireNom(s.kind, s.kind_label),
            ou: lieu + (s.playing ? (fr ? " · en jeu" : " · in game") : ""), quand: ilYA(s.last_seen),
            type: typeDe(s.kind), courante: !!s.current, raw_last_seen: tSeen, ip: s.ip || "", kind: s.kind
          };
        });

        // Tri par date décroissante
        rawList.sort(function (a, b) {
          return (b.raw_last_seen || 0) - (a.raw_last_seen || 0);
        });

        // Déduplication : conserver la session courante, et au plus une session par (type + ip)
        var vu = {};
        var uniques = [];
        rawList.forEach(function (s) {
          if (s.courante) {
            uniques.push(s);
            if (s.ip) vu[s.type + ":" + s.ip] = true;
          }
        });
        rawList.forEach(function (s) {
          if (s.courante) return;
          var cle = s.type + ":" + (s.ip || s.id);
          if (!vu[cle]) {
            vu[cle] = true;
            uniques.push(s);
          }
        });

        // Session courante en tête
        uniques.sort(function (a, b) {
          if (b.courante !== a.courante) return (b.courante ? 1 : 0) - (a.courante ? 1 : 0);
          return (b.raw_last_seen || 0) - (a.raw_last_seen || 0);
        });

        SESSIONS = uniques;
        dessiner();
      }).catch(function (err) {
        var msg = String((err && err.message) || "");
        // Le code HTTP d'abord : le message est traduit et ne contient pas forcement ces mots.
        if ((err && (err.status === 401 || err.status === 403)) || /401|403|token|session|expir|invalid/i.test(msg)) { NX.logout(); return; }
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
        if (s.courante) n.appendChild(el("span", "badge", fr ? "Cet appareil" : "This device"));
        mid.append(n, el("div", "session-detail", s.ou + ", " + s.quand.toLowerCase()));
        li.append(ico, mid);
        if (!s.courante) {
          var b = el("button", "bouton bouton--sortie petit-bouton", fr ? "Déconnecter" : "Sign out");
          b.type = "button";
          b.addEventListener("click", function () { cible = s; $("dlg-session-nom").textContent = s.nom; $("dlg-session").showModal(); });
          li.appendChild(b);
        } else {
          li.appendChild(el("span", "petit", fr ? "Actuelle" : "Current"));
        }
        li.dataset.id = s.id;
        ul.appendChild(li);
      });
      $("tout-fermer").disabled = SESSIONS.length < 2;
      $("sessions-compte").textContent = SESSIONS.length + (SESSIONS.length > 1 ? (fr ? " appareils" : " devices") : (fr ? " appareil" : " device"));
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
      {"nom": "SpeedRunners 2: King of Speed", "ids": ["01004cc023582000"], "nostatus": true, "playableNote": "Switch tested: South America, crossplay disabled.", "guidance": "Quick Race, Ranked play, public rooms and private rooms by code tested on Switch. Ranked result saving, friend invitations and Tournament remain unavailable; public emulator support is pending release and validation. Use South America with crossplay disabled."},
      { nom: "SEGA Genesis - Nintendo Classics", ids: ["0100b3c014bda000"], monitored: true },
      { nom: "Just Dance 2022", ids: ["0100ea6014bb8000"], monitored: true },
      { nom: "Mario Kart 8 Deluxe", ids: ["0100152000022000"] },
      { nom: "Splatoon 2", ids: ["0100f8f0000a2000", "01003bc0000a0000", "01003c700009c800"] },
      { nom: "Splatoon 3", ids: ["0100c2500fc20000"] },
      { nom: "Super Smash Bros. Ultimate", ids: ["01006a800016e000"] },
      { nom: "Animal Crossing: New Horizons", ids: ["01006f8002326000"] },
      { nom: "Luigi's Mansion 3", ids: ["0100dca0064a6000"] },
      { nom: "Minecraft: Nintendo Switch Edition", ids: ["01006bd001e06000"] },
      { nom: "ARMS", ids: ["01009b500007c000"] },
      { nom: "Mario Tennis Aces", ids: ["0100bde00862a000"] },
      { nom: "Super Mario Maker 2", ids: ["01009b90006dc000"] },
      { nom: "PAC-MAN 99", ids: ["0100ad9012510000"] },
      { nom: "Among Us", ids: ["0100b0c013912000"], nolist: true },
      { nom: "Mario & Sonic at the Olympic Games Tokyo 2020", ids: ["010086000e148000"] },
      { nom: "Tetris 99", ids: ["010040600c5ce000"] },
      { nom: "Super Mario Bros. 35", ids: ["0100277011f1a000"] },
      { nom: "Super Mario Bros. Wonder", ids: ["010015100b514000"] },
      { nom: "Clubhouse Games: 51 Worldwide Classics", ids: ["010047700d540000"] },
      { nom: "Monster Hunter Generations Ultimate", ids: ["0100770008dd8000"] },
      { nom: "Crash Team Racing Nitro-Fueled", ids: ["0100f9f00c696000"] },
      { nom: "Diablo III: Eternal Collection", ids: ["01001b300b9be000"] },
      { nom: "Mario Party Superstars", ids: ["01006fe013472000"] },
      { nom: "Super Mario Party Jamboree", ids: ["0100965017338000"], icon: "/assets/img/games/jamboree.png", monitored: true },
      { nom: "Kirby's Dream Buffet", ids: ["0100a8e016236000"], icon: "/assets/img/games/kirby.png", monitored: true },
      { nom: "Stardew Valley", ids: ["0100e65002bb8000"], icon: "/assets/img/games/stardew.png", monitored: true },
      { nom: "Overcooked! 2", ids: ["01006fd0080b2000"] },
      { nom: "Pokémon Scarlet and Violet", ids: ["0100a3d008c5c000", "01008f6008c5e000"] },
      { nom: "Nintendo 64 - Nintendo Classics", ids: ["0100c9a00ece6000"] },
      { nom: "NES - Nintendo Classics", ids: ["0100d870045b6000"], monitored: true },
      { nom: "SNES - Nintendo Classics", ids: ["01008d300c50c000"], monitored: true },
      { nom: "Game Boy - Nintendo Classics", ids: ["0100c62011050000"], monitored: true },
      { nom: "Game Boy Advance - Nintendo Classics", ids: ["010012f017576000"], monitored: true },
      { nom: "Pokémon Legends: Z-A", ids: ["0100f43008c44000"] },
      { nom: "Pokémon Sword and Shield", ids: ["0100abf008968000", "01008db008c2c000"] },
      { nom: "Super Monkey Ball Banana Mania", ids: ["010001701248c000"] },
      { nom: "Mario Golf: Super Rush", ids: ["0100c9c00e25c000"] },
      { nom: "Super Mario 3D World + Bowser's Fury", ids: ["010028600ebda000"], icon: "/assets/img/games/sm3dw.jpg" },
      { nom: "Super Mario Odyssey", ids: ["0100000000010000"] },
      { nom: "METAL GEAR SOLID: Peace Walker", ids: ["0100c6f01c4f8000"] },
      { nom: "Mario Strikers: Battle League", ids: ["010019401051c000"] },
      { nom: "Minecraft Dungeons II", ids: ["0100a7c01b792000"] },
      { nom: "Pokkén Tournament DX", ids: ["0100b3f000be2000"] },
      { nom: "Saints Row: The Third - The Full Package", ids: ["0100de600beee000"] },
      { nom: "UNO", ids: ["0100b6e012ebe000"] },
      { nom: "Dying Light: Platinum Edition", ids: ["01008c8012920000"] },
      { nom: "Ultimate Chicken Horse", ids: ["0100fcf002a58000"], nostatus: true },
      { nom: "Crypt of the NecroDancer", ids: ["0100cea007d08000"], nostatus: true, countScope: "rooms" },
      { nom: "Nintendo Switch Sports", ids: ["0100d2f00d5c0000"] },
      { nom: "Monopoly for Nintendo Switch", ids: ["01007430037f6000"] },
      { nom: "Dragon Ball FighterZ", ids: ["0100a250097f0000"] },
      { nom: "Friday the 13th: The Game", ids: ["010092a00c4b6000"] },
      { nom: "Monster Hunter Rise", ids: ["0100b04011742000"] },
      { nom: "Miitopia", ids: ["01003da010e8a000"] },
      { nom: "Game Builder Garage", ids: ["0100fa5010788000"] },
      { nom: "Zombie Army 4: Dead War", ids: ["01000bf0152fa000"], icon: "/assets/img/games/zombiearmy4.jpg" },
    ];
    var ul = $("serveurs");
    var lignes = {};
    var ouverts = {};
    var reportedCounts = {};
    var detailedTitles = ["0100d870045b6000", "01008d300c50c000", "0100c62011050000", "010012f017576000", "0100b3c014bda000", "0100ea6014bb8000", "0100fcf002a58000"];
    var live = null; // title id -> game from /api/status/live (logged-in only)
    JEUX.forEach(function (j) {
      var li = el("li", "serveur");
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.setAttribute("aria-expanded", "false");
      var img = el("img"); img.src = j.icon || "/api/game-icon/" + j.ids[0] + ".jpg"; img.alt = ""; img.loading = "lazy";
      var mid = el("div");
      var etat = el("div", "serveur-ligne");
      var amis = el("span", "serveur-amis");
      amis.hidden = true;
      etat.append(el("div", "serveur-etat", "Checking…"), amis);
      mid.append(el("div", "serveur-nom", j.nom), etat);
      if (j.playableNote) mid.append(el("small", "", j.playableNote));
      var n = el("div", "serveur-joueurs", "…");
      var detail = el("div", "serveur-detail");
      detail.hidden = true;
      li.append(img, mid, n, detail);
      var basculer = function () {
        ouverts[j.nom] = !ouverts[j.nom];
        li.classList.toggle("est-ouvert", ouverts[j.nom]);
        li.setAttribute("aria-expanded", ouverts[j.nom] ? "true" : "false");
        detail.hidden = !ouverts[j.nom];
        if (ouverts[j.nom]) dessinerDetail(j);
      };
      li.addEventListener("click", function (e) { if (!detail.contains(e.target)) basculer(); });
      li.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && e.target === li) { e.preventDefault(); basculer(); }
      });
      ul.appendChild(li);
      lignes[j.nom] = li;
    });

    var jeuLive = function (j) {
      if (!live) return null;
      for (var i = 0; i < j.ids.length; i++) if (live[j.ids[i]]) return live[j.ids[i]];
      return null;
    };
    var avatar = function (p) {
      var box = el("span", "joueur-avatar");
      box.style.background = p.color || "";
      var lettre = el("span", "", (p.name || "?").charAt(0).toUpperCase());
      box.append(lettre);
      if (p.avatar) {
        var img = el("img"); img.alt = ""; img.loading = "lazy"; img.src = p.avatar;
        img.onerror = function () { img.remove(); };
        box.append(img);
      }
      return box;
    };
    var puce = function (p, lobbies) {
      var c = el("span", "joueur" + (p.friend ? " est-ami" : "") + (p.you ? " est-moi" : ""));
      c.append(avatar(p), el("span", "joueur-nom", p.name));
      if (p.you) c.append(el("span", "joueur-tag", "You"));
      else if (p.friend) c.append(el("span", "joueur-tag est-ami", "Friend"));
      if (lobbies && p.lobby >= 0) c.append(el("span", "joueur-tag", tf("Lobby {0}", p.lobby + 1)));
      // Activite generique publiee par le serveur du jeu (ACNH : ile, visite, Luna), libelle anglais.
      if (p.activity) c.append(el("span", "joueur-tag", p.activity));
      return c;
    };
    var ETATS = { searching: "Searching", matched: "In a match", full: "Full", open: "Open" };
    // Type de partie d'un salon : /api/status/live le calcule pour MK8, Smash, ACNH et S2 (code `kind`,
    // libelle anglais dans `mode`, jamais le mode ni les attributs bruts du jeu). Couleur et
    // icone comme dans nexdash ; le libelle passe par i18n.js comme le reste de la page.
    var ICO_SALON = {
      globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
      map: '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4zM8 2v16M16 6v16"/>',
      swords: '<path d="M14 4h6v6M20 4 4 20M10 20H4v-6"/>',
      trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v1a4 4 0 0 1-3 4M7 5H4v1a4 4 0 0 0 3 4"/>',
      users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      crown: '<path d="M3 7l5 4 4-6 4 6 5-4-2 10H5z"/>',
      zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
      flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>'
    };
    var TYPES_SALON = {
      "mk8-world-race": ["globe", "#7fb4ff", "rgba(59,140,255,.16)"],
      "mk8-world-battle": ["swords", "#6ee7c8", "rgba(45,212,191,.18)"],
      "mk8-regional-race": ["map", "#c19bff", "rgba(176,107,255,.18)"],
      "mk8-regional-battle": ["swords", "#ff8ad4", "rgba(255,105,196,.18)"],
      "tournament": ["trophy", "#ffd166", "rgba(255,209,102,.18)"],
      "friend-room": ["users", "#5fe08c", "rgba(46,224,106,.18)"],
      "smash-quick": ["swords", "#7fb4ff", "rgba(59,140,255,.16)"],
      "smash-elite": ["crown", "#ff6b9a", "rgba(255,79,138,.18)"],
      "smash-quick-elite": ["swords", "#9cc1ff", "rgba(106,166,255,.16)"],
      "smash-quick-duo": ["users", "#2ad4e6", "rgba(42,212,230,.16)"],
      "smash-amiibo": ["zap", "#c19bff", "rgba(176,107,255,.18)"],
      "smash-arena-public": ["globe", "#ff9e5c", "rgba(255,145,59,.18)"],
      "smash-arena-friends": ["users", "#5fe08c", "rgba(46,224,106,.18)"],
      "world-dance-floor": ["globe", "#c19bff", "rgba(176,107,255,.18)"],
      "online": ["flag", "#9cc1ff", "rgba(106,166,255,.16)"],
      "acnh-island-dodo": ["crown", "#ffd166", "rgba(255,209,102,.18)"],
      "acnh-island-friends": ["users", "#5fe08c", "rgba(46,224,106,.18)"],
      "s2-turf": ["flag", "#5fe08c", "rgba(46,224,106,.18)"],
      "s2-ranked": ["trophy", "#ffbf5a", "rgba(255,159,59,.18)"],
      "s2-salmon": ["zap", "#ff9e5c", "rgba(255,122,61,.20)"],
      "s2-private": ["users", "#c9d2f0", "rgba(139,151,196,.20)"]
    };
    var typeSalon = function (l) {
      var d = TYPES_SALON[String(l.kind || "").replace(/-1v1$/, "")];
      if (!d || !l.mode) return el("span", "salon-mode", l.mode || "");
      var s = el("span", "salon-type");
      s.style.color = d[1];
      s.style.background = d[2];
      s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICO_SALON[d[0]] + "</svg>";
      s.append(el("span", "", l.mode));
      return s;
    };
    var dessinerDetail = function (j) {
      var detail = lignes[j.nom].querySelector(".serveur-detail");
      detail.innerHTML = "";
      if (j.guidance) { detail.append(el("p", "detail-vide", j.guidance)); detail.append(el("p", "detail-vide", "Player count unavailable")); return; }
      if (j.countScope === "rooms") {
        detail.append(el("p", "detail-vide", "This counter shows players in active game rooms."));
        return;
      }
      if (!window.NX || !NX.token) {
        var p = el("p", "detail-vide");
        var a = el("a", "", "Sign in"); a.href = "login.html?next=status.html";
        p.append(el("span", "", "Sign in to see who's playing and the lobbies being run."), document.createTextNode(" "), a);
        detail.append(p);
        return;
      }
      if (!live) { detail.append(el("p", "detail-vide", "Loading…")); return; }
      var g = jeuLive(j);
      if ((j.ids[0] === "0100a8e016236000" || j.ids[0] === "0100b6e012ebe000") && !g) { detail.append(el("p", "detail-vide", "Live player and lobby details are temporarily unavailable.")); return; }
      if (j.nolist && (!g || !g.players.length)) { detail.append(el("p", "detail-vide", "The player count is live, but this game does not publish who is playing or its lobbies.")); return; }
      if (!g || !g.players.length) {
        var count = reportedCounts[j.nom];
        var message = count > 0 || (detailedTitles.indexOf(j.ids[0]) >= 0 && !g) || count == null
          ? "Live player and lobby details are temporarily unavailable." : "Nobody is online right now.";
        detail.append(el("p", "detail-vide", message)); return;
      }
      if (g.roomsAvailable === false) detail.append(el("p", "detail-vide", "Player presence is live. Room details are temporarily unavailable."));
      else if (!g.lobbies.length) detail.append(el("p", "detail-vide", "These players are online but are not in a room yet."));
      if (g.lobbies.length) {
        detail.append(el("h3", "detail-titre", tf("Lobbies ({0})", g.lobbies.length)));
        var grille = el("div", "salons");
        g.lobbies.forEach(function (l, i) {
          var s = el("div", "salon");
          var tete = el("div", "salon-tete");
          tete.append(el("strong", "", tf("Lobby {0}", i + 1)), typeSalon(l),
            el("span", "salon-etat est-" + l.state, ETATS[l.state] || l.state),
            el("span", "salon-places", l.max ? tf("{0}/{1}", l.count, l.max) : nf.format(l.count)));
          var membres = el("div", "joueurs");
          l.players.forEach(function (p) { membres.append(puce(p, false)); });
          s.append(tete, membres);
          grille.append(s);
        });
        detail.append(grille);
      }
      detail.append(el("h3", "detail-titre", tf("Players ({0})", g.players.length)));
      var tous = el("div", "joueurs");
      g.players.forEach(function (p) { tous.append(puce(p, true)); });
      detail.append(tous);
    };
    var unoSnapshot = null, unoSnapshotAt = 0, liveSession = null, liveRequest = 0;
    var majLive = function () {
      var session = window.NX && NX.token;
      var request = ++liveRequest;
      if (session !== liveSession) {
        unoSnapshot = null; unoSnapshotAt = 0; liveSession = session; live = null;
        JEUX.forEach(function (j) { if (ouverts[j.nom]) dessinerDetail(j); });
      }
      if (!session) {
        live = {};
        JEUX.forEach(function (j) { if (ouverts[j.nom]) dessinerDetail(j); });
        return;
      }
      Promise.all(["/api/status/live", "/game-stats/kirby-live", "/game-stats/uno-live", "/service-catalog/v1/status/live"].map(function (path) {
        return fetch(path, { headers: { Authorization: "Bearer " + session }, cache: "no-store" })
          .then(function (r) {
            if (path === "/game-stats/uno-live" && (r.status === 401 || r.status === 403)) {
              if (liveSession === session) { unoSnapshot = null; unoSnapshotAt = 0; }
            }
            if (!r.ok) throw 0; return r.json();
          }).catch(function () { return null; });
      }))
        .then(function (results) {
          if (!window.NX || NX.token !== session || liveSession !== session || request !== liveRequest) return;
          if (results[2]) { unoSnapshot = results[2]; unoSnapshotAt = Date.now(); }
          else if (Date.now() - unoSnapshotAt > 30000) { unoSnapshot = null; }
          var d = results[0] || {games: []};
          if (results[1]) d.games = (d.games || []).filter(function (g) { return (g.titles || []).indexOf("0100a8e016236000") < 0; }).concat([results[1]]);
          if (unoSnapshot) d.games = (d.games || []).filter(function (g) { return (g.titles || []).indexOf("0100b6e012ebe000") < 0; }).concat([unoSnapshot]);
          // An unavailable detail source must not become a fictional empty room/player list.
          var extra = results[3] && Array.isArray(results[3].games) ? results[3].games : [];
          d.games = (d.games || []).filter(function (g) {
            return !(g.titles || []).some(function (id) { return detailedTitles.indexOf(id) >= 0; });
          }).concat(extra.filter(function (g) {
            return Array.isArray(g.titles) && g.titles.length === 1 && detailedTitles.indexOf(g.titles[0]) >= 0 && Array.isArray(g.players) && Array.isArray(g.lobbies);
          }));
          live = {};
          (d.games || []).forEach(function (g) { (g.titles || []).forEach(function (t) { live[t] = g; }); });
          if (lastCounts) renderCounts(lastCounts);
          JEUX.forEach(function (j) {
            var g = jeuLive(j);
            var badge = lignes[j.nom].querySelector(".serveur-amis");
            var n = g ? g.friends : 0;
            badge.textContent = n ? (n === 1 ? "1 friend" : tf("{0} friends", n)) : "";
            badge.hidden = !n;
            if (ouverts[j.nom]) dessinerDetail(j);
          });
        })
        .catch(function () {});
    };
    var lastCounts = null;
    var renderCounts = function (d) {
        lastCounts = d;
        var counts = d.counts || {};
        var total = 0;
        var unavailable = 0;
        var parJeu = {};
        JEUX.forEach(function (j) {
          var n = 0;
          j.ids.forEach(function (id) { if (counts[id] != null) n = Math.max(n, counts[id]); });
          var details = jeuLive(j);
          // For Classics and JD the header and list use the same authenticated snapshot.
          if (details && detailedTitles.indexOf(j.ids[0]) >= 0) n = details.players.length;
          reportedCounts[j.nom] = j.ids.some(function (id) { return counts[id] != null; }) || details ? n : null;
          total += n;
          parJeu[j.nom] = n;
          var li = lignes[j.nom];
          // A game is Operational only when its server answered the live check; nostatus marks a
          // server the check cannot reach, which is shown as such rather than assumed up.
          var hasCount = !!details || j.ids.some(function (id) { return Object.prototype.hasOwnProperty.call(counts, id); });
          var online = hasCount || j.ids.some(function (id) { return d.availability && d.availability[id] === true; });
          if (!online && !j.nostatus) { unavailable++; }
          var gameState = li.querySelector(".serveur-etat");
          gameState.textContent = online ? "Operational" : (j.nostatus ? "Status unavailable" : "Offline");
          gameState.style.color = online ? "" : (j.nostatus ? "#9aa0b4" : "#ff6b81");
          li.querySelector(".serveur-joueurs").innerHTML = "";
          if (online && hasCount) {
            li.querySelector(".serveur-joueurs").append(document.createTextNode(nf.format(n)), el("small", "", j.countScope === "rooms" ? (n === 1 ? "player in rooms" : "players in rooms") : (n === 1 ? "player" : "players")));
          } else if (online && j.countScope === "rooms") {
            li.querySelector(".serveur-joueurs").append(document.createTextNode("—"), el("small", "", "Player count unavailable"));
          } else {
            li.querySelector(".serveur-joueurs").textContent = "—";
          }
        });
        // Most players first, then by name.
        JEUX.slice().sort(function (a, b) {
          return (parJeu[b.nom] - parJeu[a.nom]) || a.nom.localeCompare(b.nom);
        }).forEach(function (j) { ul.appendChild(lignes[j.nom]); });
        $("etat-bandeau").className = "bandeau-etat";
        $("etat-titre").textContent = unavailable ? (unavailable === 1 ? "1 game server is offline" : unavailable + " game servers are offline") : "All services active";
        $("etat-texte").textContent = tf("{0} of {1} game servers active · {2} players online.", JEUX.length - unavailable, JEUX.length, nf.format(total));
        $("etat-maj").textContent = tf("Updated at {0}", new Date().toLocaleTimeString((window.nxLangue || "en"), { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        JEUX.forEach(function (j) { if (ouverts[j.nom]) dessinerDetail(j); });
    };
    var maj = function () {
      window.nxOnlineCounts().then(renderCounts).catch(function () {
        $("etat-bandeau").className = "bandeau-etat est-panne";
        $("etat-titre").textContent = "We can't reach the network right now";
        $("etat-texte").textContent = "The status check failed. It will retry in 15 seconds.";
      });
    };
    maj();
    majLive();
    setInterval(function () { maj(); majLive(); }, 15000);
  };

  PAGES.telecharger = function () {
    // Same sources and file patterns as the live download page (assets/js/download.js). Asset
    // URLs are checked against the repository path before they become links.
    var SOURCES = [
      { cle: "ryu", repo: "NextendoNetwork/Ryujinx-Nextendo", mode: "latest",
        match: { win: /win[-_]x64\.zip$/i, linux: /linux[-_]x64\.tar\.gz$/i, mac: /macos.*\.tar\.gz$/i } },
      { cle: "citron", repo: "NextendoNetwork/citron-nextendo", mode: "list",
        match: { win: /x64-clangcl\.zip$/i, linux: /linux.*x86_64.*\.AppImage$/i } },
      { cle: "prelude", repo: "NextendoNetwork/Prelude-Nro", mode: "latest", match: { nro: /\.nro$/i } },
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

          // Citron : sélecteur custom d'architectures Linux (exclut Windows / .zip)
          if (src.cle === "citron") {
            var box = $("citron-select-box");
            var trig = $("citron-dropdown-trigger");
            var labelEl = $("citron-dropdown-label");
            var menu = $("citron-dropdown-menu");
            var wrap = $("citron-dropdown");
            // Le menu deroulant est en position absolue dans une carte a
            // backdrop-filter (contexte d'empilement) : sans ca, la carte
            // suivante le recouvre. On remonte toute la carte au-dessus.
            var majPlaque = function (ouvert) {
              var plaque = wrap ? wrap.closest(".plaque") : null;
              if (plaque) plaque.classList.toggle("menu-deroulant-ouvert", !!ouvert);
            };
            if (box && trig && menu && labelEl) {
              menu.innerHTML = "";
              var assetsList = [];
              versions.forEach(function (v) {
                (v.assets || []).forEach(function (a) {
                  if (/\.zsync$/i.test(a.name)) return;
                  // Strictly Linux: AppImage or tar.zst (No windows, no zip, no exe)
                  if (!/\.(AppImage|tar\.zst)$/i.test(a.name) || /windows|msvc|\.zip|\.exe/i.test(a.name)) return;
                  var label = a.name;
                  if (/x86_64.*use-nopgo.*AppImage/i.test(a.name)) label = "Linux x86_64 (Standard AppImage)";
                  else if (/x86_64_v3.*AppImage/i.test(a.name)) label = "Linux x86_64 v3 (Modern CPU AppImage)";
                  else if (/aarch64.*AppImage/i.test(a.name)) label = "Linux ARM64 (aarch64 AppImage)";
                  else if (/x86_64.*tar\.zst/i.test(a.name)) label = "Linux x86_64 (.tar.zst)";
                  else if (/aarch64.*tar\.zst/i.test(a.name)) label = "Linux ARM64 (.tar.zst)";
                  var sz = (a.size / 1048576).toFixed(1) + " MB";
                  assetsList.push({ name: a.name, label: label, sizeStr: sz, url: a.browser_download_url, size: a.size });
                });
              });
              if (assetsList.length) {
                box.hidden = false;
                var selectAsset = function (ast) {
                  labelEl.textContent = ast.label + " — " + ast.sizeStr;
                  var linuxBtn = $("dl-citron-linux");
                  if (linuxBtn) {
                    linuxBtn.href = ast.url;
                    linuxBtn.classList.remove("est-indispo");
                    var sm = linuxBtn.querySelector("small");
                    if (sm) sm.textContent = ast.sizeStr + ", " + ast.label;
                  }
                  Array.from(menu.children).forEach(function (li) {
                    li.classList.toggle("est-selectionne", li.dataset.url === ast.url);
                  });
                };
                // Default to standard x86_64 AppImage or first
                var def = assetsList.filter(function (x) { return /Standard AppImage/i.test(x.label); })[0] || assetsList[0];
                assetsList.forEach(function (ast) {
                  var li = document.createElement("li");
                  li.className = "nx-dropdown-item" + (ast === def ? " est-selectionne" : "");
                  li.tabIndex = 0;
                  li.dataset.url = ast.url;
                  li.innerHTML = "<span>" + ast.label + "</span><span class='taille'>" + ast.sizeStr + "</span>";
                  li.addEventListener("click", function () {
                    selectAsset(ast);
                    menu.hidden = true;
                    if (wrap) wrap.removeAttribute("data-open");
                    trig.setAttribute("aria-expanded", "false");
                    majPlaque(false);
                  });
                  li.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      li.click();
                    }
                  });
                  menu.appendChild(li);
                });
                selectAsset(def);
                trig.onclick = function (e) {
                  e.stopPropagation();
                  var ouv = menu.hidden;
                  menu.hidden = !ouv;
                  if (wrap) wrap.setAttribute("data-open", ouv ? "true" : "false");
                  trig.setAttribute("aria-expanded", ouv ? "true" : "false");
                  majPlaque(ouv);
                };
                document.addEventListener("click", function (e) {
                  if (wrap && !wrap.contains(e.target)) {
                    menu.hidden = true;
                    wrap.removeAttribute("data-open");
                    trig.setAttribute("aria-expanded", "false");
                    majPlaque(false);
                  }
                });
              }
            }
          }

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

// Shared by every page: one navigation bar, one footer, and the motion that goes with them.
// Motion borrowed from Maison Olena: the navigation "island" that grows from a pill, the sliding
// underline under links, the thin progress bar between pages, the slowly breathing ambient glow,
// and numbers that count up. Everything is skipped when the visitor prefers reduced motion.

(function () {
  "use strict";

  var calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Default profile picture: the server's own default avatar (profile_images/10151.jpg: diagonal
  // gradient, head and shoulders in veiled white), with the hue taken from the PID. Same
  // measurements and same hue computation as the Nextendo App (Silhouette.kt, and iOS), so a
  // player without a photo has the same avatar on the site and in the app.
  window.nxSilhouette = function (pid) {
    pid = Number(pid) || 0;
    var decalage = pid ? ((Math.imul(pid >>> 0, 2654435761 | 0) >>> 0) % 360) / 360 : 0;
    var couleur = function (h, s, v) {
      var d = (((h + decalage) % 1) * 360) / 60, i = Math.floor(d) % 6, f = d - Math.floor(d);
      var p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
      var rgb = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i];
      return "rgb(" + rgb.map(function (x) { return Math.round(x * 255); }).join(",") + ")";
    };
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + couleur(0.213, 0.60, 0.80) + '"/>' +
      '<stop offset="1" stop-color="' + couleur(0.290, 0.72, 0.55) + '"/></linearGradient></defs>' +
      '<rect width="256" height="256" fill="url(#g)"/>' +
      '<circle cx="127.5" cy="101.5" r="46" fill="#fff" fill-opacity=".185"/>' +
      '<ellipse cx="127.5" cy="208" rx="66.5" ry="54" fill="#fff" fill-opacity=".185"/></svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  };
  var page = document.body.getAttribute("data-page") || "";

  var ICONES = {
    discord: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"/></svg>',
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.82-.26.82-.58l-.02-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03a10.7 10.7 0 0 1-4.2-.97c-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75a7.6 7.6 0 0 1-1.35 3.94 7.4 7.4 0 0 1-5.91 3.21 7.3 7.3 0 0 1-4.08-1.03 7.5 7.5 0 0 1-3.65-5.71c-.02-.5-.03-1-.01-1.49a7.5 7.5 0 0 1 2.58-4.96 7.3 7.3 0 0 1 6.15-1.72c.02 1.48-.04 2.96-.04 4.44a3.4 3.4 0 0 0-3.02.37 3.4 3.4 0 0 0-1.36 1.75c-.21.51-.15 1.07-.14 1.61a3.4 3.4 0 0 0 3.5 2.87 3.3 3.3 0 0 0 2.77-1.61c.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    wiki: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8 7.5h8M8 11h6"/></svg>',
    statut: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 12h4l3-8 4 16 3-8h4"/></svg>'
  };

  // Home page sections first, in their on-page order; the two separate pages come last.
  var LIENS = [
    { href: "index.html#jeux", texte: "Games", cle: "jeux" },
    { href: "index.html#progres", texte: "Progress", cle: "progres" },
    { href: "index.html#fonctionnement", texte: "How it works", cle: "fonctionnement" },
    { href: "index.html#equipe", texte: "Team", cle: "equipe" },
    { href: "status.html", texte: "Status", cle: "etat" },
    { href: "developers.html", texte: "Developers", cle: "dev" }
  ];

  // --- Navigation bar ----------------------------------------------------------------------

  // The island animation plays once per browser tab: sessionStorage belongs to the tab and is
  // cleared when the tab closes. A new tab (any page) animates; moving between pages in the same
  // tab doesn't.
  function ileDejaVue() {
    try {
      if (sessionStorage.getItem("nx-ile-vue") === "1") return true;
      sessionStorage.setItem("nx-ile-vue", "1");
    } catch (e) { /* storage blocked: animate, it's harmless */ }
    return false;
  }

  function barre() {
    var hote = document.getElementById("nx-barre");
    if (!hote) return;
    var posee = calme || ileDejaVue();
    // On the developer portal the bar becomes the portal's own: "Nextendo Developers", its three
    // links and the New application button, instead of the site links.
    var dev = page === "dev";
    var liensPage = dev ? [
      { href: "#/", texte: "Home", route: "accueil" },
      { href: "https://wiki.nextendo.network/developers", texte: "Documentation" },
      { href: "https://discord.gg/XPfeCMwnzQ", texte: "Community" }
    ] : LIENS;
    var liens = liensPage.map(function (l) {
      return '<a class="nav-lien" href="' + l.href + '"' + (l.route ? ' data-route="' + l.route + '"' : "") + ">" + l.texte + "</a>";
    }).join("");
    hote.outerHTML =
      '<header class="barre' + (posee ? " barre--posee" : "") + '" id="barre">' +
        (dev
          ? '<a class="marque" href="#/" aria-label="Nextendo Developers home"><img src="assets/img/nextendo.png" alt="" width="36" height="36"><span>Nextendo <em class="marque-dev">Developers</em></span></a>'
          : '<a class="marque" href="index.html" aria-label="Nextendo Network home"><img src="assets/img/nextendo.png" alt="" width="36" height="36"><span>Nextendo</span></a>') +
        '<nav class="menu" aria-label="Main navigation">' + liens + "</nav>" +
        '<div class="compte-groupe">' +
        (dev ? '<button type="button" class="bouton bouton--plein bouton-nav" data-nouvelle-appli>New application</button>' : "") +
        '<div class="compte" id="barre-compte">' +
          '<a class="lien-discret" href="compte.html">Sign in</a>' +
          '<a class="bouton bouton--plein" href="register.html">Create account</a>' +
        "</div></div>" +
        '<button type="button" class="burger" id="burger" aria-expanded="false" aria-controls="menu-mobile" aria-label="Open menu"><span></span><span></span></button>' +
      "</header>" +
      '<div class="menu-mobile" id="menu-mobile" hidden>' +
        liensPage.map(function (l, i) { return '<a href="' + l.href + '" style="--i:' + i + '">' + l.texte + "</a>"; }).join("") +
        '<a href="compte.html" style="--i:' + LIENS.length + '">My account</a>' +
      "</div>";

    // Signed in: the session is the live site's own (localStorage "nx_token", set by the sign-in
    // page), checked against /api/me. Same bar on every page, with the player's pill instead of
    // the sign-in buttons. Everything from the server goes in as text, never as HTML: the name
    // is chosen by the player.
    var jeton = "";
    try { jeton = localStorage.getItem("nx_token") || ""; } catch (e) {}
    if (jeton) {
      fetch("/api/me", { headers: { Authorization: "Bearer " + jeton, "X-Nextendo-Client-Id": "nxc_hvGUwjpszrDT" }, cache: "no-store" })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) {
          var moi = d && d.account;
          if (!moi || !moi.pid) return;
          var nom = moi.name || moi.username || "";
          var lien = document.createElement("a");
          lien.className = "moi-mini" + (page === "compte" ? " est-actif" : "");
          lien.href = "compte.html";
          lien.setAttribute("aria-label", window.nxF ? window.nxF("My account, {0}", nom) : "My account, " + nom);
          var avt = "";
          try { avt = localStorage.getItem("nx_avt") || ""; } catch (e) {}
          var avtDefaut = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' width='34' height='34'><circle cx='64' cy='64' r='64' fill='%232b2b3a'/><circle cx='64' cy='48' r='24' fill='%23ffffff' opacity='0.75'/><path d='M24 108 c0 -22 18 -40 40 -40 s40 18 40 40 Z' fill='%23ffffff' opacity='0.75'/></svg>";
          var img = document.createElement("img");
          img.onerror = function () { img.onerror = null; img.src = avtDefaut; };
          img.src = "/api/avatar?pid=" + encodeURIComponent(moi.pid) + (avt ? "&t=" + avt : "");
          img.alt = ""; img.width = 34; img.height = 34;
          var span = document.createElement("span");
          span.textContent = nom;
          lien.append(img, span);
          var c = document.getElementById("barre-compte");
          c.textContent = "";
          c.appendChild(lien);
        })
        .catch(function () {});
    }

    var ile = document.getElementById("barre");
    ile.addEventListener("animationend", function (e) { if (e.target === ile) ile.classList.add("barre--ouverte"); });
    var burger = document.getElementById("burger");
    var mm = document.getElementById("menu-mobile");
    // The menu grows out of the button (clip-path circle centred on it) and shrinks back into it;
    // it is only hidden once the closing animation is over.
    var finFermeture = null;
    function menu(ouvrir) {
      burger.setAttribute("aria-expanded", ouvrir ? "true" : "false");
      burger.setAttribute("aria-label", ouvrir ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-ouvert", ouvrir);
      clearTimeout(finFermeture);
      if (ouvrir) {
        var r = burger.getBoundingClientRect();
        mm.style.setProperty("--ox", (r.left + r.width / 2) + "px");
        mm.style.setProperty("--oy", (r.top + r.height / 2) + "px");
        mm.hidden = false;
        void mm.offsetWidth; // start from the closed circle, or the browser skips the transition
        mm.classList.add("menu-mobile--ouvert");
      } else {
        mm.classList.remove("menu-mobile--ouvert");
        finFermeture = setTimeout(function () { mm.hidden = true; }, calme ? 0 : 560);
      }
    }
    burger.addEventListener("click", function () { menu(burger.getAttribute("aria-expanded") !== "true"); });
    mm.addEventListener("click", function (e) { if (e.target.tagName === "A") menu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") { menu(false); burger.focus(); }
    });

    // The underline follows the section on screen (home) or marks nothing (other pages).
    if (page === "accueil" && "IntersectionObserver" in window) {
      var parCle = {};
      document.querySelectorAll(".nav-lien").forEach(function (a) {
        var id = (a.getAttribute("href").split("#")[1] || "");
        if (id) parCle[id] = a;
      });
      var io = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) {
          if (e.isIntersecting && parCle[e.target.id]) {
            Object.keys(parCle).forEach(function (k) { parCle[k].classList.toggle("est-actif", k === e.target.id); });
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      Object.keys(parCle).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  // --- Footer ------------------------------------------------------------------------------

  function pied() {
    var hote = document.getElementById("nx-pied");
    if (!hote) return;
    var icone = function (href, nom, cle) {
      return '<a class="icone-reseau" href="' + href + '" aria-label="Nextendo on ' + nom + '" title="' + nom + '">' + ICONES[cle] + "</a>";
    };
    var colonne = function (titre, liens) {
      return "<div><h3>" + titre + "</h3><ul>" + liens.map(function (l) { return '<li><a href="' + l[0] + '">' + l[1] + "</a></li>"; }).join("") + "</ul></div>";
    };
    hote.outerHTML =
      '<footer class="pied verre-liquide" id="pied">' +
        '<div class="pied-haut">' +
          '<div class="pied-marque">' +
            '<a class="pied-logo" href="index.html" aria-label="Nextendo Network home"><img src="assets/img/nextendo.png" alt="" width="30" height="30"><span>Nextendo Network</span></a>' +
            "<p>Nextendo Network brings Switch online play back: accounts, friends, presence and matchmaking, on Ryujinx, Citron or a Switch with CFW.</p>" +
          "</div>" +
          '<nav class="pied-liens" aria-label="Site links">' +
            colonne("Project", [["telecharger.html", "Download"], ["index.html#fonctionnement", "How it works"], ["index.html#plateformes", "Where to find Nextendo"], ["developers.html", "Developers"]]) +
            colonne("Help", [["https://wiki.nextendo.network", "NexWiki"], ["status.html", "Network status"], ["index.html#faq", "Frequently asked questions"], ["https://discord.gg/XPfeCMwnzQ", "Community"]]) +
            colonne("Account", [["register.html", "Create account"], ["compte.html", "My account"], ["sessions.html", "My sessions"]]) +
          "</nav>" +
        "</div>" +
        '<div class="pied-bas">' +
          '<div class="pied-mentions">' +
            '<p class="pied-copy">\u00a9 ' + new Date().getFullYear() + " Nextendo Network</p>" +
            '<p class="pied-legal">Independent community project, not affiliated with Nintendo Co., Ltd. \u201cNintendo Switch\u201d, \u201cRyujinx\u201d, \u201cCitron\u201d and \u201cPrelude\u201d belong to their respective owners. No games or ROMs are provided.</p>' +
          "</div>" +
          '<div class="pied-suivre"><span>Follow Nextendo</span><div class="icones-reseaux">' +
            icone("https://discord.gg/XPfeCMwnzQ", "Discord", "discord") +
            icone("https://x.com/NextendoNetwork", "X", "x") +
            icone("https://www.tiktok.com/@nextendonetwork", "TikTok", "tiktok") +
            icone("https://github.com/NextendoNetwork", "GitHub", "github") +
          "</div></div>" +
        "</div>" +
      "</footer>";
    // The panel rises into place the first time it comes into view.
    var p = document.getElementById("pied");
    if (calme || !("IntersectionObserver" in window)) { p.classList.add("pied--vu"); return; }
    var io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { p.classList.add("pied--vu"); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(p);
  }

  // --- Ambient glow and page progress ------------------------------------------------------

  function ambiance() {
    var a = document.createElement("div");
    a.className = "ambiance";
    a.setAttribute("aria-hidden", "true");
    a.innerHTML = "<i></i><i></i>";
    document.body.prepend(a);

    var barre = document.createElement("div");
    barre.className = "progres";
    barre.setAttribute("aria-hidden", "true");
    document.body.appendChild(barre);
    var finir = function () {
      requestAnimationFrame(function () { barre.classList.add("progres--fin"); });
      setTimeout(function () { barre.classList.add("progres--cache"); }, 700);
    };
    if (!calme) {
      // A page that loads its data after the HTML (data-attente="donnees", e.g. the account)
      // holds the bar at 72 % until the data is on screen, so the bar never ends before the
      // page does. 15 s at most, whatever happens.
      if (document.body.getAttribute("data-attente") === "donnees") {
        barre.className = "progres progres--part";
        var fait = false;
        var une = function () { if (fait) return; fait = true; barre.className = "progres"; finir(); };
        document.addEventListener("nx-donnees-pretes", une, { once: true });
        setTimeout(une, 15000);
      } else {
        finir();
      }
    }
    // Leaving for another page of the site: the bar starts filling before the page changes.
    var filet;
    var cacher = function () { clearTimeout(filet); barre.className = "progres progres--fin progres--cache"; };
    document.addEventListener("click", function (e) {
      var a2 = e.target.closest && e.target.closest("a[href]");
      if (!a2 || calme || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a2.target === "_blank" || a2.hasAttribute("download")) return;
      var cible;
      try { cible = new URL(a2.getAttribute("href"), location.href); } catch (x) { return; }
      // Another site, or the same page with only a different #section: no page load follows.
      var ici = new URL(location.href);
      var chemin = function (u) { return u.pathname.replace(/\/index\.html$/, "/"); };
      if (cible.origin !== ici.origin || (chemin(cible) === chemin(ici) && cible.search === ici.search)) return;
      barre.className = "progres progres--part";
      // Safety net: if the page doesn't change (download, blocked navigation), let go.
      filet = setTimeout(cacher, 4000);
    });
    // Coming back with the Back button restores the page from cache, bar included: reset it.
    window.addEventListener("pageshow", function (e) { if (e.persisted) cacher(); });
  }

  // --- Press feedback: a ripple from the exact point that was pressed ----------------------

  function pression() {
    document.addEventListener("pointerdown", function (e) {
      var b = e.target.closest && e.target.closest(".bouton, .pastille-lien, .filtres button, .pages button, .code-bouton");
      if (!b || calme) return;
      var r = b.getBoundingClientRect();
      var o = document.createElement("span");
      o.className = "onde";
      var taille = Math.max(r.width, r.height) * 2.2;
      o.style.width = o.style.height = taille + "px";
      o.style.left = (e.clientX - r.left - taille / 2) + "px";
      o.style.top = (e.clientY - r.top - taille / 2) + "px";
      b.appendChild(o);
      setTimeout(function () { o.remove(); }, 650);
    });
  }

  // --- Numbers that count up (used by the pages for live figures) -------------------------

  window.nxCompter = function (el, cible, suffixe) {
    suffixe = suffixe || "";
    var nf = new Intl.NumberFormat((window.nxLangue || "en"));
    if (calme || !isFinite(cible)) { el.textContent = nf.format(cible) + suffixe; return; }
    var depart = parseInt(String(el.dataset.valeur || "0"), 10) || 0;
    var t0 = performance.now(), duree = 900;
    el.dataset.valeur = String(cible);
    (function pas(t) {
      var k = Math.min(1, (t - t0) / duree);
      var ease = 1 - Math.pow(1 - k, 3);
      el.textContent = nf.format(Math.round(depart + (cible - depart) * ease)) + suffixe;
      if (k < 1) requestAnimationFrame(pas);
    })(t0);
  };

  barre();
  pied();
  ambiance();
  pression();
})();

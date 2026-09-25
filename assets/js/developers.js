// Nextendo Developers portal, rework. LIVE data: /api/developers/applications
// (list, create, detail, save, delete), collaborators, bot/secret reset,
// user search and invitation accept, all with the player's session.
// GATE: the landing page is public, but the space and applications need sign-in.

(function () {
  "use strict";
  var calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tf = function () { return window.nxF ? window.nxF.apply(null, arguments) : [].slice.call(arguments, 1).reduce(function (s, v, i) { return s.replace("{" + i + "}", v); }, arguments[0]); };

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, texte) { var e = document.createElement(tag); if (cls) e.className = cls; if (texte != null) e.textContent = texte; return e; }
  function toast(t) { var x = $("toast"); x.textContent = t; x.classList.add("visible"); clearTimeout(toast.m); toast.m = setTimeout(function () { x.classList.remove("visible"); }, 2600); }
  function erreur(m) { return (m && m.message) || "Something went wrong. Try again."; }
  function copier(texte, quoi) { if (navigator.clipboard) navigator.clipboard.writeText(texte); toast(quoi ? tf("{0} copied to the clipboard", window.nxT ? window.nxT(quoi) : quoi) : tf("Copied to the clipboard")); }
  function echapper(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // --- Live storage: the account server owns the applications ------------------------------

  var applis = [];
  // Some logos are stored as bare base64 (no "data:" prefix): the browser cannot show that as an
  // image. Recognise the format from its first bytes and add the prefix.
  function logoUrl(v) {
    v = String(v || "").trim();
    var type = /^\/9j\//.test(v) ? "jpeg" : /^iVBOR/.test(v) ? "png" : /^R0lGOD/.test(v) ? "gif" : /^UklGR/.test(v) ? "webp" : "";
    if (type) return "data:image/" + type + ";base64," + v;
    return /^(data:image\/|https?:\/\/|\/)/.test(v) ? v : "";
  }
  function norme(a) {
    var rp = a.rich_presence || {};
    return {
      id: a.client_id, nom: a.name || "Application", desc: a.description || "",
      publique: !!(a.is_public != null ? a.is_public : a.public),
      secret: "", icone: logoUrl(a.logo_b64 || a.logo_url || a.logo),
      cgu: a.terms_url || "", confidentialite: a.privacy_url || "",
      redirections: (a.redirect_uris || []).slice(),
      permissions: (a.scopes || []).slice(),
      botPerms: a.bot_permissions || [],
      bot: { nom: (a.name || "Application") + " Bot", jeton: "", prefixe: a.bot_token_prefix || "" },
      rp: { jeu: rp.app_id || rp.game || "0100152000022000", details: rp.details || "", statut: rp.status || "playing", chrono: rp.timer !== false },
      membres: [], cree: a.created_at || ""
    };
  }
  function charge() {
    return NX.api("/api/developers/applications", null, "GET").then(function (d) {
      applis = (d.applications || []).map(norme);
      return applis;
    });
  }
  function chargeAppli(id) {
    return NX.api("/api/developers/applications/" + encodeURIComponent(id), null, "GET").then(function (d) {
      var a = norme(d.application || d);
      var i = applis.findIndex(function (x) { return x.id === a.id; });
      if (i >= 0) applis[i] = a; else applis.unshift(a);
      return a;
    });
  }
  function trouver(id) { return applis.filter(function (a) { return a.id === id; })[0]; }

  var moi = { pseudo: "Developer", pid: 0 };
  function espaceExigeSession() {
    if (!window.NX || !NX.token) { location.replace("login.html?next=" + encodeURIComponent("developers.html#/espace")); return false; }
    return true;
  }

  // --- Scopes and API permissions (same lists as the live portal) --------------------------

  var SCOPES = ["identity", "friends", "presence", "profil", "saves", "history", "stats:read", "splatoon:read", "modstore:read", "catalog:read", "game.matchmaking", "mods.favorites", "rpc"];
  var PERMISSIONS = [
    ["stats:read", "Network statistics"], ["splatoon:read", "Splatoon rotations and sessions"], ["modstore:read", "Public ModStore catalog"],
    ["catalog:read", "Supported official titles"], ["identity", "Player profile (username, friend code, avatar)"], ["friends", "Friend list and presence"],
    ["presence", "Live activity and game status"], ["saves:read", "Player cloud saves"], ["game.matchmaking", "Matchmaking and game lobbies"],
    ["mods.favorites", "Player's ModStore favorites"], ["admin:*", "Administrator console", true], ["auth:internal", "Internal authentication", true],
    ["user:credentials", "Audit logs and diagnostics", true]
  ];
  var ONGLETS = [
    ["general", "General information"], ["install", "Installation", "NEW"], ["oauth", "General & redirects"], ["urlgen", "URL generator"],
    ["bot", "Bot & API keys", "NEW"], ["rp", "Rich Presence"], ["testeurs", "Application testers"], ["danger", "Danger zone"]
  ];

  // --- Router ------------------------------------------------------------------------------

  // In an application, the space menu slides out to the left and the application's settings
  // take its place; leaving the application brings the space menu back.
  // Opening or leaving an application swaps the sidebar menu AND the page together: both slide
  // out, both change in the same frame, both slide in. A click during the slide cancels the
  // pending swap, so the menu can never lag behind the page.
  var bascule = null;
  function montrer(vue, sousVue) {
    var espace = $("menu-espace"), appli = $("menu-appli"), contenu = document.querySelector(".espace-contenu");
    var dansAppli = sousVue === "appli";
    var entrant = dansAppli ? appli : espace, sortant = dansAppli ? espace : appli;
    var animer = !calme && vue === "espace" && !$("vue-espace").hidden && entrant.hidden && !sortant.hidden;
    var appliquer = function () {
      bascule = null;
      [espace, appli, contenu].forEach(function (x) { x.classList.remove("sort-gauche", "entre-droite"); });
      sortant.hidden = true;
      entrant.hidden = false;
      document.querySelectorAll(".vue").forEach(function (v) { v.hidden = v.id !== "vue-" + vue; });
      document.querySelectorAll(".sous-vue").forEach(function (v) { v.hidden = v.id !== "sv-" + sousVue; });
      document.querySelectorAll("[data-route]").forEach(function (a) {
        a.classList.toggle("est-actif", a.dataset.route === vue || a.dataset.route === sousVue);
      });
      if (animer) [entrant, contenu].forEach(function (x) { void x.offsetWidth; x.classList.add("entre-droite"); });
    };
    if (bascule) { clearTimeout(bascule); bascule = null; }
    if (!animer) { appliquer(); return; }
    sortant.classList.add("sort-gauche");
    contenu.classList.add("sort-gauche");
    bascule = setTimeout(appliquer, 220);
  }
  var ongletCourant = null, brouillon = null;
  function route() {
    var parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
    if (!parts[0]) { montrer("accueil"); return; }
    if (!espaceExigeSession()) return;
    if (parts[0] === "espace") {
      charge().then(function () {
        montrer("espace", "espace");
        dessinerCartes($("recentes"), applis.slice(0, 3), true);
      }).catch(function (e) {
        montrer("espace", "espace");
        $("recentes").innerHTML = "";
        $("recentes").appendChild(el("div", "vide-bloc vide-applis", "Could not load your space: " + erreur(e)));
      });
      return;
    }
    if (parts[0] === "applis" && !parts[1]) {
      charge().then(function () { montrer("espace", "applis"); dessinerListe(); }).catch(function (e) {
        montrer("espace", "applis");
        $("applis").innerHTML = "";
        $("applis").appendChild(el("div", "vide-bloc vide-applis", "Could not load your applications: " + erreur(e)));
      });
      return;
    }
    if (parts[0] === "applis") {
      chargeAppli(parts[1]).then(function (a) {
        montrer("espace", "appli");
        ouvrirAppli(a, parts[2] || "general");
      }).catch(function () { location.hash = "#/applis"; });
      return;
    }
    montrer("accueil");
  }

  // --- Landing features --------------------------------------------------------------------

  var ICO = {
    social: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="9.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6M15 14.3c2.6-.2 4.4 1.2 5.2 3.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    rp: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    oauth: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
  };
  $("atouts").innerHTML = [
    ["social", "Social SDK and friends", "Read the player's friend list and who is online, with their consent."],
    ["cloud", "Cloud saves", "Back up and restore saves on the player's Nextendo quota."],
    ["rp", "Rich Presence and lobbies", "Show what the player is doing and let friends join the game."],
    ["oauth", "OAuth 2.0 and PKCE", "Standard sign-in. Players type their password on nextendo.network, never in your app."]
  ].map(function (x) { return '<article class="atout"><span class="atout-ico">' + ICO[x[0]] + "</span><h3>" + x[1] + "</h3><p>" + x[2] + "</p></article>"; }).join("");

  // --- Application cards -------------------------------------------------------------------

  function icone(a, taille) {
    var s = el("span", "appli-ico");
    if (taille) { s.style.width = s.style.height = taille + "px"; }
    var lettre = function () { s.textContent = a.nom.charAt(0).toUpperCase(); };
    if (a.icone) {
      var im = el("img"); im.alt = "";
      im.addEventListener("error", lettre);   // an unreadable logo shows the initial, not a broken image
      im.src = a.icone; s.appendChild(im);
    } else lettre();
    return s;
  }
  function dessinerCartes(hote, liste, recentes) {
    hote.innerHTML = "";
    if (!liste.length) {
      var v = el("div", "vide-bloc vide-applis");
      v.innerHTML = "<strong>No applications yet.</strong><span>Create one to get a client ID for OAuth sign-in.</span>";
      var b = el("button", "bouton bouton--plein petit-bouton", "New application"); b.type = "button"; b.addEventListener("click", nouvelle);
      v.appendChild(b);
      hote.appendChild(v);
      return;
    }
    liste.forEach(function (a) {
      var c = el("a", "carte-appli"); c.href = "#/applis/" + a.id + "/general";
      c.appendChild(icone(a, 64));
      var t = el("div"); t.append(el("strong", "", a.nom), el("small", "", a.publique ? "Public client, PKCE" : "Confidential client"));
      c.appendChild(t);
      hote.appendChild(c);
    });
  }
  function dessinerListe() {
    var q = $("applis-recherche").value.trim().toLowerCase();
    var liste = applis.filter(function (a) { return !q || a.nom.toLowerCase().indexOf(q) >= 0; });
    if ($("applis-tri").value === "nom") liste.sort(function (a, b) { return a.nom.localeCompare(b.nom, "en"); });
    $("applis-compte").textContent = applis.length;
    dessinerCartes($("applis"), liste, false);
  }
  $("applis-recherche").addEventListener("input", dessinerListe);
  $("applis-tri").addEventListener("change", dessinerListe);

  // --- New application ---------------------------------------------------------------------

  function nouvelle() {
    if (!espaceExigeSession()) return;
    $("form-nouvelle").reset(); $("n-compte").textContent = "0 / 400"; $("dlg-nouvelle").showModal(); $("n-nom").focus();
  }
  document.querySelectorAll("[data-nouvelle-appli]").forEach(function (b) { b.addEventListener("click", nouvelle); });
  $("n-desc").addEventListener("input", function () { $("n-compte").textContent = $("n-desc").value.length + " / 400"; });
  $("form-nouvelle").addEventListener("submit", function (e) {
    e.preventDefault();
    var nom = $("n-nom").value.trim();
    if (!nom) return;
    var btn = $("form-nouvelle").querySelector('button[type="submit"]');
    btn.disabled = true;
    NX.api("/api/developers/applications", {
      name: nom, description: $("n-desc").value.trim(),
      public: $("n-publique").checked,
      redirect_uris: ["http://127.0.0.1:47823/callback"],
      scopes: ["identity", "friends"]
    }).then(function (d) {
      var a = norme(d.application || d);
      applis.unshift(a);
      $("dlg-nouvelle").close();
      toast(tf("{0} created", nom));
      location.hash = "#/applis/" + a.id + "/general";
    }).catch(function (err) { toast(erreur(err)); }).then(function () { btn.disabled = false; });
  });

  // --- Application detail: tabs ------------------------------------------------------------

  function ouvrirAppli(a, onglet) {
    $("ap-titre").textContent = a.nom;
    var tete = $("menu-appli-tete");
    tete.innerHTML = "";
    tete.appendChild(icone(a, 40));
    var nt = el("div"); nt.append(el("strong", "", a.nom), el("small", "petit", a.publique ? "Public client" : "Confidential client"));
    tete.appendChild(nt);
    var nav = $("onglets-v");
    nav.innerHTML = "";
    ONGLETS.forEach(function (o) {
      var l = el("a", o[0] === "danger" ? "onglet-v onglet-v--danger" : "onglet-v");
      l.href = "#/applis/" + a.id + "/" + o[0];
      l.textContent = o[1];
      if (o[2]) l.appendChild(el("span", "nouveau", o[2]));
      if (o[0] === onglet) l.setAttribute("aria-current", "page");
      nav.appendChild(l);
    });
    ongletCourant = onglet;
    brouillon = JSON.parse(JSON.stringify(a));
    $("barre-sauver").hidden = true;
    var p = $("panneaux");
    p.innerHTML = "";
    p.classList.remove("entre"); void p.offsetWidth; p.classList.add("entre");
    (PANNEAUX[onglet] || PANNEAUX.general)(p, a);
  }
  // Any field edit shows the save bar; Save writes the draft, Reset reverts it.
  function modifie() { $("barre-sauver").hidden = false; }
  $("annuler-modifs").addEventListener("click", function () {
    chargeAppli(brouillon.id).then(function (a) { ouvrirAppli(a, ongletCourant); toast("Changes reverted"); }).catch(function (e) { toast(erreur(e)); });
  });
  $("sauver-modifs").addEventListener("click", function () {
    var btn = $("sauver-modifs");
    btn.disabled = true;
    var payload = {
      name: brouillon.nom, description: brouillon.desc, public: brouillon.publique,
      scopes: brouillon.permissions, bot_permissions: brouillon.botPerms,
      redirect_uris: brouillon.redirections, logo_b64: brouillon.icone || "",
      terms_url: brouillon.cgu || "", privacy_url: brouillon.confidentialite || "",
      rich_presence: { app_id: brouillon.rp.jeu, details: brouillon.rp.details, status: brouillon.rp.statut, timer: brouillon.rp.chrono }
    };
    NX.api("/api/developers/applications/" + encodeURIComponent(brouillon.id), payload, "PUT").then(function (d) {
      var a = norme(d.application || d);
      var i = applis.findIndex(function (x) { return x.id === a.id; });
      if (i >= 0) applis[i] = a;
      $("barre-sauver").hidden = true;
      ouvrirAppli(a, ongletCourant);
      toast("Changes saved");
    }).catch(function (e) { toast(erreur(e)); }).then(function () { btn.disabled = false; });
  });

  function titre(p, t, sous) { p.appendChild(el("h2", "titre-plaque", t)); if (sous) p.appendChild(el("p", "petit intro-panneau", sous)); }
  // The client secret is never sent back by the server: only reset shows a new one, once.
  function panneauSecret(p) {
    var s = ligneCopie(p, "Client secret", "The secret is hidden. Reset to generate a new one.", "Client secret");
    var reinit = el("button", "bouton bouton--sortie petit-bouton", "Reset the secret"); reinit.type = "button";
    reinit.addEventListener("click", function () {
      if (!confirm("Reset the client secret? The old one stops working immediately.")) return;
      reinit.disabled = true;
      NX.api("/api/developers/applications/" + encodeURIComponent(brouillon.id) + "/reset-secret", {}, "POST").then(function (res) {
        brouillon.secret = res.client_secret || "";
        s.value = brouillon.secret;
        copier(brouillon.secret, "New secret");
        toast("New secret generated and copied");
      }).catch(function (e) { toast(erreur(e)); }).then(function () { reinit.disabled = false; });
    });
    p.appendChild(reinit);
  }
  function champ(p, libelle, valeur, auChangement, options) {
    options = options || {};
    var l = el("label", "champ"); l.appendChild(document.createTextNode(libelle));
    var i = el(options.multi ? "textarea" : "input");
    if (!options.multi) i.type = options.type || "text";
    i.value = valeur || "";
    if (options.placeholder) i.placeholder = options.placeholder;
    if (options.max) i.maxLength = options.max;
    if (options.lecture) i.readOnly = true;
    i.addEventListener("input", function () { auChangement(i.value); modifie(); });
    l.appendChild(i);
    if (options.aide) l.appendChild(el("small", "", options.aide));
    p.appendChild(l);
    return i;
  }
  function ligneCopie(p, libelle, valeur, quoi, extras) {
    var d = el("div", "champ"); d.appendChild(el("span", "", libelle));
    var r = el("div", "ligne-copie");
    var i = el("input"); i.readOnly = true; i.value = valeur; i.className = "mono";
    r.appendChild(i);
    var b = el("button", "bouton bouton--verre petit-bouton", "Copy"); b.type = "button";
    b.addEventListener("click", function () { copier(i.value, quoi); });
    r.appendChild(b);
    (extras || []).forEach(function (x) { r.appendChild(x); });
    d.appendChild(r);
    p.appendChild(d);
    return i;
  }

  function lienAutorisation(a, scopes, redirection) {
    var u = "https://nextendo.network/oauth/authorize?client_id=" + encodeURIComponent(a.id) +
      "&redirect_uri=" + encodeURIComponent(redirection || a.redirections[0] || "") + "&response_type=code&scope=" + encodeURIComponent((scopes || a.permissions).join(" "));
    if (a.publique) u += "&code_challenge=YOUR_CODE_CHALLENGE&code_challenge_method=S256";
    return u;
  }

  var PANNEAUX = {
    general: function (p, a) {
      titre(p, "General information", "The name and icon players see when they sign in with your application.");
      var tete = el("div", "icone-edit");
      var ic = icone(brouillon, 96); ic.id = "app-icon-preview-box"; tete.appendChild(ic);
      var boutons = el("div", "ligne-boutons");
      var up = el("label", "bouton bouton--verre petit-bouton", "Upload an icon"); up.style.cursor = "pointer";
      var f = el("input"); f.type = "file"; f.accept = "image/*"; f.hidden = true; up.appendChild(f);
      f.addEventListener("change", function () {
        var fi = f.files && f.files[0]; if (!fi) return;
        var lecteur = new FileReader();
        lecteur.onload = function () { brouillon.icone = lecteur.result; ic.replaceWith(ic = icone(brouillon, 96)); modifie(); };
        lecteur.readAsDataURL(fi);
      });
      var ret = el("button", "bouton bouton--sortie petit-bouton", "Remove the icon"); ret.type = "button";
      ret.addEventListener("click", function () { brouillon.icone = ""; ic.replaceWith(ic = icone(brouillon, 96)); modifie(); });
      boutons.append(up, ret); tete.appendChild(boutons);
      p.appendChild(tete);
      champ(p, "Name *", brouillon.nom, function (v) { brouillon.nom = v; }, { max: 40 });
      champ(p, "Description (maximum 400 characters)", brouillon.desc, function (v) { brouillon.desc = v; }, { multi: true, max: 400 });
      ligneCopie(p, "Application ID", a.id, "Application ID");
      if (!brouillon.publique) panneauSecret(p);
      var m = el("div", "champ"); m.appendChild(el("span", "", "Security model"));
      var lab = el("label", "modele");
      var cb = el("input"); cb.type = "checkbox"; cb.checked = brouillon.publique;
      cb.addEventListener("change", function () { brouillon.publique = cb.checked; modifie(); });
      var t = el("span"); t.append(el("strong", "", "Public application (desktop / mobile, PKCE)"), el("small", "", "For desktop emulators and mobile apps: no client secret to keep or leak. Turn off for a server that can keep a secret."));
      lab.append(cb, t); m.appendChild(lab); p.appendChild(m);
      champ(p, "Terms of service (URL)", brouillon.cgu, function (v) { brouillon.cgu = v; }, { type: "url", placeholder: "https://example.com/terms" });
      champ(p, "Privacy policy (URL)", brouillon.confidentialite, function (v) { brouillon.confidentialite = v; }, { type: "url", placeholder: "https://example.com/privacy" });
    },

    install: function (p, a) {
      titre(p, "Installation and authorization", "The link that starts the sign-in, and how to plug it into your application.");
      var regen = el("button", "bouton bouton--verre petit-bouton", "Regenerate"); regen.type = "button";
      var i = ligneCopie(p, "OAuth 2.0 authorization link", lienAutorisation(a), "Authorization link", [regen]);
      regen.addEventListener("click", function () { i.value = lienAutorisation(a); toast("Link regenerated from the current settings"); });
      var test = el("a", "bouton bouton--plein petit-bouton", "Test the authorization live");
      test.href = lienAutorisation(a).replace("YOUR_CODE_CHALLENGE", "preview"); test.target = "_blank"; test.rel = "noopener";
      p.appendChild(test);
      p.appendChild(el("h3", "sous-titre", "Integration guide for developers"));
      var etapes = el("ol", "etapes-cfw");
      [["Create a code verifier", "A random 43 to 128 character string, kept by your app. Its SHA-256, base64url-encoded, is the code challenge."],
       ["Open the authorization link", "In the system browser, with your code_challenge. The player signs in on nextendo.network."],
       ["Catch the redirect", "Nextendo redirects to your redirect URI with ?code=. On desktop, listen on 127.0.0.1 with any free port."],
       ["Exchange the code", "POST /oauth/token with the code and the code_verifier. You get an access token and a refresh token."]
      ].forEach(function (x) { var li = el("li"); var d = el("div"); d.append(el("strong", "", x[0]), el("div", "petit", x[1])); li.appendChild(d); etapes.appendChild(li); });
      p.appendChild(etapes);
      var code = el("pre", "code-bloc");
      code.textContent = "POST https://nextendo.network/oauth/token\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code\n&client_id=" + a.id + "\n&code=CODE_FROM_REDIRECT\n&redirect_uri=" + (a.redirections[0] || "") + "\n&code_verifier=YOUR_CODE_VERIFIER";
      p.appendChild(code);
    },

    oauth: function (p, a) {
      titre(p, "OAuth2 redirects and scopes");
      var info = el("div", "info-bloc");
      info.innerHTML = 'Nextendo only redirects to the addresses listed here. For desktop apps, <code>http://127.0.0.1:PORT/…</code> accepts any port. <a class="lien" href="https://wiki.nextendo.network/developers">Learn more about OAuth2</a>';
      p.appendChild(info);
      var liste = el("div", "redirections");
      var dessiner = function () {
        liste.innerHTML = "";
        brouillon.redirections.forEach(function (r, k) {
          var ligne = el("div", "ligne-copie");
          var i = el("input"); i.value = r; i.placeholder = "https://example.com/callback"; i.setAttribute("aria-label", "Redirect URI " + (k + 1));
          i.addEventListener("input", function () { brouillon.redirections[k] = i.value; modifie(); });
          var x = el("button", "bouton bouton--sortie petit-bouton", "Remove"); x.type = "button";
          x.addEventListener("click", function () { brouillon.redirections.splice(k, 1); dessiner(); modifie(); });
          ligne.append(i, x); liste.appendChild(ligne);
        });
      };
      dessiner();
      p.appendChild(liste);
      var ajouter = el("button", "bouton bouton--verre petit-bouton", "Add a redirect"); ajouter.type = "button";
      ajouter.addEventListener("click", function () { brouillon.redirections.push(""); dessiner(); modifie(); liste.lastChild.querySelector("input").focus(); });
      p.appendChild(ajouter);
      if (!brouillon.publique) {
        var s = el("button", "bouton bouton--sortie petit-bouton", "Reset the client secret"); s.type = "button";
        s.addEventListener("click", function () {
          if (!confirm("Reset the client secret? The old one stops working immediately.")) return;
          s.disabled = true;
          NX.api("/api/developers/applications/" + encodeURIComponent(brouillon.id) + "/reset-secret", {}, "POST").then(function (res) {
            toast("New secret generated and copied");
            if (res && res.client_secret) copier(res.client_secret, "New secret");
          }).catch(function (e) { toast(erreur(e)); }).then(function () { s.disabled = false; });
        });
        p.appendChild(el("hr", "sep-panneau")); p.appendChild(s);
      }
    },

    urlgen: function (p, a) {
      titre(p, "OAuth2 URL generator", "Tick the scopes your application needs, pick a redirect, and copy the link.");
      var choisis = a.permissions.filter(function (s) { return SCOPES.indexOf(s) >= 0; });
      var grille = el("div", "portees");
      var sortie;
      var maj = function () { sortie.value = lienAutorisation(a, choisis, sel.value); };
      SCOPES.forEach(function (s) {
        var l = el("label", "portee");
        var cb = el("input"); cb.type = "checkbox"; cb.value = s; cb.checked = choisis.indexOf(s) >= 0;
        cb.addEventListener("change", function () { if (cb.checked) choisis.push(s); else choisis.splice(choisis.indexOf(s), 1); maj(); });
        l.append(cb, el("strong", "mono", s)); grille.appendChild(l);
      });
      p.appendChild(grille);
      var ls = el("label", "champ"); ls.appendChild(document.createTextNode("Redirect"));
      var sel = el("select"); a.redirections.forEach(function (r) { var o = el("option", "", r); o.value = r; sel.appendChild(o); });
      sel.addEventListener("change", maj);
      ls.appendChild(sel); p.appendChild(ls);
      sortie = ligneCopie(p, "Generated URL", "", "URL");
      maj();
    },

    bot: function (p, a) {
      titre(p, "Bot & Nextendo API keys", "A bot token calls the Nextendo API as your application, without a player.");
      var tete = el("div", "icone-edit");
      var av = icone({ nom: brouillon.bot.nom, icone: brouillon.icone }, 72); av.id = "bot-avatar-preview"; tete.appendChild(av);
      var t = el("div"); t.append(el("strong", "", brouillon.bot.nom), el("div", "petit", tf("Bot user of {0}", a.nom)));
      tete.appendChild(t); p.appendChild(tete);
      var reset = el("button", "bouton bouton--sortie petit-bouton", "Reset the token"); reset.type = "button";
      var jet = ligneCopie(p, "Token", brouillon.bot.prefixe ? "Token ending in " + brouillon.bot.prefixe + ": reset to create a new one" : "No token yet: reset to create one", "Token", [reset]);
      reset.addEventListener("click", function () {
        reset.disabled = true;
        NX.api("/api/developers/applications/" + encodeURIComponent(brouillon.id) + "/reset-bot-token", {}, "POST").then(function (res) {
          brouillon.bot.jeton = (res && res.bot_token) || "";
          jet.value = brouillon.bot.jeton || "Token created but not returned. Reset again.";
          if (brouillon.bot.jeton) copier(brouillon.bot.jeton, "Bot token");
          toast("Shown once: copy it now");
        }).catch(function (e) { toast(erreur(e)); }).then(function () { reset.disabled = false; });
      });
      p.appendChild(el("h3", "sous-titre", "API permissions"));
      var liste = el("div", "permissions");
      PERMISSIONS.forEach(function (x) {
        var l = el("label", "portee" + (x[2] ? " est-verrouille" : ""));
        var cb = el("input"); cb.type = "checkbox"; cb.disabled = !!x[2]; cb.checked = brouillon.permissions.indexOf(x[0]) >= 0;
        cb.addEventListener("change", function () {
          var i = brouillon.permissions.indexOf(x[0]);
          if (cb.checked && i < 0) brouillon.permissions.push(x[0]); if (!cb.checked && i >= 0) brouillon.permissions.splice(i, 1);
          modifie();
        });
        var s = el("span"); s.append(el("strong", "", x[1]), el("small", "mono", x[0] + (x[2] ? ", Nextendo staff only" : "")));
        l.append(cb, s); liste.appendChild(l);
      });
      p.appendChild(liste);
      var doc = el("div", "info-bloc");
      doc.innerHTML = "<strong>Documentation and code samples</strong><br><span class=\"petit\">Send the token as <code>Authorization: Bot &lt;token&gt;</code>.</span> <a class=\"lien\" href=\"https://wiki.nextendo.network/developers\">Read the documentation</a>";
      p.appendChild(doc);
    },

    rp: function (p, a) {
      titre(p, "Rich Presence and game status", "What your players' friends see while they use your application. The preview updates as you type.");
      var grille = el("div", "rp-grille");
      var gauche = el("div", "rp-form");
      var JEUX = [["0100152000022000", "Mario Kart 8 Deluxe"], ["0100c2500fc20000", "Splatoon 3"], ["01006a800016e000", "Super Smash Bros. Ultimate"], ["01009b90006dc000", "Super Mario Maker 2"], ["01006f8002326000", "Animal Crossing: New Horizons"]];
      var ls = el("label", "champ"); ls.appendChild(document.createTextNode("Default title or game"));
      var sel = el("select"); JEUX.forEach(function (j) { var o = el("option", "", j[1]); o.value = j[0]; if (j[0] === brouillon.rp.jeu) o.selected = true; sel.appendChild(o); });
      ls.appendChild(sel); gauche.appendChild(ls);
      var det = champ(gauche, "Activity details / mode", brouillon.rp.details, function (v) { brouillon.rp.details = v; apercu(); }, { max: 64 });
      var lst = el("label", "champ"); lst.appendChild(document.createTextNode("Simulated connection status"));
      var st = el("select"); [["playing", "Playing"], ["online", "Online"], ["away", "Away"]].forEach(function (x) { var o = el("option", "", x[1]); o.value = x[0]; if (x[0] === brouillon.rp.statut) o.selected = true; st.appendChild(o); });
      lst.appendChild(st); gauche.appendChild(lst);
      var lc = el("label", "bascule"); var cc = el("input"); cc.type = "checkbox"; cc.checked = brouillon.rp.chrono;
      lc.append(el("span", "", "Show the elapsed time in the activity"), cc); gauche.appendChild(lc);
      var enr = el("button", "bouton bouton--plein", "Save Rich Presence"); enr.type = "button";
      enr.addEventListener("click", function () { $("sauver-modifs").click(); });
      gauche.appendChild(enr);

      var carte = el("div", "rp-carte");
      carte.innerHTML = '<div class="rp-tete"><span class="rp-point" id="rp-preview-status-dot"></span><span id="rp-preview-status-text"></span></div>' +
        '<div class="rp-corps"><img id="rp-preview-icon" alt=""><div><strong id="rp-preview-title"></strong><div class="petit" id="rp-preview-details"></div><div class="rp-chrono" id="rp-preview-timer"></div></div></div>' +
        '<span class="rp-badge" id="rp-preview-badge">via ' + echapper(a.nom) + '</span><button type="button" class="bouton bouton--plein petit-bouton rp-rejoindre">Join the game</button>';
      grille.append(gauche, carte);
      p.appendChild(grille);
      var debut = Date.now();
      var apercu = function () {
        var jeu = JEUX.filter(function (j) { return j[0] === sel.value; })[0];
        $("rp-preview-icon").src = "/api/game-icon/" + sel.value + ".jpg";
        $("rp-preview-title").textContent = jeu[1];
        $("rp-preview-details").textContent = det.value || "No details";
        var libelles = { playing: "Playing", online: "Online", away: "Away" };
        $("rp-preview-status-text").textContent = libelles[st.value];
        carte.dataset.statut = st.value;
        $("rp-preview-timer").hidden = !cc.checked;
      };
      sel.addEventListener("change", function () { brouillon.rp.jeu = sel.value; modifie(); apercu(); });
      st.addEventListener("change", function () { brouillon.rp.statut = st.value; modifie(); apercu(); });
      cc.addEventListener("change", function () { brouillon.rp.chrono = cc.checked; modifie(); apercu(); });
      var chrono = setInterval(function () {
        var t = $("rp-preview-timer"); if (!t) { clearInterval(chrono); return; }
        var s = Math.floor((Date.now() - debut) / 1000);
        t.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0") + " elapsed";
      }, 1000);
      apercu();
      p.appendChild(el("h3", "sous-titre", "Rich Presence API integration guide"));
      var curl = "curl -X POST https://nextendo.network/api/presence \\\n  -H \"Authorization: Bearer PLAYER_ACCESS_TOKEN\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"status\":2,\"app_id\":\"" + brouillon.rp.jeu + "\",\"app_detail\":\"" + (brouillon.rp.details || "") + "\"}'";
      var pre = el("pre", "code-bloc"); pre.textContent = curl; p.appendChild(pre);
      var cp = el("button", "bouton bouton--verre petit-bouton", "Copy cURL"); cp.type = "button";
      cp.addEventListener("click", function () { copier(pre.textContent, "cURL command"); });
      p.appendChild(cp);
    },

    testeurs: function (p, a) {
      titre(p, "Testers and collaborators", "Members can sign in with the application before it's public, and edit it depending on their role.");
      var ajout = el("div", "champ"); ajout.id = "collab-add-section";
      ajout.appendChild(el("span", "", "Invite a member (by Nextendo username)"));
      var ligne = el("div", "ligne-copie");
      var i = el("input"); i.placeholder = "Username"; i.setAttribute("aria-label", "Nextendo username");
      var inv = el("button", "bouton bouton--plein petit-bouton", "Invite"); inv.type = "button";
      ligne.append(i, inv); ajout.appendChild(ligne); p.appendChild(ajout);
      var entete = el("div", "entete-plaque"); entete.style.marginTop = "18px";
      var compte = el("span", "petit");
      entete.append(el("h3", "sous-titre", "Application members"), compte); p.appendChild(entete);
      var ul = el("ul", "membres");
      var dessiner = function (membres) {
        ul.innerHTML = "";
        compte.textContent = membres.length + (membres.length > 1 ? " members" : " member");
        membres.forEach(function (m) {
          var li = el("li", "membre-appli");
          var ph = el("img"); ph.alt = "";
          ph.onerror = function () { ph.onerror = null; ph.src = window.nxSilhouette(m.pid); };
          ph.src = m.pid ? "/api/avatar?pid=" + m.pid : window.nxSilhouette(0);
          var t = el("div"); t.append(el("strong", "", m.nom), el("small", "petit", m.role));
          li.append(ph, t);
          if (m.role !== "Owner") {
            var x = el("button", "bouton bouton--sortie petit-bouton", "Remove"); x.type = "button";
            x.addEventListener("click", function () {
              NX.api("/api/developers/applications/" + encodeURIComponent(a.id) + "/collaborators/" + encodeURIComponent(m.pid), null, "DELETE").then(function () {
                toast(m.nom + " removed");
                chargerMembres();
              }).catch(function (e) { toast(erreur(e)); });
            });
            li.appendChild(x);
          } else li.appendChild(el("span", "badge", "Owner"));
          ul.appendChild(li);
        });
      };
      var chargerMembres = function () {
        ul.innerHTML = "";
        ul.appendChild(el("li", "vide-bloc", "Loading members…"));
        NX.api("/api/developers/applications/" + encodeURIComponent(a.id) + "/collaborators", null, "GET").then(function (res) {
          var liste = (res.collaborators || []).map(function (m) {
            return { nom: m.username || m.name || ("PID " + m.pid), pid: m.pid, role: m.role || "Tester" };
          });
          if (res.owner_username || res.owner_pid) {
            var deja = liste.some(function (m) { return m.pid && m.pid === res.owner_pid; });
            if (!deja) liste.unshift({ nom: res.owner_username || "Owner", pid: res.owner_pid || 0, role: "Owner" });
          }
          brouillon.membres = liste;
          dessiner(liste);
        }).catch(function (e) {
          ul.innerHTML = "";
          ul.appendChild(el("li", "vide-bloc", "Could not load members: " + erreur(e)));
        });
      };
      inv.addEventListener("click", function () {
        var n = i.value.trim(); if (!n) return;
        inv.disabled = true;
        NX.api("/api/developers/applications/" + encodeURIComponent(a.id) + "/collaborators", { username: n, role: "Tester" }).then(function (res) {
          i.value = "";
          toast((res && res.message) || (n + " invited"));
          chargerMembres();
        }).catch(function (e) { toast(erreur(e)); }).then(function () { inv.disabled = false; });
      });
      chargerMembres();
      p.appendChild(ul);
    },

    danger: function (p, a) {
      titre(p, "Danger zone");
      var bloc = el("div", "danger-bloc");
      var t = el("div"); t.append(el("strong", "", "Delete the application"), el("p", "petit", "Removes the keys, the bot and the members. Players signed in with it are signed out."));
      var b = el("button", "bouton bouton--danger", "Delete the application"); b.type = "button";
      b.addEventListener("click", function () {
        $("suppr-nom").textContent = a.nom; $("suppr-saisie").value = ""; $("suppr-ok").disabled = true;
        $("dlg-suppr").showModal(); $("suppr-saisie").focus();
      });
      bloc.append(t, b); p.appendChild(bloc);
    }
  };

  $("suppr-saisie").addEventListener("input", function () { $("suppr-ok").disabled = $("suppr-saisie").value !== $("suppr-nom").textContent; });
  $("suppr-ok").addEventListener("click", function () {
    var nom = $("suppr-nom").textContent;
    var id = brouillon.id;
    var btn = $("suppr-ok");
    btn.disabled = true;
    NX.api("/api/developers/applications/" + encodeURIComponent(id), null, "DELETE").then(function () {
      applis = applis.filter(function (x) { return x.id !== id; });
      $("dlg-suppr").close();
      toast(tf("{0} deleted", nom));
      location.hash = "#/applis";
    }).catch(function (e) { toast(erreur(e)); }).then(function () { btn.disabled = false; });
  });

  // Invitation link from the e-mail (?invitation=<token>&app_id=<id>): confirm, then join the app.
  function invitation() {
    var q = new URLSearchParams(location.search), jeton = q.get("invitation"), appId = q.get("app_id");
    if (!jeton || !appId) return;
    var d = document.createElement("dialog");
    d.className = "dialogue";
    d.setAttribute("aria-labelledby", "t-invitation");
    d.innerHTML = '<div class="dialogue-corps"><h2 id="t-invitation"></h2><p></p>' +
      '<div class="ligne-fin"><button type="button" class="bouton bouton--verre" data-ferme></button><button type="button" class="bouton bouton--plein" id="invitation-ok"></button></div></div>';
    d.querySelector("h2").textContent = "Join this application?";
    d.querySelector("p").textContent = tf("You were invited to join the application {0} as a tester. Accept to sign in with it before it's public.", appId);
    d.querySelector("[data-ferme]").textContent = "Not now";
    d.querySelector("#invitation-ok").textContent = "Accept the invitation";
    document.body.appendChild(d);
    var nettoyer = function () { history.replaceState(null, "", location.pathname + location.hash); d.close(); };
    d.querySelector("[data-ferme]").addEventListener("click", nettoyer);
    // Live: POST /api/developers/invitations/accept?token=…&app_id=… with the player's session.
    d.querySelector("#invitation-ok").addEventListener("click", function () {
      var btn = d.querySelector("#invitation-ok");
      btn.disabled = true;
      NX.api("/api/developers/invitations/accept?token=" + encodeURIComponent(jeton) + "&app_id=" + encodeURIComponent(appId), {}).then(function (res) {
        nettoyer();
        toast((res && res.message) || "Invitation accepted");
        if (window.NX && NX.token) { charge().then(function () { location.hash = "#/applis"; }); }
        else location.hash = "#/applis";
      }).catch(function (e) { btn.disabled = false; toast(erreur(e)); });
    });
    d.showModal();
  }

  // Display name in the space (public landing stays anonymous).
  if (window.NX && NX.token) {
    NX.me().then(function (d) {
      var acc = (d && d.account) || {};
      moi = { pseudo: acc.username || acc.name || "Developer", pid: acc.pid || 0 };
      if ($("dev-nom")) $("dev-nom").textContent = moi.pseudo;
    }).catch(function () {});
  }

  window.addEventListener("hashchange", route);
  route();
  invitation();
})();

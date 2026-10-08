// Authorized applications (My account). LIVE data: /api/me/applications.
// What the player let into their account, with the means to take it back: remove access,
// block, report. Official Nextendo applications are listed for transparency only.

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("applis-autorisees") || !window.NX || !NX.token) return;
  var tf = function () { return window.nxF ? window.nxF.apply(null, arguments) : [].slice.call(arguments, 1).reduce(function (s, v, i) { return s.replace("{" + i + "}", v); }, arguments[0]); };
  var tr = function (s) { return window.nxT ? window.nxT(s) : s; };
  function el(tag, cls, texte) { var e = document.createElement(tag); if (cls) e.className = cls; if (texte != null) e.textContent = texte; return e; }
  function toast(t) { var x = $("toast"); if (!x) return; x.textContent = t; x.classList.add("visible"); clearTimeout(toast.m); toast.m = setTimeout(function () { x.classList.remove("visible"); }, 2600); }
  function erreur(e) { return (e && e.message) || tr("Something went wrong. Try again."); }

  var PORTEES = {
    identity: "Access your username, PID and friend code",
    friends: "See your friend list",
    presence: "Show and update your in-game status",
    profil: "See and edit your profile (name, avatar, country)",
    "game.matchmaking": "Join and organize multiplayer games for you",
    "mods.favorites": "See and manage your ModStore favorites",
    saves: "Access and sync your cloud saves",
    console: "Link a console to your account",
    compte: "Change your e-mail or delete your account",
    history: "See your game history",
    "splatoon:read": "See Splatoon map rotations and shops",
    "stats:read": "See Nextendo network statistics",
    "modstore:read": "Browse the public ModStore catalog",
    "catalog:read": "See the list of games supported by Nextendo",
    rpc: "Show your in-game activity on Discord Rich Presence",
    "emulator.status": "Sync your emulator status and version"
  };
  function logoUrl(v) {
    v = String(v || "").trim();
    var type = /^\/9j\//.test(v) ? "jpeg" : /^iVBOR/.test(v) ? "png" : /^R0lGOD/.test(v) ? "gif" : /^UklGR/.test(v) ? "webp" : "";
    if (type) return "data:image/" + type + ";base64," + v;
    return /^(data:image\/|https?:\/\/|\/)/.test(v) ? v : "";
  }
  function logo(a, taille) {
    var s = el("span", "appli-logo");
    s.style.width = s.style.height = taille + "px";
    var src = logoUrl(a.logo_b64);
    var lettre = function () { s.textContent = (a.name || "?").charAt(0).toUpperCase(); };
    if (src) { var im = el("img"); im.alt = ""; im.addEventListener("error", function () { im.remove(); lettre(); }); im.src = src; s.appendChild(im); } else lettre();
    return s;
  }
  var CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8 12.5 2.6 2.6L16.5 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var FLECHE = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M8 16 16 8M9 8h7v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var applis = [], bloquees = [];

  function confirmer(titre, texte, action) {
    var dlg = $("dlg-confirmer");
    if (!dlg || !dlg.showModal) return Promise.resolve(window.confirm(texte));
    $("dc-titre").textContent = titre;
    $("dc-texte").textContent = texte;
    $("dc-oui").textContent = action;
    $("dc-non").textContent = tr("Cancel");
    return new Promise(function (fin) {
      var fait = false;
      var rep = function (oui) { if (fait) return; fait = true; $("dc-oui").onclick = $("dc-non").onclick = null; dlg.close(); fin(oui); };
      $("dc-oui").onclick = function () { rep(true); };
      $("dc-non").onclick = function () { rep(false); };
      dlg.addEventListener("close", function () { rep(false); }, { once: true });
      dlg.showModal();
      $("dc-non").focus();
    });
  }

  function fermerMenus() { document.querySelectorAll(".appli-menu.ouvert").forEach(function (m) { m.classList.remove("ouvert"); m.previousSibling.setAttribute("aria-expanded", "false"); }); }
  document.addEventListener("click", function (e) { if (!e.target.closest(".appli-menu, .appli-plus")) fermerMenus(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermerMenus(); });

  function carte(a) {
    var li = el("li", "appli-autorisee");
    var tete = el("div", "appli-tete");
    tete.appendChild(logo(a, 48));
    var t = el("div", "appli-id");
    var nom = el("strong", "", a.name || a.client_id);
    t.appendChild(nom);
    if (a.official) t.appendChild(el("span", "puce-officielle", tr("Official")));
    if (a.authorized_at) t.appendChild(el("div", "petit", tf("Authorized on {0}", new Date(a.authorized_at).toLocaleDateString(document.documentElement.lang || undefined))));
    tete.appendChild(t);

    var plus = el("button", "appli-plus"); plus.type = "button";
    plus.setAttribute("aria-label", tr("More options")); plus.setAttribute("aria-haspopup", "true"); plus.setAttribute("aria-expanded", "false");
    plus.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>';
    var menu = el("div", "appli-menu"); menu.setAttribute("role", "menu");
    var item = function (texte, cls, fn) { var b = el("button", cls || "", texte); b.type = "button"; b.setAttribute("role", "menuitem"); b.addEventListener("click", function () { fermerMenus(); fn(); }); menu.appendChild(b); };
    if (!a.official) {
      item(tr("Block"), "danger", function () { bloquer(a); });
      item(tr("Report"), "danger", function () { signaler(a); });
    }
    item(tr("Copy the application ID"), "", function () { if (navigator.clipboard) navigator.clipboard.writeText(a.client_id); toast(tr("Application ID copied")); });
    plus.addEventListener("click", function (e) {
      e.stopPropagation();
      var ouvert = menu.classList.contains("ouvert");
      fermerMenus();
      if (!ouvert) { menu.classList.add("ouvert"); plus.setAttribute("aria-expanded", "true"); var p = menu.querySelector("button"); if (p) p.focus(); }
    });
    var coin = el("div", "appli-coin"); coin.append(plus, menu);
    tete.appendChild(coin);
    li.appendChild(tete);

    var corps = el("div", "appli-corps");
    if (a.description || a.terms_url || a.privacy_url || a.creator) {
      var d = el("div", "appli-bloc");
      d.appendChild(el("h3", "", tr("Description and policies")));
      if (a.description) d.appendChild(el("p", "", a.description));
      if (a.creator) {
        var cr = el("div", "appli-createur");
        var im = el("img"); im.alt = ""; im.onerror = function () { im.onerror = null; im.src = window.nxSilhouette ? window.nxSilhouette(a.creator.pid) : "assets/img/nextendo.png"; };
        im.src = "/api/avatar?pid=" + a.creator.pid;
        cr.append(el("span", "petit", tr("Created by")), im, el("strong", "", a.creator.name));
        d.appendChild(cr);
      }
      var liens = el("div", "appli-liens");
      [[a.terms_url, "Terms of service"], [a.privacy_url, "Privacy policy"]].forEach(function (x) {
        if (!x[0] || !/^https:\/\//.test(x[0])) return;
        var l = el("a", "lien"); l.href = x[0]; l.target = "_blank"; l.rel = "noopener noreferrer nofollow";
        l.append(document.createTextNode(tr(x[1]) + " ")); l.insertAdjacentHTML("beforeend", FLECHE);
        liens.appendChild(l);
      });
      if (liens.childNodes.length) d.appendChild(liens);
      corps.appendChild(d);
    }
    var p = el("div", "appli-bloc");
    p.appendChild(el("h3", "", tr("Permissions")));
    var ul = el("ul", "appli-permissions");
    (a.scopes || []).forEach(function (s) {
      var x = el("li"); x.insertAdjacentHTML("beforeend", CHECK);
      x.appendChild(el("span", "", PORTEES[s] ? tr(PORTEES[s]) : s));
      ul.appendChild(x);
    });
    if (!ul.childNodes.length) ul.appendChild(el("li", "petit", tr("No permission")));
    p.appendChild(ul);
    corps.appendChild(p);

    var pied = el("div", "appli-pied");
    if (a.official) {
      pied.appendChild(el("p", "petit", tr("Official Nextendo application. To sign out, use the application itself.")));
    } else {
      var retirer = el("button", "bouton bouton--sortie petit-bouton", tr("Remove authorization")); retirer.type = "button";
      retirer.addEventListener("click", function () {
        confirmer(tf("Remove {0}?", a.name), tr("The application loses access to your account right away. You can authorize it again later."), tr("Remove authorization")).then(function (oui) {
          if (!oui) return;
          retirer.disabled = true;
          NX.api("/api/me/applications/" + encodeURIComponent(a.client_id), null, "DELETE").then(function () {
            toast(tf("{0} no longer has access to your account", a.name)); charger();
          }).catch(function (e) { retirer.disabled = false; toast(erreur(e)); });
        });
      });
      pied.appendChild(retirer);
    }
    corps.appendChild(pied);
    li.appendChild(corps);
    return li;
  }

  function bloquer(a) {
    confirmer(tf("Block {0}?", a.name), tr("The application loses access to your account and can't ask for it again until you unblock it."), tr("Block")).then(function (oui) {
      if (!oui) return;
      NX.api("/api/me/applications/" + encodeURIComponent(a.client_id) + "/block", {}, "POST").then(function () {
        toast(tf("{0} is blocked", a.name)); charger();
      }).catch(function (e) { toast(erreur(e)); });
    });
  }

  function signaler(a) {
    var dlg = $("dlg-signaler-appli");
    $("sa-nom").textContent = a.name;
    $("sa-motif").value = "impersonation";
    $("sa-texte").value = "";
    $("form-signaler-appli").dataset.id = a.client_id;
    $("form-signaler-appli").dataset.nom = a.name;
    dlg.showModal();
  }
  $("form-signaler-appli").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = $("form-signaler-appli"), b = f.querySelector('button[type="submit"]');
    b.disabled = true;
    NX.api("/api/me/applications/" + encodeURIComponent(f.dataset.id) + "/report", { reason: $("sa-motif").value, comment: $("sa-texte").value.trim() }, "POST").then(function () {
      $("dlg-signaler-appli").close();
      toast(tr("Thanks, the Nextendo team will review this application."));
    }).catch(function (err) { toast(erreur(err)); }).then(function () { b.disabled = false; });
  });

  function dessiner() {
    var q = $("applis-recherche").value.trim().toLowerCase();
    var ul = $("applis-autorisees");
    ul.innerHTML = "";
    var liste = applis.filter(function (a) { return !q || (a.name || "").toLowerCase().indexOf(q) >= 0; });
    $("applis-compte").textContent = applis.length ? tf(applis.length > 1 ? "{0} applications" : "{0} application", applis.length) : "";
    $("applis-vide").hidden = applis.length > 0;
    liste.forEach(function (a) { ul.appendChild(carte(a)); });
    if (applis.length && !liste.length) ul.appendChild(el("li", "vide-bloc", tr("No application matches.")));
    var bl = $("applis-bloquees");
    bl.innerHTML = "";
    $("applis-bloquees-bloc").hidden = !bloquees.length;
    bloquees.forEach(function (a) {
      var li = el("li", "appli-bloquee");
      li.appendChild(logo(a, 32));
      li.appendChild(el("strong", "", a.name || a.client_id));
      var deb = el("button", "bouton bouton--verre petit-bouton", tr("Unblock")); deb.type = "button";
      deb.addEventListener("click", function () {
        NX.api("/api/me/applications/" + encodeURIComponent(a.client_id) + "/block", null, "DELETE").then(function () {
          toast(tf("{0} is unblocked", a.name || a.client_id)); charger();
        }).catch(function (e) { toast(erreur(e)); });
      });
      li.appendChild(deb);
      bl.appendChild(li);
    });
  }
  function charger() {
    return NX.api("/api/me/applications", null, "GET").then(function (d) {
      applis = d.applications || [];
      bloquees = d.blocked || [];
      dessiner();
    }).catch(function (e) {
      $("applis-autorisees").innerHTML = "";
      $("applis-autorisees").appendChild(el("li", "vide-bloc", tr("Could not load your applications.") + " " + erreur(e)));
    });
  }
  $("applis-recherche").addEventListener("input", dessiner);
  charger();
})();

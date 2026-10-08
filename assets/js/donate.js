// Donation page. The donation itself happens on Stripe; this page only tells Stripe which
// Nextendo account is giving (client_reference_id = the account's PID), so the server can add
// the Donor badge when Stripe confirms the payment. Everything from the server goes in as
// text, never as HTML.
(function () {
  "use strict";
  var DON = "https://donate.stripe.com/aFabJ00GbdOY0oAaU96oo00";
  var t = function (s) { var v = arguments; return window.nxF ? window.nxF.apply(null, v) : s.replace(/\{(\d)\}/g, function (m, i) { return v[+i + 1] == null ? "" : v[+i + 1]; }); };
  var etat = document.getElementById("don-etat");
  var boutons = document.getElementById("don-boutons");
  var merci = document.getElementById("don-merci");
  if (!etat || !boutons) return;

  // Back from Stripe after a payment (the payment link redirects to donate.html?merci=1).
  var revenu = /[?&]merci=1/.test(location.search);
  if (revenu && merci) merci.hidden = false;

  // Monthly goal bar: what was given this month against the goal, both from the server.
  fetch("/api/donations/goal", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (g) {
      var bloc = document.getElementById("don-objectif");
      var barre = document.getElementById("don-barre");
      var plein = document.getElementById("don-barre-plein");
      var texte = document.getElementById("don-objectif-texte");
      if (!bloc || !barre || !plein || !texte || !(g.goal_cents > 0)) return;
      var pct = Math.round((g.month_cents || 0) * 100 / g.goal_cents);
      var euros = function (c) {
        var n = c / 100;
        try {
          return new Intl.NumberFormat(document.documentElement.lang || "en", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
        } catch (e) { return n + " EUR"; }
      };
      barre.setAttribute("aria-valuenow", String(Math.min(100, pct)));
      // Past the goal the bar is the whole month: the red part is the goal, the green part
      // what came on top of it (150% -> two thirds red, one third green).
      var rouge = pct > 100 ? 10000 / pct : pct;
      var vert = pct > 100 ? 100 : 0;
      var plus = document.createElement("i");
      barre.insertBefore(plus, plein);
      texte.textContent = t("{0} of {1}/month, {2}% of the monthly goal.", euros(g.month_cents || 0), euros(g.goal_cents), pct);
      var intro = document.getElementById("don-objectif-intro");
      if (intro && pct >= 100) intro.textContent = t("Goal reached, thank you! Everything on top goes toward more powerful servers and more storage.");
      bloc.hidden = false;
      // Fill from the left once the block is on screen (two frames, so the empty bar is
      // painted first and the width change is animated).
      var remplir = function () { plein.style.width = rouge + "%"; plus.style.width = vert + "%"; };
      if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(remplir); });
      else remplir();
    })
    .catch(function () {});

  var jeton = "";
  try { jeton = localStorage.getItem("nx_token") || ""; } catch (e) {}
  if (!jeton) return; // signed out: the page already says to sign in

  fetch("/api/me", { headers: { Authorization: "Bearer " + jeton, "X-Nextendo-Client-Id": "nxc_hvGUwjpszrDT" }, cache: "no-store" })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) {
      var moi = d && d.account;
      if (!moi || !moi.pid) return;
      var nom = moi.name || moi.username || "";
      var dejaDonateur = (moi.badges || []).indexOf("donor") !== -1;
      etat.textContent = dejaDonateur
        ? t("You already have the Donor badge. Thank you for your support!")
        : t("Signed in as {0}. The badge will go to this account.", nom);
      if (dejaDonateur && merci && revenu) {
        var mt = document.getElementById("don-merci-texte");
        if (mt) mt.textContent = t("You already have the Donor badge. Thank you for your support!");
      }
      // The donor's profile picture, so they see which account gets the badge.
      var ph = document.getElementById("don-photo");
      if (ph) {
        var avt = "";
        try { avt = localStorage.getItem("nx_avt") || ""; } catch (e) {}
        ph.onerror = function () {
          ph.onerror = null;
          if (window.nxSilhouette) ph.src = window.nxSilhouette(moi.pid); else ph.hidden = true;
        };
        ph.src = "/api/avatar?pid=" + encodeURIComponent(String(moi.pid)) + (avt ? "&t=" + avt : "");
        ph.hidden = false;
      }
      var a = document.createElement("a");
      a.className = "bouton bouton--plein";
      a.href = DON + "?client_reference_id=" + encodeURIComponent(String(moi.pid));
      a.textContent = t("Donate");
      boutons.textContent = "";
      boutons.appendChild(a);
    })
    .catch(function () {});
})();

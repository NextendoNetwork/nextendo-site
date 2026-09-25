// Motion borrowed from React Bits (reactbits.dev), rewritten in plain JavaScript for this site:
//   Blur Text       section titles clear word by word, from a blur, when they scroll into view
//   Spotlight Card  a soft light follows the pointer across cards
//   Tilted Card     team photos tilt towards the pointer
//   Logo Loop       the supported games scroll by in an endless band (home)
//   Star Border     two lights run along the border of the main call-to-action buttons (CSS)
//   Swipe Toast     notifications can be swiped away
// Everything is skipped when the visitor prefers reduced motion.

(function () {
  "use strict";

  var calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fin = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // --- Blur Text ---------------------------------------------------------------------------

  // Runs once the page is in its final language: the words are split into spans, so the
  // translation must already be in place (and the split title is then left alone by i18n.js).
  function titresFlous() {
    var titres = document.querySelectorAll("main .entete h2, main h2.entete, main .titre-plaque, main .bandeau p");
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("flou-vu");
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    titres.forEach(function (t) {
      if (t.dataset.flou || t.children.length) return; // only plain text titles
      var mots = t.textContent.trim().split(/\s+/);
      t.dataset.flou = "1";
      t.setAttribute("translate", "no");
      t.setAttribute("aria-label", t.textContent.trim());
      t.textContent = "";
      // One wrapper for all the words: a title laid out as flex (h2.entete) would otherwise
      // spread each word across the whole width.
      var ligne = document.createElement("span");
      ligne.className = "flou-ligne";
      ligne.setAttribute("aria-hidden", "true");
      mots.forEach(function (m, i) {
        var s = document.createElement("span");
        s.className = "flou-mot";
        s.style.setProperty("--i", i);
        s.textContent = m;
        ligne.appendChild(s);
        if (i < mots.length - 1) ligne.appendChild(document.createTextNode(" "));
      });
      t.appendChild(ligne);
      io.observe(t);
    });
  }

  // --- Spotlight Card ----------------------------------------------------------------------

  var CARTES = ".jaquette, .plateforme, .carte-appli, .quatre-etapes li, .membre-equipe, .carte, .etat-serveur";
  function projecteur() {
    if (!fin) return;
    document.addEventListener("pointermove", function (e) {
      var c = e.target.closest && e.target.closest(CARTES);
      if (!c) return;
      if (!c.querySelector(":scope > .projecteur")) {
        var p = document.createElement("span");
        p.className = "projecteur";
        p.setAttribute("aria-hidden", "true");
        c.appendChild(p);
        c.classList.add("a-projecteur");
      }
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  // --- Tilted Card -------------------------------------------------------------------------

  function inclinaison() {
    if (!fin) return;
    var courant = null;
    document.addEventListener("pointermove", function (e) {
      var photo = e.target.closest && e.target.closest(".membre-equipe");
      if (courant && courant !== photo) { courant.style.transform = ""; courant.classList.remove("incline"); courant = null; }
      if (!photo) return;
      courant = photo;
      var r = photo.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      photo.classList.add("incline");
      photo.style.transform = "perspective(700px) rotateX(" + (-y * 10).toFixed(2) + "deg) rotateY(" + (x * 12).toFixed(2) + "deg) scale(1.03)";
    }, { passive: true });
    document.addEventListener("pointerleave", function () { if (courant) { courant.style.transform = ""; courant.classList.remove("incline"); courant = null; } });
  }

  // --- Logo Loop ---------------------------------------------------------------------------

  // Any .defile with a .defile-piste is doubled so the CSS can slide it by exactly half its
  // width, which loops without a seam.
  function defilement() {
    document.querySelectorAll(".defile-piste").forEach(function (piste) {
      if (piste.dataset.double) return;
      piste.dataset.double = "1";
      Array.prototype.slice.call(piste.children).forEach(function (n) {
        var c = n.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.querySelectorAll("a").forEach(function (a) { a.tabIndex = -1; });
        piste.appendChild(c);
      });
    });
  }

  // --- Swipe Toast -------------------------------------------------------------------------

  function toastGlisse() {
    var depart = null, t = null;
    document.addEventListener("pointerdown", function (e) {
      t = e.target.closest && e.target.closest(".toast.visible");
      if (!t) return;
      depart = e.clientX;
      t.classList.add("glisse");
      t.setPointerCapture(e.pointerId);
    });
    document.addEventListener("pointermove", function (e) {
      if (!t || depart == null) return;
      var dx = e.clientX - depart;
      t.style.transform = "translate(calc(-50% + " + dx + "px), 0)";
      t.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 220));
    });
    document.addEventListener("pointerup", function (e) {
      if (!t || depart == null) return;
      var dx = e.clientX - depart;
      t.classList.remove("glisse");
      if (Math.abs(dx) > 70) t.classList.remove("visible");
      t.style.transform = ""; t.style.opacity = "";
      t = null; depart = null;
    });
  }

  // --- Start -------------------------------------------------------------------------------

  toastGlisse();
  if (calme) return;
  projecteur();
  inclinaison();
  var lancer = function () { titresFlous(); defilement(); };
  if (window.nxLanguePrete) lancer();
  else document.addEventListener("nx-langue-prete", lancer, { once: true });
})();

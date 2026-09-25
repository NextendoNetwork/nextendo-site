// Nextendo Network, rework de l'accueil : les chiffres en direct.
// Une seule source, /api/online-counts (la même que la page d'état et l'application). Sans réseau,
// la page garde ses repli fixes et le dit plutôt que d'afficher des zéros trompeurs.

(function () {
  "use strict";
  // Sentence with values, translated as a whole (see i18n.js).
  var tf = function () { return window.nxF ? window.nxF.apply(null, arguments) : [].slice.call(arguments, 1).reduce(function (s, v, i) { return s.replace("{" + i + "}", v); }, arguments[0]); };

  // Six jeux phares, affichés tels quels si l'API ne répond pas.
  var REPLI = [
    { nom: "Mario Kart 8 Deluxe", titres: ["0100152000022000"] },
    { nom: "Super Smash Bros. Ultimate", titres: ["01006a800016e000"] },
    { nom: "Splatoon 3", titres: ["0100c2500fc20000"] },
    { nom: "Splatoon 2", titres: ["0100f8f0000a2000"] },
    { nom: "Super Mario Maker 2", titres: ["01009b90006dc000"] },
    { nom: "Animal Crossing: New Horizons", titres: ["01006f8002326000"] }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var nf = new Intl.NumberFormat((window.nxLangue || "en"));

  function iconeDe(jeu) {
    var tid = (jeu.titres && jeu.titres[0]) || "";
    return "/api/game-icon/" + encodeURIComponent(tid) + ".jpg";
  }

  function jaquettes(jeux, enDirect) {
    var ul = $("jaquettes");
    ul.innerHTML = "";
    jeux.slice(0, 6).forEach(function (j) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "jaquette";
      a.href = "/status";
      var img = document.createElement("img");
      img.src = iconeDe(j);
      img.alt = "";
      img.loading = "lazy";
      img.onerror = function () { img.remove(); };
      var bloc = document.createElement("span");
      bloc.className = "jaquette-texte";
      var nom = document.createElement("span");
      nom.className = "jaquette-nom";
      nom.textContent = j.nom;
      bloc.appendChild(nom);
      if (enDirect) {
        var n = document.createElement("span");
        n.className = "jaquette-joueurs" + (j.joueurs > 0 ? "" : " jaquette-joueurs--calme");
        n.textContent = j.joueurs > 0
          ? nf.format(j.joueurs) + " online"
          : "Nobody right now";
        bloc.appendChild(n);
      }
      var cadre = document.createElement("span");
      cadre.className = "jaquette-image";
      cadre.appendChild(img);
      a.appendChild(cadre);
      a.appendChild(bloc);
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  function barres(jeux) {
    var ul = $("barres");
    ul.innerHTML = "";
    var actifs = jeux.filter(function (j) { return j.joueurs > 0; }).slice(0, 8);
    if (!actifs.length) {
      var vide = document.createElement("li");
      vide.textContent = "No matches running. Launch a game and be the first.";
      ul.appendChild(vide);
      return;
    }
    var max = actifs[0].joueurs;
    actifs.forEach(function (j) {
      var li = document.createElement("li");
      li.className = "barre-jeu";
      var nom = document.createElement("span");
      nom.className = "barre-jeu-nom";
      nom.textContent = j.nom;
      var piste = document.createElement("span");
      piste.className = "barre-jeu-piste";
      var i = document.createElement("i");
      i.style.width = Math.max(4, Math.round((j.joueurs / max) * 100)) + "%";
      piste.appendChild(i);
      var n = document.createElement("span");
      n.className = "barre-jeu-n";
      n.textContent = nf.format(j.joueurs);
      li.appendChild(nom);
      li.appendChild(piste);
      li.appendChild(n);
      ul.appendChild(li);
    });
  }

  // --- Progress: same figures as the live site's Progression section (pct = what works today) -

  var PROGRES = [
    { nom: "PAC-MAN 99", tid: "0100ad9012510000", pct: 100, detail: "Full 99-player matches" },
    { nom: "Super Mario Bros. 35", tid: "0100277011f1a000", pct: 100, detail: "Full 35-player matches" },
    { nom: "Luigi's Mansion 3", tid: "0100dca0064a6000", pct: 100, detail: "Fully online, friend lobbies included" },
    { nom: "ARMS", tid: "01009b500007c000", pct: 100, detail: "Fully online" },
    { nom: "Clubhouse Games: 51 Worldwide Classics", tid: "010047700d540000", pct: 100, detail: "Online matches, friend rooms and multiplayer" },
    { nom: "Monster Hunter Generations Ultimate", tid: "0100770008dd8000", pct: 100, detail: "Online hunts, lobbies and full multiplayer" },
    { nom: "METAL GEAR SOLID: Peace Walker", tid: "0100c6f01c4f8000", pct: 100, detail: "Co-op, Versus Ops fully done" },
    { nom: "Mario Party Superstars", tid: "01006fe013472000", pct: 100, detail: "Room ID & Matchmaking finalized" },
    { nom: "Overcooked! 2", tid: "01006fd0080b2000", pct: 100, detail: "Friend Lobbies by Search & Matchmaking" },
    { nom: "Crash Team Racing Nitro-Fueled", tid: "0100f9f00c696000", pct: 100, detail: "Pit Stop, Wumpa Challenges & Economy finished" },
    { nom: "Mario Tennis Aces", tid: "0100bde00862a000", pct: 95, detail: "Online matches, rooms and friends" },
    { nom: "Mario Kart 8 Deluxe", tid: "0100152000022000", pct: 91, detail: "Worldwide races, rooms and friends" },
    { nom: "Diablo III: Eternal Collection", tid: "01001b300b9be000", pct: 90, detail: "Quickmatch, Emulator friend lobbies" },
    { nom: "Splatoon 2", tid: "0100f8f0000a2000", pct: 87, detail: "8-player Turf War, friends and Salmon Run" },
    { nom: "Super Smash Bros. Ultimate", tid: "01006a800016e000", pct: 84, detail: "Online arenas and friends" },
    { nom: "Splatoon 3", tid: "0100c2500fc20000", pct: 78, detail: "Online battles, private rooms, Salmon Run and Splatfests" },
    { nom: "Super Mario Bros. Wonder", tid: "010015100b514000", pct: 75, detail: "Online play and friend rooms" },
    { nom: "Animal Crossing: New Horizons", tid: "01006f8002326000", pct: 73, detail: "Island visits with friends" },
    { nom: "Super Mario Maker 2", tid: "01009b90006dc000", pct: 70, detail: "Course World, uploads, world records and comments" },
    { nom: "Mario Strikers: Battle League", tid: "010019401051c000", pct: 56, detail: "Online matchmaking and clubs" },
    { nom: "Minecraft", tid: "0100d71004694000", pct: 51, detail: "Connecting to the online server" },
    { nom: "Super Mario Party Jamboree", tid: "0100965017338000", pct: 45, detail: "Solo online lobby works" }
  ];

  // The supported games scrolling under the project sentence (Logo Loop, see effets.js).
  function defileJeux() {
    var ul = $("defile-jeux");
    if (!ul) return;
    PROGRES.forEach(function (g) {
      var li = document.createElement("li");
      li.innerHTML = '<a href="#progres"><img src="/api/game-icon/' + g.tid + '.jpg" alt="" width="64" height="64" loading="lazy"></a>';
      li.querySelector("a").setAttribute("aria-label", g.nom);
      li.querySelector("img").title = g.nom;
      ul.appendChild(li);
    });
  }

  function progres() {
    var ul = $("progres-liste");
    if (!ul) return;
    var total = 0;
    PROGRES.forEach(function (g, i) {
      total += g.pct;
      var li = document.createElement("li");
      li.className = "progres-jeu" + (g.pct >= 100 ? " est-fini" : "");
      li.style.setProperty("--i", i);
      li.innerHTML =
        '<img src="/api/game-icon/' + g.tid + '.jpg" alt="" loading="lazy">' +
        '<div class="progres-texte"><div class="progres-ligne"><strong></strong><span class="progres-pct"></span></div>' +
        '<small></small><span class="piste"><i style="--pct:' + g.pct + '%"></i></span></div>';
      li.querySelector("strong").textContent = g.nom;
      li.querySelector("strong").title = g.nom;
      li.querySelector("small").textContent = g.detail;
      li.querySelector(".progres-pct").textContent = g.pct >= 100 ? "Done" : g.pct + "%";
      ul.appendChild(li);
    });
    var moyenne = Math.round(total / PROGRES.length);
    var anneau = $("anneau");
    anneau.setAttribute("aria-label", "Overall progress: " + moyenne + "%");
    // The bars and the ring fill once, when the section scrolls into view.
    var lancer = function () {
      document.getElementById("progres").classList.add("est-visible");
      anneau.style.setProperty("--pct", moyenne);
      if (window.nxCompter) window.nxCompter($("anneau-pct"), moyenne, "%"); else $("anneau-pct").textContent = moyenne + "%";
    };
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { lancer(); io.disconnect(); } }, { threshold: 0.25 });
      io.observe(document.getElementById("progres"));
    } else { lancer(); }
  }

  // --- The team: fixed pictures stored with the site (their Discord avatars), NOT synced with
  // their Nextendo profile, so they never change when someone edits their in-game picture. ------

  var EQUIPE = [
    { nom: "Kazuu", role: "Project owner", photo: "kazuu.webp", pays: "FR", chef: true },
    { nom: "Collecting", role: "Main Citron & Nextendo developer", photo: "collecting.webp" },
    { nom: "alye", role: "Developer & lead designer", photo: "alye.webp", pays: "NI" },
    { nom: "JuanBrew", role: "Main Prelude developer", photo: "juanbrew.webp", pays: "US" },
    { nom: "Zara", role: "Main Splatoon 3 developer", photo: "zara.webp" },
    { nom: "Mars", role: "Super cool guy & server tester", photo: "mars.webp", pays: "AR" },
    { nom: "Nobody", role: "Main Demonware developer", photo: "nothing.webp" }
  ];

  function equipe() {
    var ul = $("equipe-liste");
    if (!ul) return;
    EQUIPE.forEach(function (m) {
      var li = document.createElement("li");
      li.className = "membre-equipe" + (m.chef ? " membre-equipe--chef" : "");
      var photo = m.photo
        ? '<img class="equipe-photo" src="assets/img/equipe/' + m.photo + '" alt="">'
        : '<span class="equipe-photo equipe-initiale" aria-hidden="true"></span>';
      li.innerHTML = photo +
        '<div class="equipe-texte"><div class="equipe-nom"><strong></strong>' +
        (m.pays ? '<img class="equipe-drapeau" src="https://flagcdn.com/w40/' + m.pays.toLowerCase() + '.png" alt="" width="22" height="16">' : "") +
        "</div><span class=\"equipe-role\">" +
        (m.chef ? '<svg class="equipe-chef" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' : "") +
        "<span class=\"equipe-role-texte\"></span></span></div>";
      li.querySelector("strong").textContent = m.nom;
      li.querySelector(".equipe-role-texte").textContent = m.role;
      var ini = li.querySelector(".equipe-initiale");
      if (ini) ini.textContent = m.nom.charAt(0).toUpperCase();
      ul.appendChild(li);
    });
  }

  function charger() {
    fetch("/api/online-counts", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var jeux = (d.jeux || []).slice().sort(function (a, b) { return b.joueurs - a.joueurs; });
        var total = jeux.reduce(function (s, j) { return s + (j.joueurs || 0); }, 0);
        if (window.nxCompter) { window.nxCompter($("pouls-total"), total); window.nxCompter($("etat-total"), total); }
        else { $("pouls-total").textContent = nf.format(total); $("etat-total").textContent = nf.format(total); }
        // Les six jaquettes : les jeux les plus joués maintenant, complétés par les jeux phares.
        var vus = {};
        var six = [];
        jeux.concat(REPLI.map(function (r) { return { nom: r.nom, titres: r.titres, joueurs: 0 }; }))
          .forEach(function (j) { if (six.length < 6 && !vus[j.nom]) { vus[j.nom] = 1; six.push(j); } });
        jaquettes(six, true);
        barres(jeux);
        var h = new Date();
        $("etat-maj").textContent = tf("Updated at {0}", h.toLocaleTimeString((window.nxLangue || "en"), { hour: "2-digit", minute: "2-digit" }));
      })
      .catch(function () {
        $("pouls-total").textContent = "…";
        $("etat-total").textContent = "…";
        $("etat-maj").textContent = "Live numbers are unavailable right now.";
        jaquettes(REPLI, false);
        barres([]);
      });
  }

  progres();
  defileJeux();
  // --- FAQ: each answer morphs open and folds shut (the Maison Olena fold) -----------------

  function faq() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !Element.prototype.animate) return;
    var courbe = "cubic-bezier(0.25, 1, 0.5, 1)";
    document.querySelectorAll(".faq-q").forEach(function (d) {
      var s = d.querySelector("summary"), p = d.querySelector("p"), anim = null;
      s.addEventListener("click", function (e) {
        e.preventDefault();
        var depart = d.offsetHeight;
        var bords = d.offsetHeight - d.clientHeight;
        if (anim) anim.cancel();
        if (!d.open || d.classList.contains("se-ferme")) {
          d.classList.remove("se-ferme");
          d.open = true;
          var fin = d.offsetHeight;
          anim = d.animate({ height: [depart + "px", fin + "px"] }, { duration: 460, easing: courbe });
          p.animate({ opacity: [0, 1], transform: ["translateY(-6px)", "none"] }, { duration: 360, delay: 90, easing: courbe, fill: "backwards" });
        } else {
          d.classList.add("se-ferme");
          anim = d.animate({ height: [depart + "px", s.offsetHeight + bords + "px"] }, { duration: 380, easing: courbe });
          p.animate({ opacity: [1, 0] }, { duration: 180, fill: "forwards" });
        }
        anim.onfinish = function () {
          if (d.classList.contains("se-ferme")) { d.open = false; d.classList.remove("se-ferme"); }
          p.getAnimations().forEach(function (a) { a.cancel(); });
          anim = null;
        };
      });
    });
  }

  faq();
  equipe();
  jaquettes(REPLI, false);
  charger();
  setInterval(charger, 60000);
})();

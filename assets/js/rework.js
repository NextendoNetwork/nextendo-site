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
    if (tid === "0100a8e016236000") return "/assets/img/games/kirby.png";
    if (tid === "0100e65002bb8000") return "/assets/img/games/stardew.png";
    if (tid === "0100ab401f136000") return "/assets/img/games/ggst.jpg";
    return tid === "010028600ebda000" ? "/assets/img/games/sm3dw.jpg" : "/api/game-icon/" + encodeURIComponent(tid) + ".jpg";
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
    {"nom": "SpeedRunners 2: King of Speed", "tid": "01004cc023582000", "pct": 70, "detail": "Online races"},
    { nom: "Just Dance 2022", tid: "0100ea6014bb8000", pct: 90, detail: "Dance online in World Dance Floor" },
    { nom: "Kirby's Dream Buffet", tid: "0100a8e016236000", pct: 100, detail: "Online multiplayer, password matchmaking, Random Match and Free Rolling" },
    { nom: "Stardew Valley", tid: "0100e65002bb8000", pct: 100, detail: "Fully online: co-op farm hosting, joining and multiplayer" },
    { nom: "Zombie Army 4: Dead War", tid: "01000bf0152fa000", pct: 100, detail: "Online hosting and lobby joining available" },
    { nom: "PAC-MAN 99", tid: "0100ad9012510000", pct: 100, detail: "Full 99-player matches" },
    { nom: "Tetris 99", tid: "010040600c5ce000", pct: 100, detail: "Full 99-player matches" },
    { nom: "Just Shapes & Beats", tid: "0100830008426000", pct: 100, detail: "Public matchmaking and online multiplayer" },
    { nom: "Super Mario Bros. 35", tid: "0100277011f1a000", pct: 100, detail: "Full 35-player matches" },
    { nom: "Luigi's Mansion 3", tid: "0100dca0064a6000", pct: 100, detail: "Fully online, friend lobbies included" },
    { nom: "ARMS", tid: "01009b500007c000", pct: 100, detail: "Fully online" },
    { nom: "Clubhouse Games: 51 Worldwide Classics", tid: "010047700d540000", pct: 100, detail: "Online matches, friend rooms and multiplayer" },
    { nom: "Monster Hunter Generations Ultimate", tid: "0100770008dd8000", pct: 100, detail: "Online hunts, lobbies and full multiplayer" },
    { nom: "METAL GEAR SOLID: Peace Walker", tid: "0100c6f01c4f8000", pct: 100, detail: "Co-op, Versus Ops fully done" },
    { nom: "Monster Hunter Rise", tid: "0100b04011742000", pct: 100, detail: "Online lobbies and co-op quests" },
    { nom: "Mario Party Superstars", tid: "01006fe013472000", pct: 100, detail: "Room ID & Matchmaking finalized" },
    { nom: "Overcooked! 2", tid: "01006fd0080b2000", pct: 100, detail: "Friend Lobbies by Search & Matchmaking" },
    { nom: "Crash Team Racing Nitro-Fueled", tid: "0100f9f00c696000", pct: 100, detail: "Pit Stop, Wumpa Challenges & Economy finished" },
    { nom: "Super Mario 3D World + Bowser's Fury", tid: "010028600ebda000", pct: 90, detail: "Online co-op" },
    { nom: "Super Mario Odyssey", tid: "0100000000010000", pct: 100, detail: "Luigi's Balloon World: hide and find balloons online" },
    { nom: "Miitopia", tid: "01003da010e8a000", pct: 100, detail: "Share your Miis with an access code and download other players' Miis" },
    { nom: "Game Builder Garage", tid: "0100fa5010788000", pct: 100, detail: "Share and download games online" },
    { nom: "Saints Row: The Third - The Full Package", tid: "0100de600beee000", pct: 100, detail: "Online co-op campaign, matchmaking and Whored Mode" },
    { nom: "Guilty Gear -Strive-", tid: "0100ab401f136000", pct: 100, detail: "Fully online: park lobbies, Player Match rooms, Ranked matches, rankings and replays" },
    { nom: "Dying Light: Platinum Edition", tid: "01008c8012920000", pct: 90, detail: "Online co-op" },
    { nom: "qLaunch (Switch Menu)", tid: "0100000000001000", pct: 95, detail: "Friends, Presence, Network linking & NSO icons" },
    { nom: "Mario Tennis Aces", tid: "0100bde00862a000", pct: 95, detail: "Online matches, rooms and friends" },
    { nom: "Mario Strikers: Battle League", tid: "010019401051c000", pct: 95, detail: "Online matches, friend rooms and Strikers Club" },
    { nom: "Mario Golf: Super Rush", tid: "0100c9c00e25c000", pct: 80, detail: "Online play" },
    { nom: "Mario Kart 8 Deluxe", tid: "0100152000022000", pct: 100, detail: "Fully online: races, rooms, friends, tournaments and time trial ghosts" },
    { nom: "Diablo III: Eternal Collection", tid: "01001b300b9be000", pct: 90, detail: "Quickmatch, Emulator friend lobbies" },
    { nom: "Pokkén Tournament DX", tid: "0100b3f000be2000", pct: 90, detail: "Ranked and friendly battles" },
    { nom: "Dragon Ball FighterZ", tid: "0100a250097f0000", pct: 85, detail: "Online matchmaking and Ring Matches" },
    { nom: "Friday the 13th: The Game", tid: "010092a00c4b6000", pct: 90, detail: "Quick Play and private matches" },
    { nom: "Nintendo 64 - Nintendo Classics", tid: "0100c9a00ece6000", pct: 95, detail: "Online play and friend rooms" },
    { nom: "Splatoon 2", tid: "0100f8f0000a2000", pct: 87, detail: "8-player Turf War, friends and Salmon Run" },
    { nom: "Super Smash Bros. Ultimate", tid: "01006a800016e000", pct: 68, detail: "Arenas, Quick Play, Spectate and Shared Content" },
    { nom: "Pokémon Scarlet and Violet", tid: "0100a3d008c5c000", pct: 85, detail: "All online play except competitions & Multi-Battles" },
    { nom: "Pokémon Legends: Z-A", tid: "0100f43008c44000", pct: 85, detail: "Link Trades and private battles, but Ranked Battles are not tested yet" },
    { nom: "Pokémon Sword and Shield", tid: "0100abf008968000", pct: 100, detail: "Online trades, battles and raids" },
    { nom: "Super Monkey Ball Banana Mania", tid: "010001701248c000", pct: 100, detail: "Fully online: leaderboards, friend rankings and ghosts" },
    { nom: "Splatoon 3", tid: "0100c2500fc20000", pct: 78, detail: "Online battles, private rooms, Salmon Run and Splatfests" },
    { nom: "Super Mario Bros. Wonder", tid: "010015100b514000", pct: 75, detail: "Online play and friend rooms" },
    { nom: "Animal Crossing: New Horizons", tid: "01006f8002326000", pct: 100, detail: "Island visits and sharing designs online" },
    { nom: "Mario & Sonic at the Olympic Games Tokyo 2020", tid: "010086000e148000", pct: 100, detail: "Online matches and rankings" },
    { nom: "Among Us", tid: "0100b0c013912000", pct: 80, detail: "Online matches with room codes" },
    { nom: "Super Mario Maker 2", tid: "01009b90006dc000", pct: 70, detail: "Course World, uploads, world records and comments" },
    { nom: "UNO", tid: "0100b6e012ebe000", pct: 70, detail: "Online matches and public rooms" },
    { nom: "NES - Nintendo Classics", tid: "0100d870045b6000", pct: 95, detail: "Online play and friend rooms" },
    { nom: "SNES - Nintendo Classics", tid: "01008d300c50c000", pct: 95, detail: "Online play and friend rooms" },
    { nom: "Game Boy - Nintendo Classics", tid: "0100c62011050000", pct: 95, detail: "Online play and friend rooms" },
    { nom: "Game Boy Advance - Nintendo Classics", tid: "010012f017576000", pct: 95, detail: "Online play for up to four players" },
    { nom: "SEGA Genesis - Nintendo Classics", tid: "0100b3c014bda000", pct: 95, detail: "Online play and friend rooms" },
    { nom: "Minecraft Dungeons II", tid: "0100a7c01b792000", pct: 65, detail: "Sign-in, heroes, inventory and online parties" },
    { nom: "Ultimate Chicken Horse", tid: "0100fcf002a58000", pct: 90, detail: "Online play, friend rooms and custom levels" },
    { nom: "Crypt of the NecroDancer", tid: "0100cea007d08000", pct: null, detail: "Online rooms being tested" },
    { nom: "Minecraft: Nintendo Switch Edition", tid: "01006bd001e06000", pct: 51, detail: "Connecting to the online server" },
    { nom: "Portal 2", tid: "0100abd01785c000", pct: 100, detail: "Online co-op with friends and Challenge Mode leaderboards" },
    { nom: "Super Mario Party Jamboree", tid: "0100965017338000", pct: 100, detail: "All online modes, matchmaking and friend rooms" }
  ];

  // The supported games scrolling under the project sentence (Logo Loop, see effets.js).
  function defileJeux() {
    var ul = $("defile-jeux");
    if (!ul) return;
    PROGRES.forEach(function (g) {
      var li = document.createElement("li");
      li.innerHTML = '<a href="#progres"><img src="' + (g.tid === '01000bf0152fa000' ? '/assets/img/games/zombiearmy4.jpg' : iconeDe({titres:[g.tid]})) + '" alt="" width="64" height="64" loading="lazy"></a>';
      li.querySelector("a").setAttribute("aria-label", g.nom);
      li.querySelector("img").title = g.nom;
      ul.appendChild(li);
    });
  }

  function progres() {
    var ul = $("progres-liste");
    if (!ul) return;
    var total = 0, confirmedCount = 0;
    var hasPercentage = function (g) { return typeof g.pct === "number" && Number.isFinite(g.pct) && g.pct >= 0 && g.pct <= 100; };
    // Du plus complet au moins complet (tri stable : a egalite, l'ordre de la liste est garde).
    PROGRES.slice().sort(function (x, y) { return (hasPercentage(y) ? y.pct : -1) - (hasPercentage(x) ? x.pct : -1); }).forEach(function (g, i) {
      var confirmed = hasPercentage(g);
      if (confirmed) { total += g.pct; confirmedCount++; }
      var li = document.createElement("li");
      li.className = "progres-jeu" + (confirmed && g.pct >= 100 ? " est-fini" : "");
      li.style.setProperty("--i", i);
      li.innerHTML =
        '<img src="' + (g.tid === '01000bf0152fa000' ? '/assets/img/games/zombiearmy4.jpg' : iconeDe({titres:[g.tid]})) + '" alt="" loading="lazy">' +
        '<div class="progres-texte"><div class="progres-ligne"><strong></strong><span class="progres-pct"></span></div>' +
        '<small></small>' + (confirmed ? '<span class="piste"><i style="--pct:' + g.pct + '%"></i></span>' : '') + '</div>';
      li.querySelector("strong").textContent = g.nom;
      li.querySelector("strong").title = g.nom;
      li.querySelector("small").textContent = g.detail;
      li.querySelector(".progres-pct").textContent = confirmed ? (g.pct >= 100 ? "Done" : g.pct + "%") : "In validation";
      ul.appendChild(li);
    });
    var moyenne = confirmedCount ? Math.round(total / confirmedCount) : null;
    var anneau = $("anneau");
    anneau.setAttribute("aria-label", moyenne === null ? "Overall progress awaiting validation" : "Overall progress: " + moyenne + "%");
    $("anneau-pct").textContent = moyenne === null ? "—" : moyenne + "%";
    // The bars and the ring fill once, when the section scrolls into view.
    var lancer = function () {
      document.getElementById("progres").classList.add("est-visible");
      anneau.style.setProperty("--pct", moyenne === null ? 0 : moyenne);

    };
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { lancer(); io.disconnect(); } }, { threshold: 0.25 });
      io.observe(anneau);
    } else { lancer(); }
  }

  // --- The team: fixed pictures stored with the site (their Discord avatars), NOT synced with
  // their Nextendo profile, so they never change when someone edits their in-game picture. ------

  var EQUIPE = [
    { nom: "Kazuu", role: "Project owner", photo: "kazuu.webp", pays: "FR", chef: true },
    { nom: "Collecting", role: "Main Citron & Nextendo developer", photo: "collecting.webp" },
    { nom: "alye", role: "Developer & lead designer", photo: "alye.webp", pays: "NI" },
    { nom: "JuanBrew", role: "Main Prelude developer", photo: "juanbrew.webp", pays: "US", noir: true },
    { nom: "Zara", role: "Main Splatoon 3 developer", photo: "zara.webp" },
    { nom: "Soul", role: "Nextendo server developer", photo: "soul.webp" },
    { nom: "Mars", role: "Super cool guy & server tester", photo: "mars.webp", pays: "AR" },
    { nom: "Anakin_sky05", role: "Prelude Developer & Network Protocol Analyst", photoSrc: "https://cdn.discordapp.com/avatars/545680588921765889/afd98760b70f4bc44c61b1caab7718bb.webp?size=128" }
  ];

  // --- Discord server (admins, developers, contributors, moderators, then donors): a row of
  // pictures scrolling right to left under the team, without the people who already have a team
  // card. The list comes from the Discord bot (roles of members still on the server) through
  // /api/staff: Discord name, role and a copy of the current Discord picture, nothing else. ----

  var ROLES_STAFF = { admin: "Administrator", developer: "Developer", contributor: "Contributor", head_mod: "Head moderator", mod: "Moderator", donor: "Donor" };

  function staffBande() {
    var bande = $("staff-bande"), piste = $("staff-piste");
    if (!bande || !piste || !window.fetch) return;
    fetch("/api/staff", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var liste = ((d && d.staff) || []).filter(function (m) { return m && m.name; });
      if (!liste.length) return;
      var t = window.nxF || function (s) { return s; };
      var defaut = window.nxSilhouette ? window.nxSilhouette(0) : "";
      var carte = function (m, copie) {
        var li = document.createElement("li");
        li.className = "staff-membre" + (m.role === "donor" ? " staff-membre--don" : "");
        var role = t(ROLES_STAFF[m.role] || m.role);
        if (copie) li.setAttribute("aria-hidden", "true");
        else { li.tabIndex = 0; li.setAttribute("aria-label", m.name + ", " + role); }
        var img = document.createElement("img");
        img.alt = ""; img.width = 96; img.height = 96; img.decoding = "async";
        img.onerror = function () { img.onerror = null; if (defaut) img.src = defaut; };
        img.src = (m.photo && /^\/api\/staff\/photo\/[0-9a-f]+$/.test(m.photo)) ? m.photo : defaut;
        var nom = document.createElement("span");
        nom.className = "staff-nom";
        nom.innerHTML = "<strong></strong><span></span>";
        nom.querySelector("strong").textContent = m.name;
        nom.querySelector("span").textContent = role;
        li.appendChild(img); li.appendChild(nom);
        return li;
      };
      // The row is written twice: the animation slides it by exactly one copy, so the loop
      // never shows a seam. The second copy is hidden from screen readers.
      liste.forEach(function (m) { piste.appendChild(carte(m, false)); });
      liste.forEach(function (m) { piste.appendChild(carte(m, true)); });
      piste.style.setProperty("--staff-duree", Math.max(20, liste.length * 3) + "s");
      bande.hidden = false;
    }).catch(function () {});
  }

  function equipe() {
    var ul = $("equipe-liste");
    if (!ul) return;
    EQUIPE.forEach(function (m) {
      var li = document.createElement("li");
      li.className = "membre-equipe" + (m.chef ? " membre-equipe--chef" : "");
      var photo = m.photoSrc
        ? '<img class="equipe-photo" src="' + m.photoSrc + '" alt="">'
        : m.photo
        ? '<img class="equipe-photo" src="assets/img/equipe/' + m.photo + '" alt="">'
        : '<span class="equipe-photo equipe-initiale" aria-hidden="true"></span>';
      li.innerHTML = photo +
        '<div class="equipe-texte"><div class="equipe-nom"><strong></strong>' +
        (m.pays ? '<img class="equipe-drapeau" src="assets/img/drapeaux/' + m.pays.toLowerCase() + '.png" alt="" width="22" height="16">' : "") +
        "</div><span class=\"equipe-role\">" +
        (m.chef ? '<svg class="equipe-chef" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' : "") +
        "<span class=\"equipe-role-texte\"></span></span></div>";
      li.querySelector("strong").textContent = m.nom;
      if (m.noir) { var im = li.querySelector(".equipe-photo"); if (im) im.style.filter = "brightness(0)"; } // the whole picture in black
      li.querySelector(".equipe-role-texte").textContent = m.role;
      var ini = li.querySelector(".equipe-initiale");
      if (ini) ini.textContent = m.nom.charAt(0).toUpperCase();
      ul.appendChild(li);
    });
  }

  function charger() {
    window.nxOnlineCounts()
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
  staffBande();
  jaquettes(REPLI, false);
  charger();
  setInterval(charger, 60000);
})();

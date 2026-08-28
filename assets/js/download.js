/* [Nextendo] Page de téléchargement — pointe chaque carte sur le fichier de la dernière version
   publique, lu par l'API GitHub. Les dépôts sont publics : l'appel se fait sans jeton.

   TROIS SOURCES, ET ELLES NE SE RESSEMBLENT PAS :
     · Ryujinx  — une version étiquetée, tous les systèmes dans la même ;
     · Citron   — des builds de nuit, une étiquette PAR SYSTÈME (`nightly-windows`,
                  `nightly-linux`). « La dernière version » n'en rend donc qu'une : il faut lire
                  la LISTE et chercher le fichier dans toutes ;
     · l'app    — une version étiquetée, deux façons d'installer plutôt que deux systèmes.

   EN CAS D'ÉCHEC — quota d'appels dépassé, hors ligne — les cartes gardent le lien qu'elles ont
   dans le HTML, qui mène à la page des versions : un téléchargement reste à un clic. C'est
   pourquoi rien n'est construit ici, seulement remplacé.

   Les adresses de fichiers sont vérifiées contre le chemin du dépôt concerné avant d'être
   posées : ce qui vient du réseau ne devient pas un lien sans être regardé. */
(function () {
  "use strict";

  var SOURCES = [
    {
      cle: "ryu",
      repo: "NextendoNetwork/Ryujinx-Nextendo",
      mode: "latest",
      version: "dl-version",
      fallback: "dl-fallback",
      match: {
        // TIRET OU TIRET BAS. Les fichiers s'appellent « Nextendo-1.7.9-win-x64.zip » : les
        // motifs n'acceptaient que le tiret bas, si bien que Windows et Linux ne trouvaient
        // jamais leur fichier et retombaient en silence sur la page des versions. Le defaut ne
        // se voyait pas, macOS trouvant le sien : le repli ne s'affiche que si AUCUNE carte
        // n'aboutit.
        win: /win[-_]x64\.zip$/i,
        linux: /linux[-_]x64\.tar\.gz$/i,
        mac: /macos.*\.tar\.gz$/i
      }
    },
    {
      cle: "citron",
      repo: "NextendoNetwork/citron-nextendo",
      mode: "list",
      version: "dl-citron-version",
      nightly: true,
      match: {
        // Le `$` compte : le dossier contient aussi des `.AppImage.zsync` et une variante
        // `_v3` réservée aux processeurs récents, qu'on ne veut pas servir par défaut.
        win: /x64-clangcl\.zip$/i,
        linux: /linux-x86_64\.AppImage$/i
      }
    },
    {
      cle: "app",
      repo: "NextendoNetwork/Nextendo-App-Ios",
      mode: "latest",
      version: "dl-app-version",
      match: {
        deb: /\.deb$/i,
        // Ancré des deux côtés : sans cela, l'archive signée passerait pour l'archive nue.
        ipa: /^NextendoApp\.ipa$/i
      }
    }
  ];

  function t(key, fb) {
    var v = window.NXI18N && typeof window.NXI18N.t === "function" ? window.NXI18N.t(key) : null;
    return v || fb;
  }

  function fmtSize(bytes) {
    return bytes ? Math.round(bytes / 1048576) + " MB" : "";
  }

  var etats = [];

  // Dépend de la langue : rejoué à chaque changement.
  function appliquer() {
    for (var i = 0; i < etats.length; i++) {
      var e = etats[i];
      if (!e.el) { continue; }
      if (e.echec) {
        e.el.textContent = t("download.fallbackVersion", "Latest version on GitHub");
      } else if (e.libelle) {
        e.el.textContent = e.nightly
          ? t("download.nightly", "Nightly build") + " " + e.libelle
          : t("download.version", "Latest version") + " " + e.libelle;
      } else {
        e.el.textContent = t("download.loading", "Looking for the latest version…");
      }
    }
  }

  try {
    new MutationObserver(appliquer).observe(document.documentElement,
      { attributes: true, attributeFilter: ["lang"] });
  } catch (e) { /* MutationObserver absent */ }

  SOURCES.forEach(function (src) {
    var cartes = {};
    var liste = document.querySelectorAll('.dl-card[data-src="' + src.cle + '"]');
    for (var i = 0; i < liste.length; i++) {
      cartes[liste[i].getAttribute("data-platform")] = liste[i];
    }

    var etat = {
      el: document.getElementById(src.version),
      libelle: null,
      echec: false,
      nightly: !!src.nightly
    };
    etats.push(etat);

    if (!liste.length) { return; }

    var prefixe = "https://github.com/" + src.repo + "/releases/download/";
    function sur(url) { return typeof url === "string" && url.indexOf(prefixe) === 0; }

    var api = "https://api.github.com/repos/" + src.repo +
      (src.mode === "list" ? "/releases?per_page=10" : "/releases/latest");

    fetch(api, { headers: { "Accept": "application/vnd.github+json" }, cache: "no-store" })
      .then(function (r) { if (!r.ok) { throw new Error("http"); } return r.json(); })
      .then(function (rep) {
        // Une seule version, ou plusieurs : on ramène les deux cas à une liste de versions.
        var versions = src.mode === "list" ? (rep || []) : [rep];
        var trouve = false;

        Object.keys(cartes).forEach(function (plat) {
          var re = src.match[plat];
          if (!re) { return; }
          for (var v = 0; v < versions.length; v++) {
            var assets = (versions[v] && versions[v].assets) || [];
            for (var j = 0; j < assets.length; j++) {
              if (!re.test(String(assets[j].name || ""))) { continue; }
              if (!sur(assets[j].browser_download_url)) { continue; }
              var carte = cartes[plat];
              carte.setAttribute("href", assets[j].browser_download_url);
              carte.removeAttribute("target");
              carte.setAttribute("download", "");
              var t2 = carte.querySelector(".dl-card__size");
              if (t2) { t2.textContent = fmtSize(assets[j].size); }
              // L'étiquette : le numéro pour une version, la date pour une build de nuit —
              // « nightly-windows » ne dirait rien à personne.
              if (!etat.libelle) {
                etat.libelle = src.nightly
                  ? String(versions[v].published_at || "").slice(0, 10)
                  : String(versions[v].tag_name || "");
              }
              trouve = true;
              return;
            }
          }
        });

        if (!trouve) { etat.echec = true; }
        if (etat.echec && src.fallback) {
          var f = document.getElementById(src.fallback);
          if (f) { f.hidden = false; }
        }
        appliquer();
      })
      .catch(function () {
        etat.echec = true;
        if (src.fallback) {
          var f = document.getElementById(src.fallback);
          if (f) { f.hidden = false; }
        }
        appliquer();
      });
  });

  appliquer();
})();

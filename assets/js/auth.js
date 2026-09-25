// Sign in / create an account / forgot password: ONE page, three modes.
// Layout from ScanVerse (AuthShell + AuthHero): a WebGL aurora on the left with the heading
// typing itself in and numbered steps, the form on the right. Morph from Maison Olena
// (LoginCard): the same card changes mode, fields fold and unfold, the title fades up again.
// The URL follows the mode (login.html, register.html, forgot.html) without reloading.

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var MODES = {
    login: {
      url: "login.html", titre: "Sign in, Nextendo Network",
      heros: "Welcome back", sous: "Sign in to pick up your friends, your saves and your games where you left them.",
      etapes: ["Sign in", "Play online"], actif: 0,
      h: "Sign in", p: "Use the e-mail and password of your Nextendo account.",
      bouton: "Sign in", separateur: "New to Nextendo?", autre: "Create an account", lienHeros: ["register", "Not a member yet? Create your account"]
    },
    register: {
      url: "register.html", titre: "Create an account, Nextendo Network",
      heros: "Join Nextendo", sous: "Three quick steps and you're playing online with one identity for every game and device.",
      etapes: ["Create your account", "Link your emulator or console", "Play online"], actif: 0,
      h: "Create an account", p: "Free, no ads. Your username and friend code are yours for good.",
      bouton: "Create my account", separateur: "Already a member?", autre: "Sign in", lienHeros: ["login", "Already a member? Sign in"]
    },
    reset: {
      url: "forgot.html", titre: "Forgot password, Nextendo Network",
      heros: "It happens", sous: "Enter your e-mail and we'll send you a link to choose a new password.",
      etapes: ["Get the link", "Choose a new password", "Sign in again"], actif: 0,
      h: "Reset your password", p: "We'll e-mail you a reset link that works for one hour.",
      bouton: "Send the link", separateur: "Remembered it?", autre: "Back to sign in", lienHeros: ["login", "Back to sign in"]
    }
  };

  var carte = $("carte");
  var mode = document.body.getAttribute("data-mode") || "login";

  // --- The heading types itself in, character by character (ScanVerse SplitText) -----------

  function ecrire(el, texte) {
    if (window.nxT) texte = window.nxT(texte);
    el.textContent = "";
    el.setAttribute("aria-label", texte);
    texte.split(" ").forEach(function (mot, m) {
      var span = document.createElement("span");
      span.className = "mot";
      span.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(mot, function (ch, i) {
        var c = document.createElement("span");
        c.className = "lettre";
        c.textContent = ch;
        c.style.animationDelay = (calme ? 0 : (m * 5 + i) * 28) + "ms";
        span.appendChild(c);
      });
      el.appendChild(span);
      el.appendChild(document.createTextNode(" "));
    });
  }

  function heros(m) {
    var c = MODES[m];
    var bloc = $("heros-contenu");
    bloc.classList.remove("entre");
    void bloc.offsetWidth; // restart the entrance animation
    bloc.classList.add("entre");
    ecrire($("heros-titre"), c.heros);
    $("heros-sous").textContent = c.sous;
    var ul = $("heros-etapes");
    ul.innerHTML = "";
    c.etapes.forEach(function (t, i) {
      var li = document.createElement("li");
      li.className = "etape-puce" + (i === c.actif ? " est-active" : "");
      li.innerHTML = '<span class="etape-num">' + (i + 1) + "</span>";
      li.appendChild(document.createTextNode(t));
      ul.appendChild(li);
    });
  }

  // --- The morph: one card, three modes -----------------------------------------------------

  function changer(m, pousser) {
    if (!MODES[m]) m = "login";
    mode = m;
    var c = MODES[m];
    carte.classList.remove("mode-login", "mode-register", "mode-reset");
    carte.classList.add("mode-" + m);
    ["carte-h", "carte-p"].forEach(function (id) {
      var e = $(id);
      e.style.animation = "none"; void e.offsetWidth; e.style.animation = "";
    });
    $("carte-h").textContent = c.h;
    $("carte-p").textContent = c.p;
    $("envoyer").querySelector("span").textContent = c.bouton;
    $("separateur").textContent = c.separateur;
    $("autre").textContent = c.autre;
    // Required only where the field is visible, so the browser never blocks on a folded field.
    document.querySelectorAll("[data-requis]").forEach(function (x) {
      x.required = x.dataset.requis.split(" ").indexOf(m) >= 0;
      x.tabIndex = x.required || x.dataset.requis === "toujours" ? 0 : -1;
    });
    $("message").hidden = true;
    document.title = window.nxTitre ? window.nxTitre(c.titre) : c.titre;
    document.body.setAttribute("data-mode", m);
    if (pousser) history.pushState({ mode: m }, "", c.url);
    heros(m);
  }

  // The split heading is built before the dictionary arrives: write it again in the reader's language.
  document.addEventListener("nx-langue-prete", function () {
    ecrire($("heros-titre"), MODES[mode].heros);
    document.title = window.nxTitre(MODES[mode].titre);
  });

  // ?next= brings the player back to where the sign-in started (the OAuth consent screen, for
  // instance). Only a same-site path is accepted, never another origin: no open redirect.
  function suite() {
    var n = new URLSearchParams(location.search).get("next");
    return n && n.charAt(0) === "/" && n.charAt(1) !== "/" && n.charAt(1) !== "\\" ? n : "compte.html";
  }

  // --- Live auth: the real Turnstile widget + the real /api calls -------------------------
  // Same sitekey as the previous site (public). Missing/blocked widget = the server
  // lets the request through (fail-open), so sign-in never locks on the captcha.

  window.NEXTENDO_TURNSTILE_SITEKEY = "0x4AAAAAAD7S4rKlUZb5jrS1";
  window.__nxTsToken = "";
  window.nxTurnstileOnload = function () {
    if (window.NEXTENDO_TURNSTILE_SITEKEY && window.turnstile && $("ts")) {
      try {
        window.turnstile.render("#ts", {
          sitekey: window.NEXTENDO_TURNSTILE_SITEKEY, theme: "auto",
          callback: function (t) { window.__nxTsToken = t || ""; },
          "expired-callback": function () { window.__nxTsToken = ""; try { window.turnstile.reset("#ts"); } catch (e) {} },
          "error-callback": function () { window.__nxTsToken = ""; return true; }
        });
      } catch (e) {}
    }
  };
  function jetonTs(maxMs) {
    if (!window.NEXTENDO_TURNSTILE_SITEKEY || !window.turnstile) return Promise.resolve("");
    var fin = Date.now() + (maxMs || 2500);
    var lire = function () {
      var t = window.__nxTsToken || "";
      if (!t) { try { t = window.turnstile.getResponse() || ""; } catch (e) {} }
      return t;
    };
    return new Promise(function (ok) {
      var sondage = function () {
        var t = lire();
        if (t || Date.now() >= fin) { ok(t || ""); return; }
        setTimeout(sondage, 150);
      };
      sondage();
    });
  }

  var getPays = null;

  function forceMdp() {
    var v = $("mdp").value, n = 0;
    if (v.length >= 8) n++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++;
    if (/\d/.test(v)) n++;
    if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) n++;
    var couleurs = ["#ff6b81", "#ff6b81", "#ffb070", "#ffd166", "#62e3a4"];
    $("force-barre").style.width = (v ? Math.max(1, n) * 25 : 0) + "%";
    $("force-barre").style.background = couleurs[n];
    $("force-texte").textContent = !v ? "At least 8 characters, one digit." : ["Too short", "Weak", "Fair", "Good", "Strong"][n];
    $("force-texte").style.color = v ? couleurs[n] : "";
    return n;
  }

  var minuteur;
  function verifierPseudo() {
    var v = $("pseudo").value.trim(), t = $("pseudo-texte");
    clearTimeout(minuteur);
    if (!v) { t.textContent = "3 to 16 letters, numbers, - or _."; t.className = ""; return; }
    if (!/^[A-Za-z0-9_-]{3,16}$/.test(v)) { t.textContent = "Use 3 to 16 letters, numbers, - or _."; t.className = "erreur"; return; }
    t.textContent = "Checking…"; t.className = "";
    minuteur = setTimeout(function () {
      fetch("/api/username-available?username=" + encodeURIComponent(v)).then(function (r) { return r.json(); }).then(function (d) {
        if ($("pseudo").value.trim() !== v) return;
        t.textContent = d.available ? v + " is available." : "This username is taken.";
        t.className = d.available ? "ok" : "erreur";
      }).catch(function () { t.textContent = ""; });
    }, 350);
  }

  function erreur(texte) {
    var m = $("message");
    m.textContent = texte;
    m.hidden = false;
  }

  function envoyer(e) {
    e.preventDefault();
    var email = $("email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { erreur("Enter a valid e-mail address."); return; }
    if (mode === "register") {
      if (!/^[A-Za-z0-9_-]{3,16}$/.test($("pseudo").value.trim())) { erreur("Choose a username of 3 to 16 letters, numbers, - or _."); return; }
      if ($("mdp").value.length < 8 || !/\d/.test($("mdp").value)) { erreur("Your password needs at least 8 characters and one digit."); return; }
      if ($("mdp").value !== $("mdp2").value) { erreur("The two passwords don't match."); return; }
    }
    if (mode === "login" && !$("mdp").value) { erreur("Enter your password."); return; }
    if (!window.NX) { erreur("The sign-in service is loading. Try again in a second."); return; }
    var b = $("envoyer");
    b.disabled = true;
    b.querySelector("span").textContent = mode === "register" ? "Creating…" : mode === "reset" ? "Sending…" : "Signing in…";
    var fini = function () {
      b.disabled = false;
      b.querySelector("span").textContent = MODES[mode].bouton;
    };
    var fin = function (titre, avant, apres) {
      $("fin-email").textContent = email;
      $("fin-titre").textContent = titre;
      $("fin-texte-1").textContent = avant;
      $("fin-texte-2").textContent = apres;
      carte.classList.add("est-fini");
      fini();
    };
    jetonTs(2500).then(function (tok) {
      NX.turnstileToken = tok;
      if (mode === "login") return NX.login(email, $("mdp").value).then(function () { location.href = suite(); });
      if (mode === "register") {
        var pays = "";
        try { pays = getPays ? getPays() : ""; } catch (x) {}
        return NX.register($("pseudo").value.trim(), email, $("mdp").value, pays).then(function () {
          fin("Check your e-mail", "We sent a confirmation link to ", ". Open it to activate your account.");
        });
      }
      return NX.forgot(email).then(function () {
        fin("Check your inbox", "If an account uses ", ", a reset link is on its way. It works for one hour.");
      });
    }).catch(function (err) {
      fini();
      erreur((err && err.message) || "Something went wrong. Try again.");
    });
  }

  // Registration can be closed from the server (launch freeze): the live flag decides.
  function inscriptionsOuvertes() {
    fetch("/api/site-config").then(function (r) { return r.json(); }).then(function (c) {
      if (c && c.registration_open === false) $("fermees").hidden = false;
    }).catch(function () {});
  }

  // --- WebGL aurora (ScanVerse uses React Bits' Aurora; this is a dependency-free shader with
  // --- the twilight colors). Falls back to the CSS gradient behind it. ---------------------

  function aurore() {
    var toile = $("aurore");
    var gl = toile && toile.getContext("webgl", { premultipliedAlpha: false, alpha: true });
    if (!gl) return;
    var vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fs = [
      "precision highp float;uniform vec2 r;uniform float t;",
      "vec3 c1=vec3(1.,.21,.33);vec3 c2=vec3(.49,.23,.93);vec3 c3=vec3(1.,.69,.44);",
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}",
      "void main(){vec2 uv=gl_FragCoord.xy/r;float x=uv.x*3.;",
      "float a=n(vec2(x+t*.12,t*.05))*.55+n(vec2(x*2.-t*.08,t*.03))*.25;",
      "float b=smoothstep(.0,.9,1.-abs(uv.y-.55-a*.45)*2.2);",
      "float b2=smoothstep(.0,.9,1.-abs(uv.y-.3-a*.35)*3.);",
      "vec3 col=mix(c2,c1,smoothstep(.1,.9,uv.x+a*.4))*b+c3*b2*.55;",
      "float alpha=clamp(b*.85+b2*.5,0.,1.);",
      "gl_FragColor=vec4(col*alpha,alpha);}"
    ].join("");
    var prog = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (s) {
      var sh = gl.createShader(s[0]);
      gl.shaderSource(sh, s[1]);
      gl.compileShader(sh);
      gl.attachShader(prog, sh);
    });
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(prog, "r"), uT = gl.getUniformLocation(prog, "t");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    var t0 = performance.now();
    var dessiner = function () {
      var w = toile.clientWidth, hgt = toile.clientHeight, dpr = Math.min(devicePixelRatio, 1.5);
      if (toile.width !== Math.round(w * dpr) || toile.height !== Math.round(hgt * dpr)) {
        toile.width = Math.round(w * dpr); toile.height = Math.round(hgt * dpr);
        gl.viewport(0, 0, toile.width, toile.height);
      }
      gl.uniform2f(uR, toile.width, toile.height);
      gl.uniform1f(uT, (performance.now() - t0) / 1000 * 0.8);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!calme) requestAnimationFrame(dessiner);
    };
    toile.classList.add("est-pret");
    dessiner();
  }

  // --- Wiring ------------------------------------------------------------------------------

  document.querySelectorAll("[data-vers]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); changer(a.dataset.vers, true); });
  });
  $("autre").addEventListener("click", function () { changer(mode === "login" ? "register" : "login", true); });
  $("recommencer").addEventListener("click", function () { carte.classList.remove("est-fini"); changer("login", true); });
  window.addEventListener("popstate", function (e) {
    carte.classList.remove("est-fini");
    changer((e.state && e.state.mode) || document.body.getAttribute("data-mode-initial"), false);
  });
  $("mdp").addEventListener("input", forceMdp);
  $("pseudo").addEventListener("input", verifierPseudo);
  $("form").addEventListener("submit", envoyer);
  document.querySelectorAll(".voir").forEach(function (b) {
    b.addEventListener("click", function () {
      var i = b.parentNode.querySelector("input");
      var montre = i.type === "password";
      i.type = montre ? "text" : "password";
      b.classList.toggle("est-visible", montre);
      b.setAttribute("aria-label", montre ? "Hide password" : "Show password");
    });
  });

  document.body.setAttribute("data-mode-initial", mode);
  history.replaceState({ mode: mode }, "", MODES[mode].url);
  changer(mode, false);
  forceMdp();
  inscriptionsOuvertes();
  aurore();
  if (window.nxSelecteurPays) {
    try { getPays = window.nxSelecteurPays($("pays"), ((navigator.language || "en").split("-")[1] || "US").toUpperCase()); } catch (e) {}
  }
  // Already signed in: no need to sign in again.
  if (mode === "login" && window.NX && NX.token) location.replace(suite());
})();

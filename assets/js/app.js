/* ==========================================================================
   Nextendo Network — client compte (vanilla JS, sans build).
   Parle au backend nextendo-account via /api/* (même origine).
   Auth = jeton Bearer signé, conservé dans localStorage.
   ========================================================================== */
const NX = {
  tokenKey: "nx_token",
  nexKey: "nx_nex_token",
  turnstileToken: "", // verrou anti-relais : jeton Turnstile, posé par les pages login/register

  get token() { return localStorage.getItem(this.tokenKey) || ""; },
  set token(t) { t ? localStorage.setItem(this.tokenKey, t) : localStorage.removeItem(this.tokenKey); },
  get nexToken() { return localStorage.getItem(this.nexKey) || ""; },
  set nexToken(t) { t ? localStorage.setItem(this.nexKey, t) : localStorage.removeItem(this.nexKey); },

  async api(path, body, method = "POST") {
    const opts = { method, headers: {} };
    if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    if (this.token) opts.headers["Authorization"] = "Bearer " + this.token;
    if (this.turnstileToken) opts.headers["Cf-Turnstile-Response"] = this.turnstileToken;
    const res = await fetch(path, opts);
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(data.error || ("Erreur réseau (" + res.status + ")"));
    return data;
  },

  // Conserve la session renvoyée par register/login/guest.
  save(r) { if (r && r.token) this.token = r.token; if (r && r.nex_token) this.nexToken = r.nex_token; return r; },

  // country : code ISO alpha-2, obligatoire depuis qu'on affiche un drapeau en jeu.
  register(username, email, password, country) { return this.api("/api/register", { username, email, password, country }).then(r => this.save(r)); },
  login(login, password)              { return this.api("/api/login", { login, password }).then(r => this.save(r)); },
  guest(username)                     { return this.api("/api/guest", { username }).then(r => this.save(r)); },
  me()                                { return this.api("/api/me", null, "GET"); },
  profile()                           { return this.api("/api/profile", null, "GET"); },
  friends()                           { return this.api("/api/friends", null, "GET"); },
  addFriend(friend_code)              { return this.api("/api/friends", { friend_code }); },
  acceptFriend(pid)                   { return this.api("/api/friends/accept", { pid }); },
  declineFriend(pid)                  { return this.api("/api/friends/decline", { pid }); },
  removeFriend(pid)                   { return this.api("/api/friends/remove", { pid }); },
  blockFriend(pid)                    { return this.api("/api/friends/block", { pid }); },
  setFavorite(pid, favorite)          { return this.api("/api/friends/favorite", { pid, favorite }); },
  friendHistory(pid)                  { return this.api("/api/friends/history?pid=" + encodeURIComponent(pid), null, "GET"); },
  available(u)                        { return this.api("/api/username-available?username=" + encodeURIComponent(u), null, "GET"); },
  setUsername(username)               { return this.api("/api/username", { username }, "PUT"); },
  putProfile(profile)                 { return this.api("/api/profile", profile, "PUT"); },
  history()                           { return this.api("/api/history", null, "GET"); },
  gameInfo(titleId, name)             { return this.api("/api/gameinfo?title_id=" + encodeURIComponent(titleId||"") + "&name=" + encodeURIComponent(name||""), null, "GET"); },

  /* sauvegardes cloud : liste + quota, aperçu du contenu (parsé), suppression */
  getSaves()            { return this.api("/api/saves", null, "GET"); },
  saveParsed(titleId)   { return this.api("/api/save/" + encodeURIComponent(titleId) + "/parsed?lang=" + encodeURIComponent((window.NXI18N && NXI18N.lang && NXI18N.lang()) || "en"), null, "GET"); },
  deleteSave(titleId)   { return this.api("/api/save/" + encodeURIComponent(titleId), null, "DELETE"); },
  // Télécharge le fichier de sauvegarde brut (le blob stocké = un zip du dossier save Switch).
  // Réponse binaire → on ne passe pas par api() (qui parse du JSON) mais par un fetch dédié.
  async downloadSave(titleId) {
    const opts = { method: "GET", headers: {} };
    if (this.token) opts.headers["Authorization"] = "Bearer " + this.token;
    const res = await fetch("/api/save/" + encodeURIComponent(titleId), opts);
    if (res.status === 204) throw new Error("Aucune sauvegarde dans le cloud.");
    if (!res.ok) {
      let msg = "Erreur réseau (" + res.status + ")";
      try { const d = await res.json(); if (d && d.error) msg = d.error; } catch (_) {}
      throw new Error(msg);
    }
    return await res.blob();
  },

  /* e-mail : vérification + réinitialisation du mot de passe */
  forgot(email)          { return this.api("/api/forgot", { email }); },
  reset(token, password) { return this.api("/api/reset", { token, password }); },
  verifyEmail(token)     { return this.api("/api/verify?token=" + encodeURIComponent(token), null, "GET"); },
  resendVerification()   { return this.api("/api/resend-verification", {}); },

  /* compte : changer l'e-mail + gérer les sessions */
  changeEmail(email, password) { return this.api("/api/email", { email, password }); },
  sessions()                   { return this.api("/api/sessions", null, "GET"); },
  revokeSession(id)            { return this.api("/api/sessions/revoke", { id }); },
  revokeAllSessions()          { return this.api("/api/sessions/revoke-all", {}); },

  /* espace admin (réservé aux e-mails admin côté serveur) */
  adminCheck()         { return this.api("/api/admin/check", null, "GET"); },
  adminUsers()         { return this.api("/api/admin/users", null, "GET"); },
  adminStats()         { return this.api("/api/admin/stats", null, "GET"); },
  // Signalements envoyés depuis l'émulateur : code d'erreur + log au moment où ça casse,
  // avec le pseudo Nextendo ET Discord pour savoir à qui répondre.
  adminReports()       { return this.api("/api/admin/reports", null, "GET"); },
  adminReportHandled(id, handled) {
    return this.api("/api/admin/reports?id=" + encodeURIComponent(id) + "&handled=" + (handled ? "true" : "false"), {});
  },
  adminDeleteUser(pid) { return this.api("/api/admin/delete-user", { pid }); },
  // Ban : supprime le compte ET réserve e-mail/IP/code ami/Discord (pas de recréation), efface le
  // cloud + l'historique, et bannit du Discord si le compte y est lié.
  adminBan(pid, reason)  { return this.api("/api/admin/ban", { pid, reason }); },
  // Déban : libère e-mail/IP/code ami/Discord et lève le ban Discord. Le compte reste supprimé.
  adminUnban(pid)        { return this.api("/api/admin/unban", { pid }); },

  logout() { this.token = ""; this.nexToken = ""; location.href = "/"; },

  // Petit toast (copie, etc.)
  toast(text) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast"; el.className = "toast";
      el.innerHTML = '<span class="toast__k">✓</span><span id="toastMsg"></span>';
      document.body.appendChild(el);
    }
    document.getElementById("toastMsg").textContent = text;
    el.classList.add("show");
    clearTimeout(this._t);
    this._t = setTimeout(() => el.classList.remove("show"), 2200);
  },
};

/* helpers formulaire partagés */
function showMsg(el, text, kind) { if (!el) return; el.textContent = text; el.className = "msg show msg--" + (kind || "err"); }
function hideMsg(el) { if (!el) return; el.className = "msg"; }

/* met l'année du footer à jour si présente */
(() => { const y = document.getElementById("year"); if (y) y.textContent = String(new Date().getFullYear()); })();

/* état "stuck" du header au scroll (pages app, sans main.js) */
(() => {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const on = () => nav.classList.toggle("stuck", window.scrollY > 8);
  on(); window.addEventListener("scroll", on, { passive: true });
})();

/* ==========================================================================
   Mot de passe — règles + jauge de force (partagé register + reset).
   Doit rester ALIGNÉ avec validatePassword() côté serveur (Go) :
   >= 8 caractères, au moins un chiffre, au moins un caractère spécial.
   ========================================================================== */
const PW_SPECIALS = "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~";
function pwChecks(pw) {
  pw = pw || "";
  return {
    len: pw.length >= 8,
    digit: /[0-9]/.test(pw),
    special: [...pw].some((c) => PW_SPECIALS.indexOf(c) >= 0),
  };
}
/* Renvoie { level 0..4, ok, label, checks }. ok = les 3 règles obligatoires sont remplies.
   Le niveau visible est plafonné tant que les règles ne sont pas remplies (jamais "fort" si invalide). */
function pwStrength(pw) {
  pw = pw || "";
  const c = pwChecks(pw);
  const ok = c.len && c.digit && c.special;
  let pts = 0;
  if (pw.length >= 8) pts++;
  if (pw.length >= 12) pts++;
  if (c.digit) pts++;
  if (c.special) pts++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) pts++;
  let level = Math.min(4, pts);
  if (!ok) level = Math.min(level, 1);
  const LABELS = ["Trop faible", "Faible", "Moyen", "Fort", "Très fort"];
  return { level, ok, checks: c, label: pw ? LABELS[level] : "" };
}
/* Câble une jauge : input -> barre (.pw-meter[data-level]) + label + checklist (.pw-reqs).
   Renvoie une fonction () => bool (règles OK) pour piloter l'état du bouton submit. */
function wirePwMeter(input, meter, label, reqs) {
  const update = () => {
    const s = pwStrength(input.value);
    if (meter) meter.setAttribute("data-level", input.value ? String(s.level) : "-1");
    if (label) { label.textContent = s.label; label.className = "pw-meter__label lvl-" + s.level; }
    if (reqs) reqs.querySelectorAll("[data-req]").forEach((li) => {
      li.classList.toggle("ok", !!s.checks[li.getAttribute("data-req")]);
    });
    return s.ok;
  };
  input.addEventListener("input", update);
  update();
  return () => pwStrength(input.value).ok;
}

/* Œil afficher/masquer : tout bouton [data-eye="idDeLInput"] bascule le type + l'icône. */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-eye]");
  if (!btn) return;
  e.preventDefault();
  const inp = document.getElementById(btn.getAttribute("data-eye"));
  if (!inp) return;
  const reveal = inp.type === "password";
  inp.type = reveal ? "text" : "password";
  const ic = btn.querySelector("i");
  if (ic) ic.className = "ph " + (reveal ? "ph-eye-slash" : "ph-eye");
  btn.setAttribute("aria-label", reveal ? "Masquer le mot de passe" : "Afficher le mot de passe");
});

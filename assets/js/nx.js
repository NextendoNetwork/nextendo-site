// Nextendo Network, shared API client (same contracts as the previous site).
// Backend = nextendo-account via /api/* (same origin, Cloudflare in front).
// Auth = signed Bearer token in localStorage ("nx_token").
// Client identity header, required by the server on every /api call.
(function () {
  "use strict";
  var APPID = "nxc_hvGUwjpszrDT";

  if (window.fetch && !window.fetch.__nx) {
    var origFetch = window.fetch;
    window.fetch = function (resource, init) {
      init = init || {};
      var url = typeof resource === "string" ? resource : (resource && resource.url ? resource.url : "");
      if (url.indexOf("/api/") === 0 || url.indexOf("api/") === 0 || url.indexOf("nextendo.network/api/") !== -1) {
        if (!init.headers) init.headers = {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has("X-Nextendo-Client-Id")) init.headers.set("X-Nextendo-Client-Id", APPID);
        } else if (Array.isArray(init.headers)) {
          var found = init.headers.some(function (h) { return String(h[0]).toLowerCase() === "x-nextendo-client-id"; });
          if (!found) init.headers.push(["X-Nextendo-Client-Id", APPID]);
        } else {
          if (!init.headers["X-Nextendo-Client-Id"] && !init.headers["x-nextendo-client-id"]) {
            init.headers["X-Nextendo-Client-Id"] = APPID;
          }
        }
      }
      return origFetch.call(this, resource, init);
    };
    window.fetch.__nx = true;
  }

  // Server error messages are written in French: map each one to its English source text, which the
  // site's translation then renders in the visitor's language.
  var ERREURS_SERVEUR = {
    "Accès réservé à l'administrateur.": "Access restricted to administrators.",
    "admin requis": "Access restricted to administrators.",
    "Adresse e-mail invalide.": "Invalid e-mail address.",
    "Application introuvable.": "Application not found.",
    "Aucun joueur avec ce friend code.": "No player has this friend code.",
    "Avatar invalide.": "Invalid profile picture.",
    "Image de profil invalide.": "Invalid profile picture.",
    "C'est déjà ton adresse e-mail.": "This is already your e-mail address.",
    "C'est ton propre friend code.": "This is your own friend code.",
    "Ce compte Discord est banni.": "This Discord account is banned.",
    "Ce compte a été banni de Nextendo.": "This account has been banned from Nextendo.",
    "Ce compte est désactivé pour le moment.": "This account is disabled for now.",
    "compte fermé": "This account is disabled for now.",
    "Ce joueur n'est pas dans tes amis.": "This player isn't in your friends.",
    "pas dans les amis": "This player isn't in your friends.",
    "Ce logo est celui d'une application officielle.": "This icon belongs to an official application.",
    "Ce nom est réservé à Nextendo ou imite une application officielle.": "This name is reserved to Nextendo or imitates an official application.",
    "Ce pseudo est déjà pris.": "This username is already taken.",
    "Cet utilisateur est déjà le créateur de cette application.": "This user already created this application.",
    "Cet utilisateur est déjà testeur ou collaborateur sur cette application.": "This user is already a member of this application.",
    "Cette adresse e-mail est déjà utilisée.": "This e-mail address is already in use.",
    "Cette application est officielle et ne peut pas être supprimée.": "This application is official and can't be deleted.",
    "Cette application est publique et n'utilise pas de secret.": "This application is public and has no secret.",
    "Cette invitation est destinée à un autre compte.": "This invitation is for another account.",
    "Choisis ton pays.": "Choose your country.",
    "Collaborateur introuvable.": "Member not found.",
    "Compte Nextendo requis.": "A Nextendo account is required.",
    "Compte inconnu.": "Account not found.",
    "Compte introuvable.": "Account not found.",
    "compte introuvable": "Account not found.",
    "compte inconnu": "Account not found.",
    "Connecte-toi avec ton adresse e-mail (la connexion par pseudo a été retirée).": "Sign in with your e-mail address (signing in with a username was removed).",
    "Connecte-toi d'abord sur nextendo.network.": "Sign in on nextendo.network first.",
    "Connexion requise pour accepter l'invitation.": "Sign in to accept the invitation.",
    "Connexion requise.": "Sign-in required.",
    "connexion requise": "Sign-in required.",
    "unauthorized": "Sign-in required.",
    "Couleur invalide.": "Invalid color.",
    "Demande introuvable.": "Request not found.",
    "Dessin trop volumineux.": "The drawing is too large.",
    "Déclare au moins une redirection.": "Add at least one redirect.",
    "GameBanana ne répond pas.": "GameBanana isn't responding.",
    "Identifiants incorrects.": "Incorrect e-mail or password.",
    "identifiants invalides": "Incorrect e-mail or password.",
    "Impossible d'envoyer la demande.": "Couldn't send the request.",
    "Impossible de mettre à jour le favori.": "Couldn't update the favorite.",
    "Impossible de modifier les permissions du créateur.": "The creator's permissions can't be changed.",
    "Impossible de révoquer l'accès du créateur.": "The creator's access can't be removed.",
    "Indisponible pour les profils invités.": "Not available for guest profiles.",
    "Les sauvegardes cloud ne sont pas disponibles pour les profils invités.": "Not available for guest profiles.",
    "Invitation non trouvée pour cette application.": "No invitation found for this application.",
    "L'envoi de sauvegardes cloud est reserve exclusivement aux emulateurs officiels Nextendo.": "Only official Nextendo emulators can upload cloud saves.",
    "La suppression de sauvegardes cloud est reservee exclusivement aux emulateurs officiels Nextendo.": "Only official Nextendo emulators can delete cloud saves.",
    "La description ne peut pas dépasser 400 caractères.": "The description can't be longer than 400 characters.",
    "Le dépôt n'accepte que des images.": "Only images can be uploaded.",
    "Le mode invité a été retiré. Crée un compte Nextendo sur nextendo.network pour jouer en ligne.": "Guest mode was removed. Create a Nextendo account on nextendo.network to play online.",
    "Le nom de l'application est requis.": "The application name is required.",
    "Le nom ne peut pas dépasser 64 caractères.": "The name can't be longer than 64 characters.",
    "Le pseudo doit faire 3 à 16 caractères (lettres, chiffres, _ ou -).": "The username must be 3 to 16 characters (letters, numbers, _ or -).",
    "Pseudo invalide (3 à 16 caractères : lettres, chiffres, _ ou -).": "The username must be 3 to 16 characters (letters, numbers, _ or -).",
    "Les développeurs ne peuvent pas renommer l'application.": "Developers can't rename the application.",
    "Les inscriptions sont temporairement fermées, le temps de finaliser la nouvelle version de Nextendo. Reviens bientôt !": "Sign-ups are temporarily closed while we finish the new version of Nextendo. Come back soon!",
    "Les sauvegardes cloud sont limitées à Splatoon 3.": "Cloud saves are limited to Splatoon 3.",
    "Les testeurs disposent d'un accès en lecture seule.": "Testers have read-only access.",
    "Lien d'invitation invalide ou expiré.": "Invalid or expired invitation link.",
    "Lien de réinitialisation invalide.": "Invalid reset link.",
    "Lien de vérification invalide ou expiré.": "Invalid or expired verification link.",
    "Lien de vérification invalide.": "Invalid or expired verification link.",
    "Lien invalide ou expiré (il a peut-être déjà été utilisé).": "Invalid or expired link (it may have been used already).",
    "Limite de stockage cloud atteinte (10 Mo). Supprime des sauvegardes.": "Cloud storage limit reached (10 MB). Delete some saves.",
    "Limite de stockage cloud atteinte (5 Mo). Supprime des sauvegardes ou deviens booster Discord (10 Mo).": "Cloud storage limit reached (5 MB). Delete some saves or become a Discord booster (10 MB).",
    "Mot de passe incorrect.": "Incorrect password.",
    "Motif invalide.": "Invalid reason.",
    "Nextendo Developers demande un e-mail vérifié et un compte Discord lié.": "Nextendo Developers needs a verified e-mail and a linked Discord account. You can set both up on your account page.",
    "Non autorisé sur cette application.": "You don't have access to this application.",
    "Pays inconnu.": "Unknown country.",
    "Permission de dépôt invalide ou expirée.": "Invalid or expired upload permission.",
    "Rotation illisible.": "Rotation unavailable.",
    "Rotation indisponible.": "Rotation unavailable.",
    "Salmon Run indisponible.": "Salmon Run unavailable.",
    "Salons indisponibles.": "Lobbies unavailable.",
    "Sauvegarde trop volumineuse.": "The save is too large.",
    "Session introuvable.": "Session not found.",
    "Session invalide ou expirée.": "Your session is invalid or has expired. Sign in again.",
    "access token invalide ou expiré": "Your session is invalid or has expired. Sign in again.",
    "Seul le créateur ou un administrateur peut ajouter des membres.": "Only the creator or an administrator can add members.",
    "Seul le créateur ou un administrateur peut modifier les permissions.": "Only the creator or an administrator can change permissions.",
    "Seul le créateur ou un administrateur peut réinitialiser le secret.": "Only the creator or an administrator can reset the secret.",
    "Seul le créateur ou un administrateur peut révoquer l'accès.": "Only the creator or an administrator can remove access.",
    "Seul le créateur peut supprimer définitivement l'application.": "Only the creator can delete the application.",
    "Seul le créateur, un développeur ou un administrateur peut réinitialiser le token de bot.": "Only the creator, a developer or an administrator can reset the bot token.",
    "Trop de créations de profil depuis cette adresse. Réessaie plus tard.": "Too many profiles created from this address. Try again later.",
    "Trop de signalements récents. Réessaie dans une heure.": "Too many recent reports. Try again in an hour.",
    "Trop de tentatives. Réessaie dans quelques minutes.": "Too many attempts. Try again in a few minutes.",
    "Tu as bloqué cette application. Débloque-la depuis ton compte pour l'autoriser.": "You blocked this application. Unblock it from your account to authorize it.",
    "Tu ne peux pas supprimer ton propre compte admin.": "You can't delete your own admin account.",
    "Un compte invité n'a pas d'adresse e-mail.": "A guest account has no e-mail address.",
    "Un compte invité ne peut pas être supprimé ici.": "A guest account can't be deleted here.",
    "Une application confidentielle doit déclarer au moins une redirection https.": "A confidential application needs at least one https redirect.",
    "Une application officielle ne se bloque pas.": "An official application can't be blocked.",
    "Une application officielle ne se retire pas d'ici.": "An official application can't be removed from here.",
    "Une application officielle ne se signale pas ici.": "An official application can't be reported here.",
    "Veuillez entrer un pseudo Nextendo.": "Enter a Nextendo username.",
    "Échec de la suppression.": "Deletion failed.",
    "échec suppression": "Deletion failed.",
    "Échec de la vérification. Connecte-toi directement sur https://nextendo.network — un autre site ne peut pas te connecter à ton compte Nextendo.": "Verification failed. Sign in directly on https://nextendo.network: another site can't sign you in to your Nextendo account.",
    "Échec de la vérification. Connecte-toi directement sur https://nextendo.network : un autre site ne peut pas te connecter à ton compte Nextendo.": "Verification failed. Sign in directly on https://nextendo.network: another site can't sign you in to your Nextendo account.",
    "erreur interne": "Server error. Try again.",
    "erreur": "Server error. Try again.",
    "interne": "Server error. Try again.",
    "échec enregistrement": "Server error. Try again.",
    "JSON invalide": "Invalid request.",
    "JSON invalide ou trop volumineux": "Invalid request.",
    "json invalide": "Invalid request.",
    "paramètres invalides": "Invalid request.",
    "Rôle invalide (admin, developer, tester)": "Invalid role.",
    "Signalement introuvable": "Report not found."
    };
  function erreurServeur(m) {
    var en = ERREURS_SERVEUR[m] || m;
    return window.nxT ? window.nxT(en) : en;
  }
  var NX = {
    tokenKey: "nx_token",
    nexKey: "nx_nex_token",
    turnstileToken: "",
    clientId: APPID,

    get token() { try { return localStorage.getItem(this.tokenKey) || ""; } catch (e) { return ""; } },
    set token(t) { try { t ? localStorage.setItem(this.tokenKey, t) : localStorage.removeItem(this.tokenKey); } catch (e) {} },
    get nexToken() { try { return localStorage.getItem(this.nexKey) || ""; } catch (e) { return ""; } },
    set nexToken(t) { try { t ? localStorage.setItem(this.nexKey, t) : localStorage.removeItem(this.nexKey); } catch (e) {} },

    api: function (path, body, method) {
      var self = this;
      method = method || "POST";
      var opts = { method: method, headers: { "X-Nextendo-Client-Id": self.clientId } };
      if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
      if (self.token) opts.headers["Authorization"] = "Bearer " + self.token;
      if (self.turnstileToken) opts.headers["Cf-Turnstile-Response"] = self.turnstileToken;
      return fetch(path, opts).then(function (res) {
        var data = {};
        return res.json().then(function (d) { data = d || {}; return { res: res, data: data }; }, function () { return { res: res, data: data }; });
      }).then(function (r) {
        if (!r.res.ok) {
          var e = new Error(r.data.error ? erreurServeur(r.data.error) : ("Network error (" + r.res.status + ")"));
          e.data = r.data;
          e.status = r.res.status;
          throw e;
        }
        return r.data;
      });
    },

    save: function (r) { if (r && r.token) this.token = r.token; if (r && r.nex_token) this.nexToken = r.nex_token; return r; },

    register: function (username, email, password, country) { return this.api("/api/register", { username: username, email: email, password: password, country: country }).then(function (r) { return NX.save(r); }); },
    login: function (login, password) { return this.api("/api/login", { login: login, password: password }).then(function (r) { return NX.save(r); }); },
    me: function () { return this.api("/api/me", null, "GET"); },
    profile: function () { return this.api("/api/profile", null, "GET"); },
    friends: function () { return this.api("/api/friends?images=0", null, "GET"); }, // sans photos inline : le site passe par /api/avatar
    addFriend: function (friend_code) { return this.api("/api/friends", { friend_code: friend_code }); },
    acceptFriend: function (pid) { return this.api("/api/friends/accept", { pid: pid }); },
    declineFriend: function (pid) { return this.api("/api/friends/decline", { pid }); },
    removeFriend: function (pid) { return this.api("/api/friends/remove", { pid }); },
    blockFriend: function (pid) { return this.api("/api/friends/block", { pid }); },
    setFavorite: function (pid, favorite) { return this.api("/api/friends/favorite", { pid: pid, favorite: favorite }); },
    friendHistory: function (pid) { return this.api("/api/friends/history?pid=" + encodeURIComponent(pid), null, "GET"); },
    available: function (u) { return this.api("/api/username-available?username=" + encodeURIComponent(u), null, "GET"); },
    setUsername: function (username) { return this.api("/api/username", { username: username }, "PUT"); },
    putProfile: function (profile) { return this.api("/api/profile", profile, "PUT"); },
    discordAvatarSync: function (enabled) { return this.api("/api/profile/discord-sync", { enabled: !!enabled }); },
    history: function () { return this.api("/api/history", null, "GET"); },
    gameInfo: function (titleId, name) {
      var lang = (window.nxLangue || (document.documentElement && document.documentElement.lang) || "fr").slice(0, 2);
      return this.api("/api/gameinfo?langue=" + encodeURIComponent(lang) + "&title_id=" + encodeURIComponent(titleId || "") + "&name=" + encodeURIComponent(name || ""), null, "GET");
    },
    gameInfoLive: function (tid) {
      var lang = (window.nxLangue || (document.documentElement && document.documentElement.lang) || "fr").slice(0, 2);
      return this.api("/api/gameinfo?langue=" + encodeURIComponent(lang) + "&title_id=" + encodeURIComponent(tid), null, "GET");
    },

    getSaves: function () { return this.api("/api/saves", null, "GET"); },
    saveParsed: function (titleId) { return this.api("/api/save/" + encodeURIComponent(titleId) + "/parsed?lang=" + encodeURIComponent(window.nxLangue || "en"), null, "GET"); },
    deleteSave: function (titleId) { return this.api("/api/save/" + encodeURIComponent(titleId), null, "DELETE"); },
    downloadSave: function (titleId) {
      var self = this;
      var opts = { method: "GET", headers: { "X-Nextendo-Client-Id": self.clientId } };
      if (self.token) opts.headers["Authorization"] = "Bearer " + self.token;
      return fetch("/api/save/" + encodeURIComponent(titleId), opts).then(function (res) {
        if (res.status === 204) throw new Error("No cloud save for this game.");
        if (!res.ok) {
          return res.json().then(function (d) { throw new Error((d && d.error) ? erreurServeur(d.error) : ("Network error (" + res.status + ")")); }, function () { throw new Error("Network error (" + res.status + ")"); });
        }
        return res.blob();
      });
    },

    forgot: function (email) { return this.api("/api/forgot", { email: email }); },
    reset: function (token, password) { return this.api("/api/reset", { token: token, password: password }); },
    verifyEmail: function (token) { return this.api("/api/verify?token=" + encodeURIComponent(token), null, "GET"); },
    resendVerification: function () { return this.api("/api/resend-verification", {}); },

    changeEmail: function (email, password) { return this.api("/api/email", { email: email, password: password }); },
    sessions: function () { return this.api("/api/sessions", null, "GET"); },
    revokeSession: function (id) { return this.api("/api/sessions/revoke", { id: id }); },
    revokeAllSessions: function () { return this.api("/api/sessions/revoke-all", {}); },

    adminCheck: function () { return this.api("/api/admin/check", null, "GET"); },
    adminUsers: function (opts) {
      var p = [];
      if (opts && opts.q) p.push("q=" + encodeURIComponent(opts.q));
      if (opts && opts.offset) p.push("offset=" + encodeURIComponent(opts.offset));
      if (opts && opts.limit) p.push("limit=" + encodeURIComponent(opts.limit));
      return this.api("/api/admin/users" + (p.length ? "?" + p.join("&") : ""), null, "GET");
    },
    adminStats: function () { return this.api("/api/admin/stats", null, "GET"); },
    adminReports: function () { return this.api("/api/admin/reports", null, "GET"); },
    adminReportHandled: function (id, handled) {
      return this.api("/api/admin/reports?id=" + encodeURIComponent(id) + "&handled=" + (handled ? "true" : "false"), {});
    },
    adminDeleteUser: function (pid) { return this.api("/api/admin/delete-user", { pid: pid }); },
    adminUnban: function (pid) { return this.api("/api/admin/unban", { pid: pid }); },
    adminBan: function (pid, reason) { return this.api("/api/admin/ban", { pid: pid, reason: reason || "" }); },
    deleteAccount: function (password) { return this.api("/api/delete-account", { password: password }); },

    logout: function () { this.token = ""; this.nexToken = ""; location.href = "/"; }
  };

  window.NX = NX;
})();

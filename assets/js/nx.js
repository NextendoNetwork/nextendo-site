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
          var e = new Error(r.data.error || ("Network error (" + r.res.status + ")"));
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
    history: function () { return this.api("/api/history", null, "GET"); },
    gameInfo: function (titleId, name) { return this.api("/api/gameinfo?title_id=" + encodeURIComponent(titleId || "") + "&name=" + encodeURIComponent(name || ""), null, "GET"); },
    gameInfoLive: function (tid) { return this.api("/api/gameinfo?langue=en&title_id=" + encodeURIComponent(tid), null, "GET"); },

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
          return res.json().then(function (d) { throw new Error((d && d.error) || ("Network error (" + res.status + ")")); }, function () { throw new Error("Network error (" + res.status + ")"); });
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
    deleteAccount: function (password) { return this.api("/api/delete-account", { password: password }); },

    logout: function () { this.token = ""; this.nexToken = ""; location.href = "/"; }
  };

  window.NX = NX;
})();

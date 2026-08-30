/* Pays du compte — menu déroulant maison, avec recherche et vrais drapeaux.
 *
 * POURQUOI : Mario Kart affiche un drapeau à côté de chaque joueur. La console
 * le tire de la fiche du compte Nintendo ; l'émulateur, lui, ne connaît qu'une
 * RÉGION (Europe / USA / Japon), jamais un pays. Le compte Nextendo fait donc
 * foi : le joueur choisit son pays ici, l'émulateur le lit.
 *
 * POURQUOI PAS UN <select> :
 *   - Windows ne dessine PAS les drapeaux en emoji : il les rend en deux
 *     lettres. Il faut donc de vraies images, qu'un <select> ne sait pas
 *     afficher dans ses options.
 *   - 248 entrées sans recherche, c'est inutilisable.
 *
 * ON NE STOCKE QUE LE CODE ISO ("FR", "BR", …). Les noms viennent de
 * Intl.DisplayNames, qui les rend dans la langue du visiteur : écrire 248 noms
 * dans les dix langues du site aurait été long, faux et vite périmé.
 */
(function (w, d) {
  'use strict';

  var CACHE = null;
  var FLAG = 'https://flagcdn.com/w40/';   // drapeaux en image : seule façon de les voir sous Windows

  function displayNames(lang) {
    try { return new Intl.DisplayNames([lang || 'fr'], { type: 'region' }); }
    catch (_) { return null; }
  }

  // Noms imposés. Le navigateur rend « PS » par le libellé administratif
  // (« Territoires palestiniens » en français) ; on affiche « Palestine ».
  var OVERRIDE = {
    PS: {
      fr: 'Palestine', en: 'Palestine', es: 'Palestina', pt: 'Palestina',
      de: 'Palästina', it: 'Palestina', ru: 'Палестина',
      zh: '巴勒斯坦', ja: 'パレスチナ', ar: 'فلسطين'
    }
  };

  function nameOf(code, dn, lang) {
    var o = OVERRIDE[code];
    if (o) return o[(lang || 'fr').slice(0, 2).toLowerCase()] || o.en;
    if (dn) { try { return dn.of(code) || code; } catch (_) {} }
    return code;
  }

  // Recherche insensible aux accents : taper "bresil" doit trouver "Brésil".
  function fold(s) {
    try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
    catch (_) { return String(s).toLowerCase(); }
  }

  function flagImg(code) {
    var img = d.createElement('img');
    img.className = 'nxc__flag';
    img.loading = 'lazy';
    img.alt = '';
    img.src = FLAG + code.toLowerCase() + '.png';
    // Quelques codes ISO n'ont pas de drapeau (territoires) : on masque plutôt
    // que de laisser une image cassée.
    img.onerror = function () { img.style.visibility = 'hidden'; };
    return img;
  }

  function list() {
    if (CACHE) return Promise.resolve(CACHE);
    return fetch('/api/country')
      .then(function (r) { return r.json(); })
      .then(function (j) { CACHE = (j && j.countries) || []; return CACHE; })
      .catch(function () { return []; });
  }

  function T_(key, fb) {
    var v = w.NXI18N && typeof w.NXI18N.t === 'function' ? w.NXI18N.t(key) : null;
    return (v == null || v === '') ? fb : v;
  }

  /* mount(host, opts) remplace `host` par le composant.
     opts : { value, lang, onChange(code) }
     Rend un objet { get value(), set(code) }. */
  function mount(host, opts) {
    opts = opts || {};
    if (!host) return null;

    var value = opts.value || '';
    var items = [];       // [{code, name}] trié par NOM
    var open = false;
    var active = -1;      // index surligné au clavier

    var root = d.createElement('div');
    root.className = 'nxc';

    var btn = d.createElement('button');
    btn.type = 'button';
    btn.className = 'nxc__btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');

    var panel = d.createElement('div');
    panel.className = 'nxc__panel';
    panel.hidden = true;

    var search = d.createElement('input');
    search.className = 'nxc__search';
    search.type = 'text';
    search.autocomplete = 'off';
    search.spellcheck = false;
    search.placeholder = T_('country.search', 'Rechercher…');

    var ul = d.createElement('ul');
    ul.className = 'nxc__list';
    ul.setAttribute('role', 'listbox');

    panel.appendChild(search);
    panel.appendChild(ul);
    root.appendChild(btn);
    root.appendChild(panel);
    host.parentNode.replaceChild(root, host);
    root.id = host.id;

    function paintButton() {
      btn.innerHTML = '';
      var it = items.filter(function (x) { return x.code === value; })[0];
      if (it) {
        btn.appendChild(flagImg(it.code));
        var s = d.createElement('span');
        s.className = 'nxc__btnLabel';
        s.textContent = it.name;
        btn.appendChild(s);
      } else {
        var ph = d.createElement('span');
        ph.className = 'nxc__btnLabel nxc__btnLabel--ph';
        ph.textContent = T_('country.choose', 'Choisis ton pays…');
        btn.appendChild(ph);
      }
      var chev = d.createElement('i');
      chev.className = 'ph ph-caret-down nxc__chev';
      chev.setAttribute('aria-hidden', 'true');
      btn.appendChild(chev);
    }

    function rows() { return Array.prototype.slice.call(ul.querySelectorAll('.nxc__opt')); }

    function paintList(filter) {
      var q = fold(filter || '');
      ul.innerHTML = '';
      var shown = items.filter(function (it) {
        return !q || fold(it.name).indexOf(q) === 0 || fold(it.name).indexOf(' ' + q) > -1 || it.code.toLowerCase() === q;
      });
      if (!shown.length) {
        var none = d.createElement('li');
        none.className = 'nxc__none';
        none.textContent = T_('country.none', 'Aucun pays trouvé');
        ul.appendChild(none);
        active = -1;
        return;
      }
      shown.forEach(function (it) {
        var li = d.createElement('li');
        li.className = 'nxc__opt' + (it.code === value ? ' is-sel' : '');
        li.setAttribute('role', 'option');
        li.dataset.code = it.code;
        li.appendChild(flagImg(it.code));
        var s = d.createElement('span');
        s.textContent = it.name;
        li.appendChild(s);
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(it.code); });
        ul.appendChild(li);
      });
      active = 0;
      highlight();
    }

    function highlight() {
      rows().forEach(function (li, i) {
        li.classList.toggle('is-active', i === active);
        if (i === active) {
          var t = li.offsetTop, b = t + li.offsetHeight;
          if (t < ul.scrollTop) ul.scrollTop = t;
          else if (b > ul.scrollTop + ul.clientHeight) ul.scrollTop = b - ul.clientHeight;
        }
      });
    }

    function setOpen(v) {
      open = v;
      panel.hidden = !v;
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      root.classList.toggle('is-open', v);
      if (v) { search.value = ''; paintList(''); search.focus(); }
    }

    function choose(code) {
      value = code;
      paintButton();
      setOpen(false);
      btn.focus();
      if (typeof opts.onChange === 'function') opts.onChange(code);
    }

    btn.addEventListener('click', function () { setOpen(!open); });
    search.addEventListener('input', function () { paintList(search.value); });
    search.addEventListener('keydown', function (e) {
      var r = rows();
      if (e.key === 'ArrowDown') { e.preventDefault(); if (r.length) { active = Math.min(active + 1, r.length - 1); highlight(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (r.length) { active = Math.max(active - 1, 0); highlight(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (r[active]) choose(r[active].dataset.code); }
      else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.focus(); }
    });
    d.addEventListener('click', function (e) { if (open && !root.contains(e.target)) setOpen(false); });

    var api = {
      get value() { return value; },
      set: function (code) { value = code || ''; paintButton(); }
    };

    paintButton();
    list().then(function (codes) {
      var lang = opts.lang || d.documentElement.lang || 'fr';
      var dn = displayNames(lang);
      items = codes.map(function (c) { return { code: c, name: nameOf(c, dn, lang) }; });
      // TRI SUR LE NOM TRADUIT. Trier sur un libellé commençant par le drapeau
      // revenait à trier par code : « Émirats arabes unis » tombait avant
      // « Afghanistan » parce que AE précède AF.
      try { items.sort(function (a, b) { return a.name.localeCompare(b.name); }); }
      catch (_) { items.sort(function (a, b) { return a.name < b.name ? -1 : 1; }); }
      paintButton();
      if (typeof opts.onReady === 'function') opts.onReady(api);
    });

    return api;
  }

  w.NXCountry = { mount: mount, list: list };
})(window, document);

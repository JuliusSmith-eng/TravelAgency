/**
 * i18n: EN / UK / DE switcher.
 * HTML hooks:
 *   data-i18n="key"       -> element text
 *   data-i18n-ph="key"    -> placeholder
 *   data-i18n-aria="key"  -> aria-label
 *   data-site="name"      -> brand name from data/site.js
 *   data-contact="phone|email|address|whatsapp|telegram" -> contact data from data/site.js
 * Other scripts listen for the "langchange" event on document.
 */
(function () {
  "use strict";

  var LANGS = ["en", "uk", "de"];
  var LOCALES = { en: "en-GB", uk: "uk-UA", de: "de-DE" };
  var STORAGE_KEY = "lang";
  var dict = window.I18N;
  var site = window.SITE;
  var current = "en";

  /** Translate a key; {brand}, {year} and custom {vars} are substituted. */
  function t(key, vars) {
    var str = (dict[current] && dict[current][key]) || dict.en[key] || key;
    var all = Object.assign({ brand: site.name, year: new Date().getFullYear() }, vars || {});
    return str.replace(/\{(\w+)\}/g, function (m, name) { return name in all ? all[name] : m; });
  }

  /** Pick a localized field of a data object: {en, uk, de}. */
  function pick(obj) { return obj ? (obj[current] || obj.en || "") : ""; }

  function money(value) {
    try {
      return new Intl.NumberFormat(LOCALES[current], { style: "currency", currency: site.currency, maximumFractionDigits: 0 }).format(value);
    } catch (e) { return value + " " + site.currency; }
  }

  function fillContacts() {
    var c = site.contacts;
    document.querySelectorAll("[data-contact]").forEach(function (el) {
      var k = el.getAttribute("data-contact");
      if (k === "phone") { el.textContent = c.phone; el.href = c.phoneHref; }
      else if (k === "email") { el.textContent = c.email; el.href = "mailto:" + c.email; }
      else if (k === "address") { el.textContent = c.address; }
      else if (c[k]) { el.href = c[k]; }
    });
    document.querySelectorAll("[data-site='name']").forEach(function (el) { el.textContent = site.name; });
    document.querySelectorAll(".logo").forEach(function (el) { el.setAttribute("aria-label", site.name); });
  }


  /** "Travel *slower.*|Remember {longer.}"  ->  *x* = <em> accent, {x} = <mark> accent, | = line break. Safe: no innerHTML. */
  function setRich(el, text) {
    el.textContent = "";
    text.split(/(\*[^*]+\*|\{[^}]+\}|\|)/).forEach(function (part) {
      if (!part) return;
      if (part === "|") { el.appendChild(document.createElement("br")); return; }
      var tag = part[0] === "*" ? "em" : part[0] === "{" ? "mark" : null;
      if (tag) { var n = document.createElement(tag); n.textContent = part.slice(1, -1); el.appendChild(n); }
      else el.appendChild(document.createTextNode(part));
    });
  }

  function setMeta(selector, attr, value) {
    var el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  function apply() {
    document.documentElement.lang = current;
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-rich]").forEach(function (el) { setRich(el, t(el.getAttribute("data-i18n-rich"))); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });

    document.title = t("meta.title");
    setMeta('meta[name="description"]', "content", t("meta.desc"));
    setMeta('meta[property="og:title"]', "content", t("meta.title"));
    setMeta('meta[property="og:description"]', "content", t("meta.desc"));
    setMeta('meta[property="og:site_name"]', "content", site.name);

    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-selected", String(b.getAttribute("data-lang") === current));
    });
    var cur = document.getElementById("langCur");
    if (cur) cur.textContent = current === "uk" ? "UA" : current.toUpperCase();
    var lb = document.getElementById("langBtn");
    // accessible name must contain the visible text ("EN")
    if (cur && lb) lb.setAttribute("aria-label", cur.textContent + " — " + t("lang.label"));
    // Burger label depends on state — let main.js refresh it after the language change.
  }

  function setLang(lang, silent) {
    if (LANGS.indexOf(lang) === -1) lang = "en";
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    apply();
    if (!silent) document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
  }

  function detect() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved && LANGS.indexOf(saved) !== -1) return saved;
    var nav = (navigator.languages || [navigator.language || "en"]);
    for (var i = 0; i < nav.length; i++) {
      var code = String(nav[i]).slice(0, 2).toLowerCase();
      if (LANGS.indexOf(code) !== -1) return code;
    }
    return "en";
  }

  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
  });

  fillContacts();
  current = detect();
  apply();

  window.Soltrail = window.Soltrail || {};
  window.Soltrail.i18n = { t: t, pick: pick, money: money, get lang() { return current; }, get locale() { return LOCALES[current]; } };
})();

/**
 * Lead form: input masks, client validation, anti-XSS / anti-spam, sending to the webhook.
 * Demo mode: if WEBHOOK_URL is empty, data is only logged to the console.
 *
 * Security model (defence in depth):
 *  1. Every text field is WHITELIST-filtered while typing and again before sending
 *     (no < > & / \ ` $ { } [ ] | ^ ~ @ # % * = + _ in free text, no control / zero-width / bidi chars).
 *  2. User input is never inserted into the page as HTML (only textContent).
 *  3. Spam: honeypot, time-trap (too fast = bot), 60 s throttle, URLs forbidden in the comment.
 *  4. The webhook (n8n) must still validate + HTML-escape on its side — never trust the browser.
 */
(function () {
  "use strict";

  var i18n = window.Soltrail.i18n;
  var CFG = window.CONFIG;
  var THROTTLE_KEY = "last_submit_at";
  var MIN_FILL_MS = 3000; // humans need more than 3 s after page load to fill in a form

  var form = document.getElementById("lead-form");
  var submitBtn = document.getElementById("submit-btn");
  var successBox = document.getElementById("form-success");
  var errorBox = document.getElementById("form-error");
  var alertBox = document.getElementById("form-alert");
  var demoNote = document.getElementById("demo-note");
  var againBtn = document.getElementById("again-btn");
  var f = {
    name: document.getElementById("name"),
    phone: document.getElementById("phone"),
    email: document.getElementById("email"),
    tour: document.getElementById("tour"),
    date: document.getElementById("date"),
    guests: document.getElementById("guests"),
    comment: document.getElementById("comment"),
    consent: document.getElementById("consent")
  };

  /* ================= SANITIZERS (whitelists) ================= */

  // Control chars, zero-width and bidi-override characters (used for spoofing / hidden payloads)
  var INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤﻿]/g;

  function base(s) { return String(s == null ? "" : s).normalize("NFKC").replace(INVISIBLE, ""); }

  /** Name: letters (any alphabet), spaces, hyphen, apostrophe. First letter of every word is capitalised. */
  function cleanName(s) {
    s = base(s).replace(/[^\p{L}\p{M}\s'’-]/gu, "").replace(/\s+/g, " ").replace(/^[\s'’-]+/, "").slice(0, 60);
    return s.replace(/(^|[\s'’-])(\p{L})/gu, function (_m, sep, ch) { return sep + ch.toUpperCase(); });
  }

  /** Email: ASCII only, lower-case, a single @. */
  function cleanEmail(s) {
    s = base(s).toLowerCase().replace(/[^a-z0-9._%+@-]/g, "");
    var at = s.indexOf("@");
    if (at !== -1) s = s.slice(0, at + 1) + s.slice(at + 1).replace(/@/g, "");
    return s.slice(0, 254);
  }

  /** Comment: letters, digits, spaces/new lines and PUNCTUATION ONLY. */
  function cleanComment(s) {
    return base(s).replace(/[^\p{L}\p{M}\p{N}\s.,!?:;()'’"«»„“”…–—-]/gu, "")
      .replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").replace(/^\s+/, "").slice(0, 600);
  }

  function cleanGuests(s) { return base(s).replace(/\D/g, "").slice(0, 2); }

  // Country codes with 3 digits (1 and 7 have one digit, all other codes have two)
  var CC3 = "380 375 371 372 373 374 370 353 351 352 358 359 420 421 355 356 357 386 385 381 382 383 387 389 376 377 378 379 971 972 966 995 994 998 996 992 993".split(" ");
  function ccLen(d) {
    if (!d) return 0;
    if (d[0] === "1" || d[0] === "7") return 1;
    return d.length >= 3 && CC3.indexOf(d.slice(0, 3)) !== -1 ? 3 : 2;
  }

  /** digits -> "+CC (OPR) XXX-XX-XX" (extra digits continue as -XX groups; max 15 digits, E.164) */
  function formatPhone(digits) {
    digits = digits.slice(0, 15);
    if (!digits) return "";
    var n = ccLen(digits), cc = digits.slice(0, n), rest = digits.slice(n);
    var out = "+" + cc;
    if (!rest) return out;
    var opLen = cc === "380" ? 2 : 3;
    out += " (" + rest.slice(0, opLen) + (rest.length >= opLen ? ")" : "");
    rest = rest.slice(opLen);
    if (rest) { out += " " + rest.slice(0, 3); rest = rest.slice(3); }
    while (rest) { out += "-" + rest.slice(0, 2); rest = rest.slice(2); }
    return out;
  }

  /* ================= LIVE INPUT FILTERS ================= */

  /** Re-write the field with `fn` while keeping the caret where the user expects it. */
  function liveFilter(el, fn) {
    el.addEventListener("input", function (e) {
      if (e.isComposing) return; // do not break IME input (e.g. Japanese, Chinese)
      var v = el.value, c = el.selectionStart;
      var nv = fn(v);
      if (nv !== v) {
        var nc = fn(v.slice(0, c)).length;
        el.value = nv;
        try { el.setSelectionRange(nc, nc); } catch (err) {}
      }
    });
  }
  liveFilter(f.name, cleanName);
  liveFilter(f.email, cleanEmail);
  liveFilter(f.comment, cleanComment);
  liveFilter(f.guests, cleanGuests);

  // Phone mask: only digits are accepted, punctuation is inserted automatically.
  var prevDigits = "";
  f.phone.addEventListener("input", function (e) {
    if (e.isComposing) return;
    var raw = f.phone.value, caret = f.phone.selectionStart;
    var before = raw.slice(0, caret).replace(/\D/g, "").length;
    var digits = raw.replace(/\D/g, "");
    // Backspace over "(", ")", "-", " " removed no digit: delete the digit before the caret instead
    if (e.inputType && e.inputType.indexOf("delete") === 0 && digits === prevDigits && before > 0) {
      digits = digits.slice(0, before - 1) + digits.slice(before);
      before--;
    }
    digits = digits.slice(0, 15);
    var out = formatPhone(digits);
    f.phone.value = out;
    prevDigits = digits;
    var pos = 0, seen = 0;
    if (before > 0) {
      for (; pos < out.length; pos++) { if (/\d/.test(out[pos]) && ++seen === before) { pos++; break; } }
    }
    try { f.phone.setSelectionRange(pos, pos); } catch (err) {}
  });

  /* ================= VALIDATION ================= */

  function todayISO(plusYears) {
    var d = new Date();
    d.setFullYear(d.getFullYear() + (plusYears || 0));
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  var URL_LIKE = /(https?:|www\.|\b[\w-]+\.(com|net|org|info|biz|xyz|top|click|link|site|online|shop|ru|cn|io|co|me|ly|tk|ml|ga|cf)\b)/i;

  // Each rule returns a translation key when the value is invalid, otherwise "".
  var rules = {
    name: function (v) { return !v ? "e.required" : (v.match(/\p{L}/gu) || []).length < 2 ? "e.name" : ""; },
    phone: function (v) {
      if (!v) return "e.required";
      var n = v.replace(/\D/g, "").length;
      return n >= 10 && n <= 15 ? "" : "e.phone";
    },
    email: function (v) {
      if (!v) return "e.required";
      return /^[a-z0-9]+([._%+-][a-z0-9]+)*@[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*\.[a-z]{2,}$/.test(v) && v.length <= 254 ? "" : "e.email";
    },
    tour: function (v) {
      if (!v || v === "custom") return "";
      return window.TOURS.some(function (t) { return t.id === v; }) ? "" : "e.fix";
    },
    date: function (v) { return !v || (v >= todayISO() && v <= todayISO(2)) ? "" : "e.date"; },
    guests: function (v) { var n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 50 ? "" : "e.guests"; },
    comment: function (v) { return URL_LIKE.test(v) ? "e.link" : ""; },
    consent: function (_v, input) { return input.checked ? "" : "e.consent"; }
  };

  function showError(input, key) {
    var out = document.getElementById("err-" + input.id);
    if (!out) return;
    out.textContent = key ? i18n.t(key) : "";
    out.dataset.key = key || "";
    if (key) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }

  function validateField(input) {
    var rule = rules[input.id];
    if (!rule) return true;
    var key = rule(input.value.trim(), input);
    showError(input, key);
    return !key;
  }

  // Re-translate visible error messages when the language changes.
  document.addEventListener("langchange", function () {
    form.querySelectorAll(".field-error").forEach(function (out) {
      if (out.dataset.key) out.textContent = i18n.t(out.dataset.key);
    });
    if (alertBox.dataset.key) alertBox.textContent = i18n.t(alertBox.dataset.key, { s: alertBox.dataset.s });
    submitBtn.querySelector(".btn-label").textContent = i18n.t(submitBtn.classList.contains("is-loading") ? "f.sending" : "f.submit");
  });

  Object.keys(rules).forEach(function (id) {
    var input = f[id];
    input.addEventListener("blur", function () {
      if (id === "name") input.value = cleanName(input.value).trim();
      if (input.value || input.type === "checkbox" || input.getAttribute("aria-invalid")) validateField(input);
    });
    input.addEventListener(input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input", function () {
      if (input.getAttribute("aria-invalid")) validateField(input);
    });
  });
  f.date.min = todayISO();
  f.date.max = todayISO(2);

  /* ================= HELPERS ================= */

  function setAlert(key, vars) {
    if (!key) { alertBox.hidden = true; alertBox.textContent = ""; delete alertBox.dataset.key; return; }
    alertBox.dataset.key = key;
    alertBox.dataset.s = vars && vars.s != null ? vars.s : "";
    alertBox.textContent = i18n.t(key, vars);
    alertBox.hidden = false;
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.setAttribute("aria-busy", String(on));
    submitBtn.querySelector(".btn-label").textContent = i18n.t(on ? "f.sending" : "f.submit");
  }

  function secondsLeft() {
    var last = 0;
    try { last = parseInt(localStorage.getItem(THROTTLE_KEY), 10) || 0; } catch (e) {}
    return Math.max(0, Math.ceil((last + CFG.MIN_SUBMIT_INTERVAL_MS - Date.now()) / 1000));
  }

  function showSuccess(isDemo) {
    form.hidden = true;
    errorBox.hidden = true;
    demoNote.hidden = !isDemo;
    successBox.hidden = false;
    successBox.focus();
    successBox.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /** Everything is re-sanitized here, so even a tampered DOM cannot send forbidden characters. */
  function buildPayload() {
    var opt = f.tour.options[f.tour.selectedIndex];
    return {
      submittedAt: new Date().toISOString(),
      page: location.origin + location.pathname, // no query string / hash: nothing personal in the URL
      lang: i18n.lang,
      name: cleanName(f.name.value).trim(),
      phone: formatPhone(f.phone.value.replace(/\D/g, "")),
      email: cleanEmail(f.email.value),
      tour: f.tour.value,
      tourTitle: f.tour.value && opt ? base(opt.dataset.title || opt.text).slice(0, 120) : "",
      tripDate: /^\d{4}-\d{2}-\d{2}$/.test(f.date.value) ? f.date.value : "",
      guests: Math.min(50, Math.max(1, parseInt(f.guests.value, 10) || 1)),
      comment: cleanComment(f.comment.value).trim(),
      consent: f.consent.checked === true,
      website: String(document.getElementById("website").value || "").slice(0, 200), // honeypot
      fillTimeMs: Math.round(performance.now())
    };
  }

  /* ================= SUBMIT ================= */

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setAlert(null);
    errorBox.hidden = true;

    var firstBad = null;
    Object.keys(rules).forEach(function (id) {
      if (!validateField(f[id]) && !firstBad) firstBad = f[id];
    });
    if (firstBad) { setAlert("e.fix"); firstBad.focus(); return; }

    var wait = secondsLeft();
    if (wait > 0) { setAlert("e.throttle", { s: wait }); return; }

    var payload = buildPayload();

    // Honeypot filled or form submitted impossibly fast => a bot. Pretend success, send nothing.
    if (payload.website || payload.fillTimeMs < MIN_FILL_MS) { showSuccess(false); return; }

    setLoading(true);

    // ----- DEMO MODE -----
    if (!CFG.WEBHOOK_URL) {
      console.info("[Soltrail demo] WEBHOOK_URL is empty. Lead payload:", payload);
      setTimeout(function () {
        try { localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch (err) {}
        setLoading(false);
        showSuccess(true);
      }, 900);
      return;
    }

    // ----- REAL SEND (n8n webhook) -----
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 15000);
    fetch(CFG.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer"
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        try { localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch (err) {}
        showSuccess(false);
      })
      .catch(function (err) {
        console.error("[Soltrail] Submit failed:", err);
        errorBox.hidden = false;
      })
      .finally(function () { clearTimeout(timer); setLoading(false); });
  });

  againBtn.addEventListener("click", function () {
    form.reset();
    prevDigits = "";
    f.guests.value = 2;
    form.querySelectorAll("[aria-invalid]").forEach(function (n) { n.removeAttribute("aria-invalid"); });
    form.querySelectorAll(".field-error").forEach(function (n) { n.textContent = ""; n.dataset.key = ""; });
    successBox.hidden = true;
    form.hidden = false;
    f.name.focus();
  });
})();

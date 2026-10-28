/**
 * UI behaviour: theme toggle, mobile menu, FAQ accordion, scroll reveal, header shadow.
 */
(function () {
  "use strict";

  var i18n = window.Soltrail.i18n;
  var root = document.documentElement;

  /* ---------- Theme toggle (light / dark) ---------- */
  var themeBtn = document.getElementById("theme-toggle");
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  function syncThemeColor() {
    if (metaTheme) metaTheme.setAttribute("content", root.getAttribute("data-theme") === "dark" ? "#061E26" : "#F7F2E9");
  }
  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncThemeColor();
  });
  syncThemeColor();

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("main-nav");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", i18n.t(open ? "nav.closeMenu" : "nav.openMenu"));
    nav.classList.toggle("is-open", open);
  }
  burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("langchange", function () { setMenu(burger.getAttribute("aria-expanded") === "true"); });
  // While the dropdown is closed on mobile, keep its links out of keyboard order
  var desktopNav = window.matchMedia("(min-width: 881px)");
  function syncInert() { nav.inert = !desktopNav.matches && !nav.classList.contains("is-open"); }
  new MutationObserver(syncInert).observe(nav, { attributes: true, attributeFilter: ["class"] });
  (desktopNav.addEventListener ? desktopNav.addEventListener.bind(desktopNav, "change") : desktopNav.addListener.bind(desktopNav))(syncInert);
  syncInert();
  burger.setAttribute("aria-label", i18n.t("nav.openMenu"));

  /* ---------- Language dropdown ---------- */
  var lang = document.getElementById("lang");
  var langBtn = document.getElementById("langBtn");
  function setLangMenu(open) { lang.classList.toggle("is-open", open); langBtn.setAttribute("aria-expanded", String(open)); }
  langBtn.addEventListener("click", function () { setLangMenu(!lang.classList.contains("is-open")); });
  document.addEventListener("langchange", function () { setLangMenu(false); });
  document.addEventListener("click", function (e) { if (!lang.contains(e.target)) setLangMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (lang.classList.contains("is-open")) { setLangMenu(false); langBtn.focus(); }
    else if (burger.getAttribute("aria-expanded") === "true") { setMenu(false); burger.focus(); }
  });

  /* ---------- Header: scrolled state, cursor spotlight, nav indicator, scroll-spy ---------- */
  var header = document.getElementById("top");
  var bar = header.querySelector(".header__bar");
  bar.addEventListener("pointermove", function (e) {
    var r = bar.getBoundingClientRect();
    bar.style.setProperty("--mx", (e.clientX - r.left) + "px");
    bar.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
  // Bar width/opacity follow scroll with easing, so it widens and narrows smoothly
  var barNow = 0, barTarget = 0, barRaf = 0, MAX_BAR = 1040;
  var barAvail = 0;
  function measureBar() { barAvail = header.clientWidth - 2 * parseFloat(getComputedStyle(header).paddingLeft); applyBar(); }
  function applyBar() {
    if (!barAvail) barAvail = header.clientWidth - 2 * parseFloat(getComputedStyle(header).paddingLeft);
    var target = Math.min(MAX_BAR, barAvail);
    bar.style.maxWidth = (barAvail - (barAvail - target) * barNow).toFixed(1) + "px";
    bar.style.setProperty("--bp", barNow.toFixed(3));
  }
  function easeBar() {
    barNow += (barTarget - barNow) * 0.12;
    if (Math.abs(barTarget - barNow) < 0.002) barNow = barTarget;
    applyBar();
    barRaf = barNow === barTarget ? 0 : requestAnimationFrame(easeBar);
  }
  window.addEventListener("resize", measureBar);
  var ind = nav.querySelector(".nav__ind");
  var links = Array.prototype.slice.call(nav.querySelectorAll("a:not(.btn)"));
  var activeLink = null;
  function moveIndicator(a) {
    if (!a || !desktopNav.matches) { ind.style.opacity = "0"; return; }
    ind.style.setProperty("--x", (a.offsetLeft + 4) + "px");
    ind.style.setProperty("--w", (a.offsetWidth - 8) + "px");
    ind.style.opacity = "1";
  }
  links.forEach(function (a) {
    a.addEventListener("mouseenter", function () { moveIndicator(a); });
    a.addEventListener("focus", function () { moveIndicator(a); });
  });
  nav.addEventListener("mouseleave", function () { moveIndicator(activeLink); });
  window.addEventListener("resize", function () { moveIndicator(activeLink); });
  document.addEventListener("langchange", function () { setTimeout(function () { moveIndicator(activeLink); }, 30); });

  var markers = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });


  /* ---------- Takeoff effect: plane climbs the scroll rail ---------- */
  var rail = document.createElement("div");
  rail.className = "fly-rail"; rail.setAttribute("aria-hidden", "true");
  rail.innerHTML = '<span class="fly-rail__trail"></span><span class="fly-rail__plane"><svg viewBox="0 0 24 24"><path d="M12 1.5c.9 0 1.6.9 1.6 2v6.1l7.900 4.700v2.300l-7.900-2.400v4.800l2.200 1.700v1.800L12 21.500l-3.800 1v-1.800l2.200-1.700v-4.800l-7.900 2.400v-2.300l7.900-4.700V3.500c0-1.100.7-2 1.600-2z"/></svg></span>';
  document.body.appendChild(rail);
  function flyFx(y, vh) {
    var prog = maxScroll > 0 ? Math.max(0, Math.min(1, y / maxScroll)) : 0;
    rail.style.setProperty("--fly", (prog * 100).toFixed(2) + "%");
  }

  /* ---------- Glass background parallax (scroll + pointer) ---------- */
  var glass = document.getElementById("glass-bg");
  // GPU saver: the animated layer under the glass only moves while the visitor is active.
  // Every frame of it forces the frosted panels to re-blur, so it freezes after 4 s of no input.
  var idleTimer = 0;
  function wake() {
    glass.classList.remove("is-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { glass.classList.add("is-idle"); }, 4000);
  }
  ["scroll", "pointermove", "pointerdown", "keydown", "touchstart", "wheel"].forEach(function (ev) {
    window.addEventListener(ev, wake, { passive: true });
  });
  wake();
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener("pointermove", function (e) {
      glass.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      glass.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    }, { passive: true });
  }

  /* ---------- Cascading sticky stack ---------- */
  var stack = Array.prototype.slice.call(document.querySelectorAll("main > section:not(.hero)")); // the hero has its own scroll-driven mode (js/hero.js)
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var STEP = 10; // px of each previous section peeking out above the next one
  var tops = [], nat = [], markerTop = [], maxScroll = 0;
  function layoutStack() {
    var vh = window.innerHeight;
    var base = header.offsetHeight + 6;
    stack.forEach(function (sec, i) {
      // tall sections stick by their BOTTOM edge (negative top) so all content can be read
      var top = Math.min(base + i * STEP, vh - sec.offsetHeight);
      tops[i] = top;
      sec.style.setProperty("--stack-top", top + "px");
    });
    // Cache natural (unstuck) positions once: the anchors in front of each section never stick,
    // so the scroll handler can work with plain arithmetic and never touches layout.
    var sy = window.scrollY;
    stack.forEach(function (sec, i) {
      var a = sec.previousElementSibling;
      nat[i] = a && a.classList.contains("anchor") ? a.getBoundingClientRect().top + sy : 0;
    });
    markerTop = markers.map(function (mk) { return mk ? mk.getBoundingClientRect().top + sy : Infinity; });
    maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    update();
  }
  var lastP = [];
  function update() {
    var vh = window.innerHeight;
    var y = window.scrollY;
    barTarget = Math.max(0, Math.min(1, y / 160));
    if (!barRaf) barRaf = requestAnimationFrame(easeBar);
    if (!reduce.matches) {
      // 1) read all layout first, 2) then write only the values that changed (avoids layout thrashing)
      var ps = stack.map(function (sec, i) {
        if (i === stack.length - 1) return 0;
        var nextTop = Math.max(nat[i + 1] - y, tops[i + 1]); // where the next section is now (sticky clamps it)
        return Math.max(0, Math.min(1, (vh - nextTop) / Math.max(1, vh - Math.max(tops[i], 0))));
      });
      ps.forEach(function (p, i) {
        if (Math.abs(p - (lastP[i] || 0)) > 0.004 || (p === 0) !== (!lastP[i])) {
          stack[i].style.setProperty("--p", p.toFixed(3));
          lastP[i] = p;
        }
      });
      flyFx(y, vh);
      glass.style.setProperty("--sy", y + "px");
    }
    // scroll-spy: last marker above 40% of the viewport
    var found = null;
    markerTop.forEach(function (t, i) { if (t - y <= vh * 0.4) found = links[i]; });
    if (found !== activeLink) {
      links.forEach(function (a) { a.classList.toggle("is-active", a === found); });
      activeLink = found;
      moveIndicator(found);
    }
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); }
  }, { passive: true });
  window.addEventListener("resize", layoutStack);
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(layoutStack);
    stack.forEach(function (sec) { ro.observe(sec); });
  }
  layoutStack();

  /* Pause the footer waves while they are not visible */
  if ("IntersectionObserver" in window) {
    var pauser = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("is-paused", !en.isIntersecting); });
    }, { rootMargin: "100px" });
    [document.querySelector(".footer__waves")].forEach(function (n) { if (n) pauser.observe(n); });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".acc-trigger").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      btn.closest(".acc-item").classList.toggle("is-open", !open);
    });
  });

  /* ---------- Scroll reveal ---------- */
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  function observe(el) {
    if (io) io.observe(el); else el.classList.add("is-visible");
  }
  window.Soltrail.observe = observe;
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    // light stagger for siblings in the same grid
    if (el.matches(".why-card, .review-card")) el.style.setProperty("--delay", (Array.prototype.indexOf.call(el.parentNode.children, el) * 90) + "ms");
    observe(el);
  });
  // Cards rendered by tours.js before this script ran
  document.querySelectorAll("#tour-grid .reveal:not(.is-visible)").forEach(observe);

})();

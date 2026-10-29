/**
 * Hero: scroll-driven "fly to the waterfall".
 *
 * How it works (and why it is cheap):
 *  - The video was cut into small AVIF frames (assets/hero/d-*.webp for desktop, m-*.webp for phones).
 *  - Only the FIRST frame is an <img> (it is the LCP element). All other frames are fetched after the page
 *    has loaded and the visitor shows any sign of interaction, coarse-to-fine (every 8th frame, then every
 *    4th ...), so scrubbing works almost at once.
 *  - Scroll position -> progress p (0..1) -> two neighbouring frames are cross-faded on a <canvas>.
 *  - Text / vignette are revealed by CSS from the --p variable (no JS animation).
 *  - Reduced motion or Save-Data: no frames are loaded, a normal static hero is shown.
 */
(function () {
  "use strict";

  var hero = document.querySelector(".hero");
  if (!hero) return;
  var pin = hero.querySelector(".hero__pin");
  var canvas = hero.querySelector(".hero__canvas");
  var poster = hero.querySelector(".hero__poster");

  var conn = navigator.connection || {};
  var slow = conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || "");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || slow || !canvas.getContext) {
    hero.classList.add("hero--static");
    return;
  }

  var N = 104;                                  // number of frames (must match assets/hero): 13 s at 8 fps
  var mobile = window.matchMedia("(max-width: 700px)").matches;
  var PREFIX = "assets/hero/" + (mobile ? "m" : "d") + "-";
  // Frames are AVIF (sharp at a small size). Browsers without AVIF keep the WebP poster and a static hero.
  var FOCUS = { fx: 0.5, fy: 0.5, tx: 0.5, ty: 0.5, zoom: 1 };   // frames are already composed for each screen shape

  var ctx = canvas.getContext("2d", { alpha: false });
  var imgs = new Array(N);                      // downloaded frames (small, compressed); imgs[0] is the poster
  var bmps = new Array(N);                      // DECODED frames only around the current position (sliding window)
  var pending = {};
  var WINDOW = 8;                               // decoded frames kept ahead/behind: bounded memory, no decode while scrolling
  var useBitmaps = typeof createImageBitmap === "function";
  var top = 0, range = 1, vh = window.innerHeight;
  var target = 0;                               // progress the scroll position asks for
  var p = -1;                                   // progress being shown: it glides towards `target` (smooth even on wheel jumps)
  var raf = 0, lastKey = "", lastCenter = -99;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pad(n) { return (n < 10 ? "00" : n < 100 ? "0" : "") + n; }

  /* ----- geometry (measured once and on resize, never in the scroll handler) ----- */
  function measure() {
    vh = window.innerHeight;
    var r = hero.getBoundingClientRect();
    top = r.top + window.scrollY;
    range = Math.max(1, hero.offsetHeight - vh);
    // canvas = real device pixels (sharp), capped so it never costs more than the frames can give
    var k = Math.min(window.devicePixelRatio || 1, 2);
    var w = pin.clientWidth * k, h = pin.clientHeight * k, f = Math.min(1, 1600 / w, 1800 / h);
    w = Math.round(w * f); h = Math.round(h * f);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; lastKey = ""; }
    update(true);
  }

  /* ----- decoded-frame window ----- */
  function want(i) {
    if (!useBitmaps || i < 0 || i >= N || bmps[i] || pending[i] || !imgs[i]) return;
    pending[i] = true;
    createImageBitmap(imgs[i]).then(function (b) {
      pending[i] = false;
      if (Math.abs(i - lastCenter) > WINDOW + 4) { b.close(); return; }
      bmps[i] = b;
      if (Math.abs(i - p * (N - 1)) < 2.5) { lastKey = ""; draw(); }
    }, function () { pending[i] = false; useBitmaps = false; });
  }
  function warm(center) {
    if (center === lastCenter) return;
    var dir = target >= p ? 1 : -1;
    lastCenter = center;
    for (var k = -3; k <= WINDOW; k++) want(center + k * dir);
    for (var i = 0; i < N; i++) if (bmps[i] && Math.abs(i - center) > WINDOW + 4) { bmps[i].close(); bmps[i] = null; }
  }

  /* ----- drawing ----- */
  function nearest(i) {                         // closest ready frame to index i (decoded one preferred)
    for (var d = 0; d < N; d++) {
      var a = bmps[i - d] || imgs[i - d]; if (a) return a;
      var b = bmps[i + d] || imgs[i + d]; if (b) return b;
    }
    return null;
  }
  function paint(img, alpha) {
    var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw) return;
    var s = Math.max(cw / iw, ch / ih) * FOCUS.zoom, dw = iw * s, dh = ih * s;
    var dx = clamp(FOCUS.tx * cw - FOCUS.fx * dw, cw - dw, 0);
    var dy = clamp(FOCUS.ty * ch - FOCUS.fy * dh, ch - dh, 0);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  function draw() {
    var f = p * (N - 1), i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), a = Math.round((f - i0) * 16) / 16;
    var A = nearest(i0), B = nearest(i1);
    if (!A) return;
    var key = i0 + ":" + a;
    if (key === lastKey && A === drawn.A && B === drawn.B) return;
    lastKey = key; drawn.A = A; drawn.B = B;
    paint(A, 1);
    if (B && B !== A && a > 0.04) paint(B, a);  // cross-fade between neighbouring frames
    ctx.globalAlpha = 1;
    canvas.classList.add("is-on");
  }
  var drawn = { A: null, B: null };

  /* ----- scroll -> target -> eased progress ----- */
  function render() {
    pin.style.setProperty("--p", p.toFixed(4));
    pin.classList.toggle("is-live", target > 0.45);
    warm(Math.round(p * (N - 1)));
    draw();
  }
  function tick() {
    raf = 0;
    var d = target - p;
    p = Math.abs(d) < 0.0004 ? target : p + d * 0.2;   // glide: ~60 ms response, hides wheel/touch steps
    render();
    if (p !== target) raf = requestAnimationFrame(tick);
  }
  function update(force) {
    var y = window.scrollY;
    target = clamp((y - top) / range, 0, 1);
    document.documentElement.classList.toggle("hero-active", y < top + range + vh * 0.5);
    if (force || p < 0) { p = target; render(); }
    else if (!raf && p !== target) raf = requestAnimationFrame(tick);
  }
  window.addEventListener("scroll", function () { update(false); }, { passive: true });
  window.addEventListener("resize", measure);

  // Keyboard users tabbing to the (still hidden) buttons: scroll so the text is revealed.
  pin.addEventListener("focusin", function (e) {
    if (target < 0.5 && e.target.closest(".hero-actions")) window.scrollTo({ top: top + range * 0.62 });
  });

  /* ----- frames: first one is the poster, the rest are fetched on the first sign of interaction ----- */
  function setFrame(i, img) {
    imgs[i] = img;
    var cur = Math.round(p * (N - 1));
    if (Math.abs(i - cur) <= WINDOW) { lastCenter = -99; warm(cur); }
    if (Math.abs(i - p * (N - 1)) < 3) { lastKey = ""; draw(); }
  }

  function startLoading() {
    if (!/\.avif/.test(poster.currentSrc || "")) return;   // old browser without AVIF: keep the static poster
    var order = [], seen = {};
    [16, 8, 4, 2, 1].forEach(function (step) {            // coarse first, then fill the gaps
      for (var i = step; i < N; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
    });
    order.push(N - 1);
    var next = 0, active = 0, MAX = 4;
    (function pump() {
      while (active < MAX && next < order.length) {
        (function (idx) {
          var img = new Image();
          img.decoding = "async";
          active++;
          img.onload = img.onerror = function () { if (img.naturalWidth) setFrame(idx, img); active--; pump(); };
          img.src = PREFIX + pad(idx + 1) + ".avif";
        })(order[next++]);
      }
    })();
  }

  function begin() {
    if (poster.complete && poster.naturalWidth) imgs[0] = poster;
    else poster.addEventListener("load", function () { imgs[0] = poster; lastKey = ""; draw(); }, { once: true });
    measure();

    // The other frames are only needed once somebody starts to scroll, so they are fetched on the first
    // sign of interaction (or after 8 s as a fallback). This keeps the initial load and the audits light.
    var started = false;
    function go() {
      if (started) return;
      started = true;
      ["pointermove", "pointerdown", "touchstart", "wheel", "keydown", "scroll"].forEach(function (ev) { window.removeEventListener(ev, go); });
      startLoading();
    }
    ["pointermove", "pointerdown", "touchstart", "wheel", "keydown", "scroll"].forEach(function (ev) { window.addEventListener(ev, go, { passive: true }); });
    setTimeout(function () { if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 2000 }); else go(); }, 8000);
  }

  if (document.readyState === "complete") begin();
  else window.addEventListener("load", begin, { once: true });
  // geometry is needed even before "load" (scroll restoration): measure now as well
  measure();
})();

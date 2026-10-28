/**
 * Tour catalog: renders cards from data/tours.js, runs HOT countdown timers,
 * removes a tour (card + form option) when its timer ends, and handles "Order".
 */
(function () {
  "use strict";

  var i18n = window.Soltrail.i18n;
  var CFG = window.CONFIG;
  var grid = document.getElementById("tour-grid");
  var select = document.getElementById("tour");
  var firstRender = true;
  var memoryStarts = {}; // fallback when localStorage is unavailable

  /* ---------- HOT timer logic ---------- */

  /** Returns the end timestamp (ms) of a hot offer, or null if the tour is not hot. */
  function hotEnd(tour) {
    if (!tour.hot) return null;
    if (tour.hotUntil) {
      var ts = Date.parse(tour.hotUntil);
      return isNaN(ts) ? null : ts;
    }
    if (tour.hotHours) {
      var key = "hot_v" + CFG.HOT_VERSION + "_" + tour.id;
      var start = null;
      try { start = parseInt(localStorage.getItem(key), 10); } catch (e) {}
      if (!start) start = memoryStarts[key];
      if (!start) {
        start = Date.now();
        memoryStarts[key] = start;
        try { localStorage.setItem(key, String(start)); } catch (e) {}
      }
      return start + tour.hotHours * 3600 * 1000;
    }
    return null;
  }

  function isAlive(tour) {
    if (!tour.hot) return true;
    var end = hotEnd(tour);
    return end === null ? true : end > Date.now();
  }

  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    var p = function (n) { return String(n).padStart(2, "0"); };
    return (d ? d + "d " : "") + p(h) + ":" + p(m) + ":" + p(s);
  }

  /* ---------- DOM helpers ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(inner, cls) {
    var wrap = document.createElement("span");
    wrap.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : "") + ">" + inner + "</svg>";
    return wrap.firstChild;
  }
  var ICON_CLOCK = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
  var ICON_FLAME = '<path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-7 1-10z"/>';

  function buildCard(tour) {
    var li = el("li", "tour-card" + (firstRender ? " reveal" : ""));
    li.dataset.id = tour.id;

    var media = el("div", "tour-media");
    var img = el("img");
    img.src = tour.image;
    // smaller file for phones: "photo.webp" -> also expects "photo-480.webp" next to it
    img.srcset = tour.image.replace(/\.webp$/, "-480.webp") + " 480w, " + tour.image + " 720w";
    img.sizes = "(min-width: 1200px) 380px, (min-width: 768px) 45vw, 92vw";
    img.alt = i18n.pick(tour.alt);
    img.loading = "lazy";
    img.width = 720; img.height = 900; img.decoding = "async";
    media.appendChild(img);

    var badges = el("div", "tour-badge-row");
    var dur = el("span", "chip");
    dur.appendChild(svg(ICON_CLOCK));
    dur.appendChild(document.createTextNode(i18n.pick(tour.duration)));
    badges.appendChild(dur);
    if (tour.hot) {
      var hot = el("span", "chip chip-hot");
      hot.appendChild(svg(ICON_FLAME));
      hot.appendChild(document.createTextNode(i18n.t("tour.hot")));
      badges.appendChild(hot);
    }
    media.appendChild(badges);

    var body = el("div", "tour-body");
    body.appendChild(el("p", "tour-place", i18n.pick(tour.place)));
    body.appendChild(el("h3", null, i18n.pick(tour.title)));
    body.appendChild(el("p", "tour-desc", i18n.pick(tour.desc)));

    if (tour.hot && hotEnd(tour) !== null) {
      var box = el("div", "tour-timer");
      box.appendChild(el("span", null, i18n.t("tour.endsIn")));
      var time = el("time", null, "--:--:--");
      time.setAttribute("role", "timer");
      time.dataset.timerFor = tour.id;
      box.appendChild(time);
      body.appendChild(box);
    }

    var foot = el("div", "tour-foot");
    var price = el("div", "price");
    price.appendChild(el("small", null, i18n.t("tour.from") + " · " + i18n.t("tour.pp")));
    price.appendChild(el("strong", null, i18n.money(tour.price)));
    if (tour.oldPrice) price.appendChild(el("s", null, i18n.money(tour.oldPrice)));
    foot.appendChild(price);

    var btn = el("button", "btn btn-cta", i18n.t("tour.order"));
    btn.type = "button";
    btn.setAttribute("aria-label", i18n.t("tour.order") + ": " + i18n.pick(tour.title));
    btn.addEventListener("click", function () { order(tour.id); });
    foot.appendChild(btn);
    body.appendChild(foot);

    li.appendChild(media);
    li.appendChild(body);
    return li;
  }

  /* ---------- render ---------- */

  function liveTours() { return window.TOURS.filter(isAlive); }

  function render() {
    grid.textContent = "";
    liveTours().forEach(function (tour, i) {
      var card = buildCard(tour);
      if (firstRender) card.style.setProperty("--delay", (i % 3) * 90 + "ms");
      grid.appendChild(card);
      if (firstRender && window.Soltrail.observe) window.Soltrail.observe(card);
    });
    firstRender = false;
    fillSelect();
    tick();
  }

  function fillSelect() {
    var prev = select.value;
    select.textContent = "";
    var first = new Option(i18n.t("f.tour.choose"), "");
    select.appendChild(first);
    liveTours().forEach(function (tour) {
      var opt = new Option(i18n.pick(tour.title) + " — " + i18n.pick(tour.duration), tour.id);
      opt.dataset.title = i18n.pick(tour.title);
      select.appendChild(opt);
    });
    select.appendChild(new Option(i18n.t("f.tour.custom"), "custom"));
    if (prev && select.querySelector('option[value="' + prev + '"]')) select.value = prev;
  }

  /* ---------- timers ---------- */

  function removeCard(id) {
    var card = grid.querySelector('.tour-card[data-id="' + id + '"]');
    if (card) {
      card.classList.add("is-leaving");
      setTimeout(function () { card.remove(); }, 650);
    }
    fillSelect();
  }

  function tick() {
    window.TOURS.forEach(function (tour) {
      if (!tour.hot) return;
      var end = hotEnd(tour);
      if (end === null) return;
      var left = end - Date.now();
      var node = grid.querySelector('time[data-timer-for="' + tour.id + '"]');
      if (!node) return;
      if (left <= 0) { removeCard(tour.id); }
      else { node.textContent = fmt(left); }
    });
  }

  /* ---------- "Order" button: prefill select + scroll to form ---------- */

  function order(id) {
    select.value = id;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    var target = document.getElementById("contact");
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setTimeout(function () {
      var name = document.getElementById("name");
      if (name) name.focus({ preventScroll: true });
    }, 650);
  }

  document.addEventListener("langchange", render);
  render();
  setInterval(tick, 1000);
})();

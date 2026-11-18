// Shared behaviour for the catalog and sample pages. No dependencies.
(function () {
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  // Icon markup for scripts: MB.icon("check") → <svg><use href="#i-check"/></svg> (symbols live in icons.svg).
  window.MB = {
    icon: function (name, cls) { return '<svg class="i ' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  };

  // Personalise when opened from an outreach email (?c=Company&ref=domain), and keep it across pages.
  var q = new URLSearchParams(location.search);
  var company = (q.get("c") || "").slice(0, 80);
  try {
    if (company) sessionStorage.setItem("mb_company", company);
    else company = sessionStorage.getItem("mb_company") || "";
  } catch (e) { /* storage blocked: personalise this page only */ }
  if (company) {
    document.querySelectorAll("[data-for]").forEach(function (el) { el.textContent = "Prepared for " + company; });
    document.querySelectorAll("[data-company]").forEach(function (el) { el.textContent = company; });
  }

  // Highlight the services the email recommended (?s=id1,id2).
  (q.get("s") || "").split(",").forEach(function (id) {
    var el = id && document.getElementById(id);
    if (el && el.classList.contains("svc")) el.classList.add("hi");
  });

  // Fade sections in as they scroll into view (they're visible without JS).
  var items = document.querySelectorAll(".reveal");
  if (hasIO && !still) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  // Count numbers up: <b data-count="214" data-from="0" data-suf="%">214</b>
  function count(el) {
    var raw = el.getAttribute("data-count"), end = parseFloat(raw), from = parseFloat(el.getAttribute("data-from") || "0");
    var dec = (raw.split(".")[1] || "").length, pre = el.getAttribute("data-pre") || "", suf = el.getAttribute("data-suf") || "", t0 = null;
    function fmt(v) { return pre + v.toLocaleString("en-MY", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; }
    if (still) { el.textContent = fmt(end); return; }
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 1400), v = from + (end - from) * (1 - Math.pow(1 - p, 3));
      el.textContent = fmt(v);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  MB.count = count;
  var counters = [].filter.call(document.querySelectorAll("[data-count]"), function (el) { return !el.closest(".ex-pane"); });
  if (hasIO) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { count(e.target); co.unobserve(e.target); } });
    });
    counters.forEach(function (el) { co.observe(el); });
  }

  // Fill horizontal bars when visible: <div class="t"><b data-w="72"></b></div>
  var bars = document.querySelectorAll("[data-w]");
  if (hasIO) {
    var bo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.style.width = e.target.getAttribute("data-w") + "%"; bo.unobserve(e.target); } });
    });
    bars.forEach(function (el) { bo.observe(el); });
  } else {
    bars.forEach(function (el) { el.style.width = el.getAttribute("data-w") + "%"; });
  }

  // Service explorer: click a service to preview it; plays through them on its own until someone clicks.
  var ex = document.querySelector("[data-explorer]");
  if (ex) {
    var tabs = [].slice.call(ex.querySelectorAll(".ex-item")), panes = [].slice.call(ex.querySelectorAll(".ex-pane"));
    var open = ex.querySelector("[data-open]"), addr = ex.querySelector("[data-addr]");
    var cur = 0, timer = null, auto = !still, visible = false, hover = false, DWELL = 7000;
    function show(i) {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) { t.setAttribute("aria-selected", k === cur ? "true" : "false"); t.classList.remove("timing"); });
      panes.forEach(function (p, k) { p.hidden = k !== cur; p.classList.remove("on"); });
      var pane = panes[cur];
      void pane.offsetWidth; pane.classList.add("on");
      pane.querySelectorAll("[data-count]").forEach(count);
      var name = pane.getAttribute("data-name");
      if (addr) addr.textContent = "sample · " + name;
      if (open) {
        open.href = tabs[cur].getAttribute("data-href");
        open.firstChild.textContent = "Open the full " + name + " sample";
      }
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      var t = tabs[cur];
      t.classList.remove("timing");
      if (!auto || !visible || hover) return;
      void t.offsetWidth; t.style.setProperty("--t", DWELL + "ms"); t.classList.add("timing");
      timer = setTimeout(function () { show(cur + 1); }, DWELL);
    }
    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () { auto = false; show(k); });
      t.addEventListener("keydown", function (e) {
        var d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); auto = false; show(cur + d); tabs[cur].focus(); }
      });
    });
    ex.addEventListener("mouseenter", function () { hover = true; schedule(); });
    ex.addEventListener("mouseleave", function () { hover = false; schedule(); });
    var started = false;
    if (hasIO) {
      // Replay the first preview when the explorer first scrolls into view, then start the auto-play.
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !started) { started = true; show(cur); } else schedule();
      }, { threshold: 0.35 }).observe(ex);
    }
  }

  // Year in footer.
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

/* ext.js —— 复习计数 / 掌握状态 / 文字高亮 / 断点续读
 * 依赖：无（不强依赖 app.js；只在需要 U.esc 时退化为原生）
 * 页面约定：正文条目带 data-xid="前缀:id"；body[data-page] 作为页键。
 */
(function () {
  "use strict";

  var PAGE = (document.body && document.body.getAttribute("data-page")) || (location.pathname.split("/").pop() || "page");
  function pageKey() { return window.EXT_PAGE_KEY || PAGE; }
  var K_REP = "ds432.rep", K_HL = "ds432.hl", K_POS = "ds432.pos";

  function load(k) { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; } }
  function persist(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    if (k !== K_POS) {
      try { window.dispatchEvent(new CustomEvent("ds432:ext-change", { detail: k })); } catch (e) {}
    }
  }

  var REP = load(K_REP), HL = load(K_HL), POS = load(K_POS);

  /* ---------------- 调试 ---------------- */
  var DEBUG = /[?&]xdebug/.test(location.search);
  function err(msg) {
    if (!DEBUG) return;
    var d = document.getElementById("xerr");
    if (!d) {
      d = document.createElement("div"); d.id = "xerr"; document.body.appendChild(d);
    }
    d.style.display = "block";
    d.textContent += msg + "\n";
  }
  window.addEventListener("error", function (e) { err("ERR " + (e.message || "") + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno); });

  /* ---------------- 复习记录 ---------------- */
  var STATE_TXT = ["未掌握", "学习中", "已掌握"];
  var STATE_CLS = ["", "m1", "m2"];

  function rec(xid) { return REP[xid] || { n: 0, t: 0, m: 0 }; }
  function setRec(xid, o) { REP[xid] = o; persist(K_REP, REP); }
  function fmtDate(t) {
    if (!t) return "未记";
    var d = new Date(t);
    return (d.getMonth() + 1) + "-" + d.getDate();
  }

  /* ---------------- DOM 工具 ---------------- */
  function collectTextNodes(root) {
    var out = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        while (p && p !== root) {
          if (p.classList && (p.classList.contains("xbar") || p.classList.contains("xsum"))) return NodeFilter.FILTER_REJECT;
          if (p.tagName === "SCRIPT" || p.tagName === "STYLE") return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n, pos = 0;
    while ((n = walker.nextNode())) {
      var len = n.nodeValue.length;
      out.push({ node: n, start: pos, end: pos + len });
      pos += len;
    }
    return out;
  }

  function offsetOf(root, node, off) {
    var nodes = collectTextNodes(root);
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].node === node) return nodes[i].start + off;
    }
    return -1;
  }

  /* ---------------- 高亮 ---------------- */
  function applyHL(root, list) {
    // 先清掉旧的 mark（重新渲染后一般没有，但保险）
    Array.prototype.forEach.call(root.querySelectorAll("mark.xhl"), function (m) {
      var t = document.createTextNode(m.textContent);
      m.parentNode.replaceChild(t, m);
    });
    if (root.normalize) root.normalize();
    if (!list || !list.length) return;
    var sorted = list.slice().sort(function (a, b) { return b.s - a.s; });
    sorted.forEach(function (r) {
      var nodes = collectTextNodes(root);
      var segs = nodes.filter(function (n) { return n.end > r.s && n.start < r.e; });
      if (!segs.length) return;
      segs.reverse().forEach(function (n) {
        var a = Math.max(r.s, n.start) - n.start;
        var b = Math.min(r.e, n.end) - n.start;
        if (b <= a) return;
        var t = n.node;
        try {
          if (a > 0) t = t.splitText(a);
          if (b - a < t.length) t.splitText(b - a);
          var mk = document.createElement("mark");
          mk.className = "xhl"; mk.setAttribute("data-hid", r.i);
          t.parentNode.replaceChild(mk, t);
          mk.appendChild(t);
        } catch (e) { err("HL " + e.message); }
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll("mark.xhl"), function (mk) {
      mk.title = "点击取消这处高亮";
    });
  }

  var hlBar, pendingSel = null;
  function ensureBar() {
    if (hlBar) return hlBar;
    hlBar = document.createElement("div");
    hlBar.id = "xhlbar";
    hlBar.innerHTML = '<button data-h="hl">高亮</button><button data-h="del" class="xdel">取消高亮</button>';
    document.body.appendChild(hlBar);
    hlBar.addEventListener("mousedown", function (e) { e.preventDefault(); });
    hlBar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-h]"); if (!b || !pendingSel) return;
      if (b.getAttribute("data-h") === "hl") doHighlight();
      else doUnhighlight();
      hideBar();
    });
    return hlBar;
  }
  function hideBar() { if (hlBar) hlBar.style.display = "none"; pendingSel = null; }

  function currentSelection() {
    var s = window.getSelection();
    if (!s || s.isCollapsed || s.rangeCount === 0) return null;
    var r = s.getRangeAt(0);
    var host = r.commonAncestorContainer;
    if (host.nodeType === 1) host = host; else host = host.parentNode;
    var item = host && host.closest ? host.closest("[data-xid]") : null;
    if (!item) return null;
    var a = offsetOf(item, r.startContainer, r.startOffset);
    var b = offsetOf(item, r.endContainer, r.endOffset);
    if (a < 0 || b < 0 || b <= a) return null;
    return { item: item, xid: item.getAttribute("data-xid"), s: a, e: b, q: (s.toString() || "").slice(0, 120) };
  }

  function doHighlight() {
    var sel = currentSelection();
    if (!sel) return;
    var list = HL[sel.xid] || (HL[sel.xid] = []);
    var id = "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    list.push({ i: id, s: sel.s, e: sel.e, q: sel.q, t: Date.now() });
    HL[sel.xid] = list; persist(K_HL, HL);
    applyHL(sel.item, list);
    window.getSelection().removeAllRanges();
  }

  function doUnhighlight() {
    var s = window.getSelection();
    if (s && s.rangeCount && !s.isCollapsed) {
      var r = s.getRangeAt(0);
      var host = r.commonAncestorContainer;
      if (host.nodeType !== 1) host = host.parentNode;
      var item = host && host.closest ? host.closest("[data-xid]") : null;
      if (item) {
        var xid = item.getAttribute("data-xid");
        var a = offsetOf(item, r.startContainer, r.startOffset);
        var b = offsetOf(item, r.endContainer, r.endOffset);
        var list = (HL[xid] || []).filter(function (x) { return !(x.s < b && x.e > a); });
        HL[xid] = list; persist(K_HL, HL);
        renderItem(item, xid);
        window.getSelection().removeAllRanges();
        return;
      }
    }
    // 没选中：把光标所在的那处 mark 去掉
    var node = s && s.anchorNode;
    var p = node && node.nodeType === 3 ? node.parentNode : node;
    var mk = p && p.closest ? p.closest("mark.xhl") : null;
    if (mk) {
      var it = mk.closest("[data-xid]"); if (!it) return;
      var xid2 = it.getAttribute("data-xid"), hid = mk.getAttribute("data-hid");
      HL[xid2] = (HL[xid2] || []).filter(function (x) { return x.i !== hid; });
      persist(K_HL, HL); renderItem(it, xid2);
    }
  }

  document.addEventListener("mouseup", function (e) {
    if (e.target.closest && e.target.closest("#xhlbar")) return;
    setTimeout(function () {
      var sel = currentSelection();
      if (!sel) { hideBar(); return; }
      var r = window.getSelection().getRangeAt(0).getBoundingClientRect();
      pendingSel = sel;
      var bar = ensureBar();
      bar.style.display = "flex";
      var w = bar.offsetWidth || 150;
      var left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
      bar.style.left = left + "px";
      bar.style.top = Math.max(8, r.top - 42) + "px";
    }, 10);
  });
  document.addEventListener("touchend", function (e) {
    if (e.target.closest && e.target.closest("#xhlbar")) return;
    setTimeout(function () {
      var sel = currentSelection();
      if (!sel) { hideBar(); return; }
      var rects = window.getSelection().getRangeAt(0).getClientRects();
      var r = rects.length ? rects[rects.length - 1] : window.getSelection().getRangeAt(0).getBoundingClientRect();
      pendingSel = sel;
      var bar = ensureBar();
      bar.style.display = "flex";
      var w = bar.offsetWidth || 150;
      bar.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)) + "px";
      bar.style.top = Math.max(8, r.top - 52) + "px";
    }, 320);
  }, { passive: true });
  document.addEventListener("scroll", function () { hideBar(); }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideBar(); });

  /* ---------------- 条目渲染 ---------------- */
  function buildBar(item, xid) {
    var r = rec(xid);
    var bar = document.createElement("div");
    bar.className = "xbar";
    bar.innerHTML =
      '<span>复习</span><span class="xcount">' + r.n + '</span><span>次</span>' +
      '<button data-x="inc">+1 复习</button>' +
      '<button data-x="dec" title="少算一次">−1</button>' +
      '<span class="xstate ' + STATE_CLS[r.m] + '">' + STATE_TXT[r.m] + '</span>' +
      '<button data-x="m" class="xm' + (r.m === 2 ? " on" : "") + '">' + (r.m === 2 ? "✓ 已掌握" : "标为掌握") + '</button>' +
      '<span style="margin-left:auto;color:#9aa4b2">上次 ' + fmtDate(r.t) + '</span>';
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-x]"); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var cur = rec(xid);
      var act = b.getAttribute("data-x");
      if (act === "inc") { cur.n += 1; cur.t = Date.now(); if (cur.m === 0) cur.m = 1; }
      if (act === "dec") { cur.n = Math.max(0, cur.n - 1); }
      if (act === "m") { cur.m = (cur.m + 1) % 3; if (cur.m === 2 && !cur.n) cur.n = 1; cur.t = Date.now(); }
      setRec(xid, cur);
      renderItem(item, xid);
      updateSum();
    });
    var hd = item.querySelector(".hdline");
    if (item.tagName === "DETAILS") {
      var body = item.querySelector(".body") || item;
      body.insertBefore(bar, body.firstChild);
    } else if (hd) {
      hd.insertAdjacentElement("afterend", bar);
    } else {
      item.appendChild(bar);
    }
  }

  function renderItem(item, xid) {
    applyHL(item, HL[xid] || []);
    Array.prototype.forEach.call(item.querySelectorAll(".xbar"), function (b) { b.remove(); });
    buildBar(item, xid);
    var r = rec(xid);
    item.classList.toggle("is-m2", r.m === 2);
    item.classList.toggle("is-untouched", !r.n && !r.m);
  }

  /* ---------------- 汇总条 ---------------- */
  var sumEl = null;
  function sumHost() {
    var c = document.getElementById("tree") || document.getElementById("list") || document.getElementById("view");
    return c;
  }
  function ensureSum() {
    var host = sumHost(); if (!host) return null;
    if (sumEl && document.body.contains(sumEl)) return sumEl;
    sumEl = document.createElement("div");
    sumEl.className = "xsum";
    host.parentNode.insertBefore(sumEl, host);
    sumEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-f]"); if (!b) return;
      var f = b.getAttribute("data-f");
      document.body.classList.remove("xhide-mastered", "xhide-undone");
      if (f === "unmastered") document.body.classList.add("xhide-mastered");
      if (f === "undone") document.body.classList.add("xhide-undone");
      Array.prototype.forEach.call(sumEl.querySelectorAll("[data-f]"), function (x) {
        x.classList.toggle("on", x.getAttribute("data-f") === f);
      });
    });
    return sumEl;
  }
  function updateSum() {
    var host = sumHost(); if (!host) return;
    var s = ensureSum(); if (!s) return;
    var items = host.querySelectorAll("[data-xid]");
    var m2 = 0, m1 = 0, n = 0, tot = items.length;
    Array.prototype.forEach.call(items, function (el) {
      var r = rec(el.getAttribute("data-xid"));
      if (r.m === 2) m2++; else if (r.m === 1) m1++;
      n += r.n || 0;
    });
    s.innerHTML = '本页 <b>' + tot + '</b> 条 · 已掌握 <b>' + m2 + '</b> · 学习中 <b>' + m1 + '</b> · 复习合计 <b>' + n + '</b> 次' +
      '<span class="xf"><button data-f="all" class="on">全部</button>' +
      '<button data-f="unmastered">只看未掌握</button>' +
      '<button data-f="undone">只看没复习过</button></span>';
  }

  /* ---------------- 断点续读 ---------------- */
  var saveTimer;
  function firstVisibleXid() {
    var items = document.querySelectorAll("[data-xid]");
    for (var i = 0; i < items.length; i++) {
      var r = items[i].getBoundingClientRect();
      if (r.bottom > 80 && r.top < window.innerHeight * 0.6) return items[i].getAttribute("data-xid");
    }
    return "";
  }
  function savePos() {
    POS[pageKey()] = { y: Math.round(window.pageYOffset || document.documentElement.scrollTop || 0), anchor: firstVisibleXid(), t: Date.now() };
    persist(K_POS, POS);
  }
  window.addEventListener("scroll", function () {
    clearTimeout(saveTimer); saveTimer = setTimeout(savePos, 450);
  }, { passive: true });
  window.addEventListener("beforeunload", savePos);

  function restorePos() {
    var p = POS[pageKey()]; if (!p) return;
    var y = p.y || 0;
    if (p.anchor) {
      var el = document.querySelector('[data-xid="' + p.anchor + '"]');
      if (el) {
        var r = el.getBoundingClientRect();
        var cur = window.pageYOffset || 0;
        var drift = Math.abs(r.top + cur - y);
        if (drift > 320) { el.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); return; }
      }
    }
    window.scrollTo(0, y);
  }

  /* ---------------- 扫描 ---------------- */
  function scan() {
    var items = document.querySelectorAll("[data-xid]");
    Array.prototype.forEach.call(items, function (el) {
      var xid = el.getAttribute("data-xid");
      var sig = JSON.stringify(HL[xid] || []);
      var done = el.getAttribute("data-xdone") === "1"
        && el.getAttribute("data-xsig") === sig
        && el.querySelector(".xbar");
      // 高亮记录非空时必须确实存在 mark，否则说明被重渲染抹掉了 → 重画
      if (done && (!sig || sig === "[]" || el.querySelector("mark.xhl"))) {
        var r = rec(xid);
        el.classList.toggle("is-m2", r.m === 2);
        el.classList.toggle("is-untouched", !r.n && !r.m);
        return;
      }
      el.setAttribute("data-xdone", "1");
      el.setAttribute("data-xsig", sig);
      renderItem(el, xid);
    });
    updateSum();
  }

  var moTimer;
  function observe() {
    var host = sumHost(); if (!host) return;
    var mo = new MutationObserver(function () {
      clearTimeout(moTimer);
      moTimer = setTimeout(function () { scan(); }, 220);
    });
    mo.observe(host, { childList: true, subtree: true });
  }

  function boot() {
    scan();
    observe();
    setTimeout(function () { restorePos(); scan(); }, 120);
    setTimeout(function () { restorePos(); }, 700);
    document.addEventListener("DOMContentLoaded", scan);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.EXT = {
    rep: REP, hl: HL, pos: POS,
    state: function () { return { page: PAGE, rep: REP, hl: HL, pos: POS }; },
    clearPage: function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-xid]"), function (el) {
        var xid = el.getAttribute("data-xid"); delete REP[xid]; delete HL[xid];
      });
      delete POS[pageKey()];
      persist(K_REP, REP); persist(K_HL, HL); persist(K_POS, POS);
      location.reload();
    },
    scan: scan, savePos: savePos, restorePos: restorePos,
    setPage: function (k) { window.EXT_PAGE_KEY = k; },
    rescan: function () { scan(); },
    onRender: function (k) { if (k) window.EXT_PAGE_KEY = k; scan(); setTimeout(restorePos, 60); }
  };
})();

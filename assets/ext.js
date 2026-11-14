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

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function addDays(s, n) {
    var p = String(s).split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return todayStr(d);
  }

  function rec(xid) {
    var r = REP[xid] || {};
    if (typeof r.n !== "number") r.n = 0;
    if (typeof r.m !== "number") r.m = 0;
    if (!r.t) r.t = 0;
    if (typeof r.ef !== "number") r.ef = 2.5;
    if (typeof r.iv !== "number") r.iv = 0;
    if (typeof r.lp !== "number") r.lp = 0;
    if (!r.due) r.due = todayStr();      // 从没复习过 → 今天到期
    return r;
  }
  function setRec(xid, o) { REP[xid] = o; persist(K_REP, REP); }
  function isDue(r) { return !r.off && (!r.due || r.due <= todayStr()); }

  // 三档评分：忘记 / 模糊 / 熟悉 → 不同间隔
  function gradeRec(xid, g) {
    var r = rec(xid), T = todayStr();
    r.n += 1; r.t = Date.now();
    if (g === "again") {                        // 忘记：当天再来，难度上调
      r.lp += 1; r.ef = Math.max(1.3, r.ef - 0.2);
      r.iv = 0; r.due = T; r.m = 0;
    } else if (g === "fuzzy") {                 // 模糊：短间隔 +20%
      r.ef = Math.max(1.3, r.ef - 0.05);
      r.iv = r.iv <= 0 ? 1 : Math.max(1, Math.round(r.iv * 1.2));
      r.due = addDays(T, r.iv); r.m = 1;
    } else {                                    // 熟悉：长间隔 ×EF
      r.ef = Math.min(3.0, r.ef + 0.1);
      r.iv = r.iv <= 0 ? 3 : (r.iv <= 3 ? 7 : Math.round(r.iv * r.ef));
      r.due = addDays(T, r.iv); r.m = 2;
    }
    setRec(xid, r);
    return r;
  }
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
    var dueTxt = r.off ? "已移出复习" : (isDue(r) ? "今天到期" : ("下次 " + r.due));
    var tail = '<span style="margin-left:auto;color:#9aa4b2">' + (r.iv ? ("间隔 " + r.iv + " 天") : "未排期") + ' · 上次 ' + fmtDate(r.t) + '</span>';
    bar.className = "xbar" + (r.off ? " is-off" : "");
    bar.innerHTML = r.off
      ? ('<span>已复习</span><span class="xcount">' + r.n + '</span><span>次</span>' +
         '<span class="xstate xoffstate">不复习</span>' +
         '<span class="xdue">' + dueTxt + '</span>' +
         '<button data-x="on" class="xg xon" title="重新加入复习循环">恢复复习</button>' + tail)
      : ('<span>已复习</span><span class="xcount">' + r.n + '</span><span>次</span>' +
         '<button data-x="again" class="xg again" title="忘了：今天再来一遍">忘记</button>' +
         '<button data-x="fuzzy" class="xg fuzzy" title="模糊：短间隔再来">模糊</button>' +
         '<button data-x="known" class="xg known" title="熟悉：拉长间隔">熟悉</button>' +
         '<span class="xstate ' + STATE_CLS[r.m] + '">' + STATE_TXT[r.m] + '</span>' +
         '<span class="xdue">' + dueTxt + '</span>' +
         '<button data-x="off" class="xg xoffbtn" title="这个知识点不用再复习了">不复习</button>' + tail);
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-x]"); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var g = b.getAttribute("data-x");
      if (g === "off" || g === "on") {
        var rr = rec(xid);
        if (g === "off") { rr.off = 1; }
        else { delete rr.off; rr.due = todayStr(); }
        setRec(xid, rr);
      } else {
        var rr2 = rec(xid); delete rr2.off; setRec(xid, rr2);
        gradeRec(xid, g);
      }
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
    item.classList.toggle("is-due", isDue(r));
    item.classList.toggle("is-off", !!r.off);
    if (CLOZE) clozeApply(item);
    if (PEEK) peekApply(item);
  }

  /* ---------------- 到期 / 挖空 / 首字 ---------------- */
  var CLOZE = false, PEEK = false;

  function dueCount() {
    var host = sumHost(); if (!host) return 0;
    var c = 0;
    Array.prototype.forEach.call(host.querySelectorAll("[data-xid]"), function (el) {
      if (isDue(rec(el.getAttribute("data-xid")))) c++;
    });
    return c;
  }

  // 把一个条目里的原始 HTML 备份一次，便于关掉开关时还原
  function backup(el) {
    if (!el.getAttribute("data-xorig")) el.setAttribute("data-xorig", el.innerHTML);
  }
  function restoreAll() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-xorig]"), function (el) {
      el.innerHTML = el.getAttribute("data-xorig");
      el.removeAttribute("data-xorig");
    });
  }

  // 挖空：把段落里渲染好的公式（KaTeX 节点）与百分数变成 ____，点击揭示
  var CB = {}, cbn = 0;
  function clozeApply(item) {
    Array.prototype.forEach.call(item.querySelectorAll(".tx p, .tx3 p, .keyline"), function (el) {
      if (el.querySelector(".xcl")) return;
      var ks = Array.prototype.filter.call(el.querySelectorAll(".katex"), function (k) {
        return !(k.parentNode && k.parentNode.closest && k.parentNode.closest(".katex"));
      });
      if (!ks.length) return;
      backup(el);
      ks.forEach(function (k) {
        var id = "c" + (++cbn);
        CB[id] = k.outerHTML;
        var s = document.createElement("span");
        s.className = "xcl";
        s.setAttribute("data-k", id);
        s.textContent = "____";
        k.parentNode.replaceChild(s, k);
      });
    });
  }

  // 首字提示：只留前 6 个字，点击展开
  function peekApply(item) {
    Array.prototype.forEach.call(item.querySelectorAll(".tx3 p, .tx p, .keyline"), function (el) {
      if (el.querySelector(".xpkg")) return;
      backup(el);
      var txt = el.textContent.replace(/\s+/g, " ").trim();
      if (txt.length < 18) return;
      el.innerHTML = '<span class="xpkg" title="点击展开">' + txt.slice(0, 6) + '……</span>';
    });
  }

  // 揭示
  document.addEventListener("click", function (e) {
    var c = e.target.closest(".xcl");
    if (c) {
      e.preventDefault(); e.stopPropagation();
      var kid = c.getAttribute("data-k");
      if (kid && CB[kid]) {
        var box = document.createElement("span");
        box.innerHTML = CB[kid];
        c.parentNode.replaceChild(box.firstChild, c);
        return;
      }
      var v = c.getAttribute("data-v");
      if (v) { c.textContent = decodeURIComponent(v); c.classList.add("on"); }
      return;
    }
    var p = e.target.closest(".xpkg");
    if (p) {
      e.preventDefault(); e.stopPropagation();
      var box = p.parentNode;
      box.innerHTML = box.getAttribute("data-xorig") || p.textContent;
      return;
    }
  }, true);

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
      var sw = e.target.closest("[data-t]");
      if (sw) {
        var k = sw.getAttribute("data-t");
        if (k === "flash") { location.href = "flash.html?src=" + (PAGE.indexOf("chapters") >= 0 ? "chapters" : (PAGE.indexOf("concepts") >= 0 ? "concepts" : "all")); return; }
        if (k === "cloze") { CLOZE = !CLOZE; if (CLOZE) PEEK = false; }
        if (k === "peek") { PEEK = !PEEK; if (PEEK) CLOZE = false; }
        restoreAll();
        // 开关变化要重绘所有条目（scan 默认跳过已处理的），只清 xdone，不丢高亮签名
        Array.prototype.forEach.call(document.querySelectorAll("[data-xid]"), function (el) {
          el.removeAttribute("data-xdone");
          el.removeAttribute("data-xsig");
        });
        scan();
        updateSum();
        return;
      }
      var b = e.target.closest("[data-f]"); if (!b) return;
      var f = b.getAttribute("data-f");
      document.body.classList.remove("xhide-mastered", "xhide-undone", "xdue", "xoff");
      if (f === "unmastered") document.body.classList.add("xhide-mastered");
      if (f === "undone") document.body.classList.add("xhide-undone");
      if (f === "due") document.body.classList.add("xdue");
      if (f === "off") document.body.classList.add("xoff");
      Array.prototype.forEach.call(sumEl.querySelectorAll("[data-f]"), function (x) {
        x.classList.toggle("on", x.getAttribute("data-f") === f);
      });
      return;
    });
    return sumEl;
  }
  function updateSum() {
    var host = sumHost(); if (!host) return;
    var s = ensureSum(); if (!s) return;
    var items = host.querySelectorAll("[data-xid]");
    var m2 = 0, m1 = 0, n = 0, tot = items.length, noff = 0;
    Array.prototype.forEach.call(items, function (el) {
      var r = rec(el.getAttribute("data-xid"));
      if (r.off) noff++;
      if (r.m === 2) m2++; else if (r.m === 1) m1++;
      n += r.n || 0;
    });
    var dc = 0;
    Array.prototype.forEach.call(items, function (el) {
      if (isDue(rec(el.getAttribute("data-xid")))) dc++;
    });
    s.innerHTML = '本页 <b>' + tot + '</b> 条 · 已掌握 <b>' + m2 + '</b> · 学习中 <b>' + m1 + '</b> · 今日到期 <b class="xd">' + dc + '</b>' +
      '<span class="xf"><button data-f="all" class="on">全部</button>' +
      '<button data-f="due">今日到期 ' + dc + '</button>' +
      '<button data-f="unmastered">只看未掌握</button>' +
      '<button data-f="undone">只看没复习过</button>' +
      (noff ? '<button data-f="off">只看不复习 ' + noff + '</button>' : '') +
      '<button data-t="cloze" class="xt' + (CLOZE ? " on" : "") + '">挖空</button>' +
      '<button data-t="peek" class="xt' + (PEEK ? " on" : "") + '">首字</button>' +
      (/^https?:/.test(location.protocol) ? '<button data-t="flash" class="xt xflash">闪卡</button>' : '') + '</span>';
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
        el.classList.toggle("is-off", !!r.off);
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
    if (/[#&]due=1/.test(location.hash)) {
      document.body.classList.add("xdue");
    }
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

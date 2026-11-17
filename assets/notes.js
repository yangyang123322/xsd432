/* 划词笔记 · 全站通用
 * 选中文字 → 浮动「＋ 加笔记」→ 就地写；笔记锚定在原文上（黄色下划虚线），点开可改/删。
 * 所有笔记存 localStorage["ds432.notes"]，汇总页 notes.html 统一查看。
 * 锚点 = 元素路径(body 起) + 容器内字符偏移，正文文本不变，刷新/重排后仍能对上。
 */
(function () {
  "use strict";
  if (window.__NT_LOADED) return;
  window.__NT_LOADED = true;

  var KEY = "ds432.notes";
  var PAGE = (document.body && document.body.getAttribute("data-page")) ||
    (location.pathname.split("/").pop() || "index.html");
  var TITLES = {
    "index.html": "首页", "dashboard.html": "数据大盘", "structure.html": "命题结构",
    "chapters.html": "考纲树", "pojue.html": "破题诀 34 招", "graph.html": "招法网络",
    "path.html": "学习路径", "bank.html": "真题题库", "exam.html": "组卷模考",
    "papers.html": "八套卷", "ladder.html": "阶梯练 93", "concepts.html": "辨析卡 87",
    "formulas.html": "公式手册", "quiz.html": "默写自测", "review.html": "复盘 · 诊断",
    "notes.html": "笔记汇总", "plan.html": "计划"
  };
  function pageTitle(p) { return TITLES[p] || p.replace(/\.html$/, ""); }

  /* ---------------- 存储 ---------------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } }
  function save(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { }
    try { window.dispatchEvent(new CustomEvent("ds432:notes-change")); } catch (e) { }
  }
  function uid() { return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function nowStr() {
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ---------------- 元素路径 ---------------- */
  function pathOf(el) {
    var p = [], n = el;
    while (n && n !== document.body) {
      var par = n.parentElement;
      if (!par) return null;
      p.unshift(Array.prototype.indexOf.call(par.children, n));
      n = par;
    }
    return n === document.body ? p : null;
  }
  function elByPath(p) {
    var n = document.body;
    for (var i = 0; i < p.length; i++) {
      if (!n || !n.children[p[i]]) return null;
      n = n.children[p[i]];
    }
    return n;
  }

  /* ---------------- 文本偏移 ---------------- */
  function textLen(el) { return (el.textContent || "").length; }
  function offsetIn(container, node, off) {
    if (!container || !node) return -1;
    if (node === container) return off;
    var w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null), pos = 0;
    while (w.nextNode()) {
      if (w.currentNode === node) return pos + off;
      pos += w.currentNode.nodeValue.length;
    }
    // 选区落在元素边界：退化为该元素前的累计长度
    if (node.nodeType === 1 && container.contains(node)) {
      var r = document.createRange();
      r.selectNodeContents(container);
      try { r.setEndBefore(node); return r.toString().length; } catch (e) { return -1; }
    }
    return -1;
  }
  function textNodes(el) {
    var out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    while (w.nextNode()) {
      var t = w.currentNode;
      if (t.nodeValue && t.nodeValue.length) out.push(t);
    }
    return out;
  }

  /* ---------------- 样式 ---------------- */
  var CSS = ""
    + ".nt-selbar{position:fixed;z-index:9999;display:none;padding:5px 11px;border-radius:8px;background:#1f6f5c;color:#fff;"
    + "font-size:12.5px;font-family:inherit;border:0;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.22)}"
    + ".nt-selbar:hover{background:#175647}"
    + "mark.nt{background:rgba(214,168,32,.16);border-bottom:2px dashed rgba(190,144,10,.85);color:inherit;padding:0 1px;cursor:pointer;border-radius:2px}"
    + "mark.nt:hover{background:rgba(214,168,32,.3)}"
    + "mark.nt.flash{background:rgba(214,168,32,.6);transition:background .3s}"
    + ".nt-pop{position:fixed;z-index:10000;width:320px;max-width:92vw;background:var(--panel,#fff);border:1px solid var(--line,#dcdfd4);"
    + "border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.18);padding:12px;display:none;font-size:13px}"
    + ".nt-pop .nt-q{font-size:12px;color:var(--ink-3,#7a8177);border-left:3px solid var(--line,#dcdfd4);padding-left:8px;"
    + "max-height:64px;overflow:auto;margin-bottom:8px;line-height:1.6}"
    + ".nt-pop textarea{width:100%;min-height:74px;resize:vertical;font-family:inherit;font-size:13px;padding:8px;border-radius:7px;"
    + "border:1px solid var(--line,#dcdfd4);background:var(--bg,#fbfbf7);color:var(--ink,#22261f);box-sizing:border-box}"
    + ".nt-pop .nt-acts{display:flex;gap:8px;margin-top:9px;align-items:center}"
    + ".nt-pop .nt-acts button{font-family:inherit;font-size:12.5px;padding:5px 12px;border-radius:7px;border:1px solid var(--line,#dcdfd4);"
    + "background:transparent;color:var(--ink,#22261f);cursor:pointer}"
    + ".nt-pop .nt-acts button.primary{background:#1f6f5c;border-color:#1f6f5c;color:#fff}"
    + ".nt-pop .nt-acts button.danger{color:#b3341f;border-color:rgba(179,52,31,.4)}"
    + ".nt-pop .nt-time{margin-left:auto;font-size:11px;color:var(--ink-3,#7a8177)}"
    + ".nt-toast{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);background:#22261f;color:#fff;"
    + "font-size:12.5px;padding:8px 16px;border-radius:8px;z-index:10001;opacity:0;transition:opacity .25s;pointer-events:none}"
    + ".nt-toast.on{opacity:1}";

  var styleEl = document.createElement("style");
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ---------------- 浮动提示 ---------------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "nt-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("on"); }, 2200);
  }

  /* ---------------- 选区 → 浮动按钮 ---------------- */
  var CONT = ".qq,.in,.sig,.tpl,.trap,li,p,td,th,h1,h2,h3,h4,.body,.stitle,.kv";
  var bar = document.createElement("button");
  bar.className = "nt-selbar";
  bar.type = "button";
  bar.textContent = "＋ 加笔记";
  document.body.appendChild(bar);

  var pending = null; // {path,start,end,text}

  function containerOf(node) {
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el) return null;
    var c = el.closest(CONT);
    if (c) return c;
    // 兜底：没有命中白名单时，用最近的块级容器（div/section/…），避免整页写不进笔记
    var p = node.nodeType === 1 ? node : node.parentElement;
    if (p && /^(DIV|SECTION|ARTICLE|BLOCKQUOTE|TBODY|TR|UL|OL)$/.test(p.tagName)) return p;
    return null;
  }

  function hideBar() { bar.style.display = "none"; }

  function onSelect() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideBar(); return; }
    var range = sel.getRangeAt(0);
    var text = sel.toString().replace(/\s+/g, " ").trim();
    if (text.length < 2) { hideBar(); return; }

    var c1 = containerOf(range.startContainer), c2 = containerOf(range.endContainer);
    if (!c1 || c1 !== c2) { hideBar(); return; }           // 只支持同一段内勾选
    if (c1.closest(".nt-pop") || c1.closest(".side") || c1.closest("footer")) { hideBar(); return; }
    var path = pathOf(c1);
    if (!path) { hideBar(); return; }

    var start = offsetIn(c1, range.startContainer, range.startOffset);
    var end = offsetIn(c1, range.endContainer, range.endOffset);
    if (start < 0 || end < 0 || end <= start) { hideBar(); return; }

    var rect = range.getBoundingClientRect();
    pending = { path: path, start: start, end: end, text: text, rect: rect };

    // 和高亮条（ext.js 的 #xhlbar）抢位置：它出现时把按钮挂进它里面，否则用独立浮条
    setTimeout(function () {
      var eb = document.getElementById("xhlbar");
      var ebOn = eb && getComputedStyle(eb).display !== "none" && eb.getBoundingClientRect().width > 0;
      if (ebOn) { mountIntoBar(eb); hideBar(); return; }
      showBar(rect);
    }, 40);
  }

  function showBar(rect) {
    bar.style.display = "block";
    var top = rect.top - 40;
    if (top < 6) top = rect.bottom + 8;
    bar.style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - 42, window.innerWidth - 110)) + "px";
    bar.style.top = top + "px";
  }

  var barBtn = null;
  function mountIntoBar(eb) {
    if (barBtn && barBtn.parentNode) return;
    barBtn = document.createElement("button");
    barBtn.type = "button";
    barBtn.setAttribute("data-nt-add", "1");
    barBtn.textContent = "＋ 笔记";
    barBtn.style.cssText = "background:transparent;border:0;border-left:1px solid rgba(255,255,255,.28);color:inherit;font:inherit;padding:0 4px 0 10px;margin-left:4px;cursor:pointer";
    barBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
    barBtn.addEventListener("click", function (e) { e.stopPropagation(); addFlow(); });
    eb.appendChild(barBtn);
  }

  document.addEventListener("mouseup", function (e) {
    if (e.target === bar || (e.target.closest && e.target.closest(".nt-pop"))) return;
    setTimeout(onSelect, 0);
  });
  document.addEventListener("touchend", function (e) {
    if (e.target === bar || (e.target.closest && e.target.closest(".nt-pop"))) return;
    setTimeout(onSelect, 60);
  });
  document.addEventListener("keyup", function (e) {
    if (e.key === "Escape") { hideBar(); closePop(); }
    if (e.shiftKey || e.key === "Shift") setTimeout(onSelect, 0);
  });
  window.addEventListener("scroll", hideBar, { passive: true });

  /* ---------------- 弹层（新建/查看/编辑） ---------------- */
  var pop = document.createElement("div");
  pop.className = "nt-pop";
  document.body.appendChild(pop);

  var editing = null; // 正在编辑的 note id（null = 新建）

  function closePop() { pop.style.display = "none"; editing = null; }

  function openPop(opts) {
    // opts: {quote, text, time, id, onSave, onDelete}
    editing = opts.id || null;
    pop.innerHTML =
      '<div class="nt-q">' + esc(opts.quote || "") + "</div>" +
      '<textarea placeholder="写下你的笔记：错因 / 记忆点 / 追问…">' + esc(opts.text || "") + "</textarea>" +
      '<div class="nt-acts">' +
      '<button class="primary" data-act="save">' + (opts.id ? "保存修改" : "保存笔记") + "</button>" +
      (opts.id ? '<button class="danger" data-act="del">删除</button>' : "") +
      '<button data-act="cancel">取消</button>' +
      (opts.time ? '<span class="nt-time">' + esc(opts.time) + "</span>" : "") +
      "</div>";
    pop.style.display = "block";

    // 定位：选区附近，越界则翻转
    var r = opts.rect;
    var top = r ? r.bottom + 10 : 120;
    var left = r ? Math.min(r.left, window.innerWidth - 340) : 80;
    if (top + 230 > window.innerHeight) top = Math.max(10, (r ? r.top : 200) - 240);
    pop.style.top = Math.max(8, top) + "px";
    pop.style.left = Math.max(8, left) + "px";

    var ta = pop.querySelector("textarea");
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    pop.querySelector('[data-act="save"]').onclick = function () {
      var v = ta.value.trim();
      if (!v) { toast("笔记内容是空的"); return; }
      opts.onSave(v);
      closePop();
    };
    pop.querySelector('[data-act="cancel"]').onclick = closePop;
    var d = pop.querySelector('[data-act="del"]');
    if (d) d.onclick = function () { opts.onDelete(); closePop(); };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------------- 新建 ---------------- */
  bar.addEventListener("mousedown", function (e) { e.preventDefault(); });
  bar.addEventListener("click", function () { addFlow(); });

  function addFlow() {
    hideBar();
    if (!pending) return;
    var p = pending;
    var sel = window.getSelection();
    var rect = (sel && sel.rangeCount) ? sel.getRangeAt(0).getBoundingClientRect() : p.rect;
    openPop({
      quote: p.text,
      rect: rect || p.rect,
      onSave: function (v) {
        var all = load();
        all.push({
          id: uid(), page: PAGE, path: p.path, start: p.start, end: p.end,
          quote: p.text, text: v, time: nowStr()
        });
        save(all);
        render();
        toast("已保存笔记");
        try { if (sel) sel.removeAllRanges(); } catch (e) { }
        pending = null;
      }
    });
  }

  /* ---------------- 标记渲染 ---------------- */
  function unwrapAll() {
    var marks = document.querySelectorAll("mark.nt");
    Array.prototype.forEach.call(marks, function (m) {
      var par = m.parentNode;
      while (m.firstChild) par.insertBefore(m.firstChild, m);
      par.removeChild(m);
      try { par.normalize(); } catch (e) { }
    });
  }

  function wrapOne(el, start, end, id) {
    var nodes = textNodes(el), pos = 0, targets = [];
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i], len = t.nodeValue.length, s = pos, e = pos + len;
      if (e > start && s < end) {
        targets.push({ node: t, from: Math.max(start, s) - s, to: Math.min(end, e) - s });
      }
      pos = e;
    }
    for (var k = targets.length - 1; k >= 0; k--) {
      var o = targets[k], t2 = o.node;
      try {
        var mid = t2.splitText(o.from);
        if (o.to - o.from < mid.nodeValue.length) mid.splitText(o.to - o.from);
        var m = document.createElement("mark");
        m.className = "nt";
        m.setAttribute("data-nt", id);
        mid.parentNode.insertBefore(m, mid);
        m.appendChild(mid);
      } catch (err) { /* 偏移失效的旧笔记跳过，不阻塞其它 */ }
    }
  }

  function render() {
    unwrapAll();
    var notes = load().filter(function (n) { return n.page === PAGE; });
    if (!notes.length) return;
    // 从后往前包，避免同一元素内偏移被前面的包裹影响
    notes.sort(function (a, b) { return (b.start || 0) - (a.start || 0); });
    notes.forEach(function (n) {
      var el = elByPath(n.path || []);
      if (!el) return;
      var txt = el.textContent || "";
      // 动态列表重排后路径可能错位：先按原文校验，对不上就按原文重新定位
      if (txt.slice(n.start, n.end) !== n.quote) {
        var idx = n.quote ? txt.indexOf(n.quote) : -1;
        if (idx < 0) return;
        n.start = idx;
        n.end = idx + n.quote.length;
      }
      if (n.end > textLen(el)) return;
      wrapOne(el, n.start, n.end, n.id);
    });
  }

  /* ---------------- 点开标记 ---------------- */
  document.addEventListener("click", function (e) {
    var m = e.target.closest && e.target.closest("mark.nt");
    if (!m) return;
    var id = m.getAttribute("data-nt");
    var all = load(), n = null;
    for (var i = 0; i < all.length; i++) if (all[i].id === id) n = all[i];
    if (!n) return;
    e.preventDefault();
    e.stopPropagation();
    openPop({
      id: n.id, quote: n.quote, text: n.text, time: n.time, rect: m.getBoundingClientRect(),
      onSave: function (v) {
        var arr = load();
        arr.forEach(function (x) { if (x.id === id) { x.text = v; x.time = nowStr(); } });
        save(arr);
        toast("已更新");
      },
      onDelete: function () {
        save(load().filter(function (x) { return x.id !== id; }));
        render();
        toast("已删除");
      }
    });
  });

  /* ---------------- 深链 #nt-xxx ---------------- */
  function goHash() {
    var h = (location.hash || "").replace("#nt-", "");
    if (!h || location.hash.indexOf("#nt-") !== 0) return;
    var m = document.querySelector('mark.nt[data-nt="' + h + '"]');
    if (!m) return;
    m.scrollIntoView({ block: "center" });
    m.classList.add("flash");
    setTimeout(function () { m.classList.remove("flash"); }, 1600);
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    render();
    goHash();
    setTimeout(function () { render(); goHash(); }, 500);
    setTimeout(function () { render(); goHash(); }, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", function () { render(); goHash(); });

  window.NOTES = {
    key: KEY, all: load, save: save, title: pageTitle, render: render,
    add: function (o) { var a = load(); a.push(o); save(a); render(); },
    remove: function (id) { save(load().filter(function (x) { return x.id !== id; })); render(); }
  };
})();

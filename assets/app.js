/* ============================================================
   432 统计 · 共用脚本：主题 / 侧栏 / 渲染 / 复习调度
   ============================================================ */
(function () {
  "use strict";
  const U = (window.U = {});
  const D = () => window.DATA;

  /* ---------------- 主题 ---------------- */
  const TK = "ds432.theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    const b = document.getElementById("themeBtn");
    if (b) b.textContent = t === "dark" ? "☾" : "☀";
  }
  U.theme = function () {
    const forced = new URLSearchParams(location.search).get("theme");
    if (forced === "dark" || forced === "light") return forced;
    const saved = localStorage.getItem(TK);
    const sys = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return saved || sys;
  };
  U.toggleTheme = function () {
    const n = U.theme() === "dark" ? "light" : "dark";
    localStorage.setItem(TK, n);
    applyTheme(n);
  };

  /* ---------------- 存储 ---------------- */
  const NS = "ds432.";
  U.get = function (k, dft) {
    try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : dft; }
    catch (e) { return dft; }
  };
  U.set = function (k, v) {
    try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { }
    if (U._onProgress && !U._silent) { try { U._onProgress(k); } catch (e) { } }
  };
  U.del = function (k) { localStorage.removeItem(NS + k); };

  /* ---------------- 工具 ---------------- */
  U.esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  U.pad = (n) => (n < 10 ? "0" : "") + n;
  U.today = function () { const d = new Date(); return d.getFullYear() + "-" + U.pad(d.getMonth() + 1) + "-" + U.pad(d.getDate()); };
  U.daysBetween = function (a, b) {
    const pa = new Date(a + "T00:00:00"), pb = new Date(b + "T00:00:00");
    return Math.round((pb - pa) / 86400000);
  };
  U.addDays = function (dateStr, n) {
    const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + U.pad(d.getMonth() + 1) + "-" + U.pad(d.getDate());
  };
  U.num = (n) => (n == null ? "—" : Number(n).toLocaleString("zh-CN"));
  U.tierClass = (t) => ({ "必考": "t1", "高频": "t2", "中频": "t3", "低频": "t4" }[t] || "t4");

  /* ---------------- Markdown + KaTeX ---------------- */
  function math(tex, display) {
    try {
      return window.katex ? katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: false, output: "html" })
        : U.esc((display ? "$$" : "$") + tex + (display ? "$$" : "$"));
    } catch (e) { return U.esc(tex); }
  }
  function inline(s) {
    let out = "", i = 0;
    const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    let m;
    while ((m = re.exec(s))) {
      out += fmt(s.slice(i, m.index));
      out += math(m[1] != null ? m[1] : m[2], m[1] != null);
      i = m.index + m[0].length;
    }
    out += fmt(s.slice(i));
    return out;
  }
  function fmt(s) {
    return U.esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function table(lines) {
    const rows = lines.map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
    let head = null, body = rows;
    if (rows.length > 1 && /^[\s:|-]+$/.test(rows[1].join(""))) { head = rows[0]; body = rows.slice(2); }
    let h = '<div class="tb-wrap"><table class="tb">';
    if (head) h += "<thead><tr>" + head.map((c) => "<th>" + inline(c) + "</th>").join("") + "</tr></thead>";
    h += "<tbody>" + body.map((r) => "<tr>" + r.map((c) => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
    return h;
  }
  U.md = function (src) {
    if (!src) return "";
    src = String(src).replace(/\r\n/g, "\n").trim();
    const blocks = src.split(/\n\s*\n/);
    let html = "";
    for (let b of blocks) {
      b = b.trim(); if (!b) continue;
      const L = b.split("\n");
      if (/^\$\$[\s\S]*\$\$$/.test(b) && b.length > 4) { html += '<div class="math-b">' + inline(b) + "</div>"; continue; }
      if (L.every((x) => /^\s*[-*]\s+/.test(x))) {
        html += "<ul>" + L.map((x) => "<li>" + inline(x.replace(/^\s*[-*]\s+/, "")) + "</li>").join("") + "</ul>"; continue;
      }
      if (L.every((x) => /^\s*\d+[.．]\s+/.test(x))) {
        html += "<ol>" + L.map((x) => "<li>" + inline(x.replace(/^\s*\d+[.．]\s+/, "")) + "</li>").join("") + "</ol>"; continue;
      }
      if (L.every((x) => x.trim().startsWith("|"))) { html += table(L); continue; }
      if (L.every((x) => x.trim().startsWith(">"))) {
        html += "<blockquote>" + inline(L.map((x) => x.replace(/^\s*>\s?/, "")).join(" ")) + "</blockquote>"; continue;
      }
      if (/^#{1,4}\s/.test(b)) {
        const n = b.match(/^#+/)[0].length;
        html += "<h" + Math.min(n + 2, 6) + ">" + inline(b.replace(/^#+\s*/, "")) + "</h" + Math.min(n + 2, 6) + ">"; continue;
      }
      html += "<p>" + inline(b.replace(/\n/g, " ")) + "</p>";
    }
    return html;
  };

  /* ---------------- 侧栏 ---------------- */
  const NAV = [
    ["概览", [["index.html", "首页", "◈"], ["dashboard.html", "数据大盘", "▦"], ["structure.html", "命题结构", "▤"]]],
    ["两根轴", [["chapters.html", "考纲树", "⌗"], ["pojue.html", "破题诀 34 招", "✦"], ["graph.html", "招法网络", "◎"], ["path.html", "学习路径", "⇢"]]],
    ["练习", [["bank.html", "真题题库", "☰"], ["exam.html", "组卷模考", "⏱"], ["papers.html", "八套卷", "▭"], ["ladder.html", "阶梯练 93", "≡"]]],
    ["背诵", [["concepts.html", "辨析卡 87", "⇄"], ["formulas.html", "公式手册", "∑"], ["quiz.html", "默写自测", "✎"]]],
    ["我的", [["review.html", "复盘 · 诊断", "◍"]]],
  ];
  U.nav = function (page) {
    const el = document.querySelector(".side");
    if (!el) return;
    const m = D() ? D().meta : { nq: 111, nkp: 40 };
    let h = '<div class="brand"><div class="logo">432</div><div><b>西大应用统计</b><span>STRUCTURED · 2019—2026</span></div></div>';
    for (const [g, items] of NAV) {
      h += '<div class="nav-group">' + g + "</div><nav class=\"nav\">";
      for (const [href, label, ico] of items) {
        h += '<a href="' + href + '"' + (href === page ? ' class="on"' : "") + '><span class="ico">' + ico + "</span>" + label + "</a>";
      }
      h += "</nav>";
    }
    h += '<div class="nav-group">数据</div><div style="padding:0 10px;font-size:12px;color:var(--ink-3);line-height:1.9">' +
      "真题 <b>" + m.nq + "</b> 题 · 考点 <b>" + m.nkp + "</b><br>破题诀 <b>" + (m.npojue || 34) + "</b> 招 · 辨析 <b>" + (m.nconcept || 87) + "</b><br>" +
      '<span class="mono" style="font-size:11px">build ' + (m.built || "").slice(0, 10) + "</span></div>";
    el.innerHTML = h;
  };

  /* ---------------- 复习调度（SM-2 简化版） ---------------- */
  const SK = "srs";
  function srsAll() { return U.get(SK, {}); }
  U.srs = {
    get(qid) { return srsAll()[qid] || null; },
    all: srsAll,
    grade(qid, g) {
      const all = srsAll();
      let s = all[qid] || { ef: 2.5, interval: 0, reps: 0, lapses: 0 };
      if (g === "again") {
        // 没做出：立刻回到今日队列，当天还能再过一遍
        s.lapses++; s.reps = 0; s.ef = Math.max(1.3, s.ef - 0.2); s.interval = 0;
      } else {
        s.reps++;
        s.ef = Math.max(1.3, Math.min(3.0, s.ef + (g === "easy" ? 0.15 : 0.0)));
        if (s.reps === 1) s.interval = g === "easy" ? 3 : 1;
        else if (s.reps === 2) s.interval = g === "easy" ? 7 : 3;
        else s.interval = Math.round(s.interval * s.ef * (g === "easy" ? 1.25 : 1));
      }
      s.last = U.today();
      s.due = U.addDays(U.today(), s.interval);
      all[qid] = s; U.set(SK, all);
      return s;
    },
    due() {
      const t = U.today(), all = srsAll(), out = [];
      for (const k in all) if (all[k].due && all[k].due <= t) out.push(k);
      return out;
    },
    reset() { U.del(SK); },
  };

  /* ---------------- 题目状态（错题/掌握） ---------------- */
  const QK = "qstate";
  U.qs = {
    all() { return U.get(QK, {}); },
    get(id) { return U.get(QK, {})[id] || {}; },
    patch(id, p) {
      const all = U.get(QK, {});
      all[id] = Object.assign({}, all[id] || {}, p);
      U.set(QK, all);
    },
    wrongIds() {
      const all = U.get(QK, {});
      return Object.keys(all).filter((k) => all[k].wrong);
    },
    stat() {
      const all = U.get(QK, {}), o = { done: 0, wrong: 0, star: 0 };
      for (const k in all) { o.done++; if (all[k].wrong) o.wrong++; if (all[k].star) o.star++; }
      return o;
    },
  };

  /* ---------------- 查询辅助 ---------------- */
  U.kp = (name) => (D() ? (D().kps.find((k) => k.name === name) || null) : null);
  U.q = (id) => (D() ? (D().qs.find((q) => q.id === id) || null) : null);
  U.chName = (id) => {
    const c = D().chapters.find((x) => x.id === id);
    return c ? "第" + c.no + "章 " + c.name : id;
  };
  U.chShort = (id) => {
    const c = D().chapters.find((x) => x.id === id);
    return c ? c.name : id;
  };

  /* ---------------- 题卡 ---------------- */
  U.actBar = function (id) {
    const s = U.qs.get(id);
    return '<div class="act" data-act="' + U.esc(id) + '"><span class="lb">我的标记</span>' +
      '<button class="btn sm" data-a="got">记住了</button>' +
      '<button class="btn sm" data-a="no">没做出</button>' +
      '<button class="btn sm" data-a="easy">太简单</button>' +
      '<span class="lb" style="margin-left:6px">' + (s.due ? "下次复习 " + s.due : "未进复习队列") + "</span></div>";
  };
  U.bindActs = function (root, after) {
    (root || document).querySelectorAll(".act[data-act]").forEach((bar) => {
      const id = bar.getAttribute("data-act");
      bar.querySelectorAll("[data-a]").forEach((b) => {
        b.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const a = b.getAttribute("data-a");
          const g = a === "no" ? "again" : a === "easy" ? "easy" : "good";
          U.srs.grade(id, g);
          U.qs.patch(id, { acc: a === "no" ? 0 : 1, last: U.today(), wrong: a === "no" ? true : false });
          if (after) after(id, a);
        });
      });
    });
  };
  U.doneStat = function (ids) {
    let done = 0, right = 0;
    for (const id of ids || []) { const s = U.qs.get(id); if (s.acc !== undefined) { done++; if (s.acc) right++; } }
    return { n: (ids || []).length, done, right };
  };

  /* ---------------- 考试倒计时 ---------------- */
  U.EXAM = "2026-12-19";
  U.daysTo = function (d) {
    const a = new Date(U.today() + "T00:00:00"), b = new Date((d || U.EXAM) + "T00:00:00");
    return Math.round((b - a) / 864e5);
  };

  U.qcard = function (q, opt) {
    opt = opt || {};
    const kp = U.kp(q.kp);
    const chips = [];
    chips.push('<span class="chip">' + U.esc(q.year) + " · " + U.esc(q.type) + "</span>");
    if (q.pts) chips.push('<span class="chip">' + q.pts + " 分</span>");
    if (kp) chips.push('<span class="chip acc">' + U.esc(kp.name) + "</span>");
    if (q.level) chips.push('<span class="chip">' + U.esc(q.level.split("（")[0]) + "</span>");
    const st = U.qs.get(q.id);
    if (st.star) chips.push('<span class="chip gold">★ 收藏</span>');
    if (st.wrong) chips.push('<span class="chip warn">错题</span>');
    if (q.missStem) chips.push('<span class="chip warn">题干缺失</span>');
    else if (q.missSol) chips.push('<span class="chip">无解析</span>');

    let body = "";
    if (q.sol) body += '<div class="q-sec sol"><div class="lab">解题</div>' + U.md(q.sol) + "</div>";
    else if (!q.missStem) body += '<div class="q-sec"><div class="empty">原素材只收录了题干，未给解析。</div></div>';
    if (q.traps && q.traps.length)
      body += '<div class="q-sec"><div class="lab">易错点</div>' + q.traps.map((t) => '<div class="trap">' + U.md(t).replace(/^<p>|<\/p>$/g, "") + "</div>").join("") + "</div>";
    if (q.ext && q.ext.length)
      body += '<div class="q-sec"><div class="lab">延伸</div>' + q.ext.map((t) => '<div class="ext">' + U.md(t).replace(/^<p>|<\/p>$/g, "") + "</div>").join("") + "</div>";
    if (q.adapt && q.adapt.length) {
      body += '<div class="q-sec"><div class="lab">适配题（同源变式）</div>' + q.adapt.map((a) =>
        '<div class="adapt"><div class="tg">' + U.esc(a.q || "") + "</div>" +
        (a.ans ? "<div>" + U.md(a.ans) + "</div>" : "") +
        (a.think ? '<div class="muted small" style="margin-top:4px">思路：' + U.md(a.think) + "</div>" : "") + "</div>").join("") + "</div>";
    }
    if (q.missing) body += '<div class="q-sec"><div class="trap">原卷此题缺失（图或文字未收录），仅保留占位。</div></div>';

    const openCls = opt.open ? " open" : "";
    return '<div class="q' + openCls + '" data-id="' + U.esc(q.id) + '">' +
      '<div class="q-head"><div class="q-no">' + U.esc(q.id) + "</div>" +
      '<div class="q-body"><div class="q-stem">' + U.md(q.stem || q.title || "（题目缺失）") + "</div>" +
      '<div class="q-meta">' + chips.join("") + "</div></div>" +
      '<div class="row" style="gap:4px"><span class="star' + (st.star ? " on" : "") + '" data-star="' + U.esc(q.id) + '" title="收藏">★</span></div>' +
      "</div>" +
      '<div class="q-open">' + (body || '<div class="empty">此题无解析</div>') + "</div></div>";
  };

  U.bindCards = function (root) {
    (root || document).querySelectorAll(".q-head").forEach((h) => {
      h.addEventListener("click", (e) => {
        if (e.target.closest("[data-star]")) return;
        h.parentElement.classList.toggle("open");
      });
    });
    (root || document).querySelectorAll("[data-star]").forEach((s) => {
      s.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = s.getAttribute("data-star");
        const cur = !!U.qs.get(id).star;
        U.qs.patch(id, { star: !cur });
        s.classList.toggle("on", !cur);
      });
    });
  };

  /* ---------------- 星点图（纯 CSS 网格） ---------------- */
  U.hm = function (cells, cols) {
    let h = '<div class="hm" style="grid-template-columns:repeat(' + (cols || 8) + ',1fr)">';
    cells.forEach((c) => {
      h += '<i title="' + U.esc(c.t || "") + '" style="height:' + (c.h || 18) + "px;background:" + c.c + '"></i>';
    });
    return h + "</div>";
  };


  /* 进度合并（进度码与同步链接共用） */
  U.applyPacked = function (o) {
    if (!o || o.v !== 1) return false;
    var changed = false, i;
    U._silent = true;
    var l = U.get("learned", {}), k, f, q, z, src;
    for (i = 0; i < (o.L || []).length; i++) { if (!l[o.L[i]]) { l[o.L[i]] = 1; changed = true; } }
    U.set("learned", l);
    z = U.get("quiz", {});
    for (i = 0; i < (o.Z || []).length; i++) { if (z[String(o.Z[i])] !== 1) { z[String(o.Z[i])] = 1; changed = true; } }
    U.set("quiz", z);
    q = U.get("qstate", {}); src = o.Q || {};
    for (k in src) {
      q[k] = q[k] || {};
      for (f in src[k]) if (src[k][f] && !q[k][f]) { q[k][f] = src[k][f]; changed = true; }
    }
    U.set("qstate", q);
    U._silent = false;
    return changed;
  };
  U.encPacked = function (s) {
    try {
      return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) { return ""; }
  };
  U.decPacked = function (t) {
    try {
      t = t.replace(/-/g, "+").replace(/_/g, "/");
      while (t.length % 4) t += "=";
      return decodeURIComponent(escape(atob(t)));
    } catch (e) { return ""; }
  };

  /* ---------------- 进度同步（导出/合并进度码） ---------------- */
  U.syncPanel = function () {
    if (document.getElementById("syncWrap")) return;
    var wrap = document.createElement("div");
    wrap.id = "syncWrap";
    wrap.innerHTML =
      '<button id="syncBtn" title="进度同步：生成 / 合并进度码">⇅</button>' +
      '<div id="syncModal" class="sync-modal"><div class="sync-box">' +
      '<div class="sync-h">进度同步<span id="syncClose">×</span></div>' +
      '<div class="sync-p">手机上记的「已学会」和电脑上不通用。这里生成一段码，发到另一台设备粘进来合并即可（只增不减）。</div>' +
      '<textarea id="syncText" placeholder="点「生成」得到本机的进度码；或把另一台设备的码粘进来点「合并」"></textarea>' +
      '<div class="sync-btns"><button id="syncGen">生成本机进度码</button>' +
      '<button id="syncApply" class="primary">合并这段码并刷新</button></div>' +
      '<div class="sync-btns" style="margin-top:8px"><button id="syncLink">复制「同步链接」（推荐）</button></div>' +
      '<div class="sync-cloud"><div class="sync-h2">云同步（可选 · 自动双向）</div>' +
      '<div class="sync-p">粘一次 GitHub token（只需 gist 权限），两台设备用同一个 token，之后改完自动同步，不用再发链接。</div>' +
      '<input id="ghTok" placeholder="ghp_… 或 github_pat_…">' +
      '<div class="sync-btns"><button id="ghGo">连接并同步</button><button id="ghOff">断开云同步</button></div>' +
      '<div id="ghMsg" class="sync-msg"></div></div>' +
      '<div id="syncMsg" class="sync-msg"></div></div></div>';
    document.body.appendChild(wrap);

    var style = document.createElement("style");
    style.textContent =
      "#syncBtn{position:fixed;right:18px;bottom:18px;z-index:60;width:38px;height:38px;border-radius:50%;" +
      "border:1px solid var(--line,#e2e5ea);background:var(--card,#fff);color:var(--fg,#16181d);cursor:pointer;" +
      "font-size:16px;line-height:1;box-shadow:0 2px 10px rgba(0,0,0,.10)}" +
      "#syncBtn:hover{border-color:#0e7c66;color:#0e7c66}" +
      ".sync-modal{display:none;position:fixed;inset:0;z-index:70;background:rgba(15,18,24,.45);align-items:center;justify-content:center}" +
      ".sync-modal.on{display:flex}" +
      ".sync-box{width:min(560px,92vw);background:var(--card,#fff);border-radius:12px;padding:18px 20px;border:1px solid var(--line,#e2e5ea);" +
      "box-shadow:0 18px 50px rgba(0,0,0,.22);font:14px/1.6 'Microsoft YaHei',sans-serif;color:var(--fg,#16181d)}" +
      ".sync-h{font-weight:700;font-size:15px;display:flex;justify-content:space-between;align-items:center}" +
      "#syncClose{cursor:pointer;color:#8a93a0;font-size:20px;line-height:1}" +
      ".sync-p{color:#6b7480;font-size:12.5px;margin:6px 0 10px}" +
      "#syncText{width:100%;height:96px;resize:vertical;border:1px solid var(--line,#d8dde5);border-radius:8px;padding:8px 10px;" +
      "font:12px/1.5 ui-monospace,Consolas,monospace;background:var(--bg,#fbfbfc);color:inherit;box-sizing:border-box}" +
      ".sync-btns{display:flex;gap:8px;margin-top:10px}" +
      ".sync-btns button{flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--line,#d8dde5);background:transparent;" +
      "color:inherit;font:13px 'Microsoft YaHei',sans-serif;cursor:pointer}" +
      ".sync-btns button.primary{background:#0e7c66;border-color:#0e7c66;color:#fff}" +
      ".sync-msg{font-size:12.5px;color:#0e7c66;margin-top:8px;min-height:18px}" +
      ".sync-cloud{margin-top:14px;border-top:1px dashed var(--line,#dfe3ea);padding-top:12px}" +
      ".sync-h2{font-weight:700;font-size:13px;margin-bottom:4px}" +
      "#ghTok{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--line,#d8dde5);border-radius:8px;" +
      "font:12px ui-monospace,Consolas,monospace;background:var(--bg,#fbfbfc);color:inherit}";
    document.head.appendChild(style);

    var $ = function (id) { return document.getElementById(id); };
    var modal = $("syncModal");
    $("syncBtn").onclick = function () { modal.classList.add("on"); };
    $("syncClose").onclick = function () { modal.classList.remove("on"); };
    modal.onclick = function (e) { if (e.target === modal) modal.classList.remove("on"); };

    function pack() {
      var L = [], Z = [], Q = {}, k;
      var l = U.get("learned", {});
      for (k in l) if (l[k]) L.push(k);
      var z = U.get("quiz", {});
      for (k in z) if (z[k] === 1) Z.push(String(k));
      var q = U.get("qstate", {});
      for (k in q) if (q[k] && (q[k].done || q[k].wrong || q[k].star)) Q[k] = q[k];
      return JSON.stringify({ v: 1, ts: new Date().toISOString().slice(0, 10), L: L, Z: Z, Q: Q });
    }

    $("syncGen").onclick = function () {
      var code = pack();
      $("syncText").value = code;
      $("syncText").select();
      var o = JSON.parse(code);
      $("syncMsg").textContent = "本机：已学会 " + o.L.length + " 招 · 默写会了 " + o.Z.length + " 条 · 题库记录 " + Object.keys(o.Q).length + " 题";
    };

    $("ghGo").onclick = function () { U.cloud.connect($("ghTok").value); };
    $("ghOff").onclick = function () { U.cloud.disconnect(); };
    $("syncLink").onclick = function () {
      var url = location.origin + location.pathname + "#s=" + U.encPacked(pack());
      var t = $("syncText");
      t.value = url;
      t.select();
      try { if (navigator.clipboard) navigator.clipboard.writeText(url); } catch (e) { }
      $("syncMsg").textContent = "链接已生成。发到另一台设备（微信文件传输助手发给自己最快），点开即自动合并。";
    };

    $("syncApply").onclick = function () {
      var raw = ($("syncText").value || "").trim();
      if (!raw) { $("syncMsg").textContent = "先粘一段进度码"; return; }
      var o;
      try { o = JSON.parse(raw); } catch (e) { $("syncMsg").textContent = "这段码读不出来，检查有没有粘全"; return; }
      if (!U.applyPacked(o)) { $("syncMsg").textContent = "不是这个站的进度码"; return; }
      $("syncMsg").textContent = "已合并，刷新后生效…";
      setTimeout(function () { if (!window.__syncNoReload) location.reload(); }, 500);
    };
  };

  /* ---------------- 云同步：GitHub 私密 Gist ---------------- */
  U.cloud = (function () {
    var API = "https://api.github.com", FILE = "xsd432-progress.json", DESC = "xsd432-progress";
    var timer = null;

    function cfg() { return U.get("ghcfg", null); }
    function saveCfg(o) { var keep = U._silent; U._silent = true; U.set("ghcfg", o); U._silent = keep; }
    function on() { var c = cfg(); return !!(c && c.token && c.gid); }

    function packNow() {
      var L = [], Z = [], Q = {}, k, l, z, q;
      l = U.get("learned", {});
      for (k in l) if (l[k]) L.push(k);
      z = U.get("quiz", {});
      for (k in z) if (z[k] === 1) Z.push(String(k));
      q = U.get("qstate", {});
      for (k in q) if (q[k] && (q[k].done || q[k].wrong || q[k].star)) Q[k] = q[k];
      return JSON.stringify({ v: 1, ts: new Date().toISOString().slice(0, 10), L: L, Z: Z, Q: Q });
    }

    function hdrs() {
      var c = cfg();
      return {
        Authorization: "token " + c.token,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json"
      };
    }

    function api(path, opt) {
      opt = opt || {};
      opt.headers = hdrs();
      return fetch(API + path, opt).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + " · " + t.slice(0, 90)); });
        return r.json();
      });
    }

    function say(t) { var el = document.getElementById("ghMsg"); if (el) el.textContent = t; }

    function mergeText(txt) {
      var o;
      try { o = JSON.parse(txt); } catch (e) { return false; }
      return U.applyPacked(o);
    }

    function pull() {
      if (!on()) return Promise.resolve(false);
      var c = cfg();
      return api("/gists/" + c.gid).then(function (g) {
        var f = g.files && g.files[FILE];
        if (!f) return false;
        if (f.truncated && f.raw_url) {
          return fetch(f.raw_url).then(function (r) { return r.text(); }).then(mergeText);
        }
        return mergeText(f.content);
      });
    }

    function push() {
      if (!on()) return Promise.resolve(false);
      var c = cfg();
      return pull().catch(function () { return false; }).then(function () {
        var body = { files: {} };
        body.files[FILE] = { content: packNow() };
        return api("/gists/" + c.gid, { method: "PATCH", body: JSON.stringify(body) }).then(function () { return true; });
      });
    }

    function pushLater() {
      if (!on()) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        push().then(function () { say("已自动同步 " + new Date().toTimeString().slice(0, 5)); })
          .catch(function (e) { say("同步失败：" + e.message); });
      }, 2200);
    }

    function connect(tok) {
      tok = (tok || "").trim();
      if (!tok) { say("先把 token 粘进来"); return; }
      say("正在连接…");
      saveCfg({ token: tok, gid: (cfg() || {}).gid || null });
      var c = cfg();
      var p = c.gid ? Promise.resolve(c.gid) : api("/gists?per_page=100").then(function (list) {
        for (var i = 0; i < list.length; i++) if (list[i].description === DESC) return list[i].id;
        return null;
      });
      p.then(function (gid) {
        if (gid) { saveCfg({ token: tok, gid: gid }); return gid; }
        return api("/gists", {
          method: "POST",
          body: JSON.stringify({ description: DESC, public: false, files: (function () { var f = {}; f[FILE] = { content: packNow() }; return f; })() })
        }).then(function (g) { saveCfg({ token: tok, gid: g.id }); return g.id; });
      }).then(function (gid) {
        saveCfg({ token: tok, gid: gid });
        return pull();
      }).then(function () {
        return push();
      }).then(function () {
        say("已连接 ✓ 之后两台设备自动同步（改完约 2 秒上传）");
      }).catch(function (e) {
        say("连接失败：" + e.message);
      });
    }

    function disconnect() {
      var keep = U._silent; U._silent = true; U.set("ghcfg", null); U._silent = keep;
      say("已断开云同步（本地进度保留）");
    }

    function boot() {
      if (!on()) return;
      pull().then(function (changed) {
        if (changed && !sessionStorage.getItem("cloudJust")) {
          sessionStorage.setItem("cloudJust", "1");
          setTimeout(function () { sessionStorage.removeItem("cloudJust"); }, 4000);
          setTimeout(function () { if (!window.__syncNoReload) location.reload(); }, 120);
        }
      }).catch(function () { });
    }

    return { on: on, pull: pull, push: push, pushLater: pushLater, connect: connect, disconnect: disconnect, boot: boot, say: say };
  })();
  U.cloudLater = function () { if (U.cloud) U.cloud.pushLater(); };
  U._onProgress = function (k) {
    if (k === "learned" || k === "quiz" || k === "qstate") U.cloudLater && U.cloudLater();
  };

  /* ---------------- 启动 ---------------- */
  U.boot = function (page) {
    /* 同步链接：地址里带 #s=<进度>，进来先合并，再把 hash 擦掉并刷新 */
    if (location.hash.indexOf("#s=") === 0) {
      var merged = false;
      try { merged = U.applyPacked(JSON.parse(U.decPacked(location.hash.slice(3)))); } catch (e) { }
      if (merged) {
        try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { }
        if (!window.__syncNoReload) { location.reload(); return; }
      }
    }
    applyTheme(U.theme());
    U.nav(page);
    const b = document.getElementById("themeBtn");
    if (b) b.addEventListener("click", U.toggleTheme);
    document.querySelectorAll("[data-md]").forEach((el) => { el.innerHTML = U.md(el.getAttribute("data-md")); });
    U.bindCards(document);
    if (U.syncPanel && !document.getElementById('noSync')) U.syncPanel();
    if (U.cloud) U.cloud.boot();
    // 页面内容是 JS 渲染的，浏览器自带的 #anchor 跳转常常落空：渲染完再补一次
    if (location.hash && location.hash.length > 1) {
      const jump = (tries) => {
        const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (el) el.scrollIntoView({ block: "start" });
        else if (tries > 0) setTimeout(() => jump(tries - 1), 120);
      };
      setTimeout(() => jump(6), 60);
    }
  };
})();

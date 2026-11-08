# -*- coding: utf-8 -*-
"""pojue.html 的「识别信号」原来用 U.esc 渲染，$...$ 会原样显示（25 招都带公式）。
改成 U.md，并去掉外层 <p>。graph.html 的浮层仍保持纯文本（那里只截 90 字，公式会被截断）。"""
import io

p = "pojue.html"
h = io.open(p, encoding="utf-8").read()
old = """'<div class="sig"><b style="color:var(--ink)">识别信号：</b>'+U.esc(j.signal)+"</div>\""""
new = """'<div class="sig"><b style="color:var(--ink)">识别信号：</b>'+U.md(j.signal).replace(/^<p>|<\\/p>$/g,"")+"</div>\""""
if old in h:
    h = h.replace(old, new)
    io.open(p, "w", encoding="utf-8").write(h)
    print("pojue.html：signal -> U.md  OK")
else:
    print("MISS：未找到原切片")
    i = h.find("识别信号：")
    print(repr(h[i - 60:i + 90]))

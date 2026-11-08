# -*- coding: utf-8 -*-
"""1) 审计所有招的 signal 里 $ 的数量（站点原先用 U.esc 渲染 signal，公式显示为原文）
2) 把 j33/j34 的 signal / template / short 改成能正常渲染的写法
"""
import io
import json
import re

s = io.open("data/data.js", encoding="utf-8").read()
D = json.loads(s[s.find("{"):s.rfind("}") + 1])

print("=== signal 里 $ 计数（奇数说明有未配对）===")
odd = []
for j in D["pojue"]:
    n = j["signal"].count("$")
    if n % 2:
        odd.append(j["id"] + ":" + str(n))
print("奇数：", odd or "无（全部成对）")
print("含 $ 的招数：", sum(1 for j in D["pojue"] if "$" in j["signal"]))

DOL = chr(36)
for j in D["pojue"]:
    if j["id"] == "j33":
        j["short"] = "认身份 → 一座桥 → 两条恒等式 → 六步收口"
        j["signal"] = (
            DOL + "E" + DOL + "、" + DOL + "D" + DOL + "、" + DOL + "\\sum" + DOL + "、" + DOL + "X_i" + DOL +
            "、" + DOL + "\\bar X" + DOL + " 同时出现；或题说「证明 " + DOL + "T" + DOL + " 是 " + DOL + "\\theta" + DOL +
            " 的无偏估计」；或要求 " + DOL + "E(X^2)" + DOL + "、" + DOL + "D(\\bar X)" + DOL +
            "。典型：" + DOL + "X_1,\\dots,X_n" + DOL + " 来自 " + DOL + "N(\\mu,\\sigma^2)" + DOL +
            "，" + DOL + "S^2=\\frac{1}{n-1}\\sum_{i=1}^{n}(X_i-\\bar X)^2" + DOL +
            "，证 " + DOL + "S^2" + DOL + " 是 " + DOL + "\\sigma^2" + DOL + " 的无偏估计。"
        )
        j["template"] = (
            DOL + DOL + "\\begin{gathered} E(X^2)=DX+(EX)^2,\\qquad D(aX+b)=a^2DX,\\quad D(X\\pm Y)=DX+DY\\pm2\\mathrm{Cov} \\\\ "
            "\\sum_{i=1}^{n}X_i=n\\bar X,\\qquad \\sum_{i=1}^{n}(X_i-\\bar X)=0 \\\\ "
            "\\sum_{i=1}^{n}(X_i-\\bar X)^2=\\sum_{i=1}^{n}X_i^2-n\\bar X^2 \\\\ "
            "E\\bar X=\\mu,\\quad D\\bar X=\\frac{\\sigma^2}{n},\\quad \\frac{(n-1)S^2}{\\sigma^2}\\sim\\chi^2(n-1) \\end{gathered}" + DOL + DOL +
            "\n\n"
            + DOL + "E(X^2)=DX+(EX)^2" + DOL + " 是 E 与 D 之间**唯一的桥**；横向推交叉项要" + DOL + "X,Y" + DOL + " 独立。"
        )
    if j["id"] == "j34":
        j["signal"] = (
            "给置信度 + 「估计误差（半宽）不超过 " + DOL + "\\delta" + DOL + "」或「区间长度不超过 " + DOL + "L" + DOL +
            "」，问至少抽多少样本／经费最省样本量。典型：" + DOL + "\\sigma" + DOL + " 未知，" + DOL + "n=10" + DOL +
            " 时 " + DOL + "\\bar x=20.5,\\ s=0.9" + DOL + "，问误差不超过 " + DOL + "0.5" + DOL + " 需多少样本。"
        )
        j["template"] = (
            DOL + DOL + "\\delta=z_{\\alpha/2}\\frac{\\sigma}{\\sqrt n}\\ \\Longrightarrow\\ n\\ge\\left(\\frac{z_{\\alpha/2}\\,\\hat\\sigma}{\\delta}\\right)^2"
            + DOL + DOL + "\n\n"
            + DOL + "\\delta" + DOL + " 是**半宽**；题给「区间长度 " + DOL + "\\le L" + DOL + "」时先取 " + DOL + "\\delta=L/2" + DOL +
            "。检验版的样本量是另一条公式 " + DOL + "n\\ge\\dfrac{(z_\\alpha+z_\\beta)^2\\sigma^2}{\\delta^2}" + DOL + "（见 j24），别混。"
        )

out = "window.DATA = " + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"
io.open("data/data.js", "w", encoding="utf-8").write(out)
print("j33/j34 已改写；npojue =", D["meta"]["npojue"])

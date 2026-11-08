# -*- coding: utf-8 -*-
"""把「二维概率 P(g(X,Y)>c) 三解法 + 方向自检」作为第 32 招写进 site/data/data.js，
并同步 pojue.html 的计数文案。"""
import io
import json

# ---------- 1. data.js ----------
s = io.open("data/data.js", encoding="utf-8").read()
a, b = s.find("{"), s.rfind("}")
D = json.loads(s[a:b + 1])

if any(j["id"] == "j32" for j in D["pojue"]):
    print("j32 已存在，跳过新增")
else:
    entry = {
        "id": "j32",
        "no": 32,
        "name": "二维概率 P(g(X,Y)>c) 的三种解法",
        "short": "三问定路线 → 定限四件套 → 方向自检",
        "kps": ["二维区域型分布", "条件分布与条件密度", "多维函数的分布", "联合分布与边际分布"],
        "signal": "给出 $f(x,y)$ 与一条曲线 / 斜边边界（$x+y>1$、$|x-y|<1$），只问一个概率；"
                  "或问完概率还要 $E(g(X,Y))$；或 $f(x,y)$ 对某个变量不含（对 $y$ 是常数）。"
                  "典型：$f(x,y)=3x,\\ 0<y<x<1$，求 $P(X+Y>1)$。",
        "steps": [
            "① 30 秒三问：$X,Y$ 独立吗（$f$ 能否拆成 $f_Xf_Y$、定义域是否矩形）；要“一个概率”还是要“$Z$ 的密度/期望”；区域是三角/圆/矩形哪一种。",
            "② 选路线：只问一个概率 → 重积分；要 $f_Z(z)$ 或后面要 $E(Z),D(Z)$ → 卷积 $f_Z=\\int f(x,z-x)\\,dx$；$f(x,y)$ 对某变量是常数 → 条件分布法（$Y\\mid X=x$ 是均匀，一行出结果）；非线性换元（$Z=Y/X$、$Z=XY$）→ 雅可比。",
            "③ 定限四件套：画区域标顶点 → 把 $y=g(x)$ 代进非零条件拆三条关于 $x$ 的不等式 → 找随参数变化的分界点 → 写分段，每段重新取交。",
            "④ 方向自检（10 秒，必做）：$P(>)+P(\\le)=1$；结果要落在区域占比的合理区间。这一步能拦下“$\\frac58$ 写成 $\\frac38$”与“拒绝域写在另一侧”两类错。",
            "⑤ 卷面五行：设 $Z=\\cdots$ → 区域 $D:\\cdots$ → $P=\\iint_D f\\,d\\sigma$ → 结果 → 框。",
        ],
        "template": "$P(X+Y>c)=\\int_{a}^{b}\\!\\int_{g(x)}^{h(x)}f(x,y)\\,dy\\,dx$；卷积版 $f_Z(z)=\\int f(x,z-x)\\,dx$，上下限由 $0<z-x<x<1$ 这类不等式组解出（$z<1$ 与 $z\\ge1$ 限不同）。",
        "traps": [
            "把 $\\int f_X(x)\\,[1-F_Y(c-x)]\\,dx$ 当通式——它只在 $X,Y$ 独立时成立，本题不独立必须用条件分布 $P(Y>c-x\\mid X=x)$。",
            "漏分段：卷积里 $0<z<1$ 是 $\\int_{z/2}^{z}$，$1\\le z<2$ 变成 $\\int_{z/2}^{1}$；条件分布里 $x\\le\\frac12$ 那段概率为 0。",
            "方向写反：算成 $\\frac38$（补集）以为对，或写“$P(X+Y>1)$”却积了 $x+y<1$ 的区域。",
        ],
        "next": ["j02", "j07", "j18"],
        "qids": [],
        "n": 0,
        "pts": 0,
        "years": [],
    }
    D["pojue"].append(entry)
    # j02 的“常转到”挂上新招
    for j in D["pojue"]:
        if j["id"] == "j02" and "j32" not in j["next"]:
            j["next"].append("j32")
    D["meta"]["npojue"] = len(D["pojue"])
    out = "window.DATA = " + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"
    io.open("data/data.js", "w", encoding="utf-8").write(out)
    print("data.js 写入：npojue =", D["meta"]["npojue"])

# ---------- 2. pojue.html 文案 ----------
p = "pojue.html"
h = io.open(p, encoding="utf-8").read()
pairs = [
    ("<title>破题诀 31 招 · 432 统计</title>", "<title>破题诀 32 招 · 432 统计</title>"),
    ("<h1>破题诀 31 招</h1>", "<h1>破题诀 32 招</h1>"),
    ("全部 31 招", "全部 32 招"),
    ("招法编号与《432题型递进练习_93题》的 31 个题型一一对应（j01↔题型 1），所以每招下面直接挂了三段练。",
     "招法编号与《432题型递进练习_93题》的 31 个题型一一对应（j01↔题型 1），所以每招下面直接挂了三段练。"
     "第 32 招（j32）是二维概率的专招：它不属于任何单一题型，但每年那道 15 分二维大题都用得上。"),
]
for old, new in pairs:
    if old in h:
        h = h.replace(old, new)
        print("html:", old[:24], "→ ok")
    else:
        print("html MISS:", old[:24])
io.open(p, "w", encoding="utf-8").write(h)

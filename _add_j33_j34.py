# -*- coding: utf-8 -*-
"""把两招写进 site/data/data.js：
  j33 = 期望·方差·求和 三层运算地基（无偏性证明的公共地基）
  j34 = 区间估计的样本量反解（为什么求 n 用 z 不用 t）
并同步 pojue / graph / index 的计数文案。可重复执行（幂等）。"""
import io
import json

# ---------------- 1. data.js ----------------
s = io.open("data/data.js", encoding="utf-8").read()
a, b = s.find("{"), s.rfind("}")
D = json.loads(s[a:b + 1])
have = {j["id"] for j in D["pojue"]}

j33 = {
    "id": "j33",
    "no": 33,
    "name": "期望·方差·求和：三层运算地基",
    "short": "认身份 → 一座桥 → 两条恒等式 → 五步收口",
    "kps": ["数字特征与矩", "无偏性", "估计量评价标准", "抽样分布与三大分布构造"],
    "signal": r"式子里同时出现 $E$、$D$、$\sum$、$X_i$、$\bar X$；或题说「证明 $T$ 是 $\theta$ 的无偏（相合／有效）估计」；"
              r"或要求 $E(X^2)$、$D(\bar X)$、$E\left[\sum(X_i-\bar X)^2\right]$。"
              r"典型：$X_1,\dots,X_n$ 来自 $N(\mu,\sigma^2)$，$S^2=\frac{1}{n-1}\sum_{i=1}^{n}(X_i-\bar X)^2$，证 $S^2$ 是 $\sigma^2$ 的无偏估计。",
    "steps": [
        r"① 认身份（10 秒）：$X_i$、$\bar X$ 是**随机变量**（有方差，不能当常数提）；$n,\mu,\sigma^2$ 才是常数。提之前问一句「它有方差吗」。",
        r"② 先找现成定理：见 $\frac{(n-1)S^2}{\sigma^2}$、$\frac{\bar X-\mu}{S/\sqrt n}$、$\frac{nS^2}{\sigma_0^2}$ 的形状 → 第一行写「由抽样分布定理 $\sim\chi^2/t/F$」，再用 $E\chi^2_k=k$ 收口。这一步决定 8 分还是 4 分。",
        r"③ 没定理才硬推：令 $Y_i=X_i-\mu$ 平移，把 $\bar X$ 换成 $\mu$，式子立刻干净。",
        r"④ 展开平方只靠两条：$\sum X_i=n\bar X$、$\sum(X_i-\bar X)^2=\sum X_i^2-n\bar X^2$；配套 $\sum(X_i-\bar X)=0$。",
        r"⑤ 逐个取 $E$：见 $X^2$ 用 $E(X^2)=DX+(EX)^2$；见 $\bar X^2$ 用 $E(\bar X^2)=D\bar X+(E\bar X)^2$；$E\sum=\sum E$ 永远可用。",
        r"⑥ 卷面八行（无偏性，χ² 路线）：由抽样分布定理 $\frac{(n-1)S^2}{\sigma^2}\sim\chi^2(n-1)$ → $E\left[\frac{(n-1)S^2}{\sigma^2}\right]=n-1$ → 线性提出 $\frac{(n-1)}{\sigma^2}E(S^2)=n-1$ → 得 $E(S^2)=\sigma^2$，故无偏。",
    ],
    "template": r"$E(aX+bY+c)=aEX+bEY+c$；$D(aX+b)=a^2DX$；$D(X\pm Y)=DX+DY\pm2\mathrm{Cov}$（独立才去交叉项）；"
                r"$E(X^2)=DX+(EX)^2$（E 与 D 之间唯一的桥）；"
                r"$\sum_{i=1}^{n}X_i=n\bar X$、$\sum(X_i-\bar X)=0$、$\sum(X_i-\bar X)^2=\sum X_i^2-n\bar X^2$；"
                r"$E\bar X=\mu$、$D\bar X=\sigma^2/n$；$\frac{(n-1)S^2}{\sigma^2}\sim\chi^2(n-1)$。",
    "traps": [
        r"把 $\bar X$ 当常数提出去：写成 $E(\bar X^2)=(E\bar X)^2$ 就是踩了——$\bar X$ 有方差。",
        r"$\sum(X_i-\bar X)^2$ 与 $\left[\sum(X_i-\bar X)\right]^2$ 混用：前者 $=(n-1)S^2$，后者 $=0$。",
        r"$D\left(\sum X_i\right)$ 直接写成 $\sum DX_i$：只有独立同分布才成立，且结果为 $n\sigma^2$；先写「独立」两字再拆。",
        r"证无偏时硬推恒等式、不引抽样分布定理——15 分题只拿 4 分的老路。",
    ],
    "next": ["j12", "j09", "j21"],
    "qids": [], "n": 0, "pts": 0, "years": [],
}

j34 = {
    "id": "j34",
    "no": 34,
    "name": "区间估计的样本量反解",
    "short": "求 n 不用 t → z 反解 → 向上取整 → 草稿里 t 迭代复核",
    "kps": ["区间估计", "抽样分布与三大分布构造", "估计量评价标准"],
    "signal": r"给置信度 + 「估计误差（半宽）不超过 $\delta$」或「区间长度不超过 $L$」，问至少抽多少样本／经费最省样本量。"
              r"典型：$\sigma$ 未知，$n=10$ 时 $\bar x=20.5$、$s=0.9$，问误差不超过 $0.5$ 需多少样本。",
    "steps": [
        r"① 先认问法：**求区间**（$n$ 已知）走 $t$；**求 $n$**（$n$ 未知）走 $z$。理由一句话：$t$ 的自由度 $=n-1$，$n$ 还没定，分位数根本不可查。",
        r"② 写半宽式：$z_{\alpha/2}\dfrac{\sigma}{\sqrt n}\le\delta$；$\sigma$ 未知时用样本 $s$ 代（大样本近似）。",
        r"③ 平方解出：$n\ge\left(\dfrac{z_{\alpha/2}\,s}{\delta}\right)^2$。双侧 95% 用 $z_{0.025}=1.96$，双侧 90% 用 $1.645$。",
        r"④ 取整：**一律向上**。$12.45\to 13$，取 12 就是精度不达标。",
        r"⑤ 严格复核（写草稿、不上卷）：以解出的 $n$ 得 $df=n-1$，用 $t_{\alpha/2}(df)$ 重算，迭代到 $n$ 不再变。本题 $13\to16\to15$，严格解 15；参考答案按教材约定给 13。",
        r"⑥ 卷面三行：写「因 $n$ 待定，$t$ 分位数不可查，按 $z$ 反解」→ 代入得 $n\ge12.45$ → 向上取整 $n\ge13$。那句理由本身就是采分点。",
    ],
    "template": r"$n\ge\left(\dfrac{z_{\alpha/2}\,\hat\sigma}{\delta}\right)^2$，$\delta$ 是**半宽**；若题给「区间长度 $\le L$」，先取 $\delta=L/2$。检验版的样本量另有公式 $n\ge\dfrac{(z_\alpha+z_\beta)^2\sigma^2}{\delta^2}$（见 j24），别混。",
    "traps": [
        r"求 $n$ 时查 $t$ 表：自由度未定——上一套卷 13 题就丢在这里。",
        r"$12.45$ 取成 $12$：样本量只能向上取整，向下等于没达到精度要求。",
        r"把「区间长度 $\le1$」当半宽 $=1$，忘了除 2。",
        r"双侧 95% 用 $z_{0.05}=1.645$：双侧要 $1.96$，$1.645$ 是单侧。",
    ],
    "next": ["j05", "j24", "j06"],
    "qids": [], "n": 0, "pts": 0, "years": [],
}

added = []
for e in (j33, j34):
    if e["id"] not in have:
        D["pojue"].append(e)
        added.append(e["id"])

# 反向链接：让老招能转到新招
back = {"j09": "j33", "j12": "j33", "j10": "j33", "j05": "j34", "j24": "j34"}
for j in D["pojue"]:
    t = back.get(j["id"])
    if t and t not in j["next"]:
        j["next"].append(t)

D["meta"]["npojue"] = len(D["pojue"])
out = "window.DATA = " + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"
io.open("data/data.js", "w", encoding="utf-8").write(out)
print("data.js: added =", added, "| npojue =", D["meta"]["npojue"])

# ---------------- 2. 页面计数文案 ----------------
pairs_all = {
    "pojue.html": [
        ("<title>破题诀 32 招 · 432 统计</title>", "<title>破题诀 34 招 · 432 统计</title>"),
        ("<h1>破题诀 32 招</h1>", "<h1>破题诀 34 招</h1>"),
        ('data-ch="all">全部 32 招', 'data-ch="all">全部 34 招'),
        ("第 32 招（j32）是二维概率的专招：它不属于任何单一题型，但每年那道 15 分二维大题都用得上。",
         "第 32 招（j32）是二维概率的专招；第 33 招（j33）是期望·方差·求和的运算地基（无偏性证明全靠它）；"
         "第 34 招（j34）管区间估计反求样本量。这三招都不对应单一题型，但每年的大题都用得上。"),
    ],
    "graph.html": [
        ("32 招不是并列的清单", "34 招不是并列的清单"),
        ("圆点编号 = 破题诀编号（01→31）", "圆点编号 = 破题诀编号（01→34）"),
        (">32 招编号<", ">34 招编号<"),
    ],
    "index.html": [
        ("拆成 111 道题、40 个考点、32 招", "拆成 111 道题、40 个考点、34 招"),
        ("轴二按 32 招解法切", "轴二按 34 招解法切"),
        ("破题诀 32 招（识别信号→固定动作）", "破题诀 34 招（识别信号→固定动作）"),
        ('["pojue.html","破题诀 32 招"', '["pojue.html","破题诀 34 招"'),
        ('"32 招之间的转招路径"', '"34 招之间的转招路径"'),
    ],
}
for fn, pairs in pairs_all.items():
    h = io.open(fn, encoding="utf-8").read()
    for old, new in pairs:
        if old in h:
            h = h.replace(old, new)
        else:
            print("MISS", fn, old[:30])
    io.open(fn, "w", encoding="utf-8").write(h)
print("html 文案更新完成")

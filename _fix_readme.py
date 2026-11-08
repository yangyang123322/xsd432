# -*- coding: utf-8 -*-
"""README 里的招数统计同步到 34 招，并注明 j32–j34 的来源。"""
import io

p = "README.md"
h = io.open(p, encoding="utf-8").read()
pairs = [
    ("| 破题诀 | 31 招 | 手写，与阶梯练题型一一对应 |",
     "| 破题诀 | 34 招 | 手写，与阶梯练题型一一对应（j01–j31）；j32 二维概率三解法、j33 期望·方差·求和运算地基、j34 区间估计的样本量反解为后补专招 |"),
    ("- **破题诀 31 招** `pojue.html`", "- **破题诀 34 招** `pojue.html`"),
    ("—— 31 招之间的转招路径", "—— 34 招之间的转招路径"),
    ("- `pojue.py` —— 31 招的正文（手写内容）。",
     "- `pojue.py` —— j01–j31 的正文（手写内容）；j32–j34 由 `_add_j32.py`、`_add_j33_j34.py` 直接写入 `data/data.js`（重建前需重跑，否则会丢）。"),
]
for old, new in pairs:
    if old in h:
        h = h.replace(old, new)
        print("ok:", old[:26])
    else:
        print("MISS:", old[:26])
io.open(p, "w", encoding="utf-8").write(h)

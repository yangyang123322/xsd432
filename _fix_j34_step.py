# -*- coding: utf-8 -*-
"""修 j34 步骤①：bold 里包了 $n$，inline 拆分后 ** 无法配对，页面上会露出 ** 。
改成不含行内公式的 bold。"""
import io
import json

s = io.open("data/data.js", encoding="utf-8").read()
D = json.loads(s[s.find("{"):s.rfind("}") + 1])

for j in D["pojue"]:
    if j["id"] != "j34":
        continue
    j["steps"][0] = (
        "① 先认问法：**求区间**（" + chr(36) + "n" + chr(36) + " 已知）走 " + chr(36) + "t" + chr(36) +
        "；**求样本量**（" + chr(36) + "n" + chr(36) + " 未知）走 " + chr(36) + "z" + chr(36) +
        "。理由一句话：" + chr(36) + "t" + chr(36) + " 的自由度 " + chr(36) + "=n-1" + chr(36) +
        "，" + chr(36) + "n" + chr(36) + " 还没定，分位数根本不可查。"
    )
    print("j34 step1 ->", j["steps"][0])

out = "window.DATA = " + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"
io.open("data/data.js", "w", encoding="utf-8").write(out)
print("written")

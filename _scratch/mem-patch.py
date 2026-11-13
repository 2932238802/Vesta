import sys

path = sys.argv[1]
with open(path, encoding='utf-8') as f:
    text = f.read()

anchor1 = '\n## 服务器（阿里云 47.111.175.191）'
bullet1 = (
    '\n- （2026-11-12/13）**Vesta 问卷侧进展**：2026-11-12 把前端路由改成懒加载、'
    '`server/src/routes/{admin,consult}` 与 `db/`、`ai/` 拆成模块（commit `71bd1e7`，已推）。'
    '2026-11-13 复查问卷链路，确认两个故障并写了修复方案（**未实施**）：①仪表盘「每组完成」恒 0'
    '（前端从没上报 `group_complete`）；②doc 模式后台「分数」是 82/60/25 的优先级映射值，不是真实得分。'
    '文档 `docs/archive/20261113/1-`、`2-`，commit `c8b8cc7`。'
    '**仓库仍是 public，`zxg/` 126 份学员咨询稿 + `zxg/guide` 里的服务器 IP 仍在版本库里（P0 未处理）**。'
    '详见 [cards/2026-11-13-vesta-survey-review.md](cards/2026-11-13-vesta-survey-review.md)\n'
)
assert anchor1 in text, 'anchor1 missing'
text = text.replace(anchor1, bullet1 + anchor1, 1)

anchor2 = '- **长期目标（2026-11-06）**'
bullet2 = (
    '- **Vesta 问卷侧两个故障待决定是否实施**：仪表盘「每组完成」、doc 模式后台分数'
    '（方案 `docs/archive/20261113/1-`、`2-`）；'
    '仓库转 Private + `zxg/` 移出版本库这件事仍未做（2026-11-12 提过，11-13 复查仍是 public）。\n'
)
assert anchor2 in text, 'anchor2 missing'
text = text.replace(anchor2, bullet2 + anchor2, 1)

anchor3 = '| 2026-11-12 | 在家吃夜宵（米线+红提） | [cards/2026-11-12-yexiao.md](cards/2026-11-12-yexiao.md) |'
row = '\n| 2026-11-13 | Vesta 问卷侧复查 + 两个故障方案（含 P0 未处理） | [cards/2026-11-13-vesta-survey-review.md](cards/2026-11-13-vesta-survey-review.md) |'
assert anchor3 in text, 'anchor3 missing'
text = text.replace(anchor3, anchor3 + row, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('ok')

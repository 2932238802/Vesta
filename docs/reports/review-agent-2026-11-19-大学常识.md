# 评审报告：CR-010 大学常识（G3）

> 角色：Review Agent ｜ 日期：2026-11-19 ｜ 范围：CR-010 / T-034 ~ T-038（v1.98）
> 基线：HEAD `2ddec17`，工作区未提交 ｜ 结论：**通过**（无 P0/P1；4 项 P3）
> 落盘说明：Review SubAgent 运行时未写盘，本文件由 Doc Agent 按评审原文如实落盘。

## 1. AC 判定

AC-010-1 ~ AC-010-10 **全部满足**。关键证据：导航顺序、`activeGroup`、路由与标题；搜索计数与空状态；默认第一篇与深链；`v-html` 仅来自 `renderMarkdown`；新建 `sort_order=MAX+1` 与自动选中；拖拽 4px 阈值与单事务排序；搜索禁用拖动；390px 阅读视图；401/400/404；错误态重试。

## 2. 独立验证

- `npm run verify` EXIT=0（245 文件 / 16 基线；1.98.0 ↔ v1.98；build 3.42s）。
- 临时库 `initSchema()`：36 表 / 49 索引，`consult_topics` 与索引存在。
- 未独立跑 33 条接口与 Playwright 70/70，借用 Dev 证据 + 静态复核。

## 3. 缺陷清单（均 P3）

### [P3] 列表首次加载重复请求第一篇正文
- 位置：`ConsultBasics.vue:231`、`:235-237`
- 影响：多一次 GET，无功能错误。
- 建议：watch 内判断 `topicLoading`，合并单一入口。

### [P3] ≤1000px 列表视图下排序失败提示不可见
- 位置：`ConsultBasics.vue:32` + `consultBasics.css:455-457`
- 影响：顺序回滚正确，但用户看不到失败提示。
- 建议：错误提示放到 rail 内或全局 toast。

### [P3] 触屏 pointer 拖拽可能抢占纵向滚动
- 位置：`TopicRail.vue:107-116,126`
- 说明：A-037 已声明触屏不保证；桌面无影响。
- 建议：`pointerType === 'mouse'` 才进入拖拽。

### [P3] PATCH 空对象也会刷新 `updated_at`
- 位置：`server/src/routes/consult/topics.ts:142-147`
- 建议：无字段时直接返回当前对象。

## 4. 已检查无问题

路由与排序校验；列表不含正文；Markdown 转义与协议白名单；`.basics-page` 前缀；版本与计数；其他模块零改动；用户注释 0 处改动。

## 5. 残留风险

- 无入库自动化接口/拖拽测试。
- 390px 与拖拽体感依赖 Dev 证据。
- 政策内容时效由维护者承担。

## 6. 结论与交接

- **G3 通过** → Meta Review Agent（G4）。本任务含新表与接口，按规则照常 G4，不豁免。

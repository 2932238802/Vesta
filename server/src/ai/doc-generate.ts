import type { Answers, Survey } from '../../../shared/src/types'
import {
  docFacts,
  normalizeDocAiContent,
  serializeDoc,
  type DocAiContent
} from '../../../shared/src/doc'
import { config } from '../env'
import { now } from '../db'
import { askDeepSeek, parseJsonObject } from './deepseek'

export interface DocAiMeta {
  model: string
  generatedAt: string
}

const DOC_SKILL = `# 大学四年规划报告

你是一名面向中国大学生的规划顾问，说话直接、克制，不贩卖焦虑，也不推课。

## 你会收到
1. 一份问卷回答（27 题，题目编号 Q1—Q26）。
2. 系统算好的几个事实：分层、建议卡点、关键节点。

## 只输出 JSON
{
  "conclusion": "一句话结论，把表面问题和真实卡点分开说",
  "sections": [
    { "title": "你现在卡在哪一层", "text": "..." },
    { "title": "什么时候要命", "text": "..." },
    { "title": "五年后的你", "text": "..." },
    { "title": "接下来 30 天", "text": "..." },
    { "title": "给你一句实话", "text": "..." }
  ]
}

## 五个小标题的写法（顺序固定，不能改）
1. 你现在卡在哪一层：从回答里挑一个最具体的卡点（词汇 / 听力 / 开口 / 方法 / 时间），说清它在考试或面试里长什么样。
2. 什么时候要命：用系统给的关键节点和倒推时间，写清还有几个月、错过会怎样。
3. 五年后的你：引用 TA 写的原话，加上想去的城市和想做的事，写一段 TA 能认出来的画面，不写鸡汤。
4. 接下来 30 天：给 3 个能在 30 天内开始的具体动作，按先后顺序。
5. 给你一句实话：一句克制、具体的提醒，不威胁、不安慰。

## 硬性要求
- 正文 800—1200 字，纯文本，不要 Markdown 标题或列表符号。
- 不得出现「报班」「课程」「学费」「不学就来不及」「不过级就没戏」这类字样。
- 不编造分数线、薪资、政策；需要事实时写「以官方最新公告为准」。
- 不要复述题目，不要写「你很棒」这类空话。
- conclusion 一句话，sections 必须正好 5 条，每条 title 用上面固定标题。`

function answerText(survey: Survey, answers: Answers): string {
  const values = serializeDoc(survey, answers)
  return Object.entries(values)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.join('、') : value === null ? '' : String(value)
      return text.trim() ? `${key}：${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

export async function generateDocContent(input: {
  survey: Survey
  answers: Answers
  name: string
}): Promise<{ content: DocAiContent; meta: DocAiMeta }> {
  const { survey, answers, name } = input
  const facts = docFacts(survey, answers)
  const userPrompt = `学生：${name || '同学'}

【问卷回答】
${answerText(survey, answers)}

【系统事实】
分层：${facts.priority}
建议卡点：${facts.stuck}（${facts.stuckDetail}）
建议结论：${facts.oneLine}
关键节点：${facts.deadline}
五年后的画面要点：${facts.future}

请按 Skill 要求写报告，只输出 JSON 对象。`

  const messages = [
    { role: 'system' as const, content: DOC_SKILL },
    { role: 'user' as const, content: userPrompt }
  ]

  let content = normalizeDocAiContent(parseJsonObject(await askDeepSeek(messages)))
  if (!content.conclusion || content.sections.length < 5) {
    const repair = [
      ...messages,
      { role: 'assistant' as const, content: JSON.stringify(content).slice(0, 12_000) },
      {
        role: 'user' as const,
        content:
          '上面的 JSON 不完整。请补齐 conclusion，并确保 sections 正好 5 条、每条都有 title 和 text，只输出合法 JSON。'
      }
    ]
    content = normalizeDocAiContent(parseJsonObject(await askDeepSeek(repair)))
  }

  if (!content.conclusion || content.sections.length < 3) {
    throw new Error('AI 报告内容不完整')
  }

  return {
    content,
    meta: { model: config.deepseekModel, generatedAt: now() }
  }
}

export function readDocContent(raw: string | null): DocAiContent | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const record = parsed as { doc?: unknown; content?: unknown }
    if (record.doc !== true) return null
    const content = normalizeDocAiContent(record.content)
    return content.conclusion && content.sections.length ? content : null
  } catch {
    return null
  }
}

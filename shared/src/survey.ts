import type { Question, QuestionOption, Survey } from './types'

const rating = (qid: string): QuestionOption[] =>
  [1, 2, 3, 4, 5].map((n) => ({ id: `${qid}_${n}`, label: `${n} 分`, score: n }))

const choice = (qid: string, rows: [string, number | null][]): QuestionOption[] =>
  rows.map(([label, score], i) => ({ id: `${qid}_${i + 1}`, label, score }))

const b = (
  key: string,
  code: string,
  title: string,
  low: string,
  high: string,
  dimension: string
): Question => ({
  id: key,
  code,
  groupId: 'b',
  title,
  type: 'single',
  display: 'rating',
  required: true,
  dimension,
  role: 'self',
  anchors: { low, high },
  options: rating(key)
})

export const defaultSurvey: Survey = {
  id: 'survey-main',
  version: 1,
  title: '大学现状自评',
  intro:
    '答案没有好坏，按真实情况填就好，可以随时回退\n不是心理测试，也不预测任何结果\n最后会问你的优先方向、半年目标和首选城市',
  estimatedMinutes: 8,
  groups: [
    {
      id: 'a',
      code: 'A',
      title: '先认识一下你',
      subtitle: '这些信息只用来调整参照线，学校类型不计入总分'
    },
    {
      id: 'b',
      code: 'B',
      title: '你现在的位置',
      subtitle: '每题 1 到 5 分，按第一反应选，不用想太久'
    },
    {
      id: 'c',
      code: 'C',
      title: '你怎么看这件事',
      subtitle: '每一项都按 1 到 5 分打分，分数会计入报告判定'
    },
    {
      id: 'd',
      code: 'D',
      title: '把话说具体一点',
      subtitle: '最后一组，问的是最近实际发生的事'
    }
  ],
  questions: [
    {
      id: 'a1',
      code: 'A1',
      groupId: 'a',
      title: '你的学校属于',
      hint: '只用来调整参照线，不计入总分',
      type: 'single',
      required: true,
      options: choice('a1', [
        ['985 / 211', null],
        ['双非一本', null],
        ['双非二本', null],
        ['民办本科', null],
        ['专科高职', null]
      ])
    },
    {
      id: 'a2',
      code: 'A2',
      groupId: 'a',
      title: '你的专业',
      type: 'text',
      required: true,
      placeholder: '例：汉语言文学'
    },
    {
      id: 'a3',
      code: 'A3',
      groupId: 'a',
      title: '你现在大几',
      type: 'single',
      required: true,
      options: choice('a3', [
        ['大一', null],
        ['大二', null],
        ['大三', null],
        ['大四', null]
      ])
    },
    {
      id: 'a4',
      code: 'A4',
      groupId: 'a',
      title: '家乡和读书城市',
      type: 'text',
      required: true,
      fields: ['家乡', '读书城市']
    },
    {
      id: 'a6',
      code: 'A6',
      groupId: 'a',
      title: '你想去哪个城市、做什么行业',
      type: 'single',
      required: true,
      dimension: 'b1',
      options: choice('a6', [
        ['明确，能说出城市和行业', 5],
        ['大概有方向，能说出行业', 3],
        ['还没想好', 1]
      ])
    },
    {
      id: 'a7',
      code: 'A7',
      groupId: 'a',
      title: '你希望毕业时第一份工作的月薪',
      hint: '只用于报告里的对照，不计分',
      type: 'single',
      required: true,
      options: choice('a7', [
        ['3000 以下', null],
        ['3000 到 5000', null],
        ['5000 到 8000', null],
        ['8000 到 12000', null],
        ['12000 以上', null]
      ])
    },
    {
      id: 'a8',
      code: 'A8',
      groupId: 'a',
      title: '你想去哪个城市、做什么，为什么',
      hint: '选填。城市写你最想去的；原因写你为什么选这里，比如机会、生活成本或家里人',
      type: 'text',
      required: false,
      fields: ['想去城市', '理想岗位 / 行业', '去的原因']
    },
    {
      id: 'a9',
      code: 'A9',
      groupId: 'a',
      title: '当前优先方向',
      hint: '单选，不计分。教师招聘属于事业单位，和考研可以并行',
      type: 'single',
      required: true,
      options: choice('a9', [
        ['直接就业', null],
        ['考研', null],
        ['保研', null],
        ['专升本', null],
        ['公务员考试', null],
        ['事业单位（含教师招聘）', null],
        ['尚在探索', null],
        ['其他', null]
      ])
    },
    {
      id: 'a10',
      code: 'A10',
      groupId: 'a',
      title: '未来 6—12 个月最想先完成的目标',
      hint: '单选，不计分。选最优先的一项，再用一句话写清希望何时、得到什么结果',
      type: 'choiceText',
      required: true,
      noteLabel: '希望何时、得到什么结果',
      otherLabel: '你的目标',
      otherPlaceholder: '写清你要做什么',
      options: choice('a10', [
        ['课程成绩', null],
        ['四六级雅思准备', null],
        ['转专业或跨专业准备', null],
        ['作品项目竞赛', null],
        ['实习求职', null],
        ['尚不明确', null],
        ['其他', null]
      ])
    },
    {
      id: 'a11',
      code: 'A11',
      groupId: 'a',
      title: '你目前把这个目标想清楚到哪一步',
      hint: '0 到 4 分，不计分。不了解怎么判断也可以直接选最后一项',
      type: 'single',
      required: true,
      options: choice('a11', [
        ['0 分：只有“变好、找好工作”等愿望', null],
        ['1 分：有方向，但没有具体任务', null],
        ['2 分：有具体任务，但没有完成标准或日期', null],
        ['3 分：有任务、标准和计划时间', null],
        ['4 分：以上都有，并核对过关键外部截止时间或要求', null],
        ['不了解如何判断', null]
      ])
    },
    {
      id: 'a12',
      code: 'A12',
      groupId: 'a',
      title: '为什么现在想做',
      hint: '多选，最多 2 项，不计分',
      type: 'multi',
      required: true,
      maxSelect: 2,
      options: choice('a12', [
        ['个人兴趣', null],
        ['已有明确考试或申请节点', null],
        ['某次经历受到影响', null],
        ['希望经济独立', null],
        ['家人建议', null],
        ['看到同学行动', null],
        ['当前遇到实际困难', null],
        ['还不确定', null],
        ['其他', null]
      ])
    },
    {
      id: 'a14',
      code: 'A14',
      groupId: 'a',
      title: '这个收入或职业期待主要来自哪里',
      hint: '多选，不计分',
      type: 'multi',
      required: true,
      options: choice('a14', [
        ['近期具体招聘信息', null],
        ['官方或可追溯报告', null],
        ['有相关经历的从业者', null],
        ['家人同学', null],
        ['社交媒体', null],
        ['自己的希望', null],
        ['尚无依据', null]
      ])
    },

    b(
      'b1',
      'B1',
      '方向清晰度',
      '完全不知道毕业要做什么，也没想过',
      '知道自己要考研还是工作、去哪个城市、做什么行业，并能说出为什么',
      'b1'
    ),
    b(
      'b2',
      'B2',
      '学业基础',
      '四六级都没过，绩点中下，经常担心挂科',
      '四级已过、六级在准备或已过，绩点稳定在专业前列',
      'b2'
    ),
    b(
      'b3',
      'B3',
      '实践积累',
      '没有任何实习、项目、竞赛',
      '有两段以上实习或项目，参加过省级以上竞赛',
      'b3'
    ),
    b(
      'b4',
      'B4',
      '技能储备',
      '除了上课学的，没有一项能拿出去用的技能',
      '有一两项能直接换成岗位的技能，比如口语、编程、设计、剪辑',
      'b4'
    ),
    b(
      'b5',
      'B5',
      '方法意识',
      '只会死记硬背和刷题，不知道效率差在哪',
      '会抓重点、会复盘、知道找人请教、有自己的方法',
      'b5'
    ),
    b(
      'b6',
      'B6',
      '执行力',
      '计划做不完，常常拖到最后，容易半途而废',
      '定了的事基本能按时完成，能坚持一个月以上',
      'b6'
    ),
    b(
      'b7',
      'B7',
      '信息与环境',
      '不知道去哪里查信息，身边人普遍在混日子',
      '知道该查什么、在哪里查，身边有比自己强的人',
      'b7'
    ),
    b(
      'b8',
      'B8',
      '家庭支持',
      '家里无法支持任何额外投入，也不理解你的规划',
      '家里愿意支持合理的学习投入和外出实习',
      'b8'
    ),
    {
      id: 'b9',
      code: 'B9',
      groupId: 'b',
      title: '英语实际使用能力',
      hint: '只评实际使用，不看你考到几级',
      type: 'single',
      display: 'rating',
      required: true,
      dimension: 'b9',
      role: 'self',
      anchors: {
        low: '看英文资料基本靠翻译软件，开口说不成句，没写过英文邮件或材料',
        high: '能直接读英文文档或论文，能写工作邮件和报告，能用英语开会或面试'
      },
      options: rating('b9')
    },

    {
      id: 'c1',
      code: 'C1',
      groupId: 'c',
      title: '大学四年最后能不能拿到结果，下面五个因素各占多少',
      hint: '每一项都打 1 到 5 分：1 分是几乎不重要，5 分是极其重要',
      type: 'matrix',
      required: true,
      scale: 5,
      anchors: { low: '几乎不重要', high: '极其重要' },
      rows: [
        { id: 'c1_1', label: '只要足够努力就行' },
        { id: 'c1_2', label: '老师和资源最重要' },
        { id: 'c1_3', label: '身边的人和环境最重要' },
        { id: 'c1_4', label: '方法最重要' },
        { id: 'c1_5', label: '家庭条件最重要' }
      ]
    },
    {
      id: 'c2',
      code: 'C2',
      groupId: 'c',
      title: '你现在最缺什么，每一项缺多少',
      hint: '每一项都打 1 到 5 分：1 分是缺得很明显，5 分是不缺。分数越低表示越缺；这组分数会按比重计入总分',
      type: 'matrix',
      required: true,
      scale: 5,
      anchors: { low: '缺得很明显', high: '不缺' },
      rows: [
        { id: 'c2_1', label: '方向', dimension: 'b1' },
        { id: 'c2_2', label: '方法', dimension: 'b5' },
        { id: 'c2_3', label: '信息', dimension: 'b7' },
        { id: 'c2_4', label: '资源', dimension: 'b3' },
        { id: 'c2_5', label: '有人监督', dimension: 'b6' },
        { id: 'c2_6', label: '英语', dimension: 'b9' }
      ]
    },
    {
      id: 'd1',
      code: 'D1',
      groupId: 'd',
      title: '你平均每周花多少时间在自我提升上',
      type: 'single',
      required: true,
      dimension: 'b6',
      role: 'behavior',
      options: choice('d1', [
        ['少于 3 小时', 1],
        ['3 到 7 小时', 2],
        ['7 到 15 小时', 3],
        ['15 到 25 小时', 4],
        ['25 小时以上', 5]
      ])
    },
    {
      id: 'd2',
      code: 'D2',
      groupId: 'd',
      title: '最近一件坚持超过一个月的事',
      type: 'single',
      required: true,
      dimension: 'b6',
      role: 'behavior',
      options: choice('d2', [
        ['没有', 1],
        ['有，但和学习无关', 3],
        ['有，和学习相关', 5]
      ])
    },
    {
      id: 'd3',
      code: 'D3',
      groupId: 'd',
      title: '你的四六级',
      type: 'single',
      required: true,
      dimension: 'b9',
      role: 'behavior',
      options: choice('d3', [
        ['都没过，也没准备', 1],
        ['在准备', 2],
        ['四级已过', 4],
        ['六级已过', 5]
      ])
    },
    {
      id: 'd4',
      code: 'D4',
      groupId: 'd',
      title: '你有没有查过本专业毕业生的去向',
      type: 'single',
      required: true,
      dimension: 'b7',
      role: 'behavior',
      options: choice('d4', [
        ['没查过', 1],
        ['听说过', 3],
        ['查过并记下', 5]
      ])
    },
    {
      id: 'd1a',
      code: 'D1a',
      groupId: 'd',
      title: '你核对过目标对学历、专业或成绩的要求吗',
      hint: '0 到 4 分，不计分',
      type: 'single',
      required: true,
      options: choice('d1a', [
        ['0 分：尚未查过', null],
        ['1 分：只听说大概要求', null],
        ['2 分：看过一份相关招生 / 招聘条件，但未逐项对照自己', null],
        ['3 分：已用较新的正式材料逐项对照，并标出疑点', null],
        ['4 分：关键疑点已获得可靠来源解释，记录适用年份，并有复核计划', null]
      ])
    }
  ],
  dimensions: [
    { key: 'b1', name: '方向清晰度', weight: 15 },
    { key: 'b2', name: '学业基础', weight: 8 },
    { key: 'b3', name: '实践积累', weight: 15 },
    { key: 'b4', name: '技能储备', weight: 11 },
    { key: 'b5', name: '方法意识', weight: 11 },
    { key: 'b6', name: '执行力', weight: 15 },
    { key: 'b7', name: '信息与环境', weight: 8 },
    { key: 'b8', name: '家庭支持', weight: 7 },
    { key: 'b9', name: '英语能力', weight: 10 }
  ],
  tiers: [
    { tier: 'A', min: 80, label: '已经在做对的事，缺的是放大', line: '该做的你已经在做，接下来是把长板放大，让别人一眼看见' },
    { tier: 'B', min: 65, label: '方向大体对，短板集中在一两项', line: '方向没有大问题，把最低的一两项补上，整体会明显不一样' },
    { tier: 'C', min: 50, label: '有零散积累，但不成体系', line: '你不是没做事，是做过的事还没有连成一条线' },
    { tier: 'D', min: 35, label: '基本空白，越早动手越好', line: '现在缺的不是方法，是先把一件具体的事做起来' },
    { tier: 'E', min: 0, label: '先把一件事做起来，方法往后放', line: '先完成一件小事，再谈方法和规划' }
  ]
}

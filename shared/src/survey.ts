import type { QuestionOption, Survey } from './types'

const choice = (qid: string, rows: [string, number | null][]): QuestionOption[] =>
  rows.map(([label, score], i) => ({ id: `${qid}_${i + 1}`, label, score }))

export const defaultSurvey: Survey = {
  id: 'survey-main',
  version: 1,
  title: '大学四年规划自测',
  intro:
    '这不是英语测试，也不考你什么。我想先知道你现在是什么情况、想去哪，才好在电话里给你做规划。大概 8 分钟，答完我这边会给你一份分析。\n这份只用于给你做规划，不会外传。',
  estimatedMinutes: 8,
  reportMode: 'doc',
  groups: [
    { id: 'p1', code: '一', title: '基本情况', subtitle: '' },
    { id: 'p2', code: '二', title: '你现在的位置', subtitle: '' },
    { id: 'p3', code: '三', title: '你怎么学、家里什么情况', subtitle: '' },
    { id: 'p4', code: '四', title: '英语这块', subtitle: '' }
  ],
  questions: [
    {
      id: 'q1',
      code: 'Q1',
      groupId: 'p1',
      title: '你的学校属于',
      type: 'single',
      required: true,
      options: choice('q1', [
        ['C9', null],
        ['985', null],
        ['211', null],
        ['双一流', null],
        ['普通一本', null],
        ['普通二本', null],
        ['民办本科', null],
        ['公办专科', null],
        ['民办专科', null]
      ])
    },
    {
      id: 'q2',
      code: 'Q2',
      groupId: 'p1',
      title: '你的专业是',
      type: 'text',
      required: true,
      placeholder: '例如：英语师范、大数据技术、环境工程'
    },
    {
      id: 'q3',
      code: 'Q3',
      groupId: 'p1',
      title: '你现在大几',
      type: 'single',
      required: true,
      options: choice('q3', [
        ['大一', null],
        ['大二', null],
        ['大三', null],
        ['大四', null]
      ])
    },
    {
      id: 'q4',
      code: 'Q4',
      groupId: 'p1',
      title: '家乡和学校所在城市',
      hint: '写成「省 - 地级市」，例如：福建 - 莆田',
      type: 'text',
      required: true,
      fields: ['家乡（省 - 市）', '学校所在城市（省 - 市）']
    },
    {
      id: 'q5',
      code: 'Q5',
      groupId: 'p1',
      title: '毕业后想从事本专业相关的工作吗',
      type: 'single',
      required: true,
      options: choice('q5', [
        ['想', null],
        ['不想', null],
        ['还没想清楚', null]
      ])
    },
    {
      id: 'q5a',
      code: 'Q5a',
      groupId: 'p1',
      title: '想做什么行业、什么岗位',
      hint: '可跳过',
      type: 'text',
      required: false,
      placeholder: '例如：跨境电商运营、小学英语老师',
      showIf: { question: 'q5', when: ['q5_2', 'q5_3'] }
    },
    {
      id: 'q6',
      code: 'Q6',
      groupId: 'p1',
      title: '毕业后的第一选择',
      type: 'single',
      required: true,
      options: choice('q6', [
        ['保研', null],
        ['考研', null],
        ['就业', null],
        ['考公', null],
        ['考编', null],
        ['出国', null],
        ['还没确定', null]
      ])
    },
    {
      id: 'q7',
      code: 'Q7',
      groupId: 'p1',
      title: '现在在准备什么',
      type: 'multi',
      required: true,
      options: choice('q7', [
        ['绩点', null],
        ['四六级', null],
        ['竞赛科研', null],
        ['实习', null],
        ['计算机二级/普通话证书/教资/初会之类的专业就业的证书', null],
        ['专升本考试', null],
        ['琢磨怎么实现经济独立', null],
        ['期末考', null],
        ['期中考', null]
      ])
    },
    {
      id: 'q8',
      code: 'Q8',
      groupId: 'p1',
      title: '想去哪个城市工作',
      type: 'single',
      required: true,
      options: choice('q8', [
        ['北上广深', null],
        ['新一线（杭州、成都、武汉、西安等）', null],
        ['家乡省会', null],
        ['回家乡小城', null],
        ['还没想好', null]
      ])
    },
    {
      id: 'q9',
      code: 'Q9',
      groupId: 'p2',
      title: '实习实践',
      type: 'single',
      required: true,
      options: choice('q9', [
        ['有 1–3 段能写进简历的校外实习（四大、500 强、行业头部公司）', null],
        ['只有校内实践（社团、三下乡、竞赛、助教）', null],
        ['做过兼职，但和专业没关系', null],
        ['一段都没有', null]
      ])
    },
    {
      id: 'q10',
      code: 'Q10',
      groupId: 'p2',
      title: '能力储备',
      type: 'multi',
      required: true,
      options: choice('q10', [
        ['底层通用能力：英语口语、表达、写作', null],
        ['垂直技能：编程、剪辑、设计、数据分析、会计实务', null],
        ['证书：教资、计算机二级、驾照', null],
        ['还没培养出任何一项，正在开始', null],
        ['说不清该培养什么', null]
      ])
    },
    {
      id: 'q11',
      code: 'Q11',
      groupId: 'p2',
      title: '方向清晰度',
      type: 'single',
      required: true,
      options: choice('q11', [
        ['有明确方向，也知道具体任务和时间节点', null],
        ['有方向，但没有具体任务', null],
        ['有几个想法，都没落地', null],
        ['完全不知道', null]
      ])
    },
    {
      id: 'q12',
      code: 'Q12',
      groupId: 'p2',
      title: '环境氛围',
      type: 'single',
      required: true,
      options: choice('q12', [
        ['身边大部分人在努力，我容易被带动', null],
        ['努力和躺平都有，我自己定', null],
        ['大部分人都在躺，我有点焦虑', null],
        ['说不上来', null]
      ])
    },
    {
      id: 'q13',
      code: 'Q13',
      groupId: 'p2',
      title: '执行力',
      type: 'single',
      required: true,
      options: choice('q13', [
        ['定了目标立刻做，能一直坚持', null],
        ['定了计划会拖，拖着可能就没了', null],
        ['经常定目标，但从没落地', null],
        ['基本不定目标', null]
      ])
    },
    {
      id: 'q14',
      code: 'Q14',
      groupId: 'p3',
      title: '回到高中：你高中阶段更接近哪种情况？',
      hint: '这里问的是高中，因为大学考试成绩受老师给分、考试形式影响太大，看不出学习方法。',
      type: 'single',
      required: true,
      options: choice('q14', [
        ['一直比较努力，成绩也在班级或年级前列', null],
        ['花别人 3–5 倍时间，成绩还是追不上', null],
        ['花的时间不多，成绩还过得去', null],
        ['时间没少花，成绩一直不太行', null]
      ])
    },
    {
      id: 'q15',
      code: 'Q15',
      groupId: 'p3',
      title: '家庭能提供的支持',
      type: 'single',
      required: true,
      options: choice('q15', [
        ['毕业工作家里能直接安排', null],
        ['安排不了，但实习、学技能这些事家里出钱出力都支持', null],
        ['经济一般，真需要且合理会想办法', null],
        ['爸妈不太理解我的选择，也不太支持', null],
        ['基本靠自己，学费和生活费要自己挣', null]
      ])
    },
    {
      id: 'q16',
      code: 'Q16',
      groupId: 'p3',
      title: '信息差',
      type: 'single',
      required: true,
      branches: {
        question: 'q6',
        map: {
          q6_1: {
            title: '保研的加分规则、竞赛报名时间、科研项目怎么进，你清楚吗？',
            options: choice('q16', [
              ['都清楚', null],
              ['知道一两项', null],
              ['只听过', null],
              ['完全不知道', null]
            ])
          },
          q6_2: {
            title: '目标院校的分数线、考试科目、对英语和证书的要求，你查过吗？',
            options: choice('q16', [
              ['都查过', null],
              ['查过一部分', null],
              ['只知道要考', null],
              ['没查', null]
            ])
          },
          q6_3: {
            title: '本专业对口的岗位、学历、英语和证书要求，你了解吗？',
            options: choice('q16', [
              ['很了解', null],
              ['知道大概', null],
              ['只听过名字', null],
              ['完全不了解', null]
            ])
          },
          q6_4: {
            title: '岗位表、报名时间、专业和证书限制，你清楚吗？',
            options: choice('q16', [
              ['都清楚', null],
              ['部分清楚', null],
              ['只听过', null],
              ['不知道', null]
            ])
          },
          q6_5: {
            title: '岗位表、报名时间、专业和证书限制，你清楚吗？',
            options: choice('q16', [
              ['都清楚', null],
              ['部分清楚', null],
              ['只听过', null],
              ['不知道', null]
            ])
          },
          q6_6: {
            title: '你查过出国大概需要什么条件（语言、成绩、材料）吗？',
            options: choice('q16', [
              ['查过', null],
              ['知道大概', null],
              ['只听过', null],
              ['没查', null]
            ])
          },
          q6_7: {
            title: '你查过目标方向对学历、英语或证书的要求吗？',
            options: choice('q16', [
              ['查过', null],
              ['知道大概', null],
              ['只听过', null],
              ['没查', null]
            ])
          }
        }
      }
    },
    {
      id: 'q24',
      code: 'Q17',
      groupId: 'p4',
      title: '你觉得英语对你未来有多重要',
      hint: '0 到 10 分，越靠右越重要',
      type: 'number',
      required: true,
      range: { min: 0, max: 10, step: 1 }
    },
    {
      id: 'q17',
      code: 'Q18',
      groupId: 'p4',
      title: '你现在的英语学到哪一步',
      type: 'single',
      required: true,
      options: choice('q17', [
        ['四级还没过，正在备考四级', null],
        ['四级已经过了，正在备考六级', null],
        ['六级已经过了，在准备更高级别的考试（雅思 / 托福 / 考研英语 / 专八）', null]
      ])
    },
    {
      id: 'q18',
      code: 'Q19',
      groupId: 'p4',
      title: '上次四级哪部分丢分最多',
      type: 'multi',
      required: false,
      showIfAll: [
        { question: 'q17', when: ['q17_2', 'q17_3'] },
        { question: 'q24', min: 6 }
      ],
      options: choice('q18', [
        ['听力', null],
        ['阅读', null],
        ['写作翻译', null],
        ['完形选词', null],
        ['说不清', null]
      ])
    },
    {
      id: 'q25',
      code: 'Q20',
      groupId: 'p4',
      title: '你觉得英语学不好最主要的原因是',
      hint: '最多选 2 个',
      type: 'multi',
      required: true,
      maxSelect: 2,
      options: choice('q25', [
        ['没时间', null],
        ['记不住', null],
        ['没人教方法', null],
        ['坚持不下来', null],
        ['不知道学了有什么用', null],
        ['基础太差', null],
        ['不知道怎么开始', null]
      ])
    },
    {
      id: 'q19',
      code: 'Q21',
      groupId: 'p4',
      title: '你现在怎么学英语',
      type: 'multi',
      required: true,
      showIfAll: [{ question: 'q24', min: 6 }],
      options: choice('q19', [
        ['背单词 App', null],
        ['刷真题', null],
        ['看剧看视频', null],
        ['跟课', null],
        ['几乎没学', null],
        ['其他', null]
      ])
    },
    {
      id: 'q20',
      code: 'Q22',
      groupId: 'p4',
      title: '一周花多少时间在英语上',
      type: 'single',
      required: true,
      showIfAll: [{ question: 'q24', min: 6 }],
      options: choice('q20', [
        ['少于 3 小时', null],
        ['3–7 小时', null],
        ['7–14 小时', null],
        ['14 小时以上', null]
      ])
    },
    {
      id: 'q21',
      code: 'Q23',
      groupId: 'p4',
      title: '背单词的情况',
      type: 'single',
      required: true,
      showIfAll: [{ question: 'q24', min: 6 }],
      options: choice('q21', [
        ['每天背、能记住', null],
        ['背了忘、忘了背', null],
        ['考前突击', null],
        ['基本不背', null]
      ])
    },
    {
      id: 'q22',
      code: 'Q24',
      groupId: 'p4',
      title: '你的口语和听力',
      type: 'single',
      required: true,
      showIfAll: [{ question: 'q24', min: 6 }],
      options: choice('q22', [
        ['完全开不了口，四级听力也基本听不懂', null],
        ['开不了口，但能听懂一些简单对话', null],
        ['能听懂，也能说几句，但不流利', null],
        ['能日常交流，比较自如', null]
      ])
    },
    {
      id: 'q26',
      code: 'Q25',
      groupId: 'p4',
      title: '五年后，你希望自己是什么样',
      hint: '一句话也行，想到什么写什么',
      type: 'text',
      required: true,
      placeholder: '一句话也行'
    },

  ],
  dimensions: [],
  tiers: [
    { tier: 'A', min: 66, label: '优先跟进', line: '方向清楚、执行强、信息也查得比较到位，尽快约电话。' },
    { tier: 'B', min: 33, label: '可培养', line: '有目标但信息差大，或执行力中等，值得跟进。' },
    { tier: 'C', min: 0, label: '先放一放', line: '方向和执行都弱，顾问不必优先花时间。' }
  ]
}

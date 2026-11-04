import type { ReportTemplate } from './types'

export const defaultTemplate: ReportTemplate = {
  version: 1,
  theme: {
    accent: '#2f5d46',
    paper: '#fbfaf6',
    showTotal: false,
    brand: '',
    signature: '学姐'
  },
  modules: [
    { key: 'hero', enabled: true },
    { key: 'target', enabled: true },
    { key: 'radar', enabled: true },
    { key: 'strengths', enabled: true },
    { key: 'gaps', enabled: true },
    { key: 'consistency', enabled: true },
    { key: 'cognition', enabled: true },
    { key: 'actions', enabled: true }
  ],
  copy: {
    hero: {
      eyebrow: '现状诊断 · {{date}}',
      title: '一句话诊断',
      noQuote: '你在「{{low}}」上的 {{lowScore}} 分，是这份问卷里最先该动的地方',
      tierLine: '{{tierLine}}'
    },
    target: {
      title: '你的目标，和现在的距离',
      subtitle: '按你自己填的城市、岗位和期望月薪对照，不是通用建议',
      cityLabel: '目标城市',
      roleLabel: '理想岗位',
      salaryLabel: '期望月薪',
      hometownLabel: '家乡',
      priorityLabel: '优先方向',
      goalLabel: '半年目标',
      reasonLabel: '去的原因',
      advantageTitle: '你已经有的优势',
      gapTitle: '现在缺什么',
      salaryTitle: '这个薪资区间看什么',
      salaryNote:
        '你期望的月薪是「{{salary}}」。这个区间通常看的是：{{threshold}}。你在「{{low}}」上是 {{lowScore}} 分，这是最直接的一块短板。',
      cityNoteHometown:
        '你把家乡「{{city}}」放在首选。熟悉环境、家里能搭把手、生活成本低，这是你的现实优势；同时要确认本地有多少「{{role}}」的岗位，别只看城市。',
      cityNoteStudy:
        '你选择留在读书城市「{{city}}」。本地实习、校招和老师资源更容易接上，这层地利别浪费。',
      cityNoteOther:
        '你打算去「{{city}}」。机会更多，但信息、住处和落脚点都要提前准备，别等到毕业才动。',
      closing: '先补最低的那一项，再把优势做成能拿出手的证据',
      missingRole: '还没想好的岗位',
      salaryBands: {
        a7_1: '能把一件小事完整做完，按时交付，不让人反复催',
        a7_2: '有一段能讲清楚的实践，加上基本的沟通和协作',
        a7_3: '有一段相关实习或项目，外加一项能当场展示的技能',
        a7_4: '有两段相关经历，能独立负责一小块工作，对行业有基本判断',
        a7_5: '有稀缺技能或拿得出手的作品，行业积累明显高于同龄人'
      }
    },
    radar: {
      title: '九项现状',
      subtitle: '满分 100，按你自己打的分换算，不是能力排名'
    },
    strengths: {
      title: '你已经在做对的事',
      subtitle: '前三项，不用改，继续放大',
      item: '{{name}} {{score}} 分'
    },
    gaps: {
      title: '最该动的三件事',
      subtitle: '从最低的一项开始，不用全都补'
    },
    consistency: {
      title: '你自己说的话对不上',
      intro: '下面几处，是你给自己打的分和你说的事实之间的差距',
      item: '你在「{{name}}」上给自己打了 {{self}} 分，但你的实际情况是 {{evidence}}',
      closing: '不用急着解释，先挑最明显的一处，用一个月去验证'
    },
    cognition: {
      title: '你重视的，和你实际有的',
      weights: '你的五项权重：{{weights}}',
      intro:
        '你把「{{top}}」看得最重（{{topWeight}} 分），把「{{lightest}}」看得最轻（{{lightWeight}} 分）。下面只把权重和实际得分放在一起，不下结论。',
      compare: '你在「{{top}}」上给了 {{topWeight}} 分，这一项的实际得分是 {{topScore}} 分。',
      lightest:
        '你给「{{lightest}}」的权重是 {{lightWeight}} 分，这一项的实际得分是 {{lightScore}} 分。',
      needLine:
        '你在「{{need}}」这一项上的缺口最明显（你打了 {{needWeight}} 分），所以它在总分里占了更高的比重，这次判定按这个权重计算。',
      closing: '按你给的权重，最该先补的是「{{priority}}」。先动这一项，比重新规划一遍更有用',
      options: {
        c1_1: '你相信努力是门槛，这没错，但门槛之上拼的是方法和信息',
        c1_2: '老师和资源确实重要，资源通常流向已经能做事的人',
        c1_3: '环境会影响你，你也可以先换掉每天接触的那几个人',
        c1_4: '你重视方法，方法要落在一件具体的事上才算数',
        c1_5: '家庭条件会限制选项，但不会替你做选择'
      }
    },
    actions: {
      title: '接下来 30 天',
      subtitle: '三件事，都能验证，都不需要花钱',
      item: '{{text}}',
      closing: '做完一件再开始下一件，别同时开三个',
      fallback: [
        '把这学期最想完成的一件事写下来，贴在每天能看到的地方',
        '找一个你认可的同专业学长学姐，约一次二十分钟的聊天',
        '把手机里最常用的娱乐 App 设成每日限时'
      ]
    },
    claim: {
      title: '预约一次免费的现状梳理',
      description:
        '留下一个或两个你方便的时间段和微信号。我会先看自己的时间安排，不一定都能约上；能约上的话，一次聊四十分钟左右。',
      freeNote: '',
      wechatLabel: '微信号',
      timeLabel: '方便的时间段',
      submit: '提交时间意愿',
      successTitle: '已经收到',
      successBody:
        '我会尽快看时间安排：有合适的时间就加你确认；没有合适时间会直接告诉你。',
      privacy: '微信号只用于这次联系，可随时要求删除'
    },
    footer: {
      note: '仅供个人参考'
    }
  },
  dimensions: {
    b1: {
      strength: '你能说清楚要去哪座城市、做什么行业，这在同龄人里是少数，方向感会替你省下很多试错',
      gap: {
        what: '一个具体到岗位和城市的去处',
        how: '打开招聘软件搜本专业近三年的岗位，记下三个你愿意投的，再看它们要求什么',
        when: '这周内做完'
      },
      action30: '这周搜三个目标岗位，把岗位要求里的硬技能抄下来'
    },
    b2: {
      strength: '四六级和绩点这条线你守住了，大部分筛选的第一道门你已经过了',
      gap: {
        what: '一条能被筛选系统读到的学业线',
        how: '先看目标岗位或保研细则对四六级、绩点的硬要求，再决定是刷分还是补证',
        when: '下一次报名截止前'
      },
      action30: '查一遍目标岗位的四六级和绩点门槛，列成一张对照表',
      consistency:
        '你在「学业基础」上给自己打了 {{self}} 分，但你的实际情况是 {{evidence}}，这两个说的是不是同一件事'
    },
    b3: {
      strength: '你已经有一段或几段能讲清楚的实践，面试时你不至于只剩课程名',
      gap: {
        what: '一段能说清楚你做了什么、结果如何的经历',
        how: '学院实验室、学科竞赛、社团项目岗、老师课题组的杂活，任选一个先进入',
        when: '这个月内进入，毕业前攒够两段'
      },
      action30: '这周找一个学院实验室或竞赛报名入口，问清楚能不能加入'
    },
    b4: {
      strength: '你有一两项能直接换岗的技能，这比证书更实在',
      gap: {
        what: '一项能当场演示的技能',
        how: '从目标岗位的招聘要求里挑一项最高频的，跟一个完整项目学，不要同时开三门课',
        when: '三十天内做出一个可展示的成品'
      },
      action30: '挑一个岗位最常要求的工具，用它做出一个小成品发到网上'
    },
    b5: {
      strength: '你会复盘也会找人请教，同样的时间你能比别人多走一点',
      gap: {
        what: '一套能重复用的学习和复盘流程',
        how: '每周固定半小时回顾这周做成了什么、卡在哪、下周只改一件事',
        when: '从这周开始'
      },
      action30: '每周日花半小时写一页复盘，连续写四周'
    },
    b6: {
      strength: '你定下的事基本能按时完成，这种稳定性比短期冲刺更值钱',
      gap: {
        what: '一件坚持超过一个月的事',
        how: '把目标缩到小得不可能失败，比如每天二十分钟，先连续做三十天',
        when: '今天就定下最小动作'
      },
      action30: '选一件二十分钟能做完的事，连续做三十天，在日历上打勾',
      consistency:
        '你在「执行力」上给自己打了 {{self}} 分，但你的实际情况是 {{evidence}}，这两个说的是不是同一件事'
    },
    b7: {
      strength: '你知道去哪里查、该问谁，信息差这块你已经在主动补',
      gap: {
        what: '一份属于你自己的信息清单',
        how: '把学校就业网、学院公众号、目标行业招聘页、两个学长学姐放进同一个收藏夹，每周看一次',
        when: '这周建好'
      },
      action30: '查本专业近三年毕业生去向，记下三个你没想到的岗位',
      consistency:
        '你在「信息与环境」上给自己打了 {{self}} 分，但你的实际情况是 {{evidence}}，这两个说的是不是同一件事'
    },
    b8: {
      strength: '家里愿意支持你的合理投入，你可以把精力放在选择上，而不是反复解释',
      gap: {
        what: '一条不依赖家里的备选路径',
        how: '把需要家里出钱或出面的部分列清楚，能支持就按原计划走；不能支持，就换成自己一个人也能完成的版本',
        when: '这周先列清楚'
      },
      action30: '把必须靠家里的部分逐条写下来，每条准备一个自己能做到的替代方案'
    },
    b9: {
      strength: '你的英语能直接用于读材料、写邮件和沟通，这在求职和升学里都是能加分的硬条件',
      gap: {
        what: '一项能在目标场景里直接用上的英语能力',
        how: '先做一次分项测评，读、写、听、说各测一项，找出最低的一项；再按目标单位的要求决定补证书还是补实际使用',
        when: '这周内完成测评，三十天内补最弱的一项'
      },
      action30: '找一套和目标相关的英文材料或真题，做一次分项测评，记录四项分数和最低项',
      consistency:
        '你在「英语能力」上给自己打了 {{self}} 分，但你的证书情况是 {{evidence}}，这两个说的是同一件事吗'
    }
  }
}

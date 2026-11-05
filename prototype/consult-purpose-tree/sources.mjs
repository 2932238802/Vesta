// 逐字稿来源与目的映射。
//
// 七月稿是骨架的定义稿，示例直接写在 tree-definition.mjs 里。
// 其他成交稿不进树结构，只在映射文件里指定“哪几轮 → 哪个目的”，
// 生成器会把示例挂到对应目的节点上；同一目的可以来自多篇稿子。
//
// 映射时只放真正有用的片段：设备调试、闲聊、重复确认不进入示例。
// 若某段话在做一件现有目的没有覆盖的事，先在树定义里补目的节点，再回来映射。

export const sources = [
  {
    id: '918',
    label: '9.18 吕新蕊咨询稿',
    file: 'zxg/9.18+吕新蕊+260301005+热合曼+一开始想用便宜资源学_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'trust.self-disclosure', from: 455, note: '9.18 稿的自我暴露：用真实感受拉近距离' },
      { purposeKey: 'scan.parents', from: 20, to: 31, note: '9.18 稿：从家庭背景聊到父母的教育态度' },
      { purposeKey: 'diag.social', from: 3, to: 5, note: '9.18 稿：主动 / 被动社交的开场' },
      { purposeKey: 'diag.money', from: 362, to: 366, note: '9.18 稿：用家教赚钱说明能力型收入' },
      { purposeKey: 'diag.major', from: 218, to: 226, note: '9.18 稿：专业被调剂后的真实反应' },
      {
        purposeKey: 'filter.criteria',
        from: 70,
        to: 91,
        note: '9.18 稿用的是另一套标准：442 法则（能力/经历/学历），可视为同目的的不同说法'
      },
      { purposeKey: 'filter.english', from: 167, to: 184, note: '9.18 稿：英语基础与差异化竞争' },
      {
        purposeKey: 'filter.english',
        from: 243,
        to: 278,
        note: '9.18 稿：英语在竞赛、导师、就业中的差异化价值'
      },
      { purposeKey: 'offer.ask-plan', from: 284, to: 294, note: '9.18 稿：先问她自己的学习计划' },
      { purposeKey: 'offer.pitfall.feedback', from: 306, to: 312, note: '9.18 稿：缺反馈、缺体系' },
      { purposeKey: 'offer.need.coach', from: 306, to: 312, note: '9.18 稿：需要有人纠正和反馈' },
      { purposeKey: 'offer.handoff', from: 315, to: 331, note: '9.18 稿：从学习方式过渡到课程' },
      { purposeKey: 'window.job.outcome', from: 32, to: 38, note: '9.18 稿：以终为始，从四年后的结果倒推现在' },
      { purposeKey: 'window.job.reality', from: 39, to: 53, note: '9.18 稿：学校教的和企业要的不匹配' },
      { purposeKey: 'window.job.resume', from: 54, to: 69, note: '9.18 稿：简历对比 A/B，看见差距' },
      { purposeKey: 'window.job.resume', from: 91, to: 102, note: '9.18 稿：成熟简历和大一大二时间线' },
      { purposeKey: 'filter.track.four-paths', from: 108, to: 147, note: '9.18 稿：企业技术岗 / 体制内 / 教育 / 考研四条赛道' },
      { purposeKey: 'filter.track.her-plan', from: 148, to: 154, note: '9.18 稿：问她的目标和现有计划' },
      { purposeKey: 'filter.competition.why', from: 193, to: 203, note: '9.18 稿：大二竞赛和进导师组的窗口' },
      { purposeKey: 'filter.competition.types', from: 203, to: 217, note: '9.18 稿：四类竞赛清单' },
      { purposeKey: 'filter.competition.choose', from: 228, to: 233, note: '9.18 稿：精而不泛，选一到两个做深' },
      { purposeKey: 'offer.close.price', from: 332, to: 350, note: '9.18 稿：价格、投入和值不值' },
      { purposeKey: 'offer.close.price', from: 383, to: 390, note: '9.18 稿：分期和先把能力学出来' },
      { purposeKey: 'offer.close.parents', from: 356, to: 361, note: '9.18 稿：怎么和父母开口' },
      { purposeKey: 'offer.close.parents', from: 433, to: 442, note: '9.18 稿：给家长看什么、怎么说清楚计划' },
      { purposeKey: 'offer.close.hesitation', from: 350, to: 355, note: '9.18 稿：犹豫时先接住，再回到具体下一步' },
      { purposeKey: 'offer.close.hesitation', from: 410, to: 423, note: '9.18 稿：最后一次推动，不用虚假紧迫' },
      { purposeKey: 'offer.close.enroll', from: 448, to: 453, note: '9.18 稿：报名流程和开始时间' },
      { purposeKey: 'offer.close.followup', from: 456, to: 459, note: '9.18 稿：课后跟进和作业' }
    ]
  },
  {
    id: '919a',
    label: '9.19 胡余敏咨询稿',
    file: 'zxg/9.19+胡余敏+260301040+小茹+大一+不知道咋跟家里沟通原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'open.confirm-call', from: 1, to: 5, note: '9.19 胡余敏稿：确认小茹本人，用口音和老乡话题轻松开场' },
      { purposeKey: 'scan.volunteer', from: 6, to: 8, note: '9.19 胡余敏稿：从爸妈担心跨省上学聊到志愿为什么选安徽' },
      { purposeKey: 'scan.worries', from: 9, to: 12, note: '9.19 胡余敏稿：问开学感受和与想象的差距，引出瞎忙的担心' },
      { purposeKey: 'scan.parents', from: 13, to: 15, note: '9.19 胡余敏稿：问父母职业和家庭支持，判断家里能否给规划建议' },
      { purposeKey: 'trust.self-disclosure', from: 14, to: 15, note: '9.19 胡余敏稿：用自己的家庭和老大的身份建立相似性' },
      { purposeKey: 'filter.track.her-plan', from: 16, to: 16, note: '9.19 胡余敏稿：问这学期自己的规划' },
      { purposeKey: 'window.job.reality', from: 17, to: 37, note: '9.19 胡余敏稿：用就业难、清华案例和 GIS 课程说明学校教的和企业要的错配' },
      { purposeKey: 'window.job.outcome', from: 22, to: 24, note: '9.19 胡余敏稿：用 HR 视角倒推现在该培养什么' },
      { purposeKey: 'diag.club', from: 57, to: 65, note: '9.19 胡余敏稿：从加社团的动机讲到社团不是培养能力的地方' },
      { purposeKey: 'diag.club.experience', from: 59, to: 64, note: '9.19 胡余敏稿：用自己报五六个社团的经历说明加多没用' },
      { purposeKey: 'window.capability-timing', from: 76, to: 80, note: '9.19 胡余敏稿：问大学还剩多少时间，拆掉大三大四再实习的说法' },
      { purposeKey: 'window.job.resume', from: 84, to: 88, note: '9.19 胡余敏稿：用两年半时间线、秋招节点和面试官角色扮演看简历差距' },
      { purposeKey: 'window.job.outcome', from: 89, to: 92, note: '9.19 胡余敏稿：从同学秋招失败转到以目标为导向倒推' },
      { purposeKey: 'window.job.outcome', from: 96, to: 97, note: '9.19 胡余敏稿：把大学当项目投资，算本科和读研的回报差' },
      { purposeKey: 'filter.track.her-plan', from: 98, to: 100, note: '9.19 胡余敏稿：问为什么考研、和爸妈聊过没有、想考什么层次' },
      { purposeKey: 'filter.english.necessary', from: 127, to: 131, note: '9.19 胡余敏稿：用考研英语 80 分、六级 550+ 说明英语是刚需' }
    ]
  },
  {
    id: '919b',
    label: '9.19 马术菊咨询稿',
    file: 'zxg/9.19+马术菊+260401009+大二+家里不太同意，自己手上只有500块_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'open.confirm-call', from: 1, to: 2, note: '9.19 马术菊稿：开场确认对象，约定坦诚交流、让她多表达' },
      { purposeKey: 'window.job.outcome', from: 11, to: 16, note: '9.19 马术菊稿：从她月薪过万的目标倒推，讲清本科毕业薪资和月入过万的条件' },
      { purposeKey: 'trust.self-disclosure', from: 17, to: 19, note: '9.19 马术菊稿：讲自己普通家庭、父母帮不上，强调大学要为自己负责' },
      { purposeKey: 'scan.parents', from: 20, to: 26, note: '9.19 马术菊稿：从摆摊赚 300 问到父母在工地/卖菜，摸清家庭背景' },
      { purposeKey: 'scan.volunteer', from: 27, to: 34, note: '9.19 马术菊稿：确认被调剂到土木、目标只有四级，引出考研还是就业' },
      { purposeKey: 'window.job.reality', from: 39, to: 46, note: '9.19 马术菊稿：讲土木行业收缩、施工员/设计院门槛' },
      { purposeKey: 'window.capability-timing', from: 51, to: 57, note: '9.19 马术菊稿：考研越早准备越好，能力培养不能等到大四' },
      { purposeKey: 'filter.english.necessary', from: 58, to: 62, note: '9.19 马术菊稿：借初试科目和三条线，说明英语单科线是硬门槛' },
      { purposeKey: 'filter.track.her-plan', from: 63, to: 68, note: '9.19 马术菊稿：问她目标院校层次，建议从二本往上冲' },
      { purposeKey: 'filter.english', from: 69, to: 84, note: '9.19 马术菊稿：逐科分析后落到英语，只有英语可控、能拉开差距' },
      { purposeKey: 'filter.english.necessary', from: 85, to: 92, note: '9.19 马术菊稿：复试淘汰与学历歧视下，英语是刚需' },
      { purposeKey: 'trust.self-disclosure', from: 114, to: 119, note: '9.19 马术菊稿：用自己的二本逆袭经历，说明光努力不够' },
      { purposeKey: 'filter.english.visible', from: 120, to: 129, note: '9.19 马术菊稿：把二本学历变成反差感，用英语让复试老师记住她' },
      { purposeKey: 'filter.one-ability', from: 138, to: 141, note: '9.19 马术菊稿：一次准备不了太多，先只抓英语这一项' },
      { purposeKey: 'filter.english.compound', from: 142, to: 146, note: '9.19 马术菊稿：英语带来的四六级、实习、简历、家教副业等复利' },
      { purposeKey: 'offer.ask-plan', from: 147, to: 152, note: '9.19 马术菊稿：从英语重要转到怎么学，问她有没有方向' },
      { purposeKey: 'offer.need.path', from: 153, to: 164, note: '9.19 马术菊稿：学习三要素之科学方法，从音标和语言敏感期讲路径' },
      { purposeKey: 'offer.need.plan', from: 165, to: 171, note: '9.19 马术菊稿：学习三要素之针对性方案，先测评再定进度' },
      { purposeKey: 'offer.need.coach', from: 172, to: 181, note: '9.19 马术菊稿：学习三要素之真人纠正反馈' },
      { purposeKey: 'offer.need.path', from: 182, to: 189, note: '9.19 马术菊稿：把方法落到从音标开始的地基' },
      { purposeKey: 'offer.handoff', from: 190, to: 210, note: '9.19 马术菊稿：从学音标过渡到魏老师课程' },
      { purposeKey: 'offer.close.price', from: 211, to: 216, note: '9.19 马术菊稿：用分期和七天退款降低门槛' },
      { purposeKey: 'offer.close.hesitation', from: 217, to: 222, note: '9.19 马术菊稿：接住不确定，用抓机会和信心推动' },
      { purposeKey: 'offer.close.price', from: 223, to: 233, note: '9.19 马术菊稿：第一期 980 与手上 500 的缺口，给优惠券和凑钱方式' },
      { purposeKey: 'offer.close.parents', from: 234, to: 256, note: '9.19 马术菊稿：教她跟父母开口的三点，并准备证据和分期说法' },
      { purposeKey: 'offer.close.price', from: 257, to: 262, note: '9.19 马术菊稿：爸妈不通的 plan B，朋友借和资料费' },
      { purposeKey: 'offer.close.followup', from: 263, to: 269, note: '9.19 马术菊稿：约定听直播、发资料、口语陪练和后续答疑' }
    ]
  },
  {
    id: '919c',
    label: '9.19 黄嘉慧咨询稿',
    file: 'zxg/9.19+黄嘉慧+260401001+金萍1+大二会计学+已经报了一个考研班，而且学费贵，对家人很愧疚，但是聊完愿意踏出那一步，后面和家人商量完，成功报名1_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'open.confirm-call', from: 1, to: 1, note: '9.19 黄嘉慧稿：确认是金萍本人，进入通话' },
      { purposeKey: 'trust.relax', from: 3, to: 6, note: '9.19 黄嘉慧稿：用“紧不紧张”的寒暄降低戒备，拉近距离' },
      { purposeKey: 'open.agenda', from: 7, to: 10, note: '9.19 黄嘉慧稿：说明今天不是闲聊，是共同完成大学规划，给她结构感' },
      { purposeKey: 'trust.self-disclosure', from: 11, to: 11, note: '9.19 黄嘉慧稿：借她看信后的反馈，讲自己也没读到心仪专业，建立相似性' },
      { purposeKey: 'trust.permission', from: 12, to: 13, note: '9.19 黄嘉慧稿：确认纸笔记录，允许她随时打断提问' },
      { purposeKey: 'filter.track.her-plan', from: 14, to: 17, note: '9.19 黄嘉慧稿：确认会计学、考研小学教育、已报机构，问她目前的了解和准备程度' },
      { purposeKey: 'diag.confidence', from: 21, to: 26, note: '9.19 黄嘉慧稿：从表达紧张、逻辑散切入，指出沟通表达是复试短板' },
      { purposeKey: 'diag.confidence.reframe', from: 27, to: 29, note: '9.19 黄嘉慧稿：用辩论没结果和打游戏正反馈说明信心来自做到' },
      { purposeKey: 'filter.track.her-plan', from: 30, to: 32, note: '9.19 黄嘉慧稿：继续摸底旧机构给她排的每日任务、测试和直播课' },
      { purposeKey: 'offer.pitfall.path', from: 35, to: 36, note: '9.19 黄嘉慧稿：已学九个月仍跟不上，旧机构内容与她的基础不匹配' },
      { purposeKey: 'filter.english.necessary', from: 42, to: 46, note: '9.19 黄嘉慧稿：考研英语和四六级考的是能力，刷题机构补不出来' },
      { purposeKey: 'window.job.resume', from: 50, to: 53, note: '9.19 黄嘉慧稿：实习证明撑不起复试简历，面试一问就露馅，要放实打实的能力证据' },
      { purposeKey: 'window.capability-timing', from: 54, to: 54, note: '9.19 黄嘉慧稿：你才大二，现在开始提升能力还来得及' },
      { purposeKey: 'filter.english.necessary', from: 61, to: 64, note: '9.19 黄嘉慧稿：初试高分口语差仍被刷，复试、调剂和双语人才都看口语' },
      { purposeKey: 'filter.competition.types', from: 65, to: 68, note: '9.19 黄嘉慧稿：只参加大型竞赛，列大英赛、外研社国才杯、演讲翻译等' },
      { purposeKey: 'filter.candidates', from: 69, to: 71, note: '9.19 黄嘉慧稿：教她聚焦，在口语和表达能力之间二选一' },
      { purposeKey: 'filter.one-ability', from: 72, to: 76, note: '9.19 黄嘉慧稿：论证口语优先于表达，中文转英文更难，复试和比赛都要用' },
      { purposeKey: 'filter.english.compound', from: 77, to: 79, note: '9.19 黄嘉慧稿：口语带动听力、词汇语法和写作翻译，一份能力多处复用' },
      { purposeKey: 'window.catch', from: 80, to: 84, note: '9.19 黄嘉慧稿：比赛只奖励有能力的人，有能力准备两三天就够，裸考四级500+' },
      { purposeKey: 'offer.pitfall.path', from: 85, to: 93, note: '9.19 黄嘉慧稿：旧机构直接上翻译长难句、跨阶层，缺分阶段路径，学得累还没效果' },
      { purposeKey: 'offer.ask-plan', from: 94, to: 94, note: '9.19 黄嘉慧稿：问她有没有想过怎么提升能力，她答没有具体指导' },
      { purposeKey: 'offer.three-needs', from: 95, to: 95, note: '9.19 黄嘉慧稿：引出学习三要素——科学方法、针对性方案、纠正与正反馈' },
      { purposeKey: 'offer.need.path', from: 95, to: 103, note: '9.19 黄嘉慧稿：科学方法要从发音和音标开始，讲12岁语言敏感期和底层规则' },
      { purposeKey: 'offer.need.plan', from: 104, to: 110, note: '9.19 黄嘉慧稿：针对性方案要因材施教，先测水平找阶段，再由专业的人定重点' },
      { purposeKey: 'offer.need.coach', from: 111, to: 114, note: '9.19 黄嘉慧稿：自己听不出发音问题，需要有人纠正并给正反馈才能坚持' },
      { purposeKey: 'offer.confirm-need', from: 115, to: 117, note: '9.19 黄嘉慧稿：确认她一个人做不到三要素，也纠不了自己，需要专业的人带' },
      { purposeKey: 'offer.find-teacher', from: 118, to: 121, note: '9.19 黄嘉慧稿：她想过找专业老师但没渠道，市面老师多是应试和哑巴英语' },
      { purposeKey: 'offer.close.price', from: 122, to: 124, note: '9.19 黄嘉慧稿：全体系要上万，几百块的是坑，提醒别贪便宜' },
      { purposeKey: 'offer.handoff', from: 124, to: 127, note: '9.19 黄嘉慧稿：用自己踩坑后遇到微微老师的经历，讲老师的逆袭和给大学生的优惠' },
      { purposeKey: 'offer.close.price', from: 128, to: 131, note: '9.19 黄嘉慧稿：30个名额、老师优惠、3980左右、可分四期' },
      { purposeKey: 'offer.close.parents', from: 130, to: 130, note: '9.19 黄嘉慧稿：用自己的经历讲家里穷、瞒着父母凑钱，接住她对家里的愧疚' },
      { purposeKey: 'offer.close.hesitation', from: 132, to: 137, note: '9.19 黄嘉慧稿：接住“冲动下单”和钱、时间顾虑，确认真心想学后开始拆时间' }
    ]
  }
]

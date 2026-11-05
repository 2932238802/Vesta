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
  },
  {
    id: 'a1-xiaoran',
    label: '9.19 小冉咨询稿',
    file: 'zxg/9.19郭康兰+编号260301034+小冉大一+担心爸妈不同意，想要自己整，经济问题_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'scan.volunteer', from: 15, to: 22, note: '小冉稿：从转专业要求聊到她的目标和当下的迷茫' },
      { purposeKey: 'scan.volunteer', from: 27, to: 28, note: '小冉稿：确认转专业限制和民族政策' },
      { purposeKey: 'scan.score', from: 29, to: 39, note: '小冉稿：从高考分数、英语基础聊到“低人一等”的不甘心' },
      { purposeKey: 'diag.school-gap', from: 36, to: 38, note: '小冉稿：接住学校/分数落差，把差距翻译成英语和转专业准备' },
      { purposeKey: 'diag.confidence', from: 36, to: 40, note: '小冉稿：从成绩不自信切入，确认英语是可控的突破口' },
      { purposeKey: 'window.capability-timing', from: 40, to: 48, note: '小冉稿：从护理前景转到当下能做什么' },
      { purposeKey: 'filter.track.her-plan', from: 48, to: 53, note: '小冉稿：问她自己想转什么、为什么' },
      { purposeKey: 'window.postgrad', from: 84, to: 118, note: '小冉稿：讲保研的推免名额、夏令营、预推免和系统捡漏' },
      { purposeKey: 'filter.english.necessary', from: 98, to: 107, note: '小冉稿：转专业、考研、复试都绕不开英语' },
      { purposeKey: 'filter.english.necessary', from: 141, to: 154, note: '小冉稿：用四六级和竞赛说明英语是硬门槛' },
      { purposeKey: 'filter.competition', from: 108, to: 116, note: '小冉稿：竞赛和英语的复利' },
      { purposeKey: 'window.job.outcome', from: 118, to: 129, note: '小冉稿：从就业结果倒推大学四年' },
      { purposeKey: 'window.job.resume', from: 136, to: 140, note: '小冉稿：用简历和时间线看差距' },
      { purposeKey: 'filter.english.visible', from: 149, to: 153, note: '小冉稿：让英语成为能被看见的差异化能力' },
      { purposeKey: 'diag.money', from: 154, to: 154, note: '小冉稿：从家里经济压力聊到大学怎么赚钱' },
      { purposeKey: 'trust.self-disclosure', from: 157, to: 157, note: '小冉稿：用自己的类似经历拉近距离' },
      { purposeKey: 'diag.parents', from: 163, to: 183, note: '小冉稿：先弄清父母反对什么，再决定沟通还是自筹' },
      { purposeKey: 'offer.pitfall.sunk', from: 169, to: 199, note: '小冉稿：已经报过一个班却没结果，先定义有效学习' },
      { purposeKey: 'offer.close.parents', from: 180, to: 183, note: '小冉稿：父母不同意时的沟通方向' },
      { purposeKey: 'offer.close.parents', from: 190, to: 199, note: '小冉稿：先做后说，用一个月结果让父母看见' },
      { purposeKey: 'offer.close.self-fund', from: 200, to: 212, note: '小冉稿：首期、分期、缓交和停课保名额' },
      { purposeKey: 'offer.close.price', from: 202, to: 204, note: '小冉稿：分期与一次性价格的差异' },
      { purposeKey: 'offer.close.risk-reversal', from: 202, to: 204, note: '小冉稿：用缓交和停课降低首期压力' },
      { purposeKey: 'offer.close.hesitation', from: 209, to: 212, note: '小冉稿：等 11 月生日再交钱的犹豫' },
      { purposeKey: 'offer.close.enroll', from: 212, to: 227, note: '小冉稿：先抓住这几天直播和名额' },
      { purposeKey: 'offer.close.followup', from: 225, to: 231, note: '小冉稿：课后跟进和作业安排' },
      { purposeKey: 'offer.handoff', from: 184, to: 190, note: '小冉稿：从学习方法过渡到薇薇老师课程' },
      { purposeKey: 'offer.need.plan', from: 187, to: 189, note: '小冉稿：测评、分阶段计划和针对性方案' },
      { purposeKey: 'diag.confidence.reframe', from: 194, to: 195, note: '小冉稿：不是她不行，是以前的方法没有反馈' },
      { purposeKey: 'diag.confidence.trauma', from: 190, to: 195, note: '小冉稿：从小报了很多网课都没坚持，父母也不再相信她' }
    ]
  },
  {
    id: 'a2-zitong',
    label: '9.19 梓童咨询稿',
    file: 'zxg/9.19郭康兰+编号260301035++梓童大一+担心爸妈不同意，打算自己整_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'trust.self-disclosure', from: 9, to: 12, note: '梓童稿：用自己的经历打开她的自我暴露' },
      { purposeKey: 'trust.ask-her-result', from: 10, to: 10, note: '梓童稿：先问她想要的沟通结果' },
      { purposeKey: 'diag.confidence', from: 12, to: 14, note: '梓童稿：从表达和状态判断她的不自信' },
      { purposeKey: 'filter.track.her-plan', from: 25, to: 28, note: '梓童稿：问她自己的大学规划' },
      { purposeKey: 'window.job.outcome', from: 32, to: 53, note: '梓童稿：从就业结果倒推现在该准备什么' },
      { purposeKey: 'window.catch', from: 37, to: 39, note: '梓童稿：机会只奖励准备好的人' },
      { purposeKey: 'diag.money.two-kinds', from: 43, to: 44, note: '梓童稿：区分时间换钱和能力赚钱' },
      { purposeKey: 'diag.money.advice', from: 55, to: 56, note: '梓童稿：建议尽早转向能力型收入' },
      { purposeKey: 'diag.money.advice', from: 130, to: 131, note: '梓童稿：兼职和奖学金也是赚钱方式' },
      { purposeKey: 'diag.money.part-time', from: 130, to: 131, note: '梓童稿：家教是性价比更高的兼职渠道' },
      { purposeKey: 'diag.confidence', from: 57, to: 59, note: '梓童稿：把不自信翻译成方法问题' },
      { purposeKey: 'diag.confidence.ask', from: 58, to: 59, note: '梓童稿：用提问让她自己得出答案' },
      { purposeKey: 'offer.pitfall.feedback', from: 72, to: 78, note: '梓童稿：没有人纠正，错误会练成肌肉记忆' },
      { purposeKey: 'offer.pitfall.path', from: 79, to: 84, note: '梓童稿：缺分阶段路径，学得累还没效果' },
      { purposeKey: 'offer.three-needs', from: 81, to: 82, note: '梓童稿：引出学习三要素' },
      { purposeKey: 'offer.confirm-need', from: 85, to: 85, note: '梓童稿：确认她一个人做不到三要素' },
      { purposeKey: 'offer.find-teacher', from: 87, to: 95, note: '梓童稿：她说想找老师，先讲什么算有效学习' },
      { purposeKey: 'scan.parents', from: 95, to: 99, note: '梓童稿：从爸妈固执聊到家里的经济压力' },
      { purposeKey: 'scan.family-burden', from: 95, to: 99, note: '梓童稿：妹妹打生长激素、家里开销大，接住她的愧疚' },
      { purposeKey: 'diag.parents', from: 95, to: 105, note: '梓童稿：爸爸一票否决，先分析反对来源再选沟通路径' },
      { purposeKey: 'offer.close.parents', from: 100, to: 105, note: '梓童稿：要么全力沟通，要么先靠自己拿结果' },
      { purposeKey: 'offer.close.price', from: 109, to: 116, note: '梓童稿：对比两家课程和优惠后的价格' },
      { purposeKey: 'offer.handoff', from: 117, to: 124, note: '梓童稿：从了解课程过渡到老师能给的机会' },
      { purposeKey: 'offer.need.coach', from: 121, to: 122, note: '梓童稿：一对一纠正和助教跟进度' },
      { purposeKey: 'offer.close.self-fund', from: 125, to: 131, note: '梓童稿：分期、首期和小金库测算' },
      { purposeKey: 'offer.close.price', from: 125, to: 129, note: '梓童稿：分期金额和每月生活费' },
      { purposeKey: 'diag.busy', from: 119, to: 120, note: '梓童稿：班委竞选占掉整晚，时间被切碎' },
      { purposeKey: 'window.postgrad', from: 135, to: 155, note: '梓童稿：考研科目、初复试和英语的长期积累' },
      { purposeKey: 'window.job.reality', from: 138, to: 139, note: '梓童稿：双非考研会遇到的学历歧视' },
      { purposeKey: 'filter.english.necessary', from: 142, to: 149, note: '梓童稿：政治和专业课能突击，英语必须长期积累' },
      { purposeKey: 'filter.english.visible', from: 149, to: 154, note: '梓童稿：把英语变成复试和简历上能被看见的证据' },
      { purposeKey: 'offer.close.parents', from: 158, to: 162, note: '梓童稿：给父母看计划和证据，降低被骗担心' },
      { purposeKey: 'diag.confidence', from: 134, to: 134, note: '梓童稿：肯定她的表达力，把自信落到具体能力' }
    ]
  },
  {
    id: 'a3-qiaoer',
    label: '9.19 乔儿咨询稿',
    file: 'zxg/9.19郭康兰+编号260401008+乔儿大三+父母不同意，自己报_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'scan.worries', from: 17, to: 23, note: '乔儿稿：问她对毕业和就业最担心的事' },
      { purposeKey: 'scan.parents', from: 23, to: 28, note: '乔儿稿：了解父母态度和家里谁出钱' },
      { purposeKey: 'scan.family-burden', from: 23, to: 28, note: '乔儿稿：父母不同意，经济上也不支持' },
      { purposeKey: 'diag.parents', from: 23, to: 28, note: '乔儿稿：先弄清父母为什么反对' },
      { purposeKey: 'trust.self-disclosure', from: 23, to: 28, note: '乔儿稿：用自己的经历接住她的处境' },
      { purposeKey: 'scan.worries', from: 33, to: 38, note: '乔儿稿：继续确认她最担心的问题' },
      { purposeKey: 'diag.club', from: 39, to: 42, note: '乔儿稿：社团和校园经历的取舍' },
      { purposeKey: 'window.cases.peers', from: 39, to: 42, note: '乔儿稿：用同龄人的选择做对照' },
      { purposeKey: 'diag.confidence', from: 43, to: 46, note: '乔儿稿：大三的焦虑和不自信' },
      { purposeKey: 'filter.english.necessary', from: 43, to: 46, note: '乔儿稿：英语是升学和就业的共同门槛' },
      { purposeKey: 'window.postgrad', from: 48, to: 64, note: '乔儿稿：保研/考研的时间线和复试要求' },
      { purposeKey: 'offer.pitfall.path', from: 54, to: 58, note: '乔儿稿：旧路径缺分阶段规划' },
      { purposeKey: 'offer.pitfall.sunk', from: 54, to: 58, note: '乔儿稿：已经花钱学过却没结果，先看路径是否匹配' },
      { purposeKey: 'window.job.reality', from: 60, to: 63, note: '乔儿稿：学校教的和岗位要的错配' },
      { purposeKey: 'filter.competition.why', from: 60, to: 63, note: '乔儿稿：竞赛和项目的窗口期' },
      { purposeKey: 'diag.school-gap', from: 60, to: 63, note: '乔儿稿：民办/普通院校的落差，用能力补' },
      { purposeKey: 'offer.confirm-need', from: 65, to: 67, note: '乔儿稿：确认她一个人学不出来' },
      { purposeKey: 'offer.handoff', from: 71, to: 76, note: '乔儿稿：从学习方式过渡到课程' },
      { purposeKey: 'offer.need.plan', from: 71, to: 76, note: '乔儿稿：先测评再定计划' },
      { purposeKey: 'filter.track.her-plan', from: 71, to: 76, note: '乔儿稿：问她自己接下来的打算' },
      { purposeKey: 'filter.english.visible', from: 107, to: 127, note: '乔儿稿：英语带来的反差感和可见证据' },
      { purposeKey: 'filter.competition', from: 107, to: 127, note: '乔儿稿：竞赛、实习和英语的组合' },
      { purposeKey: 'diag.confidence', from: 107, to: 127, note: '乔儿稿：从反复否定到重新建立信心' },
      { purposeKey: 'offer.close.price', from: 150, to: 156, note: '乔儿稿：价格、分期和值不值' },
      { purposeKey: 'offer.close.hesitation', from: 150, to: 156, note: '乔儿稿：接住犹豫，回到具体下一步' },
      { purposeKey: 'offer.close.parents', from: 156, to: 161, note: '乔儿稿：父母不同意仍决定自己报' },
      { purposeKey: 'offer.close.enroll', from: 156, to: 161, note: '乔儿稿：报名和开始时间' },
      { purposeKey: 'offer.close.followup', from: 156, to: 161, note: '乔儿稿：课后跟进和作业' },
      { purposeKey: 'window.cases.zhao', from: 156, to: 161, note: '乔儿稿：用赵同学案例做收尾' }
    ]
  },
  {
    id: 'a4-yuxin2',
    label: '9.19 羽昕2咨询稿',
    file: 'zxg/9.19陈洋洋羽昕2大一对自己不自信不相信自己能学好_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'filter.track.her-plan', from: 10, to: 12, note: '羽昕2稿：问她自己的大学规划' },
      { purposeKey: 'scan.volunteer', from: 14, to: 16, note: '羽昕2稿：了解志愿和专业选择' },
      { purposeKey: 'scan.parents', from: 16, to: 19, note: '羽昕2稿：了解父母态度和家庭沟通方式' },
      { purposeKey: 'diag.money', from: 19, to: 23, note: '羽昕2稿：从生活费聊到大学怎么赚钱' },
      { purposeKey: 'filter.english.necessary', from: 23, to: 26, note: '羽昕2稿：英语是升学和就业的共同门槛' },
      { purposeKey: 'filter.english.necessary', from: 34, to: 36, note: '羽昕2稿：四六级和考研都绕不开英语' },
      { purposeKey: 'filter.english.necessary', from: 50, to: 56, note: '羽昕2稿：英语决定她能走多远' },
      { purposeKey: 'filter.candidates', from: 37, to: 39, note: '羽昕2稿：在几项能力里做取舍' },
      { purposeKey: 'window.postgrad', from: 39, to: 69, note: '羽昕2稿：考研和保研的时间线、科目与复试' },
      { purposeKey: 'window.capability-timing', from: 54, to: 56, note: '羽昕2稿：能力要尽早开始积累' },
      { purposeKey: 'offer.ask-plan', from: 75, to: 77, note: '羽昕2稿：问她有没有具体的学习计划' },
      { purposeKey: 'offer.pitfall.feedback', from: 81, to: 86, note: '羽昕2稿：缺反馈，错误会越练越牢' },
      { purposeKey: 'offer.pitfall.feedback', from: 98, to: 114, note: '羽昕2稿：需要有人纠正和正反馈' },
      { purposeKey: 'diag.confidence', from: 87, to: 94, note: '羽昕2稿：反复否定后的不自信' },
      { purposeKey: 'diag.confidence.trauma', from: 87, to: 94, note: '羽昕2稿：从小被老师打击，付出和回报不成正比' },
      { purposeKey: 'diag.confidence.reframe', from: 89, to: 93, note: '羽昕2稿：自信不是凭空相信，是一次次做到' },
      { purposeKey: 'diag.confidence.reframe', from: 117, to: 125, note: '羽昕2稿：把“我不行”翻译成方法问题' },
      { purposeKey: 'trust.self-disclosure', from: 95, to: 95, note: '羽昕2稿：用自己的经历拉近距离' },
      { purposeKey: 'trust.self-disclosure', from: 118, to: 118, note: '羽昕2稿：用自己的转变给她参照' },
      { purposeKey: 'offer.need.coach', from: 98, to: 114, note: '羽昕2稿：真人纠正和陪跑' },
      { purposeKey: 'offer.close.hesitation', from: 115, to: 117, note: '羽昕2稿：接住犹豫，回到具体行动' },
      { purposeKey: 'offer.confirm-need', from: 122, to: 125, note: '羽昕2稿：确认她需要有人带' },
      { purposeKey: 'offer.close.price', from: 126, to: 127, note: '羽昕2稿：价格和分期' },
      { purposeKey: 'diag.union', from: 131, to: 136, note: '羽昕2稿：学生会和校园经历的价值判断' },
      { purposeKey: 'filter.competition', from: 136, to: 141, note: '羽昕2稿：竞赛和英语的组合' },
      { purposeKey: 'offer.close.enroll', from: 138, to: 140, note: '羽昕2稿：报名和开始时间' }
    ]
  },
  {
    id: 'a5-yuxin',
    label: '9.19 羽昕咨询稿',
    file: 'zxg/9.19陈洋洋羽昕大一对自己不自信，不相信自己能学好_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'scan.worries', from: 11, to: 17, note: '羽昕稿：问她对大学最担心的事，主要是怕自己学不好' }
    ]
  },
  {
    id: 'a6-caicai',
    label: '9.19 蔡蔡咨询稿',
    file: 'zxg/9.19陈洋洋蔡蔡大一学校事情多太忙了单亲家庭妈妈也不同意_原文.docx',
    season: '旺季',
    parser: 'transcript',
    mappings: [
      { purposeKey: 'diag.major.data', from: 9, to: 14, note: '蔡蔡稿：用专业对口率和行业变化说明专业不是唯一出路' },
      { purposeKey: 'diag.major.cases', from: 9, to: 14, note: '蔡蔡稿：用不同专业的案例说明能力比专业更可迁移' },
      { purposeKey: 'filter.competition.choose', from: 18, to: 24, note: '蔡蔡稿：竞赛精而不泛，选一到两个做深' },
      { purposeKey: 'diag.club.experience', from: 18, to: 24, note: '蔡蔡稿：用自己的社团经历说明加多没用' },
      { purposeKey: 'scan.worries', from: 25, to: 31, note: '蔡蔡稿：学校事情多、时间被切碎的担心' },
      { purposeKey: 'diag.busy', from: 25, to: 31, note: '蔡蔡稿：把“太忙”拆成消耗和可沉淀的时间' },
      { purposeKey: 'offer.ask-plan', from: 25, to: 31, note: '蔡蔡稿：问她每天能真正支配多少时间' },
      { purposeKey: 'offer.pitfall.path', from: 38, to: 48, note: '蔡蔡稿：同声传译和直接刷题都缺分阶段路径' },
      { purposeKey: 'offer.pitfall.feedback', from: 38, to: 48, note: '蔡蔡稿：发音需要有人纠正，音频跟读不够' },
      { purposeKey: 'offer.need.coach', from: 38, to: 48, note: '蔡蔡稿：需要真人纠正和陪跑' },
      { purposeKey: 'scan.parents', from: 49, to: 53, note: '蔡蔡稿：单亲家庭，妈妈不同意' },
      { purposeKey: 'scan.family-burden', from: 49, to: 56, note: '蔡蔡稿：单亲、家里钱紧，接住她的愧疚' },
      { purposeKey: 'diag.parents', from: 84, to: 91, note: '蔡蔡稿：妈妈不同意的来源和沟通路径' },
      { purposeKey: 'offer.close.parents', from: 84, to: 91, note: '蔡蔡稿：怎么和妈妈开口' },
      { purposeKey: 'offer.close.hesitation', from: 84, to: 91, note: '蔡蔡稿：接住犹豫，回到可执行的下一步' },
      { purposeKey: 'scan.parents', from: 93, to: 99, note: '蔡蔡稿：继续确认家里的支持和出钱方式' },
      { purposeKey: 'scan.family-burden', from: 93, to: 100, note: '蔡蔡稿：家里经济结构和她不想增加负担' },
      { purposeKey: 'offer.close.price', from: 65, to: 67, note: '蔡蔡稿：价格和值不值' },
      { purposeKey: 'offer.confirm-need', from: 65, to: 67, note: '蔡蔡稿：确认她一个人学不出来' },
      { purposeKey: 'offer.close.price', from: 81, to: 82, note: '蔡蔡稿：分期和首期压力' },
      { purposeKey: 'offer.close.self-fund', from: 109, to: 115, note: '蔡蔡稿：首期缺口、自筹和分期测算' },
      { purposeKey: 'diag.money', from: 101, to: 108, note: '蔡蔡稿：从生活费聊到大学怎么赚钱' },
      { purposeKey: 'offer.close.price', from: 109, to: 115, note: '蔡蔡稿：第一期金额和支付方式' },
      { purposeKey: 'offer.need.coach', from: 121, to: 124, note: '蔡蔡稿：助教跟进度和一对一纠正' },
      { purposeKey: 'offer.close.price', from: 125, to: 128, note: '蔡蔡稿：优惠价和报名时机' },
      { purposeKey: 'offer.close.enroll', from: 125, to: 128, note: '蔡蔡稿：报名流程和开始时间' }
    ]
  },
  {
    "id": "s1-xiaomeng",
    "label": "9.19 小孟咨询稿",
    "file": "zxg/9.19彭雨晴261801022小孟大一后期的钱没把握自己交原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.busy",
        "from": 4,
        "to": 5,
        "note": "小孟稿：开学什么都很重要却不知道抓什么，点出瞎忙。"
      },
      {
        "purposeKey": "diag.major",
        "from": 9,
        "to": 12,
        "note": "小孟稿：专业被机构调剂，聊能动专业认知和接纳。"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 13,
        "to": 16,
        "note": "小孟稿：确认保研目标，用亲戚考研失败的例子问动机。"
      },
      {
        "purposeKey": "diag.money",
        "from": 16,
        "to": 17,
        "note": "小孟稿：从保研转到经济独立，问她是否想自己供自己。"
      },
      {
        "purposeKey": "filter.competition",
        "from": 28,
        "to": 41,
        "note": "小孟稿：拆保研四类竞争对手，让她判断谁能拼得过。"
      },
      {
        "purposeKey": "window.capability-timing",
        "from": 90,
        "to": 95,
        "note": "小孟稿：把英语说成保研地基，强调大一投入的窗口。"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 96,
        "to": 99,
        "note": "小孟稿：分享口语家教路径，讲怎么靠兼职月入过万。"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 100,
        "to": 103,
        "note": "小孟稿：讲父母务农搬货、妈妈生病，说明家庭负担。"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 121,
        "to": 123,
        "note": "小孟稿：确认分期，第一期980，担心后面自己攒不出。"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 124,
        "to": 125,
        "note": "小孟稿：说自己报过线上线下课，浪费时间还没反馈。"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 126,
        "to": 135,
        "note": "小孟稿：给出家教、勤工俭学、代写等凑学费途径。"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 136,
        "to": 137,
        "note": "小孟稿：把家教、勤工俭学、省生活费和奖学金拼成收入来源。"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 157,
        "to": 159,
        "note": "小孟稿：讲七天试学，不满意可全款退，降低决策风险。"
      }
    ]
  },
  {
    "id": "s2-linlin",
    "label": "9.19 琳琳咨询稿",
    "file": "zxg/9.19彭雨晴261801024琳琳专一愧疚不好意思要钱_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.school-gap",
        "from": 20,
        "to": 25,
        "note": "琳琳稿：从为什么升本聊到专科被学历门槛卡住。"
      },
      {
        "purposeKey": "offer.pitfall.path",
        "from": 34,
        "to": 39,
        "note": "琳琳稿：区分自考本科和统招专升本，指出路径坑。"
      },
      {
        "purposeKey": "window.timeline",
        "from": 60,
        "to": 72,
        "note": "琳琳稿：算专升本三年时间账，拆大一到大三的节奏。"
      },
      {
        "purposeKey": "diag.busy",
        "from": 68,
        "to": 69,
        "note": "琳琳稿：说大一被学生会、讲座、志愿等琐事带跑。"
      },
      {
        "purposeKey": "window.capability-timing",
        "from": 90,
        "to": 104,
        "note": "琳琳稿：把大一讲成学英语的黄金窗口，后面难补。"
      },
      {
        "purposeKey": "offer.pitfall.environment",
        "from": 124,
        "to": 131,
        "note": "琳琳稿：用被环境同化的例子，强调找对圈子的重要性。"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 136,
        "to": 142,
        "note": "琳琳稿：讲口语家教时薪和月入过万，用兼职覆盖开销。"
      },
      {
        "purposeKey": "diag.confidence",
        "from": 143,
        "to": 147,
        "note": "琳琳稿：聊普通家庭孩子要钱的愧疚和低配得感。"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 151,
        "to": 153,
        "note": "琳琳稿：父母最大的是精神压力，先减精神负担再减经济。"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 158,
        "to": 159,
        "note": "琳琳稿：说自己踩过很多机构的坑，反复交钱没结果。"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 166,
        "to": 168,
        "note": "琳琳稿：讲七天无理由试学，不满意可全款退。"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 185,
        "to": 203,
        "note": "琳琳稿：首期980拿不出，算预支生活费和家教收入。"
      },
      {
        "purposeKey": "diag.parents",
        "from": 217,
        "to": 219,
        "note": "琳琳稿：父母担心她被网课骗，口头反对但行动会支持。"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 220,
        "to": 228,
        "note": "琳琳稿：教她用学历、央视采访、合同等材料说服父母。"
      }
    ]
  },
  {
    "id": "s3-xiaomei",
    "label": "9.20 小美咨询稿",
    "file": "zxg/9.20陈洋洋小美大一经济原因借钱去学_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "window.postgrad",
        "from": 20,
        "to": 27,
        "note": "小美稿：聊考研动机和父母有条件支持，判断报班太早。"
      },
      {
        "purposeKey": "diag.busy",
        "from": 28,
        "to": 32,
        "note": "小美稿：想抓的太多反而迷茫，落到先聚焦一件事。"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 34,
        "to": 39,
        "note": "小美稿：讲考研三条线和英语单科线，说明英语卡人。"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 49,
        "to": 63,
        "note": "小美稿：用AI翻译不了瞬时交流和情绪，论证英语不可替代。"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 64,
        "to": 65,
        "note": "小美稿：她因被人说“装”而不敢开口说英语。"
      },
      {
        "purposeKey": "filter.english.foundation",
        "from": 67,
        "to": 84,
        "note": "小美稿：从发音、音标讲起，纠正直接背单词的误区。"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 94,
        "to": 98,
        "note": "小美稿：学费七千多，生活费紧，想攒钱又不敢多花。"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 99,
        "to": 103,
        "note": "小美稿：分期差三四百，不愿找父母也不愿借钱。"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 108,
        "to": 117,
        "note": "小美稿：用自己家教月入近两千，证明能力能换现金流。"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 136,
        "to": 138,
        "note": "小美稿：教她以买四级资料为由，跟爸妈开口要几百。"
      },
      {
        "purposeKey": "diag.parents",
        "from": 142,
        "to": 143,
        "note": "小美稿：家里封建复杂，钱的事她宁愿自己想办法。"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 144,
        "to": 146,
        "note": "小美稿：咨询师提出先垫首期，她中秋再还。"
      }
    ]
  },
  {
    "id": "s4-yaoyao",
    "label": "9.21 瑶瑶咨询稿",
    "file": "zxg/9.21+胡余敏+260301051+瑶瑶+大一+妈妈担心被骗不同意，打算自己借钱学_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "offer.pitfall.path",
        "from": 15,
        "to": 22,
        "note": "瑶瑶稿：纠正多考证的误区，证书多不等于能力强。"
      },
      {
        "purposeKey": "window.timeline",
        "from": 26,
        "to": 30,
        "note": "瑶瑶稿：算大学只剩两年半，用秋招节点倒推准备。"
      },
      {
        "purposeKey": "diag.class",
        "from": 32,
        "to": 37,
        "note": "瑶瑶稿：解释大学水课多，老师重心在论文不在教学。"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 50,
        "to": 54,
        "note": "瑶瑶稿：专科竞争吃亏，研发端岗位还要研究生学历。"
      },
      {
        "purposeKey": "window.capability-timing",
        "from": 55,
        "to": 56,
        "note": "瑶瑶稿：大一打什么基础，大二就遇到什么资源。"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 62,
        "to": 66,
        "note": "瑶瑶稿：她想靠英语赚钱获得经济能力，才动了报课念头。"
      },
      {
        "purposeKey": "diag.money",
        "from": 93,
        "to": 94,
        "note": "瑶瑶稿：把经济独立和女孩子投资自己连在一起。"
      },
      {
        "purposeKey": "diag.confidence",
        "from": 69,
        "to": 70,
        "note": "瑶瑶稿：她说不自信、声音小，源于没有优势和底气。"
      },
      {
        "purposeKey": "diag.parents",
        "from": 70,
        "to": 74,
        "note": "瑶瑶稿：妈妈怕她被网课骗，不回消息也不支持线上。"
      },
      {
        "purposeKey": "offer.pitfall.path",
        "from": 77,
        "to": 80,
        "note": "瑶瑶稿：分析线下课贵、有时效性，不适合大学生。"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 85,
        "to": 92,
        "note": "瑶瑶稿：首期差一百，咨询师教她向闺蜜周转。"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 95,
        "to": 95,
        "note": "瑶瑶稿：讲七天试学，效果好再学，不好全退。"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 99,
        "to": 99,
        "note": "瑶瑶稿：建议先跟妈妈服软，学出结果再证明。"
      }
    ]
  },
  {
    "id": "s5-huizhen",
    "label": "9.27 惠珍咨询稿",
    "file": "zxg/9.27彭雨晴261801021惠珍大二怕学习周期长四级来不及，给家里带来负担_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "scan.family-burden",
        "from": 14,
        "to": 17,
        "note": "惠珍稿：家里三姐妹她是老大，学费生活费双份压力大。"
      },
      {
        "purposeKey": "diag.money.advice",
        "from": 18,
        "to": 23,
        "note": "惠珍稿：讲30/20/20/10的经济管理，先投资自己。"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 28,
        "to": 34,
        "note": "惠珍稿：专科学历被卡，90%好岗位要本科。"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 53,
        "to": 55,
        "note": "惠珍稿：出海岗位既要食品技术又要英语口语。"
      },
      {
        "purposeKey": "window.capability-timing",
        "from": 75,
        "to": 77,
        "note": "惠珍稿：大二一年是填简历窗口，英语和实习要同时抓。"
      },
      {
        "purposeKey": "diag.busy",
        "from": 81,
        "to": 84,
        "note": "惠珍稿：她一天学四小时还被工作打乱，效率反而低。"
      },
      {
        "purposeKey": "filter.english.foundation",
        "from": 85,
        "to": 98,
        "note": "惠珍稿：讲发音到听说读写的底层顺序和针对性方案。"
      },
      {
        "purposeKey": "offer.pitfall.feedback",
        "from": 100,
        "to": 104,
        "note": "惠珍稿：自学没人纠正越练越错，强调反馈和正反馈。"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 107,
        "to": 117,
        "note": "惠珍稿：口语家教时薪150到200，能撑起经济独立。"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 119,
        "to": 124,
        "note": "惠珍稿：复盘线下家教和便宜网课，钱花了没效果。"
      },
      {
        "purposeKey": "diag.parents",
        "from": 131,
        "to": 132,
        "note": "惠珍稿：表妹妈妈一听要钱就以为被骗，直接挂电话。"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 133,
        "to": 134,
        "note": "惠珍稿：教表妹一套跟妈妈沟通的说法，再去做抽查。"
      },
      {
        "purposeKey": "diag.confidence",
        "from": 144,
        "to": 145,
        "note": "惠珍稿：从小经济条件差，没自信、配得感低。"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 154,
        "to": 156,
        "note": "惠珍稿：确认分期，第一期九百多靠之前攒的钱。"
      }
    ]
  },
  {
    "id": "s6-weiran",
    "label": "9.20 蔚然咨询稿",
    "file": "zxg/9.20+马术菊+260301041+蔚然+大一+需要跟家里商量，担心自己基础不太好_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "open.confirm-call",
        "from": 1,
        "to": 5,
        "note": "9.20 蔚然稿：确认本人，从寝室和室友作息轻松开场"
      },
      {
        "purposeKey": "diag.major",
        "from": 11,
        "to": 17,
        "note": "9.20 蔚然稿：从针灸推拿专业聊到父亲学医的家庭影响"
      },
      {
        "purposeKey": "diag.parents",
        "from": 18,
        "to": 22,
        "note": "9.20 蔚然稿：爸爸只支持过四六级，她打算偷偷报课"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 38,
        "to": 42,
        "note": "9.20 蔚然稿：确认考研目标，辨析保研与考研的侧重点"
      },
      {
        "purposeKey": "window.job.outcome",
        "from": 43,
        "to": 46,
        "note": "9.20 蔚然稿：从就业地域和资源倒推现在该做规划"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 65,
        "to": 66,
        "note": "9.20 蔚然稿：接住高考失利和二本落差，转成英语突破口"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 67,
        "to": 84,
        "note": "9.20 蔚然稿：讲保研时间线、夏令营筛选和简历准备"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 84,
        "to": 91,
        "note": "9.20 蔚然稿：英语是保研科研和进导师组的硬性条件"
      },
      {
        "purposeKey": "filter.competition.types",
        "from": 95,
        "to": 105,
        "note": "9.20 蔚然稿：梳理学科、科研、专业三类竞赛及取舍"
      },
      {
        "purposeKey": "filter.english.visible",
        "from": 127,
        "to": 140,
        "note": "9.20 蔚然稿：把英语口语讲成保研复试的反差优势"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 141,
        "to": 150,
        "note": "9.20 蔚然稿：用一环扣一环说明英语是大学底层能力"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 174,
        "to": 177,
        "note": "9.20 蔚然稿：教她怎么跟爸爸开口，以及先做后说"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 174,
        "to": 177,
        "note": "9.20 蔚然稿：生活费里省出学费，实在不行自己先垫"
      },
      {
        "purposeKey": "offer.close.followup",
        "from": 178,
        "to": 178,
        "note": "9.20 蔚然稿：收尾约定先做规划、后续有问题再问"
      }
    ]
  },
  {
    "id": "s7-baozi2",
    "label": "9.20 堡子2咨询稿",
    "file": "zxg/9.20陈洋洋堡子2大一担心学习效果也担心爸妈不同意_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 1,
        "to": 2,
        "note": "9.20 堡子2稿：哥哥买的口语课没效果，先定有效学习标准"
      },
      {
        "purposeKey": "diag.parents",
        "from": 2,
        "to": 6,
        "note": "9.20 堡子2稿：爸妈不理解不支持，先弄清反对从哪来"
      },
      {
        "purposeKey": "trust.self-disclosure",
        "from": 3,
        "to": 6,
        "note": "9.20 堡子2稿：用自己的经历说明父母不理解也能先做出结果"
      },
      {
        "purposeKey": "diag.money.advice",
        "from": 9,
        "to": 14,
        "note": "9.20 堡子2稿：劝她把钱投在学习上，前期吃苦换能力"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 15,
        "to": 20,
        "note": "9.20 堡子2稿：先学出结果再跟父母谈，别一被拒就放弃"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 20,
        "to": 20,
        "note": "9.20 堡子2稿：提线上兼职和助教实习，先补现金流"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 21,
        "to": 26,
        "note": "9.20 堡子2稿：首期能付，后面压力大就找助教多分一期"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 21,
        "to": 26,
        "note": "9.20 堡子2稿：算清分期现金流，教她争取多分一期"
      },
      {
        "purposeKey": "offer.close.followup",
        "from": 27,
        "to": 28,
        "note": "9.20 堡子2稿：收尾让她先去问助教分期，再反馈"
      }
    ]
  },
  {
    "id": "s8-baozi",
    "label": "9.20 堡子咨询稿",
    "file": "zxg/9.20陈洋洋堡子大一担心学习效果也担心爸妈不同意_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "open.confirm-call",
        "from": 1,
        "to": 5,
        "note": "9.20 堡子稿：确认本人，从图书馆和上课安排轻松开场"
      },
      {
        "purposeKey": "trust.self-disclosure",
        "from": 25,
        "to": 31,
        "note": "9.20 堡子稿：讲自己从考研转向就业的真实经历"
      },
      {
        "purposeKey": "window.capability-timing",
        "from": 34,
        "to": 42,
        "note": "9.20 堡子稿：先培养能力，大三才有考研或就业的选择权"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 43,
        "to": 60,
        "note": "9.20 堡子稿：讲考研看初复试、保研看绩点和本校无推免"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 57,
        "to": 60,
        "note": "9.20 堡子稿：承认双非歧视，用初试超线证明能力"
      },
      {
        "purposeKey": "filter.competition.types",
        "from": 65,
        "to": 68,
        "note": "9.20 堡子稿：优先国家级竞赛，先做个人学科竞赛"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 68,
        "to": 75,
        "note": "9.20 堡子稿：拆考研初复试科目，落到英语最关键"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 75,
        "to": 101,
        "note": "9.20 堡子稿：用 AI 替代不了和复试现场说明英语刚需"
      },
      {
        "purposeKey": "offer.self-study",
        "from": 115,
        "to": 121,
        "note": "9.20 堡子稿：指出自学零碎资源没人纠错，走不通"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 122,
        "to": 127,
        "note": "9.20 堡子稿：讲全款和分期，第一期九百多"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 127,
        "to": 137,
        "note": "9.20 堡子稿：后面分期靠数学家教补，算清每月收入"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 128,
        "to": 137,
        "note": "9.20 堡子稿：给数学家教渠道和每周收入测算"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 142,
        "to": 142,
        "note": "9.20 堡子稿：建议先学一个月，拿结果再给爸妈看"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 148,
        "to": 149,
        "note": "9.20 堡子稿：用七天试学和按天退款降低决策压力"
      }
    ]
  },
  {
    "id": "s9-jiaqi",
    "label": "9.20 家琪咨询稿",
    "file": "zxg/9.20陈洋洋家琪专一不相信自己能改变能学好家里人也不同意_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "open.confirm-call",
        "from": 1,
        "to": 2,
        "note": "9.20 家琪稿：确认本人，接住她终于打来电话的紧张"
      },
      {
        "purposeKey": "diag.social",
        "from": 1,
        "to": 2,
        "note": "9.20 家琪稿：把内向不敢打电话翻译成愿意突破自己"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 27,
        "to": 31,
        "note": "9.20 家琪稿：问家里给生活费的方式，接住不好意思要钱"
      },
      {
        "purposeKey": "diag.money",
        "from": 31,
        "to": 41,
        "note": "9.20 家琪稿：讲自己靠实习和家教赚钱，减轻家里负担"
      },
      {
        "purposeKey": "diag.confidence.reframe",
        "from": 68,
        "to": 74,
        "note": "9.20 家琪稿：自信靠一项明显优于别人的能力长出来"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 72,
        "to": 83,
        "note": "9.20 家琪稿：用双语人才和国家战略说明英语是刚需"
      },
      {
        "purposeKey": "offer.self-study",
        "from": 88,
        "to": 100,
        "note": "9.20 家琪稿：对比网上零碎资源和系统学习，指出自学不行"
      },
      {
        "purposeKey": "offer.need.path",
        "from": 95,
        "to": 100,
        "note": "9.20 家琪稿：把学英语落到音标、发音规则和听说读写"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 101,
        "to": 110,
        "note": "9.20 家琪稿：接住她学不会的挫败，再推动她试一次"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 105,
        "to": 110,
        "note": "9.20 家琪稿：没信心时先接住，再问她甘心不甘心"
      },
      {
        "purposeKey": "offer.need.coach",
        "from": 122,
        "to": 128,
        "note": "9.20 家琪稿：强调有人纠音和正反馈，才能坚持"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 129,
        "to": 135,
        "note": "9.20 家琪稿：讲名额和分期，第一期九百多"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 132,
        "to": 145,
        "note": "9.20 家琪稿：用生活费加分期的现金流算她能否自筹"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 141,
        "to": 145,
        "note": "9.20 家琪稿：聊校园送外卖和勤工俭学，先让钱转起来"
      }
    ]
  },
  {
    "id": "s10-anning",
    "label": "9.27 安宁咨询稿",
    "file": "zxg/9.27陈洋洋26170047安宁大一要和父母商量_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "open.confirm-call",
        "from": 1,
        "to": 5,
        "note": "9.27 安宁稿：确认本人，从每周考试和大学想象开场"
      },
      {
        "purposeKey": "diag.busy",
        "from": 31,
        "to": 41,
        "note": "9.27 安宁稿：接住忙忙碌碌却没提升，找出可支配时间"
      },
      {
        "purposeKey": "filter.one-ability",
        "from": 41,
        "to": 47,
        "note": "9.27 安宁稿：把英语、专业、绩点排优先级，只抓一项"
      },
      {
        "purposeKey": "filter.competition.types",
        "from": 59,
        "to": 63,
        "note": "9.27 安宁稿：给出大一可参加的大英赛等竞赛清单"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 74,
        "to": 92,
        "note": "9.27 安宁稿：讲保研要求、夏令营筛选和六级550分"
      },
      {
        "purposeKey": "offer.self-study",
        "from": 96,
        "to": 115,
        "note": "9.27 安宁稿：指出网上零碎资源不成体系，学不出来"
      },
      {
        "purposeKey": "offer.need.path",
        "from": 99,
        "to": 114,
        "note": "9.27 安宁稿：把路径落到音标、发音规则和听说读写"
      },
      {
        "purposeKey": "offer.need.coach",
        "from": 114,
        "to": 123,
        "note": "9.27 安宁稿：强调需要真人纠音和反馈，不能纯自学"
      },
      {
        "purposeKey": "offer.handoff",
        "from": 121,
        "to": 132,
        "note": "9.27 安宁稿：从找资源过渡到跟老师学，介绍选修库"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 132,
        "to": 135,
        "note": "9.27 安宁稿：讲学费压力和分期，第一期九百多"
      },
      {
        "purposeKey": "diag.parents",
        "from": 135,
        "to": 145,
        "note": "9.27 安宁稿：预演爸妈不同意的情况，问她会不会放弃"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 145,
        "to": 151,
        "note": "9.27 安宁稿：问出家里困难、每月五百生活费"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 151,
        "to": 155,
        "note": "9.27 安宁稿：建议走口语家教，先把能力换成收入"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 156,
        "to": 163,
        "note": "9.27 安宁稿：算她手上五百和四百缺口，准备凑钱方案"
      }
    ]
  },
  {
    "id": "s11-yanyan",
    "label": "9.27 艳艳咨询稿",
    "file": "zxg/9.27陈洋洋26170037艳艳大一新疆家里孩子多比较困难要和爸爸商量_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "open.confirm-call",
        "from": 1,
        "to": 5,
        "note": "9.27 艳艳稿：确认本人，从新疆上学路远和性格开场"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 8,
        "to": 18,
        "note": "9.27 艳艳稿：接住高考失常，承认新疆英语教育资源差距"
      },
      {
        "purposeKey": "diag.major",
        "from": 21,
        "to": 29,
        "note": "9.27 艳艳稿：聊化学专业和教师、检测等就业方向的迷茫"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 29,
        "to": 43,
        "note": "9.27 艳艳稿：问出两个妹妹一个弟弟、妈妈生病和爸爸工地"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 43,
        "to": 53,
        "note": "9.27 艳艳稿：算生活费结余，给出家教渠道和时薪"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 61,
        "to": 74,
        "note": "9.27 艳艳稿：聊考研动机、父母经济压力和攒考研基金"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 75,
        "to": 85,
        "note": "9.27 艳艳稿：英语是劣势，但考研就业都必须拿下"
      },
      {
        "purposeKey": "offer.self-study",
        "from": 85,
        "to": 100,
        "note": "9.27 艳艳稿：说明网上零碎资源学不好，必须系统学"
      },
      {
        "purposeKey": "offer.handoff",
        "from": 100,
        "to": 106,
        "note": "9.27 艳艳稿：从教育资源差距过渡到跟老师系统学"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 107,
        "to": 119,
        "note": "9.27 艳艳稿：讲全款三千多和分期，第一期九百多"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 112,
        "to": 129,
        "note": "9.27 艳艳稿：算她手上四百、缺口五百，给分期和兼职方案"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 120,
        "to": 134,
        "note": "9.27 艳艳稿：教她跟爸爸说报五百网课并做保证"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 129,
        "to": 134,
        "note": "9.27 艳艳稿：爸爸不同意也别放弃，准备借钱等 plan B"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 135,
        "to": 137,
        "note": "9.27 艳艳稿：介绍选修库里的考研英语课，先问助教"
      }
    ]
  },
  {
    "id": "s12-xiaoli",
    "label": "9.20 小李咨询稿",
    "file": "zxg/9.20+马术菊+260401010+小李+专二+之前踩过坑，家里人对网课这块不太信任_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.busy",
        "from": 13,
        "to": 20,
        "note": "小李稿：算升本时间账，实习后只剩一年半"
      },
      {
        "purposeKey": "diag.parents",
        "from": 27,
        "to": 30,
        "note": "小李稿：聊父母务农不懂大学规划，给不了他建议"
      },
      {
        "purposeKey": "diag.confidence",
        "from": 41,
        "to": 45,
        "note": "小李稿：问卷全填不确定，被追问后承认迷茫"
      },
      {
        "purposeKey": "filter.english",
        "from": 105,
        "to": 116,
        "note": "小李稿：用四级分数折算说明英语最能拉分"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 122,
        "to": 125,
        "note": "小李稿：升本后要不要考研，英语是复试的关键"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 155,
        "to": 158,
        "note": "小李稿：高中报网课没效果，留下怕再踩坑阴影"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 159,
        "to": 161,
        "note": "小李稿：拆旧课为何没效果，再转到大学能线上学"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 163,
        "to": 167,
        "note": "小李稿：问小金库和首期九百多，算还差多少"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 167,
        "to": 169,
        "note": "小李稿：讲七天试课退款，强调不会损失一分钱"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 170,
        "to": 176,
        "note": "小李稿：教拿打卡证据说服父母，别空口要钱"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 176,
        "to": 184,
        "note": "小李稿：讲表妹凑首期，鼓励找朋友周转借钱"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 185,
        "to": 188,
        "note": "小李稿：父母觉得晚点报没事，本人态度摇摆"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 188,
        "to": 190,
        "note": "小李稿：算错过优惠多花三千，用省鞋钱施压"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 190,
        "to": 191,
        "note": "小李稿：催当天对接老师排计划，别再拖一天"
      }
    ]
  },
  {
    "id": "s13-xiaozhao",
    "label": "9.20 小赵咨询稿",
    "file": "zxg/9.20罗兰英260301038专一小赵纠结他原本准备报的一个专升本的班_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.parents",
        "from": 12,
        "to": 14,
        "note": "小赵稿：家里有中医长辈，支持他走这个赛道"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 20,
        "to": 22,
        "note": "小赵稿：点明学医要读研，才可能进更好的医院"
      },
      {
        "purposeKey": "filter.competition",
        "from": 64,
        "to": 70,
        "note": "小赵稿：列职业院校技能大赛，省奖可破格校招"
      },
      {
        "purposeKey": "filter.english",
        "from": 99,
        "to": 105,
        "note": "小赵稿：用反差感说明英语能把专科学历变优势"
      },
      {
        "purposeKey": "offer.no-idea",
        "from": 121,
        "to": 127,
        "note": "小赵稿：问他英语计划，他只说不知道、学校课不够"
      },
      {
        "purposeKey": "offer.find-teacher",
        "from": 138,
        "to": 141,
        "note": "小赵稿：他说对老师课程心动，只是还没想好"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 145,
        "to": 151,
        "note": "小赵稿：拆机构全体系课太早报，前两年会白上"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 151,
        "to": 152,
        "note": "小赵稿：对比一万多全款，不如先分期付一个月"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 153,
        "to": 155,
        "note": "小赵稿：强调先小成本试一个月，给自己留退路"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 156,
        "to": 159,
        "note": "小赵稿：他其实想过先学英语，被点破后想明白"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 165,
        "to": 168,
        "note": "小赵稿：确认父母支持，教他按新方案跟家里说"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 167,
        "to": 168,
        "note": "小赵稿：问小金库够不够，首期约一千可自付"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 169,
        "to": 173,
        "note": "小赵稿：教他找助理领券，当天把名额定下来"
      }
    ]
  },
  {
    "id": "s14-xiaohai",
    "label": "9.27 小海咨询稿",
    "file": "zxg/9.27陈洋洋26170017小海大二找姐姐借钱_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "window.postgrad",
        "from": 17,
        "to": 21,
        "note": "小海稿：确认考研目标，锁定西电本专业方向"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 22,
        "to": 25,
        "note": "小海稿：家里不宽裕，读研成本要提前算清楚"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 32,
        "to": 37,
        "note": "小海稿：问兼职和存钱，每月只能攒一两百"
      },
      {
        "purposeKey": "diag.busy",
        "from": 43,
        "to": 49,
        "note": "小海稿：他说每天学习时间不够，水课寝室都在玩"
      },
      {
        "purposeKey": "filter.english",
        "from": 63,
        "to": 68,
        "note": "小海稿：把英语定为核心能力，六级要冲高分"
      },
      {
        "purposeKey": "diag.dorm.mindset",
        "from": 100,
        "to": 101,
        "note": "小海稿：建议别在宿舍学，去图书馆避开开黑"
      },
      {
        "purposeKey": "offer.self-study",
        "from": 102,
        "to": 108,
        "note": "小海稿：他说看网上发音视频自学，被追问后不自信"
      },
      {
        "purposeKey": "offer.three-pitfalls",
        "from": 109,
        "to": 116,
        "note": "小海稿：拆自学没路径没反馈，只会浪费时间"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 118,
        "to": 121,
        "note": "小海稿：算分期四期首月九百多，看经济压力"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 123,
        "to": 133,
        "note": "小海稿：算首期缺口，鼓励找姐姐借五百凑上"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 139,
        "to": 143,
        "note": "小海稿：教他跟姐姐说明报班，拿材料消除担心"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 145,
        "to": 147,
        "note": "小海稿：催他问助教分期，先兼职把现金流跑起来"
      }
    ]
  },
  {
    "id": "s15-xiaole",
    "label": "9.28 小乐咨询稿",
    "file": "zxg/9.28彭雨晴261801031小乐大二之前报班没坚持，怕钱花的不值_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "scan.family-burden",
        "from": 32,
        "to": 33,
        "note": "小乐稿：家里条件一般，她是独生女要赡养父母"
      },
      {
        "purposeKey": "diag.money",
        "from": 41,
        "to": 46,
        "note": "小乐稿：讲经济管理方式，三成生活三成投资自己"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 47,
        "to": 48,
        "note": "小乐稿：她明确不考研，怕再经历一次高考般煎熬"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 144,
        "to": 145,
        "note": "小乐稿：之前报PS班没坚持，怕这次又打水漂"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 154,
        "to": 159,
        "note": "小乐稿：拆旧配音剪辑班缺督导，交钱后没人管"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 177,
        "to": 178,
        "note": "小乐稿：讲七天无理由全款退，降低试错成本"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 180,
        "to": 184,
        "note": "小乐稿：接住她怕坚持不了的预设，鼓励先迈一步"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 185,
        "to": 189,
        "note": "小乐稿：谈六千原价和三千优惠，再落分期九百"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 189,
        "to": 195,
        "note": "小乐稿：算首期九百八缺口，问她能否找父母凑"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 195,
        "to": 197,
        "note": "小乐稿：父母因PS前车之鉴，要先拿结果再说服"
      },
      {
        "purposeKey": "diag.busy",
        "from": 198,
        "to": 204,
        "note": "小乐稿：她怕社团临时开会打乱计划，时间被切碎"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 209,
        "to": 210,
        "note": "小乐稿：让她听完再定，先问合同和七天试学"
      }
    ]
  },
  {
    "id": "s16-sansan",
    "label": "9.28 三三咨询稿",
    "file": "zxg/9.28罗兰英260301044三三专一家里比较贫困，很怕给家里增加压力_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.parents",
        "from": 9,
        "to": 11,
        "note": "三三稿：问她家三个孩子，姐姐考研哥哥打工"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 60,
        "to": 61,
        "note": "三三稿：算民办两年四五万，普通家庭承受不起"
      },
      {
        "purposeKey": "diag.busy",
        "from": 94,
        "to": 98,
        "note": "三三稿：她说每天很忙却没收获，时间被课切碎"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 104,
        "to": 110,
        "note": "三三稿：拆摇奶茶是纯体力，建议兼职从英语入手"
      },
      {
        "purposeKey": "diag.money.advice",
        "from": 127,
        "to": 137,
        "note": "三三稿：算口语家教收入，劝她靠能力而非体力赚钱"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 188,
        "to": 190,
        "note": "三三稿：她自认英语死脑筋，被重新归因为方法错"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 228,
        "to": 232,
        "note": "三三稿：她想抓机会，又怕要问父母、动贷款"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 234,
        "to": 237,
        "note": "三三稿：问清分期首期九百八，后面每期一千"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 238,
        "to": 243,
        "note": "三三稿：盘助学贷款余额，确认九百八首期拿得出"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 244,
        "to": 247,
        "note": "三三稿：劝她先别跟父母说，他们不懂只会担心"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 248,
        "to": 257,
        "note": "三三稿：讲七天退款，让她先偷学七天再跟家里说"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 266,
        "to": 269,
        "note": "三三稿：定下先报首期，专升本课可用积分兑换"
      },
      {
        "purposeKey": "offer.close.followup",
        "from": 301,
        "to": 303,
        "note": "三三稿：约定打卡记录发给她，做变相监督"
      }
    ]
  },
  {
    "id": "s17-xuedi",
    "label": "9.28 学弟咨询稿",
    "file": "zxg/9.28郭璐瑶260301058学弟大一，家里比较困难，想要去提升自己，自己东拼西凑.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.busy",
        "from": 14,
        "to": 15,
        "note": "学弟稿：讲组织部杂事多，只会占用学习时间"
      },
      {
        "purposeKey": "diag.parents",
        "from": 18,
        "to": 19,
        "note": "学弟稿：农村父母只说要找工作，不懂考研考公"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 80,
        "to": 83,
        "note": "学弟稿：他自认脑子笨，怕基础差怎么学都没结果"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 93,
        "to": 98,
        "note": "学弟稿：学费靠助学贷款，家里拿不出报课钱"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 95,
        "to": 98,
        "note": "学弟稿：讲自己当年首期九百多，也是东拼西凑"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 98,
        "to": 105,
        "note": "学弟稿：算贷款余额，劝他用首期九百先学起来"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 105,
        "to": 113,
        "note": "学弟稿：讲发传单食堂兼职，先赚几百周转学费"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 121,
        "to": 122,
        "note": "学弟稿：建议跟父母沟通，自己掏一半家里补一点"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 134,
        "to": 136,
        "note": "学弟稿：他说高中被网课骗过，怕这次又踩坑"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 144,
        "to": 148,
        "note": "学弟稿：讲七天试学退费，还有入学测评兜底"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 156,
        "to": 159,
        "note": "学弟稿：催他行动起来，用贷款或分期先报上"
      }
    ]
  },
  {
    "id": "s18-xiaofei2",
    "label": "9.21 晓菲2咨询稿",
    "file": "zxg/9.21陈洋洋晓菲2大三觉得如果想考研的话口语不重要_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "window.postgrad",
        "from": 14,
        "to": 19,
        "note": "晓菲2稿：原本想考研补能力，聊完反而动摇，先陪她理清方向"
      },
      {
        "purposeKey": "window.job.reality",
        "from": 19,
        "to": 22,
        "note": "晓菲2稿：自述没技能、C语言都不懂，接住她对找工作的恐慌"
      },
      {
        "purposeKey": "filter.track.her-plan",
        "from": 29,
        "to": 30,
        "note": "晓菲2稿：劝她综合评估考研还是就业，不急着替她下结论"
      },
      {
        "purposeKey": "filter.english",
        "from": 31,
        "to": 33,
        "note": "晓菲2稿：她已意识到英语重要，顺势把话题落到学英语"
      },
      {
        "purposeKey": "offer.find-teacher",
        "from": 36,
        "to": 37,
        "note": "晓菲2稿：问怎么学，引出跟着薇薇老师学这条路"
      },
      {
        "purposeKey": "filter.track.her-plan",
        "from": 43,
        "to": 55,
        "note": "晓菲2稿：问考研还是就业，她反复说再想想，先留空间"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 64,
        "to": 66,
        "note": "晓菲2稿：拆“考研不考口语”的误区，说明口语并非用不上"
      },
      {
        "purposeKey": "scan.parents",
        "from": 64,
        "to": 65,
        "note": "晓菲2稿：家人支持考研却认定口语没用，先弄清家里态度"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 70,
        "to": 75,
        "note": "晓菲2稿：确认现在还能不能报名，推进到具体动作"
      }
    ]
  },
  {
    "id": "s19-xiaofei",
    "label": "9.21 晓菲咨询稿",
    "file": "zxg/9.21陈洋洋晓菲大三觉得如果想考研的话口语不重要_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "filter.track.her-plan",
        "from": 13,
        "to": 20,
        "note": "晓菲稿：她还没定方向，之前看过别的项目又嫌人多"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 21,
        "to": 22,
        "note": "晓菲稿：她说学历是短板，想提升却不知从哪入手"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 21,
        "to": 23,
        "note": "晓菲稿：想提升学历，老师建议继续考本专业或跨考"
      },
      {
        "purposeKey": "scan.worries",
        "from": 27,
        "to": 28,
        "note": "晓菲稿：她说想提升学历却学不进去、没动力"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 44,
        "to": 45,
        "note": "晓菲稿：解释在职研究生就是边工作边读，先厘清概念"
      },
      {
        "purposeKey": "filter.english",
        "from": 54,
        "to": 55,
        "note": "晓菲稿：收尾确认要学英语，为后续跟进留下动作"
      }
    ]
  },
  {
    "id": "s20-xiaoliao",
    "label": "9.27 小廖咨询稿",
    "file": "zxg/9.27董飞燕260401031小廖专二家里要驾照英语二选一_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "scan.family-burden",
        "from": 13,
        "to": 15,
        "note": "小廖稿：家里带弟妹、爸妈忙挣钱，先接住她的家庭担子"
      },
      {
        "purposeKey": "filter.track.her-plan",
        "from": 16,
        "to": 18,
        "note": "小廖稿：把专升本定为最优先，先给她一条清晰主线"
      },
      {
        "purposeKey": "filter.english",
        "from": 21,
        "to": 28,
        "note": "小廖稿：从专升本必考讲到就业，论证英语最值得学"
      },
      {
        "purposeKey": "diag.major.cases",
        "from": 29,
        "to": 31,
        "note": "小廖稿：用高端家政和同学案例说明家政加英语的溢价"
      },
      {
        "purposeKey": "filter.english.universal",
        "from": 36,
        "to": 39,
        "note": "小廖稿：英语是跨行业通行证，用外企前台例子佐证"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 45,
        "to": 46,
        "note": "小廖稿：专科学历简历写不出东西，接住她的学历落差"
      },
      {
        "purposeKey": "offer.find-teacher",
        "from": 51,
        "to": 53,
        "note": "小廖稿：跟老师学能有人教，还能争取实习和简历加分"
      },
      {
        "purposeKey": "diag.parents",
        "from": 54,
        "to": 56,
        "note": "小廖稿：家里让她在驾照和英语间二选一，先弄清态度"
      },
      {
        "purposeKey": "diag.busy",
        "from": 56,
        "to": 58,
        "note": "小廖稿：驾照耗时又不加分，劝她把时间留给英语"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 59,
        "to": 61,
        "note": "小廖稿：问她是否想明白，推动她在两件事上做取舍"
      },
      {
        "purposeKey": "offer.pitfall.environment",
        "from": 70,
        "to": 71,
        "note": "小廖稿：讨论去哪学、怎么找安静环境，降低启动阻力"
      }
    ]
  },
  {
    "id": "s21-xianxian",
    "label": "9.27 娴娴妹咨询稿",
    "file": "zxg/9.27董飞燕260401039娴娴妹大二考研讨厌英语_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "scan.family-burden",
        "from": 6,
        "to": 20,
        "note": "娴娴妹稿：单亲、妈妈供学费生活费，接住她不敢花钱的愧疚"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 22,
        "to": 33,
        "note": "娴娴妹稿：五千块学一个半月没效果，拆旧机构的坑"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 35,
        "to": 39,
        "note": "娴娴妹稿：讲法学就业出路，说明为什么大部分人要考研"
      },
      {
        "purposeKey": "filter.english",
        "from": 46,
        "to": 51,
        "note": "娴娴妹稿：她讨厌英语、四级没过，仍确认英语必须学"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 54,
        "to": 69,
        "note": "娴娴妹稿：讲考研初试科目和复试英语面试的要求"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 70,
        "to": 79,
        "note": "娴娴妹稿：双非在复试被歧视，用英语制造反差突围"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 89,
        "to": 90,
        "note": "娴娴妹稿：她说学了很久没学好很受打击，先接住挫败"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 103,
        "to": 110,
        "note": "娴娴妹稿：网课太贵，先确认她到底想不想学"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 115,
        "to": 122,
        "note": "娴娴妹稿：首期九百八加七天试课，降低试错成本"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 138,
        "to": 147,
        "note": "娴娴妹稿：她不信、怕退款被卡，逐条回应顾虑"
      },
      {
        "purposeKey": "diag.parents",
        "from": 156,
        "to": 159,
        "note": "娴娴妹稿：妈妈还没回消息，先准备怎么跟妈妈解释"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 156,
        "to": 160,
        "note": "娴娴妹稿：先跟妈妈要九百八试水，后续再自己想办法"
      }
    ]
  },
  {
    "id": "s22-huimin",
    "label": "9.29 惠敏咨询稿",
    "file": "zxg/9.29+宋佳琦+26064012+惠敏+大二+担心学习效果_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "filter.english",
        "from": 8,
        "to": 21,
        "note": "惠敏稿：从上海就业和国贸专业切入，论证口语是硬门槛"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 22,
        "to": 33,
        "note": "惠敏稿：五千块学一个半月没效果，还差点被续费套住"
      },
      {
        "purposeKey": "offer.pitfall.path",
        "from": 47,
        "to": 52,
        "note": "惠敏稿：旧课只会跟读复制，缺发音到语法的路径"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 54,
        "to": 55,
        "note": "惠敏稿：旧班让她觉得英语太难，先接住被打击的信心"
      },
      {
        "purposeKey": "diag.parents",
        "from": 63,
        "to": 67,
        "note": "惠敏稿：爸爸完全不信、姐姐也劝别报，先分析家里态度"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 72,
        "to": 73,
        "note": "惠敏稿：算首期九百多，先学一个月看效果再续"
      },
      {
        "purposeKey": "diag.busy",
        "from": 83,
        "to": 86,
        "note": "惠敏稿：周三满课，确认她一周能拿出哪几天学习"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 89,
        "to": 91,
        "note": "惠敏稿：她说学了这么久没学好特别打击，先共情再重定义"
      },
      {
        "purposeKey": "window.cases.peers",
        "from": 92,
        "to": 96,
        "note": "惠敏稿：用文轩高考五六十分到专升本一百三的案例"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 106,
        "to": 112,
        "note": "惠敏稿：她想国庆接英语家教，讨论兼职和锻炼口语"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 115,
        "to": 117,
        "note": "惠敏稿：优惠券过期、价格涨到六千，先处理价格顾虑"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 119,
        "to": 123,
        "note": "惠敏稿：自述借钱凑首期，示范怎么自己解决缺口"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 133,
        "to": 135,
        "note": "惠敏稿：强调七天试课，不满意可退，降低决策压力"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 175,
        "to": 181,
        "note": "惠敏稿：细算家教一周四百、一月一千六的收入"
      }
    ]
  },
  {
    "id": "s23-xiaojuan",
    "label": "9.27 小娟咨询稿",
    "file": "zxg/9.27+宋佳琦+26064014+小娟+专二+学习效果、时间安排.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.school-gap",
        "from": 36,
        "to": 37,
        "note": "小娟稿：专升本面试被质疑能力，英语是反击的证据"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 38,
        "to": 41,
        "note": "小娟稿：报班怕花家里钱又没效果，接住她的愧疚"
      },
      {
        "purposeKey": "window.job.resume",
        "from": 49,
        "to": 65,
        "note": "小娟稿：拆简历三要素，落到比赛证书和实习经历"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 68,
        "to": 78,
        "note": "小娟稿：她自认三分钟热度，先归因到方法和反馈"
      },
      {
        "purposeKey": "diag.busy",
        "from": 81,
        "to": 90,
        "note": "小娟稿：从早八满课到晚上，帮她把学习塞进空档"
      },
      {
        "purposeKey": "diag.club",
        "from": 91,
        "to": 98,
        "note": "小娟稿：两个社团为学分必须去，判断时间优先级"
      },
      {
        "purposeKey": "diag.busy",
        "from": 99,
        "to": 105,
        "note": "小娟稿：只剩晚上能学，确认每天怎么抽出时间"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 100,
        "to": 103,
        "note": "小娟稿：算家教一周四小时、假期四十天的收入"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 107,
        "to": 114,
        "note": "小娟稿：高中补习班没效果，先分清是方法问题"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 118,
        "to": 120,
        "note": "小娟稿：首期九百多加七天试课，降低试错压力"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 128,
        "to": 137,
        "note": "小娟稿：自述奶奶生病家里缺钱，接住她的家庭责任"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 138,
        "to": 151,
        "note": "小娟稿：食堂兼职加家教，一期一期把学费凑出来"
      },
      {
        "purposeKey": "window.cases.peers",
        "from": 153,
        "to": 158,
        "note": "小娟稿：地铁专科生靠英语进外企的逆袭案例"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 166,
        "to": 176,
        "note": "小娟稿：问名额和分期，推进到具体报名动作"
      }
    ]
  },
  {
    "id": "s24-xiaodu",
    "label": "9.29 小杜咨询稿",
    "file": "zxg/9.29郭璐瑶260401023小杜大三，民办本科很迷茫，自己有力有第一期的钱，想要有这样的平台圈子学习，提升自己.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "window.job",
        "from": 10,
        "to": 13,
        "note": "小杜稿：确认她想直接就业，聊英语相关岗位与喜好"
      },
      {
        "purposeKey": "diag.major",
        "from": 17,
        "to": 18,
        "note": "小杜稿：专业非自愿被分数卡住，聊英语外贸方向"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 29,
        "to": 33,
        "note": "小杜稿：讲暑假工只挣1500，打完就觉得没意义"
      },
      {
        "purposeKey": "window.job.reality",
        "from": 38,
        "to": 48,
        "note": "小杜稿：聊翻译类工作，也发现实习要求专业对口"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 65,
        "to": 75,
        "note": "小杜稿：接住民办三本落差和宿舍学什么都没用的论调"
      },
      {
        "purposeKey": "diag.dorm",
        "from": 78,
        "to": 79,
        "note": "小杜稿：尽量少待宿舍躲消极氛围，学校却不许安床帘"
      },
      {
        "purposeKey": "window.job.resume",
        "from": 83,
        "to": 83,
        "note": "小杜稿：写简历时发现没竞赛没经历可写的焦虑"
      },
      {
        "purposeKey": "offer.close.price",
        "from": 108,
        "to": 110,
        "note": "小杜稿：算清3000券和7000原价，追问能否分期"
      },
      {
        "purposeKey": "diag.parents",
        "from": 111,
        "to": 112,
        "note": "小杜稿：说爸妈的顾虑和咨询师父母如出一辙"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 117,
        "to": 118,
        "note": "小杜稿：因先免费听三节课而相信老师不是骗钱"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 123,
        "to": 123,
        "note": "小杜稿：表示自己手里有钱，每月家里也给"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 129,
        "to": 129,
        "note": "小杜稿：从犹豫转为确定，愿意跟微微老师学"
      },
      {
        "purposeKey": "offer.close.followup",
        "from": 140,
        "to": 140,
        "note": "小杜稿：挂电话前约定先去找助教老师问分期"
      }
    ]
  },
  {
    "id": "s25-ranran",
    "label": "9.20 然然咨询稿",
    "file": "zxg/9.20毛思南260310028然然大一+线上线下_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 7,
        "to": 11,
        "note": "然然稿：讲高考前被车撞伤膝盖，假期只能在家"
      },
      {
        "purposeKey": "diag.major",
        "from": 16,
        "to": 19,
        "note": "然然稿：从学校讲座找到射频通信方向并锁定"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 24,
        "to": 29,
        "note": "然然稿：先让她说对保研流程和保研率的了解"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 31,
        "to": 39,
        "note": "然然稿：讲保研优势、夏令营预推免和养鱼机制"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 40,
        "to": 45,
        "note": "然然稿：梳理夏令营时间线和五项评选标准"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 50,
        "to": 53,
        "note": "然然稿：中外合办英文授课，英语直接拖低绩点"
      },
      {
        "purposeKey": "diag.busy",
        "from": 54,
        "to": 59,
        "note": "然然稿：大二被科研竞赛占满，没时间再补英语"
      },
      {
        "purposeKey": "filter.competition.types",
        "from": 73,
        "to": 88,
        "note": "然然稿：按学科、科研、专业三类列竞赛清单"
      },
      {
        "purposeKey": "diag.parents",
        "from": 89,
        "to": 90,
        "note": "然然稿：爸妈只想让她保本校，她了解并不多"
      },
      {
        "purposeKey": "filter.track.her-plan",
        "from": 92,
        "to": 95,
        "note": "然然稿：推荐西电、成电、东南、北邮四所院校"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 101,
        "to": 102,
        "note": "然然稿：英语拉分才没进更好学校，接住落差"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 113,
        "to": 114,
        "note": "然然稿：讲自己报课踩坑，说明选错课的沉没成本"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 130,
        "to": 130,
        "note": "然然稿：用七天试课和退款降低她的试错成本"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 138,
        "to": 139,
        "note": "然然稿：确认妈妈支持，建议再跟家里沟通细节"
      }
    ]
  },
  {
    "id": "s26-yuying",
    "label": "9.20 钰滢咨询稿",
    "file": "zxg/9.20郭璐瑶260301024钰滢大一，自己很想跟着老师学习，跟家里商量，最后同意啦.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "open.confirm-call",
        "from": 1,
        "to": 3,
        "note": "钰滢稿：确认她在楼道通话，问听完直播的收获"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 4,
        "to": 8,
        "note": "钰滢稿：接住专科混日子的氛围和她的不甘"
      },
      {
        "purposeKey": "filter.track.her-plan",
        "from": 9,
        "to": 14,
        "note": "钰滢稿：说广东公办专升本少，定下大一先学英语"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 15,
        "to": 27,
        "note": "钰滢稿：AI时代和专升本都绕不开英语能力"
      },
      {
        "purposeKey": "filter.english.foundation",
        "from": 41,
        "to": 50,
        "note": "钰滢稿：英语只考二十多分，基础要从头重建"
      },
      {
        "purposeKey": "diag.busy",
        "from": 44,
        "to": 45,
        "note": "钰滢稿：提醒大二课多实习忙，更没空补英语"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 56,
        "to": 60,
        "note": "钰滢稿：传统专升本班花一两万却平均用力"
      },
      {
        "purposeKey": "offer.need.path",
        "from": 61,
        "to": 63,
        "note": "钰滢稿：强调必须从发音和音标开始补地基"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 64,
        "to": 70,
        "note": "钰滢稿：高三英语学不下去转日语，留下断层"
      },
      {
        "purposeKey": "trust.self-disclosure",
        "from": 75,
        "to": 78,
        "note": "钰滢稿：咨询师讲自己说服妈妈、借钱报课的经历"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 86,
        "to": 90,
        "note": "钰滢稿：用七天试课和980分期降低试错成本"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 77,
        "to": 78,
        "note": "钰滢稿：提到自己手里有红包钱，可垫第一期"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 79,
        "to": 85,
        "note": "钰滢稿：接住第一次报网课的纠结和不敢行动"
      },
      {
        "purposeKey": "diag.parents",
        "from": 101,
        "to": 104,
        "note": "钰滢稿：确认家长认可英语重要，会支持她学"
      }
    ]
  },
  {
    "id": "s27-minghua",
    "label": "9.27 铭华咨询稿",
    "file": "zxg/9.27郭康兰+编号260301038+铭华专一_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "filter.track.her-plan",
        "from": 10,
        "to": 18,
        "note": "铭华稿：确认先升本再考研、继续机械方向的打算"
      },
      {
        "purposeKey": "diag.parents",
        "from": 17,
        "to": 18,
        "note": "铭华稿：爸妈只要求升本，他自己想读得更好"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 25,
        "to": 34,
        "note": "铭华稿：用20%录取率讲环境、教学和学法差距"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 35,
        "to": 42,
        "note": "铭华稿：英语最能拉开差距，是专升本的破局点"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 37,
        "to": 38,
        "note": "铭华稿：高考英语56分紧张失常，成了滑铁卢"
      },
      {
        "purposeKey": "filter.criteria",
        "from": 64,
        "to": 76,
        "note": "铭华稿：讲用人单位442法则，学历只占20%"
      },
      {
        "purposeKey": "window.timeline",
        "from": 77,
        "to": 90,
        "note": "铭华稿：倒推专一打基础、专二证书实习、专三冲刺"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 84,
        "to": 86,
        "note": "铭华稿：想挣钱就做家教兼职，别急着进厂"
      },
      {
        "purposeKey": "trust.self-disclosure",
        "from": 93,
        "to": 95,
        "note": "铭华稿：讲自己四六级高分、兼职和经济独立"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 98,
        "to": 99,
        "note": "铭华稿：坦白家里务农、父亲卖鸡鸭的负担"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 100,
        "to": 102,
        "note": "铭华稿：讲专科女生报专升本班花六七千仍焦虑"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 154,
        "to": 168,
        "note": "铭华稿：教他按关心、现状、规划、发心跟爸妈说"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 169,
        "to": 171,
        "note": "铭华稿：强调分期和合同保障，降低试错风险"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 170,
        "to": 178,
        "note": "铭华稿：算清小金库500和借钱凑第一期学费"
      }
    ]
  },
  {
    "id": "s28-xiaoyu",
    "label": "9.27 小彧咨询稿",
    "file": "zxg/9.27郭康兰+编号260301058+小彧大一_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.busy",
        "from": 3,
        "to": 4,
        "note": "小彧稿：上午上课下午训练，一天排得很满"
      },
      {
        "purposeKey": "window.job.reality",
        "from": 8,
        "to": 12,
        "note": "小彧稿：讲运动员出路窄，退役后大多当教练"
      },
      {
        "purposeKey": "diag.parents",
        "from": 15,
        "to": 16,
        "note": "小彧稿：爸妈希望她读研后进大学当体育老师"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 25,
        "to": 30,
        "note": "小彧稿：讲保研的六级硬门槛和校内外竞争"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 34,
        "to": 39,
        "note": "小彧稿：三年级后几乎没学习，英语断断续续"
      },
      {
        "purposeKey": "filter.english.foundation",
        "from": 40,
        "to": 53,
        "note": "小彧稿：用词汇量和听力语速数据说明基础差"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 53,
        "to": 60,
        "note": "小彧稿：英语是读文献、做AI和科研的底层能力"
      },
      {
        "purposeKey": "offer.need.path",
        "from": 61,
        "to": 72,
        "note": "小彧稿：讲语言敏感期、发音规则和纠正反馈"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 73,
        "to": 73,
        "note": "小彧稿：提到她月入两万多，钱不该打水漂"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 95,
        "to": 112,
        "note": "小彧稿：讲推免资格、夏令营、预推免和填系统"
      },
      {
        "purposeKey": "window.timeline",
        "from": 113,
        "to": 131,
        "note": "小彧稿：规划大一把数学英语打好、大二竞赛科研"
      },
      {
        "purposeKey": "offer.need.coach",
        "from": 140,
        "to": 160,
        "note": "小彧稿：分析找大学老师做纠正反馈并不现实"
      },
      {
        "purposeKey": "offer.find-teacher",
        "from": 161,
        "to": 180,
        "note": "小彧稿：分辨资源和资料，引出微微老师的课"
      },
      {
        "purposeKey": "offer.close.hesitation",
        "from": 183,
        "to": 188,
        "note": "小彧稿：她只说暂时这么定，咨询师推她确认"
      }
    ]
  },
  {
    "id": "s29-xiaojiu",
    "label": "9.28 小玖咨询稿",
    "file": "zxg/9.28郭康兰++编号260301057+小玖专一_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 20,
        "to": 30,
        "note": "小玖稿：已报七千一专升本班，担心钱打水漂"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 58,
        "to": 60,
        "note": "小玖稿：解释在职考研和非全日制研究生的区别"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 80,
        "to": 89,
        "note": "小玖稿：用就业和AI说明英语是差异化能力"
      },
      {
        "purposeKey": "diag.busy",
        "from": 96,
        "to": 105,
        "note": "小玖稿：专三实习备考撞车，倒推大一打地基"
      },
      {
        "purposeKey": "diag.money.two-kinds",
        "from": 116,
        "to": 127,
        "note": "小玖稿：拆剪辑和PPT接单，时间换钱不划算"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 128,
        "to": 140,
        "note": "小玖稿：算家教时薪、工作量和月收入现金流"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 164,
        "to": 175,
        "note": "小玖稿：分期首期九百多，用助学贷款补缺口"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 205,
        "to": 208,
        "note": "小玖稿：指导她当天占名额并完成全部报名流程"
      }
    ]
  },
  {
    "id": "s30-xuemei",
    "label": "9.28 学妹咨询稿",
    "file": "zxg/9.28郭康兰+编号260301044+学妹大一_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.major",
        "from": 21,
        "to": 24,
        "note": "学妹稿：专业由父母研究决定，她其实并不了解"
      },
      {
        "purposeKey": "scan.parents",
        "from": 25,
        "to": 27,
        "note": "学妹稿：问父母职业，了解家庭决策方式和资源"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 33,
        "to": 46,
        "note": "学妹稿：讲考研初试、复试和英语文献翻译要求"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 76,
        "to": 86,
        "note": "学妹稿：把二本学历落差翻成复试的反差优势"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 92,
        "to": 97,
        "note": "学妹稿：分析四科里只有英语能拉开分数差距"
      },
      {
        "purposeKey": "diag.busy",
        "from": 124,
        "to": 128,
        "note": "学妹稿：拆时间不够，指出社团活动在消耗时间"
      },
      {
        "purposeKey": "offer.need.plan",
        "from": 144,
        "to": 146,
        "note": "学妹稿：先测评再按目标制定针对性计划方案"
      },
      {
        "purposeKey": "diag.parents",
        "from": 147,
        "to": 149,
        "note": "学妹稿：妈妈觉得找免费资源就行，不愿报课"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 150,
        "to": 162,
        "note": "学妹稿：教她拿规划和免费最贵的道理说服妈妈"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 163,
        "to": 171,
        "note": "学妹稿：妈妈不同意时自己凑钱并办分期付款"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 169,
        "to": 171,
        "note": "学妹稿：用七天试课和退款承诺降低决策压力"
      }
    ]
  },
  {
    "id": "s31-yaru",
    "label": "9.28 雅茹咨询稿",
    "file": "zxg/9.28陈洋洋26170044雅茹大一认知低电话前没有意识到英语的重要性打算放弃学英语电话后解决_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "diag.busy",
        "from": 38,
        "to": 48,
        "note": "雅茹稿：剪辑每天要七小时，和上课休息冲突"
      },
      {
        "purposeKey": "scan.family-burden",
        "from": 72,
        "to": 87,
        "note": "雅茹稿：单亲家庭，父亲打零工供养三个孩子"
      },
      {
        "purposeKey": "diag.money",
        "from": 103,
        "to": 110,
        "note": "雅茹稿：想赚钱但没技能，只能先花钱投资能力"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 139,
        "to": 147,
        "note": "雅茹稿：英语是跨行业和转行时最稳的底气项"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 157,
        "to": 165,
        "note": "雅茹稿：怕自己太笨学不会，担心花钱没效果"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 166,
        "to": 172,
        "note": "雅茹稿：算家教时薪、学校渠道和假期总收入"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 180,
        "to": 181,
        "note": "雅茹稿：七天试学不满意都可随时退款无扣费"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 182,
        "to": 190,
        "note": "雅茹稿：分四期首期九百多，先试再付清余款"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 190,
        "to": 197,
        "note": "雅茹稿：先测评并定计划，再抢券报名学习课"
      }
    ]
  },
  {
    "id": "s32-xiaotang",
    "label": "9.28 小唐咨询稿",
    "file": "zxg/9.28陈洋洋26170046小唐大一无阻力_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "scan.family-burden",
        "from": 65,
        "to": 70,
        "note": "小唐稿：父母赚钱很辛苦，她花家里钱有愧疚"
      },
      {
        "purposeKey": "diag.money.part-time",
        "from": 72,
        "to": 80,
        "note": "小唐稿：算家教时薪、排课和每月的收入情况"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 86,
        "to": 99,
        "note": "小唐稿：讲考研初试、单科线和英语硬门槛要求"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 95,
        "to": 101,
        "note": "小唐稿：普通院校资源少，靠英语拉平资源差距"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 102,
        "to": 114,
        "note": "小唐稿：用复试落榜案例讲口语和简历重要性"
      },
      {
        "purposeKey": "diag.parents",
        "from": 115,
        "to": 119,
        "note": "小唐稿：父母觉得大学先玩，不急着赚钱和实习"
      },
      {
        "purposeKey": "diag.busy",
        "from": 120,
        "to": 121,
        "note": "小唐稿：专业课加英语已排满，时间必须聚焦"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 128,
        "to": 136,
        "note": "小唐稿：父母不理解时先做后说，用结果证明"
      },
      {
        "purposeKey": "offer.close.enroll",
        "from": 139,
        "to": 143,
        "note": "小唐稿：抢券后联系助教占名额并走报名流程"
      }
    ]
  },
  {
    "id": "s33-junling",
    "label": "9.29 君灵咨询稿",
    "file": "zxg/9.29郭康兰+编号260301040+君灵大一_原文.docx",
    "season": "旺季",
    "parser": "transcript",
    "mappings": [
      {
        "purposeKey": "scan.parents",
        "from": 20,
        "to": 26,
        "note": "君灵稿：父母劝她别学法，家里还有三个孩子"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 39,
        "to": 48,
        "note": "君灵稿：讲保研资格、五个要素和机筛的规则"
      },
      {
        "purposeKey": "window.postgrad",
        "from": 49,
        "to": 60,
        "note": "君灵稿：讲夏令营、预推免、九推和复试流程"
      },
      {
        "purposeKey": "diag.school-gap",
        "from": 62,
        "to": 63,
        "note": "君灵稿：211也分层次，内地院校资源更强"
      },
      {
        "purposeKey": "filter.english.necessary",
        "from": 83,
        "to": 102,
        "note": "君灵稿：英语是进课题组和保研的硬门槛条件"
      },
      {
        "purposeKey": "offer.pitfall.sunk",
        "from": 176,
        "to": 184,
        "note": "君灵稿：高中补习班没效果，怕重复花钱报班"
      },
      {
        "purposeKey": "diag.confidence.trauma",
        "from": 185,
        "to": 195,
        "note": "君灵稿：不是她不行，只是旧方法缺少正反馈"
      },
      {
        "purposeKey": "diag.busy",
        "from": 202,
        "to": 203,
        "note": "君灵稿：再忙也每天抽一小时，降低执行门槛"
      },
      {
        "purposeKey": "offer.close.risk-reversal",
        "from": 206,
        "to": 207,
        "note": "君灵稿：七天试学，没收获可随时退款无扣费"
      },
      {
        "purposeKey": "offer.close.parents",
        "from": 209,
        "to": 214,
        "note": "君灵稿：和爸妈讲清课程，也留自有资金兜底"
      },
      {
        "purposeKey": "offer.close.self-fund",
        "from": 214,
        "to": 217,
        "note": "君灵稿：自己有钱，问清分期并申请优惠名额"
      }
    ]
  },
  {
    id: "dz01",
    label: "10.10 小玺咨询稿",
    file: "zxg/dz_zxg/10.10+宋佳琦+26063089+小玺+大一+担心学习效果.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "trust.self-disclosure", from: 6, to: 10, note: "10.10 小玺稿：咨询师讲自己也有弟弟、年龄相差小，作为姐姐先把路走好才能给弟妹分享，接住她作为姐姐的迷茫。" },
      { purposeKey: "scan.volunteer", from: 11, to: 14, note: "10.10 小玺稿：问旅游专业怎么选的，她说自己瞎选、父母不懂也不参与，学习方面基本自己做主。" },
      { purposeKey: "scan.family-burden", from: 16, to: 24, note: "10.10 小玺稿：从民办学校学费一万多问到助学贷款，确认一年贷17600、含住宿书本费，家里出不了这笔钱。" },
      { purposeKey: "window.final-goal", from: 25, to: 26, note: "10.10 小玺稿：现场算助学贷款四年七万多，推出一毕业就得找薪资高的工作才还得快。" },
      { purposeKey: "scan.money", from: 27, to: 35, note: "10.10 小玺稿：确认生活费全靠自己，暑假在餐饮店打工两个月只挣三千多，只够一学期、下学期仍不够。" },
      { purposeKey: "diag.money", from: 36, to: 36, note: "10.10 小玺稿：指出靠假期端盘子不是长久之计，只换来生活费、提升不了能力，得学社会上真能用的东西。" },
      { purposeKey: "window.track-uncertain", from: 37, to: 37, note: "10.10 小玺稿：她不知道往哪个方向走，咨询师建议先去各行各业找实习，用实习低成本验证方向。" },
      { purposeKey: "window.english-leverage", from: 38, to: 39, note: "10.10 小玺稿：讲自己大一靠英语找到翻译类实习，各企业都需要英语人才，但前提是先把英语能力提上来。" },
      { purposeKey: "filter.tutor", from: 40, to: 40, note: "10.10 小玺稿：讲自己大二靠周末英语家教实现经济独立，一小时六十多、一个月近一千，正好覆盖生活费。" },
      { purposeKey: "trust.self-disclosure", from: 41, to: 43, note: "10.10 小玺稿：讲自己家里出不了钱、跟魏老师学英语是分期付的，后来靠做家教补学费，还在老师公司免费实习。" },
      { purposeKey: "window.final-goal", from: 44, to: 46, note: "10.10 小玺稿：把铁饭碗重新解释成走到哪都被高薪聘请，旅游、土木等任何行业都有人做得好，核心看个人能力。" },
      { purposeKey: "window.experience-first", from: 47, to: 47, note: "10.10 小玺稿：用理财书里会下金蛋的鹅作比喻，说明先值钱才能赚钱，提升能力本身就是在养鹅。" },
      { purposeKey: "diag.environment", from: 48, to: 49, note: "10.10 小玺稿：承认民办学校很多人摆烂、家里有钱，普通家庭孩子不能跟着混；能力上来后才能遇到志同道合的伙伴和好圈子。" },
      { purposeKey: "window.442", from: 52, to: 52, note: "10.10 小玺稿：给出就业三方面占比，学历20%、经历40%、能力40%，让她先记下这个框架。" },
      { purposeKey: "window.competition-pool", from: 53, to: 54, note: "10.10 小玺稿：用研究生送外卖、学校培养与社会脱轨解释，3000的工作很多人抢、3万的工作反而竞争少。" },
      { purposeKey: "filter.competition", from: 55, to: 57, note: "10.10 小玺稿：把校内经历拆成比赛证书，强调校级奖出校没人认，要参加国家级比赛才站在同一平台。" },
      { purposeKey: "filter.certificates", from: 58, to: 59, note: "10.10 小玺稿：确认学校可考四级后，直接排出大一上考四级、大一下考六级的时间。" },
      { purposeKey: "filter.competition.types", from: 60, to: 63, note: "10.10 小玺稿：介绍大英赛是笔试、题量比四级大，外研社是演讲、难度高但简历含金量高，建议先试大英赛。" },
      { purposeKey: "filter.timeline", from: 66, to: 69, note: "10.10 小玺稿：从大四上秋招讲起，说明秋招打时间差、春招要和考研考公失利的人抢，倒推大一大二大三要提前准备。" },
      { purposeKey: "filter.internship", from: 70, to: 74, note: "10.10 小玺稿：对比校内经历，强调校外实习直接给企业创造价值；第一份实习最难，可通过智联或老师公司先拿到实习证明。" },
      { purposeKey: "filter.english", from: 75, to: 78, note: "10.10 小玺稿：把能力拆成英语口语、表达沟通、快速学习三项，并说明她当下最该优先英语，因为能短期拿到结果。" },
      { purposeKey: "offer.three-needs", from: 91, to: 97, note: "10.10 小玺稿：用魏老师课程解释学英语有效的三点：科学方法、适合当下水平的针对性课程、老师纠音与阶段测评反馈。" },
      { purposeKey: "offer.ask-plan", from: 98, to: 99, note: "10.10 小玺稿：问她是否愿意用这套方法学，她回答“行”，咨询师确认她愿意试。" },
      { purposeKey: "offer.self-study", from: 100, to: 101, note: "10.10 小玺稿：说明自学没人测评、没人纠音、不知道学什么；她直接说自己一个人搞不下来。" },
      { purposeKey: "offer.close.price", from: 103, to: 103, note: "10.10 小玺稿：她嫌学费贵，咨询师建议千万别一次性付，讲自己分四期、首期九百多、之后每月一千。" },
      { purposeKey: "offer.close.risk-reversal", from: 104, to: 115, note: "10.10 小玺稿：讲交不上可延缓或暂停课程、课程为大学生设计、先学一个月看效果、七天试课、签合同盖章保障权益。" },
      { purposeKey: "filter.tutor", from: 117, to: 126, note: "10.10 小玺稿：现场帮她在新乡/安阳搜线上线下发音家教，教她在小红书评论区留言、定价50—60一小时，先靠家教有收入。" },
      { purposeKey: "offer.handoff", from: 127, to: 134, note: "10.10 小玺稿：介绍课程是精品视频课，每天三四十分钟、每周五节，配班主任和成长私教两位老师，分别管计划和状态。" },
      { purposeKey: "offer.close.enroll", from: 136, to: 137, note: "10.10 小玺稿：她决定踏出第一步，咨询师叮嘱找老师问分期、先付一部分，不用一次交全。" },
      { purposeKey: "offer.close.followup", from: 141, to: 146, note: "10.10 小玺稿：收尾嘱咐她去吃饭，答应帮找新乡兼职，并转给她一场认知分享直播，约定明天再联系。" }
    ]
  },
  {
    id: "dz02",
    label: "10.10 小目咨询稿",
    file: "zxg/dz_zxg/10.10+宋佳琦+26063099+小目+大一+经济问题.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 5, note: "10.10 小目稿：从学校桂花、南充与温州的地域差异开场，确认通话环境和对方所在位置，先把节奏放慢。" },
      { purposeKey: "open.questionnaire", from: 6, to: 6, note: "10.10 小目稿：复述问卷里“学校氛围不好、很想成长”的原话，并确认家里没人给她讲过规划，让她知道问卷被认真看过。" },
      { purposeKey: "trust.self-disclosure", from: 7, to: 10, note: "10.10 小目稿：讲自己父母是农民或务工、暑假进厂打工的经历，和她的普通家庭背景对齐，建立“我懂你”的相似性。" },
      { purposeKey: "scan.family-burden", from: 10, to: 13, note: "10.10 小目稿：顺着她说的暑假工，算厂里两三千、没有盼头，再点出父母没有经济托底、弟弟还在读书，先把家庭负担问清楚。" },
      { purposeKey: "scan.parents", from: 22, to: 24, note: "10.10 小目稿：直接问她父母属于“支持型”还是“父母想法居多”，确认家里只要她有想法就会支持，为后面父母沟通铺路。" },
      { purposeKey: "trust.self-disclosure", from: 26, to: 28, note: "10.10 小目稿：讲自己弟弟今年大一、大二开始经济独立并给弟弟打生活费，用同样的兄弟姐妹处境拉近距离。" },
      { purposeKey: "filter.tutor", from: 31, to: 34, note: "10.10 小目稿：把“学英语”接到弟弟身上，说寒假回家可以教弟弟，既练英语又能帮家里，给出一个具体可执行的用途。" },
      { purposeKey: "window.english-leverage", from: 34, to: 38, note: "10.10 小目稿：用发音—单词—语法顺序、上海同学一小时1000元外教、英语好的人发展没有上限，说明英语是可迁移的核心能力。" },
      { purposeKey: "diag.ai", from: 38, to: 38, note: "10.10 小目稿：用AI减少人力、专业红利会过去，说明铁饭碗不是岗位而是能力，先把“学英语”放到抗变化的位置。" },
      { purposeKey: "filter.track", from: 39, to: 51, note: "10.10 小目稿：逐条拆三支一扶、西部计划工资低，专升本成功率低且再花两年钱，最后落到“直接就业”这条路径。" },
      { purposeKey: "scan.family-burden", from: 42, to: 44, note: "10.10 小目稿：讲普通家庭孩子要先经济独立，做公益也要先顾好小家，解释她为什么不能把三支一扶当出路。" },
      { purposeKey: "window.442", from: 52, to: 56, note: "10.10 小目稿：让她记企业看人的三块——学历20%、经历40%、能力40%，并用四六级高分证明经历就是能力的体现。" },
      { purposeKey: "filter.timeline", from: 68, to: 71, note: "10.10 小目稿：按“大三上秋招”倒推，指出她只剩两年积累证书和实习，制造时间感但不夸大。" },
      { purposeKey: "filter.internship", from: 72, to: 76, note: "10.10 小目稿：区分校园经历（比赛证书）和社会经历（实习），说明实习含金量更高、大一寒暑假就可以去。" },
      { purposeKey: "trust.result", from: 77, to: 81, note: "10.10 小目稿：用自己的英语实习经历和专科朋友进岚图汽车、应届1万+的案例，证明英语能直接换实习和薪资。" },
      { purposeKey: "filter.competition", from: 82, to: 90, note: "10.10 小目稿：给出大一打个人赛（四六级、外研社）、大二打团队赛（互联网+、创新创业）的节奏，并说明英语是组队和读文献的敲门砖。" },
      { purposeKey: "filter.certificates", from: 85, to: 86, note: "10.10 小目稿：针对导员发的普通话考试，明确“不当老师就不用考”，把证书选择拉回专业和就业需要。" },
      { purposeKey: "window.competition-pool", from: 93, to: 96, note: "10.10 小目稿：用“3万的工作比3千的工作好找”解释竞争池，说明能力越强反而竞争的人越少。" },
      { purposeKey: "offer.three-needs", from: 100, to: 105, note: "10.10 小目稿：把英语学习拆成发音—单词—语法、入学测评、真人纠音反馈三件事，对应后面课程的三项服务。" },
      { purposeKey: "trust.result", from: 107, to: 118, note: "10.10 小目稿：用高考50多分的专科朋友学六七个月能自由交流、四六级550+的案例，回应她对“多久见效”的怀疑。" },
      { purposeKey: "offer.trust", from: 119, to: 119, note: "10.10 小目稿：说明老师按半小时私教人数招生、二对一、带完一批再招下一批，用稀缺和用心建立可信度。" },
      { purposeKey: "offer.confirm-need", from: 120, to: 122, note: "10.10 小目稿：让她给自己“想跟老师学”的意愿打分，她打8分，顺势问出剩下2分卡在经济上。" },
      { purposeKey: "diag.money", from: 121, to: 123, note: "10.10 小目稿：确认她的顾虑就是资金，追问有没有跟家里提过分期，把问题从“想不想”转到“怎么付”。" },
      { purposeKey: "offer.close.price", from: 124, to: 125, note: "10.10 小目稿：讲自己分期四个月、首月九百多后每月一千，说明总价差不多，先降低她对分期的陌生感。" },
      { purposeKey: "offer.close.parents", from: 126, to: 129, note: "10.10 小目稿：确认父母其实也想让她学、也放心她做选择，把“家里没钱”改写成“只差沟通分期”。" },
      { purposeKey: "offer.close.self-fund", from: 130, to: 138, note: "10.10 小目稿：讲自己首月靠自筹、家里、朋友凑，后面靠家教还，给她一条不全靠父母的资金路径。" },
      { purposeKey: "filter.tutor", from: 134, to: 138, note: "10.10 小目稿：算家教账——一小时60、周末4小时近1000，刚好覆盖生活费，说明英语一个月后就能变现。" },
      { purposeKey: "offer.handoff", from: 147, to: 156, note: "10.10 小目稿：回答老师严不严、口语差会不会被评判、测评难不难，并说明入学测评后会配长周期学习计划。" },
      { purposeKey: "offer.close.enroll", from: 171, to: 172, note: "10.10 小目稿：把下一步说死——今天就跟父母说、聊完问助教分期、尽早报名做测评。" },
      { purposeKey: "offer.close.followup", from: 176, to: 177, note: "10.10 小目稿：收尾约定先看专科生外企CEO视频、问助教分期，后续微信随时联系。" }
    ]
  },
  {
    id: "dz03",
    label: "10.10 小雪咨询稿",
    file: "zxg/dz_zxg/10.10+马术菊+260301081++小雪+大一+已成交_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 2, note: "10.10 小雪稿：先夸声音有力量、适合法官，确认她想进法院/检察院，再问上大学感受。" },
      { purposeKey: "open.agenda", from: 4, to: 5, note: "10.10 小雪稿：回应她列的五个问题，说明今天先讲困惑、做规划是为了省时间少走弯路。" },
      { purposeKey: "window.final-goal", from: 5, to: 5, note: "10.10 小雪稿：提出“以终为始”，把大学四年的终点定为就业，再倒推升学/考研。" },
      { purposeKey: "diag.postgrad.timeline", from: 6, to: 13, note: "10.10 小雪稿：讲大四12月初试、次年3-4月复试，大三要系统复习，法考大三6月报名、9-10月考试，建议大二下再决定法考。" },
      { purposeKey: "trust.self-disclosure", from: 14, to: 14, note: "10.10 小雪稿：说自己和她一样有野心，支持她过丰富多彩的大学生活，用相似性拉近距离。" },
      { purposeKey: "diag.postgrad", from: 17, to: 19, note: "10.10 小雪稿：用法学大类细分方向说明读研是深耕一个领域，建议先了解学校是否分流、再选考研方向。" },
      { purposeKey: "filter.gpa", from: 20, to: 23, note: "10.10 小雪稿：建议大一把绩点搞好拿奖学金，拆解平时分40%+卷面60%，教她怎么算绩点、怎么保及格。" },
      { purposeKey: "filter.gpa", from: 24, to: 28, note: "10.10 小雪稿：抢课优先选老师要求低、好过的课，用QQ群匿名打听；选课尽量跟专业相关或选水课。" },
      { purposeKey: "filter.one-ability", from: 29, to: 30, note: "10.10 小雪稿：说每个阶段要有侧重点，大一每天花1-1.5小时学英语，把水课时间利用起来。" },
      { purposeKey: "filter.competition", from: 31, to: 31, note: "10.10 小雪稿：推荐大英赛，含金量高、对考研有帮助，还能锻炼和认识优秀的人。" },
      { purposeKey: "filter.competition", from: 32, to: 36, note: "10.10 小雪稿：她想参加模拟法庭/辩论社，顾问建议大一先关注辩论赛、看比赛学临场发挥和预判。" },
      { purposeKey: "filter.timeline", from: 37, to: 37, note: "10.10 小雪稿：大一拿来打基础，练口语、英语、沟通表达和辩论思维；大二大三专业课难度上来。" },
      { purposeKey: "diag.major.reality", from: 61, to: 62, note: "10.10 小雪稿：回应她对法学就业的担心，说学好仍能进四大、八大、红圈所，给她本专业的现实出口。" },
      { purposeKey: "scan.volunteer", from: 71, to: 73, note: "10.10 小雪稿：她这学期转到法学/卓越班，顾问说既然来了就好好学，大一大二打牢专业，大二再参加专业比赛。" },
      { purposeKey: "diag.english.qualification", from: 74, to: 76, note: "10.10 小雪稿：学校只允许23/25级报四级，她大一下才能考；顾问说读研再考雅思，对涉外/红圈所有加分。" },
      { purposeKey: "filter.internship", from: 77, to: 80, note: "10.10 小雪稿：建议大二寒暑假去检察院等单位实习，学校法律援助/假期实践活动也可以争取。" },
      { purposeKey: "filter.timeline", from: 87, to: 90, note: "10.10 小雪稿：总结大一大二抓英语和专业课、参加专业比赛，大三系统准备考研，法考可大二下提前准备。" },
      { purposeKey: "diag.english.speed", from: 98, to: 98, note: "10.10 小雪稿：强调前两个月是打基础关键期，先把音标发音搞清，后面单词、听力、写作、翻译都会更快。" },
      { purposeKey: "offer.need.path", from: 98, to: 99, note: "10.10 小雪稿：把打基础落到具体顺序：课下练口语和音标，周末听老师直播复习延伸。" },
      { purposeKey: "diag.environment", from: 99, to: 106, note: "10.10 小雪稿：一起找练口语的场地：朗读亭、楼梯间、早到教室、晚自习后、食堂、操场，给可执行的环境解法。" },
      { purposeKey: "window.english-leverage", from: 117, to: 122, note: "10.10 小雪稿：用外企、陪外国人聊天、涉外法律缺口说明“专业+英语”能放大优势，英语还能带来实习和收入。" },
      { purposeKey: "filter.tutor", from: 121, to: 122, note: "10.10 小雪稿：她说英语学好后寒暑假可以当家教，顾问肯定这条变现路径，让她先提升自己。" },
      { purposeKey: "window.experience-first", from: 122, to: 126, note: "10.10 小雪稿：兼职要选能提升自己、对学业有帮助的，收银/端盘子重复劳动没含金量。" },
      { purposeKey: "scan.campus", from: 126, to: 128, note: "10.10 小雪稿：聊晚自习纯自习、手机不收，顾问建议用线上自习室/腾讯会议，借氛围保持动力。" },
      { purposeKey: "diag.ai", from: 130, to: 133, note: "10.10 小雪稿：从银行机器人客服的体验聊到AI替代不了人，结论是先把语言学好、成为不可替代的人。" },
      { purposeKey: "offer.close.followup", from: 134, to: 134, note: "10.10 小雪稿：收尾让她有英语问题多问两个辅导老师，抓住去杭州实习/涨见识的机会。" }
    ]
  },
  {
    id: "dz04",
    label: "10.10 袁清裴咨询稿",
    file: "zxg/dz_zxg/10.10叶启航26041022袁清裴+内耗型选手，担心报课之后学习会引来身边人的评价，容易内耗_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 5, note: "10.10 袁清裴稿：确认她在宿舍阳台、旁边食堂有点吵、戴着耳机但能听清，确认现在方便说话。" },
      { purposeKey: "open.questionnaire", from: 10, to: 10, note: "10.10 袁清裴稿：直接说从她之前填的问卷入手，先了解她当下的状态和已填信息，让后面的分享更有针对性，同时说明她也是规划主角。" },
      { purposeKey: "scan.campus", from: 10, to: 12, note: "10.10 袁清裴稿：问学校氛围，她说宿舍不勾心斗角、大家学习积极；又问她为什么觉得身边厉害的人多。" },
      { purposeKey: "filter.certificates", from: 15, to: 16, note: "10.10 袁清裴稿：问技能大赛培训和维修执照，确认执照考试分大三上、大三下两批，要先跟老师混脸熟争取推荐资格。" },
      { purposeKey: "diag.english", from: 16, to: 17, note: "10.10 袁清裴稿：锁定她最大卡点是英语，机务岗位每天要看原厂英文手册，英语不好处处受限。" },
      { purposeKey: "diag.major.reality", from: 19, to: 24, note: "10.10 袁清裴稿：讲清老师推荐看综测排名和英语，英文手册直接关系民航安全，老师推荐是拿自己的职业口碑做担保。" },
      { purposeKey: "diag.english", from: 31, to: 37, note: "10.10 袁清裴稿：专业课多再加英语卡壳会喘不过气；维修英语不过要等六个月补考，直接错过当年校招，前面的实训积累白费。" },
      { purposeKey: "scan.score", from: 37, to: 38, note: "10.10 袁清裴稿：问她高考英语，她说自己是单招没高考，咨询师据此判断英语基础比较薄弱。" },
      { purposeKey: "diag.motivation", from: 43, to: 44, note: "10.10 袁清裴稿：她复盘自己没兴趣、记不住、觉得自己太笨；咨询师先接住自我否定，没有直接归因于她个人。" },
      { purposeKey: "diag.english.method", from: 45, to: 49, note: "10.10 袁清裴稿：咨询师自曝也报过班，只针对错题讲、没建立音标系统，指出一直在做无效努力，不是她笨而是方法不对。" },
      { purposeKey: "scan.existing-course", from: 54, to: 61, note: "10.10 袁清裴稿：她说自己刷抖音短视频学英语、模仿身边考过四级的室友，但没了解对方每天怎么落地、刷到什么程度。" },
      { purposeKey: "diag.english.method", from: 62, to: 69, note: "10.10 袁清裴稿：刷短视频很久效果不明显、换个题型就不会；咨询师用“未完成的课题会反复出现”指出她一直在换方法打转。" },
      { purposeKey: "diag.motivation", from: 70, to: 73, note: "10.10 袁清裴稿：英语差导致她走单招，咨询师指出最可怕的不是没行动，而是行动后原地打转、慢慢削弱自信。" },
      { purposeKey: "offer.pitfall.feedback", from: 74, to: 78, note: "10.10 袁清裴稿：抖音跟读发音不准没人纠正，她自己都觉得嘴型怪却不知道哪怪；一个音读错会引发单词、听力一连串问题。" },
      { purposeKey: "offer.need.path", from: 79, to: 81, note: "10.10 袁清裴稿：讲英语分很多 level，要先确认自己在哪一层；发音是地基，音标学好后单词、听力都会顺。" },
      { purposeKey: "offer.three-needs", from: 89, to: 94, note: "10.10 袁清裴稿：问她最缺什么，归纳出缺体系化路径、针对性计划和及时纠正反馈，并给出科学方法、针对性方案、及时反馈三个因素。" },
      { purposeKey: "offer.close.hesitation", from: 96, to: 97, note: "10.10 袁清裴稿：让她给“跟老师学”的意愿打分，她打3分；咨询师追问剩下7分差在哪、在犹豫什么。" },
      { purposeKey: "diag.parents", from: 97, to: 98, note: "10.10 袁清裴稿：她说还没跟父母讲报课这件事，这是她犹豫的第一层原因。" },
      { purposeKey: "trust.self-disclosure", from: 101, to: 110, note: "10.10 袁清裴稿：咨询师自曝也是内耗型、在意别人眼光，讲自己民办二本每年3万学费、换过寝室、室友摆烂的经历。" },
      { purposeKey: "trust.result", from: 111, to: 114, note: "10.10 袁清裴稿：讲自己忙起来就没空内耗，四级603、六级587、拿奖学金、靠家教经济独立，用结果证明注意力该放哪。" },
      { purposeKey: "diag.environment", from: 115, to: 123, note: "10.10 袁清裴稿：用恋爱脑比喻她把重心放在室友身上，指出别人评价是别人的课题，就业选择才跟自己很多年，逃避会让课题反复出现。" },
      { purposeKey: "offer.handoff", from: 125, to: 128, note: "10.10 袁清裴稿：介绍跟老师学不只是英语，还有英语助教做一对一成长规划、成长私教处理情绪和时间管理。" },
      { purposeKey: "offer.trust", from: 129, to: 135, note: "10.10 袁清裴稿：现场演示ABC转念法，说明成长私教能帮她做情绪转念，从两三天内耗三四次训练到十分钟翻篇。" },
      { purposeKey: "offer.confirm-need", from: 136, to: 138, note: "10.10 袁清裴稿：她总结自己不该太在意别人眼光、要尽早为出路做规划；咨询师接住说一个人摸索容易内耗，需要有人拉出来，她明确说想跟老师学。" },
      { purposeKey: "offer.close.parents", from: 140, to: 141, note: "10.10 袁清裴稿：问她跟老师学是打算跟父母沟通还是自己解决，需不需要建议，切入父母沟通话题。" },
      { purposeKey: "offer.close.price", from: 141, to: 142, note: "10.10 袁清裴稿：她说听直播时看到价格不到4000，觉得能帮到自己很划算；咨询师确认四千多。" },
      { purposeKey: "offer.close.self-fund", from: 143, to: 147, note: "10.10 袁清裴稿：她想不跟父母商量、自己分期；咨询师问首期九百多能否承担，她说小金库够、生活质量不受影响。" },
      { purposeKey: "filter.tutor", from: 147, to: 151, note: "10.10 袁清裴稿：讲学一个月发音后就能做线上家教，一小时五六十，经济独立是女生最大的底气，还能反哺家庭。" },
      { purposeKey: "offer.close.enroll", from: 152, to: 153, note: "10.10 袁清裴稿：让她先去问分期具体情况，报上后第一时间告诉她，之后就是她的小师妹。" },
      { purposeKey: "offer.close.followup", from: 154, to: 156, note: "10.10 袁清裴稿：收尾让她去吃饭，提醒晚上还有直播课去听，鼓励她这一步会成为人生转折点。" }
    ]
  },
  {
    id: "dz05",
    label: "10.10 文慧咨询稿",
    file: "zxg/dz_zxg/10.10周惠怡+拔高意愿很亮点+大一+文慧++医学信息工程+考研_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 7, note: "10.10 文慧稿：从午休、声音像感冒、云南到甘肃的气候聊起，确认她的状态和环境适应。" },
      { purposeKey: "trust.permission", from: 8, to: 8, note: "10.10 文慧稿：先问她有没有准备笔纸，确认后肯定她的准备意识。" },
      { purposeKey: "open.agenda", from: 9, to: 11, note: "10.10 文慧稿：先问她有没有想问的问题，再说明今天以“以终为始”讲大学规划。" },
      { purposeKey: "window.final-goal", from: 11, to: 12, note: "10.10 文慧稿：用高中目标作类比，提出大学要先想清终点，再倒推当下行动。" },
      { purposeKey: "scan.volunteer", from: 14, to: 16, note: "10.10 文慧稿：问到长远是否从事本专业，她说可能不会；顾问点出专业是被调剂、还在适应。" },
      { purposeKey: "diag.major.reality", from: 19, to: 22, note: "10.10 文慧稿：她回云南想进三甲医院，顾问讲医院分层和三甲对硕士学历的硬要求。" },
      { purposeKey: "diag.postgrad", from: 23, to: 26, note: "10.10 文慧稿：问她想不想考研，指出考研是进三甲的门槛，不考连竞争机会都没有。" },
      { purposeKey: "diag.postgrad.pool", from: 26, to: 26, note: "10.10 文慧稿：用“本科生不带本科生玩、硕士跟硕士比”说明考研是在换竞争池。" },
      { purposeKey: "diag.money", from: 27, to: 34, note: "10.10 文慧稿：她担心读研两三年经济和家里压力，顾问问助学贷款、算普通家庭学医的投入回报。" },
      { purposeKey: "diag.major.switch", from: 35, to: 36, note: "10.10 文慧稿：问有没有转专业想法，她说不太了解也不确定要不要转。" },
      { purposeKey: "window.english-leverage", from: 61, to: 61, note: "10.10 文慧稿：医疗外企/双语文档岗位要全英文沟通，英语好薪资能高出约30%。" },
      { purposeKey: "diag.motivation", from: 71, to: 72, note: "10.10 文慧稿：考研坚定度从6分到8分，顾问说“足够想要才会足够得到”，先有意愿再谈方法。" },
      { purposeKey: "diag.postgrad", from: 87, to: 95, note: "10.10 文慧稿：讲考研考什么，区分学硕/专硕，方向大三再定，政治英语专业课必考。" },
      { purposeKey: "window.competition-pool", from: 96, to: 104, note: "10.10 文慧稿：用400多万报考、约15%上岸率和三类竞争对手（985考211/211考211/普本最优）讲竞争池。" },
      { purposeKey: "scan.score", from: 109, to: 109, note: "10.10 文慧稿：引用问卷里她说英语100分是优势，指出放到考研不算什么。" },
      { purposeKey: "diag.postgrad.timeline", from: 111, to: 114, note: "10.10 文慧稿：讲初试三条线：国家线、院校线、单科线，英语单科线最容易卡人。" },
      { purposeKey: "diag.postgrad.strategy", from: 115, to: 122, note: "10.10 文慧稿：分析大一不必背政治（会忘、时政更新），专业课拉不开差距，英语才是能拉开的“侧”。" },
      { purposeKey: "filter.timeline", from: 123, to: 134, note: "10.10 文慧稿：按复试板块倒推：表达/英语大一大二，科研竞赛实习大二，大三整合专业课+实习，大四考场。" },
      { purposeKey: "diag.english", from: 136, to: 142, note: "10.10 文慧稿：否定刷题背单词的方式，把卡点拆成词汇、口语、翻译，词汇缺高效方法和猜词。" },
      { purposeKey: "diag.english.method", from: 143, to: 149, note: "10.10 文慧稿：从“不会表达”追到“不敢说”再到“发音没系统学”，指出缺纠正反馈。" },
      { purposeKey: "diag.english.speed", from: 147, to: 151, note: "10.10 文慧稿：把发音定为地基，基础不牢后面地动山摇，当下先集中攻英语。" },
      { purposeKey: "offer.ask-plan", from: 152, to: 153, note: "10.10 文慧稿：问她发音打算怎么学，她说自学看视频或报班，顾问让她比较哪种更高效。" },
      { purposeKey: "offer.self-study", from: 154, to: 157, note: "10.10 文慧稿：说自学最大弊端是自己给自己当老师，系统学要报班找好老师好方法。" },
      { purposeKey: "trust.self-disclosure", from: 166, to: 167, note: "10.10 文慧稿：讲自己准大一家里负债、借父母钱报名，后来靠英语家教和翻译还学费。" },
      { purposeKey: "trust.result", from: 167, to: 167, note: "10.10 文慧稿：用自己现在靠英语实现经济独立的结果，证明这条路走得通。" },
      { purposeKey: "offer.close.price", from: 167, to: 170, note: "10.10 文慧稿：报出3680，和考研班上万对比性价比，再换算成未来月薪过万。" },
      { purposeKey: "offer.close.self-fund", from: 170, to: 176, note: "10.10 文慧稿：全款难就分期，第一期980，生活费出一点、父母支持一点。" },
      { purposeKey: "offer.close.parents", from: 177, to: 186, note: "10.10 文慧稿：预演父母态度，判断他们不会反对学习，但可能担心网课效果。" },
      { purposeKey: "offer.trust", from: 187, to: 189, note: "10.10 文慧稿：教她用官方号学员案例、助教提供的公司材料向父母证明，别空口无凭。" },
      { purposeKey: "offer.close.enroll", from: 190, to: 192, note: "10.10 文慧稿：落地下一步：问助教分期、做基础测评、要学员案例。" }
    ]
  },
  {
    id: "dz06",
    label: "10.10 钧钧咨询稿",
    file: "zxg/dz_zxg/10.10周良霖260301081钧钧+升本手上有400跟家里商量有信心_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 8, note: "10.10 钧钧稿：确认她刚睡醒、在宿舍三楼站着，调耳机确认声音，先聊老乡和约了很久。" },
      { purposeKey: "scan.volunteer", from: 10, to: 12, note: "10.10 钧钧稿：问大学目标，她说想从健康管理转到康复，因为当初报康复没录上被调剂。" },
      { purposeKey: "diag.major.switch", from: 13, to: 16, note: "10.10 钧钧稿：追问转专业条件：成绩要专业前五/前十、明年3月考试、只招8人、无面试。" },
      { purposeKey: "scan.worries", from: 17, to: 19, note: "10.10 钧钧稿：问她转不成怎么办，她说两手准备升本；目标还有过四六级和考专业证书。" },
      { purposeKey: "scan.parents", from: 20, to: 23, note: "10.10 钧钧稿：问家里对她规划的态度，基本放养，只希望她学历高一点、升本成功。" },
      { purposeKey: "scan.family-burden", from: 24, to: 27, note: "10.10 钧钧稿：问升本学费生活费，家里条件一般、民办读不起、妈妈只允许公办；家里两个孩子，弟弟高一。" },
      { purposeKey: "open.questionnaire", from: 33, to: 34, note: "10.10 钧钧稿：复述问卷里“拿证书、升本、不被讨厌、大方勇敢自信”的目标，再拆成几个方向。" },
      { purposeKey: "trust.permission", from: 34, to: 38, note: "10.10 钧钧稿：让她拿纸笔记“以终为始”，确认耳机和纸笔准备好了再往下讲。" },
      { purposeKey: "window.final-goal", from: 39, to: 41, note: "10.10 钧钧稿：解释以终为始，把终点定为就业/好工作，再按好工作的要求倒推大学行动。" },
      { purposeKey: "diag.major.reality", from: 42, to: 49, note: "10.10 钧钧稿：盘健康管理五个就业方向：体检中心3500-5000、医院体检科、保险底薪两三千、健身房/月子中心约6000、医药代表。" },
      { purposeKey: "window.442", from: 53, to: 61, note: "10.10 钧钧稿：用学历/经历/能力占比做连线题（此处口径是433：30/30/40），说明能力最重要、学历只是门槛。" },
      { purposeKey: "window.competition-pool", from: 62, to: 68, note: "10.10 钧钧稿：讲广东专升本报考15-16万、总录取40-50%、公办仅15-20%，并列举公办院校。" },
      { purposeKey: "diag.english", from: 69, to: 74, note: "10.10 钧钧稿：问升本哪科最拉分，落到英语；同学英语两极分化，30-60分和80-90分差出几十分。" },
      { purposeKey: "filter.competition", from: 76, to: 81, note: "10.10 钧钧稿：校内经历先看高含金量比赛，大二冲专业竞赛，大一大英赛等按时间轴准备。" },
      { purposeKey: "filter.certificates", from: 82, to: 86, note: "10.10 钧钧稿：讲考级考证（计算机二级、四六级），追问为什么四六级对就业重要。" },
      { purposeKey: "window.english-leverage", from: 86, to: 97, note: "10.10 钧钧稿：用外国人增多、简历机器筛选（学历/四六级/证书）和优先推荐，说明四六级是通用筛选标准。" },
      { purposeKey: "filter.internship", from: 99, to: 109, note: "10.10 钧钧稿：校外经历重点是实习，别等大三学校安排，大一大二寒暑假至少拿1-2段优质实习。" },
      { purposeKey: "window.english-leverage", from: 110, to: 117, note: "10.10 钧钧稿：讲杠杆思维，把英语和语言沟通表达（中英双语）定为能带动其他目标的能力杠杆。" },
      { purposeKey: "diag.english.speed", from: 118, to: 123, note: "10.10 钧钧稿：指出背单词十几年没效果，学语言要从发音开始，用小时候学拼音作类比。" },
      { purposeKey: "diag.english.method", from: 123, to: 128, note: "10.10 钧钧稿：听音频看音标自己练，没人纠口型舌位，越学越偏也不知道。" },
      { purposeKey: "offer.find-teacher", from: 129, to: 135, note: "10.10 钧钧稿：问她有没有找老师带，她说之前想跟微微老师学但卡在钱；顾问追问她想学的原因。" },
      { purposeKey: "filter.tutor", from: 136, to: 144, note: "10.10 钧钧稿：算口语家教账：时薪50、寒暑假月入过万、广交会400/天；口语家教更看能力不看学历。" },
      { purposeKey: "offer.compare", from: 145, to: 148, note: "10.10 钧钧稿：讲升本英语专项课/选修库，对比外面8000-上万的升本班，能省下大几千。" },
      { purposeKey: "offer.close.price", from: 149, to: 152, note: "10.10 钧钧稿：确认价格3980/3900，按4期算每月八九百，降低经济压力。" },
      { purposeKey: "offer.close.self-fund", from: 153, to: 163, note: "10.10 钧钧稿：她月生活费1500，顾问算第一个月几百，自己掏三四百、家里补剩下的。" },
      { purposeKey: "offer.close.parents", from: 156, to: 160, note: "10.10 钧钧稿：妈妈怕被骗、不信网课效果；顾问示范君子协议/欠条+学习结果证明。" },
      { purposeKey: "offer.close.risk-reversal", from: 164, to: 164, note: "10.10 钧钧稿：讲学员协议和7天内无进步全额退，降低决策风险。" },
      { purposeKey: "offer.confirm-need", from: 168, to: 172, note: "10.10 钧钧稿：点出专科学习氛围差，需要专业老师按课表/基础定制计划兜底。" },
      { purposeKey: "offer.close.enroll", from: 184, to: 187, note: "10.10 钧钧稿：让她找助教老师问分期、名额和证明材料，并给出跟老师沟通的话术。" },
      { purposeKey: "offer.close.followup", from: 188, to: 188, note: "10.10 钧钧稿：约定这两天整理笔记发微信，顾问帮她查漏补缺。" }
    ]
  },
  {
    id: "dz07",
    label: "10.10 一一咨询稿",
    file: "zxg/dz_zxg/10.10尹蓥260301042大一一一_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 4, note: "10.10 一一稿：用吃饭、午休、周末补课等轻松话题确认她在宿舍、刚睡醒的状态，先让对话落地再进正题。" },
      { purposeKey: "open.questionnaire", from: 5, to: 6, note: "10.10 一一稿：复述问卷“写得超级认真”，点出她纠结的考研、转专业和大一课多没精力，说明自己认真看过问卷。" },
      { purposeKey: "scan.volunteer", from: 9, to: 10, note: "10.10 一一稿：追问计算机是不是调剂、为什么想转，学生说本校计算机只有B级、电气是A级且更好就业，澄清她其实不排斥本专业。" },
      { purposeKey: "diag.major", from: 11, to: 12, note: "10.10 一一稿：区分她排斥的是专业本身还是师资资源，确认她喜欢计算机、只是担心院系资源影响发展，再把计算机考研进大厂的路摆出来。" },
      { purposeKey: "diag.postgrad", from: 13, to: 15, note: "10.10 一一稿：确认她转专业成功后仍会考研，把转专业定位成备选项、考研作为大学重心，说明理工科学历和考研的收益。" },
      { purposeKey: "diag.major.switch", from: 16, to: 24, note: "10.10 一一稿：问清转专业政策（专业前3%、只有面试），拆解5到7位老师面试、面试替代笔试，建议期末冲85分以上且绝不能挂科。" },
      { purposeKey: "diag.major.second-card", from: 25, to: 31, note: "10.10 一一稿：指出大家专业课水平接近、拉不开差距，四六级是转专业面试的差异化突破口，并说明计算机和电气都对英语要求高，建议四级冲高分、六级通过。" },
      { purposeKey: "filter.gpa", from: 32, to: 42, note: "10.10 一一稿：应学生要求讲清绩点、综测、学分：绩点看期末成绩、综测用于评奖学金、学分与毕业挂钩，并提到大三大四的水课。" },
      { purposeKey: "scan.parents", from: 44, to: 44, note: "10.10 一一稿：问她家里是否支持去北京读研、能否承担北京消费，学生说可以且姑姑姑父在北京能帮扶。" },
      { purposeKey: "diag.postgrad", from: 45, to: 47, note: "10.10 一一稿：确认她优先保研、保不上再考，提醒转专业对保研不占优势，但保研和考研准备相通，大一大二可以一起铺垫。" },
      { purposeKey: "diag.postgrad.timeline", from: 49, to: 57, note: "10.10 一一稿：讲保研到北京985的压力，介绍大三下拿简历参加夏令营、表现好可免统考、否则只能捡漏，强调简历加面试是第一关。" },
      { purposeKey: "filter.gpa", from: 58, to: 62, note: "10.10 一一稿：借“简历写什么”讲保研绩点门槛：看五个学期成绩、需在专业前15%，期末往八九十分冲。" },
      { purposeKey: "filter.english", from: 63, to: 75, note: "10.10 一一稿：讲985保研看四六级分数（四级580+、六级550+）、全英文面试和现场翻译论文，建议大一每月读译一篇专业论文，口语和四六级同步练。" },
      { purposeKey: "filter.competition", from: 76, to: 90, note: "10.10 一一稿：把竞赛分为专业类和通用类，大一主攻英语竞赛、专业竞赛留到大二；介绍外研社国才杯和大英赛的含金量，并发竞赛时间表图片。" },
      { purposeKey: "filter.internship", from: 91, to: 95, note: "10.10 一一稿：推荐广交会志愿者，强调它有口语门槛、含金量高、有1800元奖金，建议大一大二抓住这类能写进简历的经历。" },
      { purposeKey: "filter.lab", from: 96, to: 108, note: "10.10 一一稿：讲科研经历：大二大三进导师实验室打下手、读英文文献、翻译汇报，导师主要看绩点和四六级；发招聘标准截图佐证英语门槛。" },
      { purposeKey: "filter.timeline", from: 109, to: 112, note: "10.10 一一稿：带她梳理大一侧重专业课加四六级、大二参加竞赛，强调大一大二准备充分，大三才能轻松等夏令营。" },
      { purposeKey: "window.competition-pool", from: 113, to: 117, note: "10.10 一一稿：用和985竞争对手比较说明专业课难拉差距，英语是唯一能靠自己赢的竞争力；把211身份讲成“反差感”加分项。" },
      { purposeKey: "window.english-leverage", from: 114, to: 117, note: "10.10 一一稿：说大学英语课只讲课本，四六级和口语是额外投入就能拉开差距的地方，保研面试发音流利会让老师记住。" },
      { purposeKey: "offer.ask-plan", from: 118, to: 122, note: "10.10 一一稿：先问她打算怎么学，学生说想先练口语但不会方法；咨询师提到直播讲的“发音到听说读写”顺序，让她补第一天回放。" },
      { purposeKey: "diag.english.method", from: 123, to: 128, note: "10.10 一一稿：用外国人学中文先学拼音类比，解释听力听不出是因为没系统学发音、连读略读规则，不是她能力不行。" },
      { purposeKey: "offer.need.plan", from: 129, to: 131, note: "10.10 一一稿：强调每个人基础和薄弱点不同，需要先测评再制定“今天学什么、明天学什么”的落地计划。" },
      { purposeKey: "diag.money", from: 133, to: 135, note: "10.10 一一稿：学生说怕给家里增加负担，咨询师接住“懂事、不想花家里钱”的情绪，再顺势转到自己的经历。" },
      { purposeKey: "trust.self-disclosure", from: 136, to: 143, note: "10.10 一一稿：讲自己农村家庭、父母辛苦、当年也想放弃，用“不学压力也一直在，学了才有减轻负担的能力”重新框定花钱这件事。" },
      { purposeKey: "offer.close.self-fund", from: 147, to: 151, note: "10.10 一一稿：问分期方案，介绍可分2到4个月、自己选4个月首期980，确认学生每月压力可以接受。" },
      { purposeKey: "filter.tutor", from: 152, to: 155, note: "10.10 一一稿：算家教账：学一个月发音后教小学初中音标，周六日一天4小时约200元，一个月八天约1600，能覆盖生活费。" },
      { purposeKey: "offer.close.hesitation", from: 156, to: 157, note: "10.10 一一稿：提醒今天是直播最后一天、3000元优惠可能过期，推动她尽快去问助教分期和名额。" },
      { purposeKey: "offer.trust", from: 158, to: 166, note: "10.10 一一稿：处理“分期是不是贷款、会不会被骗”：说明官方渠道签合同、不绑卡、可延迟交，再补央视采访、营业执照和机构做了七八年。" },
      { purposeKey: "offer.close.risk-reversal", from: 167, to: 168, note: "10.10 一一稿：介绍七天试学，七天内不满意可退，等于零成本试错，建议她问助教还有没有试学名额。" },
      { purposeKey: "offer.handoff", from: 169, to: 171, note: "10.10 一一稿：说明报名后分两个老师，其中一位负责大学成长规划，比赛、信息差等后续问题都可以问。" }
    ]
  },
  {
    id: "dz09",
    label: "10.10 小白咨询稿",
    file: "zxg/dz_zxg/10.10王柳元+260301069+小白+大一+智能建造+转专业好就业+打算第一期试试_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.questionnaire", from: 3, to: 4, note: "10.10 小白稿：用问卷里“考研还是就业要看情况”的原话开场，确认她当下的选择状态。" },
      { purposeKey: "scan.family-burden", from: 5, to: 11, note: "10.10 小白稿：从独生子、父母四十出头、务农打零工问到家庭经济，判断家里供她读书的负担。" },
      { purposeKey: "scan.parents", from: 12, to: 17, note: "10.10 小白稿：确认家里大事会商量、父母尊重她的决定，为后面谈钱和父母沟通做铺垫。" },
      { purposeKey: "diag.too-many", from: 18, to: 24, note: "10.10 小白稿：她同时想学编程、AI短剧、赚钱，咨询师追问“解闷还是赚钱”，帮她把发散的想法收回到能力与就业。" },
      { purposeKey: "window.english-leverage", from: 28, to: 30, note: "10.10 小白稿：反问她为什么没把英语变成赚钱能力，并用自己的翻译项目说明英语可以直接变现。" },
      { purposeKey: "trust.result", from: 31, to: 37, note: "10.10 小白稿：讲自己靠英语经济独立、家教时薪从 50 到 200，并接住她暑假做家教赚两千的经历。" },
      { purposeKey: "filter.internship", from: 38, to: 45, note: "10.10 小白稿：用“本科就业看实习大于学历”推出大学至少要 2—3 段优质实习，并倒推大一大二各一段。" },
      { purposeKey: "window.442", from: 46, to: 50, note: "10.10 小白稿：强调企业要能解决问题的人、能力大于只会学习，绩点只要不挂科不延毕即可。" },
      { purposeKey: "window.english-leverage", from: 61, to: 72, note: "10.10 小白稿：从企业出海、对外政策推到双语人才的长远价值，再落到四六级是企业最低筛选门槛。" },
      { purposeKey: "filter.competition", from: 73, to: 75, note: "10.10 小白稿：给出四六级 500+ 的目标，并把英语类竞赛定义为简历上的通用能力标签。" },
      { purposeKey: "filter.tutor", from: 76, to: 80, note: "10.10 小白稿：用口语练习成本最低、广交会一天 400 元、一次 1200 元，说明英语能同时练表达和赚钱。" },
      { purposeKey: "scan.campus", from: 83, to: 83, note: "10.10 小白稿：追问新校区没有图书馆、还在施工，确认她当下的自习环境限制。" },
      { purposeKey: "offer.ask-plan", from: 84, to: 86, note: "10.10 小白稿：让她自己口头总结大学规划，她说只能想到背单词、没听过听力、不知道怎么落地。" },
      { purposeKey: "diag.english", from: 89, to: 89, note: "10.10 小白稿：总结她方向清晰但英语是短板，既没基础也没完整认知。" },
      { purposeKey: "window.long-term", from: 90, to: 93, note: "10.10 小白稿：纠正“英语要慢慢来”，用 0 到 1 和 1 到 100 区别说明打基础不能无限拖延。" },
      { purposeKey: "diag.english.speed", from: 94, to: 99, note: "10.10 小白稿：指出背单词本身没错但阶段错了，当下应先抓发音、听力、口语，而不是堆单词量。" },
      { purposeKey: "offer.no-idea", from: 100, to: 104, note: "10.10 小白稿：说明她自己无法判断楼层和练习对错，需要先做完整测评再定每天学什么。" },
      { purposeKey: "offer.confirm-need", from: 105, to: 111, note: "10.10 小白稿：用“只耕耘不收获”和“善假于物”让她自己说出有必要跟老师学。" },
      { purposeKey: "offer.find-teacher", from: 112, to: 116, note: "10.10 小白稿：确认她手头只有魏老师课程，问她对课程的真实感受和长期学习意愿。" },
      { purposeKey: "trust.self-disclosure", from: 117, to: 121, note: "10.10 小白稿：讲自己高中英语卡在 130、被调剂英专、跟魏老师学起来的经历，回应“学姐也学这个吗”。" },
      { purposeKey: "diag.money", from: 122, to: 126, note: "10.10 小白稿：把卡点归为课程值得但暂时付不起，追问她有没有想过怎么解决资金。" },
      { purposeKey: "offer.close.risk-reversal", from: 133, to: 143, note: "10.10 小白稿：讲分期加七天全额退款，把 980 第一期解释成低成本试课，失败也有复盘和缓冲。" },
      { purposeKey: "offer.close.hesitation", from: 144, to: 146, note: "10.10 小白稿：对比不尝试的机会成本和犹豫成本，推动她别在原地想。" },
      { purposeKey: "offer.close.price", from: 147, to: 150, note: "10.10 小白稿：解释分期只比全款多约 100 元、一期一个月，把多出的钱定义为买机会的成本。" },
      { purposeKey: "offer.close.self-fund", from: 151, to: 155, note: "10.10 小白稿：确认她能自己承担，用打工攒钱、生活费结余和“金钱是话语权”强化她自己做决定。" },
      { purposeKey: "offer.close.parents", from: 158, to: 164, note: "10.10 小白稿：问她会不会跟家里说，预设父母因认知不同意，确认她愿意承担后果、父母最终会尊重。" },
      { purposeKey: "offer.trust", from: 168, to: 169, note: "10.10 小白稿：建议她去看公众号往届学员的前后对比，用真实案例把课程效果变成实感。" },
      { purposeKey: "offer.close.followup", from: 185, to: 190, note: "10.10 小白稿：收束到复盘习惯和后续规划，约定学出结果后微信联系、再做下一阶段判断。" },
      { purposeKey: "offer.trust", from: 190, to: 194, note: "10.10 小白稿：正面回应“是不是托/帮推销”，说明只推荐自己学过且确认有效的课程。" },
      { purposeKey: "offer.close.enroll", from: 196, to: 200, note: "10.10 小白稿：落到报名截止、每天抢 3000 券、分期找助教办理的具体下一步。" }
    ]
  },
  {
    id: "dz10",
    label: "10.10 小枫咨询稿",
    file: "zxg/dz_zxg/10.10董飞燕26011162效锋老妈不同意要二次沟通_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 3, note: "10.10 小枫稿：开场确认声音，聊他迟到半小时、中午空教室好找。" },
      { purposeKey: "scan.campus", from: 4, to: 5, note: "10.10 小枫稿：问宿舍环境，他说基本都在打游戏；顾问说自己也不愿待宿舍，常找空教室。" },
      { purposeKey: "scan.volunteer", from: 8, to: 9, note: "10.10 小枫稿：从问卷问专业怎么选，他说听说电气好找工作，爸爸也是电工。" },
      { purposeKey: "scan.parents", from: 10, to: 13, note: "10.10 小枫稿：问爸爸能否给指导，爸爸是普通电工/中专、在小企业，父母都不懂；顾问说要用他们听得懂的话讲。" },
      { purposeKey: "open.agenda", from: 14, to: 15, note: "10.10 小枫稿：说明今天给大一大二一个清晰方向，专业还没学几节课，不急着锁死考研或电网。" },
      { purposeKey: "trust.self-disclosure", from: 16, to: 18, note: "10.10 小枫稿：讲大学三种人（摆烂、瞎忙、清醒），说自己上大学前做好规划、踩对点拿到结果。" },
      { purposeKey: "filter.track", from: 18, to: 20, note: "10.10 小枫稿：学长只说考研和电网的薪资差，顾问说要列全现实情况和利弊，再选路径。" },
      { purposeKey: "diag.major.reality", from: 20, to: 27, note: "10.10 小枫稿：讲本科多去县级电网，运维值班/供电所/调度/职能岗，以及调动难、5年服务期、3-10万违约金。" },
      { purposeKey: "diag.postgrad", from: 28, to: 31, note: "10.10 小枫稿：讲读研的原因，东北电力虽是双非但在电网认可度高，多读两三年换更高工资和岗位。" },
      { purposeKey: "window.track-uncertain", from: 31, to: 36, note: "10.10 小枫稿：大一大二不下注，先保留大三选择权；探索方向和行动不冲突。" },
      { purposeKey: "filter.timeline", from: 37, to: 38, note: "10.10 小枫稿：把大一大二要做的事收成三件：英语、专业课、竞赛。" },
      { purposeKey: "filter.english", from: 38, to: 44, note: "10.10 小枫稿：逐条讲英语为什么是硬通货：四六级、国网优先四级、面试加分，用高考达线作类比。" },
      { purposeKey: "diag.postgrad.strategy", from: 45, to: 57, note: "10.10 小枫稿：拆电气考研四科，政治拉不开差距、数学专业课难、英语最容易卡；复试还有英文面试和文献翻译。" },
      { purposeKey: "filter.timeline", from: 58, to: 69, note: "10.10 小枫稿：按课程难度倒推：大一专业课轻、是英语黄金窗口，大二核心课上来，竞赛放到大二。" },
      { purposeKey: "filter.competition", from: 67, to: 72, note: "10.10 小枫稿：竞赛大二启动，先从英语类竞赛突围，借比赛认识学长学姐、积累组队人脉。" },
      { purposeKey: "filter.track", from: 73, to: 77, note: "10.10 小枫稿：大三按绩点、竞赛、四六级决定考电网还是考研，选择权会比现在更宽。" },
      { purposeKey: "filter.internship", from: 79, to: 81, note: "10.10 小枫稿：大二大三寒暑假找电力公司/电网相关实习，校内忙专业课和竞赛，校外攒实习。" },
      { purposeKey: "scan.score", from: 83, to: 83, note: "10.10 小枫稿：引用问卷里高中英语117分，指出考四级仍然吃力。" },
      { purposeKey: "filter.certificates", from: 83, to: 84, note: "10.10 小枫稿：用四级通过率约40%、六级约30%说明证书含金量。" },
      { purposeKey: "offer.find-teacher", from: 85, to: 89, note: "10.10 小枫稿：他说只剩两个月不知道怎么学、想跟魏老师学；顾问说大学英语课没人带、没氛围。" },
      { purposeKey: "trust.self-disclosure", from: 90, to: 99, note: "10.10 小枫稿：讲自己高考后自学一个月无效、听力靠蒙，后来加学姐请教，才知道学姐报班跟微微老师。" },
      { purposeKey: "offer.need.plan", from: 100, to: 103, note: "10.10 小枫稿：讲入学测评后按基础、目标、备考时间定制计划，有人监督陪伴。" },
      { purposeKey: "offer.self-study", from: 104, to: 109, note: "10.10 小枫稿：两个月要效果必须有人带、每天反馈；学校发1000单词背了没用，换题还是蒙。" },
      { purposeKey: "offer.close.parents", from: 110, to: 112, note: "10.10 小枫稿：他问怎么说服妈妈，昨天直接说就被拒；顾问说要用父母听得懂的话。" },
      { purposeKey: "offer.close.parents", from: 113, to: 121, note: "10.10 小枫稿：顾问示范自己的说法：先讲900分期/学校四级班，学一个月后再坦白并展示效果。" },
      { purposeKey: "diag.motivation", from: 122, to: 124, note: "10.10 小枫稿：说他不是拖延/三分钟热度，只是没人给明确指令；有人带就有行动力。" },
      { purposeKey: "offer.close.parents", from: 125, to: 131, note: "10.10 小枫稿：给具体话术：学校12月考四级、学习通网课、980分期，先学一个月再跟妈妈坦白。" },
      { purposeKey: "offer.close.self-fund", from: 133, to: 134, note: "10.10 小枫稿：让他问分期方案，生活费扣一点、剩下的再问妈妈要，几百块更好开口。" },
      { purposeKey: "offer.close.price", from: 152, to: 156, note: "10.10 小枫稿：确认四期分期，第一期980/1040，结合他每月1500生活费算压力。" },
      { purposeKey: "offer.close.followup", from: 160, to: 162, note: "10.10 小枫稿：约定他跟妈妈谈完再反馈，后续微信继续帮他想办法。" }
    ]
  },
  {
    id: "dz11",
    label: "10.10 小奇咨询稿",
    file: "zxg/dz_zxg/10.10邓文萱2603010小奇985院校男生想保研，一开始说自己不会报课的，家里人也不会同意，不好意思借钱，但是最后让他下定决心一定要把英语学好.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 6, note: "10.10 小奇稿：开头确认“是小琪吗”，得知他在宿舍、舍友在，问声音听不听得清，先确认本人和环境再进正题。" },
      { purposeKey: "trust.permission", from: 7, to: 8, note: "10.10 小奇稿：问他周边有没有纸笔，他说已经在桌上准备好，咨询师肯定他准备齐全，营造一起做规划的氛围。" },
      { purposeKey: "scan.holiday", from: 9, to: 9, note: "10.10 小奇稿：问国庆有没有出去玩，学生说只去德阳表哥那住一晚、基本在学校，咨询师肯定他假期还在提前做规划。" },
      { purposeKey: "open.questionnaire", from: 10, to: 10, note: "10.10 小奇稿：复述问卷里的高目标——不仅保本校还要保清北，说明自己认真看过问卷并直接点出目标。" },
      { purposeKey: "scan.score", from: 11, to: 12, note: "10.10 小奇稿：接住他高考英语从六七十分补到120、130的经历和模考压力，判断他的英语基础和抗压状态。" },
      { purposeKey: "window.competition-pool", from: 13, to: 17, note: "10.10 小奇稿：用学校很卷、同学家庭背景、C9学妹提前认识导师等例子讲竞争池，说明只靠努力不够，要换赢者思维。" },
      { purposeKey: "trust.result", from: 21, to: 25, note: "10.10 小奇稿：讲自己高考英语刚及格、跟老师学四五个月、大一四级裸考580、六级500多、被院长安排接待外宾，用结果建立可信度。" },
      { purposeKey: "window.english-leverage", from: 26, to: 35, note: "10.10 小奇稿：从自动化专业讲英语杠杆：班上没人能口语自由交流、进口设备说明书全英文、国家出海趋势，说明英语是他的王炸。" },
      { purposeKey: "filter.gpa", from: 38, to: 42, note: "10.10 小奇稿：回答绩点疑问，说明所有科目都算、每门都要打高，保研清北要专业前3%到5%、绝不能挂科，必须从大一攒。" },
      { purposeKey: "filter.competition", from: 43, to: 51, note: "10.10 小奇稿：把比赛分专业类和英语类，大一先打外研社、大英赛等国家级英语竞赛，专业竞赛等大二专业课深入后再打。" },
      { purposeKey: "filter.lab", from: 52, to: 64, note: "10.10 小奇稿：给科研路径：勤工俭学文献翻译岗接近保研导师、用价值交换让老师看见，或通过高含金量比赛结识学长学姐。" },
      { purposeKey: "filter.internship", from: 65, to: 71, note: "10.10 小奇稿：讲实习：大一大二能进企业的人多有资源，自己靠四六级高分做HR和总经理助理；推荐BOSS直聘、智联、实习僧。" },
      { purposeKey: "filter.tutor", from: 72, to: 78, note: "10.10 小奇稿：发线上英语绘本陪读截图，介绍陪读和口语兼职收入，鼓励他下个月或寒假就去试，把英语变成现金流。" },
      { purposeKey: "trust.result", from: 79, to: 86, note: "10.10 小奇稿：现场做英文自我介绍演示口语水平，说明口语好时薪更高，进一步证明英语能力可以变现。" },
      { purposeKey: "filter.english", from: 87, to: 93, note: "10.10 小奇稿：讲保研四六级硬门槛：清北夏令营六级550+、专业前30%，四级通过率40%、六级10%到20%，并用朋友高考140却四级听力挂掉说明口语听力一体。" },
      { purposeKey: "diag.postgrad.timeline", from: 94, to: 98, note: "10.10 小奇稿：讲夏令营流程：简历、参观讲座、外教全英文授课小考、5分钟英文自我介绍、专业术语和场景模拟面试。" },
      { purposeKey: "offer.close.hesitation", from: 99, to: 103, note: "10.10 小奇稿：强调12月四六级只剩两个多月、还要期末和专业前3%，用时间窗口推他当下行动，别等三分钟热度过去。" },
      { purposeKey: "offer.self-study", from: 104, to: 108, note: "10.10 小奇稿：问他自己学能不能学会，指出18年学校环境才考120，现在没环境没反馈，自学很难，周边没人自学成功。" },
      { purposeKey: "offer.pitfall.sunk", from: 109, to: 110, note: "10.10 小奇稿：用自己试遍B站刘晓燕等网课、三个月全放弃、钱打水漂的经历，说明低价网课和自学的沉没成本。" },
      { purposeKey: "diag.parents", from: 111, to: 114, note: "10.10 小奇稿：学生说父母是教师、家里不差钱，但自己从高三暑假起不愿伸手要钱；咨询师接住他和老一辈观念掰扯、想经济独立的情绪。" },
      { purposeKey: "diag.money", from: 115, to: 117, note: "10.10 小奇稿：学生说暑假报的网课没上完，怕这次也打水漂；咨询师点出他怕重复失败，为后面给风险承诺铺垫。" },
      { purposeKey: "trust.self-disclosure", from: 118, to: 122, note: "10.10 小奇稿：讲自己农村家庭、家里老大，跟爸妈打三天电话哭着争取学习钱，用“成长了才能让父母轻松”重新框定花钱。" },
      { purposeKey: "window.subtract", from: 123, to: 125, note: "10.10 小奇稿：指出Python学不下来是优先级低、跟专业关联弱，英语对自动化是刚需，越没时间越要现在学，帮他把精力收敛到英语一条主线。" },
      { purposeKey: "offer.need.coach", from: 126, to: 128, note: "10.10 小奇稿：说明跟老师学每天三四十分钟即可，打卡后老师会点评纠音，降低他对时间投入的恐惧。" },
      { purposeKey: "offer.close.price", from: 129, to: 132, note: "10.10 小奇稿：确认价格3980、可分四期、首期980，和他一起算分期后的每月压力。" },
      { purposeKey: "offer.close.self-fund", from: 133, to: 139, note: "10.10 小奇稿：把首期拆成小问题：生活费省、勤工俭学、跟朋友周转，后面几期可跟老师缓一缓，落到500和480的具体缺口。" },
      { purposeKey: "trust.self-disclosure", from: 141, to: 143, note: "10.10 小奇稿：讲自己跟闺蜜借300块、对方二话不说借给她，说明为成长借钱不丢人、患难见真情。" },
      { purposeKey: "offer.close.self-fund", from: 144, to: 150, note: "10.10 小奇稿：处理“太好面子开不了口”，说服他把面子放下，把借钱学英语讲成未来面试里的成就事件。" },
      { purposeKey: "offer.close.hesitation", from: 151, to: 157, note: "10.10 小奇稿：用马云高考数学9分等例子讲先苦后甜，肯定他愿意吃阶段性小痛，推动他当场下决心。" },
      { purposeKey: "offer.close.enroll", from: 158, to: 159, note: "10.10 小奇稿：约好今晚去听魏老师的免费课，让他先去吃饭别耽误，落到下一步具体行动。" }
    ]
  },
  {
    id: "dz12",
    label: "10.11 小新咨询稿",
    file: "zxg/dz_zxg/10.11+宋佳琦+26064030+小新+大三+无明显阻力.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "scan.holiday", from: 1, to: 3, note: "10.11 小新稿：从赖床和早起习惯聊起，咨询师分享自己大一开始早起学英语，确认学生开学后的作息与状态。" },
      { purposeKey: "scan.volunteer", from: 4, to: 5, note: "10.11 小新稿：追问专业是谁选的，学生说“命运把我推到这儿”，确认是分数够到而非主动选择。" },
      { purposeKey: "diag.major", from: 6, to: 10, note: "10.11 小新稿：问滑雪专业学得怎么样，学生说门槛低、必须会英语才能深造，只能靠考研换师范方向，咨询师点出“甘心当普通指导员吗”。" },
      { purposeKey: "diag.postgrad", from: 11, to: 12, note: "10.11 小新稿：讲考研初试必考英语、复试全英文交流，说明英语不好会直接卡住考研和发展。" },
      { purposeKey: "diag.english.speed", from: 13, to: 14, note: "10.11 小新稿：用“背单词学语法这么多年还是过不了四六级”说明不是不努力，是方法不对。" },
      { purposeKey: "offer.trust", from: 14, to: 22, note: "10.11 小新稿：讲魏老师高考三次、人大北大双硕士、自费找老师总结方法，用老师经历建立可信度，并提到入学测评和分阶段教学。" },
      { purposeKey: "diag.postgrad.timeline", from: 23, to: 26, note: "10.11 小新稿：回答考研何时备考，明确大四上12月中旬考试、现在选目标院校，区分学硕与专硕。" },
      { purposeKey: "diag.english", from: 27, to: 30, note: "10.11 小新稿：学生四级听力零基础、没学过发音，咨询师指出先学发音，并说明四级和考研英语不冲突。" },
      { purposeKey: "filter.timeline", from: 31, to: 37, note: "10.11 小新稿：按六个月学完倒推，大三下准备专业课、大四上背政治，结合学生一周四节课说明时间充裕。" },
      { purposeKey: "diag.english.method", from: 38, to: 40, note: "10.11 小新稿：学生自学每天花很久、第二天忘一半，咨询师指出死记硬背缺方法，安排助教每天纠音反馈。" },
      { purposeKey: "offer.self-study", from: 38, to: 40, note: "10.11 小新稿：学生描述自己每天花很长时间自学、越学越累，咨询师接住这个自学方案，再指出它缺方法和反馈。" },
      { purposeKey: "window.english-leverage", from: 44, to: 48, note: "10.11 小新稿：学生说“过了四级又有什么用”，咨询师用复试全英文、就业听说、国际裁判证、外籍私教和旅游定制说明英语的横向价值。" },
      { purposeKey: "filter.certificates", from: 49, to: 52, note: "10.11 小新稿：讲考研英语平均分和六级分数，强调简历上的证书和比赛，追问大一大二有没有考证参赛。" },
      { purposeKey: "filter.competition", from: 53, to: 60, note: "10.11 小新稿：介绍大英赛，确认学校报名渠道，提醒问导员并记下比赛名称。" },
      { purposeKey: "filter.certificates", from: 71, to: 76, note: "10.11 小新稿：补充外研社国才杯，规划四级500+、六级550+的刷分目标，用证书弥补比赛空白。" },
      { purposeKey: "filter.postgrad-plan", from: 79, to: 85, note: "10.11 小新稿：拆考研专业课，明确运动训练学和体育基本理论大三下准备，政治大四上背，最后留一个月总复习。" },
      { purposeKey: "filter.postgrad-plan", from: 86, to: 93, note: "10.11 小新稿：讲复试看表达、英语口语和简历，建议把教小朋友的实践讲成因材施教，专硕要利用寒暑假实习。" },
      { purposeKey: "offer.handoff", from: 94, to: 98, note: "10.11 小新稿：学生明确要跟魏老师学，咨询师说明助教、私教和学姐各自能提供的支持，把方案接到具体人。" },
      { purposeKey: "window.final-goal", from: 99, to: 104, note: "10.11 小新稿：用室友秋招找不到工作、学前教育实习1600的案例，说明大三必须现在行动，回应“来得及吗”。" },
      { purposeKey: "diag.english.speed", from: 105, to: 109, note: "10.11 小新稿：学生做四级卷打零分受打击，咨询师建议先学发音单词再做题，说明无针对性的卷子效率低。" },
      { purposeKey: "diag.money", from: 110, to: 111, note: "10.11 小新稿：学生说学费生活费自理、剩下的只能问妈妈，妈妈觉得不是小数字、信不着。" },
      { purposeKey: "offer.close.price", from: 112, to: 113, note: "10.11 小新稿：给出分期方案，说明一个月内付完算全款，并提到家长群可以让妈妈看到学习过程。" },
      { purposeKey: "filter.tutor", from: 114, to: 120, note: "10.11 小新稿：从黑龙江补课一小时五六百聊到英语家教市场，咨询师分享自己时薪从五六十涨到120，学生也做过初中英语家教。" },
      { purposeKey: "offer.close.parents", from: 123, to: 124, note: "10.11 小新稿：建议先学出效果再跟妈妈说，用结果让妈妈放心，并把这件事讲成自己对家庭的担当。" },
      { purposeKey: "diag.motivation", from: 125, to: 128, note: "10.11 小新稿：学生说高中高考失利、大一大二摆烂，现在心气回来了，咨询师接住“社会不缺人，缺有能力的人”。" },
      { purposeKey: "offer.close.followup", from: 129, to: 132, note: "10.11 小新稿：收尾确认没有疑问，约定后续微信提问，并记住学生“当一辈子粉丝”的话。" }
    ]
  },
  {
    id: "dz13",
    label: "10.11 圆圆咨询稿",
    file: "zxg/dz_zxg/10.11叶启航260401030圆圆+担心没效果+自己学太迟了_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.expectation", from: 1, to: 3, note: "10.11 圆圆稿：问她吃过饭没，听出她有点紧张，用轻松语气接住，说聊着聊着就会放松。" },
      { purposeKey: "open.agenda", from: 10, to: 10, note: "10.11 圆圆稿：说明大学已经过了一半、身边人早就在准备，今天要帮她把剩下的时间做成规划。" },
      { purposeKey: "scan.score", from: 10, to: 13, note: "10.11 圆圆稿：问四级考了几次、差多少分，她说考了两次、上次差20分，英语一直不好。" },
      { purposeKey: "diag.english", from: 14, to: 20, note: "10.11 圆圆稿：确认听力是她最差的一项，从小没补上来；又分析学校英语课形式主义、老师忙评优科研、一周一节根本学不好。" },
      { purposeKey: "scan.worries", from: 20, to: 22, note: "10.11 圆圆稿：问她迷茫什么，她说担心以后，当下最想先把四级考过，但又很担心这件事。" },
      { purposeKey: "window.track-uncertain", from: 27, to: 31, note: "10.11 圆圆稿：她说自己没实习过、家在乡村找不到实习；咨询师指出没实践过就不知道擅长什么，建议先去职场历练。" },
      { purposeKey: "window.final-goal", from: 31, to: 32, note: "10.11 圆圆稿：用大一就实习的人和她拉开差距，说明大三大四再实习来不及，80%毕业生找不到满意工作。" },
      { purposeKey: "filter.certificates", from: 32, to: 34, note: "10.11 圆圆稿：她目标财管岗6000—8000，咨询师讲四级是基本门槛、六级才是区分度，大三还没过四级会很被动。" },
      { purposeKey: "diag.english.speed", from: 36, to: 38, note: "10.11 圆圆稿：对比高考和四级听力语速、有无题目、词汇量，指出她按过去方式学只会在错误惯性里越陷越深，英语要靠积累。" },
      { purposeKey: "window.long-term", from: 36, to: 38, note: "10.11 圆圆稿：用高考和四级听力、词汇量的差距说明英语不能靠短期刷题，需要长期积累，基础打牢才决定后面能走多快。" },
      { purposeKey: "filter.timeline", from: 39, to: 41, note: "10.11 圆圆稿：解释秋招春招是什么，简历上没四级会直接被HR筛掉，连面试机会都拿不到。" },
      { purposeKey: "diag.major.reality", from: 43, to: 44, note: "10.11 圆圆稿：指出四级没过只能做出纳类两三千的重复工作，面试官会质疑大学四年八次机会都没过，不敢把岗位交给她。" },
      { purposeKey: "diag.ai", from: 45, to: 47, note: "10.11 圆圆稿：讲AI财务机器人做账更快、出错率更低、不用休息，基础记账岗正在被替代，企业更需要能看外文财报、英语强的人。" },
      { purposeKey: "filter.timeline", from: 56, to: 65, note: "10.11 圆圆稿：把时间线拆成三段：大三下6月前过四级并练口语、寒暑假找实习、大四上9—12月秋招、大四下3—5月春招补录。" },
      { purposeKey: "trust.permission", from: 47, to: 48, note: "10.11 圆圆稿：让她拿备忘录记时间线，说明这是两个人一起做的规划，允许她随时打断和记录，不是单方面说教。" },
      { purposeKey: "offer.three-needs", from: 69, to: 82, note: "10.11 圆圆稿：用三个点解释学英语为什么有效：科学方法（发音到听说读写）、针对性学习方案、及时纠正和正反馈，并让她复述。" },
      { purposeKey: "scan.existing-course", from: 88, to: 91, note: "10.11 圆圆稿：问她之前推的魏老师直播课听完没，她说后面一点没听完，觉得有干货但没体系、判断不了效果。" },
      { purposeKey: "diag.motivation", from: 93, to: 102, note: "10.11 圆圆稿：她担心自己三分钟热度、坚持不下来；咨询师用高中能坚持下来的经历说明坚持靠机制、环境和正反馈，不只靠意志力。" },
      { purposeKey: "trust.self-disclosure", from: 102, to: 104, note: "10.11 圆圆稿：咨询师自曝也给自己贴过三分钟热度标签，讲魏老师高考三次、课程专门针对基础差的大学生、用词根故事举一反三。" },
      { purposeKey: "offer.trust", from: 104, to: 110, note: "10.11 圆圆稿：讲线上自习室氛围、机构每月招线上实习生、魏老师被央视采访、做的是大学生教育，看重态度大于能力。" },
      { purposeKey: "filter.internship", from: 111, to: 113, note: "10.11 圆圆稿：讲找实习渠道：boss直聘海投容易被pass、付费内推要花3万、教培机构是愿意给大学生机会的特殊渠道。" },
      { purposeKey: "offer.close.hesitation", from: 126, to: 129, note: "10.11 圆圆稿：让她给跟老师学的意愿打分，她打7—8分；咨询师追问剩下两三分是不是课程没搞明白、还担心效果和坚持。" },
      { purposeKey: "offer.need.coach", from: 130, to: 136, note: "10.11 圆圆稿：她承认一个人坚持不下来、身边环境也一般；咨询师讲成长私教会盯进度、问原因、帮她把时间拉回来，形成陪伴和正反馈。" },
      { purposeKey: "offer.pitfall.environment", from: 136, to: 143, note: "10.11 圆圆稿：她担心图书馆吵、没地方开口；咨询师讲宿舍楼道、小树林、食堂角落都能练，环境不支持就自己创造环境，别被环境限制住。" },
      { purposeKey: "trust.result", from: 155, to: 165, note: "10.11 圆圆稿：讲自信来自一项优于别人的能力，自己靠英语从自卑变得敢表达；用食堂给外教翻译、被夸发音地道的真实经历佐证。" },
      { purposeKey: "offer.close.hesitation", from: 170, to: 178, note: "10.11 圆圆稿：她担心大三开始太晚，咨询师用“种一棵树最好的时间是十年前，其次是现在”和带过的大三案例，说明现在行动来得及。" },
      { purposeKey: "offer.confirm-need", from: 179, to: 183, note: "10.11 圆圆稿：她主动问要不要报名系统学，咨询师追问她是已经坚定还是还有顾虑，确认她接近决定。" },
      { purposeKey: "offer.close.enroll", from: 187, to: 190, note: "10.11 圆圆稿：她问报名链接和师兄，咨询师让她去沟通、问之前抢的券，并提醒名额有限、要抓紧报。" },
      { purposeKey: "offer.close.self-fund", from: 190, to: 197, note: "10.11 圆圆稿：确认她有自己的小金库、可以分期；首期八九百能接受、不会吃泡面，咨询师说万事俱备可以先去试第一个月。" },
      { purposeKey: "offer.close.followup", from: 202, to: 203, note: "10.11 圆圆稿：收尾说报名后就是她的小师妹、会置顶，学习生活问题都可以找她，鼓励她一年内把英语打好、建立底气。" }
    ]
  },
  {
    id: "dz14",
    label: "10.11 小黄咨询稿",
    file: "zxg/dz_zxg/10.11周惠怡+小黄+专升本+报了编程退+英语11月下旬助学贷款学+周借980_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 6, note: "10.11 小黄稿：先确认声音偏小、问清是在宿舍还是已经出来，得知周末室友各忙各的、她已走出宿舍打电话，确认环境可以正常沟通。" },
      { purposeKey: "scan.volunteer", from: 9, to: 10, note: "10.11 小黄稿：问她这个专业当时怎么选的、以后是否想从事，她说感觉教不好也学不好、选它部分是因为分数不好，咨询师接住高考失利。" },
      { purposeKey: "filter.timeline", from: 11, to: 17, note: "10.11 小黄稿：拆专升本四科（数学、英语、专业课综合卷含钳工实训），再问出大二就要实习、大三下四月全区笔试，倒推后指出真正能系统备考的只有大一，时间很紧。" },
      { purposeKey: "open.questionnaire", from: 24, to: 25, note: "10.11 小黄稿：直接引用问卷里“想考公办院校”这句细节切入，指出公办竞争大，所以英语要重点抓，并说明英语150分考词汇语法翻译写作、难度低于四级高于高考。" },
      { purposeKey: "scan.score", from: 25, to: 27, note: "10.11 小黄稿：拿到高考英语27分，追问“不担心英语把你卡死吗”，再问她目前怎么提升，确认她只了解到背高频词。" },
      { purposeKey: "diag.english.speed", from: 27, to: 30, note: "10.11 小黄稿：指出基础差还沿用刷题背单词，反问“以前的方式能学起来，为什么现在还是这样”，把问题从“懒”转到发音地基没打。" },
      { purposeKey: "diag.postgrad", from: 36, to: 40, note: "10.11 小黄稿：从“专升本后继续读”问出考研想法，确认家里经济和时间都支持，指出考研英语比六级更难，把考研意愿和英语卡点接上。" },
      { purposeKey: "window.english-leverage", from: 45, to: 46, note: "10.11 小黄稿：把英语定义成同时卡专升本、就业四六级、考研的万能钥匙，用表弟专升本没上岸去读民办、学费大几万的例子说明英语杠杆。" },
      { purposeKey: "diag.english.speed", from: 47, to: 55, note: "10.11 小黄稿：说明发音是地基，用数学先学阿拉伯数字和九九乘法表、中文先学声母韵母拼音作类比，指出要体系化学元音、辅音、发音规则（如 not at all 连读），不能东一榔头西一棒子。" },
      { purposeKey: "diag.english.method", from: 65, to: 67, note: "10.11 小黄稿：指出“读错没人纠正”才是核心，类比高中做题对答案，强调纠音要看口腔位置、把步子放慢，并引出需要按阶段做学习规划。" },
      { purposeKey: "offer.compare", from: 68, to: 73, note: "10.11 小黄稿：拿她找过的 B 站碎片资源做对比，指出博主的方法适合别人不一定适合她、碎资源违反体系化、大博主不会一对一纠音。" },
      { purposeKey: "scan.existing-course", from: 81, to: 90, note: "10.11 小黄稿：问出她已报线上编程课：冲着“经济独立、赚外快”报名、平台不派单、说不清多久能学出效果，所谓两年只是服务期、仍要按月缴费。" },
      { purposeKey: "window.python-reality", from: 85, to: 90, note: "10.11 小黄稿：拆编程接单的现实：平台不派单、没人脉、不是本专业，连专业学编程的人都难接单、要做复合型人才，两年服务期不等于能变现。" },
      { purposeKey: "filter.tutor", from: 90, to: 91, note: "10.11 小黄稿：提出英语提升后可以直接做家教变现，用闺蜜在河源三四线城市暑假家教赚1万的例子，对比工厂打工，并说能反哺专升本。" },
      { purposeKey: "diag.too-many", from: 94, to: 99, note: "10.11 小黄稿：把编程和英语两件事做减法，用“快高考的人去抓画画”类比说明刚需优先，处理她退编程课的愧疚，落到有限资金和时间先抓英语一条主线。" },
      { purposeKey: "window.subtract", from: 94, to: 99, note: "10.11 小黄稿：她在编程班退不退之间纠结，咨询师用“快高考的人去抓画画”类比，帮她把编程和英语做减法：当下有限的钱和时间先抓专升本刚需英语，编程等以后有钱有时间再学，并处理她“半途而废”的愧疚。" },
      { purposeKey: "offer.trust", from: 102, to: 110, note: "10.11 小黄稿：讲一个专科生高考英语三四十分、九个月练到口语自由交流、上岸公办并自己交学费的学员案例，配合奖学金视频和年度奖学金抵学费建立可信度。" },
      { purposeKey: "trust.self-disclosure", from: 116, to: 121, note: "10.11 小黄稿：讲自己准大一同样焦虑、高中报高途网课失败、父亲从保险柜拿压箱底零钱、亲戚上门要债、高考失利的愧疚，用“想托举家里却最无能为力”建立相似性。" },
      { purposeKey: "window.final-goal", from: 126, to: 127, note: "10.11 小黄稿：把专升本重新定义为进本科平台、提高就业上限，从大厂实习的学历门槛和后续考研倒推，说明最终目标仍是就业。" },
      { purposeKey: "offer.close.price", from: 133, to: 137, note: "10.11 小黄稿：把三千多拆成领券、今晚直播抢券、最多4期/特殊6期、首期固定980（含人工服务费），把总价换算成可操作的付款结构。" },
      { purposeKey: "scan.money", from: 138, to: 141, note: "10.11 小黄稿：问出她首期只能勉强凑500以下、500以上做不到，父母生活费是“先给100、用完再要”，确认可支配现金极低。" },
      { purposeKey: "diag.parents", from: 142, to: 145, note: "10.11 小黄稿：判断父母属于“不信、觉得线上偏”的类型而不是单纯没钱，学生自评说服几率不大，为后面绕开父母、走助学贷款和借款铺垫。" },
      { purposeKey: "offer.close.self-fund", from: 157, to: 163, note: "10.11 小黄稿：用11月底助学贷款、特殊分期每月600多、周末家教200算首期，哥姐也在上学借不到后，咨询师提出先借980、贷款到账再还。" },
      { purposeKey: "offer.close.enroll", from: 167, to: 170, note: "10.11 小黄稿：明确下一步先找助教朱老师确认特殊分期，能申请就把第一期980交上，并约定助学贷款到账后归还。" },
      { purposeKey: "offer.close.followup", from: 171, to: 175, note: "10.11 小黄稿：约定每天汇报学习进度、发打卡，用“天使投资人”和弟弟每天打卡的例子把跟进关系定下来。" }
    ]
  },
  {
    id: "dz15",
    label: "10.11 张浩咨询稿",
    file: "zxg/dz_zxg/10.11周惠怡+张浩+大一+保研+有自己小金库+小学初中报课效果不佳妈妈抵触网课_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 6, note: "10.11 张浩稿：先确认声音大小、蓝牙耳机和天台环境，调好设备再进入正题。" },
      { purposeKey: "scan.holiday", from: 7, to: 10, note: "10.11 张浩稿：问她一天怎么过，带出上午补觉、下午自习英语和解剖学、刚军训三周的状态。" },
      { purposeKey: "scan.volunteer", from: 11, to: 13, note: "10.11 张浩稿：确认专业难度、她是否擅长、是否自己感兴趣，判断专业本身不是问题。" },
      { purposeKey: "diag.postgrad", from: 14, to: 16, note: "10.11 张浩稿：从“想保研”切入，问学校保研名额，拿到“年级前3%”这个硬指标。" },
      { purposeKey: "diag.postgrad.timeline", from: 17, to: 24, note: "10.11 张浩稿：发现她不知道夏令营，补讲推免资格、大三下4—6月投递、五年制大五实习的时间线。" },
      { purposeKey: "diag.postgrad.pool", from: 27, to: 31, note: "10.11 张浩稿：把保研竞争池讲透——校内前10%、校外985/211，提醒她对手都是卷王。" },
      { purposeKey: "filter.timeline", from: 31, to: 34, note: "10.11 张浩稿：从大三下投简历倒推，只剩大一上下、大二上下、大三上五个学期。" },
      { purposeKey: "filter.one-ability", from: 35, to: 40, note: "10.11 张浩稿：把简历拆成成绩、英语、科研竞赛实习三项，指出前两项拉不开差距，只剩英语。" },
      { purposeKey: "diag.english", from: 40, to: 43, note: "10.11 张浩稿：用六级550的夏令营硬门槛、复试英文自我介绍和文献翻译，说明英语是入场券不是加分项。" },
      { purposeKey: "trust.result", from: 42, to: 42, note: "10.11 张浩稿：插入自己在杭州面试用全英文自我介绍拿下offer的经历，证明口语能弥补学历。" },
      { purposeKey: "filter.lab", from: 44, to: 48, note: "10.11 张浩稿：问学校创新创业园和实验室招新要求，指出英语和文献能力是导师筛人的凭据。" },
      { purposeKey: "filter.timeline", from: 51, to: 53, note: "10.11 张浩稿：再倒推大五论文、大四实习、大三夏令营，得出“真正能打基础只有大一”。" },
      { purposeKey: "diag.english.speed", from: 56, to: 57, note: "10.11 张浩稿：直接否定“刷题背单词”的哑巴英语路径，指出当下要在有限时间里高效提升口语。" },
      { purposeKey: "scan.score", from: 61, to: 63, note: "10.11 张浩稿：问出高考英语80分，用“120分也过不了四级”说明分数不等于能力。" },
      { purposeKey: "window.long-term", from: 63, to: 66, note: "10.11 张浩稿：用十月学发音一个月、到六月还有九个月，说明按阶段打基础来得及，劝她别急。" },
      { purposeKey: "trust.result", from: 67, to: 68, note: "10.11 张浩稿：讲惠州专科老乡高考二三十分、跟老师九个月能自由交流的案例，给她一个可对照的样本。" },
      { purposeKey: "diag.parents", from: 69, to: 73, note: "10.11 张浩稿：问出卡点是妈妈——以前报班没效果、怕浪费钱，先把父母反对的真实原因拆开。" },
      { purposeKey: "offer.pitfall.sunk", from: 72, to: 76, note: "10.11 张浩稿：对比她以前“背单词+刷题技巧”的课，指出没有发音地基，背了又忘是必然。" },
      { purposeKey: "offer.three-needs", from: 77, to: 85, note: "10.11 张浩稿：给出有效性的三个关键——科学方法、针对性规划、反馈，并逐条对照她过去的课。" },
      { purposeKey: "offer.need.path", from: 78, to: 82, note: "10.11 张浩稿：用“数学不认阿拉伯数字就背九九乘法表”的类比，讲发音是英语的地基，不能跳层。" },
      { purposeKey: "offer.pitfall.path", from: 78, to: 82, note: "10.11 张浩稿：指出她过去的课跳过发音直接背单词刷题，正是缺路径，所以越学越没底。" },
      { purposeKey: "offer.need.coach", from: 83, to: 88, note: "10.11 张浩稿：讲助教老师第二天给反馈、纠广普、绕舌法，说明反馈是自学最缺的一环。" },
      { purposeKey: "offer.pitfall.feedback", from: 83, to: 88, note: "10.11 张浩稿：用她以前“老师只对答案、不给针对性建议”的经历，点明缺反馈是旧课无效的直接原因。" },
      { purposeKey: "offer.confirm-need", from: 89, to: 90, note: "10.11 张浩稿：用“夏令营信息差都可以问成长私教”说明付费买到的是持续反馈和规划，让她自己认可价值。" },
      { purposeKey: "diag.parents", from: 91, to: 92, note: "10.11 张浩稿：用医生换治疗方案的类比，教她第二次沟通要抓妈妈“怕没效果”这个需求点。" },
      { purposeKey: "offer.close.parents", from: 93, to: 94, note: "10.11 张浩稿：约定直播结束后再跟妈妈谈，并先问“如果还不支持怎么办”，提前准备B方案。" },
      { purposeKey: "offer.close.self-fund", from: 95, to: 99, note: "10.11 张浩稿：问家里谁管钱、她有没有小金库，确认她有两张卡、可以自己承担一部分。" },
      { purposeKey: "offer.close.price", from: 100, to: 103, note: "10.11 张浩稿：算分期账——手续费多100、四期利息980，确认她每月能承受。" },
      { purposeKey: "offer.close.self-fund", from: 104, to: 106, note: "10.11 张浩稿：把B方案说清楚——妈妈不支持就先用自己的小金库学，学出效果再证明。" },
      { purposeKey: "offer.close.followup", from: 108, to: 113, note: "10.11 张浩稿：收尾让她晚上听直播、组织跟妈妈沟通的话术，微信随时反馈。" }
    ]
  },
  {
    id: "dz16",
    label: "10.11 小吴咨询稿",
    file: "zxg/dz_zxg/10.11杨卓尔26010059小吴大三+对老师课程有顾虑_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 6, note: "10.11 小吴稿：开头确认小吴、调耳麦，问他在哪打电话（临时找的教学楼）、纸笔有没有准备，再用“电子信息偏电气”切入课程感受。" },
      { purposeKey: "trust.permission", from: 9, to: 9, note: "10.11 小吴稿：说明做规划要基于他的真实想法，让他多讲具体情况、不用拘束害羞，越具体建议越有针对性。" },
      { purposeKey: "scan.volunteer", from: 8, to: 8, note: "10.11 小吴稿：问专业当初怎么选的，学生说是家里哥哥考研创业后帮忙敲定，澄清专业决策来源。" },
      { purposeKey: "diag.postgrad", from: 13, to: 15, note: "10.11 小吴稿：问他考研开始准备没、目标院校是不是211、是否继续电子信息，确认他的考研方向和当前进度。" },
      { purposeKey: "scan.existing-course", from: 16, to: 20, note: "10.11 小吴稿：问升本报班经历，学生说效果不好、是一对多线下班；咨询师指出机构班偏刷题技巧，建议分科找专项班而不是报全体系。" },
      { purposeKey: "diag.postgrad", from: 21, to: 24, note: "10.11 小吴稿：确认他对考研流程只知初试、不懂复试，为后面系统讲初试复试做铺垫。" },
      { purposeKey: "diag.postgrad.timeline", from: 25, to: 30, note: "10.11 小吴稿：讲初试时间、科目和总分，点出二本考211的学历歧视现实，建议按目标院校往年线高10到20分准备。" },
      { purposeKey: "diag.postgrad.timeline", from: 31, to: 35, note: "10.11 小吴稿：讲复试时间、综合面试加英语交流，英语自我介绍和现场抽论文翻译，越好的学校越普遍。" },
      { purposeKey: "window.competition-pool", from: 36, to: 45, note: "10.11 小吴稿：用赢者思维讲复试竞争：努力只是基础，真正比的是谁更早开始、效率更高、方向更准。" },
      { purposeKey: "filter.competition", from: 54, to: 56, note: "10.11 小吴稿：盘点专科阶段只有几个校内小比赛，指出校级奖项含金量低，和211对手比会吃亏。" },
      { purposeKey: "scan.score", from: 57, to: 59, note: "10.11 小吴稿：问四六级，得知他四级还没过、英语差，点出大三时间已经很紧。" },
      { purposeKey: "diag.english", from: 60, to: 65, note: "10.11 小吴稿：讲考研英语比六级还难、国家线和单科线双卡，引用24年命题组长“英语考能力”的言论说明刷题不够。" },
      { purposeKey: "filter.internship", from: 66, to: 68, note: "10.11 小吴稿：建议寒假找电子信息相关实习，把校内比赛和课设包装成简历里的专业经历，弥补专科阶段空白。" },
      { purposeKey: "window.english-leverage", from: 69, to: 76, note: "10.11 小吴稿：逐项排除专业课、数学、政治都拉不开差距，理工科英语普遍弱，英语口语才是他能建立优势的地方。" },
      { purposeKey: "filter.lab", from: 83, to: 85, note: "10.11 小吴稿：讲进实验室/课题组也要求英语，导师招人先看能不能读英文文献、翻译论文、汇报观点。" },
      { purposeKey: "filter.tutor", from: 86, to: 96, note: "10.11 小吴稿：用广交会翻译三天2400、500美金小费、土木专业出国等例子，说明英语能打开机会和收入。" },
      { purposeKey: "scan.parents", from: 97, to: 98, note: "10.11 小吴稿：学生说家人对他有期望，咨询师接住“男孩子要担家里担子”的情绪，并说家人是在替他扛压力。" },
      { purposeKey: "diag.school-gap", from: 99, to: 106, note: "10.11 小吴稿：讲反差感：二本学生英语流利会让导师记住，学历劣势反而变成独有的红利，前提是英语足够突出。" },
      { purposeKey: "offer.ask-plan", from: 125, to: 128, note: "10.11 小吴稿：问英语打算怎么学，学生说背了还是不会、应试方法没结果，咨询师指出旧方法不适合他。" },
      { purposeKey: "offer.three-needs", from: 129, to: 129, note: "10.11 小吴稿：提出学任何能力的三要素：科学方法、针对性方案、正向反馈，作为后面讲解的总纲。" },
      { purposeKey: "offer.need.path", from: 130, to: 141, note: "10.11 小吴稿：讲科学方法：发音到听说读写，用语言敏感期、音标和连读变音解释为什么必须从发音开始。" },
      { purposeKey: "offer.need.plan", from: 142, to: 143, note: "10.11 小吴稿：讲针对性方案：英语分楼层，先测评发音和听力盲区，再定每天学什么，避免太难或重复已会内容。" },
      { purposeKey: "offer.need.coach", from: 144, to: 146, note: "10.11 小吴稿：讲正向反馈：自己练听不出错，需要有人纠音、告诉他哪里错怎么改，坚持靠反馈不靠意志力。" },
      { purposeKey: "offer.find-teacher", from: 147, to: 148, note: "10.11 小吴稿：问她是不是想跟魏老师长期学，学生说想明天听完再说，并主动提到首期980。" },
      { purposeKey: "trust.self-disclosure", from: 149, to: 152, note: "10.11 小吴稿：讲自己大一没钱、奶奶骨折、妈妈拉她算账的经历，说明为什么后来一定要把能力培养起来。" },
      { purposeKey: "offer.close.risk-reversal", from: 153, to: 159, note: "10.11 小吴稿：介绍七天试学和只交首期的试学方案，不满意可退，消除他怕被套住、怕后面找不到老师的顾虑。" },
      { purposeKey: "offer.handoff", from: 160, to: 165, note: "10.11 小吴稿：讲三个月学出成果、四级320怎么跟助教定计划，以及用积分兑换四级和考研选修课。" },
      { purposeKey: "offer.trust", from: 166, to: 178, note: "10.11 小吴稿：处理“怕后面找不到老师”的顾虑：说明老师会长期答疑、当天回消息，课程资料全包，还有成长私教。" },
      { purposeKey: "offer.close.enroll", from: 179, to: 180, note: "10.11 小吴稿：约今晚或明天找助教，提醒优惠券只有一天时限，确认先试第一期。" },
      { purposeKey: "offer.close.self-fund", from: 181, to: 183, note: "10.11 小吴稿：问她怎么凑钱，学生说工资加生活费不够，咨询师建议后面做英语口语家教补上。" }
    ]
  },
  {
    id: "dz17",
    label: "10.11 小特咨询稿",
    file: "zxg/dz_zxg/10.11罗兰英260301103小特大一985在网上搜到评论说纠音虚假宣传，需要和父母商量_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 2, note: "10.11 小特稿：开头叫“兄弟”，问他在寝室还是单独找了空地，确认通话环境。" },
      { purposeKey: "scan.holiday", from: 3, to: 5, note: "10.11 小特稿：聊江苏到重庆的饮食差异，再问她为什么暑假开始养成预习习惯，她说高中没规划好，咨询师肯定她“没规划都这么优秀”。" },
      { purposeKey: "scan.existing-course", from: 5, to: 11, note: "10.11 小特稿：问暑假报的保研班是什么类型、效果如何，学生说是小班制规划课、九月初报名，会讲政策社团和考研。" },
      { purposeKey: "open.agenda", from: 11, to: 13, note: "10.11 小特稿：说明自己会避免重复讲他已经知道的，按他的真实想法调整内容，先给今天聊天的思路。" },
      { purposeKey: "window.final-goal", from: 14, to: 16, note: "10.11 小特稿：讲以终为始，确认他目标保清华，让他先说已经做了哪些准备、大一想抓什么，引出“想做的太多怕本末倒置”。" },
      { purposeKey: "scan.existing-course", from: 17, to: 18, note: "10.11 小特稿：问编程学习情况，学生说先跟学校节奏，Python在跟黑马程序员自学。" },
      { purposeKey: "scan.worries", from: 19, to: 29, note: "10.11 小特稿：让他把问题一次说完：刷课平台时间、上课抓重点、教材和往年题、平衡学业生活、临时通知。" },
      { purposeKey: "filter.gpa", from: 30, to: 39, note: "10.11 小特稿：针对“上课抓重点”，讲大学老师考核看科研不看教学，抓重点应围绕高绩点，搞懂教材例题和往年题，不必硬跟课堂。" },
      { purposeKey: "diag.environment", from: 40, to: 44, note: "10.11 小特稿：处理同辈焦虑：同学提前学高数下、抢着让老师记住，咨询师提醒别被打乱节奏，按自己的目标走。" },
      { purposeKey: "diag.postgrad.timeline", from: 57, to: 66, note: "10.11 小特稿：讲保研流程：清华更重预推免（7到8月），建议5到6月先参加浙大复旦上交夏令营保底，核心是两年半做出有竞争力的简历。" },
      { purposeKey: "filter.gpa", from: 67, to: 70, note: "10.11 小特稿：讲专业前3%、开局即巅峰、第一年稳住绩点、进重点班，强调第一年名次后面很难追。" },
      { purposeKey: "filter.english", from: 71, to: 72, note: "10.11 小特稿：讲四六级硬门槛和机筛，想冲600+听力必须高分，指出他口语表达和听力是当前要补的。" },
      { purposeKey: "filter.lab", from: 73, to: 78, note: "10.11 小特稿：讲科研两条路（大创、进老师课题组）和竞赛层级，强调在精不在多、一个国家级的含金量顶五个省级。" },
      { purposeKey: "filter.competition", from: 79, to: 82, note: "10.11 小特稿：讲高价值成就事件：简历看结果不看过程，冲1到2个国奖，大创一定要当负责人。" },
      { purposeKey: "filter.competition", from: 83, to: 94, note: "10.11 小特稿：把竞赛分三类：专业类CCPC、蓝桥杯、AI，通用类互联网加、挑战杯、建模，英语类大英赛、外研社；大一先建模和大英赛。" },
      { purposeKey: "filter.lab", from: 95, to: 99, note: "10.11 小特稿：讲组队和进圈子：竞赛科研很排外，大一不进大二就没人带；可通过重点班或课题组自荐，图书馆社团偏兴趣，建议找科研相关社团。" },
      { purposeKey: "filter.lab", from: 100, to: 106, note: "10.11 小特稿：教他跟学长学姐干：先当队员学完整流程，进入科研圈子后角色会翻转；小组作业也可以练领导。" },
      { purposeKey: "filter.one-ability", from: 113, to: 114, note: "10.11 小特稿：他担心信息太多消化不了，咨询师收口：当下就是打基础（编程、英语、绩点），先抓一项核心能力。" },
      { purposeKey: "filter.internship", from: 115, to: 119, note: "10.11 小特稿：建议做大型比赛或学术会议志愿者，看成熟队伍怎么落地，顺便认识高校老师、练英语。" },
      { purposeKey: "filter.internship", from: 120, to: 126, note: "10.11 小特稿：建议大三前积累两份实习，大一暑假和大二寒假去投字节百度腾讯等大厂，实习是为了积累项目和前沿认知。" },
      { purposeKey: "window.competition-pool", from: 127, to: 133, note: "10.11 小特稿：讲赢者思维：对手是C9和985里全国最优秀的一批人，不能只达标，要知道竞争对手是谁、怎么赢。" },
      { purposeKey: "window.competition-pool", from: 134, to: 139, note: "10.11 小特稿：讲清华三道考核：算法上机、综合面试（科研竞赛绩点）、英语面试；高端局比效率和单点亮点。" },
      { purposeKey: "filter.one-ability", from: 140, to: 146, note: "10.11 小特稿：讲单点怎么选：选自己喜欢且别人弱的（英语表达、编程），并在考核规则内选择，不学剪辑这类不考的东西。" },
      { purposeKey: "offer.find-teacher", from: 147, to: 148, note: "10.11 小特稿：他主动问微微老师课程，咨询师让他说想了解什么，顺势进入课程话题。" },
      { purposeKey: "offer.trust", from: 149, to: 153, note: "10.11 小特稿：处理网上“纠音虚假宣传”投诉：解释投诉正常、有对家截流、有合同可退，建议先试再说。" },
      { purposeKey: "offer.need.coach", from: 154, to: 156, note: "10.11 小特稿：用自己的体验讲测评、细化到每天的计划、人工纠音和学练纠闭环。" },
      { purposeKey: "offer.handoff", from: 157, to: 164, note: "10.11 小特稿：讲课程形式：周内视频课、打卡后助教反馈、直播纠音可预约，每天约1小时。" },
      { purposeKey: "offer.find-teacher", from: 165, to: 168, note: "10.11 小特稿：他心动于课程“不传统、创新、翻译家”的讲法，咨询师顺势建议先尝试。" },
      { purposeKey: "offer.close.risk-reversal", from: 169, to: 173, note: "10.11 小特稿：讲先交第一个月、七天全款退，给自己留退路，别一次性付全款。" },
      { purposeKey: "offer.close.parents", from: 177, to: 181, note: "10.11 小特稿：问要不要跟父母商量，得知父母是高校老师且只要他明确表态就支持，咨询师让他大胆尝试、别拖。" }
    ]
  },
  {
    id: "dz18",
    label: "10.11 彤彤咨询稿",
    file: "zxg/dz_zxg/10.11董飞燕26011135彤彤大一自己有钱要跟家里说一下_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "trust.self-disclosure", from: 3, to: 9, note: "10.11 彤彤稿：从亳州号码、同在安大读书聊起，用同乡和共同学校建立相似性。" },
      { purposeKey: "scan.holiday", from: 10, to: 13, note: "10.11 彤彤稿：问开学晚自习时间、暑假背了几百个单词，摸她当下的作息和学习状态。" },
      { purposeKey: "scan.volunteer", from: 14, to: 16, note: "10.11 彤彤稿：追问为什么选通信工程，她说是网上热门好找工作，现在还没上专业课、方向不清晰。" },
      { purposeKey: "scan.parents", from: 20, to: 24, note: "10.11 彤彤稿：从升学宴、家里学历最高问到家里决策一般不听建议、只给经济支持。" },
      { purposeKey: "trust.self-disclosure", from: 25, to: 29, note: "10.11 彤彤稿：讲自己也是家里老大、有弟弟妹妹、高中目标安大没考上，用同款家境拉近距离。" },
      { purposeKey: "diag.motivation", from: 30, to: 31, note: "10.11 彤彤稿：接住她自评“容易拖延、三分钟热度”，把原因归为大学没人管、诱惑多。" },
      { purposeKey: "diag.postgrad.pool", from: 32, to: 38, note: "10.11 彤彤稿：算保研率 13%—18%、前 10%、中科大要前五，并拆解本校 985 和头部 211 的竞争池。" },
      { purposeKey: "filter.timeline", from: 54, to: 55, note: "10.11 彤彤稿：把大三定为保研决胜年，倒推大一大二必须做出科研、竞赛、英语的结果。" },
      { purposeKey: "filter.gpa", from: 56, to: 58, note: "10.11 彤彤稿：大一把 GPA 当命根子，大二通信原理、信号系统等核心课上难度，绩点要提前稳住。" },
      { purposeKey: "filter.english", from: 59, to: 62, note: "10.11 彤彤稿：把大一定义为英语黄金窗口，要求四六级高分、六级 550 起步冲 600，并说明全英文面试。" },
      { purposeKey: "filter.lab", from: 63, to: 66, note: "10.11 彤彤稿：大一先进实验室打杂熟悉环境，大二参与核心项目、冲省奖和论文。" },
      { purposeKey: "filter.timeline", from: 67, to: 68, note: "10.11 彤彤稿：给出夏令营时间轴：3—4 月关注通知、5—6 月备材料、6—7 月参营。" },
      { purposeKey: "filter.lab", from: 69, to: 74, note: "10.11 彤彤稿：讲进实验室的三种方式，并指出老师最看专业课排名和英语查文献、写综述的能力。" },
      { purposeKey: "filter.english", from: 75, to: 77, note: "10.11 彤彤稿：四级口试没报也没关系，口语听力是 211 里最容易拉开差距的突破口。" },
      { purposeKey: "trust.result", from: 78, to: 83, note: "10.11 彤彤稿：用粉丝英文演讲一等奖被导员推荐进项目、室友被老师邀请做大创两个案例证明英语带来机会。" },
      { purposeKey: "filter.competition", from: 85, to: 89, note: "10.11 彤彤稿：建议大一下参加外研社等英语类竞赛，借比赛认识高年级学长学姐，为大二竞赛铺路。" },
      { purposeKey: "offer.handoff", from: 90, to: 93, note: "10.11 彤彤稿：说明课程有效期到毕业后一年，入学测评后按四级目标和备考时间制定周/月计划。" },
      { purposeKey: "offer.close.price", from: 94, to: 96, note: "10.11 彤彤稿：用奖学金和学得快成本低来换算，说可能分期没交完奖已拿到，成本只剩一千多。" },
      { purposeKey: "filter.internship", from: 97, to: 104, note: "10.11 彤彤稿：讲亳州到杭州高铁四小时，寒暑假可去魏老师那边线下实习，积累职场经历。" },
      { purposeKey: "filter.tutor", from: 105, to: 106, note: "10.11 彤彤稿：用安大 211 的牌子和她英语能力，说明英语家教在安徽市场很吃香。" },
      { purposeKey: "offer.handoff", from: 107, to: 109, note: "10.11 彤彤稿：说明正式课一节四五十分钟、一天一节，任务量可按她的反馈调整，时间当天完成即可。" },
      { purposeKey: "offer.close.hesitation", from: 110, to: 111, note: "10.11 彤彤稿：点出今天是优惠第三天、末班车，用时间窗口推动她别拖。" },
      { purposeKey: "offer.close.self-fund", from: 113, to: 117, note: "10.11 彤彤稿：确认升学宴礼金够付、她专门办银行卡存钱，家里对她的钱很放心。" },
      { purposeKey: "diag.environment", from: 121, to: 128, note: "10.11 彤彤稿：反驳“学校没地方练口语”，给出凉亭、空教室、空调室、图书馆一楼等具体场地。" },
      { purposeKey: "offer.close.hesitation", from: 119, to: 129, note: "10.11 彤彤稿：处理“想寒假再学”的拖延，强调能早学就早学、每个阶段都有新的事，别给自己埋雷。" },
      { purposeKey: "offer.close.enroll", from: 130, to: 133, note: "10.11 彤彤稿：说明直播间或找助教都能报、没抢到券助教可协调，交完截图后办理入学。" },
      { purposeKey: "trust.self-disclosure", from: 136, to: 139, note: "10.11 彤彤稿：讲自己英专四级考不过、费很大劲学不明白才跟魏老师学，用挫败经历拉近距离。" },
      { purposeKey: "offer.close.parents", from: 140, to: 143, note: "10.11 彤彤稿：预设父母会问“不是英语专业学来干嘛”，她说会用自己的话讲英语重要性，并坚持自己人生自己过。" },
      { purposeKey: "offer.close.self-fund", from: 144, to: 148, note: "10.11 彤彤稿：给出先交 980 开课、一个月内补齐仍按原价的方案，用妹妹昨晚报名的案例降低压力。" },
      { purposeKey: "offer.trust", from: 149, to: 149, note: "10.11 彤彤稿：建议找助教要公司、老师、课程介绍发给家人，用材料增强父母那边的说服力。" }
    ]
  },
  {
    id: "dz19",
    label: "10.14 小晗咨询稿",
    file: "zxg/dz_zxg/10.14翟菲果260401025小晗大二舞蹈生迷茫_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "diag.postgrad", from: 5, to: 6, note: "10.14 小晗稿：她提到舞蹈考研，咨询师用自己的英语专业举例，说明应用型学科考研后多数还是当老师，只是学历门槛。" },
      { purposeKey: "scan.parents", from: 7, to: 12, note: "10.14 小晗稿：问考公、当兵是不是爸爸铺的路，确认父母自己经营/妈妈上班、爸爸是副村长，所以更希望她进体制内求稳定。" },
      { purposeKey: "window.track-uncertain", from: 15, to: 17, note: "10.14 小晗稿：她说还没找到自己喜欢的东西；咨询师说真正热爱要几年探索，建议先去公司实习感受行业，不必现在立刻定终身。" },
      { purposeKey: "diag.parents", from: 34, to: 45, note: "10.14 小晗稿：她讲父母保护过度、不让出去上班、旅游被短视频吓到驳回、爸爸强制；咨询师承认这种控制真实存在并接住她的受挫。" },
      { purposeKey: "trust.self-disclosure", from: 46, to: 49, note: "10.14 小晗稿：咨询师讲自己大一从广州去杭州实习，又讲海南朋友被爸爸管、靠家教证明自己、自己交民办二本学费，最后说服父母。" },
      { purposeKey: "diag.major.second-card", from: 63, to: 67, note: "10.14 小晗稿：她说不了解舞蹈以外的专业；咨询师讲80%本科生不从事本专业，舞蹈可以保留为技能，不必把命运押在专业上。" },
      { purposeKey: "window.english-leverage", from: 68, to: 71, note: "10.14 小晗稿：把能力分成专业能力和通用能力，指出外贸、外企、运营岗不挑专业，英语强是通用加分项。" },
      { purposeKey: "window.competition-pool", from: 74, to: 78, note: "10.14 小晗稿：讲教师编缩招、考公350万人抢4万岗位，报录比约90:1，建议大二大三先实习，大四再决定是否考公。" },
      { purposeKey: "filter.timeline", from: 83, to: 86, note: "10.14 小晗稿：解释秋招春招是大四收获offer的节点，学校招聘企业层次有限，建议自己投邯郸、石家庄、邢台的实习。" },
      { purposeKey: "filter.internship", from: 86, to: 98, note: "10.14 小晗稿：讲大一大二找实习难在没经验，但可以先靠英语做家教/教培；又对比政府实习、返家乡志愿没含金量，建议去优质企业学真本事。" },
      { purposeKey: "filter.competition.types", from: 112, to: 116, note: "10.14 小晗稿：她问大英赛分数线和三等奖，咨询师解释豆包按全国水平算不准，大英赛是和本校同学PK，能力上来后拿奖不难。" },
      { purposeKey: "diag.english.method", from: 131, to: 135, note: "10.14 小晗稿：她买了四级真题只写一半，咨询师指出刷题刷不完、每天刷一套也未必过，问题在方法而不是题量。" },
      { purposeKey: "filter.certificates", from: 159, to: 172, note: "10.14 小晗稿：她想考舞蹈教资，咨询师算清笔试面试要一年、报名费和资料费，并说明教资面向社会人、随时可考，四六级才限大学生。" },
      { purposeKey: "filter.competition", from: 175, to: 181, note: "10.14 小晗稿：她抱怨导员不发竞赛信息，咨询师指出英语类竞赛是通用证书，简历不能只写教资、普通话、计算机，要针对性证明能力。" },
      { purposeKey: "diag.school-gap", from: 182, to: 182, note: "10.14 小晗稿：HR同时面对985/211和民办本科，必须有一项优于别人的能力证明潜力，否则只能随大流被筛。" },
      { purposeKey: "offer.three-pitfalls", from: 186, to: 186, note: "10.14 小晗稿：指出基础薄弱自学很难学好，这也是清华北大学生也报班的原因，把问题归到路径和方法而不是她个人。" },
      { purposeKey: "offer.pitfall.sunk", from: 199, to: 202, note: "10.14 小晗稿：她初中报过高途线上课没效果，咨询师指出不是线上线下问题，而是过去每天看不到效果、没有正反馈。" },
      { purposeKey: "offer.three-needs", from: 203, to: 208, note: "10.14 小晗稿：讲坚持靠正反馈，不是纯意志力；课程有入学测评、阶段测试、每天打卡纠音，按基础分楼层制定计划。" },
      { purposeKey: "offer.trust", from: 209, to: 213, note: "10.14 小晗稿：讲父母不了解课程保障，但跟老师学还能拿到认知和思维方式；机构每月招线上实习生，Jason老师00后CEO，能破圈。" },
      { purposeKey: "offer.self-study", from: 216, to: 221, note: "10.14 小晗稿：她说没想过报课，想用手里的资料和B站免费课自学；又担心线上效果，说如果是线下才会考虑。" },
      { purposeKey: "diag.ai", from: 231, to: 236, note: "10.14 小晗稿：用普通人和优秀人吃一堑的差别，讲学历门槛和AI替代：医生、舞蹈、计算机专业都可能被AI机器人取代，必须有一项AI替代不了的能力。" },
      { purposeKey: "diag.money", from: 237, to: 247, note: "10.14 小晗稿：她讲找兼职被骗360押金、中间商写字楼、自拍置换也要押金；咨询师指出没认知就容易踩坑，生活费本来就不够。" },
      { purposeKey: "offer.close.enroll", from: 265, to: 272, note: "10.14 小晗稿：她问名额没了怎么办，咨询师说只能原价报，想保留优惠名额要交100定金并签协议。" },
      { purposeKey: "offer.close.parents", from: 273, to: 279, note: "10.14 小晗稿：她纠结没跟爸妈说、怕他们反对；咨询师建议先跟爸妈讲为什么学英语、用分期和证明材料沟通，实在不同意先交定金。" },
      { purposeKey: "filter.postgrad-plan", from: 283, to: 285, note: "10.14 小晗稿：讲考研英语及格线只有三四十分，若英语能考七八十分就能拉开四十分差距，为考研提前准备。" },
      { purposeKey: "offer.need.coach", from: 300, to: 304, note: "10.14 小晗稿：她担心线上学习和意志力，咨询师讲每天只学五个音标、利用水课时间，老师会督促打卡，线上自习室氛围也能带动坚持。" },
      { purposeKey: "offer.confirm-need", from: 305, to: 309, note: "10.14 小晗稿：爸爸让她问妈妈，她自己也不坚定；咨询师用四级和大英赛结果证明她自学没效果，问题在方法和词汇量。" },
      { purposeKey: "scan.family-burden", from: 313, to: 318, note: "10.14 小晗稿：她说妈妈当月嫂很辛苦、弟弟辍学，全家托举她一个人；咨询师借此说明她更该尽早行动，让父母少一份精神压力。" },
      { purposeKey: "offer.close.hesitation", from: 319, to: 324, note: "10.14 小晗稿：四级时间越来越近，咨询师让她在课程和杂事之间做取舍，指出她仍在摇摆，需要自己先坚定。" },
      { purposeKey: "window.english-leverage", from: 325, to: 329, note: "10.14 小晗稿：她目标只是过四级，咨询师说四六级高分本身没用，HR要的是能交流使用英语；985学生也可能哑巴英语，能力才是差异。" }
    ]
  },
  {
    id: "dz20",
    label: "10.17 小马咨询稿",
    file: "zxg/dz_zxg/10.17尹蓥260301058小马-本来想过俩月自己挣钱了再报_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 5, note: "10.17 小马稿：开场喊“小马”，问她上午开班会/团委见面会、是不是大一成员，用轻松话题确认本人和环境。" },
      { purposeKey: "open.questionnaire", from: 6, to: 6, note: "10.17 小马稿：复述问卷里“想保研考研、去大疆实习、赚钱实现经济独立”，并说她比身边男生更有规划，用细节让她感到被认真看过。" },
      { purposeKey: "scan.volunteer", from: 7, to: 11, note: "10.17 小马稿：追问太原理工志愿顺序填反、被中北“截胡”，以及学校明年升双一流，弄清她对学校和专业的接受度。" },
      { purposeKey: "open.agenda", from: 33, to: 34, note: "10.17 小马稿：问她保研和考研更想先了解哪个，她说先考研，咨询师就按她的顺序展开。" },
      { purposeKey: "trust.permission", from: 35, to: 36, note: "10.17 小马稿：讲考研前先让她找纸笔，说信息差要先记下来，并允许她随时打断。" },
      { purposeKey: "diag.postgrad", from: 12, to: 26, note: "10.17 小马稿：把问卷里“优先保研还是考研”拆开，讲保研看绩点、四六级、比赛和夏令营，以及保研与考研准备内容的重合。" },
      { purposeKey: "diag.postgrad.pool", from: 27, to: 32, note: "10.17 小马稿：围绕北航C9、父母希望西工大、她自己想南航211，讲目标院校竞争池，建议冲985、用211保底。" },
      { purposeKey: "diag.postgrad.timeline", from: 37, to: 37, note: "10.17 小马稿：明确考研初试在大四上学期12月，先把考试时间点钉住。" },
      { purposeKey: "diag.postgrad.pool", from: 38, to: 49, note: "10.17 小马稿：逐一分析竞争对手：985/211、双一流逆袭者、末流一本黑马、家里有资源人脉的人，让她看到竞争池的真实构成。" },
      { purposeKey: "diag.postgrad.timeline", from: 50, to: 58, note: "10.17 小马稿：讲初试四科、专业课200分、政治必考、总分500，以及大一大二先跟学校课程打基础。" },
      { purposeKey: "diag.postgrad.strategy", from: 59, to: 70, note: "10.17 小马稿：分科讲投入节奏：专业课跟课加思维导图、政治考前5-6个月背时政、数学大三集中刷题，不平均用力。" },
      { purposeKey: "diag.english.speed", from: 71, to: 79, note: "10.17 小马稿：拿考研英语对标六级，讲985要80+、211要70+，四级580/六级550才是稳的基础，不能只靠刷题背单词。" },
      { purposeKey: "diag.english.qualification", from: 80, to: 84, note: "10.17 小马稿：学校大一不让考四级，咨询师把“晚一年”重新解释成大二直接冲高分，并让她先用真题自测水平。" },
      { purposeKey: "diag.english", from: 95, to: 98, note: "10.17 小马稿：用大学英语课只讲课文、老师不教四六级和考研，说明英语拉分不靠学校师资，只能额外找方法。" },
      { purposeKey: "window.english-leverage", from: 99, to: 113, note: "10.17 小马稿：讲考研复试的英文自我介绍、抽论文翻译、英文专业问答，说明口语短期提不上来，英语会横向卡住复试。" },
      { purposeKey: "diag.english.method", from: 114, to: 123, note: "10.17 小马稿：纠正她“先学一年发音再练读写”的理解，讲发音和发音规则一个月打底，听说同步、读写随后，不能拆开学。" },
      { purposeKey: "diag.too-many", from: 124, to: 128, note: "10.17 小马稿：她已经报了板绘和编程、每月近900，还在纠结英语课，咨询师帮她把时间、金钱和主线摊开。" },
      { purposeKey: "diag.money", from: 129, to: 139, note: "10.17 小马稿：算3980的课分四期每月约1000、生活费2000，问她接单后能否覆盖，先把经济账算清。" },
      { purposeKey: "offer.close.price", from: 131, to: 134, note: "10.17 小马稿：解释课程不是几个月速成，而是发音到四六级、考研口语的全体系，分期可2-4个月。" },
      { purposeKey: "window.python-reality", from: 141, to: 145, note: "10.17 小马稿：拆板绘接单现实：描线10-20元一单、头像400元但客源少、改稿耗时，说明副业没那么快回本。" },
      { purposeKey: "filter.tutor", from: 146, to: 152, note: "10.17 小马稿：讲英语家教变现：学一个月发音就能教小学生，时薪50到80再到100，周末8小时月入1600-3000。" },
      { purposeKey: "window.english-leverage", from: 156, to: 160, note: "10.17 小马稿：用大疆实习两轮面试、第二轮全英文、HR说“不招只会中文的工程师”，说明英语直接决定实习机会。" },
      { purposeKey: "filter.competition", from: 160, to: 164, note: "10.17 小马稿：大一不能考四六级，就先把大英赛、外研社国才杯等英语竞赛顶上，并发给她比赛清单。" },
      { purposeKey: "diag.money", from: 165, to: 178, note: "10.17 小马稿：她说要等板绘/编程接单后再报，咨询师算下月支出叠加的风险，并讲自己分期980、可延交保留进度的经历。" },
      { purposeKey: "offer.pitfall.feedback", from: 174, to: 176, note: "10.17 小马稿：指出网上找资料/博主只会给皮毛，自己读错发音没人纠正，会先花一个月纠错再学正确的。" },
      { purposeKey: "offer.close.parents", from: 179, to: 192, note: "10.17 小马稿：她打算回家跟父母说，咨询师问父母是否怕被骗，教她先讲规划、再拿营业执照/央视采访/试学证明沟通。" },
      { purposeKey: "offer.trust", from: 185, to: 187, note: "10.17 小马稿：用机构开了七八年、营业执照、教学成果专利、央视采访等材料，回应父母“怕被骗”的担心。" },
      { purposeKey: "offer.close.risk-reversal", from: 192, to: 193, note: "10.17 小马稿：介绍七天试学、七天内学多少退多少，用零成本试错降低她和父母的决策风险。" },
      { purposeKey: "filter.competition", from: 198, to: 202, note: "10.17 小马稿：讲广交会志愿者含金量堪比比赛一等奖，英语门槛能写进简历，建议她用来替代普通志愿时长。" }
    ]
  },
  {
    id: "dz21",
    label: "10.17 美琼咨询稿",
    file: "zxg/dz_zxg/10.17尹蓥260301063美琼大一-本来想先自学试试_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 2, note: "10.17 美琼稿：开场叫出名字、确认声音清楚，用“声音好甜”轻松落地。" },
      { purposeKey: "scan.holiday", from: 3, to: 9, note: "10.17 美琼稿：问午休、五点校园跑和100公里任务，了解大一开学后的作息与运动安排。" },
      { purposeKey: "scan.parents", from: 10, to: 10, note: "10.17 美琼稿：确认学生在贵州本省上大学，妈妈希望她留在省内方便回家。" },
      { purposeKey: "open.questionnaire", from: 11, to: 11, note: "10.17 美琼稿：复述问卷里的具体信息：英语专业、想读研、想经济独立、想练流利口语，并提到她已在自学口语。" },
      { purposeKey: "diag.english", from: 12, to: 17, note: "10.17 美琼稿：从大学英语课“有点水”切入，用商务英语朋友大三仍不能自由交流、班里只有一两个人口语好，说明课堂解决不了口语。" },
      { purposeKey: "diag.major.reality", from: 18, to: 20, note: "10.17 美琼稿：回应“英专毕业就失业”，指出失业的是口语没学出来的人，口语是英专的天花板，学出来外企/涉外岗位不卡学历。" },
      { purposeKey: "window.english-leverage", from: 21, to: 23, note: "10.17 美琼稿：用暑假口语培训一个月一万、学姐非英专靠雅思进上海外企应届2万、项目提成最高四五万，说明口语的变现空间。" },
      { purposeKey: "filter.competition", from: 24, to: 32, note: "10.17 美琼稿：从大英赛、国才杯聊到特斯拉校园展示活动，讲大一学生因口语流利被外企老板看到，强调越早展示机会越多。" },
      { purposeKey: "diag.major", from: 33, to: 35, note: "10.17 美琼稿：点出“英专不等于英语好”，要打破专业光环，把英语当能力而不是当身份。" },
      { purposeKey: "diag.english.speed", from: 36, to: 38, note: "10.17 美琼稿：拆学校课程bug：精读、语法、翻译、文学都是学术英语，职场要的是开口、写邮件、谈判，学和用割裂。" },
      { purposeKey: "diag.ai", from: 39, to: 41, note: "10.17 美琼稿：讲AI会替代简单文档翻译和对话，但替代不了真人沟通、谈判和现场表达，所以口语是生存技能。" },
      { purposeKey: "diag.postgrad", from: 41, to: 44, note: "10.17 美琼稿：顺着问卷问考研，学生说没想好、当老师评级有用，咨询师追问职业方向，学生说只要能养活自己。" },
      { purposeKey: "window.final-goal", from: 44, to: 52, note: "10.17 美琼稿：用口语辅导一年八个月八万、体制外机构缺口语老师、读研本质也是就业，说明读不读研最终都落到就业。" },
      { purposeKey: "filter.internship", from: 54, to: 62, note: "10.17 美琼稿：讲自己大一去英语助教实习、第一份实习最难、之后滚雪球，建议学生学半学期后寒暑假去实习。" },
      { purposeKey: "offer.self-study", from: 69, to: 70, note: "10.17 美琼稿：学生说想先按魏老师的方法自己练一下、实在不行再报；咨询师接住这个自学方案，再追问她是怕花钱还是怕学不出来。" },
      { purposeKey: "diag.parents", from: 70, to: 74, note: "10.17 美琼稿：学生怕花家里的钱学不出来、怕父母失望，咨询师区分父母的经济压力和精神担心，说现在能回报的是把能力练出来。" },
      { purposeKey: "diag.motivation", from: 74, to: 78, note: "10.17 美琼稿：学生说自己反应慢、怕跟不上、怕被嘲笑，咨询师用面对面聊天正常、基础差不是问题来接住。" },
      { purposeKey: "offer.trust", from: 79, to: 84, note: "10.17 美琼稿：用老师高考三次、自创方法、带团队打磨课程、海外公派机会，说明老师不会嘲笑基础差的学生。" },
      { purposeKey: "offer.pitfall.sunk", from: 85, to: 89, note: "10.17 美琼稿：咨询师自曝花近8000报口语班，被分ABCD营反复续费，退费只退一点，从此对英语课谨慎。" },
      { purposeKey: "offer.compare", from: 90, to: 94, note: "10.17 美琼稿：学生提到49元五天团课，咨询师拆穿“一个点当卖点”，对比机构凑课时和老师一个月教完发音规则。" },
      { purposeKey: "offer.need.path", from: 95, to: 100, note: "10.17 美琼稿：讲方法顺序：发音→音标/发音规则→针对性练习→听力口语→长难句文章，并用12岁语言敏感期解释不能只靠多听。" },
      { purposeKey: "offer.need.plan", from: 100, to: 103, note: "10.17 美琼稿：强调先测评听说读写薄弱点，再按基础制定细到每天/每周/每月的计划，并阶段复测。" },
      { purposeKey: "offer.need.coach", from: 104, to: 123, note: "10.17 美琼稿：用舌位、口腔开合、发音时长、连读略读说明必须有人纠正；学生自学一周没检测，咨询师指出没有反馈会把错误发音练得更深。" },
      { purposeKey: "offer.pitfall.feedback", from: 104, to: 123, note: "10.17 美琼稿：指出学生自学只跟读、没人纠正，练一周也没有检测；缺反馈会让错误发音被反复巩固。" },
      { purposeKey: "diag.money", from: 124, to: 133, note: "10.17 美琼稿：学生只有1000压岁钱，爸妈支持但自己怕学不出来、觉得数额大，咨询师说自己当年也只有几百块。" },
      { purposeKey: "filter.tutor", from: 134, to: 137, note: "10.17 美琼稿：讲口语家教时薪可达250，学会发音后先教小学生50/小时，周六日一天4小时一周400。" },
      { purposeKey: "offer.close.price", from: 138, to: 141, note: "10.17 美琼稿：说明可分期四期、每月900-1000，学一个月后做家教一月1600，能覆盖生活费并自己交学费。" },
      { purposeKey: "offer.close.risk-reversal", from: 142, to: 146, note: "10.17 美琼稿：介绍七天试学，七天内不满意助教全额退款，把分期和试学组合成零成本试错。" },
      { purposeKey: "offer.close.parents", from: 147, to: 150, note: "10.17 美琼稿：建议把笔记、录音、视频给爸妈看，一对一群拉爸妈进群，用可见的学习过程争取支持。" },
      { purposeKey: "offer.handoff", from: 150, to: 161, note: "10.17 美琼稿：说明英语老师和大学生活老师双师服务：测评、定制计划、动态调整、随时答疑。" }
    ]
  },
  {
    id: "dz22",
    label: "10.17 文静咨询稿",
    file: "zxg/dz_zxg/10.17郭璐瑶260301114文静大一，自己手里有第一期的钱，家里很困难，一个月生活费1000，家里父母也是比较犟的那一种，学生打算自己学，申请了特殊分期.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "diag.major.reality", from: 2, to: 4, note: "10.17 文静稿：确认临床医学岗位硬性要求读研读博、培养周期长，进医院基本要博士。" },
      { purposeKey: "diag.postgrad", from: 20, to: 21, note: "10.17 文静稿：问她考研了解到什么程度，她只知道要关心政治经济文化，咨询师点出初试复试和全英交流。" },
      { purposeKey: "diag.english", from: 22, to: 24, note: "10.17 文静稿：用学姐笔试 403 分却因口语复试被刷的案例，说明英语口语在考研复试的致命性。" },
      { purposeKey: "trust.self-disclosure", from: 25, to: 30, note: "10.17 文静稿：讲自己专业被调剂、不想干本行所以选择直接就业，再反问她愿不愿意读三年不喜欢的专业。" },
      { purposeKey: "window.english-leverage", from: 34, to: 34, note: "10.17 文静稿：把英语和考研、进课题组、读英文文献直接挂钩，说明大一学英语正当时。" },
      { purposeKey: "offer.find-teacher", from: 35, to: 39, note: "10.17 文静稿：接住她“跟风”报课的说法，说明只有自己需要才会掏钱，并确认她想跟魏老师学。" },
      { purposeKey: "diag.english.method", from: 40, to: 41, note: "10.17 文静稿：指出她还在用高中那套方法应对大学更高难度的英语，方法不变难度变了。" },
      { purposeKey: "diag.parents", from: 42, to: 47, note: "10.17 文静稿：她说家里不太支持、说了也白说，咨询师接住“至亲至疏是亲人”，确认她打算靠自己。" },
      { purposeKey: "diag.money", from: 48, to: 52, note: "10.17 文静稿：算她手里只够付一学期、第二期会困难，把问题落到分期和后续资金来源。" },
      { purposeKey: "scan.money", from: 53, to: 55, note: "10.17 文静稿：问出她每月生活费 1000，勤工岗位又和课表冲突，确认可支配空间很小。" },
      { purposeKey: "offer.close.hesitation", from: 56, to: 58, note: "10.17 文静稿：处理她第一次报网课、怕钱白花的顾虑，把担心解释成“证明你很想学好”。" },
      { purposeKey: "trust.result", from: 59, to: 62, note: "10.17 文静稿：讲自己大一报课、四六级 500 多、口语自由交流、大二开始家教，并说明课程可学到毕业后一年。" },
      { purposeKey: "offer.close.self-fund", from: 63, to: 67, note: "10.17 文静稿：建议她找助教多分两期、把生活费和经济情况说清楚，给助教压力争取特殊分期。" },
      { purposeKey: "offer.handoff", from: 68, to: 71, note: "10.17 文静稿：解释积分兑换后续课程、基础课补发音听说读写，四六级/考研/雅思课都包含。" },
      { purposeKey: "offer.close.hesitation", from: 72, to: 74, note: "10.17 文静稿：反对拖到明年，指出大二课题组就要用英语、专业课变多、钱也不会变少。" },
      { purposeKey: "offer.close.self-fund", from: 75, to: 79, note: "10.17 文静稿：算四期/五期每月六七百、服务费只多几十到一百，并讲自己当年东拼西凑、借闺蜜 200 的经历。" },
      { purposeKey: "offer.close.self-fund", from: 80, to: 92, note: "10.17 文静稿：把助学金当成后续期资金来源，讲申请、公示、分两次发放的流程，缓解她怕断供的焦虑。" },
      { purposeKey: "diag.english", from: 104, to: 106, note: "10.17 文静稿：用学校每天做四六级试卷、英语一直折磨她，强化现在必须抓英语。" },
      { purposeKey: "offer.close.hesitation", from: 122, to: 127, note: "10.17 文静稿：算报名后 11 月才交下一期、助学金公示后很快发钱，劝她别拖，拖到后面只有自己吃亏。" },
      { purposeKey: "offer.handoff", from: 128, to: 133, note: "10.17 文静稿：确认每天 1 小时就够，说明入学测评、周一到周五视频课、周末直播课和回放机制。" },
      { purposeKey: "offer.close.followup", from: 200, to: 202, note: "10.17 文静稿：收尾让她继续问助教申请分期、有进展再反馈，并约定后续微信联系。" }
    ]
  },
  {
    id: "dz23",
    label: "10.18 小豪咨询稿",
    file: "zxg/dz_zxg/10.18+胡余敏+260401083+小豪+专二+打算自己凑第一期学_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 3, note: "10.18 小豪稿：确认能否听清、人在教室，简短落地后进入正题。" },
      { purposeKey: "scan.family-burden", from: 4, to: 8, note: "10.18 小豪稿：确认他是家里老大、下面有妹妹、父母打工，先拿到家庭结构和经济背景。" },
      { purposeKey: "filter.track", from: 8, to: 10, note: "10.18 小豪稿：把当兵和升本摆在一起，指出当兵竞争大，短期主目标应放在升本。" },
      { purposeKey: "diag.english", from: 11, to: 20, note: "10.18 小豪稿：拆江苏专转本科目和分值，重点算英语四级折算，425只有72分、550能到93分，英语是唯一能拉开二三十分的科目。" },
      { purposeKey: "window.final-goal", from: 25, to: 28, note: "10.18 小豪稿：把终极目标拉回就业，说明本科是准入线、研究生也不等于竞争力，避免他把升本当终点。" },
      { purposeKey: "diag.school-gap", from: 29, to: 33, note: "10.18 小豪稿：讲专转本在网申、研发岗、车间起薪上的现实落差，先承认学历会被筛。" },
      { purposeKey: "diag.major.reality", from: 37, to: 39, note: "10.18 小豪稿：讲基层技术岗和本科生挤在一起、三四年卡在四五千，指出只会实操不够。" },
      { purposeKey: "window.english-leverage", from: 39, to: 43, note: "10.18 小豪稿：用长三角设备英文说明书、海外技术支持岗位，说明英语能把他从车间拉到海外业务。" },
      { purposeKey: "filter.competition", from: 46, to: 48, note: "10.18 小豪稿：分析专业竞赛周期四五个月、拿奖难，建议当下先放一放，把时间给英语。" },
      { purposeKey: "diag.postgrad", from: 50, to: 56, note: "10.18 小豪稿：回应他想升本后考研，算读研学费两三万、复试要和985/211竞争，说明考研不是逃避就业。" },
      { purposeKey: "scan.score", from: 58, to: 62, note: "10.18 小豪稿：问出他是中专上来、英语基础比同龄人弱，确认差距来自底子而非努力。" },
      { purposeKey: "diag.english", from: 62, to: 70, note: "10.18 小豪稿：区分“努力”和“方法”，用背单词忘了、听力语速180词/分钟，说明缺的是高效方法。" },
      { purposeKey: "diag.environment", from: 82, to: 83, note: "10.18 小豪稿：接住他说大专氛围差、朋友打游戏，讲人是环境产物，要么认知够强要么被带跑。" },
      { purposeKey: "offer.pitfall.environment", from: 82, to: 83, note: "10.18 小豪稿：把宿舍打游戏、大专氛围差归为“缺环境”，而不是简单说他不自律。" },
      { purposeKey: "trust.result", from: 84, to: 88, note: "10.18 小豪稿：讲广东专科女生跟老师学英语、升本又积累2—3段实习，被总经理评价比本科生优秀。" },
      { purposeKey: "filter.internship", from: 90, to: 92, note: "10.18 小豪稿：把实习途径归为内推、海投、付费三种，并强调无论哪种都要自身能力够。" },
      { purposeKey: "offer.ask-plan", from: 94, to: 94, note: "10.18 小豪稿：先问“英语接下来打算怎么学”，不急着推课，先听他的方案。" },
      { purposeKey: "offer.close.price", from: 98, to: 100, note: "10.18 小豪稿：确认他心动但掏不出三千多，引出分期选项。" },
      { purposeKey: "offer.close.self-fund", from: 101, to: 103, note: "10.18 小豪稿：问他有没有小金库，得知刚换手机花完，建议先问助教分期、先学一个月。" },
      { purposeKey: "offer.close.parents", from: 112, to: 117, note: "10.18 小豪稿：问出他不想跟妈妈说、怕妈妈以为是骗子，转到“用生活费顶分期”的自筹方案。" },
      { purposeKey: "offer.trust", from: 113, to: 115, note: "10.18 小豪稿：用自己的经历回应“骗子”担忧——有线下实习、可核实，不回避学校刚出的缅甸事件。" },
      { purposeKey: "offer.close.self-fund", from: 117, to: 131, note: "10.18 小豪稿：细算生活费能攒1000—1200、首期980、可找同学借一千，甚至提出自己可先垫一部分。" },
      { purposeKey: "offer.close.price", from: 120, to: 122, note: "10.18 小豪稿：把四期分期具体到首期980、后面每月约1000，让他判断是否影响吃饭。" },
      { purposeKey: "offer.close.risk-reversal", from: 102, to: 103, note: "10.18 小豪稿：提出先学一个月、发音学完看效果，降低他一次性投入的风险感。" },
      { purposeKey: "window.ai-era", from: 172, to: 177, note: "10.18 小豪稿：用机器替代产线、老干妈只留几个人的例子，说明技术和沟通里什么才不可替代。" },
      { purposeKey: "filter.certificates", from: 106, to: 108, note: "10.18 小豪稿：回应学生会主席和Excel证书，指出校招里这类履历只是小加分，不算硬核。" },
      { purposeKey: "offer.need.plan", from: 151, to: 152, note: "10.18 小豪稿：讲入学测评会测发音到听说读写，再按专升本目标定制学习方案。" },
      { purposeKey: "offer.handoff", from: 137, to: 140, note: "10.18 小豪稿：说明报名后配两个老师——一个解决英语问题、一个督学并解答成长困惑，还会拉群。" },
      { purposeKey: "offer.close.enroll", from: 130, to: 130, note: "10.18 小豪稿：明确下一步先问助教分期和优惠，经济有问题再一起想办法。" },
      { purposeKey: "offer.close.followup", from: 178, to: 179, note: "10.18 小豪稿：以“等你好消息”收尾，约定后续微信联系。" }
    ]
  },
  {
    id: "dz24",
    label: "10.24 米粒咨询稿",
    file: "zxg/dz_zxg/10.24翟菲果大二260401036米粒法学民办本科就业_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 5, note: "10.24 米粒稿：从她发的表情包和位置聊起，确认她在学校路边、舍友在化妆、自己出来接电话，先落地寒暄。" },
      { purposeKey: "scan.family-burden", from: 6, to: 10, note: "10.24 米粒稿：问学费是贷款还是父母付，她说两万多由父母先交；又确认家里孩子多、共五个，经济负担不轻。" },
      { purposeKey: "scan.existing-course", from: 12, to: 20, note: "10.24 米粒稿：问大一有什么成就，她说基本在校上课、四级考了没过，身边同学有人考过，自己大一没做出什么。" },
      { purposeKey: "filter.track", from: 21, to: 25, note: "10.24 米粒稿：她明确想先就业、考法考，担心民办本科考研被歧视；咨询师把就业、考研、法考几条路摆开，确认她以就业为主。" },
      { purposeKey: "window.final-goal", from: 29, to: 30, note: "10.24 米粒稿：确认以就业为主后，指出大四秋招才是收获高薪offer的时候；她问考公，咨询师说考公比考研更难。" },
      { purposeKey: "filter.timeline", from: 31, to: 34, note: "10.24 米粒稿：用国考人数多于考研说明每条路都难，强调大二到大四提升时间不多，寒暑假必须去实习。" },
      { purposeKey: "filter.gpa", from: 39, to: 50, note: "10.24 米粒稿：逐项讲奖学金：国家励志6000、学校降龙奖学金5000要求专业+综测前20%、校奖学金一二三等金额，帮她判断绩点投入产出。" },
      { purposeKey: "filter.tutor", from: 51, to: 54, note: "10.24 米粒稿：校一等奖才1500且很难评，咨询师算账说做家教一小时50元、30小时就能挣1500，不如把时间投到能力上。" },
      { purposeKey: "trust.result", from: 55, to: 60, note: "10.24 米粒稿：讲民办师姐大三提车、还清助学贷款、做自媒体、逢年过节给爸爸发红包，用真实结果说明大学还有别的可能。" },
      { purposeKey: "window.subtract", from: 61, to: 64, note: "10.24 米粒稿：讲大二大三全力准备简历、大四秋招收获，不能竞赛证书实习什么都抓，要抓对考研就业都有用的关键项，先做减法聚焦主线。" },
      { purposeKey: "window.final-goal", from: 65, to: 68, note: "10.24 米粒稿：解释以终为始就是先定就业目标再倒推行动；给出就业落实率20%出头、800万人没满意工作、研究生送外卖的数据。" },
      { purposeKey: "diag.major.reality", from: 69, to: 75, note: "10.24 米粒稿：分析就业难的本质是学校教的理论与社会需要不匹配，教材老旧、考完就忘，律所和金融企业要能实操创造价值的人。" },
      { purposeKey: "window.competition-pool", from: 84, to: 86, note: "10.24 米粒稿：用及格线60分和录取要八九十分作类比，说明面试要有超出岗位要求的额外竞争力，学历劣势下才有机会。" },
      { purposeKey: "window.442", from: 87, to: 99, note: "10.24 米粒稿：完整讲442法则：学历20%、经历40%、能力40%；学历是敲门砖决定机会，能力决定能不能留下。" },
      { purposeKey: "filter.certificates", from: 102, to: 104, note: "10.24 米粒稿：把校内经历拆成证书和实践活动，指出四六级比普通话、计算机含金量高，法考留到大四，大二先拿四六级高分。" },
      { purposeKey: "filter.competition.choose", from: 105, to: 108, note: "10.24 米粒稿：讲竞赛分科研、学科、专业三类，科研团队赛准备3—6个月还未必获奖，建议她先集中打个人英语竞赛，大英赛在本校排名可拿省奖，先拿一个奖。" },
      { purposeKey: "filter.competition.types", from: 109, to: 119, note: "10.24 米粒稿：重点介绍法学专业竞赛——山东省大学生模拟法庭竞赛，10月组队、11月底比赛，是省级第一梯队，建议找指导老师和获奖学长学姐。" },
      { purposeKey: "filter.internship", from: 128, to: 132, note: "10.24 米粒稿：讲大二实习不必专业对口，先去优质企业积累职场素养、工作习惯、汇报能力；好实习要先有能力，且要拿结果不能只盖章。" },
      { purposeKey: "filter.one-ability", from: 133, to: 141, note: "10.24 米粒稿：把能力分成专业能力和通用能力，专业能力在校难培养，民办本科更应侧重通用能力，先选一项核心能力突破。" },
      { purposeKey: "filter.english", from: 142, to: 145, note: "10.24 米粒稿：通用能力落到沟通表达和英语两项，英语链接四六级、考研、实习和顶尖律所，且要能实际使用而不只是考试。" },
      { purposeKey: "diag.ai", from: 151, to: 153, note: "10.24 米粒稿：指出AI比人更会考高分，但不能代替人沟通交流，AI翻译死板、专业术语一般，所以英语应用能力仍有价值。" },
      { purposeKey: "diag.major.reality", from: 156, to: 158, note: "10.24 米粒稿：让她去招聘软件看律所岗位到底要求什么能力，指出这些学校不教，学历劣势时更要靠潜力和实习证明自己。" },
      { purposeKey: "window.english-leverage", from: 162, to: 164, note: "10.24 米粒稿：英语不只是四六级，还能做家教、参加竞赛、认识更优秀的人、破圈，打开思维和眼界。" },
      { purposeKey: "offer.need.plan", from: 174, to: 177, note: "10.24 米粒稿：讲针对性方案：不能学远超当前水平的内容，也不能在已会的内容上反复练；要按音标、拼读、连读弱读、语感表达分楼层，先测出她在哪一层。" },
      { purposeKey: "offer.three-needs", from: 168, to: 183, note: "10.24 米粒稿：完整讲英语提升三要素：科学方法从发音开始、针对性学习方案、纠正和正反馈；并用英语分楼层解释为什么要按基础学。" },
      { purposeKey: "trust.result", from: 183, to: 187, note: "10.24 米粒稿：问到她高考英语九十多，讲专升本朋友高考三四十分、学英语后四级高分、做家教、实习、升本，用案例证明方法对了能逆袭。" },
      { purposeKey: "filter.track", from: 190, to: 193, note: "10.24 米粒稿：讲大四法考难度高、要做好二战准备，英语可作为备选能力，山东港口和跨境电商外贸公司多，可转外贸实习。" },
      { purposeKey: "offer.find-teacher", from: 194, to: 196, note: "10.24 米粒稿：问她是否想跟老师学，她说课讲得好、挺有收获，但还有一点顾虑。" },
      { purposeKey: "offer.close.hesitation", from: 197, to: 201, note: "10.24 米粒稿：她顾虑突然插进学习会打乱原有规划、时间安排不过来；咨询师说明每天只需一小时、老师只做大学生教育、懂大学生痛点。" },
      { purposeKey: "offer.close.followup", from: 202, to: 203, note: "10.24 米粒稿：收尾让她先整理笔记并发给自己看，提醒十一点半了先去吃饭，约定后续再看笔记。" }
    ]
  },
  {
    id: "dz26",
    label: "10.3 刘书潭（欣雨）咨询稿",
    file: "zxg/dz_zxg/10.3+刘书潭+26162023+欣雨+大一+担心打基础和四级没有办法同时进行，要和父母沟通_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 3, note: "10.3 欣雨稿：先打招呼确认是欣雨本人，问她几点起、假期作息，用轻松话题让对话落地。" },
      { purposeKey: "scan.holiday", from: 2, to: 3, note: "10.3 欣雨稿：问她假期几点起、平时作息，了解到她八点左右起，用假期状态自然过渡到正题。" },
      { purposeKey: "open.expectation", from: 4, to: 6, note: "10.3 欣雨稿：连着问她期不期待这次沟通、紧不紧张，接住她说“有一点紧张但更期待我们说的内容”。" },
      { purposeKey: "open.questionnaire", from: 7, to: 7, note: "10.3 欣雨稿：复述昨晚她填的问卷，点出“有目标但迷茫、特别着急四级”，并说今早专门看了她写的内容。" },
      { purposeKey: "open.confirm-call", from: 8, to: 9, note: "10.3 欣雨稿：专门确认声音是否清楚，讲自己上次没戴耳机听不清的经历，排除设备问题。" },
      { purposeKey: "trust.permission", from: 10, to: 11, note: "10.3 欣雨稿：确认她已经拿着笔和纸，邀请她随时打断、畅所欲言，说明规划是两个人合作完成。" },
      { purposeKey: "trust.self-disclosure", from: 12, to: 15, note: "10.3 欣雨稿：c12 说自己也是学前教育、觉得有缘分；c15 说自己当年也是被调剂到这个专业，用共同经历拉近距离。" },
      { purposeKey: "scan.volunteer", from: 13, to: 20, note: "10.3 欣雨稿：追问志愿是谁填的、当时了解多少，学生说父母按分数筛选、自己强烈反对但没看章程，最后录到1+3联合办学第一届。" },
      { purposeKey: "diag.major", from: 16, to: 21, note: "10.3 欣雨稿：c16 追问她为什么排斥幼师，学生说性格没耐心、不适合带小孩；c20—21 咨询师接住并说教育行业不只有幼师，可以用实践找到别的路。" },
      { purposeKey: "scan.score", from: 22, to: 25, note: "10.3 欣雨稿：问她高考是否算失利、本来能上什么学校，学生说高一高二基础没打好、受情感影响，咨询师把它重新解释为“没有全力以赴”。" },
      { purposeKey: "diag.postgrad", from: 28, to: 30, note: "10.3 欣雨稿：问她为什么没想考研，学生说出考研/考公/就业三条路都犹豫；咨询师追问“做什么行动才能确定走哪条路”。" },
      { purposeKey: "window.subtract", from: 29, to: 30, note: "10.3 欣雨稿：咨询师明确说三条路不能一起走，必须先聚焦，不能同时抓。" },
      { purposeKey: "window.track-uncertain", from: 31, to: 39, note: "10.3 欣雨稿：解释校园里没有真实就业场景所以选不出方向很正常，建议用实习低成本验证，并在实习中积累经历、反过来判断要不要考研。" },
      { purposeKey: "open.agenda", from: 40, to: 41, note: "10.3 欣雨稿：明确今天讲三件事——专业认知、442法则、四六级笔试口试，并问她是否想听、要不要调整顺序。" },
      { purposeKey: "diag.choose", from: 41, to: 42, note: "10.3 欣雨稿：问三个话题里最想先听哪个，学生选第三个（四六级），咨询师顺着她的优先级先讲英语。" },
      { purposeKey: "diag.english", from: 43, to: 46, note: "10.3 欣雨稿：先处理她“为考试而考试”的焦虑，指出打基础和考试不是两件事；再确认她备考口试/笔试的时间，说明打基础要花25天。" },
      { purposeKey: "diag.english.speed", from: 47, to: 49, note: "10.3 欣雨稿：问她英语111、两个月冲四级高分现不现实，用高考英语两个月从100冲到140的类比，说明语言不能速成。" },
      { purposeKey: "scan.existing-course", from: 49, to: 50, note: "10.3 欣雨稿：问她之前怎么学，学生说背单词、刷题；说明她只有自学经历，没有系统课程。" },
      { purposeKey: "offer.three-pitfalls", from: 49, to: 50, note: "10.3 欣雨稿：接住“背单词刷题”，指出这种方式缺路径、缺反馈，对比跟老师学的体系、针对性方案和持续纠音。" },
      { purposeKey: "trust.result", from: 60, to: 62, note: "10.3 欣雨稿：咨询师用自己的四级500多、六级500多、没大量备考也过了的经历，证明四级阶段打扎实后面六级会轻松。" },
      { purposeKey: "scan.score", from: 60, to: 62, note: "10.3 欣雨稿：c62 明确说出她英语基础111，并对标四级裸考难度，说明111分直接冲高分有难度。" },
      { purposeKey: "window.long-term", from: 70, to: 71, note: "10.3 欣雨稿：用“90分一下子考140太吃力”和美剧/小学生学高数的类比，说明基础要循序渐进，不能拔苗助长。" },
      { purposeKey: "offer.confirm-need", from: 77, to: 78, note: "10.3 欣雨稿：把“针对性学习方案”和普通学习计划区分开，让她自己确认需要有人带；随后转到“想跟老师学就要考虑跟爸妈怎么说”。" },
      { purposeKey: "diag.major.reality", from: 79, to: 83, note: "10.3 欣雨稿：讲学前教育入园孩子减少、岗位减少、薪资不高且累、女生婚育和年龄限制、长期带班倦怠，说明不是没出路而是普通带班老师压力大。" },
      { purposeKey: "window.final-goal", from: 83, to: 84, note: "10.3 欣雨稿：先问“考研/考公/就业最重要的目的是什么”，让学生自己说出“找到一份好工作”，并让她写下来。" },
      { purposeKey: "window.442", from: 85, to: 90, note: "10.3 欣雨稿：从企业筛选人才的标准切入，带她归纳出能力、经历、学历三项，再给出442占比，说明学历只占20%是门槛、大一大二要all in能力和经历。" },
      { purposeKey: "filter.timeline", from: 90, to: 93, note: "10.3 欣雨稿：从大四倒推——大四实习论文答辩/考研初试复试，大三下准备秋招或考研，真正能all in能力和经历的是大一大二和大三上这两年半。" },
      { purposeKey: "filter.track", from: 91, to: 92, note: "10.3 欣雨稿：直接就业与考研两条路径的时间线对比，帮学生看见分叉点" },
      { purposeKey: "filter.competition", from: 95, to: 101, note: "10.3 欣雨稿：把竞赛分成学科类、科研类、专业类，指出后两类要组队、大一难拿结果，建议优先参加英语类个人赛，重点了解大英赛资格和时间轴。" },
      { purposeKey: "filter.competition.choose", from: 98, to: 101, note: "10.3 欣雨稿：明确建议她大一先集中拿一个英语类竞赛奖项，下载APP关注报名时间，把竞赛和四级、六级准备接上。" },
      { purposeKey: "filter.certificates", from: 102, to: 102, note: "10.3 欣雨稿：按优先级排证书——先四六级，再看专业必备证书和普通话，计算机二级等边缘证书放后面。" },
      { purposeKey: "filter.internship", from: 103, to: 112, note: "10.3 欣雨稿：讲实习路径——家里/老师人脉、学校统一安排、BOSS直聘等平台、付费中介，以及魏老师教育公司的实习机会；建议大一大二自己先找，别等大三学校安排。" },
      { purposeKey: "offer.close.self-fund", from: 111, to: 112, note: "10.3 欣雨稿：用英语做家教攒钱，先自己承担一部分学习成本" },
      { purposeKey: "window.english-leverage", from: 113, to: 121, note: "10.3 欣雨稿：讲能力占40%，分专业能力和核心通用能力，核心通用里最具体的是英语；用自己的家教、实习、自媒体经历说明英语是能横向带路的跳板。" },
      { purposeKey: "filter.english", from: 114, to: 121, note: "10.3 欣雨稿：从能力分类讲到核心通用能力就是表达和英语，逐条说明英语的通用性与刚需" },
      { purposeKey: "diag.major.second-card", from: 119, to: 121, note: "10.3 欣雨稿：c119—121 把英语定义成专业之外的第二张牌，即使不做学前教育，也能带着她去做家教、实习和别的行业。" },
      { purposeKey: "offer.find-teacher", from: 122, to: 123, note: "10.3 欣雨稿：学生主动说想跟微微老师学、问每周几节课，咨询师顺势肯定并开始介绍课程形式。" },
      { purposeKey: "offer.handoff", from: 123, to: 132, note: "10.3 欣雨稿：介绍课程是视频课+直播课、周一到周五每天45—60分钟打卡、周末直播拆解、老师第二天听语音一对一反馈、可预约纠音。" },
      { purposeKey: "offer.three-needs", from: 125, to: 132, note: "10.3 欣雨稿：c125—127 讲真人陪跑和及时反馈，c128 讲从音标、发音规则、词汇、语法打底层的路径，c129—130 讲入学测评定针对性计划，c131—132 讲阶段测评和助教反馈。" },
      { purposeKey: "offer.close.hesitation", from: 133, to: 135, note: "10.3 欣雨稿：问优惠券有没有截止、是不是想三天后再决定，建议她先多了解；学生说还没跟父母沟通，所以还不能定。" },
      { purposeKey: "scan.parents", from: 135, to: 136, note: "10.3 欣雨稿：确认她还没跟父母说，追问父母在她学习上是不是听她想法，判断家里的决策方式。" },
      { purposeKey: "diag.parents", from: 136, to: 138, note: "10.3 欣雨稿：学生说父母不是思想封建，主要担心网络上的安全性和被骗；咨询师说这很正常，并确认她本人并不担心。" },
      { purposeKey: "offer.close.parents", from: 138, to: 142, note: "10.3 欣雨稿：先讲自己当年妈妈不同意、哭了三天最后自己攒钱的经历，再建议她跟父母讲清楚为什么跟老师学、自学不系统，并找助教要央视采访视频和证明材料。" },
      { purposeKey: "offer.trust", from: 138, to: 142, note: "10.3 欣雨稿：用老师被央视采访、助教可提供证明材料等背书，回应父母“怕被骗”的顾虑。" },
      { purposeKey: "offer.close.enroll", from: 141, to: 142, note: "10.3 欣雨稿：建议她下去直接找助教老师，发微信问课程和给父母的证明材料，把下一步落到具体联系人。" },
      { purposeKey: "filter.tutor", from: 143, to: 143, note: "10.3 欣雨稿：算家教账——一小时50元、周末两天各4小时，一个月约1600元，能覆盖生活费并攒本金。" },
      { purposeKey: "offer.close.followup", from: 147, to: 149, note: "10.3 欣雨稿：约定下次把跟父母沟通的情况反馈给他，有问题随时说，有好消息也告诉他；并提前给她父母可能不支持的心理预期。" }
    ]
  },
  {
    id: "dz27",
    label: "10.31 静静咨询稿",
    file: "zxg/dz_zxg/10.31+胡余敏+260401125+静静+大一+家里肯定不支持，自己凑钱学第一期_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 10, note: "10.31 静静稿：先处理施工声、耳机闷、感冒，确认能听清后再进入规划。" },
      { purposeKey: "scan.volunteer", from: 11, to: 15, note: "10.31 静静稿：确认她是河南本地一本、从土木转到计算机，转专业主要是妈妈的意见。" },
      { purposeKey: "diag.choose", from: 16, to: 20, note: "10.31 静静稿：让她自己说迷茫在哪，收拢到考研、考公、就业三条路，并确认她觉得课堂学不到东西。" },
      { purposeKey: "scan.family-burden", from: 21, to: 26, note: "10.31 静静稿：问出家里三个孩子、她是老二、重组家庭、继父不太管，经济只能靠贷款。" },
      { purposeKey: "scan.money", from: 29, to: 34, note: "10.31 静静稿：细算学费生活费贷款一年一万多、四年约8万、每月生活费1000，先把经济底牌摊开。" },
      { purposeKey: "diag.postgrad", from: 37, to: 40, note: "10.31 静静稿：回应妈妈问的考研，算读研一年两三万、三年十几万，说明考研要先算投入产出。" },
      { purposeKey: "filter.track", from: 41, to: 49, note: "10.31 静静稿：用考公300多万录3万、计算机对口岗位不到5%，逐条说明考公不适合她。" },
      { purposeKey: "diag.major.reality", from: 53, to: 57, note: "10.31 静静稿：对比计算机本科能投的测试、运维岗和研究生能投的算法、研发岗，讲清薪资和中年裁员风险。" },
      { purposeKey: "window.final-goal", from: 58, to: 62, note: "10.31 静静稿：把终极目标定为就业和赚钱，提出先按就业标准培养，大三下找不到再考虑考研。" },
      { purposeKey: "filter.timeline", from: 65, to: 70, note: "10.31 静静稿：按大三下企业抢人倒推，指出她只剩一年准备简历。" },
      { purposeKey: "window.442", from: 71, to: 74, note: "10.31 静静稿：讲442法则——能力40、经验40、学历20，指出普本学历20分已拿一半，重点在能力和经验。" },
      { purposeKey: "filter.one-ability", from: 74, to: 78, note: "10.31 静静稿：追问能力和经验先有哪个，带出“竞赛证书是检验能力，不是培养能力”。" },
      { purposeKey: "filter.internship", from: 79, to: 80, note: "10.31 静静稿：把经历拆成校内竞赛证书和校外实习，明确高质量实习比十个证书有用。" },
      { purposeKey: "filter.competition", from: 80, to: 85, note: "10.31 静静稿：给高含金量标准——国家级或省级、大英赛外研社A类，劝她别考人人都有的大众证。" },
      { purposeKey: "filter.one-ability", from: 86, to: 99, note: "10.31 静静稿：列出算法题、计算机网络、python/java/数据库，要求她选一个方向学精，不要广而不精。" },
      { purposeKey: "filter.internship", from: 100, to: 104, note: "10.31 静静稿：讲实习要循序渐进，先靠通用能力进边缘岗，再靠第一段实习找更核心的对口实习。" },
      { purposeKey: "diag.major.second-card", from: 105, to: 115, note: "10.31 静静稿：承认学校教不了专业技术，把英语和表达定为计算机之外的第二张牌，并落到跨境电商和外企。" },
      { purposeKey: "window.english-leverage", from: 106, to: 110, note: "10.31 静静稿：用计算机每六个月技术革新、英文文档和英文算法论坛，说明英语决定迭代速度。" },
      { purposeKey: "scan.score", from: 117, to: 123, note: "10.31 静静稿：问出河南高考不考听力、四级真题听不懂，确认她英语卡在听力和发音。" },
      { purposeKey: "offer.three-needs", from: 135, to: 139, note: "10.31 静静稿：把有效学习归为针对性方案、系统顺序、正向反馈三点，并对照她自学和问同学都缺反馈。" },
      { purposeKey: "window.long-term", from: 140, to: 144, note: "10.31 静静稿：算一年时间要同时完成能力、证书、竞赛、实习，说明越早投资越不会被经济卡住。" },
      { purposeKey: "offer.compare", from: 146, to: 151, note: "10.31 静静稿：拿她大一遇到的三四千线下口语班对比，指出只练稿子、做不到即时交流，AI纠音也替代不了真人。" },
      { purposeKey: "trust.result", from: 163, to: 166, note: "10.31 静静稿：讲自己学前教育出身、高考英语一百零几、跟老师二十来节课学完口语，用真人结果建立可信度。" },
      { purposeKey: "offer.handoff", from: 176, to: 181, note: "10.31 静静稿：说明周内录播、周末直播、课程有效期到毕业后一年，以及发音一个多月能学完。" },
      { purposeKey: "offer.close.price", from: 172, to: 173, note: "10.31 静静稿：确认课程3980左右，讲分期是人工收费、可提前说明困难保留学籍。" },
      { purposeKey: "offer.close.self-fund", from: 192, to: 196, note: "10.31 静静稿：给出四期方案——首期980、后面每月约1000，并说明学一个多月就能做线上家教覆盖后续。" },
      { purposeKey: "offer.close.risk-reversal", from: 192, to: 192, note: "10.31 静静稿：强调交一期即可开通全部课程、七天试学不满意全额退，零成本试错。" },
      { purposeKey: "offer.close.parents", from: 202, to: 204, note: "10.31 静静稿：问出她判断妈妈不会同意、家里只供上大学，确认父母路线走不通。" },
      { purposeKey: "offer.close.parents", from: 214, to: 221, note: "10.31 静静稿：讲父母认知跟不上、怕被骗，转向她自己手里的500奖学金和200结余，准备问朋友周转。" },
      { purposeKey: "offer.close.enroll", from: 226, to: 228, note: "10.31 静静稿：收尾让她找嘉欣师姐问分期和保障，并说明入学后两个老师的分工。" }
    ]
  },
  {
    id: "dz29",
    label: "10.3 郭康兰（瑞朋）咨询稿",
    file: "zxg/dz_zxg/10.3郭康兰+编号260301060+专一瑞朋_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 3, note: "10.3 瑞朋稿：开场先问能否听清、是不是刚睡醒，再确认她在山东本地，用口音和地域话题让对话落地。" },
      { purposeKey: "open.questionnaire", from: 4, to: 5, note: "10.3 瑞朋稿：用问卷里“康复养老专业”这个具体信息开场，说明认真看过问卷，再问她当时怎么选的志愿。" },
      { purposeKey: "scan.volunteer", from: 4, to: 5, note: "10.3 瑞朋稿：追问志愿是不是她自己填的、为什么选康复养老——她说按文科分数和技术含量自己选的，不是家长安排。" },
      { purposeKey: "scan.parents", from: 6, to: 7, note: "10.3 瑞朋稿：确认专业是她一手操办后，追问父母是“不关心”还是“不了解”，她回答父母会问但不懂，只能靠自己。" },
      { purposeKey: "diag.major", from: 8, to: 9, note: "10.3 瑞朋稿：直接问她以后是否愿意一直留在康复养老，她说不一定，已经打算好找不好工作就走副业。" },
      { purposeKey: "scan.existing-course", from: 9, to: 10, note: "10.3 瑞朋稿：追问她说的副业是什么，确认她暑假已经报班学编程，不是只停留在想法。" },
      { purposeKey: "diag.too-many", from: 11, to: 12, note: "10.3 瑞朋稿：点出她同时学英语和编程、正在纠结先选哪个，帮她把“两条线怎么取舍”摆到桌面上。" },
      { purposeKey: "scan.existing-course", from: 14, to: 16, note: "10.3 瑞朋稿：确认她报的是python班，已学两三个月，目前能看懂代码但还达不到接单水平。" },
      { purposeKey: "trust.self-disclosure", from: 17, to: 18, note: "10.3 瑞朋稿：讲自己高考后也遇到很多python/PS/剪辑班、同样对结果不满意，并说“我英语我俩很像”，用相似经历拉近距离。" },
      { purposeKey: "window.python-reality", from: 19, to: 20, note: "10.3 瑞朋稿：用接单平台抽成、客源被平台拿走来拆“学python接单”的账，指出到手远低于标价。" },
      { purposeKey: "diag.ai", from: 21, to: 25, note: "10.3 瑞朋稿：接住她担心被AI替代的点，说明AI能干掉基础代码，但前提是自己能力超过AI、能辨别对错，并回应她“英语会不会被AI替代”的担心。" },
      { purposeKey: "window.python-reality", from: 26, to: 27, note: "10.3 瑞朋稿：用python能力分层和会计岗位变化说明能力会贬值，指出靠接单养活自己这条路很难走。" },
      { purposeKey: "diag.major.reality", from: 28, to: 38, note: "10.3 瑞朋稿：把养老专业拆成服务端3000-5000、管理端7000+，讲选址、学历和实操门槛，指出护理/社工/康复/管理四类岗位都在抢人，管理岗要先从基层做起。" },
      { purposeKey: "diag.major", from: 37, to: 38, note: "10.3 瑞朋稿：在她讲完行业现实后追问“如果体面工作不在康复领域，你愿意转吗”，她说会，咨询师肯定她不想照顾人并给出管理岗方向。" },
      { purposeKey: "diag.postgrad", from: 39, to: 40, note: "10.3 瑞朋稿：回应“当管理是不是非得考研”，指出考研也只是学习，她也说不管考不考都要先看能不能就业，暴露出考研目标还没想清。" },
      { purposeKey: "window.subtract", from: 41, to: 41, note: "10.3 瑞朋稿：直接指出她英语、python、专业都想抓是“想法太多”，要求她做减法、先定先学什么再学什么。" },
      { purposeKey: "window.python-reality", from: 42, to: 48, note: "10.3 瑞朋稿：用室友接单最高只拿60块、平台抽走一半、客户反复改稿的例子，说明接单副业投入产出不成正比、赛道已经白热化。" },
      { purposeKey: "filter.tutor", from: 49, to: 54, note: "10.3 瑞朋稿：用自己的家教时薪算账，从50/70一小时推到周末两小时280、一个月1000多，证明英语能力可以变成稳定现金流。" },
      { purposeKey: "trust.result", from: 49, to: 54, note: "10.3 瑞朋稿：用自己做家教一次课200、一个月1600到两三千的真实结果，证明“英语能变现”不是空讲道理，建立走过这条路的可信度。" },
      { purposeKey: "filter.one-ability", from: 55, to: 56, note: "10.3 瑞朋稿：在英语、python、养老专业三条路里做取舍，指出python受限于计算机领域、竞争不过工科生，明确先把英语作为这一阶段唯一核心能力。" },
      { purposeKey: "window.experience-first", from: 57, to: 57, note: "10.3 瑞朋稿：把“大学期间怎么赚钱”重新定义成“先让自己值钱，钱是结果”，劝她不要急着靠接单赚零花钱。" },
      { purposeKey: "window.competition-pool", from: 58, to: 58, note: "10.3 瑞朋稿：用每年1200多万毕业生、一直增长到2038年顶峰的数字，说明她正处在竞争人数持续变大的池子里。" },
      { purposeKey: "diag.ai", from: 58, to: 63, note: "10.3 瑞朋稿：把1200万毕业生和AI放在一起讲“夹击”，引导她说出AI替代不了情感，落到表达能力是普通人能练、AI拿不走的能力。" },
      { purposeKey: "window.english-leverage", from: 64, to: 80, note: "10.3 瑞朋稿：用“身边能口语自由交流的人一只手数得过来”说明稀缺性，再讲英语能横向赋能python、带来自信、做家教/奖学金变现，并说英语可以当主业、是万能钥匙，最后把重心落到英语。" },
      { purposeKey: "trust.self-disclosure", from: 79, to: 80, note: "10.3 瑞朋稿：讲自己高考后为什么还要报班——大学英语课水、应试、身边英专生也做不到听说自由，用自己的经历解释“报班不是多此一举”。" },
      { purposeKey: "diag.school-gap", from: 81, to: 85, note: "10.3 瑞朋稿：承认民办本科会被歧视，但把学历重新定义成“反差工具”，让她用四六级、比赛、实习、自媒体做出差异化，让面试官看到反差感。" },
      { purposeKey: "window.ai-era", from: 86, to: 89, note: "10.3 瑞朋稿：讲AI时代只缺三种人——行业S级、高潜质、比算力便宜的人，并提醒能力会随时间打折，要持续成长、增强不可替代性。" },
      { purposeKey: "window.442", from: 90, to: 98, note: "10.3 瑞朋稿：先讲复合型人才的三块（数据分析、专业能力、口语），再正式给出442法则——能力40%、经历40%、学历20%，让她把大一大二的80分放在能力和经历上。" },
      { purposeKey: "filter.internship", from: 92, to: 94, note: "10.3 瑞朋稿：把专业能力拆成“理论+实践”，实践就是实习，建议她大一大二就去非专业领域实习，攒够三段经历写进简历。" },
      { purposeKey: "window.track-uncertain", from: 93, to: 94, note: "10.3 瑞朋稿：告诉她现在选不出方向很正常，去非专业领域实习才能知道自己干得明白什么，用实习做低成本验证再决定就业方向。" },
      { purposeKey: "filter.timeline", from: 99, to: 101, note: "10.3 瑞朋稿：倒推大学四年，指出大四实习论文找工作、只有三年真正可用，大三专业课加实习、大二冲四六级，先把时间线摆清楚。" },
      { purposeKey: "filter.certificates", from: 102, to: 105, note: "10.3 瑞朋稿：把四六级列为最优先证书，要求她大二结束前把六级考到500以上，讲清网申筛选、简历反差和“只有大学能考”的稀缺性。" },
      { purposeKey: "filter.gpa", from: 106, to: 107, note: "10.3 瑞朋稿：讲大二专业课全面开花，奖学金看绩点，建议高数保持一般、把英语期末成绩拉高，用英语拉开绩点差距。" },
      { purposeKey: "filter.internship", from: 108, to: 109, note: "10.3 瑞朋稿：提醒她大二寒暑假一定要找实习，民办双非找实习不容易，机构内部实习机会和家里资源都有限，要提前打地基。" },
      { purposeKey: "diag.english.method", from: 110, to: 116, note: "10.3 瑞朋稿：听她说发音规则“懂但不会用、不练习”，追问后指出不是练习量不够，而是方法方向不对，之前买的课学一段就放弃。" },
      { purposeKey: "scan.existing-course", from: 117, to: 119, note: "10.3 瑞朋稿：确认她之前买的是300块的博主课，只学了一段时间就停了，为后面比较低价课和系统课留下证据。" },
      { purposeKey: "diag.money", from: 120, to: 122, note: "10.3 瑞朋稿：她主动说想买薇薇老师课程但每月都在还分期、不敢跟父母说，咨询师把问题收束成“想学+有分期+不敢说”三件事。" },
      { purposeKey: "diag.parents", from: 121, to: 122, note: "10.3 瑞朋稿：第一次确认她不敢跟父母提报课和分期，父母保守、怕她被网上课程骗，这是后面父母沟通段的诊断起点。" },
      { purposeKey: "offer.compare", from: 123, to: 125, note: "10.3 瑞朋稿：对比300块博主课和系统课——低价课大概率是发录播、没有服务、没有针对性，薇薇老师只专注大学生、课程每年打磨。" },
      { purposeKey: "offer.pitfall.sunk", from: 123, to: 125, note: "10.3 瑞朋稿：用朋友报了6000多还被继续推课的例子，讲低价课背后的连环报课和沉没成本，提醒她不要被“已经花了钱”卡住。" },
      { purposeKey: "offer.trust", from: 126, to: 129, note: "10.3 瑞朋稿：用“只专注大学生、课程每年打磨、入学先测评、按基础和目标定制计划”建立机构可信度，并用39码鞋的类比说明针对性。" },
      { purposeKey: "offer.need.plan", from: 128, to: 129, note: "10.3 瑞朋稿：具体讲入学测评后按她的时间、目标、基础制定计划，对应“真正需要三样”里的针对性计划。" },
      { purposeKey: "offer.handoff", from: 130, to: 131, note: "10.3 瑞朋稿：介绍课程能覆盖发音规则到听说读写全体系，四六级课和考研课可以送，后面还有实习机会，把方案落到具体内容。" },
      { purposeKey: "offer.trust", from: 132, to: 133, note: "10.3 瑞朋稿：讲自己当年为什么凑第一期也要报——听说自由、方法对、老师良心性价比高、还提供实习机会，用自己的选择建立信任。" },
      { purposeKey: "offer.close.parents", from: 134, to: 139, note: "10.3 瑞朋稿：针对她父母保守怕被骗，先让她换位理解父母，再建议不要一上来讲赚钱路子，先把规划讲清楚；父母实在说不通就先做后说、用结果证明。" },
      { purposeKey: "offer.ask-plan", from: 139, to: 140, note: "10.3 瑞朋稿：问她“你自己想怎么解决”，让她先说出自己的方案——先用老师的方法坚持一两个月看效果，再决定要不要借钱学。" },
      { purposeKey: "offer.self-study", from: 140, to: 141, note: "10.3 瑞朋稿：接住她“先自学一两个月”的方案，追问她怎么借钱、效果不好怎么办，指出自学没有服务和反馈，效果不好还是得回到系统学。" },
      { purposeKey: "offer.pitfall.feedback", from: 142, to: 143, note: "10.3 瑞朋稿：点出自学的核心缺口是没人纠正发音、没人给对错反馈，读错了练再久也不知道。" },
      { purposeKey: "offer.need.path", from: 142, to: 143, note: "10.3 瑞朋稿：给出科学路径——从发音、发音规则开始，按顺序学，不能跳步，对应“真正需要三样”里的路径。" },
      { purposeKey: "diag.money", from: 144, to: 146, note: "10.3 瑞朋稿：她承认真正的阻碍是负担重、经济问题，而不是不想学，咨询师把问题锁定在钱上。" },
      { purposeKey: "scan.score", from: 147, to: 148, note: "10.3 瑞朋稿：问她高考英语多少分，确认是110，和自己113差不多，说明她有基础、不是从零开始。" },
      { purposeKey: "offer.close.self-fund", from: 149, to: 152, note: "10.3 瑞朋稿：算时间和机遇的账，建议她先周转第一期、后面边学边攒，并讲自己当年也是分期凑出来的。" },
      { purposeKey: "offer.close.risk-reversal", from: 150, to: 152, note: "10.3 瑞朋稿：讲清分期可以缓几天、交不上可以先停课，停课后还能继续听发音课，等11月/12月攒上再继续，降低她的决策风险。" },
      { purposeKey: "filter.tutor", from: 153, to: 154, note: "10.3 瑞朋稿：具体讲家教教小学生读单词、检查作业，一俩小时就能做，打消她“教不会怎么办”的顾虑。" },
      { purposeKey: "filter.timeline", from: 156, to: 157, note: "10.3 瑞朋稿：强调大一专业课不多是窗口期，大二再重新学来不及；从现在开始学，大一一整年就可能实现经济独立。" },
      { purposeKey: "filter.internship", from: 157, to: 159, note: "10.3 瑞朋稿：讲老师家每年寒暑假给内部学员实习机会，有面试，看的是品质和态度，让她大一把四级考高一点再去。" },
      { purposeKey: "offer.close.self-fund", from: 160, to: 161, note: "10.3 瑞朋稿：建议她用压岁钱、现在凑一凑，把第一期补上，后面再靠停课和攒钱接上。" },
      { purposeKey: "scan.money", from: 161, to: 168, note: "10.3 瑞朋稿：问清她每月分期500、生活费4000、正常花销不到1000、手里能拿出500，把首期缺口算清楚。" },
      { purposeKey: "offer.close.self-fund", from: 166, to: 168, note: "10.3 瑞朋稿：建议她不用借全款，先借一个月/500，问清机构分期金额和课程内容，再决定怎么凑。" },
      { purposeKey: "offer.close.enroll", from: 168, to: 168, note: "10.3 瑞朋稿：给出下一步动作——先问机构分期多少、让对方介绍课程内容，再把自己的情况讲清楚让对方想办法。" },
      { purposeKey: "offer.close.risk-reversal", from: 169, to: 171, note: "10.3 瑞朋稿：教她怎么跟两边机构开口问停课，先问能不能停一两个月，能停就先把重心放英语上，降低同时供两边的压力。" },
      { purposeKey: "offer.close.self-fund", from: 172, to: 173, note: "10.3 瑞朋稿：具体到借钱方案——500可以分几个朋友借，200、100都行，不要指望一个人借全。" },
      { purposeKey: "offer.close.price", from: 174, to: 175, note: "10.3 瑞朋稿：把报课重新定义成“投资学习稳赚不赔”，现在苦一点，后面买车买房不用还贷；并用70/时的家教账说明能覆盖。" },
      { purposeKey: "diag.motivation", from: 178, to: 185, note: "10.3 瑞朋稿：她说自己不自律、没动力，咨询师把原因归到没方法、没反馈、没效果，而不是意志力差，并让她承认“有反馈就愿意学”。" },
      { purposeKey: "offer.pitfall.path", from: 181, to: 182, note: "10.3 瑞朋稿：指出她的精力耗在“找怎么学的方法”上，而不是已经开始学，这就是自学缺路径。" },
      { purposeKey: "diag.english.method", from: 186, to: 191, note: "10.3 瑞朋稿：听她说看刘晓艳视频背单词，比较老师单词课的效果，并指出博主发音规则不熟、靠一个个蹦，说明方法差异。" },
      { purposeKey: "offer.need.coach", from: 192, to: 192, note: "10.3 瑞朋稿：用“有军师、有测试、每天一节课+几分钟巩固”描述真人陪跑，对应“真正需要三样”里的陪跑。" },
      { purposeKey: "diag.environment", from: 196, to: 210, note: "10.3 瑞朋稿：接住她“在寝室学怕被说装、格格不入”，先承认环境真实存在，再给物理解法——走出寝室、空教室/图书馆、拉帘子、线上自习室。" },
      { purposeKey: "offer.pitfall.environment", from: 196, to: 210, note: "10.3 瑞朋稿：把“室友不学、异样眼光、说话干扰”归为自学缺环境，并用线上自习室和换地方说明环境可以换。" },
      { purposeKey: "scan.campus", from: 196, to: 210, note: "10.3 瑞朋稿：寝室、空教室、图书馆和线上自习室的环境问题与物理解法" },
      { purposeKey: "offer.close.followup", from: 211, to: 213, note: "10.3 瑞朋稿：收尾约定微信随时答疑、整理笔记发给她看，并让她先去问分期，后续再反馈情况。" }
    ]
  },
  {
    id: "dz30",
    label: "10.3 清鑫咨询稿",
    file: "zxg/dz_zxg/10.3郭康兰+编号260301073+清鑫专一_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 2, note: "10.3 清鑫稿：开场确认声音和在卧室，聊两人都以为对方会先发消息的乌龙。" },
      { purposeKey: "open.questionnaire", from: 13, to: 14, note: "10.3 清鑫稿：说问卷仔细看过，问她工业机器人技术当初怎么选，她答觉得可能比较赚钱。" },
      { purposeKey: "scan.family-burden", from: 15, to: 27, note: "10.3 清鑫稿：问家里几个孩子，四个、她最小、只有她上大学；妈妈交学费、姐姐给生活费，哥哥即将结婚。" },
      { purposeKey: "scan.volunteer", from: 27, to: 31, note: "10.3 清鑫稿：问专业对口本科，聊到机器人工程/机械设计制造，她说动手可以但更想动脑、不想一直做基层。" },
      { purposeKey: "diag.major.reality", from: 31, to: 36, note: "10.3 清鑫稿：讲基层技术岗薪资死、晋升天花板低，又叠加AI竞争；90%好岗位本科起步，所以专升本必须。" },
      { purposeKey: "trust.permission", from: 36, to: 37, note: "10.3 清鑫稿：让她拿纸笔记数据，确认房间里有纸笔再继续。" },
      { purposeKey: "open.agenda", from: 38, to: 44, note: "10.3 清鑫稿：问她这通电话最想解决什么，收出专升本、四级、班委、奖学金几件事，先讲专升本。" },
      { purposeKey: "diag.school-gap", from: 50, to: 61, note: "10.3 清鑫稿：用90%岗位本科起步、1200万毕业生、2038年峰值、AI和供需不匹配，讲专科学历的落差。" },
      { purposeKey: "window.competition-pool", from: 67, to: 78, note: "10.3 清鑫稿：讲专升本录取率约20%、高考40-50%，以及师资环境、供需失衡、几十万人抢几千名额。" },
      { purposeKey: "scan.score", from: 79, to: 81, note: "10.3 清鑫稿：问她高考分数，英语32分（含5分听说）、数学96分。" },
      { purposeKey: "diag.english", from: 82, to: 85, note: "10.3 清鑫稿：说英语及格就能拉60分；专科生普遍英语差，背单词刷题低效，甚至心理排斥。" },
      { purposeKey: "filter.timeline", from: 85, to: 95, note: "10.3 清鑫稿：排备考策略：英语现在学，政治/高数大二，专业课正常跟；大一打发音地基，大二四级高分，大三专业课。" },
      { purposeKey: "window.final-goal", from: 95, to: 100, note: "10.3 清鑫稿：说专升本后仍是双非，专升本只是顺带；专科前两年要当本科过，能力提升才是主线。" },
      { purposeKey: "window.442", from: 101, to: 110, note: "10.3 清鑫稿：讲442法则：能力40/经历40/学历20，重心放能力和经历；能力=专业（理论+证书/比赛/实习）。" },
      { purposeKey: "window.english-leverage", from: 119, to: 125, note: "10.3 清鑫稿：把英语口语定为第二核心能力，周围能free talk的人很少；英语也是学Python/C语言的基础。" },
      { purposeKey: "diag.ai", from: 130, to: 136, note: "10.3 清鑫稿：讲AI吃掉重复操作工，留下懂设备、懂控制、会沟通的工程师，提示她走复合型路线。" },
      { purposeKey: "filter.internship", from: 140, to: 151, note: "10.3 清鑫稿：让她大二寒暑假至少两段实习，自己找不靠学校；越早实习越能拉开差距。" },
      { purposeKey: "trust.self-disclosure", from: 142, to: 148, note: "10.3 清鑫稿：讲自己高中结束学英语、大一大二实习，去微微老师公司实习就是渠道和资源。" },
      { purposeKey: "filter.gpa", from: 152, to: 169, note: "10.3 清鑫稿：讲奖学金分类（国奖1万/励志6000/校级）、绩点+综测、结果思维，四六级/竞赛证书都能加分。" },
      { purposeKey: "diag.english.qualification", from: 171, to: 172, note: "10.3 清鑫稿：学校要求期末英语75分以上才能报四级；顾问说现在不学，大一考不了、大二更没时间。" },
      { purposeKey: "diag.english.speed", from: 180, to: 190, note: "10.3 清鑫稿：她背单词背到乏力，顾问纠正要从发音开始，先发音再发音规则（连读/变音/吞音）。" },
      { purposeKey: "offer.self-study", from: 196, to: 210, note: "10.3 清鑫稿：说学校老师不能一对一纠、有人情和晋升问题；大学英语课一周一节、一对群，资源不够。" },
      { purposeKey: "offer.three-pitfalls", from: 211, to: 222, note: "10.3 清鑫稿：把问题归成缺反馈、缺路径、只有资料没有资源；找视频自学也没人纠正。" },
      { purposeKey: "diag.parents", from: 229, to: 234, note: "10.3 清鑫稿：她说爸妈觉得网课是假的、让她自己学；顾问判断是父母认知问题，不是她不想学。" },
      { purposeKey: "offer.compare", from: 235, to: 247, note: "10.3 清鑫稿：用朋友报专升本班六七千打水漂，对比英语班长期能力；说网上免费课不会有人无条件给。" },
      { purposeKey: "offer.no-idea", from: 250, to: 259, note: "10.3 清鑫稿：她说不知所措，顾问拆成不知道怎么学、怎么跟爸妈聊；没资源就先了解微微老师的测评和计划。" },
      { purposeKey: "filter.tutor", from: 260, to: 261, note: "10.3 清鑫稿：说英语学好可做口语家教，一小时70-100，能经济独立、不再被钱卡。" },
      { purposeKey: "offer.handoff", from: 270, to: 273, note: "10.3 清鑫稿：讲课程流程：先测评→按目标/时间定制计划→每天打卡→三人VIP群→周末一对一纠音。" },
      { purposeKey: "offer.close.risk-reversal", from: 274, to: 275, note: "10.3 清鑫稿：讲七天试课、分期、零成本尝试，不满意可退。" },
      { purposeKey: "offer.close.followup", from: 276, to: 278, note: "10.3 清鑫稿：让她梳理笔记发过来，有问题微信联系。" }
    ]
  },
  {
    id: "dz32",
    label: "10.3 陈洋洋（张彪）咨询稿",
    file: "zxg/dz_zxg/10.3陈洋洋26170078张彪目标考研，想和父母商量_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 11, note: "10.3 张彪稿：开场用“喂喂/姐姐”确认是张彪本人、声音清楚，问到现在在老家外婆家，顺势聊降温和安徽湖北地缘，先把人接住再进正题。" },
      { purposeKey: "open.agenda", from: 12, to: 12, note: "10.3 张彪稿：说明今天借唠嗑把大学这几年梳理清楚，让大一这学期到后面的时间最大化利用。" },
      { purposeKey: "open.questionnaire", from: 13, to: 13, note: "10.3 张彪稿：复述问卷里“高考有遗憾”“暑假做过家教/补习机构”，肯定她填得认真、目标清楚，并从这里切进高考失利。" },
      { purposeKey: "scan.volunteer", from: 14, to: 17, note: "10.3 张彪稿：追问江南大学是高中目标还是没考上，确认食品质量与安全是江南王牌、电子信息是第一志愿但被调剂。" },
      { purposeKey: "diag.major.switch", from: 18, to: 19, note: "10.3 张彪稿：指出大一前期是转专业窗口，追问“如果转成功还会不会考江南”，学生说江南只是食品方面强。" },
      { purposeKey: "diag.postgrad", from: 20, to: 21, note: "10.3 张彪稿：问考研想冲什么层次，学生答“211是底线”，咨询师肯定并说现在不确定具体学校没关系。" },
      { purposeKey: "diag.choose", from: 21, to: 22, note: "10.3 张彪稿：学生从考研话题主动转到“英语一直落后”，咨询师确认“现在主要就是想提高英语”，把英语定为当前主诉。" },
      { purposeKey: "scan.score", from: 23, to: 24, note: "10.3 张彪稿：拿到高考英语 90—110 分，判断在大学生里不算差，但靠啃老底接四六级和考研会吃力。" },
      { purposeKey: "diag.english", from: 23, to: 24, note: "10.3 张彪稿：接住“英语拖后腿”的焦虑，把 100 来分放回大学生整体水平，说明不是她不行，是基础和大学要求之间有缺口。" },
      { purposeKey: "scan.worries", from: 23, to: 24, note: "10.3 张彪稿：她最着急的是英语拖后腿，先把担忧摆到桌面上" },
      { purposeKey: "diag.english.qualification", from: 26, to: 33, note: "10.3 张彪稿：学生说学校要求英语 110 才能报四级、自己晚一年；咨询师把“落后一年”重新解释为备考战线更长、可一次冲高分，并说四六级高分在复试简历里是优势。" },
      { purposeKey: "filter.timeline", from: 34, to: 43, note: "10.3 张彪稿：让学生自己讲四年规划（大一基础课/英语/绩点/实验室，大二竞赛，大三考研），追问口语从什么时候开始，最后归纳成“大一下四级高分、大二六级+实验室+比赛、大三系统备考”的时间线。" },
      { purposeKey: "diag.postgrad.timeline", from: 45, to: 46, note: "10.3 张彪稿：指出大三系统备考不能从零开始，四级没过还和考研一起备考会非常割裂，所以时间线要往前压。" },
      { purposeKey: "window.final-goal", from: 47, to: 52, note: "10.3 张彪稿：提出倒推和以终为始，明确最终目标不是考研而是就业；考研只是进入更高竞争池的过程，再倒推需要研究生学历和研发岗方向。" },
      { purposeKey: "window.competition-pool", from: 53, to: 58, note: "10.3 张彪稿：用 B 级/A 级竞争池和“5000 的工作好找还是 1 万的工作好找”说明：本科生池子大、研究生池子小且有专业壁垒。" },
      { purposeKey: "diag.postgrad.pool", from: 53, to: 58, note: "10.3 张彪稿：用本科生与研究生的竞争池解释为什么考研" },
      { purposeKey: "diag.postgrad.timeline", from: 59, to: 68, note: "10.3 张彪稿：先让学生复述初试科目（专业课/英语/数学/政治）和复试，再从复试倒推到初试，讲国家线、院校线、单科线三条线，强调英语单科线。" },
      { purposeKey: "diag.postgrad.strategy", from: 69, to: 75, note: "10.3 张彪稿：把考研策略拆成“侧”和“略”：英语是侧、政治是略，高数和专业课在中间，精力不要平均用力。" },
      { purposeKey: "filter.postgrad-plan", from: 76, to: 82, note: "10.3 张彪稿：用江南大学往年线举例，说明不能只卡线，目标要在往年院校线上加 20 分才稳。" },
      { purposeKey: "window.english-leverage", from: 83, to: 87, note: "10.3 张彪稿：讲复试要英语问答、抽外文文献翻译并口头表达，英语口语和学术阅读是可以做出亮点的能力。" },
      { purposeKey: "filter.internship", from: 90, to: 92, note: "10.3 张彪稿：说明实习和进课题组同等重要，企业实战能打磨专业能力，要尽早积累可写进简历的经历。" },
      { purposeKey: "filter.lab", from: 93, to: 101, note: "10.3 张彪稿：连续追问“只发节日祝福/只问问题”能不能让学长学姐和导师带你，引导学生意识到要拿出有价值的专业思考或作品。" },
      { purposeKey: "filter.competition", from: 102, to: 103, note: "10.3 张彪稿：建议大一先参加不依赖组队的英语类个人赛，不和学长学姐拼专业赛。" },
      { purposeKey: "filter.competition.types", from: 104, to: 106, note: "10.3 张彪稿：发竞赛流程，按时间轴讲 3 月演讲比赛、4 月大英赛、5—6 月跨文化能力大赛及含金量。" },
      { purposeKey: "filter.competition.choose", from: 107, to: 108, note: "10.3 张彪稿：强调大二前进实验室前先握一个竞赛奖项，再配上四级高分和口语，导师会觉得“捡到宝”。" },
      { purposeKey: "filter.gpa", from: 109, to: 114, note: "10.3 张彪稿：从导师招募要求英语和绩点切入，讲绩点策略：水课期末背重点，时间留给高数和英语；英语学分占比大、课外部分能拉开 30 分。" },
      { purposeKey: "window.english-leverage", from: 115, to: 116, note: "10.3 张彪稿：把英语说成“可以带你飞”的杠杆：口语和发音练好后，考研复试只需再补学术词汇。" },
      { purposeKey: "offer.ask-plan", from: 116, to: 117, note: "10.3 张彪稿：问“英语到底该怎么学才能变成优势”，学生答“先发音、听说读写”。" },
      { purposeKey: "offer.self-study", from: 117, to: 121, note: "10.3 张彪稿：学生提出自己读、照着别人读，咨询师不否定，只追问“照着读真的能标准吗”，让她自己感到没底。" },
      { purposeKey: "offer.pitfall.path", from: 122, to: 128, note: "10.3 张彪稿：指出没学音标、发音规则、连读弱读就直接跟读，会越学越迷糊，属于缺路径。" },
      { purposeKey: "offer.need.path", from: 122, to: 128, note: "10.3 张彪稿：给出科学路径：先音标，再发音规则，再到听说读写，需要有人把规则拆开讲。" },
      { purposeKey: "offer.pitfall.feedback", from: 129, to: 130, note: "10.3 张彪稿：指出自己练不知道哪里读错、练到什么程度，没人纠音就是缺反馈。" },
      { purposeKey: "offer.need.coach", from: 129, to: 130, note: "10.3 张彪稿：给真人陪跑方案：一个老师做计划、一个老师纠音反馈，练了有人告诉对错。" },
      { purposeKey: "trust.self-disclosure", from: 131, to: 131, note: "10.3 张彪稿：咨询师讲自己父母在农村干工地、当时想靠英语做家教赚钱，因此不管经济压力都要跟老师系统学，用相似经历拉近距离。" },
      { purposeKey: "offer.find-teacher", from: 131, to: 132, note: "10.3 张彪稿：问“跟老师学还是你有更好的资源”，学生答最好资源是微微老师；再追问之前没报是不是因为贵。" },
      { purposeKey: "offer.confirm-need", from: 133, to: 134, note: "10.3 张彪稿：问她既然知道自学不行，是想争取这个机会吗，学生答“争取”，确认她需要有人带。" },
      { purposeKey: "offer.close.price", from: 134, to: 135, note: "10.3 张彪稿：问经济压力大不大，学生说还行；咨询师把三千多说成对学习的投资，判断父母不会觉得贵。" },
      { purposeKey: "scan.parents", from: 135, to: 138, note: "10.3 张彪稿：追问父母是否支持、为什么这么肯定，确认父母一直想让她学好英语，也知道她要考研。" },
      { purposeKey: "diag.parents", from: 139, to: 140, note: "10.3 张彪稿：学生说父母最担心被骗、觉得 3000 块不正规；咨询师说自己父母第一反应也是“靠不靠谱”，判断是怕被骗型。" },
      { purposeKey: "offer.trust", from: 141, to: 142, note: "10.3 张彪稿：用营业执照、央视采访、学员视频等证明材料说明机构可信，判断父母属于看了材料能接受的理性型。" },
      { purposeKey: "offer.close.parents", from: 141, to: 143, note: "10.3 张彪稿：教她先讲清为什么跟老师学，再拿证明材料给父母看，把花钱学习说成对自己的投资。" },
      { purposeKey: "offer.close.self-fund", from: 144, to: 149, note: "10.3 张彪稿：留 plan B：父母不同意就问分期，首期 900 多，自己有小金库能交，先学起来用结果证明。" },
      { purposeKey: "scan.money", from: 147, to: 148, note: "10.3 张彪稿：问到首期 900 多能不能自己承担，学生说有金库可以，确认她有自筹能力。" },
      { purposeKey: "offer.close.hesitation", from: 150, to: 151, note: "10.3 张彪稿：用“一个月就能把发音练标准”“声音条件好”鼓励她抓住机会，先去跟父母沟通。" },
      { purposeKey: "offer.close.enroll", from: 152, to: 152, note: "10.3 张彪稿：明确下一步：找助教老师要证明材料、了解课程，了解清楚才好跟父母讲。" }
    ]
  },
  {
    id: "dz33",
    label: "10.4 小马咨询稿",
    file: "zxg/dz_zxg/10.4+宋佳琦+26063060+小马+大一+已经报了一个课，时间和钱不够.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.expectation", from: 1, to: 2, note: "10.4 小马稿：开场接住学生“期待了很久”，咨询师回应自己也挺期待，并肯定她属于“挺想提升”的一类，先建立被看见的感觉。" },
      { purposeKey: "scan.volunteer", from: 3, to: 5, note: "10.4 小马稿：追问专业怎么选的，学生说分数只够这个相对有兴趣的专业，其他只能去土木、智慧农业；咨询师确认是“看分数选”，并追问是否父母帮选，判断她对专业的接受度。" },
      { purposeKey: "scan.family-burden", from: 8, to: 11, note: "10.4 小马稿：从独生、兄弟姐妹切入，问出两个姐姐（大姐刚毕业、二姐已工作）、家里只供她一个学生负担不重，再问姐姐能否分享大学经验，摸清家庭支持结构。" },
      { purposeKey: "diag.parents", from: 13, to: 18, note: "10.4 小马稿：问父母平时分享什么、为何理念不合，学生说父母认为读大学没用、身边打工伙伴也早早赚钱；咨询师用“大厂研究生起步、本科除非能力极强”回应时代变化，并问她是否想打破父母贴的标签。" },
      { purposeKey: "window.442", from: 21, to: 22, note: "10.4 小马稿：把好发展拆成三个方面——学历、经历（比赛证书）、能力（行业营销能力），对应 442 框架，并指出学生“缺的是方向”，为后面选主线做铺垫。" },
      { purposeKey: "diag.too-many", from: 22, to: 25, note: "10.4 小马稿：学生说想法很多但不知道从何做起，既想学编程接单赚零花钱又想走市场营销；咨询师点出她真正卡在“编程还是营销”不清晰，先帮她收敛方向。" },
      { purposeKey: "diag.major.reality", from: 26, to: 27, note: "10.4 小马稿：具体讲市场营销就业分层：传统销售底薪两三千、提成随市场波动；建议走外企、跨境出海营销，如亚马逊运营、海外投放，刚毕业约 8-9k 到 1 万，给出继续走本专业的具体路径。" },
      { purposeKey: "window.english-leverage", from: 27, to: 30, note: "10.4 小马稿：从跨境营销需要英语，推到高端国内营销也要英语，再到 AI、编程底层是英文代码；结论是没有英语，营销和 AI 两条路都走不通，用“上了船却没有船桨”比喻英语是底层杠杆。" },
      { purposeKey: "window.python-reality", from: 31, to: 32, note: "10.4 小马稿：算编程接单的现实账：计算机专业都要考研、达到接单水平要很多年，猪八戒、程序员客栈初级单几十到几百元且竞争激烈；非科班半路出家不被认可，结论是靠接单变现时间线太长、走不通。" },
      { purposeKey: "offer.find-teacher", from: 34, to: 37, note: "10.4 小马稿：学生说已问过助教、这个阶段报不了英语课要等下一期；咨询师确认是魏老师、推荐助教，并顺着她“想跟魏老师学英语”的意愿承接，问她是不是英语加编程都想学。" },
      { purposeKey: "scan.existing-course", from: 38, to: 40, note: "10.4 小马稿：追问已报的编程课每天花多久、是否很赶，学生说一天一个半小时、隔天上课还要额外巩固；咨询师判断零基础学编程难度大、很多人坚持不下来，作为后面做减法的依据。" },
      { purposeKey: "filter.one-ability", from: 41, to: 42, note: "10.4 小马稿：提出“做事要有优先级”，让他在编程和英语里选一个更倾向的；学生坚持两个都选、认为结合更好用，咨询师没有强行否定，但把“只能先聚焦一项核心能力”的问题摆了出来。" },
      { purposeKey: "scan.money", from: 46, to: 49, note: "10.4 小马稿：确认她“很有信心、很想学，主要卡在钱”，追问编程课付了多少钱、是否分期；学生说每月 290、分 12 个月，咨询师据此判断她的月度分期压力。" },
      { purposeKey: "trust.self-disclosure", from: 50, to: 53, note: "10.4 小马稿：讲自己当年家里困难、奶奶生病，报名前手里只有两三百块，第一期靠自己凑、后面也自己付完；用“我也走过这条路”建立相似性，降低学生对费用的羞耻感。" },
      { purposeKey: "offer.close.risk-reversal", from: 51, to: 55, note: "10.4 小马稿：借自己问助教的经历说明可以暂停、缓交七八天，又补充课程可免费延长到毕业之后一年；把“钱不够”从死结改成可调节的节奏，降低决策风险。" },
      { purposeKey: "offer.close.self-fund", from: 62, to: 67, note: "10.4 小马稿：算校内兼职账——食堂打饭 15 元/小时、周六 5 小时 70 多、一天约 100，做两周约 400；结合编程课 23 号还款日，建议用兼职补首期，并说“遇到问题就解决问题”，推动她自己想办法。" },
      { purposeKey: "filter.tutor", from: 72, to: 74, note: "10.4 小马稿：用自己学一个月发音就去做发音家教的例子，算时薪 60-70 元、周六周日各 2 小时、一周 240、一个月约 960；再教她线上找生源（校园墙、家教群、平台），把英语变成可执行的现金流路径。" },
      { purposeKey: "trust.result", from: 81, to: 85, note: "10.4 小马稿：讲试课案例：家长质疑没四级证书，他坦诚说明师从北大双硕士、家里困难需要这份工作；试讲一年级发音课三十分钟后家长认可并转介绍，后来 80 元/小时、两个学生 160、一周 640、月约 2500，用结果证明路径可复制。" },
      { purposeKey: "offer.close.enroll", from: 97, to: 104, note: "10.4 小马稿：落到报名动作：今晚抢优惠券、分期不能在直播间报、去问助教能否协调优惠名额；说明最后一天报名人多、名额可能缩减、一个半小时课加职场私教，推动她马上联系老师。" },
      { purposeKey: "filter.gpa", from: 110, to: 118, note: "10.4 小马稿：回应水课问题：坐后排戴耳机学英语、用魏老师单词课和教材复习，或看《认知觉醒》这类认知、表达书；明确逃课来回麻烦，不如在教室自学更有用的东西。" }
    ]
  },
  {
    id: "dz34",
    label: "10.4 小明咨询稿",
    file: "zxg/dz_zxg/10.4+宋佳琦+26063067+小明+大一+之前报课没效果.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 3, note: "10.4 小明稿：问是不是广东人、假期是不是住朋友家，确认她刚开学、在高中同学家中的状态。" },
      { purposeKey: "open.questionnaire", from: 4, to: 4, note: "10.4 小明稿：提到看过她填的问卷，判断之前没人跟她详细聊过规划，引出她对未来没方向。" },
      { purposeKey: "scan.parents", from: 5, to: 8, note: "10.4 小明稿：问父母怎么说的，得知父母想让她考公、转会计，她怕自己英语不好、转专业没精力。" },
      { purposeKey: "scan.volunteer", from: 9, to: 12, note: "10.4 小明稿：问她到底转不转、高中是不是没学英语，得知她高中学俄语、自己不想转，父母觉得会计变国控后好考。" },
      { purposeKey: "scan.family-burden", from: 21, to: 30, note: "10.4 小明稿：问家里弟弟和父母负担，算体制内两三千工资够不够生活，确认家里不能完全兜底。" },
      { purposeKey: "window.final-goal", from: 31, to: 32, note: "10.4 小明稿：讲真正稳定的不是体制内，而是有能力去哪都被高薪聘请，把目标从考公拉回就业能力。" },
      { purposeKey: "diag.major.switch", from: 33, to: 40, note: "10.4 小明稿：讲转专业：她不想转、想等这学期成绩，咨询师提醒英语不能挂科、零门槛也要留退路，进可攻退可守。" },
      { purposeKey: "diag.major", from: 41, to: 44, note: "10.4 小明稿：分析文科转会计要学高数、考会计证，辅修压力大，建议真想做会计就转、否则坚定汉语言。" },
      { purposeKey: "diag.major.reality", from: 45, to: 52, note: "10.4 小明稿：讲汉语言就业现实：教师饱和，行政文秘、运营、融媒体编辑，毕业即失业是因为只靠本专业。" },
      { purposeKey: "window.english-leverage", from: 53, to: 54, note: "10.4 小明稿：讲复合型人才：汉语言加英语可以做海外内容运营、外企品牌文案、留学内容。" },
      { purposeKey: "window.track-uncertain", from: 55, to: 56, note: "10.4 小明稿：建议寒暑假实习验证岗位真实薪资，目标模糊时先选一个走到哪都有用的能力。" },
      { purposeKey: "filter.english", from: 57, to: 60, note: "10.4 小明稿：带她排出英语和表达，确认表达已经具备，英语是当前要补的通用能力。" },
      { purposeKey: "window.english-leverage", from: 61, to: 62, note: "10.4 小明稿：讲会计加英语最赚钱，可进外企、外派岗，国内也能处理海外公司账目。" },
      { purposeKey: "scan.score", from: 63, to: 66, note: "10.4 小明稿：聊她高中改学俄语的经历，俄语难、英语相对简单，确认她英语基础弱是语种切换造成的。" },
      { purposeKey: "offer.find-teacher", from: 67, to: 74, note: "10.4 小明稿：聊昨天微微老师的单词课，她认可偏旁记词法；咨询师说明公开课只讲大致方法、免费名额是争取来的。" },
      { purposeKey: "offer.need.plan", from: 75, to: 76, note: "10.4 小明稿：指出只听三节公开课学不深，真正有效要先测评再按她当前水平配课。" },
      { purposeKey: "offer.self-study", from: 77, to: 80, note: "10.4 小明稿：她打算自己先学、背单词，咨询师纠正顺序：先52个音标和发音规则，再单词、语法。" },
      { purposeKey: "offer.pitfall.feedback", from: 81, to: 84, note: "10.4 小明稿：她准备上网搜发音自己念，咨询师追问怎么知道读得准不准，指出自学缺纠音反馈。" },
      { purposeKey: "offer.close.price", from: 85, to: 89, note: "10.4 小明稿：她说觉得贵、没想找，咨询师用打分问出除了钱还有“怕被约束”的顾虑。" },
      { purposeKey: "offer.pitfall.sunk", from: 100, to: 104, note: "10.4 小明稿：她担心初中报英语课没效果，咨询师指出那次没测评、没从发音教，是课的方法问题不是她的问题。" },
      { purposeKey: "trust.result", from: 105, to: 109, note: "10.4 小明稿：用朋友高考五六十分、专升本后系统学英语、做家教带父母旅游的案例，说明学好后的正向循环。" },
      { purposeKey: "offer.close.parents", from: 110, to: 114, note: "10.4 小明稿：她说要跟父母商量，咨询师预判父母最在意效果，教她用试课和合同去说服。" },
      { purposeKey: "offer.close.risk-reversal", from: 115, to: 116, note: "10.4 小明稿：介绍先分期再七天试课、不满意可退、签合同盖章，降低她和父母的风险。" },
      { purposeKey: "offer.close.parents", from: 117, to: 119, note: "10.4 小明稿：提醒今晚就跟父母说，沟通只有支持和不支持两种结果，让她提前想好怎么表达。" }
    ]
  },
  {
    id: "dz35",
    label: "10.4 Lucan咨询稿",
    file: "zxg/dz_zxg/10.4+宋佳琦+26063078+Lucan+大一家里不支持.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "trust.self-disclosure", from: 3, to: 16, note: "10.4 Lucan稿：用外婆生病起头，讲自己从小跟奶奶长大、奶奶转院时钱不够，引出“渴望经济独立”和“成长速度决定父母生命质量”，建立相似性。" },
      { purposeKey: "filter.tutor", from: 17, to: 20, note: "10.4 Lucan稿：从“英语家教能赚钱”切入，讲学校不教发音、家教看能力不看学历，给校园墙、家教群、闲鱼等渠道，说明周末不影响上课。" },
      { purposeKey: "diag.major.reality", from: 21, to: 28, note: "10.4 Lucan稿：讲视觉传达就业分层：套模板低价、AI冲击，建议专业加AI加英语做海外营销视觉设计，对比国内三四千和海外一两万。" },
      { purposeKey: "window.442", from: 29, to: 32, note: "10.4 Lucan稿：用442讲企业招人看学历20%、经历和能力各40%，学历只卡本科，重点看比赛、作品集和英语口语。" },
      { purposeKey: "offer.close.price", from: 33, to: 37, note: "10.4 Lucan稿：她嫌英语班贵，咨询师确认价格近4000、自己也是分期，首期900多，生活费只出两三百，其余找朋友周转。" },
      { purposeKey: "filter.tutor", from: 38, to: 42, note: "10.4 Lucan稿：讲自己学一个月就接翻译家教，60到100一小时、周末4小时约960，转介绍两个小朋友后月近2000，用收入覆盖学费。" },
      { purposeKey: "offer.close.self-fund", from: 43, to: 44, note: "10.4 Lucan稿：讲钱不够就周转、跟老师申请延迟或暂停，把大问题拆成小问题解决。" },
      { purposeKey: "offer.close.parents", from: 45, to: 46, note: "10.4 Lucan稿：讲家里不支持、跟妈妈讲三天讲到哭，最后用七天试课和几百块先启动，说明父母认知局限不等于不爱。" },
      { purposeKey: "offer.handoff", from: 47, to: 52, note: "10.4 Lucan稿：讲课程形式：先测评再匹配精品视频课，录播为主，四六级技巧和一对一外教是直播，因材施教。" },
      { purposeKey: "offer.compare", from: 53, to: 56, note: "10.4 Lucan稿：对比网上免费资料：不全、不按水平配课、没人纠音，强调每天纠音才有效。" },
      { purposeKey: "offer.need.path", from: 57, to: 60, note: "10.4 Lucan稿：讲科学路径：先52音标和发音规则，再单词语法，一个月能读流利但自由交流要学完。" },
      { purposeKey: "diag.english.speed", from: 64, to: 65, note: "10.4 Lucan稿：纠正“以前英语没学好”的归因：以前老师只教应试刷题，不教发音和表达，大学和工作看的是能不能说。" },
      { purposeKey: "scan.volunteer", from: 66, to: 68, note: "10.4 Lucan稿：讲自己被调剂到学前教育、现在做教育自媒体，说明专业不决定出路。" },
      { purposeKey: "scan.family-burden", from: 69, to: 72, note: "10.4 Lucan稿：聊学费一万多、民办还是公办，提醒她大学时间要用来积累能找工作的能力。" },
      { purposeKey: "window.experience-first", from: 73, to: 74, note: "10.4 Lucan稿：讲经济独立越早越好，用省奶茶、泡芙的例子说明自己赚钱后的底气和自由。" },
      { purposeKey: "trust.result", from: 75, to: 77, note: "10.4 Lucan稿：用朋友专升本、英语四五十分、学七八个月后做家教带父母去日本，证明基础差也能出结果。" },
      { purposeKey: "filter.internship", from: 77, to: 81, note: "10.4 Lucan稿：讲实习渠道：智联招聘投简历，大一暑假先积累能力再投，不然简历没东西写。" },
      { purposeKey: "filter.competition", from: 85, to: 88, note: "10.4 Lucan稿：讲大英赛、外研社、四六级是国家级证书，12月四级可以先考、以后还能刷分。" },
      { purposeKey: "offer.handoff", from: 91, to: 102, note: "10.4 Lucan稿：介绍课程服务：助教和成长私教、入学测评分级、小班限额、老师本人带教研、央视采访。" },
      { purposeKey: "offer.ask-plan", from: 103, to: 104, note: "10.4 Lucan稿：问她现在最想解决的是钱还是效果，把话题收到“要不要跟老师学”。" },
      { purposeKey: "trust.result", from: 107, to: 117, note: "10.4 Lucan稿：发朋友学七个月判若两人的视频，说明基础差不是问题，有方法和反馈后整个人会变自信。" },
      { purposeKey: "diag.money", from: 118, to: 119, note: "10.4 Lucan稿：她讲家里妹妹读书、房贷、爸爸经济压力大，咨询师接住她不敢再花家里钱的顾虑。" },
      { purposeKey: "scan.money", from: 120, to: 123, note: "10.4 Lucan稿：问生活费谁给、手里有多少，确认爸爸不给生活费、妈妈给，算首期能不能撑住。" },
      { purposeKey: "offer.trust", from: 175, to: 186, note: "10.4 Lucan稿：讲季度和年度奖学金、老师人品、央视采访、送书、企业微信本人回复，建立机构和老师可信度。" },
      { purposeKey: "filter.tutor", from: 193, to: 194, note: "10.4 Lucan稿：她说寒假想去做家教赚钱，咨询师肯定学一个月就能去，自己就是一个月开始接家教。" },
      { purposeKey: "offer.close.hesitation", from: 197, to: 204, note: "10.4 Lucan稿：讲自己凑钱会更有动力、初中补习班是随大众，鼓励她这次为自己真正想要的东西拼一次。" },
      { purposeKey: "offer.close.parents", from: 207, to: 213, note: "10.4 Lucan稿：讲家里以后靠她、跟爸爸说不说都行，先拿结果再跟家里说，地位和话语权会不一样。" },
      { purposeKey: "offer.close.parents", from: 231, to: 237, note: "10.4 Lucan稿：她不想跟爸爸说、妈妈会支持但怕花他们钱，咨询师建议先付第一期试七天，拿结果再告诉妈妈。" },
      { purposeKey: "offer.close.enroll", from: 238, to: 240, note: "10.4 Lucan稿：让她赶紧找助教问分期和学习名额。" },
      { purposeKey: "offer.handoff", from: 241, to: 243, note: "10.4 Lucan稿：聊军训期间怎么安排学习：每天三四十分钟、假期多学、找空教室或外面学。" }
    ]
  },
  {
    id: "dz36",
    label: "10.4 九思咨询稿",
    file: "zxg/dz_zxg/10.4+王欣+260301065+九思+先跟爸妈沟通一下，不行就自己想办法提前预支生活费_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 3, note: "10.4 九思稿：确认她在寝室、还有两个室友、耳机是否方便，先把通话环境落地。" },
      { purposeKey: "open.questionnaire", from: 4, to: 5, note: "10.4 九思稿：复述她问卷回复认真、有自己想法，肯定她大一就愿意梳理规划。" },
      { purposeKey: "diag.postgrad", from: 6, to: 10, note: "10.4 九思稿：确认她考研目标明确、想冲 211/985，说明大一要先了解上岸率和院校流程。" },
      { purposeKey: "diag.postgrad.pool", from: 11, to: 14, note: "10.4 九思稿：给出考研平均上岸率 24.5%、统考约 15%，并拆出 985、211、普通本科三批竞争对手。" },
      { purposeKey: "diag.postgrad.timeline", from: 15, to: 19, note: "10.4 九思稿：拆初试四门课结构，区分考数学与不考数学，纠正她“政治英语语文”的错误认知。" },
      { purposeKey: "diag.postgrad.strategy", from: 20, to: 25, note: "10.4 九思稿：说明专业课、政治、数学都更适合大三集中备考，大一先打基础，不提前死记硬背。" },
      { purposeKey: "window.english-leverage", from: 26, to: 28, note: "10.4 九思稿：讲考研英语一/二和四六级的关系，指出英语是当下唯一能立刻入手的科目。" },
      { purposeKey: "window.ai-era", from: 31, to: 33, note: "10.4 九思稿：用命题组“国家需要真正人才”和 AI 能替代刷题，说明研究生必须能灵活运用英语。" },
      { purposeKey: "diag.english", from: 34, to: 39, note: "10.4 九思稿：用四六级 550 分的人考研英语只有四五十分，说明考研英语难度和读文献的门槛。" },
      { purposeKey: "diag.postgrad.timeline", from: 40, to: 48, note: "10.4 九思稿：讲国家线、院校线、单科线三道线，指出很多人因英语单科线被直接淘汰。" },
      { purposeKey: "diag.english", from: 50, to: 55, note: "10.4 九思稿：讲复试全英文自我介绍、导师结合专业提问，提炼表达、英语、专业、科研竞赛四项能力。" },
      { purposeKey: "filter.timeline", from: 56, to: 58, note: "10.4 九思稿：建议大一专心把英语练到自由交流，大二再参加科研竞赛和实习。" },
      { purposeKey: "filter.timeline", from: 63, to: 66, note: "10.4 九思稿：把大三定为全力冲刺、大四定为稳住心态，强调前期英语打好后大三更从容。" },
      { purposeKey: "filter.one-ability", from: 69, to: 71, note: "10.4 九思稿：提出赢者思维，先分析对手是谁、再想怎么赢，最后收敛到英语这一项关键能力。" },
      { purposeKey: "window.english-leverage", from: 72, to: 77, note: "10.4 九思稿：讲差异化竞争和比速度，说明英语口语是大多数人没有、最能拉开差距的能力。" },
      { purposeKey: "diag.english.method", from: 78, to: 80, note: "10.4 九思稿：接住她听直播后的感受，指出十几年学英语开不了口是方法从一开始就错了。" },
      { purposeKey: "offer.three-needs", from: 81, to: 83, note: "10.4 九思稿：讲针对性学习方案和有人纠正反馈，说明自己盲目学不知道楼层、错了也没人管。" },
      { purposeKey: "trust.self-disclosure", from: 84, to: 85, note: "10.4 九思稿：讲自己家里养鸡、有弟弟、想改变家庭，所以庆幸当时抓住机会。" },
      { purposeKey: "diag.money", from: 86, to: 87, note: "10.4 九思稿：她说很想学但经济不允许、家里只有爸爸，咨询师用自己的分期经历接住。" },
      { purposeKey: "filter.tutor", from: 88, to: 92, note: "10.4 九思稿：算家教变现账：学一个月音标就能教小学生，时薪从四五十涨到 200，月入一两千。" },
      { purposeKey: "offer.close.parents", from: 93, to: 95, note: "10.4 九思稿：建议前期不告诉父母、先做后说，等做出结果再让他们看到。" },
      { purposeKey: "offer.trust", from: 96, to: 99, note: "10.4 九思稿：回应亲戚做教育/线下老师教不好，强调魏老师人大北大双硕士、央视采访的稀缺性。" },
      { purposeKey: "offer.close.self-fund", from: 100, to: 104, note: "10.4 九思稿：问出手上钱和生活费 1500，给出多要两三百、提前预支生活费的周转办法。" },
      { purposeKey: "offer.close.parents", from: 115, to: 118, note: "10.4 九思稿：给出和父母沟通五步：先理解感谢，再讲规划、英语、为什么不靠学校，最后讲课程和分期。" },
      { purposeKey: "offer.three-pitfalls", from: 121, to: 127, note: "10.4 九思稿：她说靠自己自律，咨询师用 B 站小红书免费资源无效说明缺方法、缺反馈、缺人陪。" },
      { purposeKey: "offer.close.risk-reversal", from: 128, to: 131, note: "10.4 九思稿：讲 980 第一期加七天全额退款，交多少退多少、有合同，降低她怕被骗的风险。" },
      { purposeKey: "diag.parents", from: 140, to: 144, note: "10.4 九思稿：她怕跟父母沟通被反复说被骗、吵起来，咨询师判断这种沟通可能反而添堵。" },
      { purposeKey: "offer.close.risk-reversal", from: 145, to: 148, note: "10.4 九思稿：讲保留学籍机制：第二期交不上可暂停，发音课永久保留，可边练边做家教攒钱。" },
      { purposeKey: "offer.close.enroll", from: 149, to: 152, note: "10.4 九思稿：落到先抢券、等生活费到账或提前预支，再找助教办理分期和入学。" },
      { purposeKey: "offer.close.followup", from: 153, to: 155, note: "10.4 九思稿：约定报名后分享进展、评奖学金，后续问题直接微信联系。" }
    ]
  },
  {
    id: "dz37",
    label: "10.4 小钱咨询稿",
    file: "zxg/dz_zxg/10.4+胡余敏+260301087+小钱+大一+姐姐说不着急，她姐姐有报课失败经历，打算小金库学_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 4, note: "10.4 小钱稿：开场夸声音、说自己感冒，顺着“家里四个小孩”问她姐姐大几、有没有分享大学经验，先确认本人再进正题。" },
      { purposeKey: "open.questionnaire", from: 5, to: 5, note: "10.4 小钱稿：直接点出问卷里“老迷茫、开始考虑考公考编”，并说老师布置了思考任务，用问卷细节切入。" },
      { purposeKey: "scan.volunteer", from: 11, to: 12, note: "10.4 小钱稿：问她汉语言专业是不是自己选的，她说网上搜能报什么就填了，咨询师顺势讲“选择多不等于好上岸”。" },
      { purposeKey: "filter.track", from: 12, to: 26, note: "10.4 小钱稿：把考公、事业编、教师编逐条拆开：国考省考150-300人抢一个、乡镇岗位基层化、出生率下降取消编制、教师编130-150人竞争，让她看到每条路的门槛。" },
      { purposeKey: "window.final-goal", from: 30, to: 39, note: "10.4 小钱稿：问“上大学的终极目标是什么”，她说提升自己和经济独立，咨询师把目标拉到四年后好就业，并讲1200多万毕业生的就业形势。" },
      { purposeKey: "window.competition-pool", from: 39, to: 40, note: "10.4 小钱稿：用每年1200-1300万毕业生、2038年峰值1600万，说明就业竞争池只会越来越大。" },
      { purposeKey: "diag.school-gap", from: 48, to: 58, note: "10.4 小钱稿：用清华全班报班、大学老师没社会经验、汉语言课程用不上，说明学校教的不够，学历之外要靠自己补能力和经历。" },
      { purposeKey: "filter.timeline", from: 59, to: 63, note: "10.4 小钱稿：讲大学真正能用来丰富简历只有两年半，大三下就要考研/秋招做选择，倒推大一大二该做什么。" },
      { purposeKey: "window.442", from: 65, to: 72, note: "10.4 小钱稿：讲442法则：能力40%、经验40%、学历20%，经验又分校内高含金量证书/竞赛和校外实习。" },
      { purposeKey: "window.final-goal", from: 73, to: 77, note: "10.4 小钱稿：用研究生送外卖、985文科生月薪3000，说明高学历不等于高竞争力，本科20分学历已拿10分，能力经验各30%就到70%。" },
      { purposeKey: "diag.motivation", from: 78, to: 82, note: "10.4 小钱稿：讲先有能力才有经验，没能力参赛只能陪跑，长期没正反馈就会自我否定放弃。" },
      { purposeKey: "filter.internship", from: 83, to: 90, note: "10.4 小钱稿：讲实习分阶段：大一多探索、大二定方向深耕、大二下进核心岗位，大三简历才有2-3段经历。" },
      { purposeKey: "filter.one-ability", from: 91, to: 95, note: "10.4 小钱稿：问她当下性价比最高的能力，她说英语；咨询师补上英语有基础、应用广、升学就业考研考公都能用。" },
      { purposeKey: "window.english-leverage", from: 95, to: 107, note: "10.4 小钱稿：把汉语言加英语落到出海文案、跨境电商、外贸、公关、图书翻译等岗位，讲双语岗位8-9k到1万+的薪资差。" },
      { purposeKey: "diag.ai", from: 95, to: 95, note: "10.4 小钱稿：同一段里指出写文书类工作AI能替代，说明纯中文能力不够，要把专业和英语结合。" },
      { purposeKey: "filter.tutor", from: 108, to: 111, note: "10.4 小钱稿：用口语家教算账：时薪100、周内5小时、月入1.5万，能覆盖学费生活费并支撑看演唱会。" },
      { purposeKey: "trust.self-disclosure", from: 113, to: 115, note: "10.4 小钱稿：讲自己大一下跟微微老师学英语、拿到内部实习，认识一群清醒的人，用共同经历建立相似性。" },
      { purposeKey: "diag.english", from: 116, to: 118, note: "10.4 小钱稿：问她四级听力练过没，讲四级听力只放一遍、语速180词每分钟，和高中完全不同，背单词刷题不够。" },
      { purposeKey: "offer.ask-plan", from: 119, to: 120, note: "10.4 小钱稿：问她发音打算怎么学、有没有找到适合的资源，先让她说自己的方案。" },
      { purposeKey: "offer.self-study", from: 120, to: 123, note: "10.4 小钱稿：她说暑假跟视频跟读，咨询师用汉语拼音类比，指出没学发音规则就跟读句子是囫囵吞枣。" },
      { purposeKey: "offer.compare", from: 126, to: 134, note: "10.4 小钱稿：姐姐报过网上课没效果，咨询师区分初高中补课和大学能力课，说初高中补课换汤不换药、大学英语课也水。" },
      { purposeKey: "offer.close.parents", from: 135, to: 137, note: "10.4 小钱稿：姐姐让她先自己学，咨询师说不能纯听姐姐的，要看姐姐是否拿到结果、是否活成她想成为的样子。" },
      { purposeKey: "diag.english.speed", from: 123, to: 126, note: "10.4 小钱稿：用my的发音示范口型、舌位、时长，说明单个音没搞准就跟读句子很难，基础要一步步打。" },
      { purposeKey: "offer.need.plan", from: 138, to: 138, note: "10.4 小钱稿：讲报名后有入学测评，按发音/听说读写基础定制学习方案和节奏。" },
      { purposeKey: "offer.close.price", from: 140, to: 141, note: "10.4 小钱稿：她小金库一千多，咨询师说最多分四期、第一期九百多，让她去问助教老师。" },
      { purposeKey: "offer.close.risk-reversal", from: 142, to: 142, note: "10.4 小钱稿：介绍七天试学，七天内效果不好交多少退多少，零成本试错。" },
      { purposeKey: "offer.handoff", from: 145, to: 145, note: "10.4 小钱稿：说老师会给内部学员提供实习，先过渡学东西再进阶找更好的平台。" },
      { purposeKey: "offer.close.followup", from: 146, to: 146, note: "10.4 小钱稿：收尾说之后英语或实习有问题可以再找她，并答应帮忙对接人脉。" }
    ]
  },
  {
    id: "dz38",
    label: "10.4 小玖咨询稿",
    file: "zxg/dz_zxg/10.4+马术菊+260301063+小玖+大一+想要考研_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 8, note: "10.4 小玖稿：开场先确认她刚在回寝室消息，得知她打字慢，直接说“你可以直接跟我说”，把聊天从文字拉到语音，轻松落地后再问她大一有什么困惑。" },
      { purposeKey: "filter.lab", from: 27, to: 28, note: "10.4 小玖稿：以她学校的红楼梦研究组为例，问大一能不能进、招什么人，指出能力不够老师不会要，想进课题组得先有优于别人的能力。" },
      { purposeKey: "scan.parents", from: 33, to: 37, note: "10.4 小玖稿：从“家里几个小孩”聊到妹妹初一，说自己也有弟弟，强调她是老大要给妹妹做榜样，再问父母职业，得知是工人、很辛苦。" },
      { purposeKey: "open.questionnaire", from: 38, to: 38, note: "10.4 小玖稿：复述问卷里“希望大学期间经济独立、不想压力那么大”这句，问她是不是因为父母工作辛苦，用具体细节让她知道问卷被认真看过。" },
      { purposeKey: "scan.family-burden", from: 39, to: 42, note: "10.4 小玖稿：问出助学贷款每年2万、四年8万，学费全靠贷款，毕业后要自己还；又提到妹妹即将上高中用钱，把经济负担算具体。" },
      { purposeKey: "diag.postgrad", from: 42, to: 47, note: "10.4 小玖稿：问她为什么考研，得到“专业竞争力太大、想提高文凭、想当高中或大学老师”，再指出当老师基本要研究生且四川教育很卷。" },
      { purposeKey: "trust.self-disclosure", from: 54, to: 55, note: "10.4 小玖稿：指出她“没看出来在尽全力”，随即讲自己高考后意识到只是公办二本、七月就开始查考研信息、八月已报魏老师课学英语，用同起点经历对比她的“不着急”。" },
      { purposeKey: "window.final-goal", from: 69, to: 70, note: "10.4 小玖稿：让她别停在“想考川大”的想法，先明确目标和对手，再一步一步倒推每个阶段做什么；并提到就业大环境，把考研放回最终去向里看。" },
      { purposeKey: "filter.certificates", from: 70, to: 72, note: "10.4 小玖稿：接住她自排的“四六级→计算机二级→教资”证书顺序，指出大学资源都要抢、她没抢到四级只能等明年，且以现在基础两个月备考四级大概率过不了。" },
      { purposeKey: "diag.postgrad.timeline", from: 75, to: 77, note: "10.4 小玖稿：问她考研什么时候开始准备，她说“现在准备都觉得晚”，咨询师用自己高考毕业就开始准备对比，强调越早越好，并说大三才开始的人往往一路焦虑上不了岸。" },
      { purposeKey: "diag.postgrad.pool", from: 78, to: 80, note: "10.4 小玖稿：给出每年四五百万人报考、全国上岸约20%，再按985/211、一本、二本、民办层层往下压，说明她所在层级的竞争池更窄。" },
      { purposeKey: "filter.postgrad-plan", from: 83, to: 86, note: "10.4 小玖稿：把初试拆成国家线、目标院校线、单科线三条线，用高考本科线类比国家线，强调单科线尤其英语一票否决，再说明她考英语、政治、专业课且不考数学。" },
      { purposeKey: "filter.english", from: 92, to: 96, note: "10.4 小玖稿：她自认英语不好，咨询师先排除政治（考前半年背即可）和专业课（同专业人人都在学），再用高考英语90多分与130—140分的差距，论证英语是唯一可控的拉分项。" },
      { purposeKey: "diag.school-gap", from: 105, to: 112, note: "10.4 小玖稿：讲考研复试的学历歧视，设问“同等条件下二本和双一流老师选谁”，指出川大隐性门槛九成以上是双一流，二本只能靠更强的个人能力掩盖学历弱势。" },
      { purposeKey: "filter.tutor", from: 143, to: 157, note: "10.4 小玖稿：用汉语言学姐英语好学到大二经济独立、大四存几万的例子，说明英语家教需求大、不卡学历、试课即可验证；再按周末4小时×100元算出一月3200，把口语变成现金流。" },
      { purposeKey: "window.english-leverage", from: 145, to: 147, note: "10.4 小玖稿：把英语口语从考试科目重定义为杠杆：考研要考、说好口语的人稀缺，还能直接做家教变现；对比普通家教一小时五六十和口语家教更高的议价空间。" },
      { purposeKey: "window.track-uncertain", from: 187, to: 188, note: "10.4 小玖稿：建议她大一就把英语学起来并用它赚钱，借此验证自己适不适合当老师；讲自己当家教后发现不适合，转而实习、做自媒体，说明方向可以边做边验。" },
      { purposeKey: "offer.ask-plan", from: 193, to: 196, note: "10.4 小玖稿：先问她打算怎么学英语，她答“明天先报个班学口语”，咨询师追问为什么选报班，接住她“想不到其他方式”的回答。" },
      { purposeKey: "scan.existing-course", from: 197, to: 203, note: "10.4 小玖稿：盘点她从小到大只报过舞蹈兴趣班，英语只在应试上补过、从没为口语花过钱，同时肯定她家愿意在学习上投资。" },
      { purposeKey: "filter.timeline", from: 205, to: 206, note: "10.4 小玖稿：用自己跟老师学三个月就能做家教对比自学多年学不明白，倒推大学四年：大四考研、大三系统准备、大一大二把英语练好并多赚点钱。" },
      { purposeKey: "offer.trust", from: 208, to: 212, note: "10.4 小玖稿：以“我也是跟魏老师学过来的”和表妹案例建立信任，说明老师招生一批批、一个老师服务人数有限所以名额稀缺，表妹等几个月只能背单词，最后用小金库加借款交第一期。" },
      { purposeKey: "offer.close.parents", from: 213, to: 215, note: "10.4 小玖稿：问她是用小金库、分期还是跟父母商量，她说要商量但不确定支持；咨询师用表妹商量多次没同意、最后自己凑钱先学的例子，引导她先抓住机会。" },
      { purposeKey: "offer.close.enroll", from: 218, to: 219, note: "10.4 小玖稿：给出明确下一步——今晚找老师协调优惠名额、直接报上名，明天做入学测评对接老师，趁假期进入每天1小时的学习状态。" },
      { purposeKey: "offer.handoff", from: 219, to: 222, note: "10.4 小玖稿：介绍课程节奏——每天1小时、三四个月学完，后面接四级课和考研课，老师按周/月排计划，课程可学到毕业后一年，还能给妹妹用。" },
      { purposeKey: "offer.close.price", from: 223, to: 225, note: "10.4 小玖稿：把费用拆成分期，第一期980元，确认她拿得出；再用“钱花在自己能力上、想超过985的人就得付出”降低价格心理门槛。" },
      { purposeKey: "offer.close.followup", from: 230, to: 231, note: "10.4 小玖稿：约定她把今天的信息差整理成笔记发来、今晚看完最后一场直播，之后用语音分享学校的事来锻炼表达，建立课后跟进。" }
    ]
  },
  {
    id: "dz40",
    label: "10.4 代代咨询稿",
    file: "zxg/dz_zxg/10.4罗兰英260401026代代大二担心钱极其犹豫_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 2, note: "10.4 代代稿：从新疆时差和普通话聊起，确认学生本人和声音状态。" },
      { purposeKey: "open.agenda", from: 11, to: 11, note: "10.4 代代稿：说明这次不是只讲英语，而是讲整体大学规划，先给出“以终为始”的框架。" },
      { purposeKey: "trust.permission", from: 12, to: 13, note: "10.4 代代稿：让学生拿纸笔记、大胆说真实想法，并解释“以终为始”是先定最终目标再倒推。" },
      { purposeKey: "scan.family-burden", from: 14, to: 17, note: "10.4 代代稿：了解到妈妈一个人带四个孩子、学生是长姐，所以不想再读三年研、想早点赚钱减轻负担。" },
      { purposeKey: "scan.parents", from: 17, to: 20, note: "10.4 代代稿：妈妈让她别担心钱、有机会就考研，还会在抖音刷英语内容转发给她，确认妈妈支持学习。" },
      { purposeKey: "window.final-goal", from: 20, to: 21, note: "10.4 代代稿：把最终目标定成“找到满意工作、多赚钱减轻家里负担”，不只是养活自己。" },
      { purposeKey: "diag.postgrad", from: 21, to: 25, note: "10.4 代代稿：问考研是否接受去内陆、是否留在新疆，学生说想法美好但顾虑多；确认没有助学贷款，妈妈在兜底。" },
      { purposeKey: "diag.motivation", from: 26, to: 31, note: "10.4 代代稿：问大一有没有做到妈妈说的好好学习、简历上积累了什么，学生说失望；咨询师把原因归到学校水课、没人教，而不是她不努力。" },
      { purposeKey: "window.442", from: 32, to: 46, note: "10.4 代代稿：从“社会需要什么人”讲到简历三要素，带学生给学历/经历/能力分100分，最后给出学历20%、经历40%、能力40%的442法则。" },
      { purposeKey: "diag.postgrad.timeline", from: 47, to: 60, note: "10.4 代代稿：用药学举例讲学历标配和三甲门槛，拆考研初试（政治/英语/药学综合）与复试（笔试/综合面试/英语交流），说明考研也要看简历。" },
      { purposeKey: "diag.english", from: 60, to: 62, note: "10.4 代代稿：学生问现在学英语还来得及吗，咨询师用“种树最好十年前其次现在”接住，并指出新疆不考听力但四六级和考研要考。" },
      { purposeKey: "filter.certificates", from: 63, to: 69, note: "10.4 代代稿：列校园内证书，明确四六级优先、计算机二级可考，强调医院校招会硬性看四六级。" },
      { purposeKey: "filter.competition", from: 70, to: 74, note: "10.4 代代稿：介绍药苑论坛、互联网+、挑战杯需要团队，大英赛可以个人参加，建议有团队就打、没有至少打大英赛。" },
      { purposeKey: "filter.internship", from: 75, to: 80, note: "10.4 代代稿：强调尽早实习，学校只在大三统一安排一次且看成绩，普通家庭没有人脉更要靠实习积累。" },
      { purposeKey: "filter.tutor", from: 81, to: 86, note: "10.4 代代稿：建议做非体力兼职，从英语家教入手，用自己的经历说明家教比摇奶茶更能写进简历。" },
      { purposeKey: "filter.tutor", from: 86, to: 99, note: "10.4 代代稿：带学生算家教账：50/小时、10天1000、三个学生一个假期9000，说明能覆盖生活费和家里大部分开支。" },
      { purposeKey: "window.experience-first", from: 100, to: 103, note: "10.4 代代稿：把家教讲成一份多得的经历：能赚钱、能写简历、能练英语和表达，先有能力再赚钱。" },
      { purposeKey: "diag.money", from: 103, to: 105, note: "10.4 代代稿：指出学生连续两天因为经济原因放弃学习，很多家庭问题本质是经济问题，要用赚钱能力解决。" },
      { purposeKey: "filter.one-ability", from: 105, to: 113, note: "10.4 代代稿：把能力拆成专业能力和核心通用能力（英语、表达），说明大一先抓通用能力，简历闭环后考研就业都通。" },
      { purposeKey: "window.english-leverage", from: 120, to: 121, note: "10.4 代代稿：回应学生表达弱，指出教小孩发音的过程同时练表达和英语，鼓励从家教机会开始。" },
      { purposeKey: "scan.existing-course", from: 129, to: 131, note: "10.4 代代稿：问大一英语课怎么样，学生说不怎么听、背单词背了就忘，确认她只有零散自学。" },
      { purposeKey: "offer.compare", from: 132, to: 141, note: "10.4 代代稿：学生说听老师直播感觉不一样、认识很多单词，咨询师对比以前只会背单词刷题，说明老师方法打开新世界。" },
      { purposeKey: "offer.close.price", from: 142, to: 144, note: "10.4 代代稿：建议像自己一样分期，第一个月边学边做家教赚钱，用后面的收入承担学费，不增加妈妈负担。" },
      { purposeKey: "diag.parents", from: 145, to: 151, note: "10.4 代代稿：妈妈最近生病，学生纠结要不要说；咨询师区分“先跟妈妈说”和“先试再说的怕失望”，确认妈妈大概率支持。" },
      { purposeKey: "offer.close.risk-reversal", from: 151, to: 155, note: "10.4 代代稿：把分期解释成退路：第一个月有收获才交第二个月，加上七天无理由，随时可以止损。" },
      { purposeKey: "filter.tutor", from: 155, to: 158, note: "10.4 代代稿：教学生用食堂阿姨的人脉招生，先免费教一天再决定是否继续，把家教第一步落到具体动作。" },
      { purposeKey: "offer.close.hesitation", from: 158, to: 167, note: "10.4 代代稿：学生反复说犹豫、点进直播又退出，咨询师用“最小成本试错”“有姐在你旁边”推动她先行动。" },
      { purposeKey: "offer.close.parents", from: 168, to: 172, note: "10.4 代代稿：建议先用980试六七天，等有结果再跟妈妈说，这样不是先斩后奏，而是拿体验说服她。" },
      { purposeKey: "offer.close.enroll", from: 173, to: 180, note: "10.4 代代稿：推动她今天就找助教老师办分期、做测评，确认优惠券已领取，把报名落到今晚的动作。" },
      { purposeKey: "offer.handoff", from: 186, to: 187, note: "10.4 代代稿：说明课程是视频课+录播、按没课时间学，约好找泽培老师办分期并整理今天的笔记。" }
    ]
  },
  {
    id: "dz41",
    label: "10.4 小希咨询稿",
    file: "zxg/dz_zxg/10.4郭康兰+编号260301064+小希专一_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 8, note: "10.4 小希稿：开场喊小西，问她是不是刚起床、几点吃饭、爸妈催不催，用作息话题确认本人和环境。" },
      { purposeKey: "open.questionnaire", from: 9, to: 9, note: "10.4 小希稿：她忘了问卷内容，咨询师直接说“聊你的规划、你填的问题”，把她拉回咨询场景。" },
      { purposeKey: "diag.choose", from: 9, to: 10, note: "10.4 小希稿：问今天最想解决什么，她说专升本、英语、赚钱三个都重要，咨询师按这个顺序先讲专升本。" },
      { purposeKey: "filter.track", from: 10, to: 25, note: "10.4 小希稿：让她先说专升本了解：四科、院考校考、惠州学院、只能考广东本地，咨询师补录取人数和院校限制。" },
      { purposeKey: "scan.existing-course", from: 26, to: 29, note: "10.4 小希稿：她说已经对比四家机构、想先报一科英语，咨询师追问“为什么先学英语”。" },
      { purposeKey: "diag.english", from: 30, to: 31, note: "10.4 小希稿：她说怕英语跟不上、想先打基础再学专业课和数学，咨询师肯定这个判断。" },
      { purposeKey: "offer.compare", from: 32, to: 47, note: "10.4 小希稿：机构发单词书让她中英对照背，咨询师指出这就是高中死记硬背，性价比不能只看便宜，要看效果。" },
      { purposeKey: "window.final-goal", from: 48, to: 58, note: "10.4 小希稿：问她为什么专升本，她说提升学历和认知；咨询师讲学历是网申门槛、专科岗位少、专业毕业即失业，把目标落到就业。" },
      { purposeKey: "filter.track", from: 59, to: 65, note: "10.4 小希稿：讲广东部分本科停招专升本、惠州学院录取人数从200降到80-90，专升本只有一次机会，竞争很残酷。" },
      { purposeKey: "filter.timeline", from: 65, to: 82, note: "10.4 小希稿：让她在纸上写专一/专二/专三：专三考试加实习、专二专业课加四六级加自己找实习、专一打地基，倒推三年节奏。" },
      { purposeKey: "filter.internship", from: 82, to: 87, note: "10.4 小希稿：讲抓关键：别人只考四级她考六级高分、别人不知道实习她自己去，简历多写数据和经历、少写形容词。" },
      { purposeKey: "filter.tutor", from: 88, to: 94, note: "10.4 小希稿：算家教账：一小时70、周末4小时280、月1120，建议她做家教而不是纯打工。" },
      { purposeKey: "window.english-leverage", from: 95, to: 96, note: "10.4 小希稿：讲英语能同时带动专升本、四六级、家教和计算机专业课，是她未来反复用的能力。" },
      { purposeKey: "diag.english", from: 109, to: 118, note: "10.4 小希稿：对比机构六对一/服务记录，指出四科里政治专业课拉不开、数学吃天赋，英语才是最拉后腿也最能破局的一科。" },
      { purposeKey: "offer.compare", from: 109, to: 115, note: "10.4 小希稿：同一段里拆机构宣传：六对一、服务记录、模拟测试听着好，但英语仍从单词开始教，帮不了她真正提分。" },
      { purposeKey: "diag.english.method", from: 121, to: 133, note: "10.4 小希稿：讲发音要靠纠正反馈，纠正三个点：嘴巴张合、舌头位置、发音时长；自己不会读就没办法自我纠正。" },
      { purposeKey: "offer.pitfall.feedback", from: 127, to: 133, note: "10.4 小希稿：让她意识到读错时自己听不出来，也没人告诉她错在哪，正是自学最大的坑。" },
      { purposeKey: "offer.pitfall.path", from: 134, to: 143, note: "10.4 小希稿：指出机构单词书和网上资料都是零散资料，不成体系，背完就忘、放进文章仍看不懂。" },
      { purposeKey: "offer.three-needs", from: 143, to: 149, note: "10.4 小希稿：讲真正学出来要有资源：能教方法的人带着推演、做例题，再自己用资料巩固，不是抱一堆书自学。" },
      { purposeKey: "offer.compare", from: 146, to: 159, note: "10.4 小希稿：区分“资料”和“资源”：百词斩、B站英语兔、免费视频都是资料，知识点被拆成多条、没人纠音，学不出体系。" },
      { purposeKey: "offer.find-teacher", from: 165, to: 172, note: "10.4 小希稿：她说听了微微老师直播、认定老师能治她的英语，咨询师顺着她的意愿，让她补回放、找安静地方听。" },
      { purposeKey: "offer.need.plan", from: 196, to: 197, note: "10.4 小希稿：讲入学测评测出词汇/语法/听力水平，再按基础和目标制定计划，每阶段有测试。" },
      { purposeKey: "offer.need.coach", from: 198, to: 201, note: "10.4 小希稿：讲双师服务：平时发语音作业老师后台纠音，周末直播拆解营一对一纠正口型。" },
      { purposeKey: "offer.confirm-need", from: 202, to: 207, note: "10.4 小希稿：让她自己选“专升本班”还是“真正提升英语的班”，她说选后者，因为能力是一辈子的事、考试是不确定的。" },
      { purposeKey: "offer.close.price", from: 249, to: 263, note: "10.4 小希稿：讲课程是全体系，四六级/专升本/考研/口语选修课赠送，前100名3980、之后6980。" },
      { purposeKey: "diag.money", from: 263, to: 266, note: "10.4 小希稿：她说不好意思找爸妈要，家里负担重、收入不稳定，咨询师把经济压力摊开。" },
      { purposeKey: "offer.close.self-fund", from: 274, to: 282, note: "10.4 小希稿：她说自己攒了3000多、想边学边挣，咨询师讲自己分期第一期1000、可停可延。" },
      { purposeKey: "offer.trust", from: 282, to: 296, note: "10.4 小希稿：用内部学员实习、可学6年、课程持续迭代不涨价，说明机构发心和可信度。" },
      { purposeKey: "offer.close.risk-reversal", from: 316, to: 318, note: "10.4 小希稿：讲分期是人工收费、不是花呗自动扣，攒不够可以申请停一停，降低她的风险。" },
      { purposeKey: "offer.close.parents", from: 319, to: 321, note: "10.4 小希稿：她说父母让她自己看着办、经济上给不了多少，咨询师肯定她自己承担的决定。" }
    ]
  },
  {
    id: "dz42",
    label: "10.4 小连咨询稿",
    file: "zxg/dz_zxg/10.4陈洋洋26170064小连经济压力大担心学习效果_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 4, note: "10.4 小连稿：开场说她声音温柔可爱、不用紧张，问她中午吃没吃、平时午不午休，先把状态接住。" },
      { purposeKey: "open.questionnaire", from: 5, to: 6, note: "10.4 小连稿：复述问卷里“想考研、对自己有要求、想经济独立”，并说努力不等于有结果，用问卷细节进入规划。" },
      { purposeKey: "open.agenda", from: 6, to: 7, note: "10.4 小连稿：说明今天先按问卷框架回顾、再一起捋大学规划，让她知道谈话结构。" },
      { purposeKey: "scan.score", from: 7, to: 10, note: "10.4 小连稿：问她高考是不是没过特控线，确认原本能上一本、现在读二本，拿到分数落点。" },
      { purposeKey: "scan.holiday", from: 10, to: 17, note: "10.4 小连稿：问她初入大学课程状态和身边人状态，她说课表忽多忽少、室友都在预习，了解她开学后的适应。" },
      { purposeKey: "scan.campus", from: 17, to: 21, note: "10.4 小连稿：追问室友怎么努力、她报了什么社团，她说报了文体部为了加分，咨询师肯定她选得明智。" },
      { purposeKey: "scan.existing-course", from: 29, to: 31, note: "10.4 小连稿：问她暑假计划，她说想背单词、找AI练口语但没行动，确认她已有的自学尝试。" },
      { purposeKey: "offer.self-study", from: 32, to: 34, note: "10.4 小连稿：她说暑假只有想法没行动、有点后悔，咨询师说网上东西零碎、没老师专业，没练也不要紧，把自责接住。" },
      { purposeKey: "diag.major", from: 34, to: 36, note: "10.4 小连稿：问生物制药是不是被调剂，她说原本想自动化/电气；咨询师说专业不直接决定就业，先学学看、不行再实习换方向。" },
      { purposeKey: "window.track-uncertain", from: 36, to: 39, note: "10.4 小连稿：用“城市大于学校大于专业”讲浙江产业和实习机会，说明现在选不出方向很正常，可以靠实习验证。" },
      { purposeKey: "scan.parents", from: 40, to: 43, note: "10.4 小连稿：问家里经济压力和父母对考研的态度，她说父母支持但希望尽早减轻负担，确认决策链。" },
      { purposeKey: "diag.money", from: 41, to: 44, note: "10.4 小连稿：讲考研前后都要花钱，父母愿意支持一部分，她自己也想存钱/赚钱承担一部分。" },
      { purposeKey: "diag.postgrad", from: 45, to: 46, note: "10.4 小连稿：她目标一本或211，咨询师建议直接冲211，用“瞄100分考80-90”说明定高目标。" },
      { purposeKey: "filter.timeline", from: 47, to: 59, note: "10.4 小连稿：让她自己说规划：专业课不挂科、进课题组、四六级；咨询师帮她排成大一准备、大二收割、大三心无旁骛备考。" },
      { purposeKey: "scan.existing-course", from: 54, to: 57, note: "10.4 小连稿：确认她12月四级已经报名，咨询师说那现在就要把四级备考排进规划。" },
      { purposeKey: "filter.lab", from: 59, to: 62, note: "10.4 小连稿：讲进课题组不是打招呼就能进，要面试、看简历，大一要先积累能力和结果。" },
      { purposeKey: "window.english-leverage", from: 62, to: 78, note: "10.4 小连稿：讲课题组助研要查外文文献、翻译、搜集素材，英语是研究生必备项不是加分项，考研单科线和复试都卡英语。" },
      { purposeKey: "diag.english.speed", from: 79, to: 83, note: "10.4 小连稿：讲四级不能只刷题，听力靠发音加单词、阅读写作靠语法加单词，基础不牢应试技巧用不出来。" },
      { purposeKey: "diag.postgrad.timeline", from: 84, to: 88, note: "10.4 小连稿：讲考研要先过初试三条线：国家线、目标院校线、单科线。" },
      { purposeKey: "diag.postgrad.pool", from: 89, to: 96, note: "10.4 小连稿：讲目标院校线要按往年加20分准备，并解释学历歧视和“二本考高分”的反差感。" },
      { purposeKey: "filter.tutor", from: 97, to: 106, note: "10.4 小连稿：算寒假家教账：60元一小时、一天教3个小孩360、30天1万+，讲自己大一下做家教挣9000的经历。" },
      { purposeKey: "diag.english.speed", from: 107, to: 115, note: "10.4 小连稿：她以为发音靠模仿，咨询师讲12岁后语言敏感期关闭，要靠音标/发音规则和逻辑理解，不能纯模仿。" },
      { purposeKey: "offer.pitfall.feedback", from: 116, to: 121, note: "10.4 小连稿：讲自学没有老师纠音、没有正反馈，花三五年也学不好；好资源不可能免费。" },
      { purposeKey: "offer.close.price", from: 122, to: 127, note: "10.4 小连稿：问分期，第一期980、总价涨了、每月1000出头，她担心生活费不够。" },
      { purposeKey: "offer.close.parents", from: 128, to: 130, note: "10.4 小连稿：她说父母不太赞成网上学习，高中买录播网课踩过坑，所以不敢轻易开口。" },
      { purposeKey: "offer.close.self-fund", from: 131, to: 133, note: "10.4 小连稿：确认第一期她自己能凑上，咨询师建议先不跟父母讲，先学一个月出结果。" },
      { purposeKey: "offer.close.parents", from: 133, to: 141, note: "10.4 小连稿：教她录现在和一个月后的英文对比给父母看，用可见进步证明没被骗、能坚持。" },
      { purposeKey: "offer.close.risk-reversal", from: 142, to: 146, note: "10.4 小连稿：讲七天试学全额退、人工收费、可延交或暂停保留学籍，降低她的决策风险。" },
      { purposeKey: "offer.close.self-fund", from: 147, to: 152, note: "10.4 小连稿：她分四期压力大，咨询师讲新疆学妹800生活费分6期每月500多，让她找助教多分1-2期。" },
      { purposeKey: "offer.need.coach", from: 151, to: 157, note: "10.4 小连稿：讲双师服务、纠音、阶段测验，课程从发音到单词语法，四六级通关课是录播可灵活安排。" }
    ]
  },
  {
    id: "dz43",
    label: "10.5 小张咨询稿",
    file: "zxg/dz_zxg/10.5罗兰英260301100小张大一觉得自己学习能力比较强，不需要报课，以前报过很多课没效果_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 4, note: "10.5 小张稿：开场说他声音像标准医生、朋友圈表情包抽象，问他是不是秒回、今天有没有空，先确认本人和状态。" },
      { purposeKey: "open.questionnaire", from: 3, to: 5, note: "10.5 小张稿：点出问卷写得很全、临床医学政策特殊，并说今天不是单方面讲，而是按他的想法调整方案。" },
      { purposeKey: "open.agenda", from: 4, to: 5, note: "10.5 小张稿：说明这次是探讨适合他的方案，该记就记，也会了解他的想法再调整内容。" },
      { purposeKey: "window.final-goal", from: 5, to: 8, note: "10.5 小张稿：先讲“以终为始”，问他为什么当医生，他说初中就确定、一直学生物，咨询师肯定他目标明确。" },
      { purposeKey: "scan.family-burden", from: 12, to: 16, note: "10.5 小张稿：问他学医5+3+规培时间长、家里能否支撑，他说基本能支撑但想减轻负担，确认经济底线。" },
      { purposeKey: "diag.postgrad", from: 13, to: 16, note: "10.5 小张稿：讲读研方式：本校5+X偏科研、学硕/专硕、规培四证合一，帮他在保研、学硕、专硕之间定位。" },
      { purposeKey: "filter.track", from: 16, to: 22, note: "10.5 小张稿：讲保研要拿本校推荐名额加外校接收名额，5+X保本校和冲中山/南方医科大是两条不同难度的路。" },
      { purposeKey: "diag.postgrad.timeline", from: 22, to: 38, note: "10.5 小张稿：把保研流程拆成夏令营、预推免、九推：海投简历、拿优秀营员、多拿offer再反选，并提醒五年制时间往后推一年。" },
      { purposeKey: "filter.timeline", from: 44, to: 54, note: "10.5 小张稿：把核心任务定成“大四下前准备一份有竞争力的简历”，并讲大三下可提前投、大四进医院后怕来不及跑预推免。" },
      { purposeKey: "filter.gpa", from: 55, to: 61, note: "10.5 小张稿：讲简历五大类里的GPA：保研率约12%，想冲中山要进前10%甚至5%，大一第一学期就要“开局即巅峰”。" },
      { purposeKey: "diag.english", from: 62, to: 69, note: "10.5 小张稿：讲医生英语要求高、课题组全英文论文，保研四六级是资格、六级550+才是机会，机筛会直接卡四六级。" },
      { purposeKey: "window.english-leverage", from: 69, to: 73, note: "10.5 小张稿：讲英文面试三环节：自我介绍、英文专业问答、现场文献翻译，英语要成为第二母语，能带动科研和预推免。" },
      { purposeKey: "filter.lab", from: 74, to: 78, note: "10.5 小张稿：讲科研两条路：大创和课题组；大创分校级/省级/国家级，省级以上才有含金量，大二申报、大一先抱大腿。" },
      { purposeKey: "filter.competition", from: 79, to: 88, note: "10.5 小张稿：列竞赛清单：临床技能大赛、基础医学创新论坛、挑战杯、大英赛/外研社，强调在精不在多、团队赛战线长。" },
      { purposeKey: "filter.internship", from: 95, to: 98, note: "10.5 小张稿：建议她去广交会、南方国际心血管病会议等做外宾接待志愿者，练英语、开学术视野，但不把它当加分硬指标。" },
      { purposeKey: "window.competition-pool", from: 100, to: 108, note: "10.5 小张稿：讲赢者思维：先问竞争对手是谁、怎么赢；保研是高端局，达标不够，要找一个别人不强的点做到极致。" },
      { purposeKey: "filter.english", from: 109, to: 114, note: "10.5 小张稿：她自己选英语作为长板，咨询师认可：科研竞赛难拉开、四六级大家都会刷，英语综合能力最容易超过大部分人。" },
      { purposeKey: "window.final-goal", from: 115, to: 120, note: "10.5 小张稿：讲这份简历不只保研能用，考研、就业都能用；“路不重要，人才重要”，积累够了就有选择权。" },
      { purposeKey: "filter.lab", from: 120, to: 129, note: "10.5 小张稿：教她读文献：先看中文综述和大框架，按摘要-结论-讨论读，不懂的名词先查，老师现在看的是态度。" },
      { purposeKey: "diag.ai", from: 129, to: 140, note: "10.5 小张稿：接住她对同学用AI的焦虑：AI会变成应用、不用现在恐慌；AI翻译仍需人审查负责，建议自己把英语学成一手信息能力。" },
      { purposeKey: "diag.motivation", from: 141, to: 148, note: "10.5 小张稿：她说最难的是“开始”，咨询师拆成开始、怎么开始、怎么坚持，并指出高端局比的是方法/效率而不只是努力。" },
      { purposeKey: "diag.english.method", from: 148, to: 155, note: "10.5 小张稿：聚焦她的英语方法：直接跳到听说读写跨度太大，音标学了但连读/略读/变音没掌握，要先刻意练发音规则形成肌肉记忆。" },
      { purposeKey: "offer.ask-plan", from: 155, to: 159, note: "10.5 小张稿：问她自学有没有好方法，她说没有；再问她听三天课的感受，她说“颠覆”了原来的做题思维。" },
      { purposeKey: "offer.compare", from: 160, to: 167, note: "10.5 小张稿：讲学习能力强更需要老师节省时间，清华学生也报班，报班不等于学习能力弱，而是买效率和体系。" },
      { purposeKey: "offer.close.risk-reversal", from: 168, to: 174, note: "10.5 小张稿：建议她先分期试一个月，甚至只试七天，七天无理由退，先看效率有没有提升再决定。" },
      { purposeKey: "offer.close.price", from: 178, to: 184, note: "10.5 小张稿：讲课程是一个月分期、七天试学，价格比五位数课程亲民，老师是老板所以价格有自主权。" },
      { purposeKey: "offer.close.hesitation", from: 184, to: 188, note: "10.5 小张稿：她问前几天没领券还有没有优惠，咨询师让她厚脸皮找助教问第一天领的券能否用，别因为错过就放弃。" },
      { purposeKey: "offer.close.parents", from: 195, to: 197, note: "10.5 小张稿：她说父母支持但希望高效、需要商量，咨询师建议先试七天，用效果和可退机制跟父母沟通。" },
      { purposeKey: "offer.close.followup", from: 198, to: 200, note: "10.5 小张稿：收尾让她整理笔记发过来查漏补缺，之后文献/绩点有问题再找她出招。" }
    ]
  },
  {
    id: "dz44",
    label: "10.5 小卢咨询稿",
    file: "zxg/dz_zxg/10.5董飞燕26011092小卢大一就业实习跟家里商量_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 4, note: "10.5 小卢稿：确认他在车上、和表哥去博物馆，先判断通话环境是否适合聊。" },
      { purposeKey: "open.questionnaire", from: 5, to: 7, note: "10.5 小卢稿：复述问卷里的实习纠结、转专业、民办工商管理调剂，点明“专业学不到实际技能”的核心焦虑。" },
      { purposeKey: "trust.self-disclosure", from: 11, to: 14, note: "10.5 小卢稿：讲自己大一学前教育、温州大学、想转专业又不知道转哪的迷茫，先建立同频。" },
      { purposeKey: "window.english-leverage", from: 15, to: 18, note: "10.5 小卢稿：讲自己搜考研、就业、考公都绕不开英语，把英语定义成跨行业的万能钥匙。" },
      { purposeKey: "window.track-uncertain", from: 17, to: 21, note: "10.5 小卢稿：说自己当时不知道能干什么，就去老师公司实习，在真实场景里了解自己和外界。" },
      { purposeKey: "trust.result", from: 22, to: 25, note: "10.5 小卢稿：讲实习后确定做自媒体、后来去杭州实习，用结果证明“先通用能力再专业能力”的路径。" },
      { purposeKey: "diag.school-gap", from: 28, to: 33, note: "10.5 小卢稿：回应他“民办和一本”的担心，用成就事件弥补学历、企业只看能力的说法拆掉学历焦虑。" },
      { purposeKey: "diag.major.second-card", from: 34, to: 37, note: "10.5 小卢稿：把能力分成通用和专业，指出大学无法确定岗位，先用英语、表达这类通用能力做跳板。" },
      { purposeKey: "filter.internship", from: 41, to: 47, note: "10.5 小卢稿：把实习途径归为内推、海投、付费三种，并说明每种都要求自身能力。" },
      { purposeKey: "filter.internship", from: 48, to: 52, note: "10.5 小卢稿：对比“只给岗位没人带”的实习和老师公司有专人培养的实习，说明实习质量比有没有更重要。" },
      { purposeKey: "window.experience-first", from: 54, to: 55, note: "10.5 小卢稿：用自己的花费和回本经历，说明先投资能力、后面实习有了收入。" },
      { purposeKey: "scan.parents", from: 56, to: 58, note: "10.5 小卢稿：问她有没有跟家里说，确认昨晚提过、父母同意她学一个技能。" },
      { purposeKey: "window.english-leverage", from: 59, to: 60, note: "10.5 小卢稿：结合广东沿海的广交会、展会、志愿者机会，说明英语在本地就能变现。" },
      { purposeKey: "offer.close.price", from: 61, to: 63, note: "10.5 小卢稿：确认直播优惠券今晚八点失效、可以分期，把决策时间点摆出来。" },
      { purposeKey: "offer.close.self-fund", from: 63, to: 63, note: "10.5 小卢稿：她说实在纠结就分期，咨询师接住这条备选资金路径。" },
      { purposeKey: "offer.close.price", from: 67, to: 72, note: "10.5 小卢稿：讲早鸟价锁定、后续涨价不收差价、新内容老学员免费开通，降低“现在买会不会亏”的顾虑。" },
      { purposeKey: "offer.need.coach", from: 74, to: 75, note: "10.5 小卢稿：说明老师每天安排内容、督学、线上自习室、直播看口型，回应“没人带”的问题。" },
      { purposeKey: "offer.close.followup", from: 76, to: 80, note: "10.5 小卢稿：收尾约定下午再跟家里说、等消息，后续微信联系。" }
    ]
  },
  {
    id: "dz46",
    label: "11.4 阿丽咨询稿",
    file: "zxg/dz_zxg/吕新蕊+260301119+阿丽+保研高目标+但是担心学不好+并且手里距离第一期还差500块钱+打算跟姐姐借+实在不行跟爸妈去要自己攒钱的银行卡①.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 2, note: "11.4 阿丽稿：确认学生在宿舍、声音温柔，从新疆口音聊起，用轻松话题落地。" },
      { purposeKey: "open.questionnaire", from: 5, to: 5, note: "11.4 阿丽稿：复述问卷里的“小小身躯大大野心”，让学生感到被认真看过。" },
      { purposeKey: "scan.family-burden", from: 6, to: 11, note: "11.4 阿丽稿：了解到学生是长姐、下面两个弟弟，家里男孩爱打游戏，先摸清家庭结构和她的角色。" },
      { purposeKey: "diag.postgrad", from: 12, to: 16, note: "11.4 阿丽稿：学生说想保研到沿海（广东/深圳）、冲211，咨询师确认她的目标地域和院校层级。" },
      { purposeKey: "window.english-leverage", from: 17, to: 20, note: "11.4 阿丽稿：问为什么大一就想学英语，学生说考研、专业课、比赛和计算机二级都绕不开英语，所以先抓英语。" },
      { purposeKey: "window.competition-pool", from: 21, to: 24, note: "11.4 阿丽稿：问保研跟谁比、比什么，学生只知道不挂科和前10%，咨询师把竞争范围收成校内同专业。" },
      { purposeKey: "filter.gpa", from: 24, to: 41, note: "11.4 阿丽稿：拆保研校内竞争四样：前五学期绩点权重最大、综测、竞赛实验室、四六级分数，并强调挂科和处分一票否决。" },
      { purposeKey: "window.competition-pool", from: 42, to: 48, note: "11.4 阿丽稿：把竞争池扩到全国：预推免和夏令营要面对211、双非强校对手，最终比的是一份有竞争力的简历。" },
      { purposeKey: "filter.lab", from: 48, to: 59, note: "11.4 阿丽稿：讲夏令营最看重科研经历，建议大二进课题组做核心、形成自己的观点，并说明英语能读外文文献会放大科研优势。" },
      { purposeKey: "diag.english", from: 59, to: 66, note: "11.4 阿丽稿：指出几乎所有211都有英语考核：自我介绍、问答、抽专业文献翻译，六级分数还是简历筛选门槛。" },
      { purposeKey: "filter.timeline", from: 67, to: 70, note: "11.4 阿丽稿：讲保研第三块“匹配度”，大四要锁定3-4所目标院校和导师，提前看导师论文找结合点。" },
      { purposeKey: "filter.certificates", from: 70, to: 80, note: "11.4 阿丽稿：列加分项：省级医学竞赛、四六级口语、雅思托福性价比、职业兽医证，明确普通话和计算机二级对保研不加分。" },
      { purposeKey: "filter.timeline", from: 80, to: 92, note: "11.4 阿丽稿：从大四倒推：大四拿简历进夏令营、选导师；大三刷六级、泡实验室攒科研记录；大二稳绩点、专业课、竞赛。" },
      { purposeKey: "filter.one-ability", from: 109, to: 114, note: "11.4 阿丽稿：把大一重点收成三件：练英语、考四级、练表达，专业课不挂科并争取高绩点，其他活动往后排。" },
      { purposeKey: "filter.gpa", from: 115, to: 118, note: "11.4 阿丽稿：学生大一只有一门专业课，咨询师推荐宋浩高数，建议水课靠期末背重点拿分。" },
      { purposeKey: "scan.score", from: 119, to: 121, note: "11.4 阿丽稿：问到高考英语72/150，确认英语是最弱科目，高中只会每天背单词、背了就忘。" },
      { purposeKey: "diag.english.method", from: 121, to: 123, note: "11.4 阿丽稿：学生说四级不过没有学位证，咨询师接住这个硬门槛，把英语从“弱科”变成必须跨过的坎。" },
      { purposeKey: "scan.family-burden", from: 124, to: 127, note: "11.4 阿丽稿：了解父母是农村开小超市、学历不高，学费还要借钱，弟弟刚上初中，确认家庭经济底座。" },
      { purposeKey: "diag.money", from: 128, to: 147, note: "11.4 阿丽稿：学生说不好意思向家里要钱、看到父母白发心里酸，咨询师讲“不配得感”，并把真正减轻负担重新定义成先有能力。" },
      { purposeKey: "offer.close.price", from: 147, to: 152, note: "11.4 阿丽稿：讲分期最多四期，提到有学生申请到五期/六期特殊分期，建议她主动问助教有没有贫困生政策。" },
      { purposeKey: "offer.close.self-fund", from: 152, to: 158, note: "11.4 阿丽稿：算首期980、生活费800、能拿出500，缺口300，讨论兼职、跟爸妈借、跟表姐借几种凑法。" },
      { purposeKey: "offer.trust", from: 158, to: 164, note: "11.4 阿丽稿：用父母“补习班没结果”的顾虑切入，介绍七天学习保障、央视报道和合同退款条款，降低被骗担忧。" },
      { purposeKey: "offer.close.parents", from: 164, to: 171, note: "11.4 阿丽稿：讨论跟爸妈怎么说：说学校活动费借两三百、善意谎言，或先做后说；学生倾向跟表姐借。" },
      { purposeKey: "filter.tutor", from: 171, to: 181, note: "11.4 阿丽稿：讲线上家教路径：把音标发音录成音频当简历、口语+应试时薪不低于50、家教群和表白墙找单。" },
      { purposeKey: "window.experience-first", from: 182, to: 191, note: "11.4 阿丽稿：用老师讲课逻辑备课、腾讯会议线上教小孩，说明以教促学，能力越强越不缺单。" },
      { purposeKey: "offer.close.parents", from: 191, to: 197, note: "11.4 阿丽稿：转向表姐：表姐刚毕业、考研没考上、以前也报过补习班，咨询师判断表姐会支持，并建议把央视采访和七天保障发给她。" },
      { purposeKey: "diag.parents", from: 200, to: 207, note: "11.4 阿丽稿：预设表姐不同意，学生说找爸妈要、用高中助学金积蓄，咨询师接住“打不死的小强”并给 plan B。" },
      { purposeKey: "offer.close.hesitation", from: 226, to: 231, note: "11.4 阿丽稿：讲曲线救国：先瞒着父母悄悄学，出结果后用赚的钱说服他们；强调不成功也是成长。" },
      { purposeKey: "offer.close.enroll", from: 236, to: 240, note: "11.4 阿丽稿：学生已发消息跟表姐借钱，咨询师确认今天是最后一场直播，推动她尽早开始。" },
      { purposeKey: "offer.close.risk-reversal", from: 249, to: 250, note: "11.4 阿丽稿：用七天零成本试错收尾：有效果就继续，没效果就全额退，至少排除了一个不适合的方法。" }
    ]
  },
  {
    id: "dz47",
    label: "10.19 浩南咨询稿",
    file: "zxg/dz_zxg/吕新蕊+260301166+浩南+大一+激发内心不甘+降低试错门槛+跟爸妈商量成功.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 8, note: "10.19 浩南稿：确认学生在宿舍、室友刚出去，聊到上午办银行卡和校园网，环境安静适合长聊。" },
      { purposeKey: "diag.school-gap", from: 9, to: 21, note: "10.19 浩南稿：学生说在浙江义乌的独立学院、四年后要考研回杭州本部；咨询师接住高考发挥不好、民办本科的落差和自卑。" },
      { purposeKey: "trust.self-disclosure", from: 22, to: 25, note: "10.19 浩南稿：用老师复读三次、最后保送人大北大的经历，和学生“小镇做题家”的自我评价建立相似性。" },
      { purposeKey: "diag.postgrad", from: 30, to: 34, note: "10.19 浩南稿：学生给考研目标打6分，起步是考回本部、后面可能冲211，咨询师帮她把模糊愿望拆成阶段目标。" },
      { purposeKey: "window.english-leverage", from: 36, to: 41, note: "10.19 浩南稿：学生从考研英语、老师“高考科目到社会没用”的话、NBA和抖音英语赚钱，说明自己为什么重视英语；咨询师补充义乌外贸场景。" },
      { purposeKey: "diag.postgrad.timeline", from: 42, to: 46, note: "10.19 浩南稿：讲考研初试12月、复试次年3-4月，复试看英语口语和简历，提醒理工男总分高但英语不过线会被刷。" },
      { purposeKey: "filter.lab", from: 47, to: 52, note: "10.19 浩南稿：从导师视角讲为什么看重英语：读英文文献、做课题、海外交流，英语是科研和就业的前置条件。" },
      { purposeKey: "window.english-leverage", from: 53, to: 56, note: "10.19 浩南稿：讲就业能力溢价：外企、蔡司/克斯康等龙头技术支持要对接海外，英语强的人起薪和天花板更高。" },
      { purposeKey: "filter.timeline", from: 56, to: 59, note: "10.19 浩南稿：倒推时间线：大三下全面备考，大三上定目标院校并前置政治英语，大二下竞赛收尾，大一大二考完四六级。" },
      { purposeKey: "filter.one-ability", from: 65, to: 66, note: "10.19 浩南稿：指出大一专业课少，唯一要做的就是把表达和英语练透，大二大三才能用出来。" },
      { purposeKey: "diag.school-gap", from: 66, to: 69, note: "10.19 浩南稿：把民办本科的资源差和时间成本摊开：学费三万多、资源不如211，所以更要尽早有能力、尽早赚钱。" },
      { purposeKey: "filter.timeline", from: 73, to: 88, note: "10.19 浩南稿：讲“能力当起点还是终点”：越早掌握红利越久，大三下基本定局，大学看似四年其实只有两年半。" },
      { purposeKey: "diag.environment", from: 89, to: 98, note: "10.19 浩南稿：学生说学校没有英语角和资源，咨询师讲老师自建英语社团、创造条件，并介绍广交会、博览会等校外场域。" },
      { purposeKey: "diag.english.speed", from: 99, to: 113, note: "10.19 浩南稿：学生口语自评5-7分，咨询师用四级听力、听说不分家说明底层发音问题，把四六级降级成“顺带的结果”。" },
      { purposeKey: "scan.existing-course", from: 114, to: 122, note: "10.19 浩南稿：问学生买过什么课，学生说花178/200买刘晓燕全套四级讲解，咨询师也买过70多的闲鱼版。" },
      { purposeKey: "offer.pitfall.sunk", from: 122, to: 125, note: "10.19 浩南稿：指出刘晓燕课最多贡献10%，沉没成本不参与重大决策，不能因为买过课就拒绝更系统的方案。" },
      { purposeKey: "offer.need.plan", from: 126, to: 129, note: "10.19 浩南稿：讲老师那边入学要测评，按听说读写薄弱板块制定计划，像打仗一样有侧重点地推进。" },
      { purposeKey: "filter.tutor", from: 129, to: 135, note: "10.19 浩南稿：算家教账：50/小时、两小时100、十天1000，寒假带三个小孩可到1万，说明一个月学会发音就能变现。" },
      { purposeKey: "window.experience-first", from: 135, to: 139, note: "10.19 浩南稿：讲男生做家教、低价试课、英语变现快，还可以做自媒体分享口语，把能力变成客源。" },
      { purposeKey: "scan.family-burden", from: 141, to: 149, note: "10.19 浩南稿：了解家庭：有哥哥、民办3万学费、助学贷款、侄子上学、妈妈无业、爸爸一人支出，确认经济压力真实存在。" },
      { purposeKey: "offer.close.hesitation", from: 149, to: 157, note: "10.19 浩南稿：学生纠结机会与能力、怕投入后没结果，咨询师区分“能力”和“抓住能力的机会”，并给出分期和七天试学。" },
      { purposeKey: "offer.close.risk-reversal", from: 158, to: 166, note: "10.19 浩南稿：讲没有100%确定的事，七天无理由全额退款就是零成本试错，降低第一次投入的风险。" },
      { purposeKey: "offer.close.hesitation", from: 166, to: 178, note: "10.19 浩南稿：用墨菲定律、马云创业、改变自己而不是改变环境，推动学生别等“以后有钱再说”。" },
      { purposeKey: "offer.close.enroll", from: 186, to: 190, note: "10.19 浩南稿：学生问分期流程，咨询师让她直接问助教姐姐，并说明老师那边不强行推销。" },
      { purposeKey: "filter.internship", from: 191, to: 195, note: "10.19 浩南稿：讲寒暑假可去老师杭州公司实习，面试看态度不看能力，同类型实习能当跳板。" },
      { purposeKey: "offer.close.price", from: 202, to: 213, note: "10.19 浩南稿：学生听到6980被吓到，咨询师解释原价9980、抢券后3000多，并用自己的分期900多和表妹打工3000的例子拆价格。" },
      { purposeKey: "offer.handoff", from: 214, to: 216, note: "10.19 浩南稿：说明还有成长私教老师，相当于“plus版本的我”，负责结合个人情况做陪伴。" },
      { purposeKey: "offer.close.followup", from: 214, to: 225, note: "10.19 浩南稿：收尾约定今晚问助教、后续学习问题随时微信，强调看好她而不是只等她报课。" }
    ]
  },
  {
    id: "dz48",
    label: "10月 小周咨询稿",
    file: "zxg/dz_zxg/吕新蕊+260401002+小周+专二+升本原本没动力+后来激发自己小金库报_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 8, note: "10月 小周稿：先确认她是否坐着、能否听清，用四川话和实习时遇到的四川人破冰，聊到可以直接说方言，把通话环境安顿下来再进正题。" },
      { purposeKey: "trust.self-disclosure", from: 9, to: 13, note: "10月 小周稿：咨询师说“你跟我弟可像了”，讲弟弟比自己小一岁，顺势问出她家三个孩子、她最小，用相似的家庭位置拉近距离。" },
      { purposeKey: "open.questionnaire", from: 25, to: 30, note: "10月 小周稿：复述问卷里“升本目标就公办”，追问为什么不想往上冲；她说对实力不自信，咨询师让她抛开实力去想，她说想考400分上西科大，据此判断她内心其实有期待。" },
      { purposeKey: "scan.parents", from: 37, to: 42, note: "10月 小周稿：问她升本是不是家里人的意思，确认“家里人想让我升本”、家里一般般没有家产，表哥在专业相关行业、升本后可以去那边找工作，摸清家里的支持方式和决策链。" },
      { purposeKey: "diag.environment", from: 44, to: 50, note: "10月 小周稿：她说学校氛围把劲头压住了、室友和环境都影响人，咨询师用“温水煮青蛙”接住，追问她想不想改变，她答想但被压得喘不过气、一天没时间学习。" },
      { purposeKey: "scan.campus", from: 44, to: 50, note: "10月 小周稿：从“跟前面聊天不像一个人”切入，问出学校氛围压抑、室友和周围环境影响人、她一天几乎没时间学习；咨询师用“温水煮青蛙”接住，并追问她想不想改变，先摸清自习环境再谈动力。" },
      { purposeKey: "open.questionnaire", from: 54, to: 60, note: "10月 小周稿：复述问卷里“新学期课变少但多了个打游戏”，又点出她给英语重要度只打6分，追问这算不算重视，她说没到特别重视、因为达不到那个境界。" },
      { purposeKey: "diag.motivation", from: 62, to: 66, note: "10月 小周稿：她说考不上就去当兵、退路挺多，咨询师追问她是否享受现在的生活，她承认一点都不享受、生活没劲儿，白天上完课就打游戏，把“没动力”从道德评价里拆出来。" },
      { purposeKey: "filter.timeline", from: 75, to: 78, note: "10月 小周稿：确认升本在28年、还有一年左右，讲清升本后进大三要补本科前两年专业课，大三下该考研的考研、该实习的实习，倒推现在就要攒能力。" },
      { purposeKey: "window.final-goal", from: 77, to: 78, note: "10月 小周稿：以终为始，升本只是过程，最终要就业、要养家、要有对生活的掌控感，否则三十多岁会面临中年危机；她回应“必须要加把劲”。" },
      { purposeKey: "open.questionnaire", from: 82, to: 83, note: "10月 小周稿：复述问卷里“钱是小事，别辜负爸爸妈妈一天好心意”，结合她说过民办本科老妈也可能愿意办，判断她外表放荡不羁、内心有冲劲，每晚还学一小时。" },
      { purposeKey: "window.442", from: 84, to: 91, note: "10月 小周稿：借表哥招人讲442法则：40%能力、40%经历、20%学历，解释学历占比低是因为同池竞争；再收束到升本只是一场考数学、计算机、英语的考试，要围绕最终就业攒能力和经历。" },
      { purposeKey: "filter.competition", from: 95, to: 104, note: "10月 小周稿：问大学有哪些竞赛，她提到技能大赛报名错过；咨询师介绍蓝桥杯是个人赛、不用凑队友、门槛不高，获奖能写进升本面试材料，本科老师很看重。" },
      { purposeKey: "window.english-leverage", from: 104, to: 111, note: "10月 小周稿：用竞赛备赛要读芯片data sheet、英文技术手册说明英语能直接用；再举面试官视角对比A/B两个专升本选手，B能读英文手册、过六级，起薪就差1500到3000，得出英语是差异化优势。" },
      { purposeKey: "filter.english", from: 112, to: 120, note: "10月 小周稿：把英语和数学放在一起比，指出英语在专升本和就业里拉分最大、赋能更大；确认她每天在英语上花约1小时、自评效果不怎么样。" },
      { purposeKey: "diag.english", from: 114, to: 121, note: "10月 小周稿：指出她问卷里的矛盾，一边写四级过了就行、六级不重要，一边又写专业需要英语、口语和应试重要；追问下她承认只是希望口语强一点，眼下没有迫切需求，每天1小时效果一般。" },
      { purposeKey: "filter.lab", from: 145, to: 152, note: "10月 小周稿：教她找导师要带诚意：先说自己为竞赛读过多少文献、对哪个课题赛道感兴趣、每天在背单词；点明导师招的是能帮做事的人，竞赛结果要靠提前准备后用出来，不能两脑空空进场。" },
      { purposeKey: "diag.english.speed", from: 172, to: 173, note: "10月 小周稿：收束英语学法，现有1小时不要只背单词，要从发音、音标、发音规则一步步练起；英语不只是为了专升本和四级考试，口语能力本身就有反差优势。" },
      { purposeKey: "offer.no-idea", from: 178, to: 179, note: "10月 小周稿：问她英语有没有学习计划、昨天直播的听力方法有没有启发，她说还没有，想学但不知道在哪里学、怎么学，咨询师据此承接“需要有人给路径”。" },
      { purposeKey: "offer.self-study", from: 186, to: 192, note: "10月 小周稿：她说手边没资源，只能自己瞎看老师课、在B站小红书找零散资料；咨询师指出单靠学校不行、零散资源试错成本高又耗时间，问她要不要跟微微老师学。" },
      { purposeKey: "offer.compare", from: 192, to: 194, note: "10月 小周稿：对比自己零散找资源和跟老师系统学，她听过直播、觉得老师教学方法好、有基础能听懂，咨询师顺势承接“想过跟老师学”。" },
      { purposeKey: "offer.trust", from: 195, to: 195, note: "10月 小周稿：用老师上过央视、接受采访、方法有一套建立可信度，说明不是只会讲道理。" },
      { purposeKey: "offer.handoff", from: 200, to: 204, note: "10月 小周稿：介绍老师朋友圈的耶鲁游学、课程持续更新并新增专升本和考研、双师服务，以及成长私教围绕大学生成长问题，把课程和服务形式讲具体。" },
      { purposeKey: "offer.close.hesitation", from: 205, to: 209, note: "10月 小周稿：问她遇到没把握的机会是争取还是放过，她说会争取；咨询师用弟弟以前不敢要、后来被鼓励敢争的例子，推动她这次也主动抓机会。" },
      { purposeKey: "offer.close.risk-reversal", from: 212, to: 213, note: "10月 小周稿：讲七天无理由试课和学习保障期，分期或全款都行，开通七天内觉得课程和服务不适合可全额退费，降低她的决策风险。" },
      { purposeKey: "diag.money", from: 217, to: 221, note: "10月 小周稿：她说价格有一点顾虑，钱是自己攒的、不想找爸爸要、怕爸爸说她；咨询师建议不要全款，先分期，首期900来块，压力小还能试。" },
      { purposeKey: "offer.close.price", from: 221, to: 221, note: "10月 小周稿：把价格拆成首期900来块加七天试课，强调先体验、有效再继续，无效可退，回应她“价格会有一点”的顾虑。" },
      { purposeKey: "offer.close.enroll", from: 222, to: 223, note: "10月 小周稿：她答应今晚就去看、去说，咨询师约定今晚先看单词方法适不适合，合适再开始，把下一步落到具体动作。" },
      { purposeKey: "offer.close.followup", from: 246, to: 246, note: "10月 小周稿：收尾约定把难以描述的问题精准化后微信发来，之后时不时反馈进展，并建议用线上自习室或找环境解决学校氛围问题。" }
    ]
  },
  {
    id: "dz49",
    label: "10月 乐乐咨询稿",
    file: "zxg/dz_zxg/吕新蕊+260401025+乐乐+自己有顾虑+爸妈不同意+前期意愿拔到位+自己想对爸妈再次进行说服说服不成功+就自己拿金库分期报_原文.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 3, to: 6, note: "10月 乐乐稿：确认她在宿舍阳台、让她拿小板凳和备忘录，先把通话状态安顿好。" },
      { purposeKey: "trust.self-disclosure", from: 9, to: 15, note: "10月 乐乐稿：讲自己一天当两天用、家里养鸡、弟弟高三、大学影像计划做翻译，用普通家庭和实习经历建立相似性。" },
      { purposeKey: "open.questionnaire", from: 16, to: 19, note: "10月 乐乐稿：用问卷里“安静、I 人”的反差开场，确认她内敛但不是内向。" },
      { purposeKey: "scan.volunteer", from: 20, to: 21, note: "10月 乐乐稿：确认她机电一体化大二、想跨考计算机相关专业。" },
      { purposeKey: "diag.major", from: 22, to: 24, note: "10月 乐乐稿：追问跨考动机，她讲机电偏下限、软件上限更高，想走复合型。" },
      { purposeKey: "scan.family-burden", from: 25, to: 31, note: "10月 乐乐稿：问薪资预期 6000—8000、想回武汉郊区、独生子，带出家庭经济压力和想提升学历的矛盾。" },
      { purposeKey: "filter.track", from: 32, to: 33, note: "10月 乐乐稿：问她为什么坚定升本，她说是为了学历闭环，但也承认升本只是延迟就业。" },
      { purposeKey: "diag.school-gap", from: 38, to: 43, note: "10月 乐乐稿：拆穿“升本 20% 上岸率”是随便搜的，说明民办会拉高整体上岸率。" },
      { purposeKey: "diag.motivation", from: 44, to: 61, note: "10月 乐乐稿：把“非常拖延”拆成早睡早起的具体场景，用生物趋利避害解释，不让她给自己贴标签。" },
      { purposeKey: "filter.track", from: 78, to: 82, note: "10月 乐乐稿：确认专升本考英语、政治、专业课，并用她的目标反推英语必须先拆解。" },
      { purposeKey: "offer.need.path", from: 83, to: 92, note: "10月 乐乐稿：讲科学路径必须是发音到听说读写，用 12 岁语言敏感期解释为什么成年人要先学发音规则。" },
      { purposeKey: "offer.need.coach", from: 97, to: 104, note: "10月 乐乐稿：指出自学时读错没人纠正、练了不知道对不对，必须有真人反馈和小指导。" },
      { purposeKey: "trust.result", from: 111, to: 116, note: "10月 乐乐稿：讲魏老师高考三年才上普通本科、后来被央视点名，说明不被过去定义。" },
      { purposeKey: "offer.close.hesitation", from: 117, to: 124, note: "10月 乐乐稿：讲做选择是求赢面不是求确定值，用谈恋爱类比，推动她别因不确定放弃机会。" },
      { purposeKey: "filter.one-ability", from: 129, to: 139, note: "10月 乐乐稿：用 A/B 选手对比说明“什么都学一点”不如一项精加英语附加项，帮她把复合型收敛到一项核心能力。" },
      { purposeKey: "diag.major.reality", from: 146, to: 155, note: "10月 乐乐稿：讲机电岗位分层、运维调试四五千、重复劳动和中年危机，让她看到不提升的上限。" },
      { purposeKey: "window.english-leverage", from: 156, to: 168, note: "10月 乐乐稿：从父母 8000 体力劳动、电器行业英文文档、一带一路、外企招聘，说明英语是技术岗的额外筹码。" },
      { purposeKey: "window.final-goal", from: 169, to: 174, note: "10月 乐乐稿：提出以终为始，从老板需要的人倒推出专业不差、表达不弱、英语要强三个目标。" },
      { purposeKey: "filter.timeline", from: 175, to: 185, note: "10月 乐乐稿：倒推大三要补课、实习、考研，说明专二当下就要提前部署，否则升本后很被动。" },
      { purposeKey: "filter.competition", from: 189, to: 195, note: "10月 乐乐稿：给出西门子杯、三维数字化、电赛三个专业竞赛，并确认低压电工证可先考。" },
      { purposeKey: "diag.english", from: 196, to: 206, note: "10月 乐乐稿：追她四级九月份报了却没学，确认听力完全不懂、语法一团糟，先别谈六级。" },
      { purposeKey: "filter.tutor", from: 226, to: 228, note: "10月 乐乐稿：把家教当成退路和现金流，算一小时 100、教两个小孩 400，还能承担考研费用。" },
      { purposeKey: "diag.english", from: 251, to: 261, note: "10月 乐乐稿：问英语打算怎么学，她只会单词语法、听力没头绪，高中英语只有三四十分。" },
      { purposeKey: "offer.compare", from: 268, to: 281, note: "10月 乐乐稿：对比谐音背单词和魏老师的发音规则方法，指出她只想补听力的割裂想法。" },
      { purposeKey: "offer.trust", from: 292, to: 303, note: "10月 乐乐稿：讲口语机构分营每阶段六千、老师央视背景和发心，建立对机构和老师的信任。" },
      { purposeKey: "offer.close.risk-reversal", from: 311, to: 316, note: "10月 乐乐稿：讲七天学习保障、全额退款、入学测评和两个老师服务，降低她首次大额付费的风险。" },
      { purposeKey: "offer.close.self-fund", from: 329, to: 334, note: "10月 乐乐稿：不建议全款，算第一期九百多可接受，先体验七天再跟父母讲。" },
      { purposeKey: "offer.handoff", from: 335, to: 352, note: "10月 乐乐稿：说明课程半年可学完、服务到毕业后一年，主讲听说读写，助教预约纠音反馈。" },
      { purposeKey: "offer.close.parents", from: 357, to: 364, note: "10月 乐乐稿：她说父母认定是骗子、打算自己生活费分期，咨询师建议先学出结果再通知父母。" },
      { purposeKey: "offer.close.followup", from: 410, to: 419, note: "10月 乐乐稿：收尾确认微信可随时问，之后继续聊表达和职业规划。" }
    ]
  },
  {
    id: "dz50",
    label: "10.31 雪梅咨询稿",
    file: "zxg/dz_zxg/吕新蕊+260401038+雪梅+专科+能够意识到自己学习能力弱+会担心跟着老师学学不好+鼓励尝试抓住机会.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 3, note: "10.31 雪梅稿：确认能否听见、她在广场而不是图书馆，先把环境安顿好。" },
      { purposeKey: "open.questionnaire", from: 4, to: 4, note: "10.31 雪梅稿：复述问卷给她的“细水长流但有力量”的感受，并点出“没想到你是专科”，让她被看见。" },
      { purposeKey: "scan.volunteer", from: 5, to: 12, note: "10.31 雪梅稿：确认她专科大二、想升本、专业是新闻采编与制作，且不喜欢本专业、升本想换汉语言或新闻。" },
      { purposeKey: "scan.parents", from: 6, to: 8, note: "10.31 雪梅稿：区分“家人建议升本”和“她自己想升本”，确认父母态度是支持但不了解细节。" },
      { purposeKey: "scan.family-burden", from: 16, to: 18, note: "10.31 雪梅稿：问出家里三个孩子、她是长姐，下面还有弟弟妹妹，带出她要给弟妹做榜样的责任。" },
      { purposeKey: "trust.self-disclosure", from: 17, to: 18, note: "10.31 雪梅稿：用“我也是长姐”接住她，建立同为大学生的相似性。" },
      { purposeKey: "scan.holiday", from: 19, to: 28, note: "10.31 雪梅稿：问她大一一年怎么过，带出“得过且过、忙学校杂事、劳动课打跳、绩点和奖学金”的真实状态。" },
      { purposeKey: "diag.major", from: 10, to: 15, note: "10.31 雪梅稿：把“不喜欢本专业”拆成升本换专业的选择题，比较汉语言文学和新闻学的压力与就业。" },
      { purposeKey: "diag.major.reality", from: 35, to: 42, note: "10.31 雪梅稿：用新闻采编“写稿拍照剪辑都学一点”对照影视编导、汉语言、电商运营，说明广而不精会落到三四千基础岗。" },
      { purposeKey: "window.english-leverage", from: 49, to: 51, note: "10.31 雪梅稿：从她“什么都拿不出来”的自评切入，提出先培养一个硬实力，落到英语。" },
      { purposeKey: "offer.pitfall.sunk", from: 57, to: 64, note: "10.31 雪梅稿：用专升本龙头机构上岸率不到50%、英语只教做题技巧，说明报班不等于打地基。" },
      { purposeKey: "diag.major.reality", from: 65, to: 71, note: "10.31 雪梅稿：讲汉语言文学是云南专升本超级卷的大类、升上本科要补大量专业课，劝她别只看“万金油”。" },
      { purposeKey: "filter.timeline", from: 75, to: 79, note: "10.31 雪梅稿：给出专升本时间线——大二打基础、大三上12月报名、次年3—4月考试、5月填志愿。" },
      { purposeKey: "window.final-goal", from: 80, to: 90, note: "10.31 雪梅稿：把升本后的本科大三定义为“别人的决赛圈”，说明升本不是终点，仍要积累简历。" },
      { purposeKey: "diag.english", from: 92, to: 104, note: "10.31 雪梅稿：把专业课投入和英语投入做对比，指出她担心“学不会”的根因是方法和反馈，不是能力。" },
      { purposeKey: "scan.score", from: 97, to: 99, note: "10.31 雪梅稿：问出高考英语80多分，确认她的英语是“中上但不稳”，需要把优势项夯实。" },
      { purposeKey: "diag.english.speed", from: 104, to: 106, note: "10.31 雪梅稿：讲自己高中背维克多词典三遍仍考不好，说明死拼不等于有效，问题在方法。" },
      { purposeKey: "diag.english", from: 112, to: 118, note: "10.31 雪梅稿：算专升本英语拉分账——同样专业课110，英语90和50能差40分，足以从公办掉到民办。" },
      { purposeKey: "window.english-leverage", from: 118, to: 124, note: "10.31 雪梅稿：结合丽江外国游客、文旅双语短视频、海外账号运营、英语家教，说明英语能给新传专业加差异化。" },
      { purposeKey: "offer.trust", from: 138, to: 143, note: "10.31 雪梅稿：讲老师公司给学员免费实习、有自媒体部门，以及被央视采访，用平台和结果建立可信度。" },
      { purposeKey: "offer.pitfall.feedback", from: 138, to: 139, note: "10.31 雪梅稿：讲自己找免费音标资源、没人纠正口型和发音，点明缺反馈导致练一小时也没进步。" },
      { purposeKey: "offer.close.price", from: 162, to: 171, note: "10.31 雪梅稿：确认分期首期900左右、她手里1400付得起，后面靠助学金和生活费周转。" },
      { purposeKey: "offer.close.self-fund", from: 165, to: 171, note: "10.31 雪梅稿：她明确不想跟父母开口、自己买了手机后还剩一千多，咨询师帮她把首期压力算清楚。" },
      { purposeKey: "offer.close.risk-reversal", from: 174, to: 180, note: "10.31 雪梅稿：讲七天学习保障期、不满意全额退款，把决策风险降到零。" },
      { purposeKey: "offer.close.hesitation", from: 172, to: 173, note: "10.31 雪梅稿：接住她“怕没效果、怕时间冲突”，用“相信比怀疑多一次机会”推动她先行动。" },
      { purposeKey: "filter.tutor", from: 184, to: 188, note: "10.31 雪梅稿：算家教账——一小时50、一天200、一个月6000，说明寒假学完发音就能变现。" },
      { purposeKey: "offer.close.enroll", from: 223, to: 228, note: "10.31 雪梅稿：回应她“上课要多久”，说明一个多月打基础、四五个月到自由交流，并让她直接问助教分期。" },
      { purposeKey: "offer.handoff", from: 175, to: 179, note: "10.31 雪梅稿：讲周内录播、周末直播可回放、纠音可前一天预约，解决她“时间和课程冲突”的担心。" },
      { purposeKey: "offer.close.followup", from: 234, to: 242, note: "10.31 雪梅稿：收尾约定专业写作、成长问题都可以问，并提醒下午有桃姐的成长方法论直播。" },
      { purposeKey: "diag.money", from: 153, to: 161, note: "10.31 雪梅稿：确认她卡的不是时间而是钱和“怕没效果”，把经济顾虑和效果顾虑分开处理。" }
    ]
  },
  {
    id: "dz51",
    label: "10月 小白咨询稿",
    file: "zxg/dz_zxg/吕新蕊+260401039+小白+想要把新疆考公作为保底选项+想要学好英语+但是现在大三课多+考公备考时间还长+担心投入英语的roi不高.docx",
    season: '淡季',
    parser: 'transcript',
    mappings: [
      { purposeKey: "open.confirm-call", from: 1, to: 4, note: "10月 小白稿：先试麦确认能不能听清，问清她在图书馆还是刚从自习室出来，提醒她找个能坐、能说话的位置再开始，先把环境落地。" },
      { purposeKey: "scan.volunteer", from: 10, to: 11, note: "10月 小白稿：从“土地资源管理”专业切入，问她当初为什么选中外合办、为什么去青海，她解释是看中合办项目和青海省认证的一本平台。" },
      { purposeKey: "scan.score", from: 12, to: 13, note: "10月 小白稿：追问她高中英语的“优势”具体在哪、能考多少分，拿到高考100分，并确认她高一高二不吃力、高三突然吃力、当时还不考听力。" },
      { purposeKey: "open.questionnaire", from: 14, to: 14, note: "10月 小白稿：复述问卷里“想找到自己的小坑位、提高内在魅力、成为香饽饽”这句，和她的声音做反差，让她知道问卷被认真看过而不是套模板。" },
      { purposeKey: "scan.parents", from: 14, to: 16, note: "10月 小白稿：问父母做什么、一年学费不便宜但家里比较支持，再用河南到青海的火车卧铺三百多、高铁不到五百，侧面了解家庭经济和回家成本。" },
      { purposeKey: "filter.track", from: 17, to: 34, note: "10月 小白稿：围绕青海专项选调只面向青大、青民大、青师大三所高校这条政策，逐层问名额、定向的高海拔地区、五年服务期、晋升空间和竞争范围，把“考公保底”拆成可评估的路径。" },
      { purposeKey: "window.competition-pool", from: 22, to: 24, note: "10月 小白稿：用“985学生也来青海考选调”和“你们只跟三所高校校内竞争”做对比，指出她的竞争池其实很小、录取比例高，和外面看到的考公热不是一回事。" },
      { purposeKey: "scan.family-burden", from: 37, to: 40, note: "10月 小白稿：从弟弟、爸爸从事医疗问到助学贷款，确认她选青海有“毕业去西北服务可免贷款”的现实考虑，并提到回河南安阳的贫困县也有类似政策。" },
      { purposeKey: "diag.english", from: 59, to: 62, note: "10月 小白稿：抓住问卷里“英语重要性打十分”和“全英授课”的矛盾，问她既然想考公为什么还看重英语；她说是在留一条保底路线，同时担心精力两头不够、投入值不值。" },
      { purposeKey: "diag.major.reality", from: 63, to: 68, note: "10月 小白稿：用土地资源管理对应的基层督查岗位举例，讲迎检、台账、草原耕地勘察、冬天加班和缺氧犯困，把“上岸”还原成具体的基层工作日，再问她能不能坚持。" },
      { purposeKey: "window.english-leverage", from: 79, to: 80, note: "10月 小白稿：提出“双轨制”，让英语每天花更少时间做保底能力、不耽误考公主线，还能练表达和面试；她担心两头抓不住，于是把时间落到周末8小时、平日2到3小时。" },
      { purposeKey: "filter.gpa", from: 81, to: 83, note: "10月 小白稿：问课程重不重要，确认这学期还要抓成绩、期末老师会划重点，建议把简单课和水课的一部分时间挪给考公，专业课留到期末集中复习。" },
      { purposeKey: "diag.english.method", from: 88, to: 90, note: "10月 小白稿：用自己的英专经历说明“教得细不等于教得会”，指出中外合办同样缺指导；再纠正“英语靠做题”，说做题只是检验，真正要练的是发音和语言逻辑。" },
      { purposeKey: "offer.ask-plan", from: 92, to: 94, note: "10月 小白稿：用 ROI（投入产出比）解释同样时间投英语回报更高，问她打算自己摸索还是找老师；她说老师方法好但贵、还没下定决心。" },
      { purposeKey: "offer.close.parents", from: 99, to: 101, note: "10月 小白稿：讲自己跟妈妈商量被拒、妈妈只给练车钱不给英语钱，最后跟奶奶借三百、弟弟省生活费、爸爸掏私房钱凑上；学了一个月把自我介绍视频发给妈妈，妈妈态度才变软。" },
      { purposeKey: "offer.close.self-fund", from: 101, to: 103, note: "10月 小白稿：讲自己首月分期九百多、妈妈起初不知道，又用实习时遇到的长姐自己挣学费的案例说明可以自筹；补充老师那边有4到6期特殊分期机制。" },
      { purposeKey: "offer.trust", from: 107, to: 109, note: "10月 小白稿：回应她“直播一个半小时都在推销”的顾虑，说明正课50分钟里48分钟是干货，再用老师与央视合作大学生职业教育竞赛、上半年被采访表扬的材料补可信度。" },
      { purposeKey: "diag.english.speed", from: 110, to: 112, note: "10月 小白稿：纠正“一个月掌握英语”的预期，说一个半月口语会有变化；把七天保障期解释成一周抽三天、每天45分钟到1小时就能感到口腔和口语的变化。" },
      { purposeKey: "offer.need.path", from: 118, to: 127, note: "10月 小白稿：用“学中文先学拼音再写字”和12岁语言敏感期做类比，说明成年人已过敏感期、要走逻辑理解，所以必须从发音和发音规则起步，再穿插单词、句子连读和听力。" },
      { purposeKey: "offer.compare", from: 131, to: 133, note: "10月 小白稿：拿她正在看的四级阅读技巧、段落匹配视频和新东方技巧小班课做对比，指出技巧学得会但地基不牢心里没谱；又用班里从小出国的男生说明早期语言环境的差距。" },
      { purposeKey: "offer.need.coach", from: 138, to: 139, note: "10月 小白稿：讲自己学发音时每天打卡、老师按语音听舌位和口腔位置纠音，现在可以预约老师用腾讯会议；二十多天后穿插单词，一节课能过120到150个词。" },
      { purposeKey: "trust.self-disclosure", from: 147, to: 148, note: "10月 小白稿：说自己高中把维克多词典背了三遍、高考还是100来分，承认自己是努力型但方向不对，用这段经历接住她“努力也没结果”的感受。" },
      { purposeKey: "offer.close.price", from: 164, to: 167, note: "10月 小白稿：处理她对“原价6980、限量100张优惠券”的怀疑，说明名额确实有限、自己第二天没抢到是找助教协调的，并用老师上央视、重视口碑来解释不会乱发券。" },
      { purposeKey: "offer.close.enroll", from: 169, to: 173, note: "10月 小白稿：收尾确认下一步：想体验就可以开始做计划、开课很快，让她按自己节奏走；有问题再找咨询师，跟老师协商后报喜并告知助教老师是谁。" }
    ]
  }
]

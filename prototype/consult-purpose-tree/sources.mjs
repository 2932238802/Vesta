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
  }
]

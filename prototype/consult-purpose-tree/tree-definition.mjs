// 只读原型：七月咨询稿的“目的树”手工拆分。
//
// 说明：
// - 节点正文写的是“这一段想达成什么”，不是原文。
// - 原文话术放在 examples 里，按导入脚本 `--list` 输出的段号 / 轮次引用，保证逐字可回溯。
// - butterflies 是挂在目的节点上的情绪/过渡垫话，不进入主线路径。
// - optional 表示可选支线（例如 9 个担忧话题），strict tree 结构不变，只是路径可以跳过。
// - gap 表示原稿只有标题、没有展开话术。

const j = (from, to = from, note = '') => ({ source: 'july', from, to, note })

const bf = (id, label, tags, examples, summary = '') => ({
  kind: 'butterfly',
  id,
  label,
  tags,
  summary,
  examples
})

const p = (purposeKey, label, summary, options = {}) => ({
  kind: 'purpose',
  id: purposeKey,
  purposeKey,
  label,
  summary,
  optional: options.optional ?? false,
  gap: options.gap ?? false,
  incomplete: options.incomplete ?? false,
  group: options.group ?? false,
  branchCondition: options.branchCondition ?? '',
  examples: options.examples ?? [],
  notes: options.notes ?? [],
  butterflies: options.butterflies ?? [],
  children: options.children ?? []
})

const s = (id, label, summary, children) => ({
  kind: 'stage',
  id,
  label,
  summary,
  children
})

export const meta = {
  id: 'peak',
  name: '旺季骨架',
  season: '旺季',
  description: '七八月成交稿：先建立信任，再围绕担忧逐项拆，最后承接课程。'
}

export const tree = {
  label: '七月咨询稿 · 旺季骨架',
  source: 'zxg/七月咨询稿.docx',
  note:
    '这是一份只读拆分稿。段号对应 scripts/import-consult-docx.mjs --list 的输出；示例保留原文，节点标题与概括是人工整理的“目的”，不是系统自拟话术。',
  children: [
    s('stage.open', '开场与建立信任', '先让她愿意听，再开始讲。', [
      p('open.confirm-call', '确认本人并寒暄', '确认电话对象，用轻松的语气开场，避免一上来就进入正题。', {
        examples: [j(3)]
      }),
      p(
        'trust.self-disclosure',
        '用共同经历建立相似性',
        '讲自己高考失利的真实经历，让她先感到“你懂我”，而不是被说教。',
        {
          examples: [j(5, 10)]
        }
      ),
      p(
        'trust.ask-her-result',
        '用一句提问把故事和她连起来',
        '在故事中间问她的发挥，避免变成单方面演讲，也顺势拿到她的高考结果。',
        { examples: [j(11)] }
      ),
      p(
        'trust.bridge',
        '把故事连到“高考后的一个月”',
        '从自己的经历转到她：真正改变命运的不是高考，而是高考后那一个月。',
        { examples: [j(12, 14)] }
      ),
      p('trust.permission', '获得收听许可', '在进入长内容前，先问她是否做好听的准备，减少被动感。', {
        examples: [j(18)]
      }),
      p(
        'trust.relax',
        '调节氛围，降低戒备',
        '先问一句“紧张吗”，再把关系拉近到姐姐/妹妹，让她敢于提问。',
        {
          examples: [j(20)],
          butterflies: [
            bf(
              'bf.rapport.sister',
              '姐姐/妹妹类比',
              ['拉近关系'],
              [j(21, 22)],
              '用“大你一点的姐姐”“像看我妹妹一样”降低距离感。'
            )
          ]
        }
      ),
      p(
        'open.agenda',
        '说明接下来要问几个问题',
        '先给她一个结构感，知道接下来是有顺序的对话，而不是闲聊。',
        { examples: [j(24)] }
      )
    ]),

    s('stage.scan', '状态摸底', '先了解她现在的状态、家庭、分数和担心，后面的诊断才有依据。', [
      p('scan.holiday', '假期在做什么', '了解她当下的生活状态和能量水平，判断她是放松、焦虑还是迷茫。', {
        examples: [j(25)],
        butterflies: [
          bf('bf.humor.reply', '轻松回应', ['玩笑'], [j(26)], '用一声“哈哈”接住，不让问题变成审问。')
        ]
      }),
      p(
        'scan.parents',
        '了解父母管束与家庭氛围',
        '了解父母对她的要求、支持程度和沟通方式，判断家庭是助力还是压力源。',
        {
          examples: [j(27)],
          butterflies: [
            bf('bf.empathy.normal', '正常化', ['共情'], [j(28)], '“挺正常的，大部分人都这样。”'),
            bf(
              'bf.rapport.sister2',
              '妹妹类比',
              ['拉近关系'],
              [j(35)],
              '用自己的妹妹做类比，让家长话题不显得冒犯。'
            ),
            bf(
              'bf.empathy.parent',
              '替父母解释',
              ['共情'],
              [j(36, 38)],
              '“爸妈这个时间点也焦虑，他们也不知道该说啥。”'
            )
          ]
        }
      ),
      p('scan.score', '了解估分与发挥', '了解高考结果和她的情绪反应，接住可能存在的失落。', {
        examples: [j(29)],
        butterflies: [
          bf(
            'bf.empathy.low',
            '接住低落',
            ['共情'],
            [j(30, 31)],
            '先承认她的低落，再问具体哪一科没发挥好。'
          )
        ]
      }),
      p('scan.volunteer', '了解志愿与专业选择', '了解志愿确定性、谁做主、她对专业的真实想法。', {
        examples: [j(32, 34)]
      }),
      p(
        'scan.worries',
        '引出担心与憧憬',
        '让她自己说出对大学最担心和最期待的事，为后面的诊断定方向。',
        {
          examples: [j(39)],
          butterflies: [
            bf(
              'bf.praise.quick',
              '肯定她提前思考',
              ['肯定'],
              [j(40, 42)],
              '“你今天能提前来想这件事，本身就已经快人一步了。”'
            )
          ]
        }
      )
    ]),

    s(
      'stage.diagnose',
      '针对性解答担忧',
      '不按固定顺序讲，从她最在意的点进入；每个话题都是可选支线。',
      [
        p(
          'diag.choose',
          '选择她最在意的担忧',
          '先判断她最在意哪一个，再进入对应话题；可以讲一个，也可以讲多个。',
          {
            notes: [
              '话题是可选支线：不要求全部讲完，按她的反应选择。',
              '原稿中「班委、分班、学生会、入团入党」只有标题，没有展开话术。'
            ],
            group: true,
            children: [
              p(
                'diag.social',
                '社交/社恐',
                '把“我不会社交”从性格问题，重新定义成“我身上有没有让人想靠近的价值”。',
                {
                  optional: true,
                  examples: [j(46)],
                  butterflies: [
                    bf(
                      'bf.empathy.social',
                      '共情社交恐惧',
                      ['共情'],
                      [j(47)],
                      '先承认“真这样的话还挺难受的”，再往下讲。'
                    )
                  ],
                  children: [
                    p(
                      'diag.social.desire',
                      '说出她渴望的社交状态',
                      '把恐惧翻到背面：她真正想要的是能说真心话、一起做事的朋友。',
                      { examples: [j(49)] }
                    ),
                    p(
                      'diag.social.reframe',
                      '给新解释：人被价值吸引',
                      '社交的本质不是主动讨好，而是你身上有没有别人想靠近的东西。',
                      { examples: [j(50, 57)] }
                    )
                  ]
                }
              ),
              p(
                'diag.confidence',
                '不自信',
                '把“不自信”从性格问题，重新定义成“结果问题”。',
                {
                  optional: true,
                  examples: [j(59, 60)],
                  children: [
                    p(
                      'diag.confidence.ask',
                      '用提问让她自己得出答案',
                      '不直接给结论，先问她“自信是相信自己，还是一次次做到积累出来的”。',
                      {
                        examples: [j(62, 63)],
                        butterflies: [
                          bf('bf.praise.smart', '夸她反应快', ['肯定'], [j(64)], '“你这小脑瓜子，很好用嘛。”')
                        ]
                      }
                    ),
                    p(
                      'diag.confidence.reframe',
                      '给出结论：自信是结果',
                      '自信不是凭空相信自己，而是不断做到之后长出来的。',
                      { examples: [j(65, 70)] }
                    )
                  ]
                }
              ),
              p(
                'diag.money',
                '大学怎么赚钱',
                '把“想赚钱”拆成时间换钱和能力赚钱，引导她尽早转向能力型。',
                {
                  optional: true,
                  examples: [j(72, 73)],
                  butterflies: [
                    bf(
                      'bf.humor.money',
                      '轻松接住',
                      ['玩笑'],
                      [j(74)],
                      '“哈哈，这是所有大学生都想做的事。”'
                    )
                  ],
                  children: [
                    p(
                      'diag.money.two-kinds',
                      '区分两种赚钱方式',
                      '时间换钱是消耗，能力赚钱是积累；用身边例子让她看到差别。',
                      { examples: [j(75, 79)] }
                    ),
                    p(
                      'diag.money.advice',
                      '给出建议：尽早转向能力型',
                      '大一可以先积累能力，着急的话用时间型攒第一笔资金，再投资能力。',
                      { examples: [j(80, 81)] }
                    )
                  ]
                }
              ),
              p(
                'diag.dorm',
                '宿舍关系',
                '把“宿舍关系”从大学生活的全部，缩小成睡觉的 8 小时。',
                {
                  optional: true,
                  examples: [j(83, 85)],
                  children: [
                    p(
                      'diag.dorm.reframe',
                      '重新框定：宿舍只是 8 小时',
                      '大学剩下的 16 小时在图书馆、课堂、社团、实习和比赛里。',
                      { examples: [j(86, 90)] }
                    ),
                    p(
                      'diag.dorm.mindset',
                      '给出心态：友善但不强融',
                      '遇到好室友是运气，遇到难处的室友是无奈；别让宿舍定义你的大学。',
                      { examples: [j(91, 93)] }
                    )
                  ]
                }
              ),
              p(
                'diag.club',
                '社团要不要加',
                '社团不是越多越好，而是看它能不能沉淀作品、资源或被看见的机会。',
                {
                  optional: true,
                  examples: [j(95, 97)],
                  children: [
                    p(
                      'diag.club.experience',
                      '用自己的经历说明加太多没用',
                      '大一加 4 个、退 3 个，忙不等于值得。',
                      { examples: [j(98)] }
                    ),
                    p(
                      'diag.club.criteria',
                      '给出三条判断标准',
                      '作品、资源、被看见的机会，至少占一样才值得加。',
                      {
                        examples: [j(101, 106)],
                        butterflies: [
                          bf(
                            'bf.humor.club',
                            '自嘲式举例',
                            ['玩笑'],
                            [j(99, 100)],
                            '“跑断腿……大二退了 3 个。”'
                          )
                        ]
                      }
                    )
                  ]
                }
              ),
              p(
                'diag.major',
                '专业不喜欢怎么办',
                '把“专业决定一生”拆成“专业是底牌，能力才是选择”。',
                {
                  optional: true,
                  examples: [j(108, 109)],
                  children: [
                    p(
                      'diag.major.data',
                      '用数据说明专业对口率低',
                      '大部分毕业生不会从事本专业对口工作，行业也会变化。',
                      { examples: [j(110, 111)] }
                    ),
                    p(
                      'diag.major.second-card',
                      '提出“第二张牌”',
                      '除了专业课，还要有英语、表达、写作、运营、作品等第二张牌。',
                      {
                        examples: [j(112), j(114, 117)],
                        butterflies: [
                          bf('bf.empathy.major', '正常化担心', ['共情'], [j(113)], '“对吧，其实都会。”')
                        ]
                      }
                    ),
                    p(
                      'diag.major.cases',
                      '用案例证明，并落到英语',
                      '三个不同专业的案例说明：有能力就有选择；英语是最容易长出来的第二张牌。',
                      { examples: [j(118, 123)] }
                    )
                  ]
                }
              ),
              p('diag.monitor', '班委竞选', '原稿只有标题，还没有展开话术。', {
                optional: true,
                gap: true,
                notes: ['原稿中只有标题，没有展开话术。']
              }),
              p('diag.class', '分班考试 A/B 班', '原稿只有标题，还没有展开话术。', {
                optional: true,
                gap: true,
                notes: ['原稿中只有标题，没有展开话术。']
              }),
              p('diag.union', '学生会', '原稿只有标题，还没有展开话术。', {
                optional: true,
                gap: true,
                notes: ['原稿中只有标题，没有展开话术。']
              }),
              p('diag.party', '入团入党', '原稿只有标题，还没有展开话术。', {
                optional: true,
                gap: true,
                notes: ['原稿中只有标题，没有展开话术。']
              })
            ]
          }
        )
      ]
    ),

    s(
      'stage.window',
      '重新定义暑假',
      '把假期从“放松期”重新定义成“身份转换窗口”，让她看到机会和不行动的代价。',
      [
        p(
          'window.capability-timing',
          '引出能力培养时间',
          '把话题从“担心”转到“能力什么时候培养”，为后面的标准做铺垫。',
          { examples: [j(130, 134)] }
        ),
        p(
          'window.identity',
          '这个假期的特殊性',
          '她既不是高中生，也还不是大学生；什么都还没定，什么都还有可能。',
          { examples: [j(135, 137)] }
        ),
        p(
          'window.fixed-vs-open',
          '什么已定、什么未定',
          '高考分数、学校、专业范围已定；开学后的样子还没定。',
          { examples: [j(138, 144), j(145, 156)] }
        ),
        p(
          'window.peers',
          '同龄人的假期安排',
          '用同龄人对比制造轻微的紧迫感，但不贬低她。',
          {
            examples: [j(157, 158), j(160, 161)],
            notes: ['原稿第 159 段是导演提示：如果她身边没有学习的，就调侃地说圈子不太行。']
          }
        ),
        p(
          'window.timeline',
          '开学后三个月的时间线',
          '让她具体看到开学后机会出现的节奏：军训、分班考、班委、社团、四六级。',
          { examples: [j(162, 177)] }
        ),
        p(
          'window.opportunities',
          '时间线里的机会',
          '把每个场景翻译成机会：军训表演、分班考、班委、英语自我介绍、社团核心岗位、四六级。',
          { examples: [j(178, 186)] }
        ),
        p(
          'window.catch',
          '机会只给有能力接住的人',
          '机会一直在，但能不能抓住，取决于那时她已经有什么能力。',
          { examples: [j(187, 200)] }
        ),
        p(
          'window.two-paths',
          '两种假期走法',
          '纯放松 vs 留出一块时间培养能力；两种走法开学后的状态完全不同。',
          { examples: [j(205, 210)] }
        ),
        p(
          'window.cases',
          '正反案例',
          '用出分后的两种被动、小赵和堂弟的案例，让她看到选择的长期后果。',
          {
            group: true,
            children: [
              p(
                'window.cases.two-outcomes',
                '出分后的两种被动',
                '考得好会飘、考得差会自我怀疑；两种都可能让暑假被动度过。',
                { examples: [j(212, 228), j(229, 242)] }
              ),
              p(
                'window.cases.peers',
                '其他同龄人在干嘛',
                '25% 的人已经用大学生的状态准备进入大学，差别从军训第一天就开始了。',
                { examples: [j(243, 252)] }
              ),
              p(
                'window.cases.zhao',
                '小赵的正面案例',
                '普通二本、旅游管理调剂，但暑假学英语，开学后一路拿到结果。',
                { examples: [j(253, 261)] }
              ),
              p(
                'window.cases.zhao-three',
                '小赵做对的三个点',
                '心态、认知、行动力；这三个她也可以有。',
                {
                  examples: [j(262), j(264, 268)],
                  notes: ['原稿第 263 段是导演提示：考虑把“为什么选择学英语”提前加进去。']
                }
              ),
              p(
                'window.cases.cousin',
                '堂弟的反面案例',
                '暑假纯玩，开学后一次次错过机会，大三还在挣扎过六级。',
                { examples: [j(269, 278)] }
              )
            ]
          }
        ),
        p(
          'window.job',
          '就业导向：以终为始',
          '如果她关心就业，把视角拉到四年后的招聘市场，再回到这个假期该准备什么。',
          {
            group: true,
            notes: [
              '9.18 稿的主线更偏就业；这段作为可选支线，不和七月稿的暑期机会窗口互相替代。',
              '原稿是先看四年后的结果，再看学校教的和企业要的差在哪，最后用简历和时间线落到现在。'
            ],
            children: [
              p(
                'window.job.outcome',
                '以终为始看四年后',
                '先不谈这个假期，直接问她四年后想拿什么结果，从终点倒推现在。',
                {
                  optional: true,
                  branchCondition: '如果她关心就业，或说不清大学四年要干什么'
                }
              ),
              p(
                'window.job.reality',
                '就业现实与学校/社会错配',
                '学校教的和企业要的不完全是一回事，毕业时才准备就晚了。',
                {
                  optional: true,
                  branchCondition: '如果她说先跟着学校走 / 到时候再说'
                }
              ),
              p(
                'window.job.resume',
                '用简历和时间线看见差距',
                '拿成熟简历和大一简历对比，让她看到大一大二该往简历上放什么。',
                {
                  optional: true,
                  branchCondition: '如果她对就业没有具体概念'
                }
              )
            ]
          }
        )
      ]
    ),

    s(
      'stage.filter',
      '目标与能力筛选',
      '把“精彩大学”收窄成“这个假期先练出一项优势能力”，再用标准落到英语。',
      [
        p(
          'filter.one-ability',
          '只能选一项优势能力',
          '不是越多越好，选一项开学就能用、未来还持续回报的能力。',
          { examples: [j(281, 287)] }
        ),
        p(
          'filter.candidates',
          '候选能力清单',
          '让她自己列举可能的能力，避免直接替她做决定。',
          { examples: [j(289, 291)] }
        ),
        p('filter.criteria', '六条筛选标准', '通用、刚需、有基础、见效快、可展示、有复利。', {
          examples: [
            j(293, 302)
          ]
        }),
        p(
          'filter.track',
          '就业赛道与她的目标',
          '如果她已经明确就业导向，用四条赛道和她的目标，说明为什么现在要积累可迁移能力。',
          {
            group: true,
            notes: ['9.18 稿用就业赛道和她的计划替代“六条标准”，最后同样落到英语这项可迁移能力。'],
            children: [
              p(
                'filter.track.four-paths',
                '四条就业赛道',
                '企业技术岗、体制内、教育、考研；每条赛道看的能力不同，早准备才有选择。',
                { optional: true }
              ),
              p(
                'filter.track.her-plan',
                '她自己的目标与计划',
                '先问她想走哪条、现在准备到哪一步，再决定后面往哪讲。',
                { optional: true }
              )
            ]
          }
        ),
        p(
          'filter.competition',
          '竞赛与项目经历',
          '把竞赛从“要不要参加”变成“参加哪一类、什么时候参加”，为简历和时间线服务。',
          {
            group: true,
            notes: ['这是 9.18 稿在就业主线上的补充，不要求七月稿路径也讲。'],
            children: [
              p(
                'filter.competition.why',
                '大二竞赛与导师',
                '大二是竞赛和进导师组的窗口，错过了后面很难补。',
                { optional: true }
              ),
              p(
                'filter.competition.types',
                '四类竞赛清单',
                '先把能参加的竞赛类型摆出来，让她知道自己有什么选择。',
                { optional: true }
              ),
              p(
                'filter.competition.choose',
                '精而不泛，选一到两个',
                '竞赛不是越多越好，选和她方向相关的一到两个做深。',
                { optional: true }
              )
            ]
          }
        ),
        p(
          'filter.english',
          '落到英语：逐条验证',
          '用她自己认可的标准，把英语推成这个假期最值得练的那一项。',
          {
            examples: [
              j(304)
            ],
            children: [
              p('filter.english.universal', '通用', '所有专业、考公考研就业都用得上。', {
                examples: [j(305, 310)]
              }),
              p('filter.english.necessary', '刚需', '四六级、考研、考公、外企、大厂都看英语。', {
                examples: [j(311, 316)]
              }),
              p('filter.english.foundation', '有基础', '已经学了十年英语，不是从零开始。', {
                examples: [j(317, 322)]
              }),
              p('filter.english.fast', '见效快', '一个月就能看到口语、听力、发音的变化。', {
                examples: [j(323, 326)]
              }),
              p('filter.english.visible', '可展示', '开学自我介绍、英语课、英语角、竞赛都能被看见。', {
                examples: [j(327, 332)]
              }),
              p('filter.english.compound', '复利', '大一奖学金、大二家教、大三保研、大四面试，越用越值钱。', {
                examples: [j(333, 344)]
              })
            ]
          }
        )
      ]
    ),

    s(
      'stage.offer',
      '英语破局与方案承接',
      '从“英语重要”转到“怎么学”，再用自学三坑和三样基础设施，自然承接老师/课程。',
      [
        p(
          'offer.ask-plan',
          '问她打算怎么学',
          '把话题从“重要”转到“怎么学”，并且必须等她回答，不要自问自答。',
          {
            examples: [j(347, 350)],
            notes: ['原稿第 351 段是导演提示：一定要等她回答，不要自问自答。'],
            children: [
              p(
                'offer.self-study',
                '她说“自学/背单词/刷 app”',
                '先认可，再指出自学走不通的三个原因。',
                {
                  optional: true,
                  branchCondition: '如果她说：我打算自学 / 背单词 / 刷 app',
                  examples: [j(353, 355)],
                  butterflies: [
                    bf(
                      'bf.soften.selfstudy',
                      '先认可再转折',
                      ['缓冲'],
                      [j(353, 354)],
                      '“挺多人都这么想，我大一也这么试过。”'
                    )
                  ]
                }
              ),
              p(
                'offer.no-idea',
                '她说“不知道怎么学”',
                '把“不知道”重新框定成最好开始的状态。',
                {
                  optional: true,
                  branchCondition: '如果她说：我不知道怎么学',
                  examples: [j(357, 358)],
                  butterflies: [
                    bf(
                      'bf.reassure.noidea',
                      '给台阶',
                      ['肯定'],
                      [j(357)],
                      '“你这种状态反而是最好开始的。”'
                    )
                  ]
                }
              ),
              p(
                'offer.find-teacher',
                '她说“想找老师/报班”',
                '不急着否定，先讲什么算有效学习。',
                {
                  optional: true,
                  branchCondition: '如果她说：我想找个老师 / 报个班',
                  examples: [j(360, 361)],
                  butterflies: [
                    bf(
                      'bf.empathize.teacher',
                      '先理解再展开',
                      ['共情'],
                      [j(360)],
                      '“我理解你为什么这么想。但报班这件事也分情况。”'
                    )
                  ]
                }
              )
            ]
          }
        ),
        p('offer.three-pitfalls', '自学三坑', '用缺路径、缺反馈、缺环境三个坑，拆掉“自己学就行”的幻想。', {
          examples: [j(363, 364)],
          notes: ['原稿第 362 段是导演提示：自学幻想拆解，从分支汇合处统一讲。'],
          children: [
            p(
              'offer.pitfall.path',
              '缺路径',
              '资料不缺，缺的是先学什么、学多久、学到什么程度算合格的路径。',
              { examples: [j(365, 378)] }
            ),
            p(
              'offer.pitfall.feedback',
              '缺反馈',
              '视频是单向的，不会告诉你哪里错；错误练 1000 遍会变成肌肉记忆。',
              { examples: [j(379, 391)] }
            ),
            p(
              'offer.pitfall.environment',
              '缺环境',
              '一个人学，前 3 天兴致勃勃，第 15 天找借口，第 30 天放弃。',
              { examples: [j(392, 407)] }
            )
          ]
        }),
        p(
          'offer.three-needs',
          '真正学出来需要三样',
          '科学路径、针对性方案、真人陪跑，三样是英语学习的基础设施。',
          {
            examples: [j(408, 410)],
            children: [
              p('offer.need.path', '科学路径', '有人给你画好这个月、下个月学什么，每一步的进度清清楚楚。', {
                examples: [j(411, 416)]
              }),
              p('offer.need.plan', '针对性方案', '先测水平、找弱项，再定专属进度，不搞一刀切。', {
                examples: [j(417, 422)]
              }),
              p(
                'offer.need.coach',
                '真人陪跑',
                '外教纠音、助教跟进度、同期学员一起学，不让人一个人扛。',
                { examples: [j(423, 429)] }
              )
            ]
          }
        ),
        p(
          'offer.confirm-need',
          '确认她自己学不出来',
          '用一句提问让她自己承认：只靠背单词，一个多月很难学出结果。',
          {
            examples: [j(430)],
            butterflies: [
              bf('bf.affirm.self', '确认她的答案', ['肯定'], [j(431)], '“对呀，肯定不行的。”')
            ]
          }
        ),
        p(
          'offer.handoff',
          '承接老师/课程',
          '自然过渡到推荐老师，询问她有没有兴趣、有没有阻力；有顾虑就进入对应收尾分支。',
          {
            examples: [j(436, 438)],
            notes: [
              '七月稿在承接后中断，9.18 稿补上了价格、家长、犹豫、报名和课后跟进。',
              '原稿第 432 / 434 段是学生的简短回答（有 / 没有），第 433 / 435 段是对应的情绪回应，已拆成蝴蝶。'
            ],
            butterflies: [
              bf(
                'bf.praise.invest',
                '肯定投资学习的想法',
                ['肯定'],
                [j(433)],
                '“那很好呀，这投资学习的思维棒棒的。”'
              ),
              bf(
                'bf.normalize.no-plan',
                '给没规划的人台阶',
                ['正常化'],
                [j(435)],
                '“之前没人讲过规划和英语的重要性，没有也正常。”'
              )
            ],
            children: [
              p(
                'offer.close.price',
                '价格、分期与值不值',
                '不回避价格：先确认她认可价值，再解释投入和分期，不用廉价感换成交。',
                {
                  optional: true,
                  branchCondition: '如果她问价格 / 觉得贵 / 想用便宜资源'
                }
              ),
              p(
                'offer.close.parents',
                '和家长沟通',
                '帮她想好怎么和父母开口，把“要钱”变成“我在做一个有计划的决定”。',
                {
                  optional: true,
                  branchCondition: '如果她说要问爸妈 / 家里出钱'
                }
              ),
              p(
                'offer.close.hesitation',
                '犹豫时推动',
                '先接住犹豫，再把她拉回已经认可的价值和具体的下一步，不制造虚假紧迫。',
                {
                  optional: true,
                  branchCondition: '如果她说再想想 / 过两天再说'
                }
              ),
              p(
                'offer.close.enroll',
                '报名流程与开始时间',
                '把决定落到具体动作：怎么报、什么时候开始、第一周做什么。',
                {
                  optional: true,
                  branchCondition: '如果她已经同意，或问怎么开始'
                }
              ),
              p(
                'offer.close.followup',
                '课后跟进与作业',
                '成交不是结束：说明课后怎么跟进、作业怎么交、遇到问题找谁。',
                {
                  optional: true,
                  branchCondition: '如果她担心自己坚持不了 / 想了解课后服务'
                }
              )
            ]
          }
        )
      ]
    )
  ]
}

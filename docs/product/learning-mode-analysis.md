# DeepSeek Harness 学习模式：竞品与产品分析

版本：v0.1  
日期：2026-08-26  
角色：产品经理调研稿  
范围：DeepSeek Harness Portable 的 Interactive Learning preset

## 一页结论

本项目已经不是“给聊天机器人加一段教学提示词”，而是一套有明确教学策略的学习体验：

- 先判断用户是在学习，还是在完成普通任务；不会把编码、排障、翻译、查询等任务强行改造成课程。
- 每轮只推进一个认知动作：最小解释，加一个例子、对比、预测或迁移问题。
- 只有在确实有帮助时才展示原生交互视觉；只有下一次教学动作会因此改变时，才提出检查点。
- 学习状态依据学习者真实说过或做过的证据更新，允许“部分理解”和“尚未验证”，不会把点击、提交或一句“我懂了”直接包装成掌握。
- 会话学习状态、学习路线和视觉结果可随刷新、恢复、消息压缩和分叉继续。

这套内核的产品价值是“让用户从知道答案走向能解释、能预测、能应用”。问题不在核心理念，而在产品闭环：

1. 学习入口和价值不够显眼。用户需要显式选择 preset，第一次使用很难理解它和普通聊天的差别。
2. 学习成果仍主要停留在当前 session。没有用户主动保存的主题档案、跨会话复习和间隔安排，长期留存弱于 NotebookLM、Quizlet 等产品。
3. 材料学习链路不够产品化。已有 study map、来源锚点和 web 能力，但还没有“上传材料 → 选章节 → 学习 → 生成复习内容”的清晰路径。
4. 最有竞争力的“学习证据”和“原生视觉”偏工程化。用户看到的是图和对话，不一定能理解自己为什么学会、下一步该做什么。
5. 宣传不能把重点放在“有 15 种图表”或“使用了某个模型”。应该展示一个完整的学习瞬间：同一问题下，普通问答给答案，学习模式帮助用户自己解释并迁移。

建议的定位是：

> 学习模式：把“看懂”变成“会解释、会应用”。  
> 一边对话，一边用恰到好处的图示和问题，帮你真的学会，而不是替你完成。

建议未来 90 天先补齐“可发现、可看见、可复习”三件事，再考虑课程、教师后台或更复杂的长期画像。

## 1. 研究范围与方法

### 1.1 项目内审阅

本次审阅了：

- apps/interactive-learning/README.zh.md：产品行为、学习路由、视觉协议、状态持久化和明确不包含的能力。
- preset/learning/preset.yml 与 agent.cordis.yml：用户-facing 模式名称、工具范围、普通对话与学习对话边界。
- src/learn-intent.ts、teaching-route.ts、teaching-policy.ts：首轮路由、学习片段继承和教学原则。
- src/learner-state.ts：学习目标、先验、缺口、误解、证据、失败教学动作、路线和完成条件。
- src/client：交互视觉、检查点、会话学习笔记、回放、可访问性和降级行为。

### 1.2 竞品与公开资料

以 2026-08-26 可访问的官方产品页、帮助中心或官方博客为主，比较直接竞品和相邻竞品：

- ChatGPT Study Mode
- Gemini Guided Learning
- Perplexity Learn Mode
- Khanmigo
- NotebookLM
- Quizlet 的 Ask Quizlet 与 AI study tools
- Claude for Education 的 learning mode

公开资料比较不等于完整实测；套餐、地区、年龄和教育账号限制可能发生变化。报告中的“公开资料未突出”不等于竞品绝对没有该能力。

### 1.3 学习科学依据

本报告把“主动回忆、分散练习、逐步支架、工作示例、迁移应用”作为产品判断依据，而不是把使用时长或生成内容数量当成学习效果。

- Roediger 与 Karpicke 的综述指出，测试和主动回忆对后续保持有促进作用，不能把学习只设计成再次阅读：[The Power of Testing Memory](https://doi.org/10.1111/j.1745-6916.2006.00012.x)。
- Dunlosky 等人的综述将 practice testing 与 distributed practice 评为高效用学习技术：[Improving Students’ Learning With Effective Learning Techniques](https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html)。
- 工作示例与分段支架可降低新手在复杂任务上的认知负担，项目现有的“最小解释 + 近邻尝试”方向是合理的；但最终仍需要用户独立解释或迁移来证明能力。

## 2. 本项目现状：能力事实与用户价值

| 能力 | 当前产品事实 | 用户能得到的价值 | 当前风险 |
|---|---|---|---|
| 学习意图路由 | 对学习请求、概念定义、混淆修复、学习路径、学习资料请求做识别；普通编码和排障留在普通路径 | 不会因为打开学习模式就失去工作效率 | 用户不理解为什么有时会校准、有时直接讲 |
| 一步教学循环 | 每轮一个认知动作，最多一个聚焦问题；错误时换支架或表示方式 | 对话更像辅导，不容易被整篇答案淹没 | 如果问题太多或模型判断失误，仍可能产生“被考试”的感觉 |
| 会话学习状态 | 记录目标、先验、缺口、误解、证据、失败动作、阶段和路线；状态是暂定的 | 下一轮可以延续上下文，减少重复解释 | 状态字段对用户不透明，成果难以感知 |
| 学习路线 | 只有目标确实跨多个依赖步骤时才创建，最多 6 步，步骤需有学习者证据才能前进 | 复杂主题有方向，但不会被固定课程绑架 | 还不是可复用的课程或长期计划 |
| 语义原生视觉 | 支持 plot、node link、scene、relation、timeline、formula steps、study map、recall deck、data table、state/sequence/code trace、field、causal loop 等类型 | 把关系、过程、结构和变化直接展示出来 | 视觉选择与内容质量依赖模型；类型很多但用户不知道何时适合 |
| 检查点 | free text、单选、数字、预测、代码槽位；只在下一步会因回答而改变时出现 | 让用户产生真正的回答，而不是只读 | 目前不能形成连续练习、错题集或复习计划 |
| 普通对话兼容 | 视觉和检查点是非阻塞的，跳过、取消、渲染失败都会回到普通对话 | 不会被一个组件卡住 | “不阻塞”是底层优势，但 UI 还没有把它解释出来 |
| 学习笔记 | 可见目标、证据要点、路线/阶段进度，并支持继续深挖、换种讲法、结束片段 | 用户可以回看当前 session 学到了什么 | “会话学习笔记”仍像调试信息，不像用户的学习成果 |
| 当前主题来源 | 当前或有争议主题可通过 web 搜索获得来源；保留 source anchors | 对时效性内容更可信 | 来源阅读、引用和材料学习入口还不够顺畅 |
| 学术诚信 | 只有在可观察的 graded/submitted 场景下收紧，不把自学一概拒绝 | 保护学习者自主练习，也减少代做风险 | 学校、家长、教师治理能力仍不足 |
| 数据边界 | 当前状态是 session-local、可审计、无隐藏学习风格画像；刷新、恢复和 fork 有明确行为 | 用户不会被静默塑造成长期画像 | session 结束后没有可选的长期复习价值 |

## 3. 目标用户与真实任务

### 3.1 最适合的首要用户

| 用户 | 典型任务 | 为什么适合 | 不应承诺 |
|---|---|---|---|
| 技术型自学者 | 理解算法、系统机制、数据结构、数学基础、代码执行过程 | 原生 visual、code trace、formula、sequence 和普通对话组合得好 | 不承诺替代 IDE、课程或代码运行环境 |
| 工作中的知识型学习者 | 快速补齐新领域概念、读一份技术材料、准备汇报或面试 | 能根据现有先验改变解释，不必先完成固定课程 | 不承诺自动判断职业资格或考试通过 |
| 有具体卡点的学生/成人学习者 | “我总是混淆 X 和 Y”“我会做例题但不会变式” | 能记录误解、改换表示、要求迁移 | 不承诺未经评估就达到掌握 |
| 材料驱动的学习者 | 从讲义、PDF、文档或一组链接开始学习 | 已有 study map 和来源锚点的基础 | 当前材料 ingestion 和长期复习仍需补齐 |

### 3.2 暂不作为第一市场

- 纯语言打卡：Duolingo 的课程、角色扮演、语音反馈和连续激励更强。
- K-12 学校大规模部署：需要家长、教师、年级标准、数据治理和管理员后台。
- 纯记忆型备考：Quizlet、Anki 类工具的卡组、调度、练习统计更成熟。
- 需要完整课程内容的学习者：Khan Academy/Khanmigo 的结构化内容和课程库有明显优势。

## 4. 竞品研究

### 4.1 ChatGPT Study Mode

官方页面把 Study Mode 定义为“通过引导问题、分步支架、知识检查和反馈帮助用户理解”，并支持在对话中切换、上传图片或 PDF。它的最大优势是分发与认知：用户已经知道 ChatGPT，打开一个明确的学习开关就能开始。

产品启示：

- 项目需要同样低摩擦的入口，但可以保留更强的“普通对话默认”和“非阻塞视觉”特色。
- ChatGPT 把校准、问答和反馈作为用户能理解的表面行为；本项目已有更细的 evidence、failed move 和 transfer 规则，应做成简短的用户语言。
- 竞品的公开叙事是“从给答案到帮助学习”。本项目不能只重复这句话，要用视觉、会话恢复和不强迫流程形成更具体的证据。

来源：[Introducing study mode](https://openai.com/index/chatgpt-study-mode/)、[Study Mode help](https://help.openai.com/en/articles/11780217-study-mode)。

### 4.2 Gemini Guided Learning

Google 公开强调 Guided Learning 会先理解目标和水平，再用问题、分步解释、图片、图表、视频和互动测验帮助用户学习；同时依托 LearnLM、Gemini、Google Classroom、NotebookLM 等生态。

优势是多模态内容和强分发，用户不必自己设计 prompt；对材料、视频、练习和学习伙伴的组合也更完整。

项目机会：

- 不和 Google 比资源规模，应比“每一轮教学是否克制、是否真的回应学习者证据”。
- 视觉要围绕一个关系服务于一个动作，而不是把多媒体数量当价值。
- 可以学习其“结束后给下一步”的方式，但本项目应进一步给出“你刚才展示了什么证据、哪一点还未验证”。

来源：[Guided Learning in Gemini: From answers to understanding](https://blog.google/products-and-platforms/products/education/guided-learning/)、[Gemini Guided Learning how it works](https://blog.google/products-and-platforms/products/gemini/guided-learning/)。

### 4.3 Perplexity Learn Mode

Perplexity 的公开帮助页把 Learn Mode 定义为针对主动学习优化的搜索模式：分步解释、引导问题、提示、互动 flashcards、选择题、学习进度，以及从课程材料和笔记生成练习。官方页面同时显示了学生验证和 Education 入口，实际可用范围需以账号和地区为准。

优势是时效性、来源和学习互动结合得自然；用户从“查一个问题”进入“围绕材料学习”的路径很短。

项目机会：

- 本项目已有当前主题 web 来源能力，应把引用、章节锚点和学习笔记做得更可见。
- Perplexity 的搜索定位会让它偏“找到并整理信息”；本项目可专注于“在对话中确认用户能否独立解释或迁移”。
- 不能只提供一次性 quiz；要把练习结果与下一轮教学动作连接起来。

来源：[What is Learn Mode?](https://www.perplexity.ai/help-center/en/articles/12120542-what-is-learn-mode)。

### 4.4 Khanmigo

Khanmigo 的核心叙事是不会直接给答案，而是以 Khan Academy 的内容库为基础，引导学习者自己找到答案；对教师还提供与课程标准、学生工作和教学材料相关的工具。公开页面显示其学生访问存在年龄、地区、家长/学校和付费条件。

优势是教育信任、内容库、课程关联和治理叙事；它不只是一个空白聊天框。

项目机会：

- 本项目适合先服务“开放领域、技术概念、成人自学”，不要正面复制 K-12 课程平台。
- 可以借鉴“学习行为边界”和安全叙事，但不应宣传为“已达到学校级教学效果”。
- 如果未来进入学校市场，必须另起项目建设标准、家长/教师控制和数据治理。

来源：[Khanmigo official page](https://www.khanacademy.org/khan-labs/)（页面会跳转至 Khanmigo）。

### 4.5 NotebookLM

NotebookLM 强在“以用户提供的来源为中心”：可从讲义、研究论文和工作材料生成 flashcards、quizzes、study guides、mind maps、Audio/Video Overviews，并在解释和错题说明中回链来源。

优势是材料可信、输出多、适合研究与备考；它解决的是“把一堆资料变成可学习的材料”。

项目机会：

- 本项目的 study_map 和 source anchors 是正确方向，但需要一个用户一看就懂的“材料学习”入口。
- NotebookLM 强在资料工作台，项目可以差异化为“资料之后的实时辅导”：看完 map 后，围绕一个误解进行解释、预测和迁移。
- 要把“学完后的复习产物”做成可保存对象，否则用户仍会回到 NotebookLM/Quizlet。

来源：[6 NotebookLM features to help students learn](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-student-features/)、[NotebookLM source types](https://support.google.com/notebooklm/answer/16215270)。

### 4.6 Quizlet：Ask Quizlet 与 AI study tools

Quizlet 已从早期的 Q-Chat 叙事转向更完整的 Ask Quizlet、AI Study Guide、Practice Test、Flashcards、Learn 和 Expert Solutions 组合。公开页面强调把问题拆成步骤、对齐学习材料，再把对话转成可复习的学习资料；Learn 则以主动回忆和自适应练习为核心。旧 Q-Chat 的官方发布页注明它在 2025 年 6 月后不再提供，说明“单独的 AI 导师”最终仍需要接入成熟的复习系统。

优势是卡组、练习、测试、跨设备同步和学习结果的可见性；它把“今天理解”连接到“考前复习”。

项目机会：

- 复习闭环是本项目最明确的产品缺口。
- 不必复制 Quizlet 的大规模公共卡组，先做用户主动保存的“本次学习卡组”和轻量间隔复习即可。
- 对话应成为生成卡组和解释错题的入口，而不是卡片功能的替代品。

来源：[Ask Quizlet](https://quizlet.com/features/ask-quizlet)、[Quizlet AI study tools](https://quizlet.com/features/ai-study-tools)、[Quizlet Learn](https://quizlet.com/features/learn)、[Q-Chat historical launch page](https://quizlet.com/blog/meet-q-chat)。

### 4.7 Claude for Education

Anthropic 的教育页面把 learning mode 描述为“像好导师一样提问，让学生自己找到答案”，并强调高等教育、隐私和机构合作。

优势是高等教育信任、长对话和思维伙伴叙事；公开产品页没有把结构化原生视觉和复习系统作为主要卖点。

项目机会：

- “透明、可纠正、不过度推断”可以成为本项目的信任语言。
- 仍需要用真实的视觉和学习记录来证明差异，而不是只说“我们也会苏格拉底式提问”。

来源：[Claude for higher education](https://www.anthropic.com/education)。

## 5. 竞品矩阵

符号说明：强 = 公开产品定位中的核心能力；中 = 有能力或有相邻功能但不是核心；未突出 = 公开资料没有作为主要卖点，不能据此断言绝对不存在。

| 维度 | 本项目当前 | ChatGPT Study Mode | Gemini Guided Learning | Perplexity Learn | Khanmigo | NotebookLM | Quizlet |
|---|---:|---:|---:|---:|---:|---:|---:|
| 低摩擦学习入口 | 弱 | 强 | 强 | 中 | 中 | 中 | 强 |
| 自适应提问与支架 | 强 | 强 | 强 | 强 | 强 | 中 | 中 |
| 一轮只推进一个认知动作 | 强 | 中 | 中 | 中 | 强 | 未突出 | 中 |
| 语义级原生交互视觉 | 强 | 未突出 | 强 | 未突出 | 未突出 | 中 | 未突出 |
| 学习状态的证据与纠错 | 强但隐形 | 中 | 未突出 | 中 | 中/强 | 未突出 | 中 |
| 材料来源与引用 | 中 | 中 | 中/强 | 强 | 强但偏课程库 | 强 | 中 |
| 练习、主动回忆 | 中 | 中 | 中/强 | 中/强 | 中 | 强 | 强 |
| 跨会话复习与调度 | 弱 | 中 | 中 | 中 | 中 | 中 | 强 |
| 开放领域技术学习 | 强 | 强 | 强 | 强 | 中 | 中 | 中 |
| 课程、教师、机构治理 | 弱 | 中 | 强 | 中 | 强 | 中/强 | 强 |
| 普通任务与学习任务切换 | 强 | 强 | 中 | 强 | 中 | 中 | 中 |
| 可恢复、可分叉的会话学习 | 强 | 未突出 | 未突出 | 未突出 | 未突出 | 中 | 中 |

结论：本项目在“过程质量”和“结构化视觉”上有独特性，在“入口、材料、长期复习、生态分发”上落后。最危险的不是竞品有一个更好的图表，而是用户根本没有走进本项目的学习流程，或学完后没有理由回来。

## 6. SWOT

### Strengths：优势

1. **教学边界清晰。** 普通任务默认不被接管；学习模式不会因为用户正在学就替他运行代码、编辑文件或自动化。
2. **比通用提示词更可控。** 学习意图、教学路由、状态更新、失败动作和迁移完成条件都有明确规则。
3. **视觉能力有产品级潜力。** 原生渲染器直接表达关系、公式、过程、代码轨迹、因果环和材料结构，比 Markdown 图或生成式图片更适合教学交互。
4. **对错误掌握保持克制。** “提交一次”不是掌握，“部分正确”不会直接升级为 mastery；这有利于建立可信度。
5. **对话连续性好。** 状态可恢复、可回放、可分叉，适合复杂主题和长时间自学。
6. **适合技术型和跨学科自学。** 不受单一课程库限制，能处理概念、代码、系统、数学和当前主题。

### Weaknesses：劣势

1. **启动成本高。** preset、安装、重启、新 session 和显式选择对普通用户过重。
2. **结果不够“可带走”。** 当前有学习笔记，但没有用户主动保存的卡组、复习安排、学习档案或分享产物。
3. **材料入口弱。** 没有像 NotebookLM 那样先建立一个材料空间，也没有像 Quizlet 那样直接把学习结果变成训练内容。
4. **能力可见性不足。** evidence、transfer、failed move 对模型很重要，但用户只看到零散对话，容易把它误认为普通聊天。
5. **视觉多而难懂。** 15 类 renderer 是能力资产，也可能变成选择负担和质量不一致的来源。
6. **没有效果证据。** 当前 eval 主要是协议、路由、组件和无凭证 rubric；这能证明行为约束，不能证明真实用户长期学得更好。
7. **品牌语言偏工程。** “Harness”“preset”“protocol”适合开发者，不适合第一次想学东西的人。
8. **长期画像与隐私的取舍还未产品化。** session-local 保护了边界，但没有给用户一个明确的“我愿意为这个主题保存进度”的选择。

### Opportunities：机会

1. 做“可视化的主动学习”，而不是再做一个普通的 Study Mode。
2. 先服务技术型自学者和工作场景，这些用户对代码轨迹、因果图、公式、系统流程和本地桌面体验更有需求。
3. 把 session state 转译成“学习证据”和“下一步”，建立可信的可解释性。
4. 用材料学习与复习闭环承接 NotebookLM/Quizlet 的用户需求。
5. 用公开 demo 和可分享的学习片段制造自然传播，而不是先投入大规模教育销售。

### Threats：威胁

1. 大模型厂商把 Study/Learn Mode 变成默认能力，用户会认为“学习模式都差不多”。
2. Google、Khan Academy、Quizlet 掌握材料、课程、复习和机构分发，本项目很难在资源总量上竞争。
3. AI 教学最容易被质疑“只是说得像老师，不代表真的学会”。
4. 视觉错误、事实错误或学术诚信事故会直接损害信任。
5. 如果入口、安装和模型配置太复杂，用户会在第一次体验之前流失。

## 7. 优化建议与优先级

### P0：把已有优势变成用户能理解的体验

#### A. 学习启动卡

- 新建会话或模式选择页直接展示“学习模式：专注理解，不代做”。
- 提供四个用户语言入口：理解一个概念、从材料开始、解决卡点但想学会、做一次回忆练习。
- 首次进入展示一个 30 秒示例，明确：普通回答、学习回答、视觉和检查点分别什么时候出现。
- 学习中可以随时切回普通对话，但不要让用户重新安装或重新找 preset。

#### B. 学习成果卡

在一个学习片段结束时，给出一张轻量的“本次学到”卡：

- 目标：我在学什么。
- 证据：我刚才解释、预测或应用了什么。
- 尚未验证：哪一点只是听懂，尚未独立迁移。
- 下一步：继续深挖、换种讲法、做 5 分钟回忆、结束并保存。

默认不显示 0–100 分，不用“已掌握”替代证据。用户可以纠正卡片内容。

#### C. 把视觉用法说清楚

- 视觉标题采用用户语言，例如“拖动参数，看斜率如何改变”，不要只显示“交互可视化”。
- 视觉出现前给一个预测动作，出现后提供“把我的观察带入回答”按钮，显式把操作结果交给模型。
- 在视觉旁标注“为什么现在展示它”，一行即可。
- 保留无视觉降级，避免没有 rich client 时体验中断。

#### D. 学习笔记改名和改版

“会话学习笔记”可以在用户界面叫“学习进度”。默认只展示目标、当前阶段和下一步，详细证据放在展开区，避免像调试面板。

### P1：补齐长期价值

#### E. 材料到学习路线

用户拖入 PDF、Markdown、讲义、代码文件或 URL 后：

1. 系统先显示来源列表和可引用的章节/页码锚点。
2. 生成可折叠的 study map，用户选择“现在想理解的一个概念”。
3. 进入普通学习对话，用原文证据解释、提问和迁移。
4. 片段结束后可生成带来源锚点的复习卡或摘要。

#### F. 用户主动保存的复习卡组

- 只在用户点击“保存为复习”时生成，不静默把所有对话变成卡片。
- 优先使用 recall deck；卡片正面要求回忆或解释，背面提供来源、提示和简短答案。
- 支持明天、3 天后、7 天后等简单的间隔选项；暂不做复杂算法。
- 复习结果回到同一主题的学习片段，告诉模型“哪里忘了、哪里已能解释”。

#### G. 可纠正的学习证据

把内部 tentative state 转译成用户可读语言：“系统暂时判断你已经能解释 A，但 B 还需要一次新例子；你可以修改这个判断”。用户纠正后不需要重新学习整段。

### P2：建立传播和生态

- 生成可分享的“学习片段卡”：问题、一个原生视觉、用户自己的解释和下一步，不暴露隐私及完整会话。
- 提供面向开发者的学习模板，例如“读懂一个协议”“拆解一个算法”“看懂一段代码执行轨迹”。
- 主题工作区、团队/教师模式、课程标准、家长控制等，等 P0/P1 的自学闭环验证后再做。

## 8. 宣传与增长策略

### 8.1 核心传播句

主句：

> 不只是回答问题，帮你把知识讲出来、用起来。

辅助句：

- “需要时画图，不需要时不打断。”
- “每次只推进一步，但每一步都指向真正会用。”
- “你的学习证据留在会话里，不用每次从头解释。”
- “把代码、公式、因果和复杂材料变成可以操作的关系。”

### 8.2 60 秒演示脚本

用同一个问题展示对照：

1. 用户输入“为什么神经网络会过拟合？我总是分不清正则化和 dropout。”
2. 普通聊天：给一篇长解释。
3. 学习模式：先给最小概念，再生成“模型复杂度—训练误差—泛化误差”的关系图。
4. 用户预测改变 dropout 后会发生什么。
5. 用户回答部分正确，系统指出具体缺口，换一张对比图或给一个平行例子。
6. 用户把区别用自己的话说明，并应用到一个新情境。
7. 结束卡展示“已解释、未验证、下一次复习”。

这个 demo 比罗列 15 种视觉类型更能证明价值。

### 8.3 渠道

| 目标人群 | 首选渠道 | 内容形式 |
|---|---|---|
| 开发者、技术自学者 | GitHub README、Release Notes、Reddit/Hacker News、B 站、知乎 | 代码轨迹、系统流程、算法可视化前后对比 |
| 研究与工作学习者 | 技术博客、长文、社区分享 | 一份材料如何变成 study map、来源锚点和复习卡 |
| 普通自学者 | 短视频、产品截图、模板库 | “一个问题，三种表示方式”“换个解释就懂了” |
| 教育/机构观察者 | 公开设计原则、案例报告 | 学术诚信、可纠正证据、为什么不把点击当掌握 |

### 8.4 增长闭环

学习片段 → 用户保存/分享一个安全的视觉或总结 → 其他人点击“用这个问题开始学习” → 新 session 进入启动卡 → 片段结束后邀请保存复习。

每次分享都应默认脱敏，不共享完整会话、不共享用户的隐性状态、不宣称成绩提升。

### 8.5 不要这样宣传

- 不要说“保证学会”“准确判断你的掌握度”“比老师更好”。
- 不要把“学习风格”作为卖点；项目当前有意不做隐藏人格和风格分类。
- 不要承诺“完全离线”或“绝对隐私”，除非运行时、模型调用和数据链路都有明确证据。
- 不要只讲模型名称、协议版本或 renderer 数量。
- 不要把拒绝代做包装成产品价值；正确说法是“在被评估的任务中帮助你自己完成，而不是替你提交”。

## 9. 建议指标

先做两周基线，再设目标；以下是建议观察口径：

### 激活

- 学习模式启动率：看到入口后真正开始学习的比例。
- 首次学习请求完成率：从点击入口到收到第一轮有效教学的比例。
- 模式切回普通对话率：切换是否简单，还是说明学习模式没有价值。

### 学习质量

- 有效证据率：学习片段中，用户完成一次解释、预测、对比或新情境应用的比例。
- 独立迁移率：在没有新答案支架时，用户对新例子作出可接受解释/尝试的比例。
- 重复教学动作率：同一会话中出现重复提示、重复类比或重复问题的比例。
- 用户纠正率：用户纠正学习目标、先验或状态的比例；它不一定是坏事，可衡量可纠正性。

### 视觉与体验

- 视觉使用后的帮助度反馈。
- 视觉渲染失败和降级率。
- 视觉动作被显式带回对话的比例。
- 检查点提交、跳过、取消和中断率。

### 长期价值

- 学习成果卡打开率。
- “保存为复习”选择率。
- 次日/第 7 天复习完成率。
- 复习后再一次独立解释或迁移的比例。

### 信任与安全

- 用户报告的事实错误、视觉误导、来源不准确和不合适拒答。
- graded 场景下的答案泄露率。
- 用户对“系统判断为什么这样”的可理解度。

## 10. 最终判断

本项目不应成为“功能更多的 ChatGPT Study Mode”，也不适合在资源和课程数量上追赶 Google、Khan Academy 或 Quizlet。最有机会的产品位置是：

> 面向开放领域和技术型自学者的、可视化、可恢复、不过度打扰的理解型学习伴侣。

第一阶段的成功标准不是用户在学习模式里聊得更久，而是用户能用自己的话解释一次、把概念迁移到一个新例子，并且有理由在未来回来复习。只要 P0 让这条价值链变得可见，P1 再把它延伸到材料和间隔复习，本项目就能从“很有技术含量的 preset”变成“用户愿意反复打开的产品”。

## 11. 参考来源

### 竞品官方资料

1. [OpenAI — Introducing study mode](https://openai.com/index/chatgpt-study-mode/)
2. [OpenAI Help — Using Study Mode in ChatGPT](https://help.openai.com/en/articles/11780217-study-mode)
3. [Google — Guided Learning in Gemini](https://blog.google/products-and-platforms/products/education/guided-learning/)
4. [Google — Gemini Guided Learning how it works](https://blog.google/products-and-platforms/products/gemini/guided-learning/)
5. [Perplexity Help — What is Learn Mode?](https://www.perplexity.ai/help-center/en/articles/12120542-what-is-learn-mode)
6. [Khan Academy/Khanmigo official page](https://www.khanacademy.org/khan-labs/)
7. [Google — NotebookLM features to help students learn](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-student-features/)
8. [Google Help — NotebookLM source types](https://support.google.com/notebooklm/answer/16215270)
9. [Quizlet — Ask Quizlet](https://quizlet.com/features/ask-quizlet)
10. [Quizlet — AI study tools](https://quizlet.com/features/ai-study-tools)
11. [Quizlet — Learn](https://quizlet.com/features/learn)
12. [Anthropic — Claude for higher education](https://www.anthropic.com/education)

### 学习科学

13. [Roediger & Karpicke — The Power of Testing Memory](https://doi.org/10.1111/j.1745-6916.2006.00012.x)
14. [Dunlosky et al. — Improving Students’ Learning With Effective Learning Techniques](https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html)
15. [Cepeda et al. — Distributed practice in verbal recall tasks](https://pubmed.ncbi.nlm.nih.gov/16719566/)


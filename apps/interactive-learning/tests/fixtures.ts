import {
  VISUAL_PROTOCOL_V4,
  type LearningEdgeV4,
  type LearningVisualV4,
} from '../src/protocol.ts'

const fullyConnectedEdges: LearningEdgeV4[] = [
  ...['x1', 'x2', 'x3'].flatMap((from, inputIndex) => (
    ['h1', 'h2', 'h3', 'h4'].map((to, hiddenIndex) => ({
      id: `w_${String(inputIndex + 1)}_${String(hiddenIndex + 1)}`,
      from,
      to,
      label: `w${String(inputIndex + 1)}${String(hiddenIndex + 1)}`,
      detail: `输入 ${String(inputIndex + 1)} 到隐藏单元 ${String(hiddenIndex + 1)} 的可学习权重。`,
      tone: 'blue' as const,
      directed: true,
    }))
  )),
  ...['h1', 'h2', 'h3', 'h4'].flatMap((from, hiddenIndex) => (
    ['y1', 'y2'].map((to, outputIndex) => ({
      id: `v_${String(hiddenIndex + 1)}_${String(outputIndex + 1)}`,
      from,
      to,
      label: `v${String(hiddenIndex + 1)}${String(outputIndex + 1)}`,
      detail: `隐藏单元 ${String(hiddenIndex + 1)} 到输出 ${String(outputIndex + 1)} 的可学习权重。`,
      tone: 'purple' as const,
      directed: true,
    }))
  )),
]

/**
 * Exhaustive V4 browser/component catalog. Keep relation variants separate even
 * though they share the same top-level kind so every native renderer branch is
 * exercised by a completed ToolView call.
 */
export const visualV4Catalog = {
  derivativePlot: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '幂函数与导函数联动图',
    description: '拖动指数 n，同时观察 f(x)=xⁿ 与 f′(x)=n·xⁿ⁻¹ 的形状和 x=1 处斜率。',
    content: {
      kind: 'plot',
      parameters: [
        { id: 'n', label: '指数 n', min: 0.5, max: 3, step: 0.5, initial: 3 },
      ],
      xAxis: { label: 'x', min: 0.05, max: 2.5, samples: 96 },
      yAxis: { label: '函数值 / 斜率', min: 0, max: 20 },
      series: [
        {
          type: 'curve',
          id: 'function',
          label: 'f(x) = xⁿ',
          tone: 'blue',
          stroke: 'solid',
          expression: 'x^n',
        },
        {
          type: 'curve',
          id: 'derivative',
          label: 'f′(x) = n·xⁿ⁻¹',
          tone: 'orange',
          stroke: 'dashed',
          expression: 'n * x^(n - 1)',
        },
      ],
      metrics: [{
        id: 'slope_at_one',
        label: 'x = 1 处切线斜率',
        expression: 'n',
        digits: 1,
      }],
    },
    fallbackMarkdown: '幂函数求导法则：`(x^n)′ = n·x^(n-1)`。',
  },
  fullyConnectedNetwork: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '全连接神经网络：3 → 4 → 2',
    description: '每个输入连接到每个隐藏单元，每个隐藏单元再连接到每个输出；共 12 + 8 = 20 条权重边。',
    content: {
      kind: 'node_link',
      layout: 'layered',
      groups: [
        { id: 'inputs', label: '输入层（3）' },
        { id: 'hidden', label: '隐藏层（4）' },
        { id: 'outputs', label: '输出层（2）' },
      ],
      nodes: [
        { id: 'x1', label: 'x₁', detail: '第 1 个输入特征', group: 'inputs', tone: 'green' },
        { id: 'x2', label: 'x₂', detail: '第 2 个输入特征', group: 'inputs', tone: 'green' },
        { id: 'x3', label: 'x₃', detail: '第 3 个输入特征', group: 'inputs', tone: 'green' },
        { id: 'h1', label: 'h₁', detail: '隐藏单元：加权求和后通过激活函数', group: 'hidden', tone: 'blue' },
        { id: 'h2', label: 'h₂', detail: '隐藏单元：加权求和后通过激活函数', group: 'hidden', tone: 'blue' },
        { id: 'h3', label: 'h₃', detail: '隐藏单元：加权求和后通过激活函数', group: 'hidden', tone: 'blue' },
        { id: 'h4', label: 'h₄', detail: '隐藏单元：加权求和后通过激活函数', group: 'hidden', tone: 'blue' },
        { id: 'y1', label: 'y₁', detail: '第 1 个网络输出', group: 'outputs', tone: 'purple' },
        { id: 'y2', label: 'y₂', detail: '第 2 个网络输出', group: 'outputs', tone: 'purple' },
      ],
      edges: fullyConnectedEdges,
    },
    sequence: {
      initialFrameId: 'read_inputs',
      frames: [
        {
          id: 'read_inputs',
          label: '1. 读取输入',
          description: '三个输入特征组成这一层的信号。',
          focusIds: ['inputs', 'x1', 'x2', 'x3'],
        },
        {
          id: 'mix_hidden',
          label: '2. 隐藏层加权组合',
          description: '每个隐藏单元都接收三个输入，因此这一段有 3×4 条边。',
          focusIds: ['hidden', 'h1', 'h2', 'h3', 'h4', 'w_1_1', 'w_2_1', 'w_3_1'],
        },
        {
          id: 'emit_outputs',
          label: '3. 产生输出',
          description: '四个隐藏单元连接两个输出，因此再增加 4×2 条边。',
          focusIds: ['outputs', 'y1', 'y2', 'v_1_1', 'v_2_1', 'v_3_1', 'v_4_1'],
        },
      ],
    },
    fallbackMarkdown: '全连接层 3→4→2 含 `3×4 + 4×2 = 20` 条带权连接。',
  },
  vectorScene: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '向量加法的平行四边形',
    description: '向量 a 与 b 首尾相接，合向量 a+b 从原点指向最终端点。',
    content: {
      kind: 'scene_2d',
      xAxis: { label: 'x', min: -1, max: 6 },
      yAxis: { label: 'y', min: -1, max: 6 },
      grid: true,
      elements: [
        { type: 'polygon', id: 'parallelogram', label: '平行四边形', detail: '对角线表示两向量的和。', tone: 'gray', points: [{ x: 0, y: 0 }, { x: 3, y: 1 }, { x: 4, y: 4 }, { x: 1, y: 3 }] },
        { type: 'point', id: 'origin', label: 'O', detail: '共同起点', tone: 'gray', x: 0, y: 0, size: 7 },
        { type: 'arrow', id: 'vector_a', label: 'a = (3,1)', detail: '先沿 a 移动。', tone: 'blue', x1: 0, y1: 0, x2: 3, y2: 1 },
        { type: 'arrow', id: 'vector_b', label: 'b = (1,3)', detail: '再从 a 的终点沿 b 移动。', tone: 'orange', stroke: 'dashed', x1: 3, y1: 1, x2: 4, y2: 4 },
        { type: 'arrow', id: 'vector_sum', label: 'a + b = (4,4)', detail: '合向量直接连接共同起点和最终端点。', tone: 'purple', x1: 0, y1: 0, x2: 4, y2: 4 },
        { type: 'label', id: 'sum_label', text: 'a + b', detail: '平行四边形的对角线', tone: 'purple', x: 2.15, y: 2.35 },
      ],
    },
    sequence: {
      frames: [
        { id: 'first_vector', label: '1. 画出 a', focusIds: ['origin', 'vector_a'] },
        { id: 'second_vector', label: '2. 首尾连接 b', focusIds: ['vector_b'] },
        { id: 'result_vector', label: '3. 读取合向量', focusIds: ['parallelogram', 'vector_sum', 'sum_label'] },
      ],
    },
    fallbackMarkdown: '向量加法：`(3,1) + (1,3) = (4,4)`。',
  },
  comparisonRelation: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '数组与链表对比',
    description: '按同一维度横向比较两种数据结构。',
    content: {
      kind: 'relation',
      variant: 'comparison',
      subjects: [
        { id: 'array', label: '数组', detail: '连续内存中的索引序列。', tone: 'blue' },
        { id: 'linked_list', label: '链表', detail: '由指针连接的离散节点。', tone: 'orange' },
      ],
      rows: [
        { id: 'lookup', label: '按位置访问', detail: '访问第 k 项时的典型代价。', cells: [{ subjectId: 'array', value: 'O(1)', tone: 'green' }, { subjectId: 'linked_list', value: 'O(n)', tone: 'orange' }] },
        { id: 'insert', label: '已知位置后插入', detail: '不计寻找位置的成本。', cells: [{ subjectId: 'array', value: '需移动后续元素' }, { subjectId: 'linked_list', value: '改写相邻指针' }] },
      ],
    },
    fallbackMarkdown: '数组支持按索引直接访问；链表通常需要逐节点遍历。',
  },
  matrixRelation: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '偏导数依赖矩阵',
    description: '从输出行与输入列的交点读取局部依赖。',
    content: {
      kind: 'relation',
      variant: 'matrix',
      rows: [{ id: 'output_u', label: 'u' }, { id: 'output_v', label: 'v' }],
      columns: [{ id: 'input_x', label: 'x' }, { id: 'input_y', label: 'y' }],
      cells: [
        { id: 'du_dx', rowId: 'output_u', columnId: 'input_x', label: '∂u/∂x', detail: 'x 对 u 的局部影响。', tone: 'blue' },
        { id: 'du_dy', rowId: 'output_u', columnId: 'input_y', label: '∂u/∂y', detail: 'y 对 u 的局部影响。', tone: 'purple' },
        { id: 'dv_dx', rowId: 'output_v', columnId: 'input_x', label: '∂v/∂x', detail: 'x 对 v 的局部影响。', tone: 'green' },
        { id: 'dv_dy', rowId: 'output_v', columnId: 'input_y', label: '∂v/∂y', detail: 'y 对 v 的局部影响。', tone: 'orange' },
      ],
    },
    fallbackMarkdown: '雅可比矩阵的每个单元格表示一个输出对一个输入的偏导数。',
  },
  setsRelation: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '倍数集合与交集',
    description: '一个数可以只属于某个集合，也可以同时属于两个集合。',
    content: {
      kind: 'relation',
      variant: 'sets',
      sets: [
        { id: 'even', label: '2 的倍数', detail: '能被 2 整除。', tone: 'blue' },
        { id: 'triple', label: '3 的倍数', detail: '能被 3 整除。', tone: 'orange' },
      ],
      items: [
        { id: 'number_2', label: '2', setIds: ['even'], detail: '只在当前样例的 2 倍数区。' },
        { id: 'number_3', label: '3', setIds: ['triple'], detail: '只在当前样例的 3 倍数区。' },
        { id: 'number_6', label: '6', setIds: ['even', 'triple'], detail: '6 同时能被 2 和 3 整除。' },
        { id: 'number_12', label: '12', setIds: ['even', 'triple'], detail: '12 也位于两个集合的交集。' },
      ],
    },
    fallbackMarkdown: '6 和 12 同时是 2 与 3 的倍数，位于两个集合的交集。',
  },
  neuralNetworkTimeline: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '神经网络关键发展时间线',
    description: '选择事件查看它解决了什么问题，色带标出两个发展阶段。',
    content: {
      kind: 'timeline',
      orientation: 'horizontal',
      events: [
        { id: 'perceptron', time: '1958', label: '感知机', detail: '用可学习权重完成线性分类。', position: 0, tone: 'blue' },
        { id: 'backprop', time: '1986', label: '反向传播普及', detail: '高效计算多层网络中每个权重的梯度。', position: 0.38, tone: 'purple' },
        { id: 'imagenet', time: '2012', label: '深度视觉突破', detail: '大规模数据与 GPU 训练让深层卷积网络显著领先。', position: 0.72, tone: 'green' },
        { id: 'transformer', time: '2017', label: 'Transformer', detail: '自注意力成为序列建模和大模型的核心结构。', position: 1, tone: 'orange' },
      ],
      eras: [
        { id: 'connectionism', label: '连接主义基础', startEventId: 'perceptron', endEventId: 'backprop', detail: '从单层分类器走向可训练的多层网络。', tone: 'blue' },
        { id: 'deep_learning', label: '深度学习扩展', startEventId: 'imagenet', endEventId: 'transformer', detail: '规模化训练与通用架构推动能力跃迁。', tone: 'purple' },
      ],
    },
    fallbackMarkdown: '1958 感知机 → 1986 反向传播 → 2012 深度视觉突破 → 2017 Transformer。',
  },
  powerRuleDerivation: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '从极限定义推到平方函数求导',
    description: '逐步展开并约去 h，观察极限如何变成 2x。',
    content: {
      kind: 'formula_steps',
      notation: 'f(x) = x²，求 f′(x)',
      steps: [
        { id: 'limit_definition', label: '代入定义', expression: 'f^{\\prime}(x) = \\lim_{h \\to 0} \\frac{(x+h)^2 - x^2}{h}', detail: '导数定义比较 x 与 x+h 处函数值的差。', tone: 'blue' },
        { id: 'expand_square', label: '展开平方', expression: 'f^{\\prime}(x) = \\lim_{h \\to 0} \\frac{x^2 + 2xh + h^2 - x^2}{h}', rule: '完全平方公式', detail: '(x+h)² = x²+2xh+h²。', tone: 'purple' },
        { id: 'cancel_h', label: '约去公因子', expression: 'f^{\\prime}(x) = \\lim_{h \\to 0} (2x + h)', rule: '先化简，再取极限', detail: 'h 尚未取 0，因此可先约去分子分母的 h。', tone: 'orange' },
        { id: 'take_limit', label: '取极限', expression: 'f^{\\prime}(x) = 2x', rule: 'h \\to 0', detail: 'h 项趋于 0，只留下 2x。', tone: 'green' },
      ],
      conclusion: '平方函数在 x 处的切线斜率是 2x。',
    },
    fallbackMarkdown: '`f′(x)=lim[h→0]((x+h)²-x²)/h=lim[h→0](2x+h)=2x`。',
  },
  calculusStudyMap: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '微积分章节学习地图',
    description: '按教材章节查看概念，并沿先修关系决定下一步学习内容。',
    content: {
      kind: 'study_map',
      sourceLabel: '微积分入门讲义',
      goal: '从函数变化率走到导数应用。',
      sections: [
        { id: 'limits_section', label: '极限', anchor: '第 1 章', summary: '用逼近描述瞬时行为。' },
        { id: 'derivatives_section', label: '导数', anchor: '第 2 章', summary: '把差商的极限解释为切线斜率。' },
        { id: 'applications_section', label: '导数应用', anchor: '第 3 章', summary: '用导数研究单调性、极值与优化。' },
      ],
      concepts: [
        { id: 'function_change', label: '函数与变化量', sectionId: 'limits_section', detail: '理解 Δx 与 Δy。', role: 'foundation', tone: 'gray' },
        { id: 'limit_concept', label: '极限', sectionId: 'limits_section', detail: '描述输入逼近时输出的趋势。', prerequisiteIds: ['function_change'], role: 'core', tone: 'blue' },
        { id: 'difference_quotient', label: '差商', sectionId: 'derivatives_section', detail: '平均变化率 Δy/Δx。', prerequisiteIds: ['function_change'], role: 'foundation', tone: 'purple' },
        { id: 'derivative_definition', label: '导数定义', sectionId: 'derivatives_section', detail: '差商在 Δx→0 时的极限。', prerequisiteIds: ['limit_concept', 'difference_quotient'], role: 'core', tone: 'orange' },
        { id: 'optimization', label: '极值与优化', sectionId: 'applications_section', detail: '利用导数为 0 的候选点寻找最优值。', prerequisiteIds: ['derivative_definition'], role: 'practice', tone: 'green' },
      ],
    },
    fallbackMarkdown: '学习顺序：函数变化量 → 极限与差商 → 导数定义 → 极值与优化。',
  },
  derivativeRecallDeck: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '常见求导规则回忆卡',
    description: '先尝试回忆，再翻面核对；可标记掌握程度。',
    content: {
      kind: 'recall_deck',
      instructions: '先口头回答卡片正面，再显示答案并标记“需复习”或“已掌握”。',
      cards: [
        { id: 'power_rule', prompt: '幂函数 xⁿ 的导数是什么？', answer: 'n·xⁿ⁻¹', hint: '指数移到前面，再减 1。', tags: ['幂函数', '基础'] },
        { id: 'product_rule', prompt: '乘积 u·v 的导数是什么？', answer: 'u′v + uv′', hint: '两项分别轮流求导。', tags: ['乘积法则'] },
        { id: 'chain_rule', prompt: '复合函数 f(g(x)) 的导数是什么？', answer: 'f′(g(x))·g′(x)', hint: '外层导数乘以内层导数。', tags: ['链式法则'] },
        { id: 'constant_rule', prompt: '常数 C 的导数是什么？', answer: '0', tags: ['基础'] },
      ],
    },
    fallbackMarkdown: '幂函数、乘积、链式与常数求导规则回忆清单。',
  },
  datasetTable: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '学习时长与测验成绩',
    description: '筛选或排序记录，选择一行后在散点图中定位同一名学习者。',
    content: {
      kind: 'data_table',
      columns: [
        { id: 'learner', label: '学习者', type: 'string' },
        { id: 'hours', label: '学习时长', type: 'number', unit: 'h' },
        { id: 'score', label: '测验成绩', type: 'number', unit: '分' },
        { id: 'cohort', label: '小组', type: 'string' },
      ],
      rows: [
        { id: 'record_a', cells: [{ columnId: 'learner', value: 'A' }, { columnId: 'hours', value: 1 }, { columnId: 'score', value: 52 }, { columnId: 'cohort', value: '基础班' }] },
        { id: 'record_b', cells: [{ columnId: 'learner', value: 'B' }, { columnId: 'hours', value: 2 }, { columnId: 'score', value: 61 }, { columnId: 'cohort', value: '基础班' }] },
        { id: 'record_c', cells: [{ columnId: 'learner', value: 'C' }, { columnId: 'hours', value: 4 }, { columnId: 'score', value: 78 }, { columnId: 'cohort', value: '进阶班' }] },
        { id: 'record_d', detail: '成绩明显低于相近学习时长的其他记录。', cells: [{ columnId: 'learner', value: 'D' }, { columnId: 'hours', value: 5 }, { columnId: 'score', value: 48 }, { columnId: 'cohort', value: '进阶班' }] },
        { id: 'record_e', cells: [{ columnId: 'learner', value: 'E' }, { columnId: 'hours', value: 6 }, { columnId: 'score', value: 91 }, { columnId: 'cohort', value: '进阶班' }] },
      ],
      outlierIds: ['record_d'],
      initialSort: { columnId: 'hours', direction: 'asc' },
      chart: { type: 'scatter', xColumnId: 'hours', yColumnId: 'score', seriesColumnId: 'cohort' },
    },
    fallbackMarkdown: '总体上学习时长越长成绩越高，但记录 D 是需要检查的异常值。',
  },
  orderStateTransition: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '订单审批状态转换',
    description: '逐步执行事件，观察当前状态以及触发条件和动作。',
    content: {
      kind: 'state_transition',
      states: [
        { id: 'draft', label: '草稿', detail: '订单尚可编辑。', initial: true, tone: 'gray' },
        { id: 'reviewing', label: '审核中', detail: '等待审批人处理。', tone: 'blue' },
        { id: 'approved', label: '已批准', detail: '允许进入履约。', final: true, tone: 'green' },
        { id: 'rejected', label: '已拒绝', detail: '退回申请人修改。', final: true, tone: 'red' },
      ],
      transitions: [
        { id: 'submit', from: 'draft', to: 'reviewing', trigger: '提交', guard: '字段完整', action: '锁定价格', tone: 'blue' },
        { id: 'approve', from: 'reviewing', to: 'approved', trigger: '批准', action: '创建履约任务', tone: 'green' },
        { id: 'reject', from: 'reviewing', to: 'rejected', trigger: '拒绝', action: '通知申请人', tone: 'red' },
      ],
      steps: [
        { id: 'state_draft', label: '1. 创建订单', currentStateId: 'draft' },
        { id: 'state_review', label: '2. 提交审核', currentStateId: 'reviewing', transitionId: 'submit', description: '字段完整时才能提交。' },
        { id: 'state_approved', label: '3. 审批通过', currentStateId: 'approved', transitionId: 'approve' },
      ],
    },
    fallbackMarkdown: '草稿 --提交[字段完整]/锁定价格→ 审核中 --批准/创建履约任务→ 已批准。',
  },
  slidingWindowBuffer: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '滑动窗口寻找最大和',
    description: '切换步骤，观察左右指针、窗口区间和槽位值。',
    content: {
      kind: 'sequence_buffer',
      slots: [3, -1, 4, 2, 5, -2].map((value, index) => ({ id: `slot_${String(index)}`, index, value })),
      pointers: [
        { id: 'left_pointer', label: 'L', index: 0, tone: 'blue' },
        { id: 'right_pointer', label: 'R', index: 2, tone: 'orange' },
      ],
      ranges: [{ id: 'window', label: '当前窗口', start: 0, end: 2, tone: 'purple' }],
      steps: [
        { id: 'window_first', label: '1. 窗口 [0,2]', description: '和为 6。' },
        { id: 'window_second', label: '2. 右移一格', description: '减去 3，加上 2，和为 5。', pointers: [{ pointerId: 'left_pointer', index: 1 }, { pointerId: 'right_pointer', index: 3 }], ranges: [{ rangeId: 'window', start: 1, end: 3 }] },
        { id: 'window_third', label: '3. 再右移一格', description: '窗口 [2,4] 的和为 11，是当前最大值。', pointers: [{ pointerId: 'left_pointer', index: 2 }, { pointerId: 'right_pointer', index: 4 }], ranges: [{ rangeId: 'window', start: 2, end: 4 }] },
      ],
    },
    fallbackMarkdown: '`[3,-1,4] → [-1,4,2] → [4,2,5]`，最大窗口和为 11。',
  },
  apiSequenceDiagram: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '客户端读取订单的消息序列',
    description: '从上到下阅读每条消息，区分同步调用、返回与异步通知。',
    content: {
      kind: 'sequence_diagram',
      participants: [
        { id: 'client', label: '客户端', tone: 'blue' },
        { id: 'api', label: '订单 API', tone: 'purple' },
        { id: 'database', label: '数据库', tone: 'green' },
        { id: 'queue', label: '消息队列', tone: 'orange' },
      ],
      messages: [
        { id: 'request', from: 'client', to: 'api', label: 'GET /orders/42', type: 'sync' },
        { id: 'query', from: 'api', to: 'database', label: '查询订单 42', type: 'sync' },
        { id: 'row', from: 'database', to: 'api', label: '订单记录', type: 'return' },
        { id: 'response', from: 'api', to: 'client', label: '200 + JSON', type: 'return' },
        { id: 'audit', from: 'api', to: 'queue', label: '发布读取审计事件', type: 'async', detail: '响应不等待消费者处理。' },
      ],
    },
    fallbackMarkdown: '客户端 → API → 数据库 → API → 客户端；API 随后异步发布审计事件。',
  },
  loopCodeTrace: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '循环累加执行轨迹',
    description: '逐步查看当前代码行、变量变化、调用栈和最终输出。',
    content: {
      kind: 'code_trace',
      language: 'typescript',
      code: 'function sum(values: number[]) {\n  let total = 0\n  for (const value of values) {\n    total += value\n  }\n  return total\n}\nconsole.log(sum([2, 4, 1]))',
      lines: [
        { number: 1, text: 'function sum(values: number[]) {' },
        { number: 2, text: '  let total = 0' },
        { number: 3, text: '  for (const value of values) {' },
        { number: 4, text: '    total += value' },
        { number: 5, text: '  }' },
        { number: 6, text: '  return total' },
        { number: 7, text: '}' },
        { number: 8, text: 'console.log(sum([2, 4, 1]))' },
      ],
      steps: [
        { id: 'trace_init', label: '1. 初始化', currentLine: 2, variables: [{ name: 'total', value: 0 }], stack: [{ id: 'frame_sum', function: 'sum', line: 2 }] },
        { id: 'trace_first', label: '2. 第一次迭代', currentLine: 4, variables: [{ name: 'value', value: 2 }, { name: 'total', value: 2 }], stack: [{ id: 'frame_sum', function: 'sum', line: 4 }] },
        { id: 'trace_second', label: '3. 第二次迭代', currentLine: 4, variables: [{ name: 'value', value: 4 }, { name: 'total', value: 6 }], stack: [{ id: 'frame_sum', function: 'sum', line: 4 }] },
        { id: 'trace_third', label: '4. 第三次迭代', currentLine: 4, variables: [{ name: 'value', value: 1 }, { name: 'total', value: 7 }], stack: [{ id: 'frame_sum', function: 'sum', line: 4 }] },
        { id: 'trace_output', label: '5. 输出', currentLine: 8, variables: [{ name: 'total', value: 7 }], stack: [], output: '7' },
      ],
    },
    fallbackMarkdown: '`total` 依次为 0、2、6、7，最终输出 7。',
  },
  gradientField: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '碗形损失面的梯度场',
    description: '颜色表示损失大小，箭头表示梯度方向。',
    content: {
      kind: 'field_2d',
      xAxis: { label: '参数 x', min: -2, max: 2, samples: 5 },
      yAxis: { label: '参数 y', min: -2, max: 2, samples: 5 },
      scalar: {
        samples: {
          columns: 5,
          rows: 5,
          values: [8, 5, 4, 5, 8, 5, 2, 1, 2, 5, 4, 1, 0, 1, 4, 5, 2, 1, 2, 5, 8, 5, 4, 5, 8],
        },
        min: 0,
        max: 8,
      },
      vector: {
        samples: {
          columns: 5,
          rows: 5,
          u: [-4, -2, 0, 2, 4, -4, -2, 0, 2, 4, -4, -2, 0, 2, 4, -4, -2, 0, 2, 4, -4, -2, 0, 2, 4],
          v: [-4, -4, -4, -4, -4, -2, -2, -2, -2, -2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4],
        },
      },
    },
    fallbackMarkdown: '损失 `x²+y²` 在原点最小，梯度从原点向外增大。',
  },
  adoptionCausalLoop: {
    protocol: VISUAL_PROTOCOL_V4,
    title: '产品采用与服务容量反馈环',
    description: '比较增强增长环与容量约束形成的调节环。',
    content: {
      kind: 'causal_loop',
      variables: [
        { id: 'users', label: '活跃用户', tone: 'blue' },
        { id: 'value', label: '网络价值', tone: 'green' },
        { id: 'load', label: '服务负载', tone: 'orange' },
        { id: 'quality', label: '服务质量', tone: 'purple' },
      ],
      links: [
        { id: 'users_value', from: 'users', to: 'value', polarity: 'positive', label: '更多参与者' },
        { id: 'value_users', from: 'value', to: 'users', polarity: 'positive', label: '吸引采用', delay: 1 },
        { id: 'users_load', from: 'users', to: 'load', polarity: 'positive' },
        { id: 'load_quality', from: 'load', to: 'quality', polarity: 'negative', label: '拥塞降低质量' },
        { id: 'quality_users', from: 'quality', to: 'users', polarity: 'positive', label: '质量影响留存' },
      ],
      loops: [
        { id: 'growth_loop', label: '采用增长', type: 'reinforcing', linkIds: ['users_value', 'value_users'], tone: 'green' },
        { id: 'capacity_loop', label: '容量约束', type: 'balancing', linkIds: ['users_load', 'load_quality', 'quality_users'], tone: 'orange' },
      ],
    },
    fallbackMarkdown: '用户与网络价值形成增强环；用户增加也提高负载、降低质量，从而形成调节环。',
  },
} satisfies Record<string, LearningVisualV4>

/**
 * Every model-independent string the visual@4 renderers show.
 *
 * The Host supplies these through the plugin locale; the defaults here keep the
 * renderers usable in isolation (tests, the browser fixture) without forking the
 * wording.
 */
import { createContext, useContext } from 'react'

export interface LearningVisualV4Labels {
  eyebrow: string
  errorTitle: string
  errorContinue: string
  sequenceLabel: string
  previousStep: string
  nextStep: string
  reset: string
  chartProbeHint: string
  metricsLabel: string
  legendLabel: string
  plotInteractionHint: string
  noValuesInRange: string
  seriesOutOfRange: string
  nodeLinkSummary: string
  connection: string
  layerLabel: string
  edgeLabel: string
  nodeLinkInteractionHint: string
  nodeKind: string
  edgeKind: string
  noDetail: string
  closeDetail: string
  elementFallback: string
  sceneSummary: string
  sceneInteractionHint: string
  elementKind: string
  comparisonCaption: string
  comparisonDimension: string
  comparisonSubject: string
  comparisonInteractionHint: string
  matrixCaption: string
  matrixAxes: string
  noRelation: string
  matrixInteractionHint: string
  setsLabel: string
  noExclusiveItems: string
  intersections: string
  uncategorized: string
  setsInteractionHint: string
  timelineLabel: string
  timelineEventKind: string
  timelineEraKind: string
  timelineInteractionHint: string
  formulaLabel: string
  formulaProgress: string
  formulaRule: string
  formulaConclusion: string
  revealNextFormulaStep: string
  formulaComplete: string
  formulaInteractionHint: string
  studySource: string
  studyGoal: string
  studySections: string
  studyConcepts: string
  studyAnchor: string
  studySummary: string
  studyProgress: string
  studyDue: string
  studyStale: string
  prerequisite: string
  noPrerequisite: string
  roleFoundation: string
  roleCore: string
  roleExtension: string
  rolePractice: string
  studyInteractionHint: string
  recallDeckLabel: string
  recallProgress: string
  recallPrompt: string
  recallHint: string
  recallAnswer: string
  showHint: string
  showAnswer: string
  previousCard: string
  nextCard: string
  resetDeck: string
  mastered: string
  reviewAgain: string
  unrated: string
  recallStatus: string
  recallInteractionHint: string
  stepOfTotal: string
  emptyVisual: string
  graphLegendLabel: string
  stateCurrent: string
  stateRelated: string
  stateContext: string
  stateVisited: string
  sentenceSeparator: string
  listSeparator: string
  plotProbeNearest: string
  codeTraceSource: string
  codeTraceVariables: string
  codeTraceNoVariables: string
  codeTraceStack: string
  codeTraceEmptyStack: string
  codeTraceOutput: string
  dataTableCaption: string
  dataTableFilterLabel: string
  dataTableFilterPlaceholder: string
  dataTableClearFilter: string
  dataTableSort: string
  dataTableOutlier: string
  dataTableOutlierDetail: string
  dataTableOutlierKind: string
  dataTableRowKind: string
  dataTableNoMatches: string
  dataTableInteractionHint: string
  fieldLabel: string
  fieldProbeHint: string
  fieldValue: string
  fieldVector: string
  fieldMaxMagnitude: string
  sequenceBufferLabel: string
  sequenceBufferRangeKind: string
  sequenceBufferSlotKind: string
  sequenceBufferPointerKind: string
  sequenceBufferInteractionHint: string
  sequenceDiagramSummary: string
  participantKind: string
  messageKind: string
  sequenceDiagramInteractionHint: string
  stateTransitionSummary: string
  stateKind: string
  stateInitialKind: string
  stateTerminalKind: string
  transitionKind: string
  stateTransitionStepsLabel: string
  stateTransitionInteractionHint: string
  causalLoopSummary: string
  causalVariableKind: string
  causalLinkKind: string
  causalReinforcingKind: string
  causalBalancingKind: string
  causalLoopInteractionHint: string
}

export const DEFAULT_LABELS: LearningVisualV4Labels = {
  eyebrow: '交互可视化',
  errorTitle: '视觉组件暂时无法显示',
  errorContinue: '你仍可继续阅读上下文。',
  sequenceLabel: '视觉讲解步骤',
  previousStep: '上一步',
  nextStep: '下一步',
  reset: '重置',
  chartProbeHint: '图表，按左右方向键开始探查数值',
  metricsLabel: '当前指标',
  legendLabel: '图例与系列显示',
  plotInteractionHint: '鼠标移入图表可探查数值；键盘聚焦图表后可用 ← → 移动。',
  noValuesInRange: '当前坐标范围内没有可显示的数值。',
  seriesOutOfRange: '不在范围内',
  nodeLinkSummary: '{nodes} 个节点，{edges} 条连线。',
  connection: '{from} 到 {to}',
  layerLabel: '第 {index} 层',
  edgeLabel: '连线',
  nodeLinkInteractionHint: '选择节点或连线查看解释；键盘按 Tab 进入图形，再用 ← → 移动、Enter 选择。',
  nodeKind: '节点',
  edgeKind: '连线',
  noDetail: '暂无补充说明。',
  closeDetail: '关闭详细说明',
  elementFallback: '图元 {id}',
  sceneSummary: '二维场景，{elements} 个图元。{labels}',
  sceneInteractionHint: '选择图中的点、线或形状查看说明；键盘按 Tab 进入图形，再用 ← → 移动、Enter 选择。',
  elementKind: '图元',
  comparisonCaption: '特征对比表',
  comparisonDimension: '对比维度',
  comparisonSubject: '对比对象',
  comparisonInteractionHint: '按行阅读可对比同一维度；选择表头可查看补充说明。',
  matrixCaption: '关系矩阵',
  matrixAxes: '行 ↓ / 列 →',
  noRelation: '无关系',
  matrixInteractionHint: '从行与列的交点读取关系；选择单元格可查看细节。',
  setsLabel: '集合关系图',
  noExclusiveItems: '无独有项',
  intersections: '交集 / 共有',
  uncategorized: '未归类',
  setsInteractionHint: '单一归属项在各集合内，多重归属项在交集区。',
  timelineLabel: '时间线',
  timelineEventKind: '事件',
  timelineEraKind: '时期',
  timelineInteractionHint: '选择事件或时期可查看补充说明。',
  formulaLabel: '公式推导',
  formulaProgress: '第 {current} / {total} 步',
  formulaRule: '规则',
  formulaConclusion: '结论',
  revealNextFormulaStep: '显示下一步',
  formulaComplete: '推导已完成',
  formulaInteractionHint: '先预测下一步，再逐步揭示变形规则。',
  studySource: '学习来源',
  studyGoal: '学习目标',
  studySections: '来源章节',
  studyConcepts: '本节概念',
  studyAnchor: '位置',
  studySummary: '摘要',
  studyProgress: '学习中',
  studyDue: '到期复习',
  studyStale: '引用待更新',
  prerequisite: '前置概念',
  noPrerequisite: '无',
  roleFoundation: '基础',
  roleCore: '核心',
  roleExtension: '拓展',
  rolePractice: '练习',
  studyInteractionHint: '按来源章节导览，选择概念查看作用、前置关系与详细说明。',
  recallDeckLabel: '回忆卡组',
  recallProgress: '第 {current} / {total} 张',
  recallPrompt: '问题',
  recallHint: '提示',
  recallAnswer: '答案',
  showHint: '查看提示',
  showAnswer: '显示答案',
  previousCard: '上一张',
  nextCard: '下一张',
  resetDeck: '重置卡组',
  mastered: '已掌握',
  reviewAgain: '待复习',
  unrated: '未标记',
  recallStatus: '掌握 {mastered} · 待复习 {review}',
  recallInteractionHint: '先在心中回答，再查看提示和答案，最后标记掌握状态。',
  stepOfTotal: '第 {current} / {total} 步',
  emptyVisual: '这张图目前没有可显示的内容。',
  graphLegendLabel: '图形状态说明',
  stateCurrent: '当前重点',
  stateRelated: '相关路径',
  stateContext: '其余结构',
  stateVisited: '已讲过',
  sentenceSeparator: '。',
  listSeparator: '，',
  plotProbeNearest: '最近点 x {x}',
  codeTraceSource: '{language} 代码',
  codeTraceVariables: '变量',
  codeTraceNoVariables: '暂无局部变量',
  codeTraceStack: '调用栈',
  codeTraceEmptyStack: '调用栈为空',
  codeTraceOutput: '输出',
  dataTableCaption: '数据表',
  dataTableFilterLabel: '筛选数据',
  dataTableFilterPlaceholder: '筛选数据…',
  dataTableClearFilter: '清除预设筛选',
  dataTableSort: '{column}，排序',
  dataTableOutlier: '异常值',
  dataTableOutlierDetail: '该记录被标记为异常值。',
  dataTableOutlierKind: '异常记录',
  dataTableRowKind: '记录',
  dataTableNoMatches: '没有匹配的记录。',
  dataTableInteractionHint: '选择一行可在表格与图表中联动查看。',
  fieldLabel: '二维场',
  fieldProbeHint: '在场中移动指针或使用方向键读取坐标。',
  fieldValue: '值 {value}',
  fieldVector: '向量 ({u}, {v})',
  fieldMaxMagnitude: '最大向量模：{value}',
  sequenceBufferLabel: '序列缓冲区',
  sequenceBufferRangeKind: '区间',
  sequenceBufferSlotKind: '槽位',
  sequenceBufferPointerKind: '指针',
  sequenceBufferInteractionHint: '选择槽位、指针或区间查看当前步骤中的值。',
  sequenceDiagramSummary: '时序图，{participants} 个参与者，{messages} 条消息。',
  participantKind: '参与者',
  messageKind: '消息',
  sequenceDiagramInteractionHint: '选择参与者或消息查看这次交互。',
  stateTransitionSummary: '状态转移图，{states} 个状态，{transitions} 条转移。',
  stateKind: '状态',
  stateInitialKind: '初始状态',
  stateTerminalKind: '终止状态',
  transitionKind: '转移',
  stateTransitionStepsLabel: '状态转移步骤',
  stateTransitionInteractionHint: '选择状态或转移查看它的触发规则。',
  causalLoopSummary: '因果回路图，{variables} 个变量，{links} 条带符号链接，{loops} 个命名回路。',
  causalVariableKind: '变量',
  causalLinkKind: '因果链接',
  causalReinforcingKind: '增强回路',
  causalBalancingKind: '平衡回路',
  causalLoopInteractionHint: '选择变量、带符号链接或回路查看这段反馈关系。',
}

const VisualLabelsContext = createContext<LearningVisualV4Labels>(DEFAULT_LABELS)

export const VisualLabelsProvider = VisualLabelsContext.Provider

export function useVisualLabels(): LearningVisualV4Labels {
  return useContext(VisualLabelsContext)
}

/** Fill `{name}` placeholders, leaving unknown ones untouched. */
export function labelTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{([a-z]+)\}/gi, (match, key: string) => (
    values[key] === undefined ? match : String(values[key])
  ))
}

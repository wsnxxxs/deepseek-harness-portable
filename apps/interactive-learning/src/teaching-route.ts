/**
 * Small, deterministic routing hints for the Learning preset.
 *
 * The model still owns the final wording and teaching judgment. This helper
 * exists so the high-priority ambiguity rule is testable and reusable by
 * canaries without copying prompt prose into another subsystem.
 */

import {
  classifyLearnIntent,
  isLearningBoundary,
  type LearnIntentConfidence,
  type LearnIntentDecision,
} from './learn-intent.ts'

export type LearningRoute =
  | 'calibrate'
  | 'teach-minimum'
  | 'overview'
  | 'direct'
  | 'continue'

export interface LearningRouteDecision {
  route: LearningRoute
  reason:
    | 'short-learning-request'
    | 'explicit-learning'
    | 'explicit-beginner'
    | 'initial-urgent-blocker'
    | 'explicit-overview'
    | 'current-or-contested'
    | 'specific-goal'
    | 'definition'
    | 'bare-concept'
    | 'confusion-repair'
    | 'learning-path'
    | 'resource-creation'
    | 'active-segment'
    | 'direct'
  intent: LearnIntentDecision
  /** Mirrors intent confidence for route-context consumers. */
  confidence: LearnIntentConfidence
}

/** Session-local route memory. This is not learner state and is never a profile. */
export interface LearningRouteSession {
  active: boolean
  decision?: LearningRouteDecision
}

export interface LearningTurnRouteDecision extends LearningRouteDecision {
  /** True when this user message stays inside the prior active segment. */
  inherited: boolean
  /** Whether the resulting route keeps a learning segment open. */
  segment: 'active' | 'closed'
}

function routeDecision(
  route: LearningRoute,
  reason: LearningRouteDecision['reason'],
  intent: LearnIntentDecision,
): LearningRouteDecision {
  return { route, reason, intent, confidence: intent.confidence }
}

const SHORT_LEARNING_REQUEST = /^(?:please\s+)?(?:teach\s+me|help\s+me\s+learn|learn|understand|get\s+to\s+know|walk\s+me\s+through|take\s+me\s+through)\b|^(?:学习|教我|了解|想学)\s*/i
const EXPLICIT_BEGINNER = /(?:\b(?:from\s+scratch|from\s+zero|beginner|beginners|intro(?:duction)?|concept(?:ual)?\s+intro|eli5)\b|explain(?:\s+it|\s+this)?\s+like\s+(?:i(?:'| a)?m|to\s+a)\s+(?:five|5)(?:[- ]year[- ]old)?|零基础|从零|入门|概念入门|像给五岁孩子讲|用小白能懂的方式)/i
const EXPLICIT_OVERVIEW = /\b(?:complete|full|comprehensive|structured|direct)\s+(?:overview|survey|summary)|\b(?:overview|survey)\b.*\b(?:directly|without\s+(?:asking|questions)|don['’]?t\s+(?:ask|quiz)|no\s+questions)|(?:完整|全面|结构化).*(?:概览|综述)|(?:直接讲|不要提问|别提问|不要先问)/i
const INITIAL_TIME_PRESSURE = /(?:\b(?:in|within|have)\s+\d+\s*(?:minutes?|mins?|hours?)\b|\b\d+\s*(?:minutes?|mins?|hours?)\s+(?:left|remaining)\b|\b(?:urgent|immediately|right\s+now)\b|(?:还有|只剩|再过)\s*\d+\s*(?:分钟|小时)|\d+\s*(?:分钟|小时)\s*(?:后|内)|马上(?:要|就要)?(?:开会|考试|面试|汇报))/i
const CONCRETE_HELP_SHAPE = /(?:\b(?:how\s+do\s+i|what\s+(?:do|should)\s+i\s+do|give\s+me|tell\s+me|show\s+me|explain|fix|solve|checklist|steps?)\b|如何|怎么|给我|告诉我|解释|修复|解决|步骤|清单)/i
const SPECIFIC_LEARNING_GOAL = /(?:\b(?:why|how|difference|distinguish|compare|debug|apply|predict|derive|implement|mechanism)\b|练习|区别|为什么|如何|怎么|对比|调试|应用|预测|推导|实现|机制)/i
const FOLLOW_UP_CUE = /^(?:what\s+if|suppose|if)\b|\b(?:again|that|this|it|same|still|more|further)\b|(?:再说一次|刚才|上面|这个|那个|继续|接着|还是不懂|还是不明白)/i
const EXPLICIT_NEW_TOPIC = /^(?:please\s+)?(?:teach\s+me|learn|understand|explain|walk\s+me\s+through|get\s+to\s+know|take\s+me\s+through)\b|^(?:我想(?:要)?(?:学习|了解|理解)|学习|教我|了解|理解|讲解|解释)/i

function mayStartNewTopic(text: string, intent: LearnIntentDecision): boolean {
  if (intent.intent !== 'learn' || FOLLOW_UP_CUE.test(text)) return false
  return intent.trigger === 'bare-concept'
    || intent.trigger === 'definition'
    || EXPLICIT_NEW_TOPIC.test(text)
}

/**
 * Classify only the first-turn shape. It deliberately does not infer a
 * learner level from jargon or topic name.
 */
export function routeLearningRequest(text: string): LearningRouteDecision {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const intent = classifyLearnIntent(normalized)
  if (intent.intent !== 'learn') {
    return routeDecision('direct', 'direct', intent)
  }
  if (EXPLICIT_OVERVIEW.test(normalized)) {
    return routeDecision('overview', 'explicit-overview', intent)
  }
  if (intent.trigger === 'current-topic') {
    return routeDecision('overview', 'current-or-contested', intent)
  }
  if (INITIAL_TIME_PRESSURE.test(normalized) && CONCRETE_HELP_SHAPE.test(normalized)) {
    return routeDecision('direct', 'initial-urgent-blocker', intent)
  }
  if (SHORT_LEARNING_REQUEST.test(normalized)) {
    if (EXPLICIT_BEGINNER.test(normalized)) {
      return routeDecision('teach-minimum', 'explicit-beginner', intent)
    }
    if (SPECIFIC_LEARNING_GOAL.test(normalized)) {
      return routeDecision('teach-minimum', 'specific-goal', intent)
    }
    return routeDecision('calibrate', 'short-learning-request', intent)
  }
  if (EXPLICIT_BEGINNER.test(normalized)) {
    return routeDecision('teach-minimum', 'explicit-beginner', intent)
  }
  switch (intent.trigger) {
    case 'definition':
      return routeDecision('teach-minimum', 'definition', intent)
    case 'bare-concept':
      return routeDecision('calibrate', 'bare-concept', intent)
    case 'confusion-repair':
      return routeDecision('teach-minimum', 'confusion-repair', intent)
    case 'learning-path':
      return routeDecision('teach-minimum', 'learning-path', intent)
    case 'resource-creation':
      return routeDecision('direct', 'resource-creation', intent)
    default:
      break
  }
  if (SPECIFIC_LEARNING_GOAL.test(normalized)) {
    return routeDecision('teach-minimum', 'specific-goal', intent)
  }
  if (intent.trigger === 'explicit-learning') {
    return routeDecision('calibrate', 'explicit-learning', intent)
  }
  return routeDecision('direct', 'direct', intent)
}

/**
 * Resolve one claimed user message with the session's current segment in
 * mind. The first-turn classifier remains intentionally narrow; once a
 * learning segment is active, ordinary learner responses inherit its route.
 * Only an explicit non-learning task, reset, or topic switch closes it.
 */
export function routeLearningTurn(
  text: string,
  session: LearningRouteSession = { active: false },
): LearningTurnRouteDecision {
  const fresh = routeLearningRequest(text)
  if (session.active && !isLearningBoundary(text) && !mayStartNewTopic(text, fresh.intent)) {
    const activeIntent: LearnIntentDecision = session.decision?.intent ?? {
      intent: 'learn',
      trigger: 'explicit-learning',
      confidence: 'medium',
      reason: 'durable learner state indicates an active learning segment',
    }
    return {
      ...(session.decision ?? fresh),
      intent: activeIntent,
      route: 'continue',
      reason: 'active-segment',
      confidence: session.decision?.confidence ?? activeIntent.confidence,
      inherited: true,
      segment: 'active',
    }
  }
  return {
    ...fresh,
    inherited: false,
    segment: fresh.intent.intent === 'learn' ? 'active' : 'closed',
  }
}

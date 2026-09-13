import { describe, expect, it } from 'vitest'
import { classifyLearnIntent, isLearnIntent } from '../src/learn-intent.ts'

describe('learn intent and trigger boundary', () => {
  it.each([
    ['What is a monad?', 'definition'],
    ['什么是贝叶斯定理？', 'definition'],
    ['logistic regression', 'bare-concept'],
    ['I always mix up precision and recall.', 'confusion-repair'],
    ['What prerequisites should I learn before category theory?', 'learning-path'],
    ['Make me active-recall flashcards for queues.', 'resource-creation'],
    ['ELI5 attention', 'explicit-learning'],
    ['Explain the contested debate around open versus closed models.', 'current-topic'],
    ['Why does attention work?', 'conceptual-question'],
    ['为什么负斜率会向下？', 'conceptual-question'],
    ['我想了解快速排序', 'explicit-learning'],
    ['Do not quiz me, explain queues.', 'explicit-learning'],
    // Code comprehension is the most common learning request in this preset;
    // only an imperative to produce or change code is an ordinary task.
    ['Explain this code and tell me why it fails.', 'explicit-learning'],
    ['帮我解释这段代码为什么这样写', 'explicit-learning'],
    ['How does the current interest rate mechanism work?', 'current-topic'],
  ] as const)('recognizes %s as %s', (request, trigger) => {
    expect(classifyLearnIntent(request)).toMatchObject({ intent: 'learn', trigger })
    expect(isLearnIntent(request)).toBe(true)
  })

  it.each([
    ['Implement a binary search function.', 'coding-task'],
    ['Calculate 2+2.', 'calculation-task'],
    ['Write a quiz app in Python.', 'coding-task'],
    ['Why is my car not starting?', 'troubleshooting-task'],
    ['What is the capital of France?', 'factual-lookup'],
    ['Translate this paragraph into Chinese.', 'translation-task'],
    ['What is the latest news about the election?', 'news-request'],
    ['What is the current price of Bitcoin?', 'current-fact-lookup'],
    ['现在布里斯班天气怎么样？', 'current-fact-lookup'],
    ['Recommend a good textbook for topology.', 'resource-recommendation'],
    ['Do you think monads are still relevant?', 'opinion-judgment'],
    ['帮我写一个 Python 函数实现队列。', 'coding-task'],
    ['我的车打不着了怎么办？', 'troubleshooting-task'],
    ['Do not explain queues; translate this.', 'translation-task'],
    ['不要教我，帮我写一个函数。', 'unknown'],
    ['hello there', 'unknown'],
  ] as const)('keeps %s off the learn route as %s', (request, trigger) => {
    expect(classifyLearnIntent(request)).toMatchObject({ intent: 'not-learn', trigger })
    expect(isLearnIntent(request)).toBe(false)
  })

  it.each([
    ['把这段翻译成中文。', 'translation-task'],
    ['给我最新的选举新闻。', 'news-request'],
    ['法国的首都是哪里？', 'factual-lookup'],
    ['推荐一本拓扑教材。', 'resource-recommendation'],
    ['你怎么看单子还值得学吗？', 'opinion-judgment'],
  ] as const)('keeps Chinese exclusion variants off the learn route: %s', (request, trigger) => {
    expect(classifyLearnIntent(request)).toMatchObject({ intent: 'not-learn', trigger })
  })

  it('marks ambiguous fallback signals low while clear rules stay high', () => {
    expect(classifyLearnIntent('logistic regression')).toMatchObject({ intent: 'learn', confidence: 'low' })
    expect(classifyLearnIntent('What is a monad?')).toMatchObject({ intent: 'learn', confidence: 'high' })
    expect(classifyLearnIntent('Why does attention work?')).toMatchObject({ intent: 'learn', confidence: 'medium' })
    expect(classifyLearnIntent('unclassified short text')).toMatchObject({ intent: 'learn', confidence: 'low' })
  })
})

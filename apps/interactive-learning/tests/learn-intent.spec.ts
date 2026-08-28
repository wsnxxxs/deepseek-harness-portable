import { describe, expect, it } from 'vitest'
import { classifyLearnIntent, isLearnIntent } from '../src/learn-intent.ts'

describe('learn intent and trigger boundary', () => {
  it.each([
    ['What is a monad?', 'definition'],
    ['什么是贝叶斯定理？', 'definition'],
    ['Tell me what a monad is.', 'definition'],
    ['队列是什么？', 'definition'],
    ['This is a graded statistics assignment; help me understand how to choose between a t-test and a chi-square test.', 'explicit-learning'],
    ['logistic regression', 'bare-concept'],
    ['I always mix up precision and recall.', 'confusion-repair'],
    ['I never learned Fourier analysis and it will not stick.', 'confusion-repair'],
    ['I am rusty on calculus.', 'confusion-repair'],
    ['What prerequisites should I learn before category theory?', 'learning-path'],
    ['Make me active-recall flashcards for queues.', 'resource-creation'],
    ['Quiz me on queues.', 'resource-creation'],
    ['flashcards on queues', 'resource-creation'],
    ['ELI5 attention', 'explicit-learning'],
    ['Explain the contested debate around open versus closed models.', 'current-topic'],
    ['Why does attention work?', 'conceptual-question'],
    ['What if C arrives next?', 'conceptual-question'],
    ['为什么负斜率会向下？', 'conceptual-question'],
    ['我想了解快速排序', 'explicit-learning'],
    ['如何理解反向传播', 'explicit-learning'],
    ['teach me how compilers implement closures', 'explicit-learning'],
    ['学习如何实现注意力机制的理论推导', 'explicit-learning'],
    ['Teach me electrical current', 'explicit-learning'],
    ['Do not quiz me, explain queues.', 'explicit-learning'],
    // Code comprehension is the most common learning request in this preset;
    // only an imperative to produce or change code is an ordinary task.
    ['Explain this code and tell me why it fails.', 'explicit-learning'],
    ['Teach me how to implement a queue in TypeScript.', 'explicit-learning'],
    ['帮我解释这段代码为什么这样写', 'explicit-learning'],
    ['How does the current interest rate mechanism work?', 'current-topic'],
    ['Explain the current price mechanism.', 'current-topic'],
    ['I don\'t understand queues.', 'confusion-repair'],
  ] as const)('recognizes %s as %s', (request, trigger) => {
    expect(classifyLearnIntent(request)).toMatchObject({ intent: 'learn', trigger })
    expect(isLearnIntent(request)).toBe(true)
  })

  it.each([
    ['Implement a binary search function.', 'coding-task'],
    ['Debug this Python stack trace.', 'coding-task'],
    ['Calculate 2+2.', 'calculation-task'],
    ['Write a quiz app in Python.', 'coding-task'],
    ['Create a quiz program.', 'coding-task'],
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
    ['不要解释这个 bug，直接修复。', 'coding-task'],
    ['Do not explain queues; translate this.', 'translation-task'],
    ['不要教我，帮我写一个函数。', 'unknown'],
    ['不要解释，直接计算 2+2。', 'calculation-task'],
    ['hello there', 'unknown'],
  ] as const)('keeps %s off the learn route as %s', (request, trigger) => {
    expect(classifyLearnIntent(request)).toMatchObject({ intent: 'not-learn', trigger })
    expect(isLearnIntent(request)).toBe(false)
  })

  it.each([
    ['Please teach me queues.', 'explicit-learning'],
    ['Help me understand queues.', 'explicit-learning'],
    ['Explain queues to me.', 'explicit-learning'],
    ['Tell me what a queue is.', 'definition'],
    ['What is a queue?', 'definition'],
    ['为什么队列保持先进先出？', 'conceptual-question'],
    ['How does a queue preserve order?', 'conceptual-question'],
  ] as const)('keeps synonym and word-order variants on the same learning rule: %s', (request, trigger) => {
    expect(classifyLearnIntent(request)).toMatchObject({ intent: 'learn', trigger })
  })

  it.each([
    ['把这段翻译成中文。', 'translation-task'],
    ['给我最新的选举新闻。', 'news-request'],
    ['法国的首都是哪里？', 'factual-lookup'],
    ['推荐一本拓扑教材。', 'resource-recommendation'],
    ['你怎么看单子还值得学吗？', 'opinion-judgment'],
    ['不要教我队列，直接计算 2+2。', 'calculation-task'],
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

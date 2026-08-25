import { describe, expect, it } from 'vitest'
import {
  classifyLearnIntent,
  isLearnIntent,
} from '../src/learn-intent.ts'

describe('learn intent and trigger boundary', () => {
  it.each([
    ['What is a monad?', 'definition'],
    ['什么是贝叶斯定理？', 'definition'],
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
    ['How does the current interest rate mechanism work?', 'current-topic'],
    ['Explain the current price mechanism.', 'current-topic'],
  ] as const)('recognizes %s as %s', (request, trigger) => {
    expect(classifyLearnIntent(request)).toMatchObject({ intent: 'learn', trigger })
    expect(isLearnIntent(request)).toBe(true)
  })

  it.each([
    ['Implement a binary search function.', 'coding-task'],
    ['Debug this Python stack trace.', 'coding-task'],
    ['Explain this code and tell me why it fails.', 'coding-task'],
    ['Teach me how to implement a queue in TypeScript.', 'coding-task'],
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
  ] as const)('keeps %s off the learn route as %s', (request, trigger) => {
    expect(classifyLearnIntent(request)).toMatchObject({ intent: 'not-learn', trigger })
    expect(isLearnIntent(request)).toBe(false)
  })
})

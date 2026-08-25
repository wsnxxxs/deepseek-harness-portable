/** Lightweight explicit segment boundaries shared by Host routing and Client notes. */
const LEARNING_RESET = /^(?:reset|start\s+over|restart|new\s+topic|different\s+topic|switch\s+topics?|change\s+topics?|forget\s+(?:that|this)|重新开始|重置|换个话题|换一个主题|从头来)/i
const LEARNING_TOPIC_SWITCH = /^(?:let['’]?s|can\s+we|i['’]?d\s+like\s+to|i\s+want\s+to)\s+(?:switch|move|change|start)\b.*\b(?:topic|subject|to)\b/i
const LEARNING_ACKNOWLEDGEMENT = /^(?:thanks?|thank\s+you|got\s+it|understood|okay|ok|done|finished|complete|completed|all\s+done|that['’]?s\s+enough|明白了?|懂了|完成了?|结束了?)[.!?]?$/i
const SMALL_TALK = /^(?:hi|hello(?:\s+there)?|hey(?:\s+there)?|good\s+(?:morning|afternoon|evening)|你好|您好|嗨|哈喽|早上好|下午好|晚上好)[.!?，。！]?$/iu

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function isLearningAcknowledgement(input: string): boolean {
  return LEARNING_ACKNOWLEDGEMENT.test(normalize(input))
}

export function isLearningSmallTalk(input: string): boolean {
  return SMALL_TALK.test(normalize(input))
}

/** A user-authored boundary that can be projected without running the full intent classifier. */
export function isExplicitLearningBoundary(input: string): boolean {
  const text = normalize(input)
  return text !== '' && (
    LEARNING_RESET.test(text)
    || LEARNING_TOPIC_SWITCH.test(text)
    || isLearningAcknowledgement(text)
    || isLearningSmallTalk(text)
  )
}

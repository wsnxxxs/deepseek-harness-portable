//#region lib/types/learning-boundary.js
/** Lightweight explicit segment boundaries shared by Host routing and Client notes. */
const LEARNING_RESET = /^(?:reset|start\s+over|restart|new\s+topic|different\s+topic|switch\s+topics?|change\s+topics?|forget\s+(?:that|this)|重新开始|重置|换个话题|换一个主题|从头来)/i;
const LEARNING_TOPIC_SWITCH = /^(?:let['’]?s|can\s+we|i['’]?d\s+like\s+to|i\s+want\s+to)\s+(?:switch|move|change|start)\b.*\b(?:topic|subject|to)\b/i;
const LEARNING_ACKNOWLEDGEMENT = /^(?:thanks?|thank\s+you|got\s+it|understood|okay|ok|done|finished|complete|completed|all\s+done|that['’]?s\s+enough|明白了?|懂了|完成了?|结束了?)[.!?]?$/i;
const SMALL_TALK = /^(?:hi|hello(?:\s+there)?|hey(?:\s+there)?|good\s+(?:morning|afternoon|evening)|你好|您好|嗨|哈喽|早上好|下午好|晚上好)[.!?，。！]?$/iu;
function normalize$1(text) {
	return text.replace(/\s+/g, " ").trim();
}
function isLearningAcknowledgement(input) {
	return LEARNING_ACKNOWLEDGEMENT.test(normalize$1(input));
}
function isLearningSmallTalk(input) {
	return SMALL_TALK.test(normalize$1(input));
}
/** A user-authored boundary that can be projected without running the full intent classifier. */
function isExplicitLearningBoundary(input) {
	const text = normalize$1(input);
	return text !== "" && (LEARNING_RESET.test(text) || LEARNING_TOPIC_SWITCH.test(text) || isLearningAcknowledgement(text) || isLearningSmallTalk(text));
}
//#endregion
//#region lib/types/learn-intent.js
/**
* Small pre-routing classifier for the Learning preset.
*
* It answers one narrow question: is the user asking to build understanding,
* or asking for a different kind of help? Teaching route selection happens
* after this boundary. The classifier is deliberately evidence-based; it does
* not infer a learner level from topic vocabulary.
*/
const LEARN_INTENT = "learn";
/**
* Natural-language rule inventory.  These descriptions are the source a
* maintainer reviews when changing the boundary; they are deliberately not
* used to generate regular expressions.
*/
const LEARN_INTENT_NATURAL_LANGUAGE_RULES = {
	trigger: [
		"Explicitly teach, explain, understand, ELI5, or learn a concept.",
		"Ask what a concept means, why/how a mechanism works, or how concepts differ.",
		"Report persistent confusion, forgetting, rustiness, or a need for a refresher.",
		"Ask for prerequisites, a learning path, an overview of a current/contested topic, or a study artifact.",
		"Give only a short concept name when the likely goal is to build understanding."
	],
	dontTrigger: [
		"Ask to implement, write, debug, calculate, translate, rewrite, or troubleshoot a concrete task.",
		"Ask for a stable/current fact, a latest-news update, a resource recommendation, or an opinion/verdict.",
		"Use a study-artifact word to ask for software rather than a learning resource.",
		"Negate the learning request itself (for example, “do not explain this”) while asking for another task."
	]
};
/**
* Explicit precedence table for the classifier's hand-written if/else order.
* Lower priority number wins. Exclusions intentionally precede broad learning
* words, while a clear request to learn a mechanism precedes an ambiguous
* implementation verb when no concrete code context is present.
*/
const LEARN_INTENT_RULES = [
	{
		id: "translation-task",
		kind: "dont-trigger",
		trigger: "translation-task",
		priority: 10,
		conflict: "wins over every learning cue"
	},
	{
		id: "resource-recommendation",
		kind: "dont-trigger",
		trigger: "resource-recommendation",
		priority: 20,
		conflict: "wins unless a study artifact is explicitly requested"
	},
	{
		id: "resource-software-task",
		kind: "dont-trigger",
		trigger: "coding-task",
		priority: 30,
		conflict: "wins over resource-creation words"
	},
	{
		id: "resource-creation",
		kind: "trigger",
		trigger: "resource-creation",
		priority: 40,
		conflict: "wins over broad learning words unless negated or software-shaped"
	},
	{
		id: "coding-task",
		kind: "dont-trigger",
		trigger: "coding-task",
		priority: 50,
		conflict: "wins when concrete code context is present"
	},
	{
		id: "calculation-task",
		kind: "dont-trigger",
		trigger: "calculation-task",
		priority: 60,
		conflict: "wins unless explicit learning language is the only request"
	},
	{
		id: "troubleshooting-task",
		kind: "dont-trigger",
		trigger: "troubleshooting-task",
		priority: 70,
		conflict: "wins for personal failures/problems"
	},
	{
		id: "negated-learning",
		kind: "dont-trigger",
		trigger: "unknown",
		priority: 80,
		conflict: "wins when the learning request itself is negated"
	},
	{
		id: "current-survey",
		kind: "trigger",
		trigger: "current-topic",
		priority: 90,
		conflict: "current structured survey before current-value lookup"
	},
	{
		id: "current-fact-lookup",
		kind: "dont-trigger",
		trigger: "current-fact-lookup",
		priority: 100,
		conflict: "wins for a requested current value"
	},
	{
		id: "factual-lookup",
		kind: "dont-trigger",
		trigger: "factual-lookup",
		priority: 110,
		conflict: "wins for a stable factual value"
	},
	{
		id: "news-request",
		kind: "dont-trigger",
		trigger: "news-request",
		priority: 120,
		conflict: "wins for latest/breaking updates"
	},
	{
		id: "opinion-judgment",
		kind: "dont-trigger",
		trigger: "opinion-judgment",
		priority: 130,
		conflict: "wins for a verdict or personal take"
	},
	{
		id: "acknowledgement",
		kind: "dont-trigger",
		trigger: "unknown",
		priority: 140,
		conflict: "does not open a new learning segment"
	},
	{
		id: "small-talk",
		kind: "dont-trigger",
		trigger: "unknown",
		priority: 141,
		conflict: "does not open or continue a learning segment"
	},
	{
		id: "confusion-repair",
		kind: "trigger",
		trigger: "confusion-repair",
		priority: 150,
		conflict: "wins over broad question wording"
	},
	{
		id: "learning-path",
		kind: "trigger",
		trigger: "learning-path",
		priority: 160,
		conflict: "wins over generic how-to wording"
	},
	{
		id: "definition",
		kind: "trigger",
		trigger: "definition",
		priority: 170,
		conflict: "wins over generic conceptual wording"
	},
	{
		id: "current-conceptual",
		kind: "trigger",
		trigger: "current-topic",
		priority: 180,
		conflict: "current conceptual explanation after stable definition checks"
	},
	{
		id: "explicit-overview",
		kind: "trigger",
		trigger: "explicit-overview",
		priority: 190,
		conflict: "wins when a structured overview is explicitly requested"
	},
	{
		id: "explicit-learning",
		kind: "trigger",
		trigger: "explicit-learning",
		priority: 200,
		conflict: "wins over ambiguous verbs without concrete task context"
	},
	{
		id: "conceptual-question",
		kind: "trigger",
		trigger: "conceptual-question",
		priority: 210,
		conflict: "wins for mechanism/cause/contrast questions"
	},
	{
		id: "bare-concept",
		kind: "trigger",
		trigger: "bare-concept",
		priority: 220,
		conflict: "fallback; low confidence because the desired help shape is unknown"
	}
];
/**
* Prompt-facing guidance for the model when the hand-maintained patterns do
* not make the boundary clear.  The model should use the natural-language
* inventory and precedence table, not invent a new regex.
*/
const LEARN_INTENT_CONFLICT_PRIORITY = LEARN_INTENT_RULES.map((rule) => `${String(rule.priority)}:${rule.id}`).join(" > ");
const LEARN_INTENT_MODEL_GUIDANCE = [
	`Trigger cues: ${LEARN_INTENT_NATURAL_LANGUAGE_RULES.trigger.join(" ")}`,
	`Don't-trigger cues: ${LEARN_INTENT_NATURAL_LANGUAGE_RULES.dontTrigger.join(" ")}`,
	`Conflict priority (lower number wins): ${LEARN_INTENT_CONFLICT_PRIORITY}.`,
	"Use this as a compact hint, not as a replacement for the user message. If a low-confidence result conflicts with the user's apparent goal, reclassify from context and follow the ordinary task route. Do not treat a topic word, “explain”, or “how” alone as proof of learning intent when the user is asking for an implementation, fact, news update, recommendation, or verdict."
].join(" ");
const EXPLICIT_LEARNING = /(?:^|\s)(?:please\s+)?(?:teach\s+me|help\s+me\s+(?:learn|understand|grasp)|help\s+me\s+with\s+the\s+concept|learn|understand|explain|walk\s+me\s+through|study|from\s+(?:scratch|zero)|teach|eli5)(?:\b|\s|$)|(?:学习|教我|了解|理解|讲解|解释|学会|从零|入门|像给五岁孩子讲|用小白能懂的方式)/i;
const DEFINITION = /^(?:please\s+)?(?:what\s+is|what's|define|definition\s+of|meaning\s+of|tell\s+me\s+about)\b|^(?:please\s+)?tell\s+me\s+what\s+.+\s+is\b|^(?:解释一下|什么是|何谓)|(?:what|which)\s+is\s+.+\s+(?:called|known\s+as)\b|(?:what(?:'s|\s+is)\s+.+\s+mean)|(?:告诉我|请告诉我).{0,30}(?:是什么|含义)|(?:.+(?:是什么|是啥|什么意思))[?？。！!]?$/i;
const CONFUSION_REPAIR = /(?:keep\s+(?:mixing|confusing)|always\s+(?:mix|confuse)|constantly\s+(?:mix|confuse)|can't\s+(?:remember|get|understand)|cannot\s+(?:remember|get|understand)|(?:i\s+)?(?:don't|do not)\s+understand|still\s+(?:don't|do not|can't|cannot)\s+(?:get|understand|follow|grasp|see)|won't\s+stick|not\s+(?:getting|sticking)|never\s+(?:learned|understood)|(?:i'm|i am)\s+(?:stuck|lost|confused|rusty\s+(?:on|with))|need\s+(?:a\s+)?refresher|out\s+of\s+practice|no\s+idea|总是混淆|老是混淆|记不住|没学会|学不会|搞不懂|分不清|总是弄错|还是不懂|还是不明白|有点生疏|忘得差不多|需要复习)/i;
const LEARNING_PATH = /(?:prerequisite|pre-requisite|what\s+(?:should|do)\s+i\s+learn\s+before|what\s+comes\s+before|where\s+do\s+i\s+start|learning\s+path|study\s+path|roadmap|sequence\s+to\s+learn|how\s+to\s+study|先学什么|前置知识|前置条件|学习路径|学习路线|入门顺序|学习顺序|怎么学)/i;
const RESOURCE_CREATION = /(?:(?:make|create|write|draft|prepare|turn|convert|生成|制作|整理|编写).{0,80}(?:flashcards?|study\s+guide|quiz|outline|review\s+sheet|闪卡|抽认卡|学习指南|复习提纲|测验|知识卡片)|\bquiz\s+me\b|^(?:flashcards?|study\s+guide|quiz|review\s+sheet)\s+(?:for|on|about)\b|^(?:考考我|抽认卡|闪卡|学习指南|复习提纲|测验|知识卡片)(?:\s|：|:|关于|针对))/i;
const NEGATED_RESOURCE_CREATION = /(?:do\s+not|don['’]?t|never)\s+(?:quiz\s+me|make|create|write|generate)|(?:不要|别|无需)(?:考我|测试我|生成|制作|整理|编写)/i;
const RESOURCE_SOFTWARE_TASK = /\b(?:quiz|flashcard|study[- ]guide)\s+(?:(?:app(?:lication)?|program|script|website|code)\b|(?:in|using|with)\s+(?:typescript|javascript|python|java|rust|golang|c\+\+|html|css)\b)|(?:测验|闪卡|学习指南)(?:应用|程序|脚本|网站|代码)/i;
const RESOURCE_RECOMMENDATION = /(?:recommend|suggest|what\s+should\s+i\s+read|推荐|建议).{0,80}(?:book|course|tutorial|resource|textbook|教材|课程|教程|资料|资源)|\b(?:best|good)\s+(?:book|course|tutorial|resource|textbook)\b|(?:教材|课程|教程|资料|资源)\s*(?:推荐|建议)/i;
const CODING_TASK = /(?:^|\s)(?:write|implement|code|build|fix|debug|refactor|run|deploy|integrate|编写|实现|写代码|写一个|写出|帮我写|编程|修复|调试|重构|部署|接入)(?:\b|\s|$)|(?:function|class|api|bug|stack\s+trace|报错|代码|函数|脚本).{0,80}(?:write|fix|debug|implement|编写|实现|修复|调试|写一个|写出|帮我写)|(?:explain|walk\s+me\s+through|what\s+does).{0,30}(?:this|the|my|following)\s+(?:code|function|class|snippet|script)|(?:解释|说明).{0,20}(?:这段|以下|这个).{0,10}(?:代码|函数|类|脚本)/i;
const CODE_CONTEXT = /(?:\b(?:code|function|class|api|bug|stack\s+trace|snippet|script|repository|repo|file|typescript|javascript|python|java|rust|golang|c\+\+|sql|html|css)\b|代码|函数|类|脚本|程序|仓库|报错|堆栈|接口)/i;
const CALCULATION_TASK = /^(?:please\s+)?(?:calculate|compute|evaluate|solve)\b|(?:[;,，；]\s*)(?:please\s+)?(?:calculate|compute|evaluate|solve)\b|^(?:请)?(?:计算|求值|求解|解一下|解出)(?:\s|[:：]|$)|(?:直接)?(?:计算|求值|求解)(?:\s|[:：]|$)/i;
const FACTUAL_LOOKUP = /^(?:please\s+)?(?:who|when|where|how\s+(?:many|much)|what\s+(?:year|date)|what(?:'s|\s+is)(?:\s+the)?\s+(?:capital|currency|population|language))\b|^(?:谁(?:是|发明|提出)|什么时候|何时|哪里|哪一年|多少|哪个国家的首都|首都是哪里)|^.+(?:哪个国家的首都|首都是哪里|首都是什么|人口是多少|语言是什么|货币是什么)[?？。！!]?$/i;
const PERSONAL_TROUBLESHOOTING = /^(?:(?:why|how)\b.{0,40}\b(?:my|our)\b|(?:my|our)\b).{0,80}\b(?:won't|doesn't|isn't|can't|cannot|not\s+\w+ing|broken|failing|stopped|problem|issue)\b|^(?:为什么|怎么|如何).{0,30}(?:我的|我们的).{0,50}(?:坏了|打不开|无法|不能|启动不了|不工作|出问题)|^(?:我的|我们的).{0,60}(?:怎么办|坏了|打不开|无法|不能|启动不了|不工作|出问题)/i;
const TRANSLATION_TASK = /(?:translate|translation|翻译|翻成|译成|proofread|copyedit|rewrite|polish|润色|改写)/i;
const NEWS_REQUEST = /(?:latest|breaking|today's?|this\s+week|recent\s+update|news|what\s+happened|current\s+events|最新|近期消息|新闻|时事|刚刚发生|最近发生了什么)/i;
const NEWS_CONTENT = /(?:\b(?:news|breaking|current\s+events|what\s+happened)\b|新闻|时事|刚刚发生|最近发生了什么|近期消息)/i;
const CURRENT_FACT_LOOKUP = /(?:\b(?:current|latest|today(?:'s)?)\b.{0,40}\b(?:price|rate|score|schedule|weather|temperature|time|population|ceo|president|version)\b|\b(?:price|rate|score|schedule|weather|temperature)\b.{0,24}\b(?:right\s+now|today|current)\b|(?:当前|今天|现在).{0,20}(?:价格|汇率|比分|赛程|天气|温度|时间|人口|版本)|(?:价格|汇率|比分|赛程|天气|温度).{0,12}(?:当前|今天|现在))/i;
const CURRENT_CONCEPTUAL_EXPLANATION = /(?:explain|teach\s+me|help\s+me\s+understand|mechanism|how\s+(?:does|do|can|will)\b|affect|impact|cause|relationship|解释|讲解|理解|机制|为什么|如何影响|怎么影响|关系)/i;
const CURRENT_TOPIC = /(?:\b(?:right\s+now|today|recent|contested|controversial|debate)\b|当前|现在|如今|争议|有争议|辩论|争论)/i;
const CURRENT_SURVEY = /(?:\b(?:latest|recent|current)\b|最新|近期).{0,50}(?:survey|overview|summary|综述|概览)/i;
const EXPLICIT_OVERVIEW$1 = /(?:\b(?:complete|full|comprehensive|structured|direct)\s+(?:overview|survey|summary)|\b(?:overview|survey)\b.*\b(?:directly|without\s+(?:asking|questions)|don['’]?t\s+(?:ask|quiz)|no\s+questions)|(?:完整|全面|结构化).{0,20}(?:overview|survey|summary|概览|综述)|(?:直接讲|不要提问|别提问|不要先问))/i;
const OPINION_JUDGMENT = /(?:do\s+you\s+think|what(?:'s|\s+is)\s+your\s+(?:take|opinion)|honest\s+take|in\s+your\s+opinion|is\s+.+\s+(?:dead|over|still\s+relevant|taken\s+seriously)|was\s+.+\s+really|settle\s+this|你怎么看|你的看法|观点|评价一下|到底是不是|还值得认真对待吗)/i;
const CONCEPTUAL_QUESTION = /(?:^|\s)(?:why|how|what\s+if|suppose|difference\s+between|distinguish|compare|mechanism|cause|what\s+does\s+.+\s+mean)(?:\b|\s|$)|(?:为什么|为何|如何|怎么|如果|假设|区别|对比|机制|原因|含义)/i;
const NEGATED_LEARNING_REQUEST = /(?:\b(?:do\s+not|don't|never|not)\s+(?:teach|explain|learn|study|walk\s+me\s+through)\b)|(?:不要|别|无需|不必)\s*(?:教我|解释|学习|讲解|带我过一遍)/i;
function normalize(text) {
	return text.replace(/\s+/g, " ").trim();
}
function isBareConcept(text) {
	if (text === "" || text.length > 120) return false;
	if (/[?!\.。！？,:;，；：]/.test(text) || /https?:\/\//i.test(text)) return false;
	if (/[{}[\]();=<>]|```|\\/.test(text)) return false;
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length > 8) return false;
	if (/^(?:(?:i|we|you|please|can|could|would|how|why|what)(?=\s|[\p{P}\p{S}]|$)|帮我|请|我|你|能否|如何|为什么)/iu.test(text)) return false;
	if (/\b(?:is|are|was|were|do|does|did|can|should|need|want|please|give|show|tell|write|make|recommend)\b/i.test(text)) return false;
	return words.length <= 6;
}
function defaultConfidence(trigger) {
	switch (trigger) {
		case "unknown":
		case "bare-concept": return "low";
		case "conceptual-question":
		case "current-topic": return "medium";
		default: return "high";
	}
}
function decision(intent, trigger, reason, confidence = defaultConfidence(trigger)) {
	return {
		intent,
		trigger,
		confidence,
		reason
	};
}
/**
* Layer 3 is deliberately hand-maintained. The handlers are keyed by the
* structured rule ids, then the classifier derives its execution order from
* the table priorities above. Adding a rule therefore requires both a table
* entry and a matcher, while the matcher never gets generated from prose.
*/
const RULE_HANDLERS = {
	"translation-task": (text) => TRANSLATION_TASK.test(text) ? decision("not-learn", "translation-task", "translation or text transformation") : void 0,
	"resource-recommendation": (text) => RESOURCE_RECOMMENDATION.test(text) && !RESOURCE_CREATION.test(text) ? decision("not-learn", "resource-recommendation", "request for a resource recommendation") : void 0,
	"resource-software-task": (text) => RESOURCE_SOFTWARE_TASK.test(text) ? decision("not-learn", "coding-task", "software implementation task shaped like a study artifact") : void 0,
	"resource-creation": (text) => RESOURCE_CREATION.test(text) && !NEGATED_RESOURCE_CREATION.test(text) && !RESOURCE_SOFTWARE_TASK.test(text) ? decision("learn", "resource-creation", "the learner asks for a study artifact") : void 0,
	"coding-task": (text) => CODING_TASK.test(text) && !(EXPLICIT_LEARNING.test(text) && !CODE_CONTEXT.test(text)) ? decision("not-learn", "coding-task", "implementation or troubleshooting task") : void 0,
	"calculation-task": (text) => CALCULATION_TASK.test(text) && (!EXPLICIT_LEARNING.test(text) || NEGATED_LEARNING_REQUEST.test(text)) ? decision("not-learn", "calculation-task", "calculation or problem-solving task") : void 0,
	"troubleshooting-task": (text) => PERSONAL_TROUBLESHOOTING.test(text) ? decision("not-learn", "troubleshooting-task", "personal troubleshooting request") : void 0,
	"negated-learning": (text) => NEGATED_LEARNING_REQUEST.test(text) ? decision("not-learn", "unknown", "the learning request itself is negated") : void 0,
	"current-survey": (text) => CURRENT_SURVEY.test(text) && !NEWS_CONTENT.test(text) ? decision("learn", "current-topic", "request for a current structured survey") : void 0,
	"current-fact-lookup": (text) => {
		if (!CURRENT_FACT_LOOKUP.test(text)) return void 0;
		return CURRENT_CONCEPTUAL_EXPLANATION.test(text) ? decision("learn", "current-topic", "request to understand a current topic rather than retrieve its value") : decision("not-learn", "current-fact-lookup", "request for a current factual value");
	},
	"factual-lookup": (text) => FACTUAL_LOOKUP.test(text) ? decision("not-learn", "factual-lookup", "request for a stable factual value") : void 0,
	"news-request": (text) => NEWS_REQUEST.test(text) ? decision("not-learn", "news-request", "news or breaking-update request") : void 0,
	"opinion-judgment": (text) => OPINION_JUDGMENT.test(text) ? decision("not-learn", "opinion-judgment", "request for a verdict or personal take") : void 0,
	acknowledgement: (text) => isLearningAcknowledgement(text) ? decision("not-learn", "unknown", "short acknowledgement or greeting is not a new learning request") : void 0,
	"small-talk": (text) => isLearningSmallTalk(text) ? decision("not-learn", "unknown", "short acknowledgement or greeting is not a new learning request") : void 0,
	"confusion-repair": (text) => CONFUSION_REPAIR.test(text) ? decision("learn", "confusion-repair", "the learner reports a persistent confusion or memory failure") : void 0,
	"learning-path": (text) => LEARNING_PATH.test(text) ? decision("learn", "learning-path", "the learner asks how concepts or prerequisites should be sequenced") : void 0,
	definition: (text) => DEFINITION.test(text) ? decision("learn", "definition", "definition request") : void 0,
	"current-conceptual": (text) => CURRENT_TOPIC.test(text) ? decision("learn", "current-topic", "request to understand a current or contested topic") : void 0,
	"explicit-overview": (text) => EXPLICIT_OVERVIEW$1.test(text) ? decision("learn", "explicit-overview", "the learner explicitly requests a structured overview") : void 0,
	"explicit-learning": (text) => EXPLICIT_LEARNING.test(text) ? decision("learn", "explicit-learning", "explicit request to learn or understand") : void 0,
	"conceptual-question": (text) => CONCEPTUAL_QUESTION.test(text) ? decision("learn", "conceptual-question", "question about a mechanism, cause, meaning, or contrast") : void 0,
	"bare-concept": (text) => isBareConcept(text) ? decision("learn", "bare-concept", "short concept name implies a request to understand it") : void 0
};
const CLASSIFIER_RULE_CHAIN = LEARN_INTENT_RULES.slice().sort((left, right) => left.priority - right.priority).map((rule) => ({
	rule,
	handler: RULE_HANDLERS[rule.id]
}));
/** Classify the first-turn request before choosing a teaching route. */
function classifyLearnIntent(input) {
	const text = normalize(input);
	if (text === "") return decision("not-learn", "unknown", "empty request");
	for (const { handler } of CLASSIFIER_RULE_CHAIN) {
		const result = handler(text);
		if (result !== void 0) return result;
	}
	return decision("not-learn", "unknown", "no learning trigger was observed");
}
function isLearnIntent(input) {
	return classifyLearnIntent(input).intent === LEARN_INTENT;
}
/** Whether a message explicitly closes or switches away from a learning segment. */
function isLearningBoundary(input) {
	const text = normalize(input);
	if (text === "") return false;
	if (isExplicitLearningBoundary(text)) return true;
	const intent = classifyLearnIntent(text);
	return intent.intent === "not-learn" && intent.trigger !== "unknown";
}
/** Compact standing text; detailed diagnosis and moves stay in references. */
const LEARNING_INTENT_POLICY = ["Classify the request before teaching: learn intent covers definitions (“what is X”), a bare concept name, ELI5/beginner requests, persistent confusion or rustiness (“I always mix these up / can’t remember / 没学会”), conceptual why/how questions, prerequisites, learning paths, and requested study artifacts such as “quiz me”, flashcards, or a study guide.", "Keep coding/implementation or debugging, direct calculation, personal troubleshooting, translation or rewriting, news/breaking updates, stable or current factual lookups, resource recommendations, and opinion or verdict requests on their ordinary task route. A current or contested topic is still learn intent when the user asks for structured understanding; a latest-news or current-value lookup is not."].join(" ");
//#endregion
//#region lib/types/teaching-route.js
/**
* Small, deterministic routing hints for the Learning preset.
*
* The model still owns the final wording and teaching judgment. This helper
* exists so the high-priority ambiguity rule is testable and reusable by
* canaries without copying prompt prose into another subsystem.
*/
function routeDecision(route, reason, intent) {
	return {
		route,
		reason,
		intent,
		confidence: intent.confidence
	};
}
const SHORT_LEARNING_REQUEST = /^(?:please\s+)?(?:teach\s+me|help\s+me\s+learn|learn|understand|get\s+to\s+know|walk\s+me\s+through|take\s+me\s+through)\b|^(?:学习|教我|了解|想学)\s*/i;
const EXPLICIT_BEGINNER = /(?:\b(?:from\s+scratch|from\s+zero|beginner|beginners|intro(?:duction)?|concept(?:ual)?\s+intro|eli5)\b|explain(?:\s+it|\s+this)?\s+like\s+(?:i(?:'| a)?m|to\s+a)\s+(?:five|5)(?:[- ]year[- ]old)?|零基础|从零|入门|概念入门|像给五岁孩子讲|用小白能懂的方式)/i;
const EXPLICIT_OVERVIEW = /\b(?:complete|full|comprehensive|structured|direct)\s+(?:overview|survey|summary)|\b(?:overview|survey)\b.*\b(?:directly|without\s+(?:asking|questions)|don['’]?t\s+(?:ask|quiz)|no\s+questions)|(?:完整|全面|结构化).*(?:概览|综述)|(?:直接讲|不要提问|别提问|不要先问)/i;
const INITIAL_TIME_PRESSURE = /(?:\b(?:in|within|have)\s+\d+\s*(?:minutes?|mins?|hours?)\b|\b\d+\s*(?:minutes?|mins?|hours?)\s+(?:left|remaining)\b|\b(?:urgent|immediately|right\s+now)\b|(?:还有|只剩|再过)\s*\d+\s*(?:分钟|小时)|\d+\s*(?:分钟|小时)\s*(?:后|内)|马上(?:要|就要)?(?:开会|考试|面试|汇报))/i;
const CONCRETE_HELP_SHAPE = /(?:\b(?:how\s+do\s+i|what\s+(?:do|should)\s+i\s+do|give\s+me|tell\s+me|show\s+me|explain|fix|solve|checklist|steps?)\b|如何|怎么|给我|告诉我|解释|修复|解决|步骤|清单)/i;
const SPECIFIC_LEARNING_GOAL = /(?:\b(?:why|how|difference|distinguish|compare|debug|apply|predict|derive|implement|mechanism)\b|练习|区别|为什么|如何|怎么|对比|调试|应用|预测|推导|实现|机制)/i;
const FOLLOW_UP_CUE = /^(?:what\s+if|suppose|if)\b|\b(?:again|that|this|it|same|still|more|further)\b|(?:再说一次|刚才|上面|这个|那个|继续|接着|还是不懂|还是不明白)/i;
const EXPLICIT_NEW_TOPIC = /^(?:please\s+)?(?:teach\s+me|learn|understand|explain|walk\s+me\s+through|get\s+to\s+know|take\s+me\s+through)\b|^(?:我想(?:要)?(?:学习|了解|理解)|学习|教我|了解|理解|讲解|解释)/i;
function mayStartNewTopic(text, intent) {
	if (intent.intent !== "learn" || FOLLOW_UP_CUE.test(text)) return false;
	return intent.trigger === "bare-concept" || intent.trigger === "definition" || EXPLICIT_NEW_TOPIC.test(text);
}
/**
* Classify only the first-turn shape. It deliberately does not infer a
* learner level from jargon or topic name.
*/
function routeLearningRequest(text) {
	const normalized = text.replace(/\s+/g, " ").trim();
	const intent = classifyLearnIntent(normalized);
	if (intent.intent !== "learn") return routeDecision("direct", "direct", intent);
	if (EXPLICIT_OVERVIEW.test(normalized)) return routeDecision("overview", "explicit-overview", intent);
	if (intent.trigger === "current-topic") return routeDecision("overview", "current-or-contested", intent);
	if (INITIAL_TIME_PRESSURE.test(normalized) && CONCRETE_HELP_SHAPE.test(normalized)) return routeDecision("direct", "initial-urgent-blocker", intent);
	if (SHORT_LEARNING_REQUEST.test(normalized)) {
		if (EXPLICIT_BEGINNER.test(normalized)) return routeDecision("teach-minimum", "explicit-beginner", intent);
		if (SPECIFIC_LEARNING_GOAL.test(normalized)) return routeDecision("teach-minimum", "specific-goal", intent);
		return routeDecision("calibrate", "short-learning-request", intent);
	}
	if (EXPLICIT_BEGINNER.test(normalized)) return routeDecision("teach-minimum", "explicit-beginner", intent);
	switch (intent.trigger) {
		case "definition": return routeDecision("teach-minimum", "definition", intent);
		case "bare-concept": return routeDecision("calibrate", "bare-concept", intent);
		case "confusion-repair": return routeDecision("teach-minimum", "confusion-repair", intent);
		case "learning-path": return routeDecision("teach-minimum", "learning-path", intent);
		case "resource-creation": return routeDecision("direct", "resource-creation", intent);
	}
	if (SPECIFIC_LEARNING_GOAL.test(normalized)) return routeDecision("teach-minimum", "specific-goal", intent);
	if (intent.trigger === "explicit-learning") return routeDecision("calibrate", "explicit-learning", intent);
	return routeDecision("direct", "direct", intent);
}
/**
* Resolve one claimed user message with the session's current segment in
* mind. The first-turn classifier remains intentionally narrow; once a
* learning segment is active, ordinary learner responses inherit its route.
* Only an explicit non-learning task, reset, or topic switch closes it.
*/
function routeLearningTurn(text, session = { active: false }) {
	const fresh = routeLearningRequest(text);
	if (session.active && !isLearningBoundary(text) && !mayStartNewTopic(text, fresh.intent)) {
		const activeIntent = session.decision?.intent ?? {
			intent: "learn",
			trigger: "explicit-learning",
			confidence: "medium",
			reason: "durable learner state indicates an active learning segment"
		};
		return {
			...session.decision ?? fresh,
			intent: activeIntent,
			route: "continue",
			reason: "active-segment",
			confidence: session.decision?.confidence ?? activeIntent.confidence,
			inherited: true,
			segment: "active"
		};
	}
	return {
		...fresh,
		inherited: false,
		segment: fresh.intent.intent === "learn" ? "active" : "closed"
	};
}
//#endregion
//#region lib/types/teaching-policy.js
/**
* Compact standing policy for the Learning preset.
*
* The core is injected for every Learning request. Graded-work and visual
* construction rules are conditional additions so ordinary turns do not pay
* for details they cannot use. `LEARNING_TEACHING_POLICY` remains an alias
* for callers that only need the standing layer.
*/
const LEARNING_TEACHING_POLICY_CORE = [
	"# DeepSeek Harness Learning Policy",
	"Avoid two failures: answer dumps leave learners unable to act; question-only turns make them give up. Move one step each turn.",
	"Optimize for durable capability: the learner should explain, predict, distinguish, debug, or apply the idea without help. Be warm and matched to the learner's level. Do not prolong lessons, withhold useful answers, or use tools for their own sake.",
	"## Learn intent",
	LEARNING_INTENT_POLICY,
	"## Route first",
	"Treat a short “learn X”, “teach me X”, or “understand X” request with unknown level and goal as calibration: give one tiny foothold and ask one question whose answer changes the teaching route, not a full overview. Fluent terminology sets the teaching level, not the response shape. If the learner says “from zero”, “beginner”, “ELI5”, or “concept intro”, teach one minimum concept immediately. Give a complete/full overview or current or contested-topic survey directly when requested, and create requested study resources directly; no ritual quiz or checkpoint. A concrete blocker with opening time pressure gets direct help first. The rule “answer time-boxed requests directly” can regress into “cave whenever the learner pushes”: a deadline introduced only after a productive question is usually impatience, so narrow the move for impatience; after repeated errors, “I have no idea”, or shutdown, give a concrete first step and change representation. If the goal is clear, teach; do not open with a questionnaire.",
	"Skip diagnosis when the learner shows work, names the confusion, or asks a sharp expert question; use that evidence at the matching level. For a broad topic, choose structured overview, draw out existing thinking, or a substantive answer with sources.",
	"## One-step teaching loop",
	"Each response makes one cognitive move: a minimum explanation plus one concrete example, contrast, or parallel step. Ask at most one focused learner question with a scaffold.",
	"Use observable evidence only. Name what the learner said or did. For a correct response, preserve the correct part and raise difficulty slightly; for a partial or wrong response, isolate the precise error, add new information, and offer a nearby retry. A concept gap needs the concept; a procedure gap needs a distinct parallel example; a notation gap needs symbols decoded; a prerequisite gap needs the missing rule.",
	"Never repeat a hint, analogy, question, or explanation fingerprint. When the learner says “I don’t understand”, shrink the concept or change representation and add new information; do not paraphrase the same move. “I heard it” is not mastery: require an explanation, prediction, or application in a fresh situation.",
	"Stop after independent fresh transfer, or a sufficiently confident, correct, independent explanation/attempt that resolves the segment. State the evidence and offer, but do not force, a next step. A complete explanation may end the segment with mastery still emerging; only explicit fresh-context evidence establishes transfer. Honor corrections and requests to stop questioning. Do not add a question, checkpoint, praise loop, or plan step after completion. A plan is tentative and never a completion checklist.",
	"Ordinary conversation is the default. Use a visual only when one relationship is materially clearer; use a checkpoint only when the learner's response will change the next move; visual or checkpoint, never both. Both are optional and non-blocking. Load the interactive-teaching Skill when detailed diagnosis, pressure, integrity, visual, or supplied-source guidance is needed.",
	"Keep academic-integrity limits conditional on observable assessed work; do not turn self-study into a refusal. Never invent facts, citations, source anchors, learner evidence, or confidence; correct mistakes plainly.",
	"The `learning_state_update` state is tentative and session-local. Update only after an observable change. Low-confidence evidence may guide support but cannot establish mastery; only sufficiently confident, correct, independent evidence can do so. Use phase, last explanation/question, learner-response assessment, current misconception, next move, and move fingerprint to choose a different move; do not narrate these fields."
].join("\n\n");
/** Inject only when the turn is known to be assessed or submitted. */
const LEARNING_GRADED_POLICY = ["## Academic integrity (graded context)", "Do not produce a final answer or submission-ready prose/code for graded work. Give the concept, a distinct parallel example, debugging guidance, or review of the learner's own reasoning; if grading status is unclear and it changes the response, ask. Explain the boundary warmly: refusing contact without asking what is graded only trains people to hide the wording."].join("\n\n");
/** Inject only when a visual route has actually been selected. */
const LEARNING_VISUAL_POLICY = [
	"## Visual route (conditional)",
	"Use one native visual for one relationship only when seeing or manipulating it is materially clearer. Keep teaching and the one focused question in prose, choose visual or checkpoint rather than both, and provide a concise prose fallback. Before emitting, check that completion does not merely hand over the answer and that labels carry the relationship without color alone.",
	"For a plot, frame the slider as the learner's hand on the parameter: ask them to predict first, then drag. Treat interaction as a low-confidence, unknown-correctness self-observation like recall self-rating; never silently collect it as correctness, mastery, or transfer evidence."
].join("\n\n");
/** Short templates make the standing/tool prompt usable for Chinese turns. */
const LEARNING_CHINESE_TEMPLATES = [
	"中文模板：先给一个小支架，再问一个会改变下一步的问题。",
	"中文模板：你刚才说对了___；还差___。换一个例子试试：___。",
	"中文模板：如果你愿意，我们可以继续深挖、换一种讲法，或在这里结束这一段。"
].join("\n");
/**
* Build the prompt layers for a particular turn. The caller decides when a
* graded flag or native visual is observable; this helper does not infer it.
*/
function buildLearningTeachingPolicy(context = {}) {
	const conditional = [];
	if (context.graded) conditional.push(LEARNING_GRADED_POLICY);
	if (context.visual && (context.route === "teach-minimum" || context.route === "continue" || context.route === "overview" || context.route === "direct")) conditional.push(LEARNING_VISUAL_POLICY);
	if (context.language === "zh" || context.language === "mixed") conditional.push(LEARNING_CHINESE_TEMPLATES);
	return [LEARNING_TEACHING_POLICY_CORE, ...conditional].join("\n\n");
}
/** Backwards-compatible standing-layer name used by existing agent wiring. */
const LEARNING_TEACHING_POLICY = LEARNING_TEACHING_POLICY_CORE;
//#endregion
export { LEARNING_VISUAL_POLICY as a, routeLearningTurn as c, LEARN_INTENT_MODEL_GUIDANCE as d, LEARN_INTENT_NATURAL_LANGUAGE_RULES as f, isLearningBoundary as g, isLearnIntent as h, LEARNING_TEACHING_POLICY_CORE as i, LEARNING_INTENT_POLICY as l, classifyLearnIntent as m, LEARNING_GRADED_POLICY as n, buildLearningTeachingPolicy as o, LEARN_INTENT_RULES as p, LEARNING_TEACHING_POLICY as r, routeLearningRequest as s, LEARNING_CHINESE_TEMPLATES as t, LEARN_INTENT as u };

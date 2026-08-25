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
const EXPLICIT_LEARNING = /(?:^|\s)(?:please\s+)?(?:teach\s+me|help\s+me\s+(?:learn|understand|grasp)|help\s+me\s+with\s+the\s+concept|learn|understand|explain|walk\s+me\s+through|study|from\s+(?:scratch|zero)|teach|eli5)(?:\b|\s|$)|(?:学习|教我|了解|理解|讲解|解释|学会|从零|入门|像给五岁孩子讲|用小白能懂的方式)/i;
const DEFINITION = /^(?:please\s+)?(?:what\s+is|what's|define|definition\s+of|meaning\s+of)\b|^(?:解释一下|什么是|何谓)/i;
const CONFUSION_REPAIR = /(?:keep\s+(?:mixing|confusing)|always\s+(?:mix|confuse)|constantly\s+(?:mix|confuse)|can't\s+(?:remember|get|understand)|cannot\s+(?:remember|get|understand)|still\s+(?:don't|do not|can't|cannot)\s+(?:get|understand|follow|grasp|see)|won't\s+stick|not\s+(?:getting|sticking)|never\s+(?:learned|understood)|(?:i'm|i am)\s+(?:stuck|lost|confused|rusty\s+(?:on|with))|need\s+(?:a\s+)?refresher|out\s+of\s+practice|no\s+idea|总是混淆|老是混淆|记不住|没学会|学不会|搞不懂|分不清|总是弄错|还是不懂|还是不明白|有点生疏|忘得差不多|需要复习)/i;
const LEARNING_PATH = /(?:prerequisite|pre-requisite|what\s+(?:should|do)\s+i\s+learn\s+before|what\s+comes\s+before|where\s+do\s+i\s+start|learning\s+path|study\s+path|roadmap|sequence\s+to\s+learn|how\s+to\s+study|先学什么|前置知识|前置条件|学习路径|学习路线|入门顺序|学习顺序|怎么学)/i;
const RESOURCE_CREATION = /(?:(?:make|create|write|draft|prepare|turn|convert|生成|制作|整理|编写).{0,80}(?:flashcards?|study\s+guide|quiz|outline|review\s+sheet|闪卡|抽认卡|学习指南|复习提纲|测验|知识卡片)|\bquiz\s+me\b|^(?:flashcards?|study\s+guide|quiz|review\s+sheet)\s+(?:for|on|about)\b|^(?:考考我|抽认卡|闪卡|学习指南|复习提纲|测验|知识卡片)(?:\s|：|:|关于|针对))/i;
const NEGATED_RESOURCE_CREATION = /(?:do\s+not|don['’]?t|never)\s+(?:quiz\s+me|make|create|write|generate)|(?:不要|别|无需)(?:考我|测试我|生成|制作|整理|编写)/i;
const RESOURCE_SOFTWARE_TASK = /\b(?:quiz|flashcard|study[- ]guide)\s+(?:(?:app(?:lication)?|program|script|website|code)\b|(?:in|using|with)\s+(?:typescript|javascript|python|java|rust|golang|c\+\+|html|css)\b)|(?:测验|闪卡|学习指南)(?:应用|程序|脚本|网站|代码)/i;
const RESOURCE_RECOMMENDATION = /(?:recommend|suggest|what\s+should\s+i\s+read|推荐|建议).{0,80}(?:book|course|tutorial|resource|textbook|教材|课程|教程|资料|资源)|\b(?:best|good)\s+(?:book|course|tutorial|resource|textbook)\b|(?:教材|课程|教程|资料|资源)\s*(?:推荐|建议)/i;
const CODING_TASK = /(?:^|\s)(?:write|implement|code|build|fix|debug|refactor|run|deploy|integrate|编写|实现|写代码|修复|调试|重构|部署|接入)(?:\b|\s|$)|(?:function|class|api|bug|stack\s+trace|报错|代码).{0,80}(?:write|fix|debug|implement|编写|实现|修复|调试)|(?:explain|walk\s+me\s+through|what\s+does).{0,30}(?:this|the|my|following)\s+(?:code|function|class|snippet|script)|(?:解释|说明).{0,20}(?:这段|以下|这个).{0,10}(?:代码|函数|类|脚本)/i;
const CODE_CONTEXT = /(?:\b(?:code|function|class|api|bug|stack\s+trace|snippet|script|repository|repo|file|typescript|javascript|python|java|rust|golang|c\+\+|sql|html|css)\b|代码|函数|类|脚本|程序|仓库|报错|堆栈|接口)/i;
const CALCULATION_TASK = /^(?:please\s+)?(?:calculate|compute|evaluate|solve)\b|^(?:请)?(?:计算|求值|求解|解一下|解出)(?:\s|[:：]|$)/i;
const FACTUAL_LOOKUP = /^(?:please\s+)?(?:who|when|where|how\s+(?:many|much)|what\s+(?:year|date)|what(?:'s|\s+is)(?:\s+the)?\s+(?:capital|currency|population|language))\b|^(?:谁(?:是|发明|提出)|什么时候|何时|哪里|哪一年|多少|哪个国家的首都|首都是哪里)/i;
const PERSONAL_TROUBLESHOOTING = /^(?:(?:why|how)\b.{0,40}\b(?:my|our)\b|(?:my|our)\b).{0,80}\b(?:won't|doesn't|isn't|can't|cannot|not\s+\w+ing|broken|failing|stopped|problem|issue)\b|^(?:为什么|怎么|如何).{0,30}(?:我的|我们的).{0,50}(?:坏了|打不开|无法|不能|启动不了|不工作|出问题)/i;
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
const LEARNING_RESET = /^(?:reset|start\s+over|restart|new\s+topic|different\s+topic|switch\s+topics?|change\s+topics?|forget\s+(?:that|this)|重新开始|重置|换个话题|换一个主题|从头来)/i;
const LEARNING_TOPIC_SWITCH = /^(?:let['’]?s|can\s+we|i['’]?d\s+like\s+to|i\s+want\s+to)\s+(?:switch|move|change|start)\b.*\b(?:topic|subject|to)\b/i;
const LEARNING_ACKNOWLEDGEMENT = /^(?:thanks?|thank\s+you|got\s+it|understood|okay|ok|done|finished|complete|completed|all\s+done|that['’]?s\s+enough|明白了?|懂了|完成了?|结束了?)[.!?]?$/i;
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
function decision(intent, trigger, reason) {
	return {
		intent,
		trigger,
		reason
	};
}
/** Classify the first-turn request before choosing a teaching route. */
function classifyLearnIntent(input) {
	const text = normalize(input);
	if (text === "") return decision("not-learn", "unknown", "empty request");
	if (TRANSLATION_TASK.test(text)) return decision("not-learn", "translation-task", "translation or text transformation");
	if (RESOURCE_RECOMMENDATION.test(text) && !RESOURCE_CREATION.test(text)) return decision("not-learn", "resource-recommendation", "request for a resource recommendation");
	if (RESOURCE_SOFTWARE_TASK.test(text)) return decision("not-learn", "coding-task", "software implementation task shaped like a study artifact");
	if (RESOURCE_CREATION.test(text) && !NEGATED_RESOURCE_CREATION.test(text) && !RESOURCE_SOFTWARE_TASK.test(text)) return decision("learn", "resource-creation", "the learner asks for a study artifact");
	if (CODING_TASK.test(text) && !(EXPLICIT_LEARNING.test(text) && !CODE_CONTEXT.test(text))) return decision("not-learn", "coding-task", "implementation or troubleshooting task");
	if (CALCULATION_TASK.test(text) && !EXPLICIT_LEARNING.test(text)) return decision("not-learn", "calculation-task", "calculation or problem-solving task");
	if (PERSONAL_TROUBLESHOOTING.test(text)) return decision("not-learn", "troubleshooting-task", "personal troubleshooting request");
	if (CURRENT_SURVEY.test(text) && !NEWS_CONTENT.test(text)) return decision("learn", "current-topic", "request for a current structured survey");
	if (CURRENT_FACT_LOOKUP.test(text)) return CURRENT_CONCEPTUAL_EXPLANATION.test(text) ? decision("learn", "current-topic", "request to understand a current topic rather than retrieve its value") : decision("not-learn", "current-fact-lookup", "request for a current factual value");
	if (FACTUAL_LOOKUP.test(text)) return decision("not-learn", "factual-lookup", "request for a stable factual value");
	if (NEWS_REQUEST.test(text)) return decision("not-learn", "news-request", "news or breaking-update request");
	if (OPINION_JUDGMENT.test(text)) return decision("not-learn", "opinion-judgment", "request for a verdict or personal take");
	if (LEARNING_ACKNOWLEDGEMENT.test(text)) return decision("not-learn", "unknown", "short acknowledgement is not a new learning request");
	if (CONFUSION_REPAIR.test(text)) return decision("learn", "confusion-repair", "the learner reports a persistent confusion or memory failure");
	if (LEARNING_PATH.test(text)) return decision("learn", "learning-path", "the learner asks how concepts or prerequisites should be sequenced");
	if (DEFINITION.test(text)) return decision("learn", "definition", "definition request");
	if (CURRENT_TOPIC.test(text)) return decision("learn", "current-topic", "request to understand a current or contested topic");
	if (EXPLICIT_OVERVIEW$1.test(text)) return decision("learn", "explicit-overview", "the learner explicitly requests a structured overview");
	if (EXPLICIT_LEARNING.test(text)) return decision("learn", "explicit-learning", "explicit request to learn or understand");
	if (CONCEPTUAL_QUESTION.test(text)) return decision("learn", "conceptual-question", "question about a mechanism, cause, meaning, or contrast");
	if (isBareConcept(text)) return decision("learn", "bare-concept", "short concept name implies a request to understand it");
	return decision("not-learn", "unknown", "no learning trigger was observed");
}
function isLearnIntent(input) {
	return classifyLearnIntent(input).intent === LEARN_INTENT;
}
/** Whether a message explicitly closes or switches away from a learning segment. */
function isLearningBoundary(input) {
	const text = normalize(input);
	if (text === "") return false;
	if (LEARNING_RESET.test(text) || LEARNING_TOPIC_SWITCH.test(text) || LEARNING_ACKNOWLEDGEMENT.test(text)) return true;
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
	if (intent.intent !== "learn") return {
		route: "direct",
		reason: "direct",
		intent
	};
	if (EXPLICIT_OVERVIEW.test(normalized)) return {
		route: "overview",
		reason: "explicit-overview",
		intent
	};
	if (intent.trigger === "current-topic") return {
		route: "overview",
		reason: "current-or-contested",
		intent
	};
	if (INITIAL_TIME_PRESSURE.test(normalized) && CONCRETE_HELP_SHAPE.test(normalized)) return {
		route: "direct",
		reason: "initial-urgent-blocker",
		intent
	};
	if (SHORT_LEARNING_REQUEST.test(normalized)) {
		if (EXPLICIT_BEGINNER.test(normalized)) return {
			route: "teach-minimum",
			reason: "explicit-beginner",
			intent
		};
		if (SPECIFIC_LEARNING_GOAL.test(normalized)) return {
			route: "teach-minimum",
			reason: "specific-goal",
			intent
		};
		return {
			route: "calibrate",
			reason: "short-learning-request",
			intent
		};
	}
	if (EXPLICIT_BEGINNER.test(normalized)) return {
		route: "teach-minimum",
		reason: "explicit-beginner",
		intent
	};
	switch (intent.trigger) {
		case "definition": return {
			route: "teach-minimum",
			reason: "definition",
			intent
		};
		case "bare-concept": return {
			route: "calibrate",
			reason: "bare-concept",
			intent
		};
		case "confusion-repair": return {
			route: "teach-minimum",
			reason: "confusion-repair",
			intent
		};
		case "learning-path": return {
			route: "teach-minimum",
			reason: "learning-path",
			intent
		};
		case "resource-creation": return {
			route: "direct",
			reason: "resource-creation",
			intent
		};
	}
	if (SPECIFIC_LEARNING_GOAL.test(normalized)) return {
		route: "teach-minimum",
		reason: "specific-goal",
		intent
	};
	if (intent.trigger === "explicit-learning") return {
		route: "calibrate",
		reason: "explicit-learning",
		intent
	};
	return {
		route: "direct",
		reason: "direct",
		intent
	};
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
			reason: "durable learner state indicates an active learning segment"
		};
		return {
			...session.decision ?? fresh,
			intent: activeIntent,
			route: "continue",
			reason: "active-segment",
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
export { classifyLearnIntent as a, LEARN_INTENT as i, routeLearningTurn as n, isLearnIntent as o, LEARNING_INTENT_POLICY as r, isLearningBoundary as s, routeLearningRequest as t };

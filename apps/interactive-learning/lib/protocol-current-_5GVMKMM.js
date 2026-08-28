//#region lib/types/protocol-schema.js
function schemaPath(path) {
	return path === "" ? "value" : path;
}
function propertyPath(path, key) {
	return path === "" ? key : `${path}.${key}`;
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Validate the local schema DSL without pulling the host-only tool registry
* into the browser bundle. The same schema object is still passed to dsh-tools
* when the Host registers the model-facing tool.
*/
function validateSchemaValue(schema, value, path) {
	if (schema.oneOf !== void 0) {
		const matches = schema.oneOf.filter((branch) => validateSchemaValue(branch, value, path).length === 0).length;
		return matches === 1 ? [] : [`"${schemaPath(path)}" must match exactly one oneOf branch (matched ${matches})`];
	}
	if (schema.type === void 0) return [];
	if (schema.type === "object") {
		if (!isRecord(value)) return [`"${schemaPath(path)}" must be an object`];
		const properties = schema.properties ?? {};
		const issues = [];
		for (const [key, child] of Object.entries(properties)) {
			const childPath = propertyPath(path, key);
			if (child.required === true && (!Object.hasOwn(value, key) || value[key] === void 0)) {
				issues.push(`missing required property "${childPath}"`);
				continue;
			}
			if (Object.hasOwn(value, key) && value[key] !== void 0) issues.push(...validateSchemaValue(child, value[key], childPath));
		}
		if (schema.additionalProperties === false) {
			for (const key of Object.keys(value)) if (!Object.hasOwn(properties, key)) issues.push(`"${propertyPath(path, key)}" is not a declared property (additionalProperties: false)`);
		}
		return issues;
	}
	if (schema.type === "array") {
		if (!Array.isArray(value)) return [`"${schemaPath(path)}" must be an array`];
		return schema.items === void 0 ? [] : value.flatMap((entry, index) => validateSchemaValue(schema.items, entry, `${path}[${index}]`));
	}
	if (!(schema.type === "null" ? value === null : schema.type === "number" ? typeof value === "number" && Number.isFinite(value) : schema.type === "integer" ? typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) : typeof value === schema.type)) return [`"${schemaPath(path)}" must be a ${schema.type}`];
	if (schema.enum !== void 0 && !schema.enum.includes(value)) return [`"${schemaPath(path)}" must be one of ${JSON.stringify(schema.enum)}`];
	if (Object.hasOwn(schema, "const") && value !== schema.const) return [`"${schemaPath(path)}" must be ${JSON.stringify(schema.const)}`];
	return [];
}
const VISUAL_PROTOCOL_V4 = "dsh-learning/visual@4";
const VISUAL_RESULT_PROTOCOL_V4 = "dsh-learning/visual-result@4";
const LEARNING_VISUAL_STATUSES = ["ready", "unavailable"];
const CHECKPOINT_PROTOCOL = "dsh-learning/checkpoint@1";
const CHECKPOINT_RESULT_PROTOCOL = "dsh-learning/checkpoint-result@1";
const LEARNING_CHECKPOINT_KINDS = [
	"free_text",
	"single_choice",
	"numeric",
	"prediction",
	"code_slot"
];
const LEARNING_CHECKPOINT_EVIDENCE_KINDS = [
	"attempt",
	"prediction",
	"explanation",
	"contrast",
	"transfer"
];
const LEARNING_VISUAL_KINDS_V4 = [
	"plot",
	"node_link",
	"scene_2d",
	"relation",
	"timeline",
	"formula_steps",
	"study_map",
	"recall_deck",
	"data_table",
	"state_transition",
	"sequence_buffer",
	"sequence_diagram",
	"code_trace",
	"field_2d",
	"causal_loop"
];
const MAX_VISUAL_MATH_DEPTH = 4;
const MATH_BINARY_OPERATORS = [
	"add",
	"sub",
	"mul",
	"div",
	"pow",
	"min",
	"max"
];
const MATH_UNARY_OPERATORS = [
	"neg",
	"abs",
	"sqrt",
	"sin",
	"cos",
	"tan",
	"atan",
	"exp",
	"log",
	"sigmoid",
	"relu",
	"leaky_relu",
	"step",
	"normpdf",
	"floor",
	"ceil"
];
const parameter = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			type: "string",
			description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9 or _. No hyphen, because expressions name this id and there a hyphen is subtraction. The id x is reserved for the chart axis.",
			required: true
		},
		label: {
			type: "string",
			required: true
		},
		min: {
			type: "number",
			required: true
		},
		max: {
			type: "number",
			required: true
		},
		step: {
			type: "number",
			required: true
		},
		initial: {
			type: "number",
			required: true
		}
	}
};
function required(schema) {
	return {
		...schema,
		required: true
	};
}
const MATH_SYNTAX = [
	"Infix expression, e.g. `sigmoid(w*x + b)` or `normpdf((x - mu)/sigma)/sigma`.",
	`Operators + - * / ^ and unary -, with parentheses; functions ${MATH_UNARY_OPERATORS.join(", ")} take one argument and ${MATH_BINARY_OPERATORS.join(", ")} take two.`,
	"leaky_relu uses a 0.01 negative slope, step switches from 0 to 1 at zero, and normpdf is the standard normal density.",
	"Names are numbers, x, and declared parameter ids; nothing else, and no assignment or function definition."
].join(" ");
const expression = {
	type: "string",
	description: MATH_SYNTAX
};
const requiredExpression = required(expression);
const mathExpressionDescription = MATH_SYNTAX;
const identifier = {
	type: "string",
	description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -."
};
const tone = {
	type: "string",
	enum: [
		"blue",
		"green",
		"red",
		"orange",
		"purple",
		"gray"
	]
};
const stroke = {
	type: "string",
	enum: [
		"solid",
		"dashed",
		"dotted"
	]
};
const point = {
	type: "object",
	additionalProperties: false,
	properties: {
		x: {
			type: "number",
			required: true
		},
		y: {
			type: "number",
			required: true
		},
		label: { type: "string" }
	}
};
const coordinate = {
	type: "object",
	additionalProperties: false,
	properties: {
		x: {
			type: "number",
			required: true
		},
		y: {
			type: "number",
			required: true
		}
	}
};
const axis = {
	type: "object",
	additionalProperties: false,
	properties: {
		label: { type: "string" },
		min: {
			type: "number",
			required: true
		},
		max: {
			type: "number",
			required: true
		}
	}
};
const curveSeries = {
	type: "object",
	additionalProperties: false,
	properties: {
		type: {
			type: "string",
			const: "curve",
			required: true
		},
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		},
		expression: {
			...requiredExpression,
			description: mathExpressionDescription
		},
		tone,
		stroke
	}
};
const pointSeries = {
	type: "object",
	additionalProperties: false,
	properties: {
		type: {
			type: "string",
			const: "points",
			required: true
		},
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		},
		points: {
			type: "array",
			required: true,
			items: point,
			description: "1 to 256 points."
		},
		tone
	}
};
const lineSeries = {
	type: "object",
	additionalProperties: false,
	properties: {
		type: {
			type: "string",
			const: "line",
			required: true
		},
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		},
		points: {
			type: "array",
			required: true,
			items: point,
			description: "1 to 256 points."
		},
		tone,
		stroke
	}
};
const barSeries = {
	type: "object",
	additionalProperties: false,
	properties: {
		type: {
			type: "string",
			const: "bars",
			required: true
		},
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		},
		points: {
			type: "array",
			required: true,
			items: point,
			description: "1 to 64 bars."
		},
		tone
	}
};
const plotContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "plot",
			required: true,
			description: "Functions, quantitative data, probability, distributions, or tangent/secant geometry on Cartesian axes."
		},
		parameters: {
			type: "array",
			items: parameter,
			description: [
				"Optional; omit for a static plot. Use at most three only when changing the value teaches the mechanism.",
				"A slider is a teaching metaphor that puts the learner's hand on the parameter: ask them to predict first, then drag it.",
				"Do not silently treat movement as assessed evidence; like recall self-rating it has low confidence and unknown correctness until the learner explains what they observed.",
				"可选；滑块用于“先预测、再拖动”的教学比喻，不得静默采集为已判定正确的学习证据。"
			].join(" ")
		},
		xAxis: {
			...axis,
			required: true,
			properties: {
				...axis.properties,
				samples: {
					type: "integer",
					description: "Optional curve samples from 24 to 256."
				}
			}
		},
		yAxis: required(axis),
		series: {
			type: "array",
			required: true,
			items: { oneOf: [
				curveSeries,
				pointSeries,
				lineSeries,
				barSeries
			] },
			description: "1 to 8 series."
		},
		metrics: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					expression: {
						...requiredExpression,
						description: mathExpressionDescription
					},
					digits: { type: "integer" },
					suffix: { type: "string" }
				}
			},
			description: "Optional; at most 4 metrics."
		}
	}
};
const nodeGroup = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		}
	}
};
const node = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		},
		detail: { type: "string" },
		group: { type: "string" },
		tone
	}
};
const edge = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			...identifier,
			required: true
		},
		from: {
			type: "string",
			required: true
		},
		to: {
			type: "string",
			required: true
		},
		label: { type: "string" },
		detail: { type: "string" },
		tone,
		stroke,
		directed: { type: "boolean" }
	}
};
const nodeLinkContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "node_link",
			required: true,
			description: "Networks, fully connected layers, trees, causality, concept maps, state transitions, and dependency topology."
		},
		layout: {
			type: "string",
			enum: [
				"layered",
				"hierarchy",
				"radial"
			],
			required: true
		},
		groups: {
			type: "array",
			items: nodeGroup,
			description: "Optional 1 to 12 ordered layers for layered layout; every node must reference one group."
		},
		nodes: {
			type: "array",
			items: node,
			required: true,
			description: "2 to 48 nodes."
		},
		edges: {
			type: "array",
			items: edge,
			required: true,
			description: "1 to 160 edges; include every semantically required connection."
		}
	}
};
const sceneBase = {
	id: {
		...identifier,
		required: true
	},
	label: { type: "string" },
	detail: { type: "string" },
	tone
};
const sceneElement = { oneOf: [
	{
		type: "object",
		additionalProperties: false,
		properties: {
			type: {
				type: "string",
				const: "point",
				required: true
			},
			...sceneBase,
			x: {
				type: "number",
				required: true
			},
			y: {
				type: "number",
				required: true
			},
			size: { type: "number" }
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			type: {
				type: "string",
				enum: ["segment", "arrow"],
				required: true
			},
			...sceneBase,
			x1: {
				type: "number",
				required: true
			},
			y1: {
				type: "number",
				required: true
			},
			x2: {
				type: "number",
				required: true
			},
			y2: {
				type: "number",
				required: true
			},
			stroke
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			type: {
				type: "string",
				const: "circle",
				required: true
			},
			...sceneBase,
			cx: {
				type: "number",
				required: true
			},
			cy: {
				type: "number",
				required: true
			},
			r: {
				type: "number",
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			type: {
				type: "string",
				const: "rect",
				required: true
			},
			...sceneBase,
			x: {
				type: "number",
				required: true
			},
			y: {
				type: "number",
				required: true
			},
			width: {
				type: "number",
				required: true
			},
			height: {
				type: "number",
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			type: {
				type: "string",
				const: "polygon",
				required: true
			},
			...sceneBase,
			points: {
				type: "array",
				required: true,
				items: coordinate,
				description: "3 to 24 polygon vertices."
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			type: {
				type: "string",
				const: "label",
				required: true
			},
			...sceneBase,
			x: {
				type: "number",
				required: true
			},
			y: {
				type: "number",
				required: true
			},
			text: {
				type: "string",
				required: true
			}
		}
	}
] };
const sceneContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "scene_2d",
			required: true,
			description: "Geometry, vectors, forces, spatial relationships, and annotated scientific schematics."
		},
		xAxis: required(axis),
		yAxis: required(axis),
		grid: { type: "boolean" },
		elements: {
			type: "array",
			items: sceneElement,
			required: true,
			description: "1 to 64 scene elements."
		}
	}
};
const relationSubject = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		},
		detail: { type: "string" },
		tone
	}
};
const relationAxisItem = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		}
	}
};
const relationContent = { oneOf: [
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "relation",
				required: true
			},
			variant: {
				type: "string",
				const: "comparison",
				required: true
			},
			subjects: {
				type: "array",
				items: relationSubject,
				required: true,
				description: "2 to 4 subjects."
			},
			rows: {
				type: "array",
				required: true,
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						id: {
							...identifier,
							required: true
						},
						label: {
							type: "string",
							required: true
						},
						detail: { type: "string" },
						cells: {
							type: "array",
							required: true,
							items: {
								type: "object",
								additionalProperties: false,
								properties: {
									subjectId: {
										type: "string",
										required: true
									},
									value: {
										type: "string",
										required: true
									},
									tone
								}
							},
							description: "1 to 4 cells; each subjectId must reference a declared subject."
						}
					}
				},
				description: "1 to 16 comparison rows."
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "relation",
				required: true
			},
			variant: {
				type: "string",
				const: "matrix",
				required: true
			},
			rows: {
				type: "array",
				items: relationAxisItem,
				required: true,
				description: "1 to 10 matrix rows."
			},
			columns: {
				type: "array",
				items: relationAxisItem,
				required: true,
				description: "1 to 10 matrix columns."
			},
			cells: {
				type: "array",
				required: true,
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						id: {
							...identifier,
							required: true
						},
						rowId: {
							type: "string",
							required: true
						},
						columnId: {
							type: "string",
							required: true
						},
						label: {
							type: "string",
							required: true
						},
						detail: { type: "string" },
						tone
					}
				},
				description: "1 to 64 matrix cells; rowId and columnId must reference declared axes."
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			kind: {
				type: "string",
				const: "relation",
				required: true
			},
			variant: {
				type: "string",
				const: "sets",
				required: true
			},
			sets: {
				type: "array",
				items: relationSubject,
				required: true,
				description: "2 to 3 sets."
			},
			items: {
				type: "array",
				required: true,
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						id: {
							...identifier,
							required: true
						},
						label: {
							type: "string",
							required: true
						},
						setIds: {
							type: "array",
							items: { type: "string" },
							required: true,
							description: "1 to 3 unique ids referencing declared sets."
						},
						detail: { type: "string" }
					}
				},
				description: "1 to 24 set items."
			}
		}
	}
] };
const timelineContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "timeline",
			required: true,
			description: "Ordered historical events, scientific discoveries, biographies, eras, or other chronology where time order is the structure."
		},
		orientation: {
			type: "string",
			enum: ["horizontal", "vertical"]
		},
		events: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					time: {
						type: "string",
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					detail: { type: "string" },
					position: {
						type: "number",
						description: "Optional normalized position from 0 to 1. Provide it for every event or omit it for every event."
					},
					tone
				}
			},
			required: true,
			description: "2 to 32 events in chronological order."
		},
		eras: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					startEventId: {
						type: "string",
						required: true
					},
					endEventId: {
						type: "string",
						required: true
					},
					detail: { type: "string" },
					tone
				}
			},
			description: "Optional 1 to 8 eras; startEventId and endEventId must reference declared events in order."
		}
	}
};
const formulaStepsContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "formula_steps",
			required: true,
			description: "A derivation, algebraic transformation, proof chain, or symbolic simplification where the rule between steps matters. Not for merely recalling one formula."
		},
		notation: {
			type: "string",
			description: "Optional short notation key used across the derivation."
		},
		steps: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					expression: {
						type: "string",
						required: true,
						description: "One LaTeX display expression without dollar delimiters; use commands such as \\lim_{h \\to 0} and ^{\\prime}."
					},
					label: { type: "string" },
					rule: { type: "string" },
					detail: { type: "string" },
					tone
				}
			},
			description: "2 to 16 formula steps."
		},
		conclusion: { type: "string" }
	}
};
const studyMapContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "study_map",
			required: true,
			description: "A navigable overview of supplied material, or the Host-materialized state of saved learner concepts."
		},
		view: {
			type: "string",
			enum: ["material", "concepts"],
			description: "Use concepts to request the saved concept-card state; the Host supplies its sections and cards."
		},
		sourceLabel: {
			type: "string",
			required: true
		},
		goal: { type: "string" },
		sections: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					anchor: {
						type: "string",
						description: "Human-readable source location, such as Chapter 2 or pp. 18–23."
					},
					summary: { type: "string" }
				}
			},
			description: "1 to 16 source sections."
		},
		concepts: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					sectionId: {
						type: "string",
						required: true
					},
					detail: { type: "string" },
					conceptSlug: {
						type: "string",
						description: "Saved concept-card identity in concepts view."
					},
					mastery: {
						type: "string",
						enum: [
							"unseen",
							"emerging",
							"transfer"
						]
					},
					due: {
						type: "string",
						description: "Next review date in YYYY-MM-DD form."
					},
					stale: {
						type: "boolean",
						description: "Whether one or more saved source anchors no longer resolve."
					},
					prerequisiteIds: {
						type: "array",
						items: { type: "string" },
						description: "Optional; at most 8 unique declared concept ids, excluding this concept, with no cycles."
					},
					role: {
						type: "string",
						enum: [
							"foundation",
							"core",
							"extension",
							"practice"
						]
					},
					tone
				}
			},
			description: "1 to 48 concepts; every sectionId must reference a declared section."
		}
	}
};
const recallDeckContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "recall_deck",
			required: true,
			description: "A requested flashcard or active-recall set with hidden answers, hints, and local review state. Use only after the relevant material is known."
		},
		instructions: { type: "string" },
		cards: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					prompt: {
						type: "string",
						required: true
					},
					answer: {
						type: "string",
						required: true
					},
					hint: { type: "string" },
					tags: {
						type: "array",
						items: { type: "string" },
						description: "Optional; at most 6 unique labels."
					}
				}
			},
			description: "2 to 32 recall cards."
		}
	}
};
const tableValue = { oneOf: [
	{ type: "string" },
	{ type: "number" },
	{ type: "boolean" },
	{ type: "null" }
] };
const dataTableContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "data_table",
			required: true,
			description: "A typed record table for inspecting real data, filtering rows, sorting values, marking outliers, or linking tabular values to a chart."
		},
		columns: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					type: {
						type: "string",
						enum: [
							"string",
							"number",
							"boolean",
							"date"
						],
						required: true
					},
					unit: { type: "string" }
				}
			},
			description: "1 to 24 typed columns."
		},
		rows: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					detail: { type: "string" },
					cells: {
						type: "array",
						required: true,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								columnId: {
									type: "string",
									required: true
								},
								value: {
									...tableValue,
									required: true
								}
							}
						},
						description: "One cell per declared column; columnId must reference a declared column."
					}
				}
			},
			description: "1 to 128 records."
		},
		outlierIds: {
			type: "array",
			items: { type: "string" },
			description: "Optional row ids to emphasize as anomalies."
		},
		initialSort: {
			type: "object",
			additionalProperties: false,
			properties: {
				columnId: {
					type: "string",
					required: true
				},
				direction: {
					type: "string",
					enum: ["asc", "desc"],
					required: true
				}
			}
		},
		initialFilter: {
			type: "object",
			additionalProperties: false,
			properties: {
				columnId: {
					type: "string",
					required: true
				},
				operator: {
					type: "string",
					enum: [
						"equals",
						"not_equals",
						"contains",
						"gt",
						"gte",
						"lt",
						"lte"
					],
					required: true
				},
				value: {
					...tableValue,
					required: true
				}
			}
		},
		chart: {
			type: "object",
			additionalProperties: false,
			properties: {
				type: {
					type: "string",
					enum: [
						"line",
						"bar",
						"scatter"
					],
					required: true
				},
				xColumnId: {
					type: "string",
					required: true
				},
				yColumnId: {
					type: "string",
					required: true
				},
				seriesColumnId: { type: "string" }
			}
		}
	}
};
const stateTransitionContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "state_transition",
			required: true,
			description: "A state machine where an event triggers a transition from one explicit state to another, optionally with guard and action."
		},
		states: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					detail: { type: "string" },
					tone,
					initial: { type: "boolean" },
					final: { type: "boolean" }
				}
			},
			description: "2 to 32 states; mark initial/final states when the lifecycle has them."
		},
		transitions: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					from: {
						type: "string",
						required: true
					},
					to: {
						type: "string",
						required: true
					},
					trigger: {
						type: "string",
						required: true
					},
					guard: { type: "string" },
					action: { type: "string" },
					detail: { type: "string" },
					tone
				}
			},
			description: "1 to 96 transitions; from and to must reference declared states."
		},
		steps: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					currentStateId: {
						type: "string",
						required: true
					},
					transitionId: { type: "string" },
					description: { type: "string" }
				}
			},
			description: "Optional 2 to 16 execution steps; each names the current state and optional transition just taken."
		}
	}
};
const sequenceBufferContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "sequence_buffer",
			required: true,
			description: "Discrete indexed slots with moving pointers, highlighted intervals, and snapshots for array, window, parsing, or protocol algorithms."
		},
		slots: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					index: {
						type: "integer",
						required: true
					},
					value: {
						...tableValue,
						required: true
					},
					label: { type: "string" },
					tone
				}
			},
			description: "1 to 128 ordered slots; index values must be unique."
		},
		pointers: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					index: {
						type: "integer",
						required: true
					},
					tone
				}
			},
			description: "Optional 1 to 8 named pointers."
		},
		ranges: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					start: {
						type: "integer",
						required: true
					},
					end: {
						type: "integer",
						required: true
					},
					tone
				}
			},
			description: "Optional 1 to 8 inclusive index intervals."
		},
		steps: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					description: { type: "string" },
					slots: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								slotId: {
									type: "string",
									required: true
								},
								value: { ...tableValue }
							}
						}
					},
					pointers: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								pointerId: {
									type: "string",
									required: true
								},
								index: {
									type: "integer",
									required: true
								}
							}
						}
					},
					ranges: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								rangeId: {
									type: "string",
									required: true
								},
								start: {
									type: "integer",
									required: true
								},
								end: {
									type: "integer",
									required: true
								}
							}
						}
					}
				}
			},
			description: "Optional 2 to 16 snapshots. Include only the collections that change in each snapshot."
		}
	}
};
const sequenceDiagramContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "sequence_diagram",
			required: true,
			description: "Ordered messages exchanged by API clients, services, protocols, cells, or collaborating roles."
		},
		participants: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					detail: { type: "string" },
					tone
				}
			},
			description: "2 to 16 lifeline participants."
		},
		messages: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					from: {
						type: "string",
						required: true
					},
					to: {
						type: "string",
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					type: {
						type: "string",
						enum: [
							"sync",
							"async",
							"return",
							"self"
						],
						required: true
					},
					detail: { type: "string" },
					tone
				}
			},
			description: "1 to 96 messages in top-to-bottom order; from and to must reference participants."
		}
	}
};
const codeTraceContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "code_trace",
			required: true,
			description: "Source lines paired with execution steps, current line, variable values, call stack, and output."
		},
		language: {
			type: "string",
			required: true
		},
		code: {
			type: "string",
			required: true,
			description: "Complete source text shown above or beside the trace."
		},
		lines: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					number: {
						type: "integer",
						required: true
					},
					text: {
						type: "string",
						required: true
					}
				}
			},
			description: "1 to 256 numbered source lines."
		},
		steps: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					currentLine: {
						type: "integer",
						required: true
					},
					variables: {
						type: "array",
						required: true,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								name: {
									type: "string",
									required: true
								},
								value: {
									...tableValue,
									required: true
								},
								type: { type: "string" }
							}
						}
					},
					stack: {
						type: "array",
						required: true,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								id: {
									...identifier,
									required: true
								},
								function: {
									type: "string",
									required: true
								},
								line: { type: "integer" }
							}
						}
					},
					output: { type: "string" },
					description: { type: "string" }
				}
			},
			description: "2 to 32 execution snapshots."
		}
	}
};
const fieldGrid = {
	type: "object",
	additionalProperties: false,
	properties: {
		columns: {
			type: "integer",
			required: true
		},
		rows: {
			type: "integer",
			required: true
		}
	}
};
const scalarFieldSamples = {
	type: "object",
	additionalProperties: false,
	properties: {
		...fieldGrid.properties,
		values: {
			type: "array",
			items: { type: "number" },
			required: true,
			description: "Flattened row-major values; length must equal rows * columns."
		}
	}
};
const vectorFieldSamples = {
	type: "object",
	additionalProperties: false,
	properties: {
		...fieldGrid.properties,
		u: {
			type: "array",
			items: { type: "number" },
			required: true,
			description: "Flattened horizontal components; length must equal rows * columns."
		},
		v: {
			type: "array",
			items: { type: "number" },
			required: true,
			description: "Flattened vertical components; length must equal rows * columns."
		}
	}
};
const field2DContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "field_2d",
			required: true,
			description: "A sampled or mathematically defined scalar heatmap, contour field, vector field, or gradient over two axes."
		},
		xAxis: {
			...axis,
			required: true,
			properties: {
				...axis.properties,
				samples: { type: "integer" }
			}
		},
		yAxis: {
			...axis,
			required: true,
			properties: {
				...axis.properties,
				samples: { type: "integer" }
			}
		},
		scalar: {
			type: "object",
			additionalProperties: false,
			properties: {
				samples: scalarFieldSamples,
				expression: {
					...expression,
					description: `Scalar field over x and y. ${MATH_SYNTAX}`
				},
				min: { type: "number" },
				max: { type: "number" }
			}
		},
		vector: {
			type: "object",
			additionalProperties: false,
			properties: {
				samples: vectorFieldSamples,
				expression: {
					type: "object",
					additionalProperties: false,
					properties: {
						u: {
							...requiredExpression,
							description: `Horizontal component using x and y. ${MATH_SYNTAX}`
						},
						v: {
							...requiredExpression,
							description: `Vertical component using x and y. ${MATH_SYNTAX}`
						}
					}
				}
			}
		}
	}
};
const causalLoopContent = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "causal_loop",
			required: true,
			description: "A causal feedback diagram with positive or negative polarity, optional delay, and named reinforcing or balancing loops."
		},
		variables: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					detail: { type: "string" },
					tone
				}
			},
			description: "2 to 32 causal variables."
		},
		links: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					from: {
						type: "string",
						required: true
					},
					to: {
						type: "string",
						required: true
					},
					polarity: {
						type: "string",
						enum: ["positive", "negative"],
						required: true
					},
					delay: { type: "number" },
					label: { type: "string" },
					detail: { type: "string" },
					tone
				}
			},
			description: "1 to 96 directed links; from and to must reference variables."
		},
		loops: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					type: {
						type: "string",
						enum: ["reinforcing", "balancing"],
						required: true
					},
					linkIds: {
						type: "array",
						items: { type: "string" },
						required: true
					},
					detail: { type: "string" },
					tone
				}
			},
			description: "Optional 1 to 12 named feedback loops; linkIds must reference declared links in cycle order."
		}
	}
};
const LEARNING_VISUAL_SEQUENCE_SCHEMA_V4 = {
	type: "object",
	additionalProperties: false,
	properties: {
		initialFrameId: { type: "string" },
		frames: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						...identifier,
						required: true
					},
					label: {
						type: "string",
						required: true
					},
					description: { type: "string" },
					focusIds: {
						type: "array",
						items: { type: "string" },
						required: true,
						description: "At most 64 unique ids already declared by content."
					}
				}
			},
			description: "2 to 12 sequence frames."
		}
	}
};
const LEARNING_CHECKPOINT_OPTION_SCHEMA_V1 = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			...identifier,
			required: true
		},
		label: {
			type: "string",
			required: true
		}
	}
};
const LEARNING_CHECKPOINT_RESPONSE_SCHEMA_V1 = { oneOf: [
	{
		type: "object",
		additionalProperties: false,
		properties: { text: {
			type: "string",
			required: true
		} }
	},
	{
		type: "object",
		additionalProperties: false,
		properties: { optionId: {
			...identifier,
			required: true
		} }
	},
	{
		type: "object",
		additionalProperties: false,
		properties: { number: {
			type: "number",
			required: true
		} }
	}
] };
const LEARNING_CHECKPOINT_RESULT_SCHEMA_V1 = { oneOf: [
	{
		type: "object",
		additionalProperties: false,
		properties: {
			protocol: {
				type: "string",
				const: CHECKPOINT_RESULT_PROTOCOL,
				required: true
			},
			checkpointId: {
				type: "string",
				required: true
			},
			status: {
				type: "string",
				const: "submitted",
				required: true
			},
			response: {
				...LEARNING_CHECKPOINT_RESPONSE_SCHEMA_V1,
				required: true
			},
			receiptId: {
				type: "string",
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			protocol: {
				type: "string",
				const: CHECKPOINT_RESULT_PROTOCOL,
				required: true
			},
			checkpointId: {
				type: "string",
				required: true
			},
			status: {
				type: "string",
				const: "skipped",
				required: true
			},
			reason: {
				type: "string",
				enum: [
					"learner-skipped",
					"client-unavailable",
					"client-response-timeout",
					"host-unavailable",
					"provider-failure"
				]
			},
			receiptId: {
				type: "string",
				required: true
			}
		}
	},
	{
		type: "object",
		additionalProperties: false,
		properties: {
			protocol: {
				type: "string",
				const: CHECKPOINT_RESULT_PROTOCOL,
				required: true
			},
			checkpointId: {
				type: "string",
				required: true
			},
			status: {
				type: "string",
				const: "cancelled",
				required: true
			},
			reason: {
				type: "string",
				enum: [
					"learner-cancelled",
					"session-aborted",
					"plugin-disposed"
				]
			},
			receiptId: {
				type: "string",
				required: true
			}
		}
	}
] };
const LEARNING_VISUAL_CONTENT_SCHEMAS_V4 = {
	plot: plotContent,
	node_link: nodeLinkContent,
	scene_2d: sceneContent,
	relation: relationContent,
	timeline: timelineContent,
	formula_steps: formulaStepsContent,
	study_map: studyMapContent,
	recall_deck: recallDeckContent,
	data_table: dataTableContent,
	state_transition: stateTransitionContent,
	sequence_buffer: sequenceBufferContent,
	sequence_diagram: sequenceDiagramContent,
	code_trace: codeTraceContent,
	field_2d: field2DContent,
	causal_loop: causalLoopContent
};
const visualContentSchemaV4 = { oneOf: [
	plotContent,
	nodeLinkContent,
	sceneContent,
	relationContent,
	timelineContent,
	formulaStepsContent,
	studyMapContent,
	recallDeckContent,
	dataTableContent,
	stateTransitionContent,
	sequenceBufferContent,
	sequenceDiagramContent,
	codeTraceContent,
	field2DContent,
	causalLoopContent
] };
const LEARNING_VISUAL_SCHEMA_V4 = {
	type: "object",
	additionalProperties: false,
	properties: {
		protocol: {
			type: "string",
			const: VISUAL_PROTOCOL_V4,
			required: true
		},
		title: {
			type: "string",
			required: true
		},
		description: { type: "string" },
		content: {
			...visualContentSchemaV4,
			required: true
		},
		sequence: LEARNING_VISUAL_SEQUENCE_SCHEMA_V4,
		fallbackMarkdown: { type: "string" }
	}
};
const LEARNING_VISUAL_RESULT_SCHEMA_V4 = {
	type: "object",
	additionalProperties: false,
	properties: {
		protocol: {
			type: "string",
			const: VISUAL_RESULT_PROTOCOL_V4,
			required: true
		},
		status: {
			type: "string",
			enum: LEARNING_VISUAL_STATUSES,
			required: true
		},
		/** Host materialization for a saved-concepts study map. */
		content: visualContentSchemaV4
	}
};
const LEARNING_CHECKPOINT_SCHEMA_V1 = {
	type: "object",
	additionalProperties: false,
	properties: {
		protocol: {
			type: "string",
			const: CHECKPOINT_PROTOCOL,
			required: true
		},
		kind: {
			type: "string",
			enum: LEARNING_CHECKPOINT_KINDS,
			required: true
		},
		prompt: {
			type: "string",
			required: true
		},
		context: { type: "string" },
		expectedEvidence: {
			type: "string",
			enum: LEARNING_CHECKPOINT_EVIDENCE_KINDS,
			required: true
		},
		options: {
			type: "array",
			items: LEARNING_CHECKPOINT_OPTION_SCHEMA_V1
		},
		fallbackMarkdown: {
			type: "string",
			required: true
		}
	}
};
const visualJsonSchemaV4 = LEARNING_VISUAL_SCHEMA_V4;
const visualResultJsonSchemaV4 = LEARNING_VISUAL_RESULT_SCHEMA_V4;
const checkpointJsonSchemaV1 = LEARNING_CHECKPOINT_SCHEMA_V1;
const checkpointResultJsonSchemaV1 = LEARNING_CHECKPOINT_RESULT_SCHEMA_V1;
/** Generated structural validator; semantic bounds and cross-references remain in protocol.ts. */
function validateLearningVisualSchemaV4(value) {
	return validateSchemaValue(visualJsonSchemaV4, value, "visual");
}
function validateLearningVisualResultSchemaV4(value) {
	return validateSchemaValue(visualResultJsonSchemaV4, value, "visualResult");
}
/** Generated structural validator; answer-free copy checks remain in protocol.ts. */
function validateLearningCheckpointSchemaV1(value) {
	return validateSchemaValue(checkpointJsonSchemaV1, value, "checkpoint");
}
/** Generated structural validator for the closed checkpoint receipt union. */
function validateLearningCheckpointResultSchemaV1(value) {
	return validateSchemaValue(checkpointResultJsonSchemaV1, value, "checkpointResult");
}
function learningVisualParametersV4(kind) {
	return {
		protocol: {
			type: "string",
			const: VISUAL_PROTOCOL_V4,
			required: true
		},
		title: {
			type: "string",
			description: "Concise visible and accessible visual title.",
			required: true
		},
		description: {
			type: "string",
			description: "Optional one-sentence exploration hint; do not repeat surrounding prose."
		},
		content: required(LEARNING_VISUAL_CONTENT_SCHEMAS_V4[kind]),
		sequence: LEARNING_VISUAL_SEQUENCE_SCHEMA_V4,
		fallbackMarkdown: {
			type: "string",
			description: "Optional concise text equivalent for accessibility or an unavailable renderer."
		}
	};
}
/**
* The whole checkpoint payload in one tool, branched on `kind`.
*
* The retired two-step form asked the model to select a kind, then exposed a
* kind-specific payload schema on the next step. That pattern is worth a full
* model round trip for the visual tool, whose fifteen content schemas are some
* five thousand tokens together; here all five branches come to about a
* thousand characters, so the round trip bought nothing. The answer-free
* guarantee never came from the selector anyway — the closed schema simply has
* no correct-answer or rubric field to fill in.
*/
function learningCheckpointParametersOneStepV1() {
	return {
		protocol: {
			type: "string",
			const: CHECKPOINT_PROTOCOL,
			required: true
		},
		prompt: {
			type: "string",
			required: true,
			description: "One self-contained, answer-free prompt for the current teaching move."
		},
		context: { type: "string" },
		expectedEvidence: {
			type: "string",
			enum: LEARNING_CHECKPOINT_EVIDENCE_KINDS,
			required: true,
			description: "What the response demonstrates: attempt, prediction, explanation, contrast, or fresh transfer."
		},
		fallbackMarkdown: {
			type: "string",
			required: true,
			description: "Self-sufficient ordinary-conversation fallback; never include the answer."
		},
		kind: {
			type: "string",
			enum: LEARNING_CHECKPOINT_KINDS,
			required: true,
			description: "Response shape: free_text=short prose; single_choice=one label; numeric=one number; prediction=what happens next; code_slot=one small code fragment."
		},
		options: {
			type: "array",
			items: LEARNING_CHECKPOINT_OPTION_SCHEMA_V1,
			description: "Required for kind=single_choice and forbidden otherwise: two to eight answer-free choices. No correct-answer or rubric field exists."
		}
	};
}
//#endregion
//#region lib/types/math-parser.js
/**
* Parse an infix math expression into the payload AST.
*
* The AST itself is a good runtime representation and a terrible schema. Written
* out as JSON Schema it has to be inlined once per level, so a depth-4
* expression expands to roughly a hundred node definitions, each carrying the
* full operator enums. Measured, that expansion was about 95% of the `plot` and
* `field_2d` tool schemas — 118k of the 160k characters across all fifteen
* visual kinds. It is also the least natural thing for a model to write:
* `sigmoid(w*x + b)` becomes eleven nested objects.
*
* So the wire format is the string and the AST stays internal. The tool parses
* at its boundary, which means the persisted payload, the validator, the
* compiler, and every renderer are unchanged, and a replayed session from
* before this change still holds exactly the AST it always did.
*
* Deliberately not `eval` or `new Function`: the payload is model-authored, so
* it is parsed as data and never reaches an interpreter.
* @module @dsh-portable/interactive-learning/src/math-parser
*/
const BINARY = new Set(MATH_BINARY_OPERATORS);
const UNARY = new Set(MATH_UNARY_OPERATORS);
/** Raised for a source string that is not a well-formed expression. */
var MathParseError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "MathParseError";
	}
};
/**
* Names stop at a hyphen, so `-` is always subtraction.
*
* Identifiers elsewhere in a visual payload may contain hyphens, but a plot or
* field parameter id may not, because `w-1` cannot mean both a variable and a
* subtraction. Resolving that against the declared names was possible and was
* the first thing tried; it also silently rewrote `normpdf(x)` to the variable
* `n` in any plot that happened to declare a parameter called `n`. A grammar
* that needs to know the variables before it can tokenize is the wrong grammar.
*/
function readName(source, start) {
	const match = /^[a-z][a-z0-9_]*/.exec(source.slice(start));
	return match === null ? "" : match[0];
}
function skip(cursor) {
	while (cursor.at < cursor.source.length && /\s/.test(cursor.source[cursor.at])) cursor.at += 1;
}
function expect(cursor, character) {
	skip(cursor);
	if (cursor.source[cursor.at] !== character) throw new MathParseError(`expected ${character} at position ${String(cursor.at)}`);
	cursor.at += 1;
}
/** `expr := term (('+' | '-') term)*` */
function parseExpression(cursor) {
	let left = parseTerm(cursor);
	for (;;) {
		skip(cursor);
		const character = cursor.source[cursor.at];
		if (character !== "+" && character !== "-") return left;
		cursor.at += 1;
		left = {
			op: character === "+" ? "add" : "sub",
			left,
			right: parseTerm(cursor)
		};
	}
}
/** `term := factor (('*' | '/') factor)*` */
function parseTerm(cursor) {
	let left = parseFactor(cursor);
	for (;;) {
		skip(cursor);
		const character = cursor.source[cursor.at];
		if (character !== "*" && character !== "/") return left;
		cursor.at += 1;
		left = {
			op: character === "*" ? "mul" : "div",
			left,
			right: parseFactor(cursor)
		};
	}
}
/** `factor := unary ('^' factor)?` — right associative, as exponentiation is. */
function parseFactor(cursor) {
	const left = parseUnary(cursor);
	skip(cursor);
	if (cursor.source[cursor.at] !== "^") return left;
	cursor.at += 1;
	return {
		op: "pow",
		left,
		right: parseFactor(cursor)
	};
}
/** `unary := '-' unary | primary` */
function parseUnary(cursor) {
	skip(cursor);
	if (cursor.source[cursor.at] !== "-") return parsePrimary(cursor);
	cursor.at += 1;
	return {
		op: "neg",
		value: parseUnary(cursor)
	};
}
/** `primary := number | call | name | '(' expr ')'` */
function parsePrimary(cursor) {
	skip(cursor);
	const { source } = cursor;
	if (cursor.at >= source.length) throw new MathParseError("expression ended early");
	if (source[cursor.at] === "(") {
		cursor.at += 1;
		const inner = parseExpression(cursor);
		expect(cursor, ")");
		return inner;
	}
	const number = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(cursor.at));
	if (number !== null) {
		cursor.at += number[0].length;
		return {
			op: "constant",
			value: Number(number[0])
		};
	}
	if (!/[a-z]/.test(source[cursor.at])) throw new MathParseError(`unexpected ${JSON.stringify(source[cursor.at])} at position ${String(cursor.at)}`);
	const name = readName(source, cursor.at);
	cursor.at += name.length;
	skip(cursor);
	if (source[cursor.at] !== "(") return {
		op: "variable",
		name
	};
	cursor.at += 1;
	const args = [parseExpression(cursor)];
	for (;;) {
		skip(cursor);
		if (source[cursor.at] !== ",") break;
		cursor.at += 1;
		args.push(parseExpression(cursor));
	}
	expect(cursor, ")");
	if (UNARY.has(name)) {
		if (args.length !== 1) throw new MathParseError(`${name} takes one argument`);
		return {
			op: name,
			value: args[0]
		};
	}
	if (BINARY.has(name)) {
		if (args.length !== 2) throw new MathParseError(`${name} takes two arguments`);
		return {
			op: name,
			left: args[0],
			right: args[1]
		};
	}
	throw new MathParseError(`unknown function ${name}`);
}
/**
* Parse one infix expression.
* @param source - The expression as written, e.g. `sigmoid(w*x + b)`.
* @returns the equivalent AST.
* @throws MathParseError when the source is not a well-formed expression.
*/
function parseMathExpression(source) {
	if (source.length > 512) throw new MathParseError("expression exceeds 512 characters");
	const cursor = {
		source: source.toLowerCase(),
		at: 0
	};
	const parsed = parseExpression(cursor);
	skip(cursor);
	if (cursor.at !== cursor.source.length) throw new MathParseError(`unexpected trailing input at position ${String(cursor.at)}`);
	return parsed;
}
//#endregion
//#region lib/types/protocol-errors.js
/** Stable error type shared by current and compatibility protocol parsers. */
var LearningProtocolError = class extends Error {
	issues;
	code = "INVALID_LEARNING_ACTIVITY";
	constructor(issues) {
		super(`Invalid Learning Activity: ${issues.join("; ")}`);
		this.issues = issues;
		this.name = "LearningProtocolError";
	}
};
//#endregion
//#region lib/types/protocol-current.js
/** Current visual/checkpoint protocol shared by the Host, Agent, and Client. */
const RECALL_FEEDBACK_PROTOCOL_V1 = "dsh-learning/recall-feedback@1";
const CHECKPOINT_TRANSPORT_PROTOCOL = "dsh-learning/checkpoint-wait@1";
const MAX_ACTIVITY_BYTES = 65536;
const MAX_RESPONSE_BYTES = 32768;
const MAX_MATH_NODES = 64;
/** A learner's explicit recall interaction, sent from the visual Client to Host. */
const LEARNING_RECALL_STATUSES = [
	"revealed",
	"mastered",
	"review"
];
function record(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function onlyKeys(value, allowed, path, issues) {
	for (const key of Object.keys(value)) if (!allowed.includes(key)) issues.push(`${path}.${key} is not supported`);
}
function text(value, path, issues, max = 8e3) {
	if (typeof value !== "string" || value.trim() === "") {
		issues.push(`${path} must be a non-empty string`);
		return false;
	}
	if (value.length > max) issues.push(`${path} exceeds ${String(max)} characters`);
	return true;
}
function boundedIdentity(value, path, issues, max = 512) {
	if (typeof value !== "string" || value.length === 0 || value.length > max || value.trim() !== value || /[\u0000-\u001F\u007F]/u.test(value)) {
		issues.push(`${path} must be a non-empty bounded identity`);
		return false;
	}
	return true;
}
function finite(value, path, issues) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		issues.push(`${path} must be a finite number`);
		return false;
	}
	return true;
}
function id(value, path, issues) {
	if (typeof value !== "string" || !/^[a-z][a-z0-9_-]{0,31}$/.test(value)) {
		issues.push(`${path} must match ^[a-z][a-z0-9_-]{0,31}$`);
		return false;
	}
	return true;
}
function uniqueIds(values, path, issues) {
	const seen = /* @__PURE__ */ new Set();
	for (const [index, value] of values.entries()) {
		if (typeof value.id !== "string") continue;
		if (seen.has(value.id)) issues.push(`${path}[${String(index)}].id duplicates ${value.id}`);
		seen.add(value.id);
	}
}
function jsonBytes(value) {
	try {
		return new TextEncoder().encode(JSON.stringify(value)).byteLength;
	} catch {
		return;
	}
}
function validateMath(value, parameterIds, path, issues, allowX = true, maxDepth = 4) {
	const binary = new Set(MATH_BINARY_OPERATORS);
	const unary = new Set(MATH_UNARY_OPERATORS);
	if (typeof value !== "string") {
		issues.push(`${path} must be an expression string`);
		return;
	}
	let root;
	try {
		root = parseMathExpression(value);
	} catch (cause) {
		issues.push(`${path} is not a valid expression: ${cause instanceof MathParseError ? cause.message : String(cause)}`);
		return;
	}
	const stack = [{
		value: root,
		path,
		depth: 1
	}];
	let nodes = 0;
	while (stack.length > 0) {
		const node = stack.pop();
		nodes += 1;
		if (nodes > 64) {
			issues.push(`${path} exceeds ${String(64)} AST nodes`);
			return;
		}
		if (node.depth > maxDepth) {
			issues.push(`${node.path} exceeds AST depth ${String(maxDepth)}`);
			return;
		}
		if (!record(node.value) || typeof node.value.op !== "string") {
			issues.push(`${node.path} must be a mathematical AST node`);
			continue;
		}
		const expression = node.value;
		const op = expression.op;
		if (op === "constant") {
			onlyKeys(expression, ["op", "value"], node.path, issues);
			if (finite(expression.value, `${node.path}.value`, issues) && Math.abs(expression.value) > 0xe8d4a51000) issues.push(`${node.path}.value exceeds the numeric limit`);
		} else if (op === "variable") {
			onlyKeys(expression, ["op", "name"], node.path, issues);
			if (typeof expression.name !== "string" || !parameterIds.has(expression.name) && !(allowX && expression.name === "x")) issues.push(`${node.path}.name must be ${allowX ? "x or " : ""}a declared parameter id`);
		} else if (binary.has(op)) {
			onlyKeys(expression, [
				"op",
				"left",
				"right"
			], node.path, issues);
			stack.push({
				value: expression.right,
				path: `${node.path}.right`,
				depth: node.depth + 1
			}, {
				value: expression.left,
				path: `${node.path}.left`,
				depth: node.depth + 1
			});
		} else if (unary.has(op)) {
			onlyKeys(expression, ["op", "value"], node.path, issues);
			stack.push({
				value: expression.value,
				path: `${node.path}.value`,
				depth: node.depth + 1
			});
		} else issues.push(`${node.path}.op is unknown`);
	}
}
function integer(value, path, issues, min = 0) {
	if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
		issues.push(`${path} must be an integer >= ${String(min)}`);
		return false;
	}
	return true;
}
function token(value, path, issues) {
	if (typeof value !== "string" || value.length < 1 || value.length > 128 || !/^[A-Za-z0-9_-]+$/.test(value)) {
		issues.push(`${path} must be an opaque token of 1 to 128 URL-safe characters`);
		return false;
	}
	return true;
}
const CHECKPOINT_RAW_HTML = /<(?:!DOCTYPE\b|!--|\/?[A-Za-z][^<>]*>)/i;
const CHECKPOINT_LEAKAGE_COPY = /\b(?:correct\s+answer|model\s+answer|answer\s+key|(?:the\s+)?answer\s*(?:is|was|[:：])|solution\s*[:：]|expected\s+(?:answer|response|result)\s*[:：]|grading\s+rubric|scoring\s+rubric|future\s+(?:step|question)|next\s+question\s*:)|(?:正确|标准|参考|模型)(?:答案|解答)|标准解\s*[:：]?|(?:答案|解答)\s*[:：]|答案(?:是|为)|评分(?:标准|细则)|下一(?:步|题|个问题)|后续步骤|未来步骤/iu;
/** Canonical fail-closed predicate shared by protocol parsing and Client fallback extraction. */
function isLearningCheckpointDisplayTextSafe(value) {
	return !CHECKPOINT_RAW_HTML.test(value) && !CHECKPOINT_LEAKAGE_COPY.test(value);
}
function checkpointDisplayText(value, path, issues, max) {
	const valid = text(value, path, issues, max);
	if (valid && !isLearningCheckpointDisplayTextSafe(value)) {
		issues.push(`${path} must not contain raw HTML, an answer key, scoring rubric, or future-step copy`);
		return false;
	}
	return valid;
}
/** Strict, answer-free protocol for one optional learner checkpoint. */
function parseLearningCheckpointV1(value) {
	const issues = [...validateLearningCheckpointSchemaV1(value)];
	const bytes = jsonBytes(value);
	if (bytes === void 0) issues.push("checkpoint must be serializable JSON");
	else if (bytes > 65536) issues.push(`checkpoint exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
	if (!record(value)) throw new LearningProtocolError([...issues, "checkpoint must be an object"]);
	onlyKeys(value, [
		"protocol",
		"kind",
		"prompt",
		"context",
		"expectedEvidence",
		"options",
		"fallbackMarkdown"
	], "checkpoint", issues);
	if (value.protocol !== "dsh-learning/checkpoint@1") issues.push(`checkpoint.protocol must be ${CHECKPOINT_PROTOCOL}`);
	if (!LEARNING_CHECKPOINT_KINDS.includes(value.kind)) issues.push(`checkpoint.kind must be one of ${LEARNING_CHECKPOINT_KINDS.join(", ")}`);
	checkpointDisplayText(value.prompt, "checkpoint.prompt", issues, 2e3);
	if (value.context !== void 0) checkpointDisplayText(value.context, "checkpoint.context", issues, 4e3);
	if (!LEARNING_CHECKPOINT_EVIDENCE_KINDS.includes(value.expectedEvidence)) issues.push(`checkpoint.expectedEvidence must be one of ${LEARNING_CHECKPOINT_EVIDENCE_KINDS.join(", ")}`);
	checkpointDisplayText(value.fallbackMarkdown, "checkpoint.fallbackMarkdown", issues, 8e3);
	if (value.kind === "single_choice") {
		if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 8) issues.push("checkpoint.options must contain 2 to 8 options for single_choice");
		else {
			const options = value.options.filter(record);
			if (options.length !== value.options.length) issues.push("checkpoint.options entries must be objects");
			uniqueIds(options, "checkpoint.options", issues);
			for (const [index, option] of options.entries()) {
				const path = `checkpoint.options[${String(index)}]`;
				onlyKeys(option, ["id", "label"], path, issues);
				id(option.id, `${path}.id`, issues);
				checkpointDisplayText(option.label, `${path}.label`, issues, 500);
			}
		}
	} else if (value.options !== void 0) issues.push("checkpoint.options is supported only for single_choice");
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
/** Validate one phase-bound checkpoint receipt before the Host accepts it. */
function parseLearningCheckpointResultV1(value, expected = {}) {
	const issues = [...validateLearningCheckpointResultSchemaV1(value)];
	const bytes = jsonBytes(value);
	if (bytes === void 0) issues.push("checkpoint result must be serializable JSON");
	else if (bytes > 32768) issues.push(`checkpoint result exceeds ${String(MAX_RESPONSE_BYTES)} bytes`);
	if (!record(value)) throw new LearningProtocolError([...issues, "checkpoint result must be an object"]);
	const submitted = value.status === "submitted";
	onlyKeys(value, submitted ? [
		"protocol",
		"checkpointId",
		"status",
		"response",
		"receiptId"
	] : [
		"protocol",
		"checkpointId",
		"status",
		"reason",
		"receiptId"
	], "checkpointResult", issues);
	if (value.protocol !== "dsh-learning/checkpoint-result@1") issues.push(`checkpointResult.protocol must be ${CHECKPOINT_RESULT_PROTOCOL}`);
	token(value.checkpointId, "checkpointResult.checkpointId", issues);
	token(value.receiptId, "checkpointResult.receiptId", issues);
	if (![
		"submitted",
		"skipped",
		"cancelled"
	].includes(value.status)) issues.push("checkpointResult.status must be submitted, skipped, or cancelled");
	if (value.reason !== void 0 && typeof value.reason !== "string") issues.push("checkpointResult.reason must be a string");
	else if (value.status === "skipped" && value.reason !== void 0 && ![
		"learner-skipped",
		"client-unavailable",
		"client-response-timeout",
		"host-unavailable",
		"provider-failure"
	].includes(value.reason)) issues.push("checkpointResult.reason is not valid for skipped status");
	else if (value.status === "cancelled" && value.reason !== void 0 && ![
		"learner-cancelled",
		"session-aborted",
		"plugin-disposed"
	].includes(value.reason)) issues.push("checkpointResult.reason is not valid for cancelled status");
	else if (value.status === "submitted" && value.reason !== void 0) issues.push("checkpointResult.reason is allowed only for skipped or cancelled status");
	if (expected.checkpointId !== void 0 && value.checkpointId !== expected.checkpointId) issues.push("checkpointResult.checkpointId does not match the pending checkpoint");
	let checkpoint;
	if (expected.checkpoint !== void 0) try {
		checkpoint = parseLearningCheckpointV1(expected.checkpoint);
	} catch (cause) {
		if (cause instanceof LearningProtocolError) issues.push(...cause.issues.map((issue) => `expected ${issue}`));
		else throw cause;
	}
	if (submitted) {
		if (!record(value.response)) issues.push("checkpointResult.response must be an object when submitted");
		else {
			const response = value.response;
			const responsePath = "checkpointResult.response";
			const expectedKind = checkpoint?.kind;
			const shape = expectedKind === "single_choice" ? "optionId" : expectedKind === "numeric" ? "number" : expectedKind === void 0 ? void 0 : "text";
			if (shape === "optionId" || shape === void 0 && Object.hasOwn(response, "optionId")) {
				onlyKeys(response, ["optionId"], responsePath, issues);
				if (id(response.optionId, `${responsePath}.optionId`, issues) && checkpoint?.options !== void 0 && !checkpoint.options.some((option) => option.id === response.optionId)) issues.push(`${responsePath}.optionId must reference a declared checkpoint option`);
			} else if (shape === "number" || shape === void 0 && Object.hasOwn(response, "number")) {
				onlyKeys(response, ["number"], responsePath, issues);
				finite(response.number, `${responsePath}.number`, issues);
			} else if (shape === "text" || shape === void 0 && Object.hasOwn(response, "text")) {
				onlyKeys(response, ["text"], responsePath, issues);
				text(response.text, `${responsePath}.text`, issues, expectedKind === "code_slot" ? 16e3 : 8e3);
			} else {
				issues.push(`${responsePath} must contain exactly one of text, optionId, or number`);
				onlyKeys(response, [], responsePath, issues);
			}
		}
	} else if (value.response !== void 0) issues.push("checkpointResult.response is allowed only when status is submitted");
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
const VISUAL_TONES_V3 = /* @__PURE__ */ new Set([
	"blue",
	"green",
	"red",
	"orange",
	"purple",
	"gray"
]);
const VISUAL_STROKES_V3 = /* @__PURE__ */ new Set([
	"solid",
	"dashed",
	"dotted"
]);
function validateVisualAxisV3(value, path, issues, samplesAllowed) {
	if (!record(value)) {
		issues.push(`${path} must be an object`);
		return;
	}
	onlyKeys(value, samplesAllowed ? [
		"label",
		"min",
		"max",
		"samples"
	] : [
		"label",
		"min",
		"max"
	], path, issues);
	if (value.label !== void 0) text(value.label, `${path}.label`, issues, 120);
	const minOk = finite(value.min, `${path}.min`, issues);
	const maxOk = finite(value.max, `${path}.max`, issues);
	if (minOk && maxOk && value.min >= value.max) issues.push(`${path}.min must be less than max`);
	if (samplesAllowed && value.samples !== void 0 && (!integer(value.samples, `${path}.samples`, issues, 24) || value.samples > 256)) issues.push(`${path}.samples must be an integer from 24 to 256`);
}
function validateVisualToneV4(value, path, issues) {
	if (value !== void 0 && !VISUAL_TONES_V3.has(value)) issues.push(`${path} is unknown`);
}
function validateVisualStrokeV4(value, path, issues) {
	if (value !== void 0 && !VISUAL_STROKES_V3.has(value)) issues.push(`${path} is unknown`);
}
function registerVisualIdV4(ids, value, path, issues) {
	if (typeof value !== "string") return;
	if (ids.has(value)) issues.push(`${path} duplicates visual id ${value}`);
	else ids.add(value);
}
function validateVisualParametersV4(value, issues) {
	const path = "visual.content.parameters";
	if (value === void 0) return [];
	if (!Array.isArray(value) || value.length > 3) {
		issues.push(`${path} must contain at most 3 parameters`);
		return [];
	}
	const parameters = value.filter(record);
	if (parameters.length !== value.length) issues.push(`${path} entries must be objects`);
	uniqueIds(parameters, path, issues);
	for (const [index, parameter] of parameters.entries()) {
		const itemPath = `${path}[${String(index)}]`;
		onlyKeys(parameter, [
			"id",
			"label",
			"min",
			"max",
			"step",
			"initial"
		], itemPath, issues);
		id(parameter.id, `${itemPath}.id`, issues);
		if (parameter.id === "x") issues.push(`${itemPath}.id must not use the reserved x-axis variable`);
		text(parameter.label, `${itemPath}.label`, issues, 120);
		const minOk = finite(parameter.min, `${itemPath}.min`, issues);
		const maxOk = finite(parameter.max, `${itemPath}.max`, issues);
		const stepOk = finite(parameter.step, `${itemPath}.step`, issues);
		const initialOk = finite(parameter.initial, `${itemPath}.initial`, issues);
		if (minOk && maxOk && parameter.min >= parameter.max) issues.push(`${itemPath}.min must be less than max`);
		if (stepOk && parameter.step <= 0) issues.push(`${itemPath}.step must be positive`);
		if (minOk && maxOk && stepOk && parameter.step > parameter.max - parameter.min) issues.push(`${itemPath}.step must not exceed the parameter range`);
		if (minOk && maxOk && initialOk && (parameter.initial < parameter.min || parameter.initial > parameter.max)) issues.push(`${itemPath}.initial must be inside the parameter range`);
	}
	return parameters;
}
function validateVisualPointsV4(value, path, issues, maximum = 256) {
	if (!Array.isArray(value) || value.length < 1 || value.length > maximum) {
		issues.push(`${path} must contain 1 to ${String(maximum)} points`);
		return;
	}
	for (const [index, point] of value.entries()) {
		const pointPath = `${path}[${String(index)}]`;
		if (!record(point)) {
			issues.push(`${pointPath} must be an object`);
			continue;
		}
		onlyKeys(point, [
			"x",
			"y",
			"label"
		], pointPath, issues);
		finite(point.x, `${pointPath}.x`, issues);
		finite(point.y, `${pointPath}.y`, issues);
		if (point.label !== void 0) text(point.label, `${pointPath}.label`, issues, 160);
	}
}
function validateVisualMetricsV4(value, parameterIds, issues) {
	if (value === void 0) return [];
	if (!Array.isArray(value) || value.length > 4) {
		issues.push("visual.content.metrics must contain at most 4 metrics");
		return [];
	}
	const metrics = value.filter(record);
	if (metrics.length !== value.length) issues.push("visual.content.metrics entries must be objects");
	uniqueIds(metrics, "visual.content.metrics", issues);
	for (const [index, metric] of metrics.entries()) {
		const path = `visual.content.metrics[${String(index)}]`;
		onlyKeys(metric, [
			"id",
			"label",
			"expression",
			"digits",
			"suffix"
		], path, issues);
		id(metric.id, `${path}.id`, issues);
		text(metric.label, `${path}.label`, issues, 160);
		validateMath(metric.expression, parameterIds, `${path}.expression`, issues, false, 4);
		if (metric.digits !== void 0 && (!integer(metric.digits, `${path}.digits`, issues) || metric.digits > 6)) issues.push(`${path}.digits must be an integer from 0 to 6`);
		if (metric.suffix !== void 0) text(metric.suffix, `${path}.suffix`, issues, 80);
	}
	return metrics;
}
function validatePlotV4(value, issues) {
	const ids = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"parameters",
		"xAxis",
		"yAxis",
		"series",
		"metrics"
	], "visual.content", issues);
	const parameters = validateVisualParametersV4(value.parameters, issues);
	const parameterIds = new Set(parameters.flatMap((parameter) => typeof parameter.id === "string" ? [parameter.id] : []));
	for (const parameterId of parameterIds) registerVisualIdV4(ids, parameterId, "visual.content.parameters", issues);
	validateVisualAxisV3(value.xAxis, "visual.content.xAxis", issues, true);
	validateVisualAxisV3(value.yAxis, "visual.content.yAxis", issues, false);
	if (!Array.isArray(value.series) || value.series.length < 1 || value.series.length > 8) issues.push("visual.content.series must contain 1 to 8 series");
	else {
		const series = value.series.filter(record);
		if (series.length !== value.series.length) issues.push("visual.content.series entries must be objects");
		uniqueIds(series, "visual.content.series", issues);
		for (const [index, item] of series.entries()) {
			const path = `visual.content.series[${String(index)}]`;
			if (id(item.id, `${path}.id`, issues)) registerVisualIdV4(ids, item.id, `${path}.id`, issues);
			text(item.label, `${path}.label`, issues, 160);
			validateVisualToneV4(item.tone, `${path}.tone`, issues);
			if (item.type === "curve") {
				onlyKeys(item, [
					"type",
					"id",
					"label",
					"expression",
					"tone",
					"stroke"
				], path, issues);
				validateVisualStrokeV4(item.stroke, `${path}.stroke`, issues);
				validateMath(item.expression, parameterIds, `${path}.expression`, issues, true, 4);
			} else if (item.type === "points" || item.type === "bars") {
				onlyKeys(item, [
					"type",
					"id",
					"label",
					"points",
					"tone"
				], path, issues);
				validateVisualPointsV4(item.points, `${path}.points`, issues, item.type === "bars" ? 64 : 256);
			} else if (item.type === "line") {
				onlyKeys(item, [
					"type",
					"id",
					"label",
					"points",
					"tone",
					"stroke"
				], path, issues);
				validateVisualStrokeV4(item.stroke, `${path}.stroke`, issues);
				validateVisualPointsV4(item.points, `${path}.points`, issues);
			} else issues.push(`${path}.type must be curve, points, line, or bars`);
		}
	}
	const metrics = validateVisualMetricsV4(value.metrics, parameterIds, issues);
	for (const [index, metric] of metrics.entries()) if (typeof metric.id === "string") registerVisualIdV4(ids, metric.id, `visual.content.metrics[${String(index)}].id`, issues);
	return ids;
}
function validateNodeLinkV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"layout",
		"groups",
		"nodes",
		"edges"
	], "visual.content", issues);
	if (![
		"layered",
		"hierarchy",
		"radial"
	].includes(value.layout)) issues.push("visual.content.layout must be layered, hierarchy, or radial");
	let groups = [];
	if (value.groups !== void 0) {
		if (!Array.isArray(value.groups) || value.groups.length < 1 || value.groups.length > 12) issues.push("visual.content.groups must contain 1 to 12 groups");
		else {
			groups = value.groups.filter(record);
			if (groups.length !== value.groups.length) issues.push("visual.content.groups entries must be objects");
			uniqueIds(groups, "visual.content.groups", issues);
			for (const [index, group] of groups.entries()) {
				const path = `visual.content.groups[${String(index)}]`;
				onlyKeys(group, ["id", "label"], path, issues);
				if (id(group.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, group.id, `${path}.id`, issues);
				text(group.label, `${path}.label`, issues, 120);
			}
		}
	}
	const groupIds = new Set(groups.flatMap((group) => typeof group.id === "string" ? [group.id] : []));
	let nodes = [];
	if (!Array.isArray(value.nodes) || value.nodes.length < 2 || value.nodes.length > 48) issues.push("visual.content.nodes must contain 2 to 48 nodes");
	else {
		nodes = value.nodes.filter(record);
		if (nodes.length !== value.nodes.length) issues.push("visual.content.nodes entries must be objects");
		uniqueIds(nodes, "visual.content.nodes", issues);
		for (const [index, node] of nodes.entries()) {
			const path = `visual.content.nodes[${String(index)}]`;
			onlyKeys(node, [
				"id",
				"label",
				"detail",
				"group",
				"tone"
			], path, issues);
			if (id(node.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, node.id, `${path}.id`, issues);
			text(node.label, `${path}.label`, issues, 120);
			if (node.detail !== void 0) text(node.detail, `${path}.detail`, issues, 1e3);
			if (node.group !== void 0 && (typeof node.group !== "string" || !groupIds.has(node.group))) issues.push(`${path}.group must reference a declared group`);
			validateVisualToneV4(node.tone, `${path}.tone`, issues);
		}
	}
	if (value.layout === "layered" && (groups.length === 0 || nodes.some((node) => typeof node.group !== "string"))) issues.push("visual.content layered layouts require groups and a group on every node");
	const nodeIds = new Set(nodes.flatMap((node) => typeof node.id === "string" ? [node.id] : []));
	if (!Array.isArray(value.edges) || value.edges.length < 1 || value.edges.length > 160) issues.push("visual.content.edges must contain 1 to 160 edges");
	else {
		const edges = value.edges.filter(record);
		if (edges.length !== value.edges.length) issues.push("visual.content.edges entries must be objects");
		uniqueIds(edges, "visual.content.edges", issues);
		for (const [index, edge] of edges.entries()) {
			const path = `visual.content.edges[${String(index)}]`;
			onlyKeys(edge, [
				"id",
				"from",
				"to",
				"label",
				"detail",
				"tone",
				"stroke",
				"directed"
			], path, issues);
			if (id(edge.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, edge.id, `${path}.id`, issues);
			if (typeof edge.from !== "string" || !nodeIds.has(edge.from)) issues.push(`${path}.from must reference a declared node`);
			if (typeof edge.to !== "string" || !nodeIds.has(edge.to)) issues.push(`${path}.to must reference a declared node`);
			if (edge.label !== void 0) text(edge.label, `${path}.label`, issues, 120);
			if (edge.detail !== void 0) text(edge.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(edge.tone, `${path}.tone`, issues);
			validateVisualStrokeV4(edge.stroke, `${path}.stroke`, issues);
			if (edge.directed !== void 0 && typeof edge.directed !== "boolean") issues.push(`${path}.directed must be a boolean`);
		}
	}
	return focusIds;
}
function validateSceneElementBaseV4(element, path, allowed, issues) {
	onlyKeys(element, [
		"type",
		"id",
		"label",
		"detail",
		"tone",
		...allowed
	], path, issues);
	id(element.id, `${path}.id`, issues);
	if (element.label !== void 0) text(element.label, `${path}.label`, issues, 120);
	if (element.detail !== void 0) text(element.detail, `${path}.detail`, issues, 1e3);
	validateVisualToneV4(element.tone, `${path}.tone`, issues);
}
function validateScene2DV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"xAxis",
		"yAxis",
		"grid",
		"elements"
	], "visual.content", issues);
	validateVisualAxisV3(value.xAxis, "visual.content.xAxis", issues, false);
	validateVisualAxisV3(value.yAxis, "visual.content.yAxis", issues, false);
	if (value.grid !== void 0 && typeof value.grid !== "boolean") issues.push("visual.content.grid must be a boolean");
	if (!Array.isArray(value.elements) || value.elements.length < 1 || value.elements.length > 64) {
		issues.push("visual.content.elements must contain 1 to 64 elements");
		return focusIds;
	}
	const elements = value.elements.filter(record);
	if (elements.length !== value.elements.length) issues.push("visual.content.elements entries must be objects");
	uniqueIds(elements, "visual.content.elements", issues);
	for (const [index, element] of elements.entries()) {
		const path = `visual.content.elements[${String(index)}]`;
		registerVisualIdV4(focusIds, element.id, `${path}.id`, issues);
		if (element.type === "point") {
			validateSceneElementBaseV4(element, path, [
				"x",
				"y",
				"size"
			], issues);
			finite(element.x, `${path}.x`, issues);
			finite(element.y, `${path}.y`, issues);
			if (element.size !== void 0 && finite(element.size, `${path}.size`, issues) && (element.size <= 0 || element.size > 64)) issues.push(`${path}.size must be greater than 0 and at most 64`);
		} else if (element.type === "segment" || element.type === "arrow") {
			validateSceneElementBaseV4(element, path, [
				"x1",
				"y1",
				"x2",
				"y2",
				"stroke"
			], issues);
			finite(element.x1, `${path}.x1`, issues);
			finite(element.y1, `${path}.y1`, issues);
			finite(element.x2, `${path}.x2`, issues);
			finite(element.y2, `${path}.y2`, issues);
			validateVisualStrokeV4(element.stroke, `${path}.stroke`, issues);
		} else if (element.type === "circle") {
			validateSceneElementBaseV4(element, path, [
				"cx",
				"cy",
				"r"
			], issues);
			finite(element.cx, `${path}.cx`, issues);
			finite(element.cy, `${path}.cy`, issues);
			if (finite(element.r, `${path}.r`, issues) && element.r <= 0) issues.push(`${path}.r must be positive`);
		} else if (element.type === "rect") {
			validateSceneElementBaseV4(element, path, [
				"x",
				"y",
				"width",
				"height"
			], issues);
			finite(element.x, `${path}.x`, issues);
			finite(element.y, `${path}.y`, issues);
			if (finite(element.width, `${path}.width`, issues) && element.width <= 0) issues.push(`${path}.width must be positive`);
			if (finite(element.height, `${path}.height`, issues) && element.height <= 0) issues.push(`${path}.height must be positive`);
		} else if (element.type === "polygon") {
			validateSceneElementBaseV4(element, path, ["points"], issues);
			if (!Array.isArray(element.points) || element.points.length < 3 || element.points.length > 24) issues.push(`${path}.points must contain 3 to 24 points`);
			else for (const [pointIndex, point] of element.points.entries()) {
				const pointPath = `${path}.points[${String(pointIndex)}]`;
				if (!record(point)) {
					issues.push(`${pointPath} must be an object`);
					continue;
				}
				onlyKeys(point, ["x", "y"], pointPath, issues);
				finite(point.x, `${pointPath}.x`, issues);
				finite(point.y, `${pointPath}.y`, issues);
			}
		} else if (element.type === "label") {
			validateSceneElementBaseV4(element, path, [
				"x",
				"y",
				"text"
			], issues);
			finite(element.x, `${path}.x`, issues);
			finite(element.y, `${path}.y`, issues);
			text(element.text, `${path}.text`, issues, 240);
		} else issues.push(`${path}.type must be point, segment, arrow, circle, rect, polygon, or label`);
	}
	return focusIds;
}
function validateRelationSubjectsV4(value, path, issues) {
	if (!Array.isArray(value) || value.length < 2 || value.length > 4) {
		issues.push(`${path} must contain 2 to 4 subjects`);
		return [];
	}
	const subjects = value.filter(record);
	if (subjects.length !== value.length) issues.push(`${path} entries must be objects`);
	uniqueIds(subjects, path, issues);
	for (const [index, subject] of subjects.entries()) {
		const itemPath = `${path}[${String(index)}]`;
		onlyKeys(subject, [
			"id",
			"label",
			"detail",
			"tone"
		], itemPath, issues);
		id(subject.id, `${itemPath}.id`, issues);
		text(subject.label, `${itemPath}.label`, issues, 120);
		if (subject.detail !== void 0) text(subject.detail, `${itemPath}.detail`, issues, 1e3);
		validateVisualToneV4(subject.tone, `${itemPath}.tone`, issues);
	}
	return subjects;
}
function validateRelationAxisV4(value, path, issues) {
	if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
		issues.push(`${path} must contain 1 to 10 items`);
		return [];
	}
	const items = value.filter(record);
	if (items.length !== value.length) issues.push(`${path} entries must be objects`);
	uniqueIds(items, path, issues);
	for (const [index, item] of items.entries()) {
		const itemPath = `${path}[${String(index)}]`;
		onlyKeys(item, ["id", "label"], itemPath, issues);
		id(item.id, `${itemPath}.id`, issues);
		text(item.label, `${itemPath}.label`, issues, 120);
	}
	return items;
}
function validateRelationV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	if (value.variant === "comparison") {
		onlyKeys(value, [
			"kind",
			"variant",
			"subjects",
			"rows"
		], "visual.content", issues);
		const subjects = validateRelationSubjectsV4(value.subjects, "visual.content.subjects", issues);
		const subjectIds = new Set(subjects.flatMap((subject) => typeof subject.id === "string" ? [subject.id] : []));
		for (const subjectId of subjectIds) registerVisualIdV4(focusIds, subjectId, "visual.content.subjects", issues);
		if (!Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 16) {
			issues.push("visual.content.rows must contain 1 to 16 comparison rows");
			return focusIds;
		}
		const rows = value.rows.filter(record);
		if (rows.length !== value.rows.length) issues.push("visual.content.rows entries must be objects");
		uniqueIds(rows, "visual.content.rows", issues);
		for (const [index, row] of rows.entries()) {
			const path = `visual.content.rows[${String(index)}]`;
			onlyKeys(row, [
				"id",
				"label",
				"cells",
				"detail"
			], path, issues);
			if (id(row.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, row.id, `${path}.id`, issues);
			text(row.label, `${path}.label`, issues, 120);
			if (row.detail !== void 0) text(row.detail, `${path}.detail`, issues, 1e3);
			if (!Array.isArray(row.cells) || row.cells.length < 1 || row.cells.length > 4) {
				issues.push(`${path}.cells must contain 1 to 4 cells`);
				continue;
			}
			const seenSubjects = /* @__PURE__ */ new Set();
			for (const [cellIndex, cell] of row.cells.entries()) {
				const cellPath = `${path}.cells[${String(cellIndex)}]`;
				if (!record(cell)) {
					issues.push(`${cellPath} must be an object`);
					continue;
				}
				onlyKeys(cell, [
					"subjectId",
					"value",
					"tone"
				], cellPath, issues);
				if (typeof cell.subjectId !== "string" || !subjectIds.has(cell.subjectId)) issues.push(`${cellPath}.subjectId must reference a declared subject`);
				else if (seenSubjects.has(cell.subjectId)) issues.push(`${cellPath}.subjectId duplicates ${cell.subjectId}`);
				else seenSubjects.add(cell.subjectId);
				text(cell.value, `${cellPath}.value`, issues, 500);
				validateVisualToneV4(cell.tone, `${cellPath}.tone`, issues);
			}
		}
	} else if (value.variant === "matrix") {
		onlyKeys(value, [
			"kind",
			"variant",
			"rows",
			"columns",
			"cells"
		], "visual.content", issues);
		const rows = validateRelationAxisV4(value.rows, "visual.content.rows", issues);
		const columns = validateRelationAxisV4(value.columns, "visual.content.columns", issues);
		const rowIds = new Set(rows.flatMap((row) => typeof row.id === "string" ? [row.id] : []));
		const columnIds = new Set(columns.flatMap((column) => typeof column.id === "string" ? [column.id] : []));
		for (const rowId of rowIds) registerVisualIdV4(focusIds, rowId, "visual.content.rows", issues);
		for (const columnId of columnIds) registerVisualIdV4(focusIds, columnId, "visual.content.columns", issues);
		if (!Array.isArray(value.cells) || value.cells.length < 1 || value.cells.length > 64) {
			issues.push("visual.content.cells must contain 1 to 64 matrix cells");
			return focusIds;
		}
		const cells = value.cells.filter(record);
		if (cells.length !== value.cells.length) issues.push("visual.content.cells entries must be objects");
		uniqueIds(cells, "visual.content.cells", issues);
		const coordinates = /* @__PURE__ */ new Set();
		for (const [index, cell] of cells.entries()) {
			const path = `visual.content.cells[${String(index)}]`;
			onlyKeys(cell, [
				"id",
				"rowId",
				"columnId",
				"label",
				"detail",
				"tone"
			], path, issues);
			if (id(cell.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, cell.id, `${path}.id`, issues);
			if (typeof cell.rowId !== "string" || !rowIds.has(cell.rowId)) issues.push(`${path}.rowId must reference a declared row`);
			if (typeof cell.columnId !== "string" || !columnIds.has(cell.columnId)) issues.push(`${path}.columnId must reference a declared column`);
			if (typeof cell.rowId === "string" && typeof cell.columnId === "string") {
				const coordinate = `${cell.rowId}\u0000${cell.columnId}`;
				if (coordinates.has(coordinate)) issues.push(`${path} duplicates a matrix coordinate`);
				coordinates.add(coordinate);
			}
			text(cell.label, `${path}.label`, issues, 240);
			if (cell.detail !== void 0) text(cell.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(cell.tone, `${path}.tone`, issues);
		}
	} else if (value.variant === "sets") {
		onlyKeys(value, [
			"kind",
			"variant",
			"sets",
			"items"
		], "visual.content", issues);
		const sets = validateRelationSubjectsV4(value.sets, "visual.content.sets", issues);
		if (sets.length > 3) issues.push("visual.content.sets must contain at most 3 sets");
		const setIds = new Set(sets.flatMap((item) => typeof item.id === "string" ? [item.id] : []));
		for (const setId of setIds) registerVisualIdV4(focusIds, setId, "visual.content.sets", issues);
		if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 24) {
			issues.push("visual.content.items must contain 1 to 24 set items");
			return focusIds;
		}
		const items = value.items.filter(record);
		if (items.length !== value.items.length) issues.push("visual.content.items entries must be objects");
		uniqueIds(items, "visual.content.items", issues);
		for (const [index, item] of items.entries()) {
			const path = `visual.content.items[${String(index)}]`;
			onlyKeys(item, [
				"id",
				"label",
				"setIds",
				"detail"
			], path, issues);
			if (id(item.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, item.id, `${path}.id`, issues);
			text(item.label, `${path}.label`, issues, 120);
			if (item.detail !== void 0) text(item.detail, `${path}.detail`, issues, 1e3);
			if (!Array.isArray(item.setIds) || item.setIds.length < 1 || item.setIds.length > 3) issues.push(`${path}.setIds must contain 1 to 3 set ids`);
			else {
				const memberships = /* @__PURE__ */ new Set();
				for (const setId of item.setIds) if (typeof setId !== "string" || !setIds.has(setId)) issues.push(`${path}.setIds must reference declared sets`);
				else if (memberships.has(setId)) issues.push(`${path}.setIds duplicates ${setId}`);
				else memberships.add(setId);
			}
		}
	} else issues.push("visual.content.variant must be comparison, matrix, or sets");
	return focusIds;
}
function validateTimelineV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"orientation",
		"events",
		"eras"
	], "visual.content", issues);
	if (value.orientation !== void 0 && value.orientation !== "horizontal" && value.orientation !== "vertical") issues.push("visual.content.orientation must be horizontal or vertical");
	let events = [];
	if (!Array.isArray(value.events) || value.events.length < 2 || value.events.length > 32) issues.push("visual.content.events must contain 2 to 32 events");
	else {
		events = value.events.filter(record);
		if (events.length !== value.events.length) issues.push("visual.content.events entries must be objects");
		uniqueIds(events, "visual.content.events", issues);
		const hasPositions = events.filter((event) => event.position !== void 0).length;
		if (hasPositions !== 0 && hasPositions !== events.length) issues.push("visual.content.events.position must be provided for every event or omitted for every event");
		let previousPosition = -1;
		for (const [index, event] of events.entries()) {
			const path = `visual.content.events[${String(index)}]`;
			onlyKeys(event, [
				"id",
				"time",
				"label",
				"detail",
				"position",
				"tone"
			], path, issues);
			if (id(event.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, event.id, `${path}.id`, issues);
			text(event.time, `${path}.time`, issues, 80);
			text(event.label, `${path}.label`, issues, 160);
			if (event.detail !== void 0) text(event.detail, `${path}.detail`, issues, 1500);
			if (event.position !== void 0 && finite(event.position, `${path}.position`, issues)) {
				const position = event.position;
				if (position < 0 || position > 1) issues.push(`${path}.position must be from 0 to 1`);
				if (position <= previousPosition) issues.push(`${path}.position must be greater than the preceding event position`);
				previousPosition = position;
			}
			validateVisualToneV4(event.tone, `${path}.tone`, issues);
		}
	}
	const eventIds = new Set(events.flatMap((event) => typeof event.id === "string" ? [event.id] : []));
	const eventIndexes = new Map(events.flatMap((event, index) => typeof event.id === "string" ? [[event.id, index]] : []));
	if (value.eras !== void 0) {
		if (!Array.isArray(value.eras) || value.eras.length < 1 || value.eras.length > 8) issues.push("visual.content.eras must contain 1 to 8 eras");
		else {
			const eras = value.eras.filter(record);
			if (eras.length !== value.eras.length) issues.push("visual.content.eras entries must be objects");
			uniqueIds(eras, "visual.content.eras", issues);
			for (const [index, era] of eras.entries()) {
				const path = `visual.content.eras[${String(index)}]`;
				onlyKeys(era, [
					"id",
					"label",
					"startEventId",
					"endEventId",
					"detail",
					"tone"
				], path, issues);
				if (id(era.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, era.id, `${path}.id`, issues);
				text(era.label, `${path}.label`, issues, 120);
				if (typeof era.startEventId !== "string" || !eventIds.has(era.startEventId)) issues.push(`${path}.startEventId must reference a declared event`);
				if (typeof era.endEventId !== "string" || !eventIds.has(era.endEventId)) issues.push(`${path}.endEventId must reference a declared event`);
				if (typeof era.startEventId === "string" && typeof era.endEventId === "string") {
					const startIndex = eventIndexes.get(era.startEventId);
					const endIndex = eventIndexes.get(era.endEventId);
					if (startIndex !== void 0 && endIndex !== void 0 && startIndex > endIndex) issues.push(`${path}.startEventId must not occur after endEventId`);
				}
				if (era.detail !== void 0) text(era.detail, `${path}.detail`, issues, 1e3);
				validateVisualToneV4(era.tone, `${path}.tone`, issues);
			}
		}
	}
	return focusIds;
}
function validateFormulaStepsV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"notation",
		"steps",
		"conclusion"
	], "visual.content", issues);
	if (value.notation !== void 0) text(value.notation, "visual.content.notation", issues, 300);
	if (value.conclusion !== void 0) text(value.conclusion, "visual.content.conclusion", issues, 1e3);
	if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) {
		issues.push("visual.content.steps must contain 2 to 16 formula steps");
		return focusIds;
	}
	const steps = value.steps.filter(record);
	if (steps.length !== value.steps.length) issues.push("visual.content.steps entries must be objects");
	uniqueIds(steps, "visual.content.steps", issues);
	for (const [index, step] of steps.entries()) {
		const path = `visual.content.steps[${String(index)}]`;
		onlyKeys(step, [
			"id",
			"expression",
			"label",
			"rule",
			"detail",
			"tone"
		], path, issues);
		if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues);
		text(step.expression, `${path}.expression`, issues, 500);
		if (step.label !== void 0) text(step.label, `${path}.label`, issues, 120);
		if (step.rule !== void 0) text(step.rule, `${path}.rule`, issues, 240);
		if (step.detail !== void 0) text(step.detail, `${path}.detail`, issues, 1500);
		validateVisualToneV4(step.tone, `${path}.tone`, issues);
	}
	return focusIds;
}
function validateStudyMapV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"view",
		"sourceLabel",
		"goal",
		"sections",
		"concepts"
	], "visual.content", issues);
	if (value.view !== void 0 && value.view !== "material" && value.view !== "concepts") issues.push("visual.content.view must be material or concepts");
	const conceptView = value.view === "concepts";
	text(value.sourceLabel, "visual.content.sourceLabel", issues, 240);
	if (value.goal !== void 0) text(value.goal, "visual.content.goal", issues, 600);
	let sections = [];
	if (!Array.isArray(value.sections) || value.sections.length > 16 || !conceptView && value.sections.length < 1) issues.push(conceptView ? "visual.content.sections must contain 0 to 16 sections for concepts view" : "visual.content.sections must contain 1 to 16 sections");
	else {
		sections = value.sections.filter(record);
		if (sections.length !== value.sections.length) issues.push("visual.content.sections entries must be objects");
		uniqueIds(sections, "visual.content.sections", issues);
		for (const [index, section] of sections.entries()) {
			const path = `visual.content.sections[${String(index)}]`;
			onlyKeys(section, [
				"id",
				"label",
				"anchor",
				"summary"
			], path, issues);
			if (id(section.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, section.id, `${path}.id`, issues);
			text(section.label, `${path}.label`, issues, 160);
			if (section.anchor !== void 0) text(section.anchor, `${path}.anchor`, issues, 160);
			if (section.summary !== void 0) text(section.summary, `${path}.summary`, issues, 1e3);
		}
	}
	const sectionIds = new Set(sections.flatMap((section) => typeof section.id === "string" ? [section.id] : []));
	let concepts = [];
	if (!Array.isArray(value.concepts) || value.concepts.length > 48 || !conceptView && value.concepts.length < 1) issues.push(conceptView ? "visual.content.concepts must contain 0 to 48 concepts for concepts view" : "visual.content.concepts must contain 1 to 48 concepts");
	else {
		concepts = value.concepts.filter(record);
		if (concepts.length !== value.concepts.length) issues.push("visual.content.concepts entries must be objects");
		uniqueIds(concepts, "visual.content.concepts", issues);
		for (const [index, concept] of concepts.entries()) {
			const path = `visual.content.concepts[${String(index)}]`;
			onlyKeys(concept, [
				"id",
				"label",
				"sectionId",
				"detail",
				"conceptSlug",
				"mastery",
				"due",
				"stale",
				"prerequisiteIds",
				"role",
				"tone"
			], path, issues);
			if (id(concept.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, concept.id, `${path}.id`, issues);
			text(concept.label, `${path}.label`, issues, 160);
			if (typeof concept.sectionId !== "string" || !sectionIds.has(concept.sectionId)) issues.push(`${path}.sectionId must reference a declared section`);
			if (concept.detail !== void 0) text(concept.detail, `${path}.detail`, issues, 1500);
			if (concept.conceptSlug !== void 0) text(concept.conceptSlug, `${path}.conceptSlug`, issues, 64);
			if (concept.mastery !== void 0 && ![
				"unseen",
				"emerging",
				"transfer"
			].includes(concept.mastery)) issues.push(`${path}.mastery must be unseen, emerging, or transfer`);
			if (concept.due !== void 0) text(concept.due, `${path}.due`, issues, 32);
			if (concept.stale !== void 0 && typeof concept.stale !== "boolean") issues.push(`${path}.stale must be a boolean`);
			if (concept.role !== void 0 && ![
				"foundation",
				"core",
				"extension",
				"practice"
			].includes(concept.role)) issues.push(`${path}.role must be foundation, core, extension, or practice`);
			validateVisualToneV4(concept.tone, `${path}.tone`, issues);
		}
	}
	const conceptIds = new Set(concepts.flatMap((concept) => typeof concept.id === "string" ? [concept.id] : []));
	const prerequisiteGraph = /* @__PURE__ */ new Map();
	for (const [index, concept] of concepts.entries()) {
		if (concept.prerequisiteIds === void 0) continue;
		const path = `visual.content.concepts[${String(index)}].prerequisiteIds`;
		if (!Array.isArray(concept.prerequisiteIds) || concept.prerequisiteIds.length > 8) {
			issues.push(`${path} must contain at most 8 concept ids`);
			continue;
		}
		const seen = /* @__PURE__ */ new Set();
		for (const prerequisiteId of concept.prerequisiteIds) if (typeof prerequisiteId !== "string" || !conceptIds.has(prerequisiteId)) issues.push(`${path} must reference declared concepts`);
		else if (prerequisiteId === concept.id) issues.push(`${path} must not reference its own concept`);
		else if (seen.has(prerequisiteId)) issues.push(`${path} duplicates ${prerequisiteId}`);
		else seen.add(prerequisiteId);
		if (typeof concept.id === "string") prerequisiteGraph.set(concept.id, [...seen]);
	}
	const visited = /* @__PURE__ */ new Set();
	const visiting = /* @__PURE__ */ new Set();
	const visit = (conceptId) => {
		if (visiting.has(conceptId)) return true;
		if (visited.has(conceptId)) return false;
		visiting.add(conceptId);
		const cyclic = (prerequisiteGraph.get(conceptId) ?? []).some(visit);
		visiting.delete(conceptId);
		visited.add(conceptId);
		return cyclic;
	};
	if ([...conceptIds].some(visit)) issues.push("visual.content.concepts prerequisiteIds must not contain a cycle");
	return focusIds;
}
function validateRecallDeckV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"instructions",
		"cards"
	], "visual.content", issues);
	if (value.instructions !== void 0) text(value.instructions, "visual.content.instructions", issues, 600);
	if (!Array.isArray(value.cards) || value.cards.length < 2 || value.cards.length > 32) {
		issues.push("visual.content.cards must contain 2 to 32 cards");
		return focusIds;
	}
	const cards = value.cards.filter(record);
	if (cards.length !== value.cards.length) issues.push("visual.content.cards entries must be objects");
	uniqueIds(cards, "visual.content.cards", issues);
	for (const [index, card] of cards.entries()) {
		const path = `visual.content.cards[${String(index)}]`;
		onlyKeys(card, [
			"id",
			"prompt",
			"answer",
			"hint",
			"tags"
		], path, issues);
		if (id(card.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, card.id, `${path}.id`, issues);
		text(card.prompt, `${path}.prompt`, issues, 1e3);
		text(card.answer, `${path}.answer`, issues, 2e3);
		if (card.hint !== void 0) text(card.hint, `${path}.hint`, issues, 800);
		if (card.tags !== void 0) {
			if (!Array.isArray(card.tags) || card.tags.length > 6) issues.push(`${path}.tags must contain at most 6 labels`);
			else {
				const seen = /* @__PURE__ */ new Set();
				for (const [tagIndex, tag] of card.tags.entries()) if (text(tag, `${path}.tags[${String(tagIndex)}]`, issues, 80) && typeof tag === "string") {
					if (seen.has(tag)) issues.push(`${path}.tags duplicates ${tag}`);
					else seen.add(tag);
				}
			}
		}
	}
	return focusIds;
}
function validateTableValueV4(value, path, issues) {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number" && Number.isFinite(value)) return true;
	issues.push(`${path} must be a string, number, boolean, or null`);
	return false;
}
function validateDataTableV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"columns",
		"rows",
		"outlierIds",
		"initialSort",
		"initialFilter",
		"chart"
	], "visual.content", issues);
	let columns = [];
	if (!Array.isArray(value.columns) || value.columns.length < 1 || value.columns.length > 24) issues.push("visual.content.columns must contain 1 to 24 columns");
	else {
		columns = value.columns.filter(record);
		if (columns.length !== value.columns.length) issues.push("visual.content.columns entries must be objects");
		uniqueIds(columns, "visual.content.columns", issues);
		for (const [index, column] of columns.entries()) {
			const path = `visual.content.columns[${String(index)}]`;
			onlyKeys(column, [
				"id",
				"label",
				"type",
				"unit"
			], path, issues);
			if (id(column.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, column.id, `${path}.id`, issues);
			text(column.label, `${path}.label`, issues, 160);
			if (![
				"string",
				"number",
				"boolean",
				"date"
			].includes(column.type)) issues.push(`${path}.type must be string, number, boolean, or date`);
			if (column.unit !== void 0) text(column.unit, `${path}.unit`, issues, 80);
		}
	}
	const columnIds = new Set(columns.flatMap((column) => typeof column.id === "string" ? [column.id] : []));
	const columnTypes = new Map(columns.flatMap((column) => typeof column.id === "string" && typeof column.type === "string" ? [[column.id, column.type]] : []));
	let rows = [];
	if (!Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 128) issues.push("visual.content.rows must contain 1 to 128 rows");
	else {
		rows = value.rows.filter(record);
		if (rows.length !== value.rows.length) issues.push("visual.content.rows entries must be objects");
		uniqueIds(rows, "visual.content.rows", issues);
		for (const [index, row] of rows.entries()) {
			const path = `visual.content.rows[${String(index)}]`;
			onlyKeys(row, [
				"id",
				"cells",
				"detail"
			], path, issues);
			if (id(row.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, row.id, `${path}.id`, issues);
			if (row.detail !== void 0) text(row.detail, `${path}.detail`, issues, 1e3);
			if (!Array.isArray(row.cells) || row.cells.length < 1 || row.cells.length > 24) {
				issues.push(`${path}.cells must contain 1 to 24 cells`);
				continue;
			}
			const seen = /* @__PURE__ */ new Set();
			for (const [cellIndex, cell] of row.cells.entries()) {
				const cellPath = `${path}.cells[${String(cellIndex)}]`;
				if (!record(cell)) {
					issues.push(`${cellPath} must be an object`);
					continue;
				}
				onlyKeys(cell, ["columnId", "value"], cellPath, issues);
				if (typeof cell.columnId !== "string" || !columnIds.has(cell.columnId)) issues.push(`${cellPath}.columnId must reference a declared column`);
				else if (seen.has(cell.columnId)) issues.push(`${cellPath}.columnId duplicates ${cell.columnId}`);
				else seen.add(cell.columnId);
				const valueOk = validateTableValueV4(cell.value, `${cellPath}.value`, issues);
				const expected = typeof cell.columnId === "string" ? columnTypes.get(cell.columnId) : void 0;
				if (valueOk && cell.value !== null && expected !== void 0 && (expected === "number" && typeof cell.value !== "number" || expected === "boolean" && typeof cell.value !== "boolean" || (expected === "string" || expected === "date") && typeof cell.value !== "string")) issues.push(`${cellPath}.value does not match column type ${expected}`);
			}
		}
	}
	const rowIds = new Set(rows.flatMap((row) => typeof row.id === "string" ? [row.id] : []));
	if (value.outlierIds !== void 0) {
		if (!Array.isArray(value.outlierIds) || value.outlierIds.length > 32) issues.push("visual.content.outlierIds must contain at most 32 row ids");
		else {
			const seen = /* @__PURE__ */ new Set();
			for (const [index, rowId] of value.outlierIds.entries()) {
				const path = `visual.content.outlierIds[${String(index)}]`;
				if (typeof rowId !== "string" || !rowIds.has(rowId)) issues.push(`${path} must reference a declared row`);
				else if (seen.has(rowId)) issues.push(`${path} duplicates ${rowId}`);
				else seen.add(rowId);
			}
		}
	}
	const validateColumnRef = (candidate, path) => {
		if (typeof candidate !== "string" || !columnIds.has(candidate)) issues.push(`${path} must reference a declared column`);
	};
	if (value.initialSort !== void 0) {
		if (!record(value.initialSort)) issues.push("visual.content.initialSort must be an object");
		else {
			onlyKeys(value.initialSort, ["columnId", "direction"], "visual.content.initialSort", issues);
			validateColumnRef(value.initialSort.columnId, "visual.content.initialSort.columnId");
			if (value.initialSort.direction !== "asc" && value.initialSort.direction !== "desc") issues.push("visual.content.initialSort.direction must be asc or desc");
		}
	}
	if (value.initialFilter !== void 0) {
		if (!record(value.initialFilter)) issues.push("visual.content.initialFilter must be an object");
		else {
			onlyKeys(value.initialFilter, [
				"columnId",
				"operator",
				"value"
			], "visual.content.initialFilter", issues);
			validateColumnRef(value.initialFilter.columnId, "visual.content.initialFilter.columnId");
			if (![
				"equals",
				"not_equals",
				"contains",
				"gt",
				"gte",
				"lt",
				"lte"
			].includes(value.initialFilter.operator)) issues.push("visual.content.initialFilter.operator is unknown");
			validateTableValueV4(value.initialFilter.value, "visual.content.initialFilter.value", issues);
		}
	}
	if (value.chart !== void 0) {
		if (!record(value.chart)) issues.push("visual.content.chart must be an object");
		else {
			onlyKeys(value.chart, [
				"type",
				"xColumnId",
				"yColumnId",
				"seriesColumnId"
			], "visual.content.chart", issues);
			if (![
				"line",
				"bar",
				"scatter"
			].includes(value.chart.type)) issues.push("visual.content.chart.type is unknown");
			validateColumnRef(value.chart.xColumnId, "visual.content.chart.xColumnId");
			validateColumnRef(value.chart.yColumnId, "visual.content.chart.yColumnId");
			if (value.chart.seriesColumnId !== void 0) validateColumnRef(value.chart.seriesColumnId, "visual.content.chart.seriesColumnId");
		}
	}
	return focusIds;
}
function validateStateTransitionV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"states",
		"transitions",
		"steps"
	], "visual.content", issues);
	let states = [];
	if (!Array.isArray(value.states) || value.states.length < 2 || value.states.length > 32) issues.push("visual.content.states must contain 2 to 32 states");
	else {
		states = value.states.filter(record);
		if (states.length !== value.states.length) issues.push("visual.content.states entries must be objects");
		uniqueIds(states, "visual.content.states", issues);
		for (const [index, state] of states.entries()) {
			const path = `visual.content.states[${String(index)}]`;
			onlyKeys(state, [
				"id",
				"label",
				"detail",
				"tone",
				"initial",
				"final"
			], path, issues);
			if (id(state.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, state.id, `${path}.id`, issues);
			text(state.label, `${path}.label`, issues, 160);
			if (state.detail !== void 0) text(state.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(state.tone, `${path}.tone`, issues);
			if (state.initial !== void 0 && typeof state.initial !== "boolean") issues.push(`${path}.initial must be a boolean`);
			if (state.final !== void 0 && typeof state.final !== "boolean") issues.push(`${path}.final must be a boolean`);
		}
	}
	const stateIds = new Set(states.flatMap((state) => typeof state.id === "string" ? [state.id] : []));
	let transitions = [];
	if (!Array.isArray(value.transitions) || value.transitions.length < 1 || value.transitions.length > 96) issues.push("visual.content.transitions must contain 1 to 96 transitions");
	else {
		transitions = value.transitions.filter(record);
		if (transitions.length !== value.transitions.length) issues.push("visual.content.transitions entries must be objects");
		uniqueIds(transitions, "visual.content.transitions", issues);
		for (const [index, transition] of transitions.entries()) {
			const path = `visual.content.transitions[${String(index)}]`;
			onlyKeys(transition, [
				"id",
				"from",
				"to",
				"trigger",
				"guard",
				"action",
				"detail",
				"tone"
			], path, issues);
			if (id(transition.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, transition.id, `${path}.id`, issues);
			if (typeof transition.from !== "string" || !stateIds.has(transition.from)) issues.push(`${path}.from must reference a declared state`);
			if (typeof transition.to !== "string" || !stateIds.has(transition.to)) issues.push(`${path}.to must reference a declared state`);
			text(transition.trigger, `${path}.trigger`, issues, 240);
			if (transition.guard !== void 0) text(transition.guard, `${path}.guard`, issues, 500);
			if (transition.action !== void 0) text(transition.action, `${path}.action`, issues, 500);
			if (transition.detail !== void 0) text(transition.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(transition.tone, `${path}.tone`, issues);
		}
	}
	const transitionIds = new Set(transitions.flatMap((transition) => typeof transition.id === "string" ? [transition.id] : []));
	if (value.steps !== void 0) {
		if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) issues.push("visual.content.steps must contain 2 to 16 steps");
		else {
			const steps = value.steps.filter(record);
			if (steps.length !== value.steps.length) issues.push("visual.content.steps entries must be objects");
			uniqueIds(steps, "visual.content.steps", issues);
			for (const [index, step] of steps.entries()) {
				const path = `visual.content.steps[${String(index)}]`;
				onlyKeys(step, [
					"id",
					"label",
					"currentStateId",
					"transitionId",
					"description"
				], path, issues);
				if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues);
				text(step.label, `${path}.label`, issues, 160);
				if (typeof step.currentStateId !== "string" || !stateIds.has(step.currentStateId)) issues.push(`${path}.currentStateId must reference a declared state`);
				if (step.transitionId !== void 0 && (typeof step.transitionId !== "string" || !transitionIds.has(step.transitionId))) issues.push(`${path}.transitionId must reference a declared transition`);
				if (step.description !== void 0) text(step.description, `${path}.description`, issues, 1e3);
			}
		}
	}
	return focusIds;
}
function validateSequenceBufferV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"slots",
		"pointers",
		"ranges",
		"steps"
	], "visual.content", issues);
	let slots = [];
	if (!Array.isArray(value.slots) || value.slots.length < 1 || value.slots.length > 128) issues.push("visual.content.slots must contain 1 to 128 slots");
	else {
		slots = value.slots.filter(record);
		if (slots.length !== value.slots.length) issues.push("visual.content.slots entries must be objects");
		uniqueIds(slots, "visual.content.slots", issues);
		const indexes = /* @__PURE__ */ new Set();
		for (const [index, slot] of slots.entries()) {
			const path = `visual.content.slots[${String(index)}]`;
			onlyKeys(slot, [
				"id",
				"index",
				"value",
				"label",
				"tone"
			], path, issues);
			if (id(slot.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, slot.id, `${path}.id`, issues);
			if (!integer(slot.index, `${path}.index`, issues)) continue;
			if (indexes.has(slot.index)) issues.push(`${path}.index duplicates ${String(slot.index)}`);
			indexes.add(slot.index);
			validateTableValueV4(slot.value, `${path}.value`, issues);
			if (slot.label !== void 0) text(slot.label, `${path}.label`, issues, 120);
			validateVisualToneV4(slot.tone, `${path}.tone`, issues);
		}
	}
	const slotIds = new Set(slots.flatMap((slot) => typeof slot.id === "string" ? [slot.id] : []));
	const slotIndexes = new Set(slots.flatMap((slot) => typeof slot.index === "number" && Number.isInteger(slot.index) ? [slot.index] : []));
	const maxIndex = slots.reduce((max, slot) => typeof slot.index === "number" ? Math.max(max, slot.index) : max, -1);
	let pointers = [];
	if (value.pointers !== void 0) {
		if (!Array.isArray(value.pointers) || value.pointers.length < 1 || value.pointers.length > 8) issues.push("visual.content.pointers must contain 1 to 8 pointers");
		else {
			pointers = value.pointers.filter(record);
			if (pointers.length !== value.pointers.length) issues.push("visual.content.pointers entries must be objects");
			uniqueIds(pointers, "visual.content.pointers", issues);
			for (const [index, pointer] of pointers.entries()) {
				const path = `visual.content.pointers[${String(index)}]`;
				onlyKeys(pointer, [
					"id",
					"label",
					"index",
					"tone"
				], path, issues);
				if (id(pointer.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, pointer.id, `${path}.id`, issues);
				text(pointer.label, `${path}.label`, issues, 120);
				if (integer(pointer.index, `${path}.index`, issues) && pointer.index > maxIndex + 1) issues.push(`${path}.index must point within the buffer`);
				validateVisualToneV4(pointer.tone, `${path}.tone`, issues);
			}
		}
	}
	const pointerIds = new Set(pointers.flatMap((pointer) => typeof pointer.id === "string" ? [pointer.id] : []));
	let ranges = [];
	if (value.ranges !== void 0) {
		if (!Array.isArray(value.ranges) || value.ranges.length < 1 || value.ranges.length > 8) issues.push("visual.content.ranges must contain 1 to 8 ranges");
		else {
			ranges = value.ranges.filter(record);
			if (ranges.length !== value.ranges.length) issues.push("visual.content.ranges entries must be objects");
			uniqueIds(ranges, "visual.content.ranges", issues);
			for (const [index, range] of ranges.entries()) {
				const path = `visual.content.ranges[${String(index)}]`;
				onlyKeys(range, [
					"id",
					"label",
					"start",
					"end",
					"tone"
				], path, issues);
				if (id(range.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, range.id, `${path}.id`, issues);
				text(range.label, `${path}.label`, issues, 120);
				const startOk = integer(range.start, `${path}.start`, issues);
				const endOk = integer(range.end, `${path}.end`, issues);
				if (startOk && !slotIndexes.has(range.start)) issues.push(`${path}.start must reference a declared slot index`);
				if (endOk && !slotIndexes.has(range.end)) issues.push(`${path}.end must reference a declared slot index`);
				if (startOk && endOk && range.start > range.end) issues.push(`${path}.start must not exceed end`);
				validateVisualToneV4(range.tone, `${path}.tone`, issues);
			}
		}
	}
	const rangeIds = new Set(ranges.flatMap((range) => typeof range.id === "string" ? [range.id] : []));
	if (value.steps !== void 0) {
		if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) issues.push("visual.content.steps must contain 2 to 16 snapshots");
		else {
			const steps = value.steps.filter(record);
			if (steps.length !== value.steps.length) issues.push("visual.content.steps entries must be objects");
			uniqueIds(steps, "visual.content.steps", issues);
			for (const [index, step] of steps.entries()) {
				const path = `visual.content.steps[${String(index)}]`;
				onlyKeys(step, [
					"id",
					"label",
					"description",
					"slots",
					"pointers",
					"ranges"
				], path, issues);
				if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues);
				text(step.label, `${path}.label`, issues, 160);
				if (step.description !== void 0) text(step.description, `${path}.description`, issues, 1e3);
				if (step.slots !== void 0) {
					if (!Array.isArray(step.slots) || step.slots.length > 128) issues.push(`${path}.slots must contain at most 128 snapshots`);
					else for (const [snapshotIndex, snapshot] of step.slots.entries()) {
						const snapshotPath = `${path}.slots[${String(snapshotIndex)}]`;
						if (!record(snapshot)) {
							issues.push(`${snapshotPath} must be an object`);
							continue;
						}
						onlyKeys(snapshot, ["slotId", "value"], snapshotPath, issues);
						if (typeof snapshot.slotId !== "string" || !slotIds.has(snapshot.slotId)) issues.push(`${snapshotPath}.slotId must reference a declared slot`);
						if (snapshot.value !== void 0) validateTableValueV4(snapshot.value, `${snapshotPath}.value`, issues);
					}
				}
				if (step.pointers !== void 0) {
					if (!Array.isArray(step.pointers) || step.pointers.length > 8) issues.push(`${path}.pointers must contain at most 8 snapshots`);
					else for (const [snapshotIndex, snapshot] of step.pointers.entries()) {
						const snapshotPath = `${path}.pointers[${String(snapshotIndex)}]`;
						if (!record(snapshot)) {
							issues.push(`${snapshotPath} must be an object`);
							continue;
						}
						onlyKeys(snapshot, ["pointerId", "index"], snapshotPath, issues);
						if (typeof snapshot.pointerId !== "string" || !pointerIds.has(snapshot.pointerId)) issues.push(`${snapshotPath}.pointerId must reference a declared pointer`);
						if (integer(snapshot.index, `${snapshotPath}.index`, issues) && snapshot.index > maxIndex + 1) issues.push(`${snapshotPath}.index must point within the buffer`);
					}
				}
				if (step.ranges !== void 0) {
					if (!Array.isArray(step.ranges) || step.ranges.length > 8) issues.push(`${path}.ranges must contain at most 8 snapshots`);
					else for (const [snapshotIndex, snapshot] of step.ranges.entries()) {
						const snapshotPath = `${path}.ranges[${String(snapshotIndex)}]`;
						if (!record(snapshot)) {
							issues.push(`${snapshotPath} must be an object`);
							continue;
						}
						onlyKeys(snapshot, [
							"rangeId",
							"start",
							"end"
						], snapshotPath, issues);
						if (typeof snapshot.rangeId !== "string" || !rangeIds.has(snapshot.rangeId)) issues.push(`${snapshotPath}.rangeId must reference a declared range`);
						const startOk = integer(snapshot.start, `${snapshotPath}.start`, issues);
						const endOk = integer(snapshot.end, `${snapshotPath}.end`, issues);
						if (startOk && !slotIndexes.has(snapshot.start)) issues.push(`${snapshotPath}.start must reference a declared slot index`);
						if (endOk && !slotIndexes.has(snapshot.end)) issues.push(`${snapshotPath}.end must reference a declared slot index`);
						if (startOk && endOk && snapshot.start > snapshot.end) issues.push(`${snapshotPath}.start must not exceed end`);
					}
				}
			}
		}
	}
	return focusIds;
}
function validateSequenceDiagramV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"participants",
		"messages"
	], "visual.content", issues);
	let participants = [];
	if (!Array.isArray(value.participants) || value.participants.length < 2 || value.participants.length > 16) issues.push("visual.content.participants must contain 2 to 16 participants");
	else {
		participants = value.participants.filter(record);
		if (participants.length !== value.participants.length) issues.push("visual.content.participants entries must be objects");
		uniqueIds(participants, "visual.content.participants", issues);
		for (const [index, participant] of participants.entries()) {
			const path = `visual.content.participants[${String(index)}]`;
			onlyKeys(participant, [
				"id",
				"label",
				"detail",
				"tone"
			], path, issues);
			if (id(participant.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, participant.id, `${path}.id`, issues);
			text(participant.label, `${path}.label`, issues, 160);
			if (participant.detail !== void 0) text(participant.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(participant.tone, `${path}.tone`, issues);
		}
	}
	const participantIds = new Set(participants.flatMap((participant) => typeof participant.id === "string" ? [participant.id] : []));
	if (!Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > 96) issues.push("visual.content.messages must contain 1 to 96 messages");
	else {
		const messages = value.messages.filter(record);
		if (messages.length !== value.messages.length) issues.push("visual.content.messages entries must be objects");
		uniqueIds(messages, "visual.content.messages", issues);
		for (const [index, message] of messages.entries()) {
			const path = `visual.content.messages[${String(index)}]`;
			onlyKeys(message, [
				"id",
				"from",
				"to",
				"label",
				"type",
				"detail",
				"tone"
			], path, issues);
			if (id(message.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, message.id, `${path}.id`, issues);
			if (typeof message.from !== "string" || !participantIds.has(message.from)) issues.push(`${path}.from must reference a declared participant`);
			if (typeof message.to !== "string" || !participantIds.has(message.to)) issues.push(`${path}.to must reference a declared participant`);
			text(message.label, `${path}.label`, issues, 240);
			if (![
				"sync",
				"async",
				"return",
				"self"
			].includes(message.type)) issues.push(`${path}.type must be sync, async, return, or self`);
			if (message.type === "self" && message.from !== message.to) issues.push(`${path}.self messages must have matching from and to participants`);
			if (message.detail !== void 0) text(message.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(message.tone, `${path}.tone`, issues);
		}
	}
	return focusIds;
}
function validateCodeTraceV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"language",
		"code",
		"lines",
		"steps"
	], "visual.content", issues);
	text(value.language, "visual.content.language", issues, 40);
	text(value.code, "visual.content.code", issues, 24e3);
	const lineNumbers = /* @__PURE__ */ new Set();
	if (!Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 256) issues.push("visual.content.lines must contain 1 to 256 lines");
	else {
		const lines = value.lines.filter(record);
		if (lines.length !== value.lines.length) issues.push("visual.content.lines entries must be objects");
		let previousLine = -1;
		for (const [index, line] of lines.entries()) {
			const path = `visual.content.lines[${String(index)}]`;
			onlyKeys(line, ["number", "text"], path, issues);
			if (integer(line.number, `${path}.number`, issues)) {
				lineNumbers.add(line.number);
				if (line.number <= previousLine) issues.push(`${path}.number must increase in source order`);
				previousLine = line.number;
			}
			if (typeof line.text !== "string") issues.push(`${path}.text must be a string`);
			else if (line.text.length > 1e3) issues.push(`${path}.text exceeds 1000 characters`);
		}
	}
	if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 32) issues.push("visual.content.steps must contain 2 to 32 execution steps");
	else {
		const steps = value.steps.filter(record);
		if (steps.length !== value.steps.length) issues.push("visual.content.steps entries must be objects");
		uniqueIds(steps, "visual.content.steps", issues);
		for (const [index, step] of steps.entries()) {
			const path = `visual.content.steps[${String(index)}]`;
			onlyKeys(step, [
				"id",
				"label",
				"currentLine",
				"variables",
				"stack",
				"output",
				"description"
			], path, issues);
			if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues);
			text(step.label, `${path}.label`, issues, 160);
			if (integer(step.currentLine, `${path}.currentLine`, issues) && !lineNumbers.has(step.currentLine)) issues.push(`${path}.currentLine must reference a declared source line`);
			if (!Array.isArray(step.variables) || step.variables.length > 32) issues.push(`${path}.variables must contain at most 32 variables`);
			else {
				const variables = step.variables.filter(record);
				if (variables.length !== step.variables.length) issues.push(`${path}.variables entries must be objects`);
				const names = /* @__PURE__ */ new Set();
				for (const [variableIndex, variable] of variables.entries()) {
					const variablePath = `${path}.variables[${String(variableIndex)}]`;
					onlyKeys(variable, [
						"name",
						"value",
						"type"
					], variablePath, issues);
					if (typeof variable.name !== "string" || variable.name.trim() === "") issues.push(`${variablePath}.name must be a non-empty string`);
					else if (names.has(variable.name)) issues.push(`${variablePath}.name duplicates ${variable.name}`);
					else names.add(variable.name);
					validateTableValueV4(variable.value, `${variablePath}.value`, issues);
					if (variable.type !== void 0) text(variable.type, `${variablePath}.type`, issues, 80);
				}
			}
			if (!Array.isArray(step.stack) || step.stack.length > 16) issues.push(`${path}.stack must contain at most 16 frames`);
			else {
				const stack = step.stack.filter(record);
				if (stack.length !== step.stack.length) issues.push(`${path}.stack entries must be objects`);
				uniqueIds(stack, `${path}.stack`, issues);
				for (const [frameIndex, frame] of stack.entries()) {
					const framePath = `${path}.stack[${String(frameIndex)}]`;
					onlyKeys(frame, [
						"id",
						"function",
						"line"
					], framePath, issues);
					id(frame.id, `${framePath}.id`, issues);
					text(frame.function, `${framePath}.function`, issues, 160);
					if (frame.line !== void 0 && integer(frame.line, `${framePath}.line`, issues) && !lineNumbers.has(frame.line)) issues.push(`${framePath}.line must reference a declared source line`);
				}
			}
			if (step.output !== void 0 && typeof step.output !== "string") issues.push(`${path}.output must be a string`);
			else if (step.output !== void 0 && step.output.length > 4e3) issues.push(`${path}.output exceeds 4000 characters`);
			if (step.description !== void 0) text(step.description, `${path}.description`, issues, 1e3);
		}
	}
	return focusIds;
}
function validateFieldGridV4(value, path, issues, components) {
	if (!record(value)) {
		issues.push(`${path} must be an object`);
		return;
	}
	onlyKeys(value, components === "scalar" ? [
		"columns",
		"rows",
		"values"
	] : [
		"columns",
		"rows",
		"u",
		"v"
	], path, issues);
	const columnsOk = integer(value.columns, `${path}.columns`, issues, 2) && value.columns <= 64;
	const rowsOk = integer(value.rows, `${path}.rows`, issues, 2) && value.rows <= 64;
	const expected = columnsOk && rowsOk ? value.columns * value.rows : void 0;
	if (components === "scalar") {
		if (!Array.isArray(value.values) || value.values.length < 1 || value.values.length > 4096) issues.push(`${path}.values must contain sampled values`);
		else {
			if (expected !== void 0 && value.values.length !== expected) issues.push(`${path}.values length must equal rows * columns`);
			for (const [index, sample] of value.values.entries()) finite(sample, `${path}.values[${String(index)}]`, issues);
		}
	} else for (const component of ["u", "v"]) {
		const samples = value[component];
		if (!Array.isArray(samples) || samples.length < 1 || samples.length > 4096) issues.push(`${path}.${component} must contain sampled values`);
		else {
			if (expected !== void 0 && samples.length !== expected) issues.push(`${path}.${component} length must equal rows * columns`);
			for (const [index, sample] of samples.entries()) finite(sample, `${path}.${component}[${String(index)}]`, issues);
		}
	}
}
function validateFieldAxisV4(value, path, issues) {
	if (!record(value)) {
		issues.push(`${path} must be an object`);
		return;
	}
	onlyKeys(value, [
		"label",
		"min",
		"max",
		"samples"
	], path, issues);
	if (value.label !== void 0) text(value.label, `${path}.label`, issues, 120);
	const minOk = finite(value.min, `${path}.min`, issues);
	const maxOk = finite(value.max, `${path}.max`, issues);
	if (minOk && maxOk && value.min >= value.max) issues.push(`${path}.min must be less than max`);
	if (value.samples !== void 0 && (!integer(value.samples, `${path}.samples`, issues, 2) || value.samples > 64)) issues.push(`${path}.samples must be an integer from 2 to 64`);
}
function validateField2DV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"xAxis",
		"yAxis",
		"scalar",
		"vector"
	], "visual.content", issues);
	validateFieldAxisV4(value.xAxis, "visual.content.xAxis", issues);
	validateFieldAxisV4(value.yAxis, "visual.content.yAxis", issues);
	if (value.scalar === void 0 && value.vector === void 0) issues.push("visual.content must provide scalar or vector data");
	const fieldVariables = /* @__PURE__ */ new Set(["y"]);
	if (value.scalar !== void 0) {
		if (!record(value.scalar)) issues.push("visual.content.scalar must be an object");
		else {
			onlyKeys(value.scalar, [
				"samples",
				"expression",
				"min",
				"max"
			], "visual.content.scalar", issues);
			if (value.scalar.samples === void 0 && value.scalar.expression === void 0) issues.push("visual.content.scalar must provide samples or expression");
			if (value.scalar.samples !== void 0) validateFieldGridV4(value.scalar.samples, "visual.content.scalar.samples", issues, "scalar");
			if (value.scalar.expression !== void 0) validateMath(value.scalar.expression, fieldVariables, "visual.content.scalar.expression", issues, true, 4);
			const minOk = value.scalar.min === void 0 ? false : finite(value.scalar.min, "visual.content.scalar.min", issues);
			const maxOk = value.scalar.max === void 0 ? false : finite(value.scalar.max, "visual.content.scalar.max", issues);
			if (minOk && maxOk && value.scalar.min >= value.scalar.max) issues.push("visual.content.scalar.min must be less than max");
		}
	}
	if (value.vector !== void 0) {
		if (!record(value.vector)) issues.push("visual.content.vector must be an object");
		else {
			onlyKeys(value.vector, ["samples", "expression"], "visual.content.vector", issues);
			if (value.vector.samples === void 0 && value.vector.expression === void 0) issues.push("visual.content.vector must provide samples or expression");
			if (value.vector.samples !== void 0) validateFieldGridV4(value.vector.samples, "visual.content.vector.samples", issues, "vector");
			if (value.vector.expression !== void 0) {
				if (!record(value.vector.expression)) issues.push("visual.content.vector.expression must be an object");
				else {
					onlyKeys(value.vector.expression, ["u", "v"], "visual.content.vector.expression", issues);
					validateMath(value.vector.expression.u, fieldVariables, "visual.content.vector.expression.u", issues, true, 4);
					validateMath(value.vector.expression.v, fieldVariables, "visual.content.vector.expression.v", issues, true, 4);
				}
			}
		}
	}
	return focusIds;
}
function validateCausalLoopV4(value, issues) {
	const focusIds = /* @__PURE__ */ new Set();
	onlyKeys(value, [
		"kind",
		"variables",
		"links",
		"loops"
	], "visual.content", issues);
	let variables = [];
	if (!Array.isArray(value.variables) || value.variables.length < 2 || value.variables.length > 32) issues.push("visual.content.variables must contain 2 to 32 variables");
	else {
		variables = value.variables.filter(record);
		if (variables.length !== value.variables.length) issues.push("visual.content.variables entries must be objects");
		uniqueIds(variables, "visual.content.variables", issues);
		for (const [index, variable] of variables.entries()) {
			const path = `visual.content.variables[${String(index)}]`;
			onlyKeys(variable, [
				"id",
				"label",
				"detail",
				"tone"
			], path, issues);
			if (id(variable.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, variable.id, `${path}.id`, issues);
			text(variable.label, `${path}.label`, issues, 160);
			if (variable.detail !== void 0) text(variable.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(variable.tone, `${path}.tone`, issues);
		}
	}
	const variableIds = new Set(variables.flatMap((variable) => typeof variable.id === "string" ? [variable.id] : []));
	let links = [];
	if (!Array.isArray(value.links) || value.links.length < 1 || value.links.length > 96) issues.push("visual.content.links must contain 1 to 96 links");
	else {
		links = value.links.filter(record);
		if (links.length !== value.links.length) issues.push("visual.content.links entries must be objects");
		uniqueIds(links, "visual.content.links", issues);
		for (const [index, link] of links.entries()) {
			const path = `visual.content.links[${String(index)}]`;
			onlyKeys(link, [
				"id",
				"from",
				"to",
				"polarity",
				"delay",
				"label",
				"detail",
				"tone"
			], path, issues);
			if (id(link.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, link.id, `${path}.id`, issues);
			if (typeof link.from !== "string" || !variableIds.has(link.from)) issues.push(`${path}.from must reference a declared variable`);
			if (typeof link.to !== "string" || !variableIds.has(link.to)) issues.push(`${path}.to must reference a declared variable`);
			if (link.polarity !== "positive" && link.polarity !== "negative") issues.push(`${path}.polarity must be positive or negative`);
			if (link.delay !== void 0 && (typeof link.delay !== "number" || !Number.isFinite(link.delay) || link.delay < 0)) issues.push(`${path}.delay must be a non-negative finite number`);
			if (link.label !== void 0) text(link.label, `${path}.label`, issues, 160);
			if (link.detail !== void 0) text(link.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(link.tone, `${path}.tone`, issues);
		}
	}
	const linkIds = new Set(links.flatMap((link) => typeof link.id === "string" ? [link.id] : []));
	if (value.loops !== void 0) {
		if (!Array.isArray(value.loops) || value.loops.length < 1 || value.loops.length > 12) issues.push("visual.content.loops must contain 1 to 12 loops");
		else {
			const loops = value.loops.filter(record);
			if (loops.length !== value.loops.length) issues.push("visual.content.loops entries must be objects");
			uniqueIds(loops, "visual.content.loops", issues);
			for (const [index, loop] of loops.entries()) {
				const path = `visual.content.loops[${String(index)}]`;
				onlyKeys(loop, [
					"id",
					"label",
					"type",
					"linkIds",
					"detail",
					"tone"
				], path, issues);
				if (id(loop.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, loop.id, `${path}.id`, issues);
				text(loop.label, `${path}.label`, issues, 160);
				if (loop.type !== "reinforcing" && loop.type !== "balancing") issues.push(`${path}.type must be reinforcing or balancing`);
				if (!Array.isArray(loop.linkIds) || loop.linkIds.length < 1 || loop.linkIds.length > 96) issues.push(`${path}.linkIds must contain 1 to 96 link ids`);
				else {
					const seen = /* @__PURE__ */ new Set();
					for (const [linkIndex, linkId] of loop.linkIds.entries()) {
						const linkPath = `${path}.linkIds[${String(linkIndex)}]`;
						if (typeof linkId !== "string" || !linkIds.has(linkId)) issues.push(`${linkPath} must reference a declared link`);
						else if (seen.has(linkId)) issues.push(`${linkPath} duplicates ${linkId}`);
						else seen.add(linkId);
					}
				}
				if (loop.detail !== void 0) text(loop.detail, `${path}.detail`, issues, 1e3);
				validateVisualToneV4(loop.tone, `${path}.tone`, issues);
			}
		}
	}
	return focusIds;
}
function validateVisualSequenceV4(value, focusIds, issues) {
	if (value === void 0) return;
	if (!record(value)) {
		issues.push("visual.sequence must be an object");
		return;
	}
	onlyKeys(value, ["initialFrameId", "frames"], "visual.sequence", issues);
	if (!Array.isArray(value.frames) || value.frames.length < 2 || value.frames.length > 12) {
		issues.push("visual.sequence.frames must contain 2 to 12 frames");
		return;
	}
	const frames = value.frames.filter(record);
	if (frames.length !== value.frames.length) issues.push("visual.sequence.frames entries must be objects");
	uniqueIds(frames, "visual.sequence.frames", issues);
	const frameIds = /* @__PURE__ */ new Set();
	for (const [index, frame] of frames.entries()) {
		const path = `visual.sequence.frames[${String(index)}]`;
		onlyKeys(frame, [
			"id",
			"label",
			"description",
			"focusIds"
		], path, issues);
		if (id(frame.id, `${path}.id`, issues)) frameIds.add(frame.id);
		text(frame.label, `${path}.label`, issues, 120);
		if (frame.description !== void 0) text(frame.description, `${path}.description`, issues, 1e3);
		if (!Array.isArray(frame.focusIds) || frame.focusIds.length > 64) {
			issues.push(`${path}.focusIds must contain at most 64 ids`);
			continue;
		}
		const seen = /* @__PURE__ */ new Set();
		for (const [focusIndex, focusId] of frame.focusIds.entries()) if (typeof focusId !== "string" || !focusIds.has(focusId)) issues.push(`${path}.focusIds[${String(focusIndex)}] must reference visual content`);
		else if (seen.has(focusId)) issues.push(`${path}.focusIds duplicates ${focusId}`);
		else seen.add(focusId);
	}
	if (value.initialFrameId !== void 0 && (typeof value.initialFrameId !== "string" || !frameIds.has(value.initialFrameId))) issues.push("visual.sequence.initialFrameId must reference a declared frame");
}
/** Validate the semantic, model-facing visual protocol while retaining V3 replay separately. */
function parseLearningVisualV4(value) {
	const issues = [...validateLearningVisualSchemaV4(value)];
	const bytes = jsonBytes(value);
	if (bytes === void 0) issues.push("visual must be serializable JSON");
	else if (bytes > 65536) issues.push(`visual exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
	if (!record(value)) throw new LearningProtocolError([...issues, "visual must be an object"]);
	onlyKeys(value, [
		"protocol",
		"title",
		"description",
		"content",
		"sequence",
		"fallbackMarkdown"
	], "visual", issues);
	if (value.protocol !== "dsh-learning/visual@4") issues.push(`visual.protocol must be ${VISUAL_PROTOCOL_V4}`);
	text(value.title, "visual.title", issues, 200);
	if (value.description !== void 0) text(value.description, "visual.description", issues, 1e3);
	if (value.fallbackMarkdown !== void 0) text(value.fallbackMarkdown, "visual.fallbackMarkdown", issues, 8e3);
	let focusIds = /* @__PURE__ */ new Set();
	if (!record(value.content)) issues.push("visual.content must be an object");
	else if (value.content.kind === "plot") focusIds = validatePlotV4(value.content, issues);
	else if (value.content.kind === "node_link") focusIds = validateNodeLinkV4(value.content, issues);
	else if (value.content.kind === "scene_2d") focusIds = validateScene2DV4(value.content, issues);
	else if (value.content.kind === "relation") focusIds = validateRelationV4(value.content, issues);
	else if (value.content.kind === "timeline") focusIds = validateTimelineV4(value.content, issues);
	else if (value.content.kind === "formula_steps") focusIds = validateFormulaStepsV4(value.content, issues);
	else if (value.content.kind === "study_map") focusIds = validateStudyMapV4(value.content, issues);
	else if (value.content.kind === "recall_deck") focusIds = validateRecallDeckV4(value.content, issues);
	else if (value.content.kind === "data_table") focusIds = validateDataTableV4(value.content, issues);
	else if (value.content.kind === "state_transition") focusIds = validateStateTransitionV4(value.content, issues);
	else if (value.content.kind === "sequence_buffer") focusIds = validateSequenceBufferV4(value.content, issues);
	else if (value.content.kind === "sequence_diagram") focusIds = validateSequenceDiagramV4(value.content, issues);
	else if (value.content.kind === "code_trace") focusIds = validateCodeTraceV4(value.content, issues);
	else if (value.content.kind === "field_2d") focusIds = validateField2DV4(value.content, issues);
	else if (value.content.kind === "causal_loop") focusIds = validateCausalLoopV4(value.content, issues);
	else issues.push(`visual.content.kind must be one of ${LEARNING_VISUAL_KINDS_V4.join(", ")}`);
	validateVisualSequenceV4(value.sequence, focusIds, issues);
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
function parseLearningVisualResultV4(value) {
	const issues = [...validateLearningVisualResultSchemaV4(value)];
	if (!record(value)) throw new LearningProtocolError(["visual result must be an object"]);
	onlyKeys(value, [
		"protocol",
		"status",
		"content"
	], "visualResult", issues);
	if (value.protocol !== "dsh-learning/visual-result@4") issues.push(`visualResult.protocol must be ${VISUAL_RESULT_PROTOCOL_V4}`);
	if (!LEARNING_VISUAL_STATUSES.includes(value.status)) issues.push(`visualResult.status must be one of ${LEARNING_VISUAL_STATUSES.join(", ")}`);
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
/** Parse the small Client → Host recall bridge payload. */
function parseLearningRecallFeedbackV1(value) {
	const issues = [];
	if (!record(value)) throw new LearningProtocolError(["recall feedback must be an object"]);
	onlyKeys(value, [
		"protocol",
		"sessionId",
		"callId",
		"cardId",
		"status"
	], "recallFeedback", issues);
	if (value.protocol !== "dsh-learning/recall-feedback@1") issues.push(`recallFeedback.protocol must be ${RECALL_FEEDBACK_PROTOCOL_V1}`);
	boundedIdentity(value.sessionId, "recallFeedback.sessionId", issues);
	boundedIdentity(value.callId, "recallFeedback.callId", issues);
	boundedIdentity(value.cardId, "recallFeedback.cardId", issues, 128);
	if (!LEARNING_RECALL_STATUSES.includes(value.status)) issues.push(`recallFeedback.status must be one of ${LEARNING_RECALL_STATUSES.join(", ")}`);
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
//#endregion
export { MATH_UNARY_OPERATORS as C, learningCheckpointParametersOneStepV1 as D, VISUAL_RESULT_PROTOCOL_V4 as E, learningVisualParametersV4 as O, MATH_BINARY_OPERATORS as S, VISUAL_PROTOCOL_V4 as T, LEARNING_CHECKPOINT_KINDS as _, MAX_RESPONSE_BYTES as a, LEARNING_VISUAL_RESULT_SCHEMA_V4 as b, parseLearningCheckpointResultV1 as c, parseLearningVisualResultV4 as d, parseLearningVisualV4 as f, LEARNING_CHECKPOINT_EVIDENCE_KINDS as g, CHECKPOINT_RESULT_PROTOCOL as h, MAX_MATH_NODES as i, parseLearningCheckpointV1 as l, CHECKPOINT_PROTOCOL as m, LEARNING_RECALL_STATUSES as n, RECALL_FEEDBACK_PROTOCOL_V1 as o, LearningProtocolError as p, MAX_ACTIVITY_BYTES as r, isLearningCheckpointDisplayTextSafe as s, CHECKPOINT_TRANSPORT_PROTOCOL as t, parseLearningRecallFeedbackV1 as u, LEARNING_CHECKPOINT_RESULT_SCHEMA_V1 as v, MAX_VISUAL_MATH_DEPTH as w, LEARNING_VISUAL_STATUSES as x, LEARNING_VISUAL_KINDS_V4 as y };

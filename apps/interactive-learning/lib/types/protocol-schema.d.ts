/** Schema-first source for model-facing Learning visual and checkpoint payloads. */
import type { InferValue, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools';
export declare const VISUAL_PROTOCOL_V4: "dsh-learning/visual@4";
export declare const VISUAL_RESULT_PROTOCOL_V4: "dsh-learning/visual-result@4";
export declare const LEARNING_VISUAL_STATUSES: readonly ["ready", "unavailable"];
export declare const CHECKPOINT_PROTOCOL: "dsh-learning/checkpoint@1";
export declare const CHECKPOINT_RESULT_PROTOCOL: "dsh-learning/checkpoint-result@1";
export declare const LEARNING_CHECKPOINT_KINDS: readonly ["free_text", "single_choice", "numeric", "prediction", "code_slot"];
export declare const LEARNING_CHECKPOINT_EVIDENCE_KINDS: readonly ["attempt", "prediction", "explanation", "contrast", "transfer"];
export declare const LEARNING_VISUAL_KINDS_V4: readonly ["plot", "node_link", "scene_2d", "relation", "timeline", "formula_steps", "study_map", "recall_deck", "data_table", "state_transition", "sequence_buffer", "sequence_diagram", "code_trace", "field_2d", "causal_loop"];
export declare const MAX_VISUAL_MATH_DEPTH = 4;
export declare const MATH_BINARY_OPERATORS: readonly ["add", "sub", "mul", "div", "pow", "min", "max"];
export declare const MATH_UNARY_OPERATORS: readonly ["neg", "abs", "sqrt", "sin", "cos", "tan", "atan", "exp", "log", "sigmoid", "relu", "leaky_relu", "step", "normpdf", "floor", "ceil"];
export declare const LEARNING_VISUAL_SEQUENCE_SCHEMA_V4: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly initialFrameId: {
            readonly type: "string";
        };
        readonly frames: {
            readonly type: "array";
            readonly required: true;
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly id: {
                        readonly required: true;
                        readonly type: "string";
                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                    };
                    readonly label: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly description: {
                        readonly type: "string";
                    };
                    readonly focusIds: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly required: true;
                        readonly description: "At most 64 unique ids already declared by content.";
                    };
                };
            };
            readonly description: "2 to 12 sequence frames.";
        };
    };
};
export declare const LEARNING_CHECKPOINT_OPTION_SCHEMA_V1: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly id: {
            readonly required: true;
            readonly type: "string";
            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
        };
        readonly label: {
            readonly type: "string";
            readonly required: true;
        };
    };
};
export declare const LEARNING_CHECKPOINT_RESPONSE_SCHEMA_V1: {
    readonly oneOf: readonly [{
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly text: {
                readonly type: "string";
                readonly required: true;
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly optionId: {
                readonly required: true;
                readonly type: "string";
                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly number: {
                readonly type: "number";
                readonly required: true;
            };
        };
    }];
};
export declare const LEARNING_CHECKPOINT_RESULT_SCHEMA_V1: {
    readonly oneOf: readonly [{
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly protocol: {
                readonly type: "string";
                readonly const: "dsh-learning/checkpoint-result@1";
                readonly required: true;
            };
            readonly checkpointId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly status: {
                readonly type: "string";
                readonly const: "submitted";
                readonly required: true;
            };
            readonly response: {
                readonly required: true;
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly text: {
                            readonly type: "string";
                            readonly required: true;
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly optionId: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly number: {
                            readonly type: "number";
                            readonly required: true;
                        };
                    };
                }];
            };
            readonly receiptId: {
                readonly type: "string";
                readonly required: true;
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly protocol: {
                readonly type: "string";
                readonly const: "dsh-learning/checkpoint-result@1";
                readonly required: true;
            };
            readonly checkpointId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly status: {
                readonly type: "string";
                readonly const: "skipped";
                readonly required: true;
            };
            readonly reason: {
                readonly type: "string";
                readonly enum: readonly ["learner-skipped", "client-unavailable", "client-response-timeout", "host-unavailable", "provider-failure"];
            };
            readonly receiptId: {
                readonly type: "string";
                readonly required: true;
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly protocol: {
                readonly type: "string";
                readonly const: "dsh-learning/checkpoint-result@1";
                readonly required: true;
            };
            readonly checkpointId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly status: {
                readonly type: "string";
                readonly const: "cancelled";
                readonly required: true;
            };
            readonly reason: {
                readonly type: "string";
                readonly enum: readonly ["learner-cancelled", "session-aborted", "plugin-disposed"];
            };
            readonly receiptId: {
                readonly type: "string";
                readonly required: true;
            };
        };
    }];
};
export type LearningVisualSchemaKindV4 = typeof LEARNING_VISUAL_KINDS_V4[number];
export declare const LEARNING_VISUAL_CONTENT_SCHEMAS_V4: {
    readonly plot: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "plot";
                readonly required: true;
                readonly description: "Functions, quantitative data, probability, distributions, or tangent/secant geometry on Cartesian axes.";
            };
            readonly parameters: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9 or _. No hyphen, because expressions name this id and there a hyphen is subtraction. The id x is reserved for the chart axis.";
                            readonly required: true;
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly min: {
                            readonly type: "number";
                            readonly required: true;
                        };
                        readonly max: {
                            readonly type: "number";
                            readonly required: true;
                        };
                        readonly step: {
                            readonly type: "number";
                            readonly required: true;
                        };
                        readonly initial: {
                            readonly type: "number";
                            readonly required: true;
                        };
                    };
                };
                readonly description: string;
            };
            readonly xAxis: {
                readonly required: true;
                readonly properties: {
                    readonly samples: {
                        readonly type: "integer";
                        readonly description: "Optional curve samples from 24 to 256.";
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly min: {
                        readonly type: "number";
                        readonly required: true;
                    };
                    readonly max: {
                        readonly type: "number";
                        readonly required: true;
                    };
                };
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly yAxis: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly min: {
                        readonly type: "number";
                        readonly required: true;
                    };
                    readonly max: {
                        readonly type: "number";
                        readonly required: true;
                    };
                };
            } & {
                required: true;
            };
            readonly series: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly oneOf: readonly [{
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly const: "curve";
                                readonly required: true;
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly expression: {
                                readonly description: string;
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                            readonly stroke: {
                                readonly type: "string";
                                readonly enum: readonly ["solid", "dashed", "dotted"];
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly const: "points";
                                readonly required: true;
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly points: {
                                readonly type: "array";
                                readonly required: true;
                                readonly items: {
                                    readonly type: "object";
                                    readonly additionalProperties: false;
                                    readonly properties: {
                                        readonly x: {
                                            readonly type: "number";
                                            readonly required: true;
                                        };
                                        readonly y: {
                                            readonly type: "number";
                                            readonly required: true;
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly description: "1 to 256 points.";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly const: "line";
                                readonly required: true;
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly points: {
                                readonly type: "array";
                                readonly required: true;
                                readonly items: {
                                    readonly type: "object";
                                    readonly additionalProperties: false;
                                    readonly properties: {
                                        readonly x: {
                                            readonly type: "number";
                                            readonly required: true;
                                        };
                                        readonly y: {
                                            readonly type: "number";
                                            readonly required: true;
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly description: "1 to 256 points.";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                            readonly stroke: {
                                readonly type: "string";
                                readonly enum: readonly ["solid", "dashed", "dotted"];
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly const: "bars";
                                readonly required: true;
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly points: {
                                readonly type: "array";
                                readonly required: true;
                                readonly items: {
                                    readonly type: "object";
                                    readonly additionalProperties: false;
                                    readonly properties: {
                                        readonly x: {
                                            readonly type: "number";
                                            readonly required: true;
                                        };
                                        readonly y: {
                                            readonly type: "number";
                                            readonly required: true;
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly description: "1 to 64 bars.";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                        };
                    }];
                };
                readonly description: "1 to 8 series.";
            };
            readonly metrics: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly expression: {
                            readonly description: string;
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly digits: {
                            readonly type: "integer";
                        };
                        readonly suffix: {
                            readonly type: "string";
                        };
                    };
                };
                readonly description: "Optional; at most 4 metrics.";
            };
        };
    };
    readonly node_link: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "node_link";
                readonly required: true;
                readonly description: "Networks, fully connected layers, trees, causality, concept maps, state transitions, and dependency topology.";
            };
            readonly layout: {
                readonly type: "string";
                readonly enum: readonly ["layered", "hierarchy", "radial"];
                readonly required: true;
            };
            readonly groups: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                    };
                };
                readonly description: "Optional 1 to 12 ordered layers for layered layout; every node must reference one group.";
            };
            readonly nodes: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly group: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly required: true;
                readonly description: "2 to 48 nodes.";
            };
            readonly edges: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly from: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly to: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly label: {
                            readonly type: "string";
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                        readonly stroke: {
                            readonly type: "string";
                            readonly enum: readonly ["solid", "dashed", "dotted"];
                        };
                        readonly directed: {
                            readonly type: "boolean";
                        };
                    };
                };
                readonly required: true;
                readonly description: "1 to 160 edges; include every semantically required connection.";
            };
        };
    };
    readonly scene_2d: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "scene_2d";
                readonly required: true;
                readonly description: "Geometry, vectors, forces, spatial relationships, and annotated scientific schematics.";
            };
            readonly xAxis: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly min: {
                        readonly type: "number";
                        readonly required: true;
                    };
                    readonly max: {
                        readonly type: "number";
                        readonly required: true;
                    };
                };
            } & {
                required: true;
            };
            readonly yAxis: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly min: {
                        readonly type: "number";
                        readonly required: true;
                    };
                    readonly max: {
                        readonly type: "number";
                        readonly required: true;
                    };
                };
            } & {
                required: true;
            };
            readonly grid: {
                readonly type: "boolean";
            };
            readonly elements: {
                readonly type: "array";
                readonly items: {
                    readonly oneOf: readonly [{
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly x: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly y: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly size: {
                                readonly type: "number";
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly const: "point";
                                readonly required: true;
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly x1: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly y1: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly x2: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly y2: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly stroke: {
                                readonly type: "string";
                                readonly enum: readonly ["solid", "dashed", "dotted"];
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly enum: readonly ["segment", "arrow"];
                                readonly required: true;
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly cx: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly cy: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly r: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly const: "circle";
                                readonly required: true;
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly x: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly y: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly width: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly height: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly const: "rect";
                                readonly required: true;
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly points: {
                                readonly type: "array";
                                readonly required: true;
                                readonly items: {
                                    readonly type: "object";
                                    readonly additionalProperties: false;
                                    readonly properties: {
                                        readonly x: {
                                            readonly type: "number";
                                            readonly required: true;
                                        };
                                        readonly y: {
                                            readonly type: "number";
                                            readonly required: true;
                                        };
                                    };
                                };
                                readonly description: "3 to 24 polygon vertices.";
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly const: "polygon";
                                readonly required: true;
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly x: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly y: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly text: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly const: "label";
                                readonly required: true;
                            };
                        };
                    }];
                };
                readonly required: true;
                readonly description: "1 to 64 scene elements.";
            };
        };
    };
    readonly relation: {
        readonly oneOf: readonly [{
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly type: "string";
                    readonly const: "relation";
                    readonly required: true;
                };
                readonly variant: {
                    readonly type: "string";
                    readonly const: "comparison";
                    readonly required: true;
                };
                readonly subjects: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                        };
                    };
                    readonly required: true;
                    readonly description: "2 to 4 subjects.";
                };
                readonly rows: {
                    readonly type: "array";
                    readonly required: true;
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly cells: {
                                readonly type: "array";
                                readonly required: true;
                                readonly items: {
                                    readonly type: "object";
                                    readonly additionalProperties: false;
                                    readonly properties: {
                                        readonly subjectId: {
                                            readonly type: "string";
                                            readonly required: true;
                                        };
                                        readonly value: {
                                            readonly type: "string";
                                            readonly required: true;
                                        };
                                        readonly tone: {
                                            readonly type: "string";
                                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                        };
                                    };
                                };
                                readonly description: "1 to 4 cells; each subjectId must reference a declared subject.";
                            };
                        };
                    };
                    readonly description: "1 to 16 comparison rows.";
                };
            };
        }, {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly type: "string";
                    readonly const: "relation";
                    readonly required: true;
                };
                readonly variant: {
                    readonly type: "string";
                    readonly const: "matrix";
                    readonly required: true;
                };
                readonly rows: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                        };
                    };
                    readonly required: true;
                    readonly description: "1 to 10 matrix rows.";
                };
                readonly columns: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                        };
                    };
                    readonly required: true;
                    readonly description: "1 to 10 matrix columns.";
                };
                readonly cells: {
                    readonly type: "array";
                    readonly required: true;
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly rowId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly columnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                        };
                    };
                    readonly description: "1 to 64 matrix cells; rowId and columnId must reference declared axes.";
                };
            };
        }, {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly type: "string";
                    readonly const: "relation";
                    readonly required: true;
                };
                readonly variant: {
                    readonly type: "string";
                    readonly const: "sets";
                    readonly required: true;
                };
                readonly sets: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                            readonly tone: {
                                readonly type: "string";
                                readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                            };
                        };
                    };
                    readonly required: true;
                    readonly description: "2 to 3 sets.";
                };
                readonly items: {
                    readonly type: "array";
                    readonly required: true;
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly setIds: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                                readonly required: true;
                                readonly description: "1 to 3 unique ids referencing declared sets.";
                            };
                            readonly detail: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly description: "1 to 24 set items.";
                };
            };
        }];
    };
    readonly timeline: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "timeline";
                readonly required: true;
                readonly description: "Ordered historical events, scientific discoveries, biographies, eras, or other chronology where time order is the structure.";
            };
            readonly orientation: {
                readonly type: "string";
                readonly enum: readonly ["horizontal", "vertical"];
            };
            readonly events: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly time: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly position: {
                            readonly type: "number";
                            readonly description: "Optional normalized position from 0 to 1. Provide it for every event or omit it for every event.";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly required: true;
                readonly description: "2 to 32 events in chronological order.";
            };
            readonly eras: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly startEventId: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly endEventId: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "Optional 1 to 8 eras; startEventId and endEventId must reference declared events in order.";
            };
        };
    };
    readonly formula_steps: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "formula_steps";
                readonly required: true;
                readonly description: "A derivation, algebraic transformation, proof chain, or symbolic simplification where the rule between steps matters. Not for merely recalling one formula.";
            };
            readonly notation: {
                readonly type: "string";
                readonly description: "Optional short notation key used across the derivation.";
            };
            readonly steps: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly expression: {
                            readonly type: "string";
                            readonly required: true;
                            readonly description: "One LaTeX display expression without dollar delimiters; use commands such as \\lim_{h \\to 0} and ^{\\prime}.";
                        };
                        readonly label: {
                            readonly type: "string";
                        };
                        readonly rule: {
                            readonly type: "string";
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "2 to 16 formula steps.";
            };
            readonly conclusion: {
                readonly type: "string";
            };
        };
    };
    readonly study_map: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "study_map";
                readonly required: true;
                readonly description: "A navigable overview of supplied material, or the Host-materialized state of saved learner concepts.";
            };
            readonly view: {
                readonly type: "string";
                readonly enum: readonly ["material", "concepts"];
                readonly description: "Use concepts to request the saved concept-card state; the Host supplies its sections and cards.";
            };
            readonly sourceLabel: {
                readonly type: "string";
                readonly required: true;
            };
            readonly goal: {
                readonly type: "string";
            };
            readonly sections: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly anchor: {
                            readonly type: "string";
                            readonly description: "Human-readable source location, such as Chapter 2 or pp. 18–23.";
                        };
                        readonly summary: {
                            readonly type: "string";
                        };
                    };
                };
                readonly description: "1 to 16 source sections.";
            };
            readonly concepts: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly sectionId: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly conceptSlug: {
                            readonly type: "string";
                            readonly description: "Saved concept-card identity in concepts view.";
                        };
                        readonly mastery: {
                            readonly type: "string";
                            readonly enum: readonly ["unseen", "emerging", "transfer"];
                        };
                        readonly due: {
                            readonly type: "string";
                            readonly description: "Next review date in YYYY-MM-DD form.";
                        };
                        readonly stale: {
                            readonly type: "boolean";
                            readonly description: "Whether one or more saved source anchors no longer resolve.";
                        };
                        readonly prerequisiteIds: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                            readonly description: "Optional; at most 8 unique declared concept ids, excluding this concept, with no cycles.";
                        };
                        readonly role: {
                            readonly type: "string";
                            readonly enum: readonly ["foundation", "core", "extension", "practice"];
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "1 to 48 concepts; every sectionId must reference a declared section.";
            };
        };
    };
    readonly recall_deck: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "recall_deck";
                readonly required: true;
                readonly description: "A requested flashcard or active-recall set with hidden answers, hints, and local review state. Use only after the relevant material is known.";
            };
            readonly instructions: {
                readonly type: "string";
            };
            readonly cards: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly prompt: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly answer: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly hint: {
                            readonly type: "string";
                        };
                        readonly tags: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                            readonly description: "Optional; at most 6 unique labels.";
                        };
                    };
                };
                readonly description: "2 to 32 recall cards.";
            };
        };
    };
    readonly data_table: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "data_table";
                readonly required: true;
                readonly description: "A typed record table for inspecting real data, filtering rows, sorting values, marking outliers, or linking tabular values to a chart.";
            };
            readonly columns: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly enum: readonly ["string", "number", "boolean", "date"];
                            readonly required: true;
                        };
                        readonly unit: {
                            readonly type: "string";
                        };
                    };
                };
                readonly description: "1 to 24 typed columns.";
            };
            readonly rows: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly cells: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly columnId: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly value: {
                                        readonly required: true;
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }, {
                                            readonly type: "null";
                                        }];
                                    };
                                };
                            };
                            readonly description: "One cell per declared column; columnId must reference a declared column.";
                        };
                    };
                };
                readonly description: "1 to 128 records.";
            };
            readonly outlierIds: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
                readonly description: "Optional row ids to emphasize as anomalies.";
            };
            readonly initialSort: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly columnId: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly direction: {
                        readonly type: "string";
                        readonly enum: readonly ["asc", "desc"];
                        readonly required: true;
                    };
                };
            };
            readonly initialFilter: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly columnId: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly operator: {
                        readonly type: "string";
                        readonly enum: readonly ["equals", "not_equals", "contains", "gt", "gte", "lt", "lte"];
                        readonly required: true;
                    };
                    readonly value: {
                        readonly required: true;
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "number";
                        }, {
                            readonly type: "boolean";
                        }, {
                            readonly type: "null";
                        }];
                    };
                };
            };
            readonly chart: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["line", "bar", "scatter"];
                        readonly required: true;
                    };
                    readonly xColumnId: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly yColumnId: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly seriesColumnId: {
                        readonly type: "string";
                    };
                };
            };
        };
    };
    readonly state_transition: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "state_transition";
                readonly required: true;
                readonly description: "A state machine where an event triggers a transition from one explicit state to another, optionally with guard and action.";
            };
            readonly states: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                        readonly initial: {
                            readonly type: "boolean";
                        };
                        readonly final: {
                            readonly type: "boolean";
                        };
                    };
                };
                readonly description: "2 to 32 states; mark initial/final states when the lifecycle has them.";
            };
            readonly transitions: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly from: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly to: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly trigger: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly guard: {
                            readonly type: "string";
                        };
                        readonly action: {
                            readonly type: "string";
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "1 to 96 transitions; from and to must reference declared states.";
            };
            readonly steps: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly currentStateId: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly transitionId: {
                            readonly type: "string";
                        };
                        readonly description: {
                            readonly type: "string";
                        };
                    };
                };
                readonly description: "Optional 2 to 16 execution steps; each names the current state and optional transition just taken.";
            };
        };
    };
    readonly sequence_buffer: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "sequence_buffer";
                readonly required: true;
                readonly description: "Discrete indexed slots with moving pointers, highlighted intervals, and snapshots for array, window, parsing, or protocol algorithms.";
            };
            readonly slots: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly index: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly value: {
                            readonly required: true;
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }, {
                                readonly type: "boolean";
                            }, {
                                readonly type: "null";
                            }];
                        };
                        readonly label: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "1 to 128 ordered slots; index values must be unique.";
            };
            readonly pointers: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly index: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "Optional 1 to 8 named pointers.";
            };
            readonly ranges: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly start: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly end: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "Optional 1 to 8 inclusive index intervals.";
            };
            readonly steps: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly description: {
                            readonly type: "string";
                        };
                        readonly slots: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly slotId: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly value: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }, {
                                            readonly type: "null";
                                        }];
                                    };
                                };
                            };
                        };
                        readonly pointers: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly pointerId: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly index: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                };
                            };
                        };
                        readonly ranges: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly rangeId: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly start: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                    readonly end: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                };
                            };
                        };
                    };
                };
                readonly description: "Optional 2 to 16 snapshots. Include only the collections that change in each snapshot.";
            };
        };
    };
    readonly sequence_diagram: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "sequence_diagram";
                readonly required: true;
                readonly description: "Ordered messages exchanged by API clients, services, protocols, cells, or collaborating roles.";
            };
            readonly participants: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "2 to 16 lifeline participants.";
            };
            readonly messages: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly from: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly to: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly enum: readonly ["sync", "async", "return", "self"];
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "1 to 96 messages in top-to-bottom order; from and to must reference participants.";
            };
        };
    };
    readonly code_trace: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "code_trace";
                readonly required: true;
                readonly description: "Source lines paired with execution steps, current line, variable values, call stack, and output.";
            };
            readonly language: {
                readonly type: "string";
                readonly required: true;
            };
            readonly code: {
                readonly type: "string";
                readonly required: true;
                readonly description: "Complete source text shown above or beside the trace.";
            };
            readonly lines: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly number: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly text: {
                            readonly type: "string";
                            readonly required: true;
                        };
                    };
                };
                readonly description: "1 to 256 numbered source lines.";
            };
            readonly steps: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly currentLine: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly variables: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly name: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly value: {
                                        readonly required: true;
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }, {
                                            readonly type: "null";
                                        }];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                    };
                                };
                            };
                        };
                        readonly stack: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly function: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly line: {
                                        readonly type: "integer";
                                    };
                                };
                            };
                        };
                        readonly output: {
                            readonly type: "string";
                        };
                        readonly description: {
                            readonly type: "string";
                        };
                    };
                };
                readonly description: "2 to 32 execution snapshots.";
            };
        };
    };
    readonly field_2d: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "field_2d";
                readonly required: true;
                readonly description: "A sampled or mathematically defined scalar heatmap, contour field, vector field, or gradient over two axes.";
            };
            readonly xAxis: {
                readonly required: true;
                readonly properties: {
                    readonly samples: {
                        readonly type: "integer";
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly min: {
                        readonly type: "number";
                        readonly required: true;
                    };
                    readonly max: {
                        readonly type: "number";
                        readonly required: true;
                    };
                };
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly yAxis: {
                readonly required: true;
                readonly properties: {
                    readonly samples: {
                        readonly type: "integer";
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly min: {
                        readonly type: "number";
                        readonly required: true;
                    };
                    readonly max: {
                        readonly type: "number";
                        readonly required: true;
                    };
                };
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly scalar: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly samples: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly values: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "number";
                                };
                                readonly required: true;
                                readonly description: "Flattened row-major values; length must equal rows * columns.";
                            };
                            readonly columns: {
                                readonly type: "integer";
                                readonly required: true;
                            };
                            readonly rows: {
                                readonly type: "integer";
                                readonly required: true;
                            };
                        };
                    };
                    readonly expression: {
                        readonly description: `Scalar field over x and y. ${string}`;
                        readonly type: "string";
                    };
                    readonly min: {
                        readonly type: "number";
                    };
                    readonly max: {
                        readonly type: "number";
                    };
                };
            };
            readonly vector: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly samples: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly u: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "number";
                                };
                                readonly required: true;
                                readonly description: "Flattened horizontal components; length must equal rows * columns.";
                            };
                            readonly v: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "number";
                                };
                                readonly required: true;
                                readonly description: "Flattened vertical components; length must equal rows * columns.";
                            };
                            readonly columns: {
                                readonly type: "integer";
                                readonly required: true;
                            };
                            readonly rows: {
                                readonly type: "integer";
                                readonly required: true;
                            };
                        };
                    };
                    readonly expression: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly u: {
                                readonly description: `Horizontal component using x and y. ${string}`;
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly v: {
                                readonly description: `Vertical component using x and y. ${string}`;
                                readonly type: "string";
                                readonly required: true;
                            };
                        };
                    };
                };
            };
        };
    };
    readonly causal_loop: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "causal_loop";
                readonly required: true;
                readonly description: "A causal feedback diagram with positive or negative polarity, optional delay, and named reinforcing or balancing loops.";
            };
            readonly variables: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "2 to 32 causal variables.";
            };
            readonly links: {
                readonly type: "array";
                readonly required: true;
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly from: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly to: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly polarity: {
                            readonly type: "string";
                            readonly enum: readonly ["positive", "negative"];
                            readonly required: true;
                        };
                        readonly delay: {
                            readonly type: "number";
                        };
                        readonly label: {
                            readonly type: "string";
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "1 to 96 directed links; from and to must reference variables.";
            };
            readonly loops: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly id: {
                            readonly required: true;
                            readonly type: "string";
                            readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                        };
                        readonly label: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly enum: readonly ["reinforcing", "balancing"];
                            readonly required: true;
                        };
                        readonly linkIds: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                            readonly required: true;
                        };
                        readonly detail: {
                            readonly type: "string";
                        };
                        readonly tone: {
                            readonly type: "string";
                            readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                        };
                    };
                };
                readonly description: "Optional 1 to 12 named feedback loops; linkIds must reference declared links in cycle order.";
            };
        };
    };
};
export declare const LEARNING_VISUAL_SCHEMA_V4: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly protocol: {
            readonly type: "string";
            readonly const: "dsh-learning/visual@4";
            readonly required: true;
        };
        readonly title: {
            readonly type: "string";
            readonly required: true;
        };
        readonly description: {
            readonly type: "string";
        };
        readonly content: {
            readonly required: true;
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "plot";
                        readonly required: true;
                        readonly description: "Functions, quantitative data, probability, distributions, or tangent/secant geometry on Cartesian axes.";
                    };
                    readonly parameters: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9 or _. No hyphen, because expressions name this id and there a hyphen is subtraction. The id x is reserved for the chart axis.";
                                    readonly required: true;
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly min: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly max: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly step: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly initial: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                            };
                        };
                        readonly description: string;
                    };
                    readonly xAxis: {
                        readonly required: true;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "integer";
                                readonly description: "Optional curve samples from 24 to 256.";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                        readonly type: "object";
                        readonly additionalProperties: false;
                    };
                    readonly yAxis: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                    } & {
                        required: true;
                    };
                    readonly series: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "curve";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly expression: {
                                        readonly description: string;
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly stroke: {
                                        readonly type: "string";
                                        readonly enum: readonly ["solid", "dashed", "dotted"];
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "points";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly points: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly x: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly y: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly label: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly description: "1 to 256 points.";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "line";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly points: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly x: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly y: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly label: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly description: "1 to 256 points.";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly stroke: {
                                        readonly type: "string";
                                        readonly enum: readonly ["solid", "dashed", "dotted"];
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "bars";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly points: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly x: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly y: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly label: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly description: "1 to 64 bars.";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            }];
                        };
                        readonly description: "1 to 8 series.";
                    };
                    readonly metrics: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly expression: {
                                    readonly description: string;
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly digits: {
                                    readonly type: "integer";
                                };
                                readonly suffix: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "Optional; at most 4 metrics.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "node_link";
                        readonly required: true;
                        readonly description: "Networks, fully connected layers, trees, causality, concept maps, state transitions, and dependency topology.";
                    };
                    readonly layout: {
                        readonly type: "string";
                        readonly enum: readonly ["layered", "hierarchy", "radial"];
                        readonly required: true;
                    };
                    readonly groups: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                            };
                        };
                        readonly description: "Optional 1 to 12 ordered layers for layered layout; every node must reference one group.";
                    };
                    readonly nodes: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly group: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly required: true;
                        readonly description: "2 to 48 nodes.";
                    };
                    readonly edges: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly from: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly to: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                                readonly stroke: {
                                    readonly type: "string";
                                    readonly enum: readonly ["solid", "dashed", "dotted"];
                                };
                                readonly directed: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                        readonly required: true;
                        readonly description: "1 to 160 edges; include every semantically required connection.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "scene_2d";
                        readonly required: true;
                        readonly description: "Geometry, vectors, forces, spatial relationships, and annotated scientific schematics.";
                    };
                    readonly xAxis: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                    } & {
                        required: true;
                    };
                    readonly yAxis: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                    } & {
                        required: true;
                    };
                    readonly grid: {
                        readonly type: "boolean";
                    };
                    readonly elements: {
                        readonly type: "array";
                        readonly items: {
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly size: {
                                        readonly type: "number";
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "point";
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x1: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y1: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly x2: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y2: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly stroke: {
                                        readonly type: "string";
                                        readonly enum: readonly ["solid", "dashed", "dotted"];
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly enum: readonly ["segment", "arrow"];
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly cx: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly cy: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly r: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "circle";
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly width: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly height: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "rect";
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly points: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly x: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly y: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                            };
                                        };
                                        readonly description: "3 to 24 polygon vertices.";
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "polygon";
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly text: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "label";
                                        readonly required: true;
                                    };
                                };
                            }];
                        };
                        readonly required: true;
                        readonly description: "1 to 64 scene elements.";
                    };
                };
            }, {
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly kind: {
                            readonly type: "string";
                            readonly const: "relation";
                            readonly required: true;
                        };
                        readonly variant: {
                            readonly type: "string";
                            readonly const: "comparison";
                            readonly required: true;
                        };
                        readonly subjects: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            };
                            readonly required: true;
                            readonly description: "2 to 4 subjects.";
                        };
                        readonly rows: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly cells: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly subjectId: {
                                                    readonly type: "string";
                                                    readonly required: true;
                                                };
                                                readonly value: {
                                                    readonly type: "string";
                                                    readonly required: true;
                                                };
                                                readonly tone: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                                };
                                            };
                                        };
                                        readonly description: "1 to 4 cells; each subjectId must reference a declared subject.";
                                    };
                                };
                            };
                            readonly description: "1 to 16 comparison rows.";
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly kind: {
                            readonly type: "string";
                            readonly const: "relation";
                            readonly required: true;
                        };
                        readonly variant: {
                            readonly type: "string";
                            readonly const: "matrix";
                            readonly required: true;
                        };
                        readonly rows: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly required: true;
                            readonly description: "1 to 10 matrix rows.";
                        };
                        readonly columns: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly required: true;
                            readonly description: "1 to 10 matrix columns.";
                        };
                        readonly cells: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly rowId: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly columnId: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            };
                            readonly description: "1 to 64 matrix cells; rowId and columnId must reference declared axes.";
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly kind: {
                            readonly type: "string";
                            readonly const: "relation";
                            readonly required: true;
                        };
                        readonly variant: {
                            readonly type: "string";
                            readonly const: "sets";
                            readonly required: true;
                        };
                        readonly sets: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            };
                            readonly required: true;
                            readonly description: "2 to 3 sets.";
                        };
                        readonly items: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly setIds: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                        readonly required: true;
                                        readonly description: "1 to 3 unique ids referencing declared sets.";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly description: "1 to 24 set items.";
                        };
                    };
                }];
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "timeline";
                        readonly required: true;
                        readonly description: "Ordered historical events, scientific discoveries, biographies, eras, or other chronology where time order is the structure.";
                    };
                    readonly orientation: {
                        readonly type: "string";
                        readonly enum: readonly ["horizontal", "vertical"];
                    };
                    readonly events: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly time: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly position: {
                                    readonly type: "number";
                                    readonly description: "Optional normalized position from 0 to 1. Provide it for every event or omit it for every event.";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly required: true;
                        readonly description: "2 to 32 events in chronological order.";
                    };
                    readonly eras: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly startEventId: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly endEventId: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "Optional 1 to 8 eras; startEventId and endEventId must reference declared events in order.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "formula_steps";
                        readonly required: true;
                        readonly description: "A derivation, algebraic transformation, proof chain, or symbolic simplification where the rule between steps matters. Not for merely recalling one formula.";
                    };
                    readonly notation: {
                        readonly type: "string";
                        readonly description: "Optional short notation key used across the derivation.";
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly expression: {
                                    readonly type: "string";
                                    readonly required: true;
                                    readonly description: "One LaTeX display expression without dollar delimiters; use commands such as \\lim_{h \\to 0} and ^{\\prime}.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly rule: {
                                    readonly type: "string";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "2 to 16 formula steps.";
                    };
                    readonly conclusion: {
                        readonly type: "string";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "study_map";
                        readonly required: true;
                        readonly description: "A navigable overview of supplied material, or the Host-materialized state of saved learner concepts.";
                    };
                    readonly view: {
                        readonly type: "string";
                        readonly enum: readonly ["material", "concepts"];
                        readonly description: "Use concepts to request the saved concept-card state; the Host supplies its sections and cards.";
                    };
                    readonly sourceLabel: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly goal: {
                        readonly type: "string";
                    };
                    readonly sections: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly anchor: {
                                    readonly type: "string";
                                    readonly description: "Human-readable source location, such as Chapter 2 or pp. 18–23.";
                                };
                                readonly summary: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "1 to 16 source sections.";
                    };
                    readonly concepts: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly sectionId: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly conceptSlug: {
                                    readonly type: "string";
                                    readonly description: "Saved concept-card identity in concepts view.";
                                };
                                readonly mastery: {
                                    readonly type: "string";
                                    readonly enum: readonly ["unseen", "emerging", "transfer"];
                                };
                                readonly due: {
                                    readonly type: "string";
                                    readonly description: "Next review date in YYYY-MM-DD form.";
                                };
                                readonly stale: {
                                    readonly type: "boolean";
                                    readonly description: "Whether one or more saved source anchors no longer resolve.";
                                };
                                readonly prerequisiteIds: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly description: "Optional; at most 8 unique declared concept ids, excluding this concept, with no cycles.";
                                };
                                readonly role: {
                                    readonly type: "string";
                                    readonly enum: readonly ["foundation", "core", "extension", "practice"];
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 48 concepts; every sectionId must reference a declared section.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "recall_deck";
                        readonly required: true;
                        readonly description: "A requested flashcard or active-recall set with hidden answers, hints, and local review state. Use only after the relevant material is known.";
                    };
                    readonly instructions: {
                        readonly type: "string";
                    };
                    readonly cards: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly prompt: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly answer: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly hint: {
                                    readonly type: "string";
                                };
                                readonly tags: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly description: "Optional; at most 6 unique labels.";
                                };
                            };
                        };
                        readonly description: "2 to 32 recall cards.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "data_table";
                        readonly required: true;
                        readonly description: "A typed record table for inspecting real data, filtering rows, sorting values, marking outliers, or linking tabular values to a chart.";
                    };
                    readonly columns: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["string", "number", "boolean", "date"];
                                    readonly required: true;
                                };
                                readonly unit: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "1 to 24 typed columns.";
                    };
                    readonly rows: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly cells: {
                                    readonly type: "array";
                                    readonly required: true;
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly columnId: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly value: {
                                                readonly required: true;
                                                readonly oneOf: readonly [{
                                                    readonly type: "string";
                                                }, {
                                                    readonly type: "number";
                                                }, {
                                                    readonly type: "boolean";
                                                }, {
                                                    readonly type: "null";
                                                }];
                                            };
                                        };
                                    };
                                    readonly description: "One cell per declared column; columnId must reference a declared column.";
                                };
                            };
                        };
                        readonly description: "1 to 128 records.";
                    };
                    readonly outlierIds: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly description: "Optional row ids to emphasize as anomalies.";
                    };
                    readonly initialSort: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly columnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly direction: {
                                readonly type: "string";
                                readonly enum: readonly ["asc", "desc"];
                                readonly required: true;
                            };
                        };
                    };
                    readonly initialFilter: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly columnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly operator: {
                                readonly type: "string";
                                readonly enum: readonly ["equals", "not_equals", "contains", "gt", "gte", "lt", "lte"];
                                readonly required: true;
                            };
                            readonly value: {
                                readonly required: true;
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "number";
                                }, {
                                    readonly type: "boolean";
                                }, {
                                    readonly type: "null";
                                }];
                            };
                        };
                    };
                    readonly chart: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly enum: readonly ["line", "bar", "scatter"];
                                readonly required: true;
                            };
                            readonly xColumnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly yColumnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly seriesColumnId: {
                                readonly type: "string";
                            };
                        };
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "state_transition";
                        readonly required: true;
                        readonly description: "A state machine where an event triggers a transition from one explicit state to another, optionally with guard and action.";
                    };
                    readonly states: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                                readonly initial: {
                                    readonly type: "boolean";
                                };
                                readonly final: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                        readonly description: "2 to 32 states; mark initial/final states when the lifecycle has them.";
                    };
                    readonly transitions: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly from: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly to: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly trigger: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly guard: {
                                    readonly type: "string";
                                };
                                readonly action: {
                                    readonly type: "string";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 96 transitions; from and to must reference declared states.";
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly currentStateId: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly transitionId: {
                                    readonly type: "string";
                                };
                                readonly description: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "Optional 2 to 16 execution steps; each names the current state and optional transition just taken.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "sequence_buffer";
                        readonly required: true;
                        readonly description: "Discrete indexed slots with moving pointers, highlighted intervals, and snapshots for array, window, parsing, or protocol algorithms.";
                    };
                    readonly slots: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly index: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly value: {
                                    readonly required: true;
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "number";
                                    }, {
                                        readonly type: "boolean";
                                    }, {
                                        readonly type: "null";
                                    }];
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 128 ordered slots; index values must be unique.";
                    };
                    readonly pointers: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly index: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "Optional 1 to 8 named pointers.";
                    };
                    readonly ranges: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly start: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly end: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "Optional 1 to 8 inclusive index intervals.";
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly description: {
                                    readonly type: "string";
                                };
                                readonly slots: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly slotId: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly value: {
                                                readonly oneOf: readonly [{
                                                    readonly type: "string";
                                                }, {
                                                    readonly type: "number";
                                                }, {
                                                    readonly type: "boolean";
                                                }, {
                                                    readonly type: "null";
                                                }];
                                            };
                                        };
                                    };
                                };
                                readonly pointers: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly pointerId: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly index: {
                                                readonly type: "integer";
                                                readonly required: true;
                                            };
                                        };
                                    };
                                };
                                readonly ranges: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly rangeId: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly start: {
                                                readonly type: "integer";
                                                readonly required: true;
                                            };
                                            readonly end: {
                                                readonly type: "integer";
                                                readonly required: true;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                        readonly description: "Optional 2 to 16 snapshots. Include only the collections that change in each snapshot.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "sequence_diagram";
                        readonly required: true;
                        readonly description: "Ordered messages exchanged by API clients, services, protocols, cells, or collaborating roles.";
                    };
                    readonly participants: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "2 to 16 lifeline participants.";
                    };
                    readonly messages: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly from: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly to: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["sync", "async", "return", "self"];
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 96 messages in top-to-bottom order; from and to must reference participants.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "code_trace";
                        readonly required: true;
                        readonly description: "Source lines paired with execution steps, current line, variable values, call stack, and output.";
                    };
                    readonly language: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly code: {
                        readonly type: "string";
                        readonly required: true;
                        readonly description: "Complete source text shown above or beside the trace.";
                    };
                    readonly lines: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly number: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly text: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                            };
                        };
                        readonly description: "1 to 256 numbered source lines.";
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly currentLine: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly variables: {
                                    readonly type: "array";
                                    readonly required: true;
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly name: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly value: {
                                                readonly required: true;
                                                readonly oneOf: readonly [{
                                                    readonly type: "string";
                                                }, {
                                                    readonly type: "number";
                                                }, {
                                                    readonly type: "boolean";
                                                }, {
                                                    readonly type: "null";
                                                }];
                                            };
                                            readonly type: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                };
                                readonly stack: {
                                    readonly type: "array";
                                    readonly required: true;
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly id: {
                                                readonly required: true;
                                                readonly type: "string";
                                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                            };
                                            readonly function: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly line: {
                                                readonly type: "integer";
                                            };
                                        };
                                    };
                                };
                                readonly output: {
                                    readonly type: "string";
                                };
                                readonly description: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "2 to 32 execution snapshots.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "field_2d";
                        readonly required: true;
                        readonly description: "A sampled or mathematically defined scalar heatmap, contour field, vector field, or gradient over two axes.";
                    };
                    readonly xAxis: {
                        readonly required: true;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "integer";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                        readonly type: "object";
                        readonly additionalProperties: false;
                    };
                    readonly yAxis: {
                        readonly required: true;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "integer";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                        readonly type: "object";
                        readonly additionalProperties: false;
                    };
                    readonly scalar: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly values: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "number";
                                        };
                                        readonly required: true;
                                        readonly description: "Flattened row-major values; length must equal rows * columns.";
                                    };
                                    readonly columns: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                    readonly rows: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly expression: {
                                readonly description: `Scalar field over x and y. ${string}`;
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                            };
                            readonly max: {
                                readonly type: "number";
                            };
                        };
                    };
                    readonly vector: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly u: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "number";
                                        };
                                        readonly required: true;
                                        readonly description: "Flattened horizontal components; length must equal rows * columns.";
                                    };
                                    readonly v: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "number";
                                        };
                                        readonly required: true;
                                        readonly description: "Flattened vertical components; length must equal rows * columns.";
                                    };
                                    readonly columns: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                    readonly rows: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly expression: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly u: {
                                        readonly description: `Horizontal component using x and y. ${string}`;
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly v: {
                                        readonly description: `Vertical component using x and y. ${string}`;
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "causal_loop";
                        readonly required: true;
                        readonly description: "A causal feedback diagram with positive or negative polarity, optional delay, and named reinforcing or balancing loops.";
                    };
                    readonly variables: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "2 to 32 causal variables.";
                    };
                    readonly links: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly from: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly to: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly polarity: {
                                    readonly type: "string";
                                    readonly enum: readonly ["positive", "negative"];
                                    readonly required: true;
                                };
                                readonly delay: {
                                    readonly type: "number";
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 96 directed links; from and to must reference variables.";
                    };
                    readonly loops: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["reinforcing", "balancing"];
                                    readonly required: true;
                                };
                                readonly linkIds: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "Optional 1 to 12 named feedback loops; linkIds must reference declared links in cycle order.";
                    };
                };
            }];
        };
        readonly sequence: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly initialFrameId: {
                    readonly type: "string";
                };
                readonly frames: {
                    readonly type: "array";
                    readonly required: true;
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly id: {
                                readonly required: true;
                                readonly type: "string";
                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly description: {
                                readonly type: "string";
                            };
                            readonly focusIds: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                                readonly required: true;
                                readonly description: "At most 64 unique ids already declared by content.";
                            };
                        };
                    };
                    readonly description: "2 to 12 sequence frames.";
                };
            };
        };
        readonly fallbackMarkdown: {
            readonly type: "string";
        };
    };
};
export declare const LEARNING_VISUAL_RESULT_SCHEMA_V4: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly protocol: {
            readonly type: "string";
            readonly const: "dsh-learning/visual-result@4";
            readonly required: true;
        };
        readonly status: {
            readonly type: "string";
            readonly enum: readonly ["ready", "unavailable"];
            readonly required: true;
        };
        /** Host materialization for a saved-concepts study map. */
        readonly content: {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "plot";
                        readonly required: true;
                        readonly description: "Functions, quantitative data, probability, distributions, or tangent/secant geometry on Cartesian axes.";
                    };
                    readonly parameters: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9 or _. No hyphen, because expressions name this id and there a hyphen is subtraction. The id x is reserved for the chart axis.";
                                    readonly required: true;
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly min: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly max: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly step: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly initial: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                            };
                        };
                        readonly description: string;
                    };
                    readonly xAxis: {
                        readonly required: true;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "integer";
                                readonly description: "Optional curve samples from 24 to 256.";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                        readonly type: "object";
                        readonly additionalProperties: false;
                    };
                    readonly yAxis: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                    } & {
                        required: true;
                    };
                    readonly series: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "curve";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly expression: {
                                        readonly description: string;
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly stroke: {
                                        readonly type: "string";
                                        readonly enum: readonly ["solid", "dashed", "dotted"];
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "points";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly points: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly x: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly y: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly label: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly description: "1 to 256 points.";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "line";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly points: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly x: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly y: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly label: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly description: "1 to 256 points.";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly stroke: {
                                        readonly type: "string";
                                        readonly enum: readonly ["solid", "dashed", "dotted"];
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "bars";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly points: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly x: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly y: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly label: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly description: "1 to 64 bars.";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            }];
                        };
                        readonly description: "1 to 8 series.";
                    };
                    readonly metrics: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly expression: {
                                    readonly description: string;
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly digits: {
                                    readonly type: "integer";
                                };
                                readonly suffix: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "Optional; at most 4 metrics.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "node_link";
                        readonly required: true;
                        readonly description: "Networks, fully connected layers, trees, causality, concept maps, state transitions, and dependency topology.";
                    };
                    readonly layout: {
                        readonly type: "string";
                        readonly enum: readonly ["layered", "hierarchy", "radial"];
                        readonly required: true;
                    };
                    readonly groups: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                            };
                        };
                        readonly description: "Optional 1 to 12 ordered layers for layered layout; every node must reference one group.";
                    };
                    readonly nodes: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly group: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly required: true;
                        readonly description: "2 to 48 nodes.";
                    };
                    readonly edges: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly from: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly to: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                                readonly stroke: {
                                    readonly type: "string";
                                    readonly enum: readonly ["solid", "dashed", "dotted"];
                                };
                                readonly directed: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                        readonly required: true;
                        readonly description: "1 to 160 edges; include every semantically required connection.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "scene_2d";
                        readonly required: true;
                        readonly description: "Geometry, vectors, forces, spatial relationships, and annotated scientific schematics.";
                    };
                    readonly xAxis: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                    } & {
                        required: true;
                    };
                    readonly yAxis: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                    } & {
                        required: true;
                    };
                    readonly grid: {
                        readonly type: "boolean";
                    };
                    readonly elements: {
                        readonly type: "array";
                        readonly items: {
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly size: {
                                        readonly type: "number";
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "point";
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x1: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y1: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly x2: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y2: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly stroke: {
                                        readonly type: "string";
                                        readonly enum: readonly ["solid", "dashed", "dotted"];
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly enum: readonly ["segment", "arrow"];
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly cx: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly cy: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly r: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "circle";
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly width: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly height: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "rect";
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly points: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly x: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                                readonly y: {
                                                    readonly type: "number";
                                                    readonly required: true;
                                                };
                                            };
                                        };
                                        readonly description: "3 to 24 polygon vertices.";
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "polygon";
                                        readonly required: true;
                                    };
                                };
                            }, {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly text: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly const: "label";
                                        readonly required: true;
                                    };
                                };
                            }];
                        };
                        readonly required: true;
                        readonly description: "1 to 64 scene elements.";
                    };
                };
            }, {
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly kind: {
                            readonly type: "string";
                            readonly const: "relation";
                            readonly required: true;
                        };
                        readonly variant: {
                            readonly type: "string";
                            readonly const: "comparison";
                            readonly required: true;
                        };
                        readonly subjects: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            };
                            readonly required: true;
                            readonly description: "2 to 4 subjects.";
                        };
                        readonly rows: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly cells: {
                                        readonly type: "array";
                                        readonly required: true;
                                        readonly items: {
                                            readonly type: "object";
                                            readonly additionalProperties: false;
                                            readonly properties: {
                                                readonly subjectId: {
                                                    readonly type: "string";
                                                    readonly required: true;
                                                };
                                                readonly value: {
                                                    readonly type: "string";
                                                    readonly required: true;
                                                };
                                                readonly tone: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                                };
                                            };
                                        };
                                        readonly description: "1 to 4 cells; each subjectId must reference a declared subject.";
                                    };
                                };
                            };
                            readonly description: "1 to 16 comparison rows.";
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly kind: {
                            readonly type: "string";
                            readonly const: "relation";
                            readonly required: true;
                        };
                        readonly variant: {
                            readonly type: "string";
                            readonly const: "matrix";
                            readonly required: true;
                        };
                        readonly rows: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly required: true;
                            readonly description: "1 to 10 matrix rows.";
                        };
                        readonly columns: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly required: true;
                            readonly description: "1 to 10 matrix columns.";
                        };
                        readonly cells: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly rowId: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly columnId: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            };
                            readonly description: "1 to 64 matrix cells; rowId and columnId must reference declared axes.";
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly kind: {
                            readonly type: "string";
                            readonly const: "relation";
                            readonly required: true;
                        };
                        readonly variant: {
                            readonly type: "string";
                            readonly const: "sets";
                            readonly required: true;
                        };
                        readonly sets: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                    readonly tone: {
                                        readonly type: "string";
                                        readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                    };
                                };
                            };
                            readonly required: true;
                            readonly description: "2 to 3 sets.";
                        };
                        readonly items: {
                            readonly type: "array";
                            readonly required: true;
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly id: {
                                        readonly required: true;
                                        readonly type: "string";
                                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                    };
                                    readonly label: {
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly setIds: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                        readonly required: true;
                                        readonly description: "1 to 3 unique ids referencing declared sets.";
                                    };
                                    readonly detail: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly description: "1 to 24 set items.";
                        };
                    };
                }];
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "timeline";
                        readonly required: true;
                        readonly description: "Ordered historical events, scientific discoveries, biographies, eras, or other chronology where time order is the structure.";
                    };
                    readonly orientation: {
                        readonly type: "string";
                        readonly enum: readonly ["horizontal", "vertical"];
                    };
                    readonly events: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly time: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly position: {
                                    readonly type: "number";
                                    readonly description: "Optional normalized position from 0 to 1. Provide it for every event or omit it for every event.";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly required: true;
                        readonly description: "2 to 32 events in chronological order.";
                    };
                    readonly eras: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly startEventId: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly endEventId: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "Optional 1 to 8 eras; startEventId and endEventId must reference declared events in order.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "formula_steps";
                        readonly required: true;
                        readonly description: "A derivation, algebraic transformation, proof chain, or symbolic simplification where the rule between steps matters. Not for merely recalling one formula.";
                    };
                    readonly notation: {
                        readonly type: "string";
                        readonly description: "Optional short notation key used across the derivation.";
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly expression: {
                                    readonly type: "string";
                                    readonly required: true;
                                    readonly description: "One LaTeX display expression without dollar delimiters; use commands such as \\lim_{h \\to 0} and ^{\\prime}.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly rule: {
                                    readonly type: "string";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "2 to 16 formula steps.";
                    };
                    readonly conclusion: {
                        readonly type: "string";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "study_map";
                        readonly required: true;
                        readonly description: "A navigable overview of supplied material, or the Host-materialized state of saved learner concepts.";
                    };
                    readonly view: {
                        readonly type: "string";
                        readonly enum: readonly ["material", "concepts"];
                        readonly description: "Use concepts to request the saved concept-card state; the Host supplies its sections and cards.";
                    };
                    readonly sourceLabel: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly goal: {
                        readonly type: "string";
                    };
                    readonly sections: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly anchor: {
                                    readonly type: "string";
                                    readonly description: "Human-readable source location, such as Chapter 2 or pp. 18–23.";
                                };
                                readonly summary: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "1 to 16 source sections.";
                    };
                    readonly concepts: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly sectionId: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly conceptSlug: {
                                    readonly type: "string";
                                    readonly description: "Saved concept-card identity in concepts view.";
                                };
                                readonly mastery: {
                                    readonly type: "string";
                                    readonly enum: readonly ["unseen", "emerging", "transfer"];
                                };
                                readonly due: {
                                    readonly type: "string";
                                    readonly description: "Next review date in YYYY-MM-DD form.";
                                };
                                readonly stale: {
                                    readonly type: "boolean";
                                    readonly description: "Whether one or more saved source anchors no longer resolve.";
                                };
                                readonly prerequisiteIds: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly description: "Optional; at most 8 unique declared concept ids, excluding this concept, with no cycles.";
                                };
                                readonly role: {
                                    readonly type: "string";
                                    readonly enum: readonly ["foundation", "core", "extension", "practice"];
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 48 concepts; every sectionId must reference a declared section.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "recall_deck";
                        readonly required: true;
                        readonly description: "A requested flashcard or active-recall set with hidden answers, hints, and local review state. Use only after the relevant material is known.";
                    };
                    readonly instructions: {
                        readonly type: "string";
                    };
                    readonly cards: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly prompt: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly answer: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly hint: {
                                    readonly type: "string";
                                };
                                readonly tags: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly description: "Optional; at most 6 unique labels.";
                                };
                            };
                        };
                        readonly description: "2 to 32 recall cards.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "data_table";
                        readonly required: true;
                        readonly description: "A typed record table for inspecting real data, filtering rows, sorting values, marking outliers, or linking tabular values to a chart.";
                    };
                    readonly columns: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["string", "number", "boolean", "date"];
                                    readonly required: true;
                                };
                                readonly unit: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "1 to 24 typed columns.";
                    };
                    readonly rows: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly cells: {
                                    readonly type: "array";
                                    readonly required: true;
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly columnId: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly value: {
                                                readonly required: true;
                                                readonly oneOf: readonly [{
                                                    readonly type: "string";
                                                }, {
                                                    readonly type: "number";
                                                }, {
                                                    readonly type: "boolean";
                                                }, {
                                                    readonly type: "null";
                                                }];
                                            };
                                        };
                                    };
                                    readonly description: "One cell per declared column; columnId must reference a declared column.";
                                };
                            };
                        };
                        readonly description: "1 to 128 records.";
                    };
                    readonly outlierIds: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly description: "Optional row ids to emphasize as anomalies.";
                    };
                    readonly initialSort: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly columnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly direction: {
                                readonly type: "string";
                                readonly enum: readonly ["asc", "desc"];
                                readonly required: true;
                            };
                        };
                    };
                    readonly initialFilter: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly columnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly operator: {
                                readonly type: "string";
                                readonly enum: readonly ["equals", "not_equals", "contains", "gt", "gte", "lt", "lte"];
                                readonly required: true;
                            };
                            readonly value: {
                                readonly required: true;
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "number";
                                }, {
                                    readonly type: "boolean";
                                }, {
                                    readonly type: "null";
                                }];
                            };
                        };
                    };
                    readonly chart: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly enum: readonly ["line", "bar", "scatter"];
                                readonly required: true;
                            };
                            readonly xColumnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly yColumnId: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly seriesColumnId: {
                                readonly type: "string";
                            };
                        };
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "state_transition";
                        readonly required: true;
                        readonly description: "A state machine where an event triggers a transition from one explicit state to another, optionally with guard and action.";
                    };
                    readonly states: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                                readonly initial: {
                                    readonly type: "boolean";
                                };
                                readonly final: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                        readonly description: "2 to 32 states; mark initial/final states when the lifecycle has them.";
                    };
                    readonly transitions: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly from: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly to: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly trigger: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly guard: {
                                    readonly type: "string";
                                };
                                readonly action: {
                                    readonly type: "string";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 96 transitions; from and to must reference declared states.";
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly currentStateId: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly transitionId: {
                                    readonly type: "string";
                                };
                                readonly description: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "Optional 2 to 16 execution steps; each names the current state and optional transition just taken.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "sequence_buffer";
                        readonly required: true;
                        readonly description: "Discrete indexed slots with moving pointers, highlighted intervals, and snapshots for array, window, parsing, or protocol algorithms.";
                    };
                    readonly slots: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly index: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly value: {
                                    readonly required: true;
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "number";
                                    }, {
                                        readonly type: "boolean";
                                    }, {
                                        readonly type: "null";
                                    }];
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 128 ordered slots; index values must be unique.";
                    };
                    readonly pointers: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly index: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "Optional 1 to 8 named pointers.";
                    };
                    readonly ranges: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly start: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly end: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "Optional 1 to 8 inclusive index intervals.";
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly description: {
                                    readonly type: "string";
                                };
                                readonly slots: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly slotId: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly value: {
                                                readonly oneOf: readonly [{
                                                    readonly type: "string";
                                                }, {
                                                    readonly type: "number";
                                                }, {
                                                    readonly type: "boolean";
                                                }, {
                                                    readonly type: "null";
                                                }];
                                            };
                                        };
                                    };
                                };
                                readonly pointers: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly pointerId: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly index: {
                                                readonly type: "integer";
                                                readonly required: true;
                                            };
                                        };
                                    };
                                };
                                readonly ranges: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly rangeId: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly start: {
                                                readonly type: "integer";
                                                readonly required: true;
                                            };
                                            readonly end: {
                                                readonly type: "integer";
                                                readonly required: true;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                        readonly description: "Optional 2 to 16 snapshots. Include only the collections that change in each snapshot.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "sequence_diagram";
                        readonly required: true;
                        readonly description: "Ordered messages exchanged by API clients, services, protocols, cells, or collaborating roles.";
                    };
                    readonly participants: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "2 to 16 lifeline participants.";
                    };
                    readonly messages: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly from: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly to: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["sync", "async", "return", "self"];
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 96 messages in top-to-bottom order; from and to must reference participants.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "code_trace";
                        readonly required: true;
                        readonly description: "Source lines paired with execution steps, current line, variable values, call stack, and output.";
                    };
                    readonly language: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly code: {
                        readonly type: "string";
                        readonly required: true;
                        readonly description: "Complete source text shown above or beside the trace.";
                    };
                    readonly lines: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly number: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly text: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                            };
                        };
                        readonly description: "1 to 256 numbered source lines.";
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly currentLine: {
                                    readonly type: "integer";
                                    readonly required: true;
                                };
                                readonly variables: {
                                    readonly type: "array";
                                    readonly required: true;
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly name: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly value: {
                                                readonly required: true;
                                                readonly oneOf: readonly [{
                                                    readonly type: "string";
                                                }, {
                                                    readonly type: "number";
                                                }, {
                                                    readonly type: "boolean";
                                                }, {
                                                    readonly type: "null";
                                                }];
                                            };
                                            readonly type: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                };
                                readonly stack: {
                                    readonly type: "array";
                                    readonly required: true;
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: false;
                                        readonly properties: {
                                            readonly id: {
                                                readonly required: true;
                                                readonly type: "string";
                                                readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                            };
                                            readonly function: {
                                                readonly type: "string";
                                                readonly required: true;
                                            };
                                            readonly line: {
                                                readonly type: "integer";
                                            };
                                        };
                                    };
                                };
                                readonly output: {
                                    readonly type: "string";
                                };
                                readonly description: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly description: "2 to 32 execution snapshots.";
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "field_2d";
                        readonly required: true;
                        readonly description: "A sampled or mathematically defined scalar heatmap, contour field, vector field, or gradient over two axes.";
                    };
                    readonly xAxis: {
                        readonly required: true;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "integer";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                        readonly type: "object";
                        readonly additionalProperties: false;
                    };
                    readonly yAxis: {
                        readonly required: true;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "integer";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly max: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                        readonly type: "object";
                        readonly additionalProperties: false;
                    };
                    readonly scalar: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly values: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "number";
                                        };
                                        readonly required: true;
                                        readonly description: "Flattened row-major values; length must equal rows * columns.";
                                    };
                                    readonly columns: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                    readonly rows: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly expression: {
                                readonly description: `Scalar field over x and y. ${string}`;
                                readonly type: "string";
                            };
                            readonly min: {
                                readonly type: "number";
                            };
                            readonly max: {
                                readonly type: "number";
                            };
                        };
                    };
                    readonly vector: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly samples: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly u: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "number";
                                        };
                                        readonly required: true;
                                        readonly description: "Flattened horizontal components; length must equal rows * columns.";
                                    };
                                    readonly v: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "number";
                                        };
                                        readonly required: true;
                                        readonly description: "Flattened vertical components; length must equal rows * columns.";
                                    };
                                    readonly columns: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                    readonly rows: {
                                        readonly type: "integer";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly expression: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly u: {
                                        readonly description: `Horizontal component using x and y. ${string}`;
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                    readonly v: {
                                        readonly description: `Vertical component using x and y. ${string}`;
                                        readonly type: "string";
                                        readonly required: true;
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly type: "string";
                        readonly const: "causal_loop";
                        readonly required: true;
                        readonly description: "A causal feedback diagram with positive or negative polarity, optional delay, and named reinforcing or balancing loops.";
                    };
                    readonly variables: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "2 to 32 causal variables.";
                    };
                    readonly links: {
                        readonly type: "array";
                        readonly required: true;
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly from: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly to: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly polarity: {
                                    readonly type: "string";
                                    readonly enum: readonly ["positive", "negative"];
                                    readonly required: true;
                                };
                                readonly delay: {
                                    readonly type: "number";
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "1 to 96 directed links; from and to must reference variables.";
                    };
                    readonly loops: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly id: {
                                    readonly required: true;
                                    readonly type: "string";
                                    readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly required: true;
                                };
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["reinforcing", "balancing"];
                                    readonly required: true;
                                };
                                readonly linkIds: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly required: true;
                                };
                                readonly detail: {
                                    readonly type: "string";
                                };
                                readonly tone: {
                                    readonly type: "string";
                                    readonly enum: readonly ["blue", "green", "red", "orange", "purple", "gray"];
                                };
                            };
                        };
                        readonly description: "Optional 1 to 12 named feedback loops; linkIds must reference declared links in cycle order.";
                    };
                };
            }];
        };
    };
};
export declare const LEARNING_CHECKPOINT_SCHEMA_V1: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly protocol: {
            readonly type: "string";
            readonly const: "dsh-learning/checkpoint@1";
            readonly required: true;
        };
        readonly kind: {
            readonly type: "string";
            readonly enum: readonly ["free_text", "single_choice", "numeric", "prediction", "code_slot"];
            readonly required: true;
        };
        readonly prompt: {
            readonly type: "string";
            readonly required: true;
        };
        readonly context: {
            readonly type: "string";
        };
        readonly expectedEvidence: {
            readonly type: "string";
            readonly enum: readonly ["attempt", "prediction", "explanation", "contrast", "transfer"];
            readonly required: true;
        };
        readonly options: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly id: {
                        readonly required: true;
                        readonly type: "string";
                        readonly description: "Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.";
                    };
                    readonly label: {
                        readonly type: "string";
                        readonly required: true;
                    };
                };
            };
        };
        readonly fallbackMarkdown: {
            readonly type: "string";
            readonly required: true;
        };
    };
};
export type GeneratedLearningVisualV4 = InferValue<typeof LEARNING_VISUAL_SCHEMA_V4>;
export type GeneratedLearningVisualResultV4 = InferValue<typeof LEARNING_VISUAL_RESULT_SCHEMA_V4>;
export type GeneratedLearningCheckpointV1 = InferValue<typeof LEARNING_CHECKPOINT_SCHEMA_V1>;
export type GeneratedLearningCheckpointResultV1 = InferValue<typeof LEARNING_CHECKPOINT_RESULT_SCHEMA_V1>;
export type GeneratedLearningCheckpointResponseV1 = InferValue<typeof LEARNING_CHECKPOINT_RESPONSE_SCHEMA_V1>;
export type GeneratedLearningCheckpointOptionV1 = InferValue<typeof LEARNING_CHECKPOINT_OPTION_SCHEMA_V1>;
/** Generated structural validator; semantic bounds and cross-references remain in protocol.ts. */
export declare function validateLearningVisualSchemaV4(value: unknown): string[];
export declare function validateLearningVisualResultSchemaV4(value: unknown): string[];
/** Generated structural validator; answer-free copy checks remain in protocol.ts. */
export declare function validateLearningCheckpointSchemaV1(value: unknown): string[];
/** Generated structural validator for the closed checkpoint receipt union. */
export declare function validateLearningCheckpointResultSchemaV1(value: unknown): string[];
export declare function learningVisualParametersV4(kind: LearningVisualSchemaKindV4): ParameterSchemaSpec;
export interface LearningCheckpointSchemaSelectionV1 {
    kind: typeof LEARNING_CHECKPOINT_KINDS[number];
    expectedEvidence: typeof LEARNING_CHECKPOINT_EVIDENCE_KINDS[number];
    prompt: string;
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
export declare function learningCheckpointParametersOneStepV1(): ParameterSchemaSpec;
export declare function learningCheckpointParametersV1(selection: LearningCheckpointSchemaSelectionV1): ParameterSchemaSpec;
//# sourceMappingURL=protocol-schema.d.ts.map
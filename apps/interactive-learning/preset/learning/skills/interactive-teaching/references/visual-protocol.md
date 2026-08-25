# Visual protocol construction

The `learning_visual` protocol is closed and declarative. Never send HTML, SVG markup, Mermaid, Markdown diagrams, JavaScript, or executable code. Every id must be unique within the content. Edges, cells, memberships, prerequisites, eras, and sequence focus ids must reference declared ids.

Keep titles concise, descriptions action-oriented, and fallback Markdown equivalent in meaning. Stay inside the schema bounds exposed by the tool; the runtime parser rejects unknown keys and broken references.

## Computed plots

Plots accept static points, polylines, bars, and computed curves. They may contain one to three bounded parameters and parameter-derived metrics.

Expressions are JSON math ASTs. Leaves are `constant` and `variable`; binary operations are `add`, `sub`, `mul`, `div`, `pow`, `min`, and `max`; unary operations include `neg`, `abs`, `sqrt`, `sin`, `cos`, `tan`, `atan`, `exp`, `log`, `sigmoid`, `relu`, `leaky_relu`, `step`, `normpdf`, `floor`, and `ceil`. `leaky_relu` uses a 0.01 negative slope, `step` switches at zero, and `normpdf` is the standard normal density; compose arithmetic nodes for other normal distributions. Curve expressions may use `x` and declared parameter ids. Metric expressions may use declared parameters but not `x`.

The logistic curve σ(β₀ + β₁x):

```json
{
  "op": "sigmoid",
  "value": {
    "op": "add",
    "left": { "op": "variable", "name": "b0" },
    "right": {
      "op": "mul",
      "left": { "op": "variable", "name": "b1" },
      "right": { "op": "variable", "name": "x" }
    }
  }
}
```

The P = 0.5 decision boundary −β₀/β₁ as a parameter-only metric:

```json
{
  "op": "div",
  "left": { "op": "neg", "value": { "op": "variable", "name": "b0" } },
  "right": { "op": "variable", "name": "b1" }
}
```

Use explicit, stable axis ranges. Use dashed or dotted strokes as well as labels for comparisons; do not communicate only through color.

## Content integrity

- `node_link`: every `from` and `to` references a node; layered nodes reference declared groups.
- `scene_2d`: every coordinate and dimension is finite; shapes remain inside an intelligible axis range.
- `relation`: cells reference declared subjects/axes; set membership references declared sets.
- `timeline`: events are ordered; era endpoints reference declared events; positions are either present for all events or omitted for all.
- `formula_steps`: expressions are LaTeX display math without dollar delimiters, not executable code; every transition remains pedagogically and algebraically valid.
- `study_map`: concepts reference a section and declared prerequisite concepts; anchors mirror the source.
- `recall_deck`: answers and hints are source-grounded; tags are short and useful for interleaving.
  Reveal and mastered/review clicks are persisted locally and may be mirrored to
  Host as low-confidence, unverified session observations; never treat a
  self-rating as correctness or transfer evidence.
- `data_table`: every cell references a declared column; chart, sort, and filter
  columns resolve inside the same table; outliers reference declared rows.
- `state_transition`: transitions reference declared states; steps reference a
  current state and, when present, the transition that produced it.
- `sequence_buffer`: slot ids and indices are unique; pointers, ranges, and step
  snapshots remain inside the declared slot interval.
- `sequence_diagram`: every message endpoint references a declared participant;
  message array order is the interaction order.
- `code_trace`: current lines and stack line references resolve to declared source
  lines. The payload is replayed as data and is never executed.
- `field_2d`: sampled grid dimensions match their value arrays; expression fields
  use only the declared `x` and `y` coordinates.
- `causal_loop`: signed links reference declared variables and every loop references
  declared links.

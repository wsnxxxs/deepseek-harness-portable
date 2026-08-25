import type { MathExpressionV1 } from './protocol-current.ts'

/** Values available to a safe mathematical expression. */
export type MathBindings = Readonly<Record<string, number>>

export type CompiledMathExpression = (bindings: MathBindings) => number

/**
 * Compile a closed AST into a small closure tree once, so sampling a curve
 * does not repeatedly dispatch through every AST node. This intentionally
 * uses ordinary closures instead of `new Function`: the model payload remains
 * data-only while the hot render path still gets one function call per sample.
 */
export function compileMathExpression(expression: MathExpressionV1): CompiledMathExpression {
  switch (expression.op) {
    case 'constant':
      return () => expression.value
    case 'variable':
      return bindings => bindings[expression.name] ?? Number.NaN
    case 'add': {
      const left = compileMathExpression(expression.left)
      const right = compileMathExpression(expression.right)
      return bindings => left(bindings) + right(bindings)
    }
    case 'sub': {
      const left = compileMathExpression(expression.left)
      const right = compileMathExpression(expression.right)
      return bindings => left(bindings) - right(bindings)
    }
    case 'mul': {
      const left = compileMathExpression(expression.left)
      const right = compileMathExpression(expression.right)
      return bindings => left(bindings) * right(bindings)
    }
    case 'div': {
      const left = compileMathExpression(expression.left)
      const right = compileMathExpression(expression.right)
      return bindings => left(bindings) / right(bindings)
    }
    case 'pow': {
      const left = compileMathExpression(expression.left)
      const right = compileMathExpression(expression.right)
      return bindings => left(bindings) ** right(bindings)
    }
    case 'min': {
      const left = compileMathExpression(expression.left)
      const right = compileMathExpression(expression.right)
      return bindings => Math.min(left(bindings), right(bindings))
    }
    case 'max': {
      const left = compileMathExpression(expression.left)
      const right = compileMathExpression(expression.right)
      return bindings => Math.max(left(bindings), right(bindings))
    }
    case 'neg': {
      const value = compileMathExpression(expression.value)
      return bindings => -value(bindings)
    }
    case 'abs': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.abs(value(bindings))
    }
    case 'sqrt': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.sqrt(value(bindings))
    }
    case 'sin': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.sin(value(bindings))
    }
    case 'cos': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.cos(value(bindings))
    }
    case 'tan': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.tan(value(bindings))
    }
    case 'atan': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.atan(value(bindings))
    }
    case 'exp': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.exp(value(bindings))
    }
    case 'log': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.log(value(bindings))
    }
    case 'sigmoid': {
      const value = compileMathExpression(expression.value)
      return bindings => {
        const result = value(bindings)
        // The split form avoids overflow while preserving accuracy in both tails.
        if (result >= 0) return 1 / (1 + Math.exp(-result))
        const exponential = Math.exp(result)
        return exponential / (1 + exponential)
      }
    }
    case 'relu': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.max(0, value(bindings))
    }
    case 'leaky_relu': {
      const value = compileMathExpression(expression.value)
      return bindings => {
        const result = value(bindings)
        return result >= 0 ? result : result * 0.01
      }
    }
    case 'step': {
      const value = compileMathExpression(expression.value)
      return bindings => value(bindings) >= 0 ? 1 : 0
    }
    case 'normpdf': {
      const value = compileMathExpression(expression.value)
      return bindings => {
        const result = value(bindings)
        return Math.exp(-0.5 * result * result) / Math.sqrt(2 * Math.PI)
      }
    }
    case 'floor': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.floor(value(bindings))
    }
    case 'ceil': {
      const value = compileMathExpression(expression.value)
      return bindings => Math.ceil(value(bindings))
    }
  }
}

/**
 * Evaluate the protocol's closed mathematical AST. The protocol validator
 * bounds its depth and node count; this evaluator never executes source text.
 */
export function evaluateMathExpression(expression: MathExpressionV1, bindings: MathBindings): number {
  switch (expression.op) {
    case 'constant': return expression.value
    case 'variable': return bindings[expression.name] ?? Number.NaN
    case 'add': return evaluateMathExpression(expression.left, bindings) + evaluateMathExpression(expression.right, bindings)
    case 'sub': return evaluateMathExpression(expression.left, bindings) - evaluateMathExpression(expression.right, bindings)
    case 'mul': return evaluateMathExpression(expression.left, bindings) * evaluateMathExpression(expression.right, bindings)
    case 'div': return evaluateMathExpression(expression.left, bindings) / evaluateMathExpression(expression.right, bindings)
    case 'pow': return evaluateMathExpression(expression.left, bindings) ** evaluateMathExpression(expression.right, bindings)
    case 'min': return Math.min(evaluateMathExpression(expression.left, bindings), evaluateMathExpression(expression.right, bindings))
    case 'max': return Math.max(evaluateMathExpression(expression.left, bindings), evaluateMathExpression(expression.right, bindings))
    case 'neg': return -evaluateMathExpression(expression.value, bindings)
    case 'abs': return Math.abs(evaluateMathExpression(expression.value, bindings))
    case 'sqrt': return Math.sqrt(evaluateMathExpression(expression.value, bindings))
    case 'sin': return Math.sin(evaluateMathExpression(expression.value, bindings))
    case 'cos': return Math.cos(evaluateMathExpression(expression.value, bindings))
    case 'tan': return Math.tan(evaluateMathExpression(expression.value, bindings))
    case 'atan': return Math.atan(evaluateMathExpression(expression.value, bindings))
    case 'exp': return Math.exp(evaluateMathExpression(expression.value, bindings))
    case 'log': return Math.log(evaluateMathExpression(expression.value, bindings))
    case 'sigmoid': {
      const value = evaluateMathExpression(expression.value, bindings)
      if (value >= 0) return 1 / (1 + Math.exp(-value))
      const exponential = Math.exp(value)
      return exponential / (1 + exponential)
    }
    case 'relu': return Math.max(0, evaluateMathExpression(expression.value, bindings))
    case 'leaky_relu': {
      const value = evaluateMathExpression(expression.value, bindings)
      return value >= 0 ? value : value * 0.01
    }
    case 'step': return evaluateMathExpression(expression.value, bindings) >= 0 ? 1 : 0
    case 'normpdf': {
      const value = evaluateMathExpression(expression.value, bindings)
      return Math.exp(-0.5 * value * value) / Math.sqrt(2 * Math.PI)
    }
    case 'floor': return Math.floor(evaluateMathExpression(expression.value, bindings))
    case 'ceil': return Math.ceil(evaluateMathExpression(expression.value, bindings))
  }
}

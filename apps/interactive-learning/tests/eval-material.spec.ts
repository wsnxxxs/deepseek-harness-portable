import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MATERIAL_BUDGET_CHARS,
  MATERIAL_NEGATIVE_CANDIDATES,
  OFFLINE_MATERIAL_CANDIDATES,
  gradeAnchorPrecision,
  gradeMaterialBudget,
  gradeMaterialGrounding,
  gradeMaterialSuite,
  gradedSectionsFrom,
  gradeSectionHallucination,
  sectionMentions,
  summarizeMaterialBudget,
  type GradedSection,
  type MaterialGroundingCandidate,
} from '../src/eval-material.ts'
import { ingestSource } from '../src/ingest/pipeline.ts'
import { ensureVaultLayout, readStructure } from '../src/topic-vault.ts'

const SECTIONS: readonly GradedSection[] = [
  {
    sourceId: 'guide',
    sectionId: 'guide/第3章-作用域',
    label: '第3章 作用域',
    headingPath: ['指南', '第3章 作用域'],
    page: 38,
    text: '作用域决定标识符的可见范围。',
  },
  {
    sourceId: 'guide',
    sectionId: 'guide/第3章-作用域/3-2-闭包',
    label: '3.2 闭包',
    headingPath: ['指南', '第3章 作用域', '3.2 闭包'],
    page: 42,
    text: '闭包捕获的是变量绑定，不是值。',
  },
]

function candidate(turns: MaterialGroundingCandidate['turns']): MaterialGroundingCandidate {
  return { caseId: 'case', sections: SECTIONS, turns }
}

describe('anchor precision', () => {
  it('passes a trajectory that cites nothing', () => {
    expect(gradeAnchorPrecision(candidate([{ text: '我们先从直觉讲起。' }])).passed).toBe(true)
  })

  it('accepts an anchor that names a real section', () => {
    const check = gradeAnchorPrecision(candidate([
      { text: 'x', sourceAnchors: ['guide#指南 › 第3章 作用域 › 3.2 闭包 (p.42)'] },
    ]))
    expect(check.passed).toBe(true)
  })

  it('rejects an anchor that names no section in the structure', () => {
    const check = gradeAnchorPrecision(candidate([
      { text: 'x', sourceAnchors: ['guide#第9章 内存管理'] },
    ]))
    expect(check.passed).toBe(false)
    expect(check.detail).toContain('unresolved anchor')
  })

  it('resolves a nested anchor to the deepest section, not its parent', () => {
    // The claim only appears in 3.2; passing proves the parent was not chosen.
    const check = gradeAnchorPrecision(candidate([
      {
        text: 'x',
        sourceAnchors: ['guide#指南 › 第3章 作用域 › 3.2 闭包'],
        citedClaims: ['闭包捕获的是变量绑定'],
      },
    ]))
    expect(check.passed).toBe(true)
  })

  it('rejects a claim the cited section does not contain', () => {
    const check = gradeAnchorPrecision(candidate([
      {
        text: 'x',
        sourceAnchors: ['guide#指南 › 第3章 作用域 › 3.2 闭包'],
        citedClaims: ['闭包会自动释放内存'],
      },
    ]))
    expect(check.passed).toBe(false)
    expect(check.detail).toContain('claim not in a cited section')
  })

  it('rejects a claim that is true elsewhere but was not cited this turn', () => {
    const check = gradeAnchorPrecision(candidate([
      {
        text: 'x',
        sourceAnchors: ['guide#指南 › 第3章 作用域'],
        citedClaims: ['闭包捕获的是变量绑定'],
      },
    ]))
    expect(check.passed).toBe(false)
  })

  it('rejects an empty cited claim', () => {
    const check = gradeAnchorPrecision(candidate([
      {
        text: 'x',
        sourceAnchors: ['guide#指南 › 第3章 作用域 › 3.2 闭包'],
        citedClaims: ['   '],
      },
    ]))
    expect(check.passed).toBe(false)
  })
})

describe('section hallucination', () => {
  it('finds chapter, section, and page references in assistant text', () => {
    expect(sectionMentions('见第3章、Chapter 4 和 p. 42，以及第 7 页')).toEqual(
      expect.arrayContaining(['第3章', 'Chapter 4', 'p. 42']),
    )
  })

  it('passes text that only mentions real sections and pages', () => {
    const check = gradeSectionHallucination(candidate([{ text: '第3章 讲作用域，p.42 讲闭包。' }]))
    expect(check.passed).toBe(true)
  })

  it('fails text that invents a chapter', () => {
    const check = gradeSectionHallucination(candidate([{ text: '第9章 说闭包会释放内存。' }]))
    expect(check.passed).toBe(false)
    expect(check.detail).toContain('第9章')
  })

  it('fails text that invents a page', () => {
    expect(gradeSectionHallucination(candidate([{ text: '见 p.180。' }])).passed).toBe(false)
  })

  it('requires both endpoints of a cited page range', () => {
    const check = gradeSectionHallucination(candidate([{ text: '见 pp. 42–999。' }]))
    expect(check.passed).toBe(false)
  })

  it('passes a trajectory with no section references at all', () => {
    expect(gradeSectionHallucination(candidate([{ text: '闭包是什么？' }])).passed).toBe(true)
  })
})

describe('material budget', () => {
  it('summarizes what actually reached the model', () => {
    const metrics = summarizeMaterialBudget(candidate([
      { text: 'a', materialChars: 100 },
      { text: 'b', materialChars: 300 },
    ]))
    expect(metrics).toMatchObject({ turns: 2, totalChars: 400, maxChars: 300, meanChars: 200 })
    expect(metrics.overBudgetTurns).toBe(0)
  })

  it('flags a turn that dumped the source into the request', () => {
    const check = gradeMaterialBudget(candidate([
      { text: 'a', materialChars: DEFAULT_MATERIAL_BUDGET_CHARS + 1 },
    ]))
    expect(check.passed).toBe(false)
    expect(check.detail).toContain('1/1 turns over')
  })
})

describe('the offline corpus', () => {
  it('passes every grounded candidate', () => {
    expect(gradeMaterialSuite(OFFLINE_MATERIAL_CANDIDATES).every(verdict => verdict.passed)).toBe(true)
  })

  it('fails the negative control on all three checks', () => {
    const [verdict] = gradeMaterialSuite(MATERIAL_NEGATIVE_CANDIDATES)
    expect(verdict?.passed).toBe(false)
    expect(verdict?.checks.filter(check => !check.passed).map(check => check.name).sort())
      .toEqual(['anchor-precision', 'material-budget', 'section-hallucination'])
  })
})

describe('grading against a real ingested vault', () => {
  it('accepts anchors produced from the parse and rejects an invented chapter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-eval-material-'))
    try {
      const vault = await ensureVaultLayout(root, '指南')
      const input = join(root, 'guide.md')
      await writeFile(input, [
        '# 指南',
        '',
        '## 第3章 作用域',
        '',
        '作用域决定标识符的可见范围。',
        '',
        '### 3.2 闭包',
        '',
        '闭包捕获的是变量绑定，不是值。',
        '',
      ].join('\n'), 'utf8')
      await ingestSource(vault, input)

      const structure = (await readStructure(vault, 'guide'))!
      const markdown = await readFile(join(vault.extracted, 'guide.md'), 'utf8')
      const sections = gradedSectionsFrom(structure, markdown)
      expect(sections.map(section => section.label)).toContain('3.2 闭包')

      const closure = sections.find(section => section.label === '3.2 闭包')!
      const grounded = gradeMaterialGrounding({
        caseId: 'real-grounded',
        sections,
        turns: [{
          text: '3.2 闭包 的要点如下。',
          sourceAnchors: [closure.sectionId],
          citedClaims: ['闭包捕获的是变量绑定'],
          materialChars: 200,
        }],
      })
      expect(grounded.passed, JSON.stringify(grounded.checks)).toBe(true)

      const invented = gradeMaterialGrounding({
        caseId: 'real-invented',
        sections,
        turns: [{ text: '第9章 给出了完整证明。', materialChars: 200 }],
      })
      expect(invented.passed).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

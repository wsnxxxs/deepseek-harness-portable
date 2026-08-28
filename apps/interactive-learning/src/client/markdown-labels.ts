import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

/** Localized chrome required by the alpha.1 MarkdownText contract. */
export function markdownLabels(t: TranslateNS<'interactive-learning'>): MarkdownLabels {
  return {
    code: { copyLabel: t('markdownCopy'), copiedLabel: t('markdownCopied') },
    footnotes: t('markdownFootnotes'),
  }
}

/** Stable fallback for visual renderers that intentionally have no locale seat. */
export const DEFAULT_MARKDOWN_LABELS: MarkdownLabels = {
  code: { copyLabel: '复制', copiedLabel: '已复制' },
  footnotes: '脚注',
}

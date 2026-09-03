/**
 * The Overview / Models statistics card.
 *
 * One markup source drives both settings surfaces. The two surfaces sit in
 * different token domains — the workbench scale (`--zx-*`) and the official
 * settings aliases (`--dsw-alias-*`) — so each supplies its own CSS Module
 * through {@link UsageCardStyles} instead of the markup being copied.
 *
 * {@link UsageCardStyles} names every class a face must define. It documents
 * the contract and types this file's own reads; it cannot enforce the contract
 * at build time, because the package's CSS-Module shim types every stylesheet
 * as `Record<string, string>`. Each face therefore adopts it through
 * {@link usageCardStyles}, and a class a face forgets renders unstyled rather
 * than failing to compile.
 */
import { type ReactNode } from 'react';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionManagerTranslate } from './locales.ts';
/** Class names one surface must supply for the card to render in its style. */
export interface UsageCardStyles {
    readonly card: string;
    readonly head: string;
    readonly tabs: string;
    readonly tab: string;
    readonly tabActive: string;
    readonly ranges: string;
    readonly range: string;
    readonly rangeActive: string;
    readonly panel: string;
    readonly statGrid: string;
    readonly stat: string;
    readonly statLabel: string;
    readonly statValue: string;
    readonly heatmap: string;
    readonly heatRow: string;
    readonly heatCell: string;
    readonly level0: string;
    readonly level1: string;
    readonly level2: string;
    readonly level3: string;
    readonly level4: string;
    readonly chart: string;
    readonly axis: string;
    readonly axisTick: string;
    readonly plot: string;
    readonly column: string;
    readonly stack: string;
    readonly segment: string;
    readonly ticks: string;
    readonly tick: string;
    readonly legend: string;
    readonly legendRow: string;
    readonly swatch: string;
    readonly legendName: string;
    readonly legendTokens: string;
    readonly legendShare: string;
    readonly footnote: string;
    readonly empty: string;
}
/**
 * Adopt one CSS Module as a card face.
 * @param classes - the imported module, typed by the shim as a plain record.
 * @returns the same object under the card's class contract.
 */
export declare function usageCardStyles(classes: Record<string, string>): UsageCardStyles;
export interface UsageCardsProps {
    readonly list: SessionListState;
    readonly t: SessionManagerTranslate;
    readonly styles: UsageCardStyles;
}
/** The two-tab usage card, shared by both settings surfaces. */
export declare function UsageCards({ list, t, styles }: UsageCardsProps): ReactNode;
//# sourceMappingURL=UsageCards.d.ts.map
/**
 * The catalogue: browse, search and install.
 *
 * The list is the Host's own paginated GitHub sync, so this module owns no
 * copy of it — only the page cursor, the search box and one install operation
 * per repository.
 *
 * Installing is deliberately two steps. A plugin joins the agent's tool
 * surface, its prompts, its network reach and its local processes, and topic
 * membership is not a review, so the primary button opens Portable's review
 * of the repository and only the confirm button inside that panel starts an
 * install.
 * @module @dsh-portable/dcode-ui/client/plugins/MarketSection
 */
import type { ReactNode } from 'react';
import { type AuditLocale } from './audits.ts';
import { type MarketClient } from './market.ts';
/** Props of the catalogue section. */
export interface MarketSectionProps {
    readonly client: MarketClient;
    /** Which locale's review notes to show. */
    readonly locale: AuditLocale;
    /** Reload the profile inventory once an install has landed. */
    readonly onInstalled: () => void;
}
/** Browse, search and install from the marketplace catalogue. */
export declare function MarketSection({ client, locale, onInstalled }: MarketSectionProps): ReactNode;
//# sourceMappingURL=MarketSection.d.ts.map
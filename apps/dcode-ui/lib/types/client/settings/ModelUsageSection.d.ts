/** Official-settings section for the shared local model usage projection. */
import type { ReactNode } from 'react';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
export type ModelUsageSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'dcode'>;
/** Keep the official UI's model usage page independent from DCode navigation. */
export declare function ModelUsageSection({ useSessions, t }: ModelUsageSectionProps): ReactNode;
//# sourceMappingURL=ModelUsageSection.d.ts.map
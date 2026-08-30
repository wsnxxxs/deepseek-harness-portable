import type { SessionId } from '@deepseek-ai/dsh-session/types';
export type ReadinessValue = 'pending' | 'missing' | 'ready';
export interface ModelReadiness {
    readonly model: ReadinessValue;
    readonly credential: ReadinessValue;
    readonly provider?: string;
}
/** Read the selected route and its stored credential without probing or prompting. */
export declare function useModelReadiness(sessionId: SessionId | undefined): ModelReadiness;
//# sourceMappingURL=readiness.d.ts.map
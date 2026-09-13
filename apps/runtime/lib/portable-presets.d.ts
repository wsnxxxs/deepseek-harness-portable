import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Replacement provider selected only by the optional runtime bundle. */
export declare const name = "portable-presets";
export declare const inject: string[];
export declare const Config: z<Schemastery.ObjectS<{
    default: z<string, string>;
    roots: z<({
        path?: string | null | undefined;
        trust?: "system" | "user" | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<{
        path: z<string, string>;
        trust: z<"system" | "user", "system" | "user">;
    }>[]>;
}>, Schemastery.ObjectT<{
    default: z<string, string>;
    roots: z<({
        path?: string | null | undefined;
        trust?: "system" | "user" | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<{
        path: z<string, string>;
        trust: z<"system" | "user", "system" | "user">;
    }>[]>;
}>>;
/** Compile Portable variants before publishing the ordinary agentPresets service. */
export declare function apply(ctx: Context, config: {
    default: string;
    roots: Array<{
        path: string;
        trust: 'system' | 'user';
    }>;
}): Promise<void>;
//# sourceMappingURL=portable-presets.d.ts.map
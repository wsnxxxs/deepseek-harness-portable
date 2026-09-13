import type { Context } from '@deepseek-ai/cordis';
/** Packaged preset root; portable distributions merge this into their system roster. */
export declare const interactiveLearningPresetRoot: string;
/** The independently installable preset directory inside the package. */
export declare const interactiveLearningPresetSource: string;
declare module '@deepseek-ai/cordis' {
    interface Context {
        learningPresetSource: {
            path: string;
            trust: 'system';
        };
    }
}
/** The optional bundle injects this source before the official preset provider. */
export declare const name = "learning-preset-source";
export declare function apply(ctx: Context): void;
//# sourceMappingURL=preset.d.ts.map
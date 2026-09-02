/**
 * Resolve which configured model performs image analysis.
 *
 * The kernel's model catalog is the single source of truth: a route is chosen
 * from the providers the deployment already configured, and capability comes
 * from each entry's declared input modalities rather than from a hand-kept
 * list of model names.
 * @module @dsh-portable/vision-bridge/model-selection
 */
/**
 * Whether a catalog entry declares that it accepts image input.
 * @param model - one catalog entry.
 */
export function declaresImageInput(model) {
    return model.inputModalities?.includes('image') === true;
}
/**
 * Read image capability for one exact provider/model route.
 *
 * Catalog ids are only unique within a provider. Matching both parts keeps a
 * same-named model on another provider from changing the active route.
 */
export function imageInputCapability(route, catalog) {
    const entry = catalog.find(candidate => candidate.provider === route.provider && candidate.id === route.model);
    if (entry === undefined || entry.inputModalities === undefined)
        return 'unknown';
    return declaresImageInput(entry) ? 'supported' : 'unsupported';
}
/** True when the exact catalog entry positively declares image input. */
export function modelSupportsImages(route, catalog) {
    return imageInputCapability(route, catalog) === 'supported';
}
/** Find one exact catalog entry without conflating providers that share ids. */
export function findCatalogModel(route, catalog) {
    return catalog.find(candidate => candidate.provider === route.provider && candidate.id === route.model);
}
/**
 * Whether a catalog entry declares input modalities that exclude images.
 *
 * An absent `inputModalities` is unknown capability rather than a denial: it
 * never earns an automatic selection, but it must not veto a route the operator
 * pinned deliberately.
 * @param model - one catalog entry.
 */
export function deniesImageInput(model) {
    return model.inputModalities !== undefined && !model.inputModalities.includes('image');
}
/**
 * Choose the route that will analyze images.
 *
 * A pinned model is resolved back to its configured provider and honored unless
 * the catalog positively denies image input. Otherwise the first entry
 * declaring image input wins, in catalog order.
 * @param config - the resolved enable/model configuration.
 * @param catalog - every model the configured providers report.
 * @returns the chosen route, or the reason none could be chosen.
 */
export function selectVisionRoute(config, catalog) {
    if (!config.enabled) {
        return {
            ok: false,
            reason: 'VISION_BRIDGE_DISABLED',
            message: 'Vision Bridge is disabled. Enable it in Settings → Plugins before using view_image.',
        };
    }
    const pinnedModel = config.model.trim();
    if (pinnedModel !== '') {
        // Keep the original bare-id setting compatible. When two providers expose
        // the same id, `provider/model` selects the exact provider without adding
        // another settings field.
        const pinned = catalog.find(entry => entry.id === pinnedModel)
            ?? (() => {
                const separator = pinnedModel.indexOf('/');
                if (separator <= 0 || separator === pinnedModel.length - 1)
                    return undefined;
                const provider = pinnedModel.slice(0, separator);
                const model = pinnedModel.slice(separator + 1);
                return catalog.find(entry => entry.provider === provider && entry.id === model);
            })();
        if (pinned === undefined) {
            return {
                ok: false,
                reason: 'VISION_MODEL_UNAVAILABLE',
                message: `Model ${pinnedModel} is not available from a configured provider. Choose a model from Settings → Models.`,
            };
        }
        if (deniesImageInput(pinned)) {
            return {
                ok: false,
                reason: 'VISION_MODEL_NOT_IMAGE_CAPABLE',
                message: `Model ${pinnedModel} does not accept image input. Choose an image-capable model in Settings → Plugins.`,
            };
        }
        return { ok: true, route: { provider: pinned.provider, model: pinned.id } };
    }
    const discovered = catalog.find(entry => declaresImageInput(entry));
    if (discovered === undefined) {
        return {
            ok: false,
            reason: 'VISION_MODEL_UNAVAILABLE',
            message: 'No configured provider reports an image-capable model. Add one in Settings → Models.',
        };
    }
    return { ok: true, route: { provider: discovered.provider, model: discovered.id } };
}
/** Catalog entries an operator can reasonably pin as the vision route. */
export function imageCapableModels(catalog) {
    return catalog.filter(declaresImageInput);
}
const CATALOG_CACHE_TTL_MS = 45_000;
const catalogCaches = new WeakMap();
/**
 * Enumerate every model the configured providers report, with in-flight deduplication and TTL cache.
 * @param llm - runtime providing listProviders and listModels.
 * @param ttlMs - cache time-to-live in milliseconds (defaults to 45s).
 */
export async function getCachedCatalog(llm, ttlMs = CATALOG_CACHE_TTL_MS) {
    const now = Date.now();
    const existing = catalogCaches.get(llm);
    if (existing !== undefined && now - existing.timestamp < ttlMs) {
        return existing.promise;
    }
    const promise = (async () => {
        const providers = llm.listProviders();
        const modelArrays = await Promise.all(providers.map(async (provider) => {
            try {
                return await llm.listModels(provider.id);
            }
            catch {
                return [];
            }
        }));
        return modelArrays.flat();
    })();
    catalogCaches.set(llm, { timestamp: now, promise });
    return promise;
}
//# sourceMappingURL=model-selection.js.map
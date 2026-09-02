/**
 * What the panel is given, and how it reads it.
 *
 * The panel is mounted inside React trees this package does not own — the
 * official conversation header today, a third-party workbench tomorrow — so it
 * cannot reach for a cordis context, a host surface's runtime provider, or any
 * other ambient value. Everything it needs arrives through one React context
 * that this package fills in at plugin-apply time and closes over the Team
 * Remote, the Session Controller and the bound translate function.
 *
 * That is the whole reason the panel is portable: a host surface renders
 * `<Panel sessionId=… />` and owes it nothing else.
 * @module @dsh-portable/cluster-ui/client/deps
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { en } from "./locales.js";
import { interpolate } from "./model.js";
/** English-only fallback so a bare render outside the provider still reads. */
const fallbackTranslate = (key, params) => interpolate(en[key], params);
const DepsContext = createContext(undefined);
/** Provider for the panel's dependencies; mounted by the exported Panel. */
export const ClusterDepsProvider = DepsContext.Provider;
/**
 * Read the panel's dependencies.
 * @returns the provided dependencies.
 * @throws when a component renders outside {@link ClusterDepsProvider}.
 */
export function useDeps() {
    const deps = useContext(DepsContext);
    if (deps === undefined)
        throw new Error('cluster-ui: panel rendered outside its dependency provider');
    return deps;
}
/** The bound translate function. */
export function useT() {
    return useContext(DepsContext)?.t ?? fallbackTranslate;
}
/**
 * Adapt the host locale runtime's bound translate to this package's signature.
 *
 * The host resolves the key against the registered dictionaries but does not
 * substitute `{name}` placeholders, and a miss returns the key itself. Both
 * are handled here so no component ever renders a raw key or a raw brace.
 * @param translate - `ctx.locale.bind(CLUSTER_NS)`.
 * @returns the translate handed to {@link ClusterDepsProvider}.
 */
export function bindTranslate(translate) {
    return (key, params) => {
        const value = translate(key, params);
        return interpolate(value === key ? en[key] : value, params);
    };
}
/**
 * Run an async read whenever its inputs change, discarding a superseded run.
 * @param load - the read; receives an abort signal.
 * @param deps - dependency list, as for `useEffect`.
 * @returns the latest value, a loading flag, a failure message, and a manual reload.
 */
export function useAsync(load, deps) {
    const [state, setState] = useState({ value: undefined, loading: true, error: undefined });
    const [nonce, setNonce] = useState(0);
    const loadRef = useRef(load);
    loadRef.current = load;
    useEffect(() => {
        const controller = new AbortController();
        let live = true;
        setState(previous => ({ ...previous, loading: true, error: undefined }));
        loadRef.current(controller.signal).then((value) => { if (live)
            setState({ value, loading: false, error: undefined }); }, (cause) => {
            if (!live)
                return;
            setState({ value: undefined, loading: false, error: cause instanceof Error ? cause.message : String(cause) });
        });
        return () => {
            live = false;
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the dependency list
    }, [...deps, nonce]);
    const reload = useCallback(() => { setNonce(value => value + 1); }, []);
    return { ...state, reload };
}
//# sourceMappingURL=deps.js.map
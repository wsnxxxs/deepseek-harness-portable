import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button as PrimitiveButton, IconChevronRightOutline14, IconRefreshOutline14, IconRightUpOutline14, IconSearchOutline16, Modal, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { Button, EmptyState, IconButton, Pill, Spinner } from "../shell/ui.js";
import { auditFor } from "./audits.js";
import { MARKET_TOPIC_URL, } from "./market.js";
import { JobOutput, JobProgress } from "./JobProgress.js";
import { useOperations } from "./useJob.js";
import css from './PluginsHome.module.css';
import ui from '../shell/ui.module.css';
/** How long the search box waits before it asks the Host again. */
const SEARCH_DEBOUNCE_MS = 300;
function platformKey(platform) {
    const value = platform.toLowerCase();
    if (value.includes('win'))
        return 'win32';
    if (value.includes('mac') || value.includes('darwin'))
        return 'darwin';
    if (value.includes('linux'))
        return 'linux';
    return undefined;
}
/** Merge Host discovery facts with the bundled review record, never guesses. */
function metadataFor(item, locale, platform) {
    const audit = auditFor(item.fullName);
    const platformId = platformKey(platform);
    return {
        featured: item.featured || audit?.featured === true,
        featuredSource: audit?.featuredSource[locale] ?? item.featuredSource,
        category: audit?.category ?? item.category,
        compatibility: audit !== undefined && platformId !== undefined
            ? audit.compatibility[platformId]
            : item.compatibility,
        maintenance: item.maintenance,
    };
}
/** Search ranking: repository name, then description, then stars. */
function searchRank(item, query) {
    const needle = query.trim().toLowerCase();
    if (needle === '')
        return [0, item.stars];
    const fullName = item.fullName.toLowerCase();
    const name = fullName.split('/').at(-1) ?? fullName;
    const description = item.description.toLowerCase();
    const score = name === needle ? 4 : name.startsWith(needle) ? 3 : name.includes(needle) ? 2 : description.includes(needle) ? 1 : 0;
    return [score, item.stars];
}
/**
 * Build the review table for one repository.
 *
 * A repository Portable has never looked at gets the same seven rows, filled
 * with what is actually known — nothing — rather than being quietly omitted:
 * an absent review and a clean review must not look alike.
 * @param fullName - the repository's `owner/repo`.
 * @param locale - which locale's notes to read.
 * @param t - the bound translate, for the unreviewed fallback.
 * @returns the rows, and whether Portable has reviewed the repository.
 */
function reviewRows(fullName, locale, t) {
    const audit = auditFor(fullName);
    if (audit === undefined) {
        return {
            reviewed: false,
            rows: [
                { label: 'plugins.review.contract', value: t('plugins.review.unknownContract') },
                { label: 'plugins.review.platform', value: t('plugins.review.unknownPlatform') },
                { label: 'plugins.review.runtime', value: t('plugins.review.unknownRuntime') },
                { label: 'plugins.review.egress', value: t('plugins.review.unknownEgress') },
                { label: 'plugins.review.activation', value: t('plugins.review.unknownActivation') },
                { label: 'plugins.review.issues', value: t('plugins.review.unknownIssues') },
                { label: 'plugins.review.verified', value: t('plugins.review.unknownVerified') },
            ],
        };
    }
    return {
        reviewed: true,
        rows: [
            { label: 'plugins.review.contract', value: audit.contract[locale] },
            { label: 'plugins.review.platform', value: audit.platform[locale] },
            { label: 'plugins.review.runtime', value: audit.runtime[locale] },
            { label: 'plugins.review.egress', value: audit.egress[locale] },
            { label: 'plugins.review.activation', value: audit.activation[locale] },
            { label: 'plugins.review.issues', value: audit.issues[locale] },
            { label: 'plugins.review.verified', value: audit.verified[locale] },
        ],
    };
}
/** One repository, its review panel, and its install state. */
function MarketCard(props) {
    const t = useT();
    const { item, operation } = props;
    const { reviewed, rows } = useMemo(() => reviewRows(item.fullName, props.locale, t), [item.fullName, props.locale, t]);
    const metadata = useMemo(() => metadataFor(item, props.locale, props.platform), [item, props.locale, props.platform]);
    const reviewId = useId();
    const running = operation?.status === 'running';
    const failed = operation?.status === 'failed';
    // A repository the Host already reports as present stays installed across a
    // reload; a fresh install adds the same verdict without another round trip.
    const installed = item.installed || operation?.status === 'done';
    return (_jsxs("article", { className: `${css.card} ${css.compactCard}`, children: [_jsxs("div", { className: `${css.cardHead} ${ui.cardHeader}`, children: [_jsxs("div", { className: css.identity, children: [_jsx("a", { className: css.name, href: item.url, target: "_blank", rel: "noreferrer", children: item.fullName }), metadata.featured
                                ? _jsx(Pill, { className: css.tagAccent, children: t('plugins.featured') })
                                : null] }), _jsx("div", { className: css.actions, children: installed
                            ? _jsx(Pill, { className: css.tagSuccess, children: t('plugins.installed') })
                            : (_jsx(Button, { primary: !props.reviewOpen, disabled: running, onClick: props.onToggleReview, children: running ? t('plugins.installing') : t(failed ? 'plugins.confirmRetry' : 'plugins.install') })) })] }), _jsxs("div", { className: css.cardBody, children: [item.description === ''
                        ? null
                        : _jsx("p", { className: css.description, children: item.description }), _jsxs("div", { className: css.facts, children: [_jsx(Pill, { children: t(`plugins.category.${metadata.category}`) }), _jsx(Pill, { className: metadata.compatibility === 'compatible' ? css.tagSuccess : metadata.compatibility === 'incompatible' ? css.tagWarn : css.tagMuted, children: t(`plugins.compatibility.${metadata.compatibility}`) }), _jsx(Pill, { className: metadata.maintenance === 'active' ? css.tagSuccess : css.tagMuted, children: t(`plugins.maintenance.${metadata.maintenance}`) }), _jsx(Pill, { children: t('plugins.stars', { count: item.stars }) }), item.language === '' ? null : _jsx(Pill, { children: item.language }), installed && item.needsRestart
                                ? _jsx(Pill, { className: css.tagWarn, children: t('plugins.pendingTag') })
                                : null, item.description === ''
                                ? null
                                : (_jsx("button", { type: "button", className: `${css.linkButton} ${css.factsAction}`, disabled: props.translating, onClick: props.onTranslate, children: t(props.translating ? 'plugins.translating' : 'plugins.translate') }))] }), metadata.featuredSource === undefined ? null : _jsx("div", { className: css.statusLine, children: t('plugins.featuredSource', { source: metadata.featuredSource }) }), installed
                        ? null
                        : (_jsxs("div", { className: `${css.review} ${props.reviewOpen ? css.reviewOpen : ''}`, children: [_jsxs("button", { type: "button", className: css.reviewSummary, "aria-expanded": props.reviewOpen, "aria-controls": reviewId, onClick: props.onToggleReview, children: [_jsx("span", { className: css.reviewChevron, children: _jsx(IconChevronRightOutline14, {}) }), t('plugins.reviewOpen')] }), props.reviewOpen
                                    ? _jsxs("div", { id: reviewId, className: css.reviewBody, role: "region", "aria-label": t('plugins.reviewOpen'), children: [_jsx("div", { className: css.reviewGrid, children: rows.map(row => (_jsxs(Fragment, { children: [_jsx("span", { className: css.reviewKey, children: t(row.label) }), _jsx("span", { className: css.reviewValue, children: row.value })] }, row.label))) }), reviewed ? null : _jsx("p", { className: css.reviewWarning, children: t('plugins.review.warning') }), _jsxs("div", { className: css.reviewActions, children: [_jsx(Button, { primary: true, disabled: running, onClick: props.onInstall, children: running
                                                            ? t('plugins.installing')
                                                            : t(failed ? 'plugins.confirmRetry' : 'plugins.confirmInstall') }), _jsx("span", { className: css.statusLine, children: t('plugins.review.note') })] })] })
                                    : null] })), operation === undefined
                        ? null
                        : (_jsxs(_Fragment, { children: [_jsx(JobProgress, { operation: operation, onCancel: props.onCancel }), operation.status === 'done'
                                    ? _jsx("div", { className: `${css.statusLine} ${css.statusOk}`, children: t('plugins.installedRestart') })
                                    : null, failed
                                    ? (_jsxs(_Fragment, { children: [_jsx("div", { className: `${css.statusLine} ${css.statusError}`, children: t('plugins.installFailed', { error: operation.error ?? '' }) }), _jsx("div", { className: css.statusLine, children: t('plugins.installFailedHint') }), _jsx(JobOutput, { operation: operation })] }))
                                    : null] }))] })] }));
}
/** Browse, search and install from the marketplace catalogue. */
export function MarketSection({ client, locale, onInstalled }) {
    const t = useT();
    const [draft, setDraft] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState();
    const [loading, setLoading] = useState(true);
    const [failure, setFailure] = useState();
    const [reviewOpen, setReviewOpen] = useState();
    const [translation, setTranslation] = useState();
    const [nonce, setNonce] = useState(0);
    const moreLoading = useRef(false);
    const moreController = useRef(null);
    const { operations, start, cancel } = useOperations(client);
    // The marketplace opens directly on the complete catalogue. Search is the
    // only refinement; the default view never hides repositories by metadata.
    useEffect(() => {
        const timer = setTimeout(() => { setQuery(draft.trim()); }, SEARCH_DEBOUNCE_MS);
        return () => { clearTimeout(timer); };
    }, [draft]);
    // The first page reloads whenever the keyword or an explicit refresh
    // changes; further pages are appended by the button below the list.
    useEffect(() => {
        const controller = new AbortController();
        moreController.current?.abort();
        moreController.current = null;
        moreLoading.current = false;
        setPage(undefined);
        setLoading(true);
        setFailure(undefined);
        void client.list(query, 1, controller.signal, 'explore')
            .then((answer) => {
            if (controller.signal.aborted)
                return;
            if (answer.ok)
                setPage(answer.value);
            else
                setFailure(answer.error);
        })
            .catch((cause) => {
            if (!controller.signal.aborted) {
                setFailure(cause instanceof Error ? cause.message : String(cause));
            }
        })
            .finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => {
            controller.abort();
            moreController.current?.abort();
            moreController.current = null;
            moreLoading.current = false;
        };
    }, [client, nonce, query]);
    const loadMore = useCallback(() => {
        const current = page;
        if (current === undefined || loading || moreLoading.current)
            return;
        const controller = new AbortController();
        moreController.current = controller;
        moreLoading.current = true;
        setLoading(true);
        void client.list(query, current.page + 1, controller.signal, 'explore')
            .then((answer) => {
            if (controller.signal.aborted)
                return;
            if (!answer.ok) {
                setFailure(answer.error);
                return;
            }
            setFailure(undefined);
            setPage(previous => previous === undefined
                ? answer.value
                : { ...answer.value, items: [...previous.items, ...answer.value.items] });
        })
            .catch((cause) => {
            if (!controller.signal.aborted)
                setFailure(cause instanceof Error ? cause.message : String(cause));
        })
            .finally(() => {
            if (moreController.current !== controller)
                return;
            moreController.current = null;
            moreLoading.current = false;
            if (!controller.signal.aborted)
                setLoading(false);
        });
    }, [client, loading, page, query]);
    const translate = useCallback((item) => {
        setTranslation({
            name: item.fullName,
            original: item.description,
            text: undefined,
            error: undefined,
            loading: true,
        });
        void client.translate(item.description).then((answer) => {
            setTranslation(previous => previous?.name !== item.fullName
                ? previous
                : {
                    ...previous,
                    loading: false,
                    ...answer.ok ? { text: answer.value } : { error: answer.error },
                });
        }).catch((cause) => {
            setTranslation(previous => previous?.name !== item.fullName
                ? previous
                : { ...previous, loading: false, error: cause instanceof Error ? cause.message : String(cause) });
        });
    }, [client]);
    const platform = page?.platform || (typeof navigator === 'undefined' ? '' : navigator.userAgent);
    const items = useMemo(() => {
        return (page?.items ?? []).slice()
            .sort((left, right) => {
            const [leftMatch, leftStars] = searchRank(left, query);
            const [rightMatch, rightStars] = searchRank(right, query);
            return rightMatch - leftMatch || rightStars - leftStars || left.fullName.localeCompare(right.fullName);
        });
    }, [page?.items, query]);
    const syncedAt = page === undefined || page.fetchedAt === 0
        ? t('plugins.neverSynced')
        : t('plugins.syncedAt', { time: new Date(page.fetchedAt).toLocaleString() });
    return (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: css.title, children: t('plugins.section.market') }), _jsx("p", { className: css.subtitle, children: t('plugins.source') })] }), _jsxs("div", { className: css.toolbar, children: [_jsxs("label", { className: css.searchField, children: [_jsx(IconSearchOutline16, {}), _jsx("input", { className: css.searchInput, type: "search", value: draft, placeholder: t('plugins.search'), "aria-label": t('plugins.search'), onChange: (event) => { setDraft(event.target.value); } })] }), _jsxs("span", { className: css.meta, children: [t('plugins.shownOfTotal', { shown: items.length, total: page?.total ?? 0 }), ' · ', syncedAt] }), _jsx(IconButton, { label: t('plugins.refresh'), disabled: loading, onClick: () => { setNonce(value => value + 1); }, children: _jsx(IconRefreshOutline14, {}) }), _jsxs("a", { className: css.meta, href: MARKET_TOPIC_URL, target: "_blank", rel: "noreferrer", children: [t('plugins.sourceLink'), " ", _jsx(IconRightUpOutline14, {})] })] }), _jsx("div", { className: css.exploreWarning, children: t('plugins.exploreWarning') }), failure === undefined
                ? null
                : _jsx("div", { className: css.error, role: "alert", children: t('plugins.syncFailed', { error: failure }) }), page?.error === undefined
                ? null
                : _jsx("div", { className: css.error, role: "alert", children: t('plugins.syncFailed', { error: page.error }) }), items.length === 0
                ? (loading
                    ? _jsxs("div", { className: css.loadingState, role: "status", children: [_jsx(Spinner, { size: "sm" }), t('plugins.loading')] })
                    : _jsx(EmptyState, { children: query === '' ? t('plugins.emptyMarket') : t('plugins.emptySearch', { query }) }))
                : (_jsxs("div", { className: css.compactGrid, children: [items.map(item => (_jsx(MarketCard, { item: item, locale: locale, operation: operations[item.fullName], reviewOpen: reviewOpen === item.fullName, translating: translation?.name === item.fullName && translation.loading, platform: platform, onToggleReview: () => {
                                setReviewOpen(current => current === item.fullName ? undefined : item.fullName);
                            }, onInstall: () => {
                                start(item.fullName, () => client.install(item.fullName), onInstalled);
                            }, onCancel: () => { cancel(item.fullName); }, onTranslate: () => { translate(item); } }, item.fullName))), page?.hasMore === true
                            ? (_jsx(Button, { onClick: loadMore, disabled: loading, children: t(loading ? 'plugins.loading' : 'plugins.loadMore') }))
                            : null] })), _jsx(Modal, { open: translation !== undefined, onClose: () => { setTranslation(undefined); }, title: translation === undefined
                    ? t('plugins.translate')
                    : t('plugins.translateTitle', { name: translation.name }), closeLabel: t('common.close'), footer: (_jsx(PrimitiveButton, { variant: "outline", onClick: () => { setTranslation(undefined); }, children: t('common.close') })), children: translation === undefined
                    ? null
                    : (_jsxs(_Fragment, { children: [translation.original === ''
                                ? null
                                : (_jsx("div", { className: css.translationOriginal, children: `${t('plugins.translateOriginal')}: ${translation.original}` })), _jsx("div", { className: css.translationText, children: translation.loading
                                    ? t('plugins.translating')
                                    : translation.error !== undefined
                                        ? t('plugins.translateFailed', { error: translation.error })
                                        : translation.text === undefined || translation.text === ''
                                            ? t('plugins.translateEmpty')
                                            : translation.text })] })) })] }));
}
//# sourceMappingURL=MarketSection.js.map
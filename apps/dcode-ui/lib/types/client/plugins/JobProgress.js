import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useT } from "../state/i18n.js";
import { Button } from "../shell/ui.js";
import { formatBytes, formatSpeed } from "./market.js";
import css from './PluginsHome.module.css';
/** Copy key per job phase, so an unknown phase still renders as language. */
const PHASE_KEY = {
    pending: 'plugins.phase.pending',
    resolving: 'plugins.phase.resolving',
    downloading: 'plugins.phase.downloading',
    installing: 'plugins.phase.installing',
    done: 'plugins.phase.done',
    error: 'plugins.phase.error',
    canceled: 'plugins.phase.canceled',
};
/** How many log lines stay on screen; enough to see progress, not a console. */
const LOG_LINES = 3;
/**
 * The one-line statistics strip.
 *
 * The Host's total is an estimate summed from direct dependency sizes, so it
 * is only shown while it still exceeds what has already arrived — past that
 * point it would claim a download is larger than it is.
 * @param job - the live job.
 * @param t - the bound translate.
 * @returns the strip's segments, in reading order.
 */
function statistics(job, t) {
    const parts = [];
    if (job.bytesDown > 0)
        parts.push(t('plugins.progress.downloaded', { done: formatBytes(job.bytesDown) }));
    if (job.bytesTotal > 0 && job.bytesTotal >= job.bytesDown) {
        parts.push(t('plugins.progress.total', { total: formatBytes(job.bytesTotal) }));
    }
    const speed = formatSpeed(job.speedBps);
    if (speed !== '')
        parts.push(speed);
    if (job.etaSec !== undefined && job.phase === 'downloading') {
        parts.push(t('plugins.progress.eta', { seconds: job.etaSec }));
    }
    if (job.packages.resolved > 0) {
        parts.push(t('plugins.progress.packages', {
            resolved: job.packages.resolved,
            reused: job.packages.reused,
            downloaded: job.packages.downloaded,
        }));
    }
    return parts;
}
/**
 * Live progress of one running operation.
 * @param props - the operation and its cancel verb.
 * @returns the panel, or null once the operation has settled.
 */
export function JobProgress({ operation, onCancel }) {
    const t = useT();
    if (operation.status !== 'running')
        return null;
    const job = operation.job;
    const percent = job?.percent;
    const indeterminate = percent === undefined;
    const parts = job === undefined ? [] : statistics(job, t);
    return (_jsxs("div", { className: css.progress, role: "region", "aria-live": "off", "aria-label": t('plugins.progress.label'), children: [_jsxs("div", { className: css.progressHead, children: [_jsx("span", { className: css.progressPhase, role: "status", "aria-live": "polite", children: t(job === undefined ? 'plugins.phase.pending' : PHASE_KEY[job.phase]) }), _jsx("span", { className: css.progressPercent, children: indeterminate ? '…' : `${String(percent)}%` }), parts.length === 0 ? null : _jsx("span", { className: css.progressStats, children: parts.join(' · ') }), operation.jobId === undefined
                        ? null
                        : _jsx(Button, { onClick: onCancel, children: t('plugins.cancelJob') })] }), _jsx("div", { className: css.progressTrack, role: "progressbar", "aria-label": t('plugins.progress.label'), "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuetext": indeterminate ? t('plugins.progress.indeterminate') : `${String(percent)}%`, ...(indeterminate ? {} : { 'aria-valuenow': percent }), children: _jsx("div", { className: `${css.progressFill} ${indeterminate ? css.progressIndeterminate : ''}`, ...(indeterminate ? {} : { style: { width: `${String(percent)}%` } }) }) }), job === undefined || job.step === '' ? null : _jsx("div", { className: css.progressStep, children: job.step }), job === undefined || job.log.length === 0
                ? null
                : _jsx("pre", { className: css.log, tabIndex: 0, role: "region", "aria-label": t('details.output'), children: job.log.slice(-LOG_LINES).join('\n') })] }));
}
/** How much installer output a failure keeps on screen. */
const FAILURE_OUTPUT = 800;
/**
 * The tail of a failed operation's installer output.
 * @param props - the settled operation.
 * @returns the output block, or null when the Host sent none.
 */
export function JobOutput({ operation }) {
    const t = useT();
    if (operation.status !== 'failed' || operation.output === '')
        return null;
    return _jsx("pre", { className: css.log, tabIndex: 0, role: "region", "aria-label": t('details.output'), children: operation.output.slice(-FAILURE_OUTPUT) });
}
//# sourceMappingURL=JobProgress.js.map
/**
 * The install-progress panel, and the two chips that report a settled
 * operation.
 *
 * An install is the one thing in the workbench that reaches the network, the
 * disk and a package manager at once, and it can take minutes. It therefore
 * reports itself the way a package manager does — phase, share, transferred
 * bytes, rate, estimate and the last lines of installer output — rather than
 * as an indefinite spinner an operator cannot tell apart from a hang.
 * @module @dsh-portable/dcode-ui/client/plugins/JobProgress
 */

import type { ReactNode } from 'react'
import { useT } from '../state/i18n.ts'
import { Button } from '../shell/ui.tsx'
import { formatBytes, formatSpeed, type InstallJob, type JobPhase } from './market.ts'
import type { Operation } from './useJob.ts'
import type { DcodeKey } from '../locales.ts'
import css from './PluginsHome.module.css'

/** Copy key per job phase, so an unknown phase still renders as language. */
const PHASE_KEY: Readonly<Record<JobPhase, DcodeKey>> = {
  pending: 'plugins.phase.pending',
  resolving: 'plugins.phase.resolving',
  downloading: 'plugins.phase.downloading',
  installing: 'plugins.phase.installing',
  done: 'plugins.phase.done',
  error: 'plugins.phase.error',
  canceled: 'plugins.phase.canceled',
}

/** How many log lines stay on screen; enough to see progress, not a console. */
const LOG_LINES = 3

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
function statistics(job: InstallJob, t: ReturnType<typeof useT>): readonly string[] {
  const parts: string[] = []
  if (job.bytesDown > 0) parts.push(t('plugins.progress.downloaded', { done: formatBytes(job.bytesDown) }))
  if (job.bytesTotal > 0 && job.bytesTotal >= job.bytesDown) {
    parts.push(t('plugins.progress.total', { total: formatBytes(job.bytesTotal) }))
  }
  const speed = formatSpeed(job.speedBps)
  if (speed !== '') parts.push(speed)
  if (job.etaSec !== undefined && job.phase === 'downloading') {
    parts.push(t('plugins.progress.eta', { seconds: job.etaSec }))
  }
  if (job.packages.resolved > 0) {
    parts.push(t('plugins.progress.packages', {
      resolved: job.packages.resolved,
      reused: job.packages.reused,
      downloaded: job.packages.downloaded,
    }))
  }
  return parts
}

/** Props of the progress panel. */
export interface JobProgressProps {
  readonly operation: Operation
  readonly onCancel: () => void
}

/**
 * Live progress of one running operation.
 * @param props - the operation and its cancel verb.
 * @returns the panel, or null once the operation has settled.
 */
export function JobProgress({ operation, onCancel }: JobProgressProps): ReactNode {
  const t = useT()
  if (operation.status !== 'running') return null
  const job = operation.job
  const percent = job?.percent
  const indeterminate = percent === undefined
  const parts = job === undefined ? [] : statistics(job, t)
  return (
    <div className={css.progress} role="status" aria-live="polite">
      <div className={css.progressHead}>
        <span className={css.progressPhase}>
          {t(job === undefined ? 'plugins.phase.pending' : PHASE_KEY[job.phase])}
        </span>
        <span className={css.progressPercent}>{indeterminate ? '…' : `${String(percent)}%`}</span>
        {parts.length === 0 ? null : <span className={css.progressStats}>{parts.join(' · ')}</span>}
        {operation.jobId === undefined
          ? null
          : <Button onClick={onCancel}>{t('plugins.cancelJob')}</Button>}
      </div>
      <div
        className={css.progressTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(indeterminate ? {} : { 'aria-valuenow': percent })}
      >
        <div
          className={`${css.progressFill} ${indeterminate ? css.progressIndeterminate : ''}`}
          {...(indeterminate ? {} : { style: { width: `${String(percent)}%` } })}
        />
      </div>
      {job === undefined || job.step === '' ? null : <div className={css.progressStep}>{job.step}</div>}
      {job === undefined || job.log.length === 0
        ? null
        : <pre className={css.log}>{job.log.slice(-LOG_LINES).join('\n')}</pre>}
    </div>
  )
}

/** How much installer output a failure keeps on screen. */
const FAILURE_OUTPUT = 800

/**
 * The tail of a failed operation's installer output.
 * @param props - the settled operation.
 * @returns the output block, or null when the Host sent none.
 */
export function JobOutput({ operation }: { operation: Operation }): ReactNode {
  if (operation.status !== 'failed' || operation.output === '') return null
  return <pre className={css.log}>{operation.output.slice(-FAILURE_OUTPUT)}</pre>
}

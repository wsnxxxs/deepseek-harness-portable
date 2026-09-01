/**
 * Moved to `@dsh-portable/space-kernel`.
 *
 * The ingest, citation and index machinery is not specific to teaching: a
 * mission dossier grounds an agent in attached documents the same way a lesson
 * grounds a learner. It now lives in its own package, and this file re-exports
 * its counterpart so every caller in this pack keeps its existing import.
 * @module @dsh-portable/interactive-learning/index/lexical
 */

export * from '@dsh-portable/space-kernel/search/lexical'

import { isMap, isSeq, parseDocument, type Document, type YAMLSeq } from 'yaml'

const START = '# BEGIN portable-plugin-manager'
const END = '# END portable-plugin-manager'
const options = { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string) => value }] }

function parse(text: string): { document: Document; rows: YAMLSeq } {
  const document: Document = parseDocument(text.trim() ? text : '[]', options)
  if (document.errors.length) throw new Error(document.errors[0]!.message)
  if (document.contents === null) document.contents = document.createNode([])
  if (!isSeq(document.contents)) throw new Error('Profile patch must be a YAML array')
  return { document, rows: document.contents }
}

/** Merge the old appended block before parsing: flow arrays cannot have block rows appended. */
function readPatch(text: string): { document: Document; rows: YAMLSeq } {
  const start = text.indexOf(START)
  if (start < 0) return parse(text)
  const end = text.indexOf(END, start)
  if (end < 0) throw new Error('Portable plugin configuration has an unfinished managed block')
  const base = parse(text.slice(0, start) + text.slice(end + END.length))
  const managed = parse(text.slice(start + START.length, end))
  for (const row of managed.rows.items) base.rows.add(row)
  return base
}

export interface PatchOverride { id: string; name?: string; disabled: boolean }

/** Edit one YAML document, retaining unrelated rows, comments, anchors and literal !!js expressions. */
export function updateProfilePatch(text: string, overrides: readonly PatchOverride[] = [], removeIds: readonly string[] = []): string {
  const { document, rows } = readPatch(text)
  rows.items = rows.items.filter(row => !(isMap(row) && removeIds.includes(String(row.get('id')))))
  for (const override of overrides) {
    const matches = rows.items.filter(row => isMap(row) && !row.has('insert') && row.get('id') === override.id)
    const row = matches.at(-1)
    if (isMap(row)) {
      row.set('disabled', override.disabled)
      if (override.name) row.set('name', override.name)
    } else rows.add(document.createNode(override))
  }
  rows.flow = false
  return document.toString()
}

/** Unchanged valid profiles keep their exact bytes; only our old appended block is repaired. */
export function repairProfilePatch(text: string): string {
  return text.includes(START) ? updateProfilePatch(text) : text
}

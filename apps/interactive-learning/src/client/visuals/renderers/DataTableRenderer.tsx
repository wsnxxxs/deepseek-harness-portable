/** `data_table`: typed records with local filtering, sorting and a linked chart. */
import { useMemo, useState } from 'react'
import type { LearningTableValueV4 } from '../../../protocol.ts'
import { formatNumber, ticks, toneAt } from '../core/format.ts'
import { SelectionSurface } from '../core/shell-parts.tsx'
import type { DataTableContent, RendererProps } from '../core/types.ts'
import { useContainerWidth } from '../state/hooks.ts'
import { elementState } from '../state/visual-state.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/data-table.module.css'

type TableRow = DataTableContent['rows'][number]
type TableColumn = DataTableContent['columns'][number]
type TableSort = NonNullable<DataTableContent['initialSort']>
type TableFilter = NonNullable<DataTableContent['initialFilter']>

function valueOf(row: TableRow, columnId: string): LearningTableValueV4 {
  return row.cells.find(cell => cell.columnId === columnId)?.value ?? null
}

function formatValue(value: LearningTableValueV4, column: TableColumn): string {
  if (value === null) return '—'
  if (column.type === 'boolean') return value === true ? '✓' : value === false ? '✕' : String(value)
  if (column.type === 'number' && typeof value === 'number') {
    return `${formatNumber(value)}${column.unit === undefined ? '' : ` ${column.unit}`}`
  }
  return String(value)
}

function compareValues(left: LearningTableValueV4, right: LearningTableValueV4, column: TableColumn): number {
  if (left === null) return right === null ? 0 : 1
  if (right === null) return -1
  if (column.type === 'number') return Number(left) - Number(right)
  if (column.type === 'boolean') return Number(left) - Number(right)
  if (column.type === 'date') {
    const difference = Date.parse(String(left)) - Date.parse(String(right))
    if (Number.isFinite(difference)) return difference
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}

function matchesFilter(value: LearningTableValueV4, filter: TableFilter): boolean {
  const expected = filter.value
  if (filter.operator === 'contains') return String(value ?? '').toLocaleLowerCase().includes(String(expected ?? '').toLocaleLowerCase())
  if (filter.operator === 'equals') return value === expected || String(value) === String(expected)
  if (filter.operator === 'not_equals') return !(value === expected || String(value) === String(expected))
  const left = typeof value === 'number' ? value : Number(value)
  const right = typeof expected === 'number' ? expected : Number(expected)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false
  if (filter.operator === 'gt') return left > right
  if (filter.operator === 'gte') return left >= right
  if (filter.operator === 'lt') return left < right
  return left <= right
}

function numericValue(value: LearningTableValueV4, column: TableColumn, fallback: number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (column.type === 'boolean' && typeof value === 'boolean') return value ? 1 : 0
  if (column.type === 'date' && value !== null) {
    const parsed = Date.parse(String(value))
    if (Number.isFinite(parsed)) return parsed
  }
  if (column.type === 'string' && value !== null) return fallback
  return undefined
}

function extent(values: readonly number[]): { min: number; max: number } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min !== max) return { min, max }
  const padding = Math.max(1, Math.abs(min) * 0.08)
  return { min: min - padding, max: max + padding }
}

function LinkedChart({
  content,
  rows,
  selectedRowId,
  outlierIds,
  onSelect,
}: {
  content: DataTableContent
  rows: readonly TableRow[]
  selectedRowId?: string
  outlierIds: ReadonlySet<string>
  onSelect: (row: TableRow) => void
}) {
  const chart = content.chart
  const [hoveredRowId, setHoveredRowId] = useState<string>()
  const [viewportRef, measuredWidth] = useContainerWidth()
  if (chart === undefined) return null
  const xColumn = content.columns.find(column => column.id === chart.xColumnId)
  const yColumn = content.columns.find(column => column.id === chart.yColumnId)
  if (xColumn === undefined || yColumn === undefined) return null

  const points = rows.flatMap((row, index) => {
    const x = numericValue(valueOf(row, xColumn.id), xColumn, index)
    const y = numericValue(valueOf(row, yColumn.id), yColumn, index)
    return x === undefined || y === undefined ? [] : [{
      row,
      x,
      y,
      series: chart.seriesColumnId === undefined ? '' : String(valueOf(row, chart.seriesColumnId) ?? '—'),
    }]
  })
  if (points.length === 0) return null

  const width = Math.max(360, Math.round(measuredWidth))
  const height = 250
  const frame = { left: 54, right: 18, top: 18, bottom: 42 }
  const plotWidth = width - frame.left - frame.right
  const plotHeight = height - frame.top - frame.bottom
  const xExtent = extent(points.map(point => point.x))
  const yExtent = extent(points.map(point => point.y))
  const xTicks = ticks(xExtent.min, xExtent.max, 5)
  const yTicks = ticks(yExtent.min, yExtent.max, 5)
  const xAt = (value: number): number => frame.left + ((value - xExtent.min) / (xExtent.max - xExtent.min)) * plotWidth
  const yAt = (value: number): number => frame.top + (1 - (value - yExtent.min) / (yExtent.max - yExtent.min)) * plotHeight
  const groups = [...new Set(points.map(point => point.series))]
  const activePoint = points.find(point => point.row.id === hoveredRowId) ?? points.find(point => point.row.id === selectedRowId)
  const tooltipWidth = Math.min(190, Math.max(132, plotWidth - 16))
  const tooltipHeight = 42
  const tooltipX = activePoint === undefined ? 0 : Math.max(frame.left + tooltipWidth / 2, Math.min(frame.left + plotWidth - tooltipWidth / 2, xAt(activePoint.x)))
  const tooltipY = activePoint === undefined ? 0 : Math.max(frame.top + tooltipHeight + 6, yAt(activePoint.y) - 12)

  return (
    <div className={css.chartViewport} ref={viewportRef}>
      <svg className={css.chart} viewBox={`0 0 ${String(width)} ${String(height)}`} role="img" aria-label={`${yColumn.label} / ${xColumn.label}`}>
        <rect className={css.chartFrame} x={frame.left} y={frame.top} width={plotWidth} height={plotHeight} />
        <text className={css.yLabel} x={12} y={frame.top + plotHeight / 2} transform={`rotate(-90 12 ${String(frame.top + plotHeight / 2)})`}>{yColumn.label}</text>
        <text className={css.xLabel} x={frame.left + plotWidth / 2} y={height - 8}>{xColumn.label}</text>
        {xTicks.map(value => <g key={`x-${String(value)}`}><line className={css.chartGrid} x1={xAt(value)} x2={xAt(value)} y1={frame.top} y2={frame.top + plotHeight} /><text className={css.tick} x={xAt(value)} y={height - 24} textAnchor="middle">{formatNumber(value)}</text></g>)}
        {yTicks.map(value => <g key={`y-${String(value)}`}><line className={css.chartGrid} x1={frame.left} x2={frame.left + plotWidth} y1={yAt(value)} y2={yAt(value)} /><text className={css.tick} x={frame.left - 8} y={yAt(value)} textAnchor="end" dominantBaseline="middle">{formatNumber(value)}</text></g>)}
        {chart.type === 'line' ? groups.map((group, groupIndex) => {
          const series = points.filter(point => point.series === group).sort((left, right) => left.x - right.x)
          const path = series.map((point, index) => `${index === 0 ? 'M' : 'L'}${xAt(point.x).toFixed(2)},${yAt(point.y).toFixed(2)}`).join(' ')
          return <path key={group} className={css.chartLine} data-tone={toneAt(undefined, groupIndex)} d={path} />
        }) : null}
        {points.map((point, index) => {
          const tone = toneAt(undefined, Math.max(0, groups.indexOf(point.series)))
          const selected = selectedRowId === point.row.id
          const outlier = outlierIds.has(point.row.id)
          const state = selected ? 'selected' : elementState(point.row.id, { currentIds: new Set(), visitedIds: new Set(), active: false })
          if (chart.type === 'bar') {
            const baseline = yAt(Math.max(0, yExtent.min))
            const y = yAt(point.y)
            const barWidth = Math.max(5, Math.min(34, (plotWidth / Math.max(1, points.length)) * 0.62))
            return (
              <rect
                key={point.row.id}
                className={css.chartBar}
                data-tone={tone}
                data-selected={selected || undefined}
                data-outlier={outlier || undefined}
                data-visual-id={point.row.id}
                data-visual-state={state}
                x={xAt(point.x) - barWidth / 2}
                y={Math.min(y, baseline)}
                width={barWidth}
                height={Math.max(2, Math.abs(baseline - y))}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(point.row)}
                onPointerEnter={() => setHoveredRowId(point.row.id)}
                onPointerLeave={() => setHoveredRowId(undefined)}
                onFocus={() => setHoveredRowId(point.row.id)}
                onBlur={() => setHoveredRowId(undefined)}
              ><title>{`${xColumn.label}: ${formatValue(valueOf(point.row, xColumn.id), xColumn)}; ${yColumn.label}: ${formatValue(valueOf(point.row, yColumn.id), yColumn)}`}</title></rect>
            )
          }
          return (
            <circle
              key={point.row.id}
              className={css.chartPoint}
              data-tone={tone}
              data-selected={selected || undefined}
              data-outlier={outlier || undefined}
              data-visual-id={point.row.id}
              data-visual-state={state}
              cx={xAt(point.x)}
              cy={yAt(point.y)}
              r={outlier || selected ? 7 : 5}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(point.row)}
              onPointerEnter={() => setHoveredRowId(point.row.id)}
              onPointerLeave={() => setHoveredRowId(undefined)}
              onFocus={() => setHoveredRowId(point.row.id)}
              onBlur={() => setHoveredRowId(undefined)}
            ><title>{`${xColumn.label}: ${formatValue(valueOf(point.row, xColumn.id), xColumn)}; ${yColumn.label}: ${formatValue(valueOf(point.row, yColumn.id), yColumn)}`}</title></circle>
          )
        })}
        {activePoint === undefined ? null : (
          <g className={css.chartTooltip} transform={`translate(${tooltipX} ${tooltipY})`} aria-hidden="true">
            <rect x={-tooltipWidth / 2} y={-tooltipHeight} width={tooltipWidth} height={tooltipHeight} rx="6" />
            <text x={-tooltipWidth / 2 + 10} y={-tooltipHeight + 15}>
              <tspan x={-tooltipWidth / 2 + 10}>{xColumn.label}: {formatValue(valueOf(activePoint.row, xColumn.id), xColumn)}</tspan>
              <tspan x={-tooltipWidth / 2 + 10} dy="15">{yColumn.label}: {formatValue(valueOf(activePoint.row, yColumn.id), yColumn)}{outlierIds.has(activePoint.row.id) ? ' · 异常值' : ''}</tspan>
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

export function DataTableRenderer({ content, focus }: RendererProps<DataTableContent>) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<TableSort | undefined>(content.initialSort)
  const [filter, setFilter] = useState<TableFilter | undefined>(content.initialFilter)
  const [selectedRowId, setSelectedRowId] = useState<string>()
  const outlierIds = useMemo(() => new Set(content.outlierIds ?? []), [content.outlierIds])
  const selectedRow = content.rows.find(row => row.id === selectedRowId)

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    const filtered = content.rows.filter(row => {
      if (filter !== undefined && !matchesFilter(valueOf(row, filter.columnId), filter)) return false
      return needle === '' || content.columns.some(column => formatValue(valueOf(row, column.id), column).toLocaleLowerCase().includes(needle))
        || row.detail?.toLocaleLowerCase().includes(needle) === true
    })
    if (sort === undefined) return filtered
    const column = content.columns.find(item => item.id === sort.columnId)
    if (column === undefined) return filtered
    return [...filtered].sort((left, right) => {
      const order = compareValues(valueOf(left, column.id), valueOf(right, column.id), column)
      return sort.direction === 'asc' ? order : -order
    })
  }, [content.columns, content.rows, filter, query, sort])

  const selectRow = (row: TableRow): void => setSelectedRowId(current => current === row.id ? undefined : row.id)
  const changeSort = (columnId: string): void => setSort(current => current?.columnId === columnId
    ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { columnId, direction: 'asc' })

  return (
    <div className={shell.rendererStack}>
      <div className={css.toolbar}>
        <label className={css.search}>
          <span className={shell.srOnly}>筛选数据</span>
          <input type="search" value={query} placeholder="筛选数据…" onChange={event => setQuery(event.currentTarget.value)} />
        </label>
        <output aria-live="polite">{visibleRows.length} / {content.rows.length}</output>
        {filter === undefined ? null : <button type="button" className={shell.control} onClick={() => setFilter(undefined)}>清除预设筛选</button>}
      </div>
      <LinkedChart content={content} rows={visibleRows} selectedRowId={selectedRowId} outlierIds={outlierIds} onSelect={selectRow} />
      <div className={`${shell.viewport} ${css.tableViewport}`}>
        <table className={css.table}>
          <caption className={shell.srOnly}>数据表</caption>
          <thead><tr>{content.columns.map(column => {
            const active = sort?.columnId === column.id
            return (
              <th key={column.id} scope="col" data-visual-id={column.id} data-visual-state={elementState(column.id, focus)}>
                <button type="button" onClick={() => changeSort(column.id)} aria-label={`${column.label}，排序`}>
                  <span>{column.label}</span>{column.unit === undefined ? null : <small>{column.unit}</small>}
                  <i aria-hidden="true">{active ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}</i>
                </button>
              </th>
            )
          })}</tr></thead>
          <tbody>{visibleRows.map(row => {
            const selected = row.id === selectedRowId
            const outlier = outlierIds.has(row.id)
            return (
              <tr
                key={row.id}
                data-visual-id={row.id}
                data-visual-state={selected ? 'selected' : elementState(row.id, focus)}
                data-selected={selected || undefined}
                data-outlier={outlier || undefined}
                onClick={() => selectRow(row)}
              >
                {content.columns.map((column, index) => {
                  const value = valueOf(row, column.id)
                  const Cell = index === 0 ? 'th' : 'td'
                  return (
                    <Cell key={column.id} {...(index === 0 ? { scope: 'row' as const } : {})} data-missing={value === null || undefined}>
                      {index === 0 && outlier ? <span className={css.outlierMark} title="异常值" aria-label="异常值">!</span> : null}
                      <span>{formatValue(value, column)}</span>
                    </Cell>
                  )
                })}
              </tr>
            )
          })}</tbody>
        </table>
        {visibleRows.length === 0 ? <p className={css.empty}>没有匹配的记录。</p> : null}
      </div>
      <SelectionSurface
        hint="选择一行可在表格与图表中联动查看。"
        selected={selectedRow === undefined ? undefined : {
          label: content.columns.slice(0, 2).map(column => formatValue(valueOf(selectedRow, column.id), column)).join(' · '),
          detail: selectedRow.detail ?? (outlierIds.has(selectedRow.id) ? '该记录被标记为异常值。' : undefined),
          kind: outlierIds.has(selectedRow.id) ? '异常记录' : '记录',
        }}
        onClose={() => setSelectedRowId(undefined)}
      />
    </div>
  )
}

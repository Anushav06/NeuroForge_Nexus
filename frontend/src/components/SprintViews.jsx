import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { isSprintActive } from '../api/client'
import { EmptyState } from './ui'

/* ═══════════════════════════════════════════════════════════════
   SprintCalendar & SprintTimeline — alternative views for the
   Sprints page. Both are read-only over the same sprint objects
   the List grid already receives (no extra fetching): every
   pill/bar links to the sprint board at /sprints/:id and is green
   (signal-success) while the sprint is active, steel-blue
   (steel-*) otherwise. All colors come from the @theme tokens in
   src/index.css.
   ═══════════════════════════════════════════════════════════════ */

const DAY_MS = 24 * 60 * 60 * 1000

/** Parse a sprint date ('YYYY-MM-DD', tolerant of full ISO stamps) to local midnight. */
const parseDay = (iso) => {
  if (!iso) return null
  const date = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Local 'YYYY-MM-DD' key for a Date (avoids the UTC off-by-one of toISOString). */
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const shortDate = (date) =>
  date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'

const pillClasses = (active) =>
  active
    ? 'border-signal-success/40 bg-signal-success/15 text-signal-success hover:bg-signal-success/30'
    : 'border-steel-500/40 bg-steel-500/15 text-steel-300 hover:bg-steel-500/30'

const barClasses = (active) =>
  active
    ? 'border-signal-success/50 bg-signal-success/20 text-signal-success hover:bg-signal-success/35'
    : 'border-steel-500/50 bg-steel-500/20 text-steel-300 hover:bg-steel-500/35'

const navBtnClasses =
  'grid h-8 w-8 place-items-center rounded-lg border border-forge-600 text-forge-muted transition hover:bg-forge-850 hover:text-forge-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60'

/* ── Calendar ─────────────────────────────────────────────────── */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_PILLS_PER_CELL = 2

/** Month grid of sprint pills; pills link to the sprint board. */
function SprintCalendar({ sprints }) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // 'YYYY-MM-DD' -> sprints overlapping that day (startDate–endDate inclusive).
  const pillsByDay = useMemo(() => {
    const map = {}
    for (const sprint of sprints) {
      const start = parseDay(sprint.startDate)
      const end = parseDay(sprint.endDate)
      if (!start || !end) continue
      const cursor = new Date(start)
      let guard = 0 // safety cap for pathological ranges (>1y)
      while (cursor <= end && guard < 366) {
        const key = dayKey(cursor)
        if (!map[key]) map[key] = []
        map[key].push(sprint)
        cursor.setDate(cursor.getDate() + 1)
        guard += 1
      }
    }
    return map
  }, [sprints])

  // 42 cells (6 full weeks) so the grid height never jumps between months.
  const cells = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const lead = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first offset
    const gridStart = new Date(year, month, 1 - lead)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(date.getDate() + index)
      return date
    })
  }, [monthCursor])

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const todayKey = dayKey(new Date())
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const shiftMonth = (delta) => setMonthCursor(new Date(year, month + delta, 1))
  const backToToday = () => {
    const now = new Date()
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <section className="nf-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forge-700/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className={navBtnClasses}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className={navBtnClasses}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={backToToday}
            className="rounded-lg px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-forge-muted transition hover:bg-forge-850 hover:text-forge-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60"
          >
            Today
          </button>
        </div>
        <h2 className="font-display text-base font-semibold text-forge-text">{monthLabel}</h2>
      </div>

      <div className="grid grid-cols-7 border-b border-forge-700/60 bg-forge-850">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="px-1 py-2 text-center font-mono text-[10px] font-medium uppercase tracking-wider text-forge-faint"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((date, index) => {
          const key = dayKey(date)
          const inMonth = date.getMonth() === month
          const isToday = key === todayKey
          const daySprints = pillsByDay[key] ?? []
          const cellBg = isToday ? 'bg-forge-850' : inMonth ? 'bg-forge-900' : 'bg-forge-950/40'
          return (
            <div
              key={key}
              className={[
                'min-h-[76px] overflow-hidden p-1.5 sm:min-h-[96px] sm:p-2',
                index % 7 === 6 ? '' : 'border-r',
                index >= 35 ? '' : 'border-b',
                'border-forge-700/40',
                cellBg,
              ].join(' ')}
            >
              <p
                className={`mb-1 font-mono text-[11px] ${
                  isToday ? 'font-semibold text-ember-400' : inMonth ? 'text-forge-muted' : 'text-forge-faint/60'
                }`}
              >
                {date.getDate()}
              </p>
              <div className="space-y-1">
                {daySprints.slice(0, MAX_PILLS_PER_CELL).map((sprint) => {
                  const sId = sprint.id || sprint._id
                  return (
                    <Link
                      key={sId}
                      to={`/sprints/${sId}`}
                      title={`${sprint.name || 'Sprint'} · ${sprint.project || 'Project'}`}
                      className={`block truncate rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium transition ${pillClasses(
                        isSprintActive(sprint),
                      )}`}
                    >
                      {sprint.name || 'Sprint'}
                    </Link>
                  )
                })}
                {daySprints.length > MAX_PILLS_PER_CELL ? (
                  <p className="px-1 font-mono text-[10px] text-forge-faint">
                    +{daySprints.length - MAX_PILLS_PER_CELL} more
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ── Timeline (Gantt) ─────────────────────────────────────────── */

/** One row per sprint; bars sized by start/end dates over a shared date axis. */
function SprintTimeline({ sprints }) {
  const rows = useMemo(
    () =>
      [...sprints]
        .filter((sprint) => parseDay(sprint.startDate) && parseDay(sprint.endDate))
        .sort((a, b) => parseDay(a.startDate) - parseDay(b.startDate)),
    [sprints],
  )

  const chart = useMemo(() => {
    if (rows.length === 0) return null
    const rangeStart = new Date(Math.min(...rows.map((s) => parseDay(s.startDate).getTime())))
    const rangeEnd = new Date(Math.max(...rows.map((s) => parseDay(s.endDate).getTime())))
    const totalDays = Math.max(1, Math.round((rangeEnd - rangeStart) / DAY_MS) + 1)
    const dayIndexOf = (date) => Math.round((date.getTime() - rangeStart.getTime()) / DAY_MS)

    // Weekly ticks on short ranges, month ticks on long ones.
    const ticks = []
    if (totalDays <= 120) {
      for (let offset = 0; offset < totalDays; offset += 7) {
        const date = new Date(rangeStart)
        date.setDate(date.getDate() + offset)
        ticks.push({
          key: dayKey(date),
          left: (offset / totalDays) * 100,
          label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        })
      }
    } else {
      const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
      while (cursor <= rangeEnd) {
        if (cursor >= rangeStart) {
          ticks.push({
            key: dayKey(cursor),
            left: (dayIndexOf(cursor) / totalDays) * 100,
            label: cursor.toLocaleDateString(undefined, { month: 'short' }),
          })
        }
        cursor.setMonth(cursor.getMonth() + 1)
      }
    }

    const todayIdx = dayIndexOf(new Date())
    return {
      rangeStart,
      totalDays,
      ticks,
      todayPct: todayIdx >= 0 && todayIdx < totalDays ? (todayIdx / totalDays) * 100 : null,
    }
  }, [rows])

  if (rows.length === 0 || !chart) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="No dated sprints"
        message="Add start and end dates to sprints to see them on the timeline."
      />
    )
  }

  const dayIndex = (date) => Math.round((date.getTime() - chart.rangeStart.getTime()) / DAY_MS)

  return (
    <section className="nf-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          {/* Date axis */}
          <div className="flex border-b border-forge-700/60 bg-forge-850">
            <div className="sticky left-0 z-10 w-36 shrink-0 border-r border-forge-700/60 bg-forge-850 px-3 py-2.5 sm:w-48">
              <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-forge-faint">Sprint</p>
            </div>
            <div className="relative h-10 flex-1">
              {chart.ticks.map((tick) => (
                <div
                  key={tick.key}
                  className="absolute top-0 h-full border-l border-forge-700/60"
                  style={{ left: `${tick.left}%` }}
                >
                  <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-forge-faint">
                    {tick.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* One row per sprint, earliest first */}
          {rows.map((sprint) => {
            const sId = sprint.id || sprint._id
            const start = parseDay(sprint.startDate)
            const end = parseDay(sprint.endDate)
            const leftPct = (dayIndex(start) / chart.totalDays) * 100
            const widthPct = ((Math.round((end - start) / DAY_MS) + 1) / chart.totalDays) * 100
            return (
              <div key={sId} className="flex items-stretch border-b border-forge-700/40 last:border-b-0">
                <div className="sticky left-0 z-10 w-36 shrink-0 border-r border-forge-700/40 bg-forge-900 px-3 py-3 sm:w-48">
                  <p className="truncate text-sm font-medium text-forge-text" title={sprint.name}>
                    {sprint.name || 'Sprint'}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-steel-400" title={sprint.project}>
                    {sprint.project || 'Project'}
                  </p>
                </div>
                <div className="relative min-h-[60px] flex-1">
                  {chart.ticks.map((tick) => (
                    <div
                      key={tick.key}
                      aria-hidden
                      className="absolute top-0 h-full border-l border-forge-700/30"
                      style={{ left: `${tick.left}%` }}
                    />
                  ))}
                  {chart.todayPct !== null ? (
                    <div
                      aria-hidden
                      className="absolute top-0 h-full border-l-2 border-dashed border-ember-500/70"
                      style={{ left: `${chart.todayPct}%` }}
                    />
                  ) : null}
                  <Link
                    to={`/sprints/${sId}`}
                    title={`${sprint.name || 'Sprint'} · ${sprint.project || 'Project'} · ${shortDate(start)} – ${shortDate(end)}`}
                    className={`absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md border px-2 transition ${barClasses(
                      isSprintActive(sprint),
                    )}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '12px' }}
                  >
                    <span className="truncate font-mono text-[10px] font-medium">
                      {shortDate(start)} – {shortDate(end)}
                    </span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-forge-700/60 px-4 py-2.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-forge-faint">
          <span className="h-2 w-2 rounded-full bg-signal-success" aria-hidden /> Active
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-forge-faint">
          <span className="h-2 w-2 rounded-full bg-steel-500" aria-hidden /> Scheduled
        </span>
        <span className="ml-auto font-mono text-[10px] text-forge-faint">
          {rows.length} sprint{rows.length === 1 ? '' : 's'} · {chart.totalDays} day{chart.totalDays === 1 ? '' : 's'}
        </span>
      </div>
    </section>
  )
}

export { SprintCalendar, SprintTimeline }

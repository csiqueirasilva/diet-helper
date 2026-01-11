import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import './App.css'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'

const DATA_FILES = {
  config: 'config.json',
  mealPlan: 'meal-plan.json',
  meals: 'meals.json',
}

const WEEK_PROTEIN_KEY = 'week-protein'
const MS_PER_DAY = 24 * 60 * 60 * 1000

const PREP_TASKS = {
  domingo: [
    'Proteina da semana (acem ou file mignon, apenas 1 por semana)',
    'Arroz ate quarta almoco',
    'Legumes ate quarta almoco (2 mixes)',
    'Molho de tomate base (congelar em porcoes)',
    'Macarrao pre-cozido para quarta em diante',
    'Mise en place congelado: cebola, alho, pimentao, cheiro-verde (tomate opcional)',
  ],
  quarta: [
    'Frango em cubos para a parte facil (quarta noite em diante)',
    'Ovos cozidos (8–12) para almocos/janta leves pos-quarta',
    'Sem legumes cozidos depois de quarta',
  ],
}

const startOfDayLocal = (value) => {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

const parseDateInput = (value) => {
  if (!value) return null
  const parts = value.split('-').map(Number)
  if (parts.length !== 3) return null
  const [year, month, day] = parts
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const toInputValue = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const differenceInDays = (dateA, dateB) => {
  const startA = startOfDayLocal(dateA)
  const startB = startOfDayLocal(dateB)
  return Math.round((startA - startB) / MS_PER_DAY)
}

const getWeekdayIndex = (date) => startOfDayLocal(date).getDay()

const lastSundayFrom = (date) => {
  const weekday = getWeekdayIndex(date)
  return addDays(startOfDayLocal(date), -weekday)
}

const withBasePath = (file) => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}data/${file}`
}

const resolveMealId = (mealId, proteinId) => (mealId === WEEK_PROTEIN_KEY ? proteinId : mealId)

const computeShoppingList = (days, mealsById) => {
  const items = new Map()

  days.forEach((day) => {
    day.slots?.forEach((slot) => {
      slot.items?.forEach((item) => {
        const meal = mealsById[item.mealId]
        if (!meal?.ingredients?.length) return
        const servings = item.servings || 1

        meal.ingredients.forEach((ingredient) => {
          const key = `${ingredient.name}|${ingredient.unit}`
          const existing = items.get(key) || {
            name: ingredient.name,
            unit: ingredient.unit,
            total: 0,
            sources: [],
          }

          const total = existing.total + ingredient.quantity * servings
          const sources = existing.sources.includes(meal.name)
            ? existing.sources
            : [...existing.sources, meal.name]

          items.set(key, { ...existing, total, sources })
        })
      })
    })
  })

  return Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function App() {
  const [config, setConfig] = useState(null)
  const [planData, setPlanData] = useState(null)
  const [meals, setMeals] = useState([])
  const [anchorDateInput, setAnchorDateInput] = useState('')
  const [status, setStatus] = useState({ loading: true, error: '' })
  const [modal, setModal] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  const timeZone = 'local'
  const today = useMemo(() => startOfDayLocal(new Date()), [])

  useEffect(() => {
    let active = true
    const fetchJson = async (file) => {
      const response = await fetch(withBasePath(file))
      if (!response.ok) throw new Error(`Falha ao carregar ${file}`)
      return response.json()
    }

    const loadData = async () => {
      try {
        const [configJson, planJson, mealsJson] = await Promise.all([
          fetchJson(DATA_FILES.config),
          fetchJson(DATA_FILES.mealPlan),
          fetchJson(DATA_FILES.meals),
        ])
        if (!active) return

        const baseStart = lastSundayFrom(new Date())

        setConfig(configJson)
        setPlanData(planJson)
        setMeals(mealsJson)
        setAnchorDateInput(toInputValue(baseStart))
        setStatus({ loading: false, error: '' })
      } catch (err) {
        setStatus({ loading: false, error: err.message || 'Erro ao carregar dados' })
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const anchorDate = useMemo(() => {
    const parsed = parseDateInput(anchorDateInput)
    if (parsed) return parsed
    return lastSundayFrom(today)
  }, [anchorDateInput, today])

  const mealsById = useMemo(() => {
    return meals.reduce((acc, meal) => {
      acc[meal.id] = meal
      return acc
    }, {})
  }, [meals])

  const plan = useMemo(() => {
    if (!planData?.plans?.length) return null
    return (
      planData.plans.find((entry) => entry.id === planData.defaultPlanId) || planData.plans[0]
    )
  }, [planData])

  const templateDays = plan?.template?.days || []
  const rotation = plan?.proteinRotation || []
  const fallbackProteinId = plan?.fallbackProteinId
  const horizon = Math.max(config?.horizonDays || 365, 56)
  const horizonWeeks = Math.max(1, Math.ceil(horizon / 7))
  const normalizedHorizon = horizonWeeks * 7

  const getWeekProtein = (weekIndex) => {
    const rotationEntry = rotation.length ? rotation[weekIndex % rotation.length] : null
    const proteinId = rotationEntry?.proteinId || fallbackProteinId
    const label = rotationEntry?.label || rotationEntry?.id || `Semana ${weekIndex + 1}`
    return { proteinId, label }
  }

  const schedule = useMemo(() => {
    if (!templateDays.length) return []

    return Array.from({ length: normalizedHorizon }, (_, index) => {
      const weekIndex = Math.floor(index / 7)
      const { proteinId, label } = getWeekProtein(weekIndex)
      const templateDay = templateDays[index % templateDays.length]
      const date = addDays(anchorDate, index)

      const slots = (templateDay.slots || []).map((slot) => {
        const items = (slot.items && slot.items.length
          ? slot.items
          : slot.mealId
            ? [{ mealId: slot.mealId, servings: slot.servings || 1 }]
            : []
        ).map((item) => {
          const resolvedId = resolveMealId(item.mealId, proteinId)
          const meal = mealsById[resolvedId]
          return {
            ...item,
            mealId: resolvedId,
            mealName: meal?.name || resolvedId,
          }
        })
        return { ...slot, items }
      })

      return {
        ...templateDay,
        date,
        weekIndex,
        weekLabel: label,
        slots,
      }
    })
  }, [anchorDate, templateDays, normalizedHorizon, mealsById, rotation])

  const shoppingEvery = config?.shoppingFrequencyDays || 7
  const shoppingAnchor = config?.shoppingAnchorDate
    ? parseDateInput(config.shoppingAnchorDate, timeZone)
    : anchorDate

  const nextShoppingDate = useMemo(() => {
    if (!shoppingAnchor) return null
    let date = shoppingAnchor
    while (date < today) {
      date = addDays(date, shoppingEvery)
    }
    return date
  }, [shoppingAnchor, shoppingEvery, today])

  const shoppingWeek = useMemo(() => {
    if (!schedule.length) return { days: [], label: '', start: anchorDate, weekIndex: 0 }

    const currentIndex = Math.floor(differenceInDays(today, anchorDate) / 7)
    const weekIndex = Math.max(0, currentIndex)
    const start = addDays(anchorDate, weekIndex * 7)
    const end = addDays(start, 7)
    const days = schedule.filter((day) => day.date >= start && day.date < end)
    const weekLabel = days[0]?.weekLabel || `Semana ${weekIndex + 1}`

    return {
      days,
      label: weekLabel,
      start,
      weekIndex,
    }
  }, [schedule, today, anchorDate])

  const shoppingList = useMemo(() => {
    if (!shoppingWeek.days.length) return []

    return computeShoppingList(shoppingWeek.days, mealsById)
  }, [shoppingWeek, mealsById])

  const weekSegments = useMemo(() => {
    if (!schedule.length) return []
    const byWeek = new Map()
    schedule.forEach((day) => {
      const entry = byWeek.get(day.weekIndex) || {
        weekIndex: day.weekIndex,
        label: day.weekLabel,
        start: addDays(anchorDate, day.weekIndex * 7),
        days: [],
      }
      entry.days.push(day)
      byWeek.set(day.weekIndex, entry)
    })
    return Array.from(byWeek.values()).map((week) => ({
      ...week,
      shoppingList: computeShoppingList(week.days, mealsById),
    }))
  }, [schedule, anchorDate, mealsById])

  const prepBlocks = useMemo(() => {
    if (!anchorDate) return []
    const blocks = []
    const horizonDate = addDays(anchorDate, normalizedHorizon - 1)
    let pointer = anchorDate

    while (pointer <= horizonDate) {
      const sunday = pointer
      const wednesday = addDays(pointer, 3)
      blocks.push({
        kind: 'domingo',
        label: 'Preparo de domingo',
        date: sunday,
        covers: { start: sunday, end: addDays(sunday, 3) },
      })
      if (wednesday <= horizonDate) {
        blocks.push({
          kind: 'quarta',
          label: 'Preparo de quarta',
          date: wednesday,
          covers: { start: wednesday, end: addDays(wednesday, 3) },
        })
      }
      pointer = addDays(pointer, 7)
    }

    return blocks
  }, [anchorDate, normalizedHorizon])

  const events = useMemo(() => {
    const all = []

    schedule.forEach((day) => {
      const dateStr = toInputValue(day.date, timeZone)

      ;(day.slots || []).forEach((slot, idx) => {
        const label = slot.items?.map((item) => item.mealName).join(' + ')
        const timeLabel = (slot.time || '').toLowerCase()
        let className = 'event-meal'
        let order = 1.5
        if (timeLabel.includes('marmita')) className = 'event-marmita'
        else if (timeLabel.includes('almoco')) className = 'event-lunch'
        else if (timeLabel.includes('jantar')) className = 'event-dinner'

        if (className === 'event-marmita' || className === 'event-lunch') order = 1
        if (className === 'event-dinner') order = 2

        all.push({
          id: `${dateStr}-${idx}`,
          title: label,
          start: dateStr,
          allDay: true,
          className,
          extendedProps: {
            type: 'meal',
            slotTime: slot.time,
            items: slot.items,
            weekLabel: day.weekLabel,
            order,
          },
        })
      })
    })

    weekSegments.forEach((week) => {
      const shoppingDate = addDays(week.start, 6) // compras no sabado desta semana
      const dateStr = toInputValue(shoppingDate, timeZone)
      all.push({
        id: `${dateStr}-shopping`,
        title: `Compras (${week.label})`,
        start: dateStr,
        allDay: true,
        className: 'event-shopping',
        extendedProps: {
          type: 'shopping',
          items: week.shoppingList,
          weekLabel: week.label,
          order: 0.5,
        },
      })
    })

    prepBlocks.forEach((block, idx) => {
      const dateStr = toInputValue(block.date, timeZone)
      all.push({
        id: `${dateStr}-prep-${idx}`,
        title: block.label,
        start: dateStr,
        allDay: true,
          className: 'event-prep',
          extendedProps: {
            type: 'prep',
            tasks: PREP_TASKS[block.kind] || [],
            covers: block.covers,
            label: block.label,
            order: 0.25,
          },
        })
      })

      return all
  }, [schedule, timeZone, weekSegments, prepBlocks])

  if (status.loading) {
    return (
      <main className="page">
        <div className="loading">Carregando dados do plano...</div>
      </main>
    )
  }

  if (status.error) {
    return (
      <main className="page full-height">
        <div className="error">{status.error}</div>
      </main>
    )
  }

  return (
    <main className="page full-height">
      <section className="panel full-height">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          initialView={isMobile ? 'listWeek' : 'twoWeek'}
          events={events}
          timeZone={timeZone}
          initialDate={today}
          height="100%"
          contentHeight="auto"
          expandRows
          headerToolbar={
            isMobile
              ? { left: 'prev,next', center: 'title', right: 'listWeek,dayGridMonth' }
              : { left: 'prev,next', center: 'title', right: 'dayGridMonth,twoWeek' }
          }
          dayMaxEvents={false}
          locales={[ptBrLocale]}
          locale="pt-br"
          views={{
            twoWeek: {
              type: 'dayGrid',
              duration: { weeks: 2 },
              buttonText: '2 semanas',
              dateAlignment: 'week',
              dateIncrement: { weeks: 1 },
            },
            listWeek: {
              type: 'listWeek',
              buttonText: 'Lista semanal',
            },
          }}
          eventOrder={(a, b) => {
            const oa = typeof a.extendedProps.order === 'number' ? a.extendedProps.order : 0
            const ob = typeof b.extendedProps.order === 'number' ? b.extendedProps.order : 0
            if (oa !== ob) return oa - ob
            return (a.title || '').localeCompare(b.title || '')
          }}
          eventClick={(info) => {
            const { event } = info
            const props = event.extendedProps || {}
            if (props.type === 'shopping') {
              setModal({
                title: event.title,
                date: event.start,
                content: props.items || [],
                kind: 'shopping',
                weekLabel: props.weekLabel,
              })
              return
            }
            if (props.type === 'prep') {
              setModal({
                title: props.label || event.title,
                date: event.start,
                tasks: props.tasks || [],
                covers: props.covers,
                kind: 'prep',
              })
              return
            }
            setModal({
              title: props.slotTime || 'Refeicao',
              date: event.start,
              items: props.items || [],
              kind: 'meal',
            })
          }}
        />
      </section>

      <section className="panel legend sticky-legend">
        <div className="legend-row">
          <span className="legend-item"><span className="legend-dot event-lunch" />Almoco</span>
          <span className="legend-item"><span className="legend-dot event-marmita" />Almoco (marmita)</span>
          <span className="legend-item"><span className="legend-dot event-dinner" />Jantar</span>
          <span className="legend-item"><span className="legend-dot event-shopping" />Compras</span>
          <span className="legend-item"><span className="legend-dot event-prep" />Preparo</span>
        </div>
      </section>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{modal.kind}</p>
                <h3 className="modal-title">{modal.title}</h3>
                {modal.date && (
                  <p className="muted">{modal.date.toLocaleDateString('pt-BR')}</p>
                )}
              </div>
              <button type="button" className="ghost" onClick={() => setModal(null)}>
                Fechar
              </button>
            </div>
            {modal.kind === 'shopping' && (
              <div className="shopping-modal-content">
                <div className="modal-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const text = modal.content
                        .map((item) => `${item.name}: ${item.total} ${item.unit} (${(item.sources || []).join(', ')})`)
                        .join('\n')
                      navigator.clipboard?.writeText(text)
                    }}
                  >
                    Copiar lista
                  </button>
                </div>
                <ul className="shopping-list">
                  {modal.content.map((item) => (
                    <li key={`${item.name}-${item.unit}`} className="shopping-item">
                      <div>
                        <p className="item-name">{item.name}</p>
                        <p className="muted">{item.sources?.join(', ')}</p>
                      </div>
                      <span className="qty">{item.total} {item.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {modal.kind === 'prep' && (
              <div>
                {modal.covers && (
                  <p className="muted">
                    Cobre {modal.covers.start.toLocaleDateString('pt-BR')} → {modal.covers.end.toLocaleDateString('pt-BR')}
                  </p>
                )}
                <ul className="prep-tasks modal-list">
                  {(modal.tasks || []).map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
              </div>
            )}
            {modal.kind === 'meal' && (
              <ul className="prep-tasks modal-list">
                {(modal.items || []).map((item) => (
                  <li key={item.mealId}>{item.mealName} · {item.servings || 1} porcao(oes)</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default App

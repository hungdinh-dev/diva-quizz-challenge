import { useRef, useState, type PointerEvent } from 'react'
import { Check, ClipboardList, GripVertical, Hand, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import type { QuestionOption } from '@/types/quiz'

interface Props {
  options: QuestionOption[]
  selectedKeys: string[]
  limit: number
  /** Present once graded — marks chosen actions as correct / wrong. */
  correctKeys?: string[]
  onSelect: (keys: string[]) => void
}

export function ActionBuilder({ options, selectedKeys, limit, correctKeys, onSelect }: Props) {
  const { t } = useI18n()
  const plan = useRef<HTMLDivElement>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  const [drag, setDrag] = useState<{ text: string; x: number; y: number } | null>(null)
  const full = selectedKeys.length >= limit
  const graded = Boolean(correctKeys)
  const overPlan = (x: number, y: number) => {
    const rect = plan.current?.getBoundingClientRect()
    return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
  }
  const add = (key: string) => {
    if (!full && options.some((option) => option.key === key) && !selectedKeys.includes(key)) {
      onSelect([...selectedKeys, key])
    }
  }

  const move = (event: PointerEvent, option: QuestionOption) => {
    if (!origin.current) return
    if (Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) < 6 && !moved.current) return
    moved.current = true
    setDrag({ text: option.text, x: event.clientX, y: event.clientY })
  }

  const resetDrag = () => {
    origin.current = null
    setDrag(null)
  }

  const pool = options.filter((option) => !selectedKeys.includes(option.key))

  return (
    <div className="dv-ab">
      {!graded && (
        <p className="dv-instruction !mt-0">
          <Hand aria-hidden />
          {t('Kéo thả hoặc chạm vào ' + limit + ' hành động phù hợp để đưa vào kế hoạch.', 'Drag or tap ' + limit + ' suitable actions into your plan.')}
        </p>
      )}

      {!graded && pool.length > 0 && (
        <div className="dv-ab-pool">
          {pool.map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={full}
              className="dv-chip"
              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0) return
                moved.current = false
                origin.current = { x: event.clientX, y: event.clientY }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => move(event, option)}
              onPointerUp={(event) => {
                move(event, option)
                if (moved.current && overPlan(event.clientX, event.clientY)) add(option.key)
                resetDrag()
              }}
              onPointerCancel={resetDrag}
              onLostPointerCapture={resetDrag}
              onClick={(event) => {
                if (!moved.current || event.detail === 0) add(option.key)
              }}
            >
              <span className="dv-chip-grip" aria-hidden><GripVertical /></span>
              {option.text}
            </button>
          ))}
        </div>
      )}

      <div ref={plan} className={cn('dv-plan', drag && overPlan(drag.x, drag.y) && 'is-over')}>
        <div className="dv-plan-head">
          <h2 className="dv-plan-title"><ClipboardList className="h-5 w-5" aria-hidden />{t('Kế hoạch hành động', 'Action plan')}</h2>
          <span aria-live="polite" className="dv-plan-count">{selectedKeys.length}/{limit}</span>
        </div>
        <div className="dv-plan-slots">
          {Array.from({ length: limit }).map((_, idx) => {
            const key = selectedKeys[idx]
            const option = key ? options.find((item) => item.key === key) : undefined
            if (!option) {
              return (
                <div key={'empty-' + idx} className="dv-slot">
                  <span className="dv-slot-num">{idx + 1}</span>
                  <span className="dv-slot-text">{t('Thả hành động vào đây', 'Drop an action here')}</span>
                </div>
              )
            }
            const state = correctKeys ? (correctKeys.includes(option.key) ? 'is-correct' : 'is-wrong') : ''
            return (
              <div key={option.key} className={cn('dv-slot is-filled', state)}>
                <span className="dv-slot-num">
                  {state === 'is-correct' ? <Check className="h-4 w-4" strokeWidth={3} /> : state === 'is-wrong' ? <X className="h-4 w-4" strokeWidth={3} /> : idx + 1}
                </span>
                <span className="dv-slot-text">{option.text}</span>
                {!graded && (
                  <button
                    type="button"
                    className="dv-slot-remove"
                    onClick={() => onSelect(selectedKeys.filter((value) => value !== option.key))}
                    aria-label={t('Bỏ ', 'Remove ') + option.text}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {drag && <div aria-hidden className="dv-drag-ghost" style={{ left: drag.x, top: drag.y }}>{drag.text}</div>}
    </div>
  )
}

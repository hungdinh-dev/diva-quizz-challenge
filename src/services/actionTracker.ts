import { quizService } from '@/services/quizService'
import type { ActionEventType, QuizActionEvent, Stage } from '@/types/quiz'

const QUEUE_PREFIX = 'diva_quiz_action_queue_'

export class ActionTracker {
  private attemptId: string
  private attemptToken: string
  private employeeCode: string
  private seq: number = 0
  private pending: QuizActionEvent[] = []

  constructor(attemptId: string, attemptToken: string, employeeCode: string, lastEventSeq = 0) {
    this.attemptId = attemptId
    this.attemptToken = attemptToken
    this.employeeCode = employeeCode
    this.restoreFromStorage()
    this.seq = Math.max(this.seq, lastEventSeq)
  }

  private get storageKey(): string {
    return `${QUEUE_PREFIX}${this.attemptId}`
  }

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { seq: number; pending: QuizActionEvent[] }
        this.seq = parsed.seq || 0
        this.pending = parsed.pending || []
      }
    } catch {
      this.seq = 0
      this.pending = []
    }
  }

  private persistToStorage(): void {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({ seq: this.seq, pending: this.pending })
      )
    } catch {
      // Ignore storage quota errors
    }
  }

  public record(
    eventType: ActionEventType,
    stage: 'INTRO' | Stage | 'RESULT',
    options?: {
      questionCode?: string
      payload?: Record<string, unknown>
      timeSpentMs?: number
    }
  ): QuizActionEvent {
    this.seq += 1
    const event: QuizActionEvent = {
      attempt_id: this.attemptId,
      client_seq: this.seq,
      employee_code: this.employeeCode,
      question_code: options?.questionCode,
      stage,
      event_type: eventType,
      event_payload: options?.payload || {},
      time_spent_ms: Math.max(0, Math.round(options?.timeSpentMs || 0)),
      event_time: new Date().toISOString(),
    }
    this.pending.push(event)
    this.persistToStorage()
    return event
  }

  public async flush(draftAnswers?: Record<string, string[]>): Promise<void> {
    if (this.pending.length === 0 && !draftAnswers) return
    const batch = [...this.pending]
    try {
      await quizService.flushActions(this.attemptId, this.attemptToken, batch, draftAnswers)
      this.pending = this.pending.filter((ev) => !batch.some((b) => b.client_seq === ev.client_seq))
      this.persistToStorage()
    } catch {
      // Keep events in localStorage buffer to retry at next milestone or submit
    }
  }

  public drainAllPending(): QuizActionEvent[] {
    return [...this.pending]
  }

  public clearStorage(): void {
    this.pending = []
    localStorage.removeItem(this.storageKey)
  }
}

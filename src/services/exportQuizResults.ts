import type { Campaign, QuizAttempt } from '@/types/quiz'
import * as XLSX from 'xlsx'

export function exportQuizResults(campaign: Campaign, attempts: QuizAttempt[], locale: 'vi' | 'en') {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi
  const rows = [...attempts].sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))
  const workbook = XLSX.utils.book_new()
  const summary = XLSX.utils.aoa_to_sheet([
    [t('Chiến dịch', 'Campaign'), campaign.title],
    [t('Mã chiến dịch', 'Campaign code'), campaign.campaign_code],
    [t('Lượt đã hoàn thành', 'Completed attempts'), rows.length],
    [t('Nhân viên đã hoàn thành', 'Employees who completed'), new Set(rows.map((attempt) => attempt.employee_code)).size],
    [t('Múi giờ', 'Time zone'), 'UTC+07:00'],
  ])
  summary['!cols'] = [{ wch: 28 }, { wch: 50 }]

  const format = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium',
  })
  const date = (value?: string) => value ? format.format(new Date(value)) : ''
  const results = XLSX.utils.aoa_to_sheet([
    [
      t('Mã nhân viên', 'Employee ID'), t('Họ và tên', 'Full name'), t('Công ty', 'Company'),
      t('Lượt làm', 'Attempt'), t('Điểm', 'Score'), t('Tổng số câu', 'Questions'), 'LOOK', 'THINK', 'CONNECT',
      t('Thời lượng (giây)', 'Duration (seconds)'), t('Bắt đầu', 'Started'), t('Nộp bài', 'Submitted'),
      t('Hợp lệ xét giải', 'Award eligible'), t('Lý do', 'Reason'),
    ],
    ...rows.map((a) => [
      a.employee_code, a.full_name, a.department, a.attempt_number, a.score, a.selected_questions_json.length,
      a.score_by_stage?.LOOK, a.score_by_stage?.THINK, a.score_by_stage?.CONNECT, a.duration_seconds,
      date(a.started_at), date(a.submitted_at), a.is_valid_for_award ? t('Có', 'Yes') : t('Không', 'No'), a.invalid_reason ?? '',
    ]),
  ])
  results['!cols'] = [16, 32, 17, 10, 10, 13, 9, 9, 10, 20, 22, 22, 18, 48].map((wch) => ({ wch }))
  results['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 13, r: rows.length } }) }
  XLSX.utils.book_append_sheet(workbook, summary, t('Tổng hợp', 'Summary'))
  XLSX.utils.book_append_sheet(workbook, results, t('Kết quả', 'Results'))
  const code = campaign.campaign_code.replace(/[^A-Za-z0-9_-]+/g, '_')
  XLSX.writeFile(workbook, `MMV_Results_${code}.xlsx`)
}

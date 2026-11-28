import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { quizService } from '@/services/quizService'
import { exportQuizResults } from '@/services/exportQuizResults'
import { useI18n } from '@/lib/i18n'
import type { Campaign, EmployeeProgress, EmployeeRosterEntry, EmployeeVisit } from '@/types/quiz'

const pageSize = 40

async function readRoster(file: File): Promise<EmployeeRosterEntry[]> {
  const workbook = XLSX.read(await file.arrayBuffer())
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '', blankrows: false })
  const headers = ['STT', 'Mã nhân viên', 'Họ và tên', 'Mã công ty']
  const headerIndex = rows.findIndex((row) => headers.every((header) => row.some((value) => value.trim() === header)))
  if (headerIndex < 0) throw new Error('Cần đủ bốn cột STT, Mã nhân viên, Họ và tên, Mã công ty.')
  const columns = headers.map((header) => rows[headerIndex].findIndex((value) => value.trim() === header))
  const codes = new Set<string>()
  const entries = rows.slice(headerIndex + 1).map((row, index) => {
    const [number, code, name, company] = columns.map((column) => row[column]?.trim() ?? '')
    const employeeCode = code.toUpperCase()
    const sourceNumber = Number(number)
    if (!Number.isSafeInteger(sourceNumber) || sourceNumber <= 0 || !employeeCode || !name || !company) {
      throw new Error(`Dòng dữ liệu ${index + 1} thiếu hoặc sai thông tin.`)
    }
    if (codes.has(employeeCode)) throw new Error(`Trùng mã nhân viên ở dòng dữ liệu ${index + 1}.`)
    codes.add(employeeCode)
    return { source_number: sourceNumber, employee_code: employeeCode, full_name: name, company_code: company }
  })
  if (entries.length === 0) throw new Error('Tệp Excel chưa có nhân sự.')
  return entries
}

export function AdminParticipationTab({ campaigns, canImport }: { campaigns: Campaign[]; canImport: boolean }) {
  const { locale, t } = useI18n()
  const localeName = locale === 'en' ? 'en-GB' : 'vi-VN'
  const labels = { NotStarted: t('Chưa làm', 'Not started'), InProgress: t('Đang làm', 'In progress'), Completed: t('Hoàn thành', 'Completed') }
  const timeFormat = new Intl.DateTimeFormat(localeName, { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' })
  const dateText = (value: string | null) => value ? timeFormat.format(new Date(value)) : '—'
  const columns = [
    t('Mã NV', 'Employee ID'), t('Họ và tên', 'Full name'), t('Công ty', 'Company'), t('Vào lần đầu', 'First verified'),
    t('Trạng thái', 'Status'), t('Điểm gần nhất', 'Latest score'), t('Thời lượng', 'Duration'),
    t('Thử lại', 'Retries'), t('Nộp gần nhất', 'Last submitted'),
  ]
  const [selection, setSelection] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [entries, setEntries] = useState<EmployeeProgress[]>([])
  const [visits, setVisits] = useState<EmployeeVisit[]>([])
  const [moreVisits, setMoreVisits] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const campaignId = selection || campaigns.find((campaign) => campaign.status === 'Active')?.id || campaigns[0]?.id

  const downloadResults = async () => {
    const campaign = campaigns.find((item) => item.id === campaignId)
    if (!campaign || exporting) return
    setExporting(true)
    setError('')
    try {
      exportQuizResults(campaign, await quizService.getCampaignResults(campaign.id), locale)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Không thể xuất kết quả.', 'Could not export results.'))
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    if (!campaignId) return
    let current = true
    setLoading(true)
    setError('')
    setPage(0)
    Promise.all([quizService.getEmployeeProgress(campaignId), quizService.getEmployeeVisitLog(campaignId)])
      .then(([progress, log]) => {
        if (!current) return
        setEntries(progress)
        setVisits(log)
        setMoreVisits(log.length === 50)
      })
      .catch((err: Error) => { if (current) { setEntries([]); setVisits([]); setMoreVisits(false); setError(err.message) } })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [campaignId, refresh])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi')
    return entries.filter((entry) => (!status || entry.status === status) &&
      (!query || `${entry.employee_code} ${entry.full_name} ${entry.company_code}`.toLocaleLowerCase('vi').includes(query)))
  }, [entries, search, status])

  const totals = useMemo(() => {
    const counts = { entered: 0, NotStarted: 0, InProgress: 0, Completed: 0 }
    for (const entry of entries) {
      if (entry.first_verified_at) counts.entered += 1
      counts[entry.status] += 1
    }
    return counts
  }, [entries])

  const importRoster = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImporting(true)
    setError('')
    setNotice('')
    try {
      const count = await quizService.importEmployeeRoster(await readRoster(file))
      setNotice(`Đã lưu ${count.toLocaleString('vi-VN')} bản ghi vào danh sách nhân sự.`)
      setRefresh((value) => value + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nhập danh sách nhân sự.')
    } finally {
      setImporting(false)
    }
  }

  const loadOlderVisits = async () => {
    if (!campaignId || !visits.length) return
    setLoadingVisits(true)
    try {
      const log = await quizService.getEmployeeVisitLog(campaignId, visits[visits.length - 1])
      setVisits((previous) => [...previous, ...log])
      setMoreVisits(log.length === 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải nhật ký.')
    } finally {
      setLoadingVisits(false)
    }
  }

  if (!quizService.isUsingSupabase()) return <p>{t("Báo cáo nhân sự cần kết nối Supabase.", "Participation reporting requires a Supabase connection.")}</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-medium">
          {t("Chiến dịch", "Campaign")}
          <select className="h-10 rounded-md border bg-white px-3" value={campaignId || ''} disabled={loadingVisits}
            onChange={(event) => setSelection(event.target.value)}>
            {!campaigns.length && <option value="">{t("Chưa có chiến dịch", "No campaigns")}</option>}
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}
          </select>
        </label>
        <Button variant="outline" disabled={loading || loadingVisits || !campaignId} onClick={() => setRefresh((value) => value + 1)}>{t("Làm mới báo cáo", "Refresh report")}</Button>
        <Button disabled={!campaignId || exporting} onClick={downloadResults}>
          <Download className="mr-2 h-4 w-4" /> {exporting ? t('Đang xuất…', 'Exporting…') : t('Xuất kết quả Excel', 'Export results to Excel')}
        </Button>
        {canImport && (
          <label className="grid gap-1 text-sm font-medium">
            {t("Danh sách nhân sự Excel", "Employee roster spreadsheet")}
            <Input type="file" accept=".xlsx" disabled={importing} onChange={importRoster} />
          </label>
        )}
      </div>
      {importing && <p role="status">{t("Đang lưu danh sách nhân sự…", "Saving employee roster…")}</p>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert variant="success"><AlertDescription>{notice}</AlertDescription></Alert>}
      {campaignId && (loading ? <p role="status">{t("Đang tải báo cáo…", "Loading report…")}</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ['Danh sách nhân sự', entries.length], ['Đã vào', totals.entered],
              [labels.NotStarted, totals.NotStarted], [labels.InProgress, totals.InProgress], [labels.Completed, totals.Completed],
            ].map(([title, count]) => (
              <Card key={title}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
                <CardContent className="text-2xl font-extrabold">{count.toLocaleString(localeName)}</CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">{t("Tiến độ theo nhân viên", "Employee progress")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input className="max-w-sm" aria-label={t("Tìm nhân viên", "Find an employee")} placeholder={t("Tìm theo mã, họ tên hoặc công ty", "Search by ID, name or company")} value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(0) }} />
                <select aria-label={t("Trạng thái", "Status")} className="h-10 rounded-md border bg-white px-3" value={status}
                  onChange={(event) => { setStatus(event.target.value); setPage(0) }}>
                  <option value="">{t("Tất cả trạng thái", "All statuses")}</option>
                  {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <Table>
                <TableHeader><TableRow>
                  {columns.map((label) => <TableHead key={label}>{label}</TableHead>)}
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.slice(page * pageSize, (page + 1) * pageSize).map((entry) => (
                    <TableRow key={entry.employee_code}>
                      <TableCell className="font-mono">{entry.employee_code}</TableCell><TableCell>{entry.full_name}</TableCell>
                      <TableCell>{entry.company_code}</TableCell><TableCell>{dateText(entry.first_verified_at)}</TableCell>
                      <TableCell>{labels[entry.status]}</TableCell><TableCell>{entry.score === null ? '—' : `${entry.score}/${entry.total}`}</TableCell>
                      <TableCell>{entry.duration_seconds === null ? '—' : `${Math.floor(entry.duration_seconds / 60)}p ${entry.duration_seconds % 60}s`}</TableCell>
                      <TableCell>{entry.retries}</TableCell><TableCell>{dateText(entry.submitted_at)}</TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && <TableRow><TableCell colSpan={9}>{t("Không có bản ghi phù hợp.", "No matching records.")}</TableCell></TableRow>}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>{t("Trang trước", "Previous page")}</Button>
                <span>{page + 1} / {Math.max(1, Math.ceil(filtered.length / pageSize))}</span>
                <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage(page + 1)}>{t("Trang sau", "Next page")}</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{t("Nhật ký xác nhận mã nhân viên", "Employee verification log")}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>{t("Thời điểm", "Timestamp")}</TableHead><TableHead>{t("Mã NV", "Employee ID")}</TableHead><TableHead>{t("Họ và tên", "Full name")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {visits.map((visit) => <TableRow key={visit.id}>
                    <TableCell>{dateText(visit.verified_at)}</TableCell><TableCell>{visit.employee_code}</TableCell><TableCell>{visit.full_name}</TableCell>
                  </TableRow>)}
                  {!visits.length && <TableRow><TableCell colSpan={3}>{t("Chưa có lượt xác nhận.", "No verifications yet.")}</TableCell></TableRow>}
                </TableBody>
              </Table>
              {moreVisits && <Button className="mt-3" size="sm" variant="outline" disabled={loadingVisits} onClick={loadOlderVisits}>{t("Xem nhật ký cũ hơn", "Show earlier entries")}</Button>}
            </CardContent>
          </Card>
        </>
      ))}
    </div>
  )
}

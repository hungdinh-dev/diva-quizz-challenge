import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Check, Edit3, Eye, Plus, Upload } from 'lucide-react'
import { QuestionRenderer } from '@/components/quiz/QuestionRenderer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { quizService } from '@/services/quizService'
import type { QuestionItem, QuestionType, ReviewStatus, Stage } from '@/types/quiz'

interface AdminQuestionsTabProps {
  questions: QuestionItem[]
  actorEmail: string
  onRefresh: () => Promise<void>
}

export const AdminQuestionsTab: React.FC<AdminQuestionsTabProps> = ({
  questions,
  actorEmail,
  onRefresh,
}) => {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [editing, setEditing] = useState<QuestionItem | null>(null)
  const [previewSampleAns, setPreviewSampleAns] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (stageFilter !== 'ALL' && q.stage !== stageFilter) return false
      if (statusFilter !== 'ALL' && q.review_status !== statusFilter) return false
      if (
        search &&
        !q.question_code.toLowerCase().includes(search.toLowerCase()) &&
        !q.prompt_text.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [questions, stageFilter, statusFilter, search])

  const handleQuickApprove = async (q: QuestionItem) => {
    await quizService.saveQuestion({ ...q, review_status: 'Da_duyet' }, actorEmail)
    await onRefresh()
  }

  const handleSaveEditing = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await quizService.saveQuestion(editing, actorEmail)
      setEditing(null)
      await onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleNewQuestion = () => {
    setPreviewSampleAns([])
    setEditing({
      question_code: `NEW${questions.length + 1}`,
      source_set: 'Bo_Sung',
      stage: 'LOOK',
      concept: 'Nhận diện hình',
      question_type: 'SINGLE_CHOICE',
      prompt_text: '',
      options_json: [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
      ],
      correct_answer_json: { keys: ['A'] },
      explanation: '',
      shuffle_options: true,
      mascot_pose: 'pointing',
      review_status: 'Chua_duyet',
      reviewer_note: '',
    })
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const imported: QuestionItem[] = []
    for (const sheetName of wb.SheetNames) {
      if (!sheetName.startsWith('Bo ')) continue
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName])
      const sourceSet = sheetName.includes('Bo A') ? 'Bo_A' : 'Bo_B'
      for (const r of rows) {
        if (!r['Mã'] || !r['Câu hỏi']) continue
        const ansClean = String(r['Đáp án đúng'] || 'A').replace('*', '').trim()
        imported.push({
          question_code: String(r['Mã']).trim(),
          source_set: sourceSet,
          stage: (String(r['Chặng'] || 'LOOK').trim() as Stage),
          concept: String(r['Concept'] || 'Vision').trim(),
          question_type: 'SINGLE_CHOICE',
          prompt_text: String(r['Câu hỏi']).trim(),
          options_json: [
            { key: 'A', text: String(r['Đáp án A'] || '') },
            { key: 'B', text: String(r['Đáp án B'] || '') },
            { key: 'C', text: String(r['Đáp án C'] || '') },
          ],
          correct_answer_json: { keys: [ansClean] },
          explanation: String(r['Giải thích đáp án'] || ''),
          shuffle_options: true,
          mascot_pose: 'pointing',
          review_status: String(r['Đáp án đúng'] || '').includes('*') ? 'Can_chinh_sua' : 'Chua_duyet',
          reviewer_note: String(r['Gợi ý hình ảnh / Lưu ý'] || ''),
        })
      }
    }
    if (imported.length > 0) {
      await quizService.bulkImportQuestions(imported, actorEmail)
      await onRefresh()
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Ngân hàng Câu hỏi & Duyệt nội dung</h2>
          <p className="text-sm text-muted-foreground">
            Chỉ câu hỏi ở trạng thái <strong>Đã duyệt</strong> mới được phát cho nhân viên làm bài
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-xl border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
            <Upload className="mr-2 h-4 w-4" /> Import Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
          </label>
          <Button onClick={handleNewQuestion}>
            <Plus className="mr-1.5 h-4 w-4" /> Thêm câu hỏi
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Tìm theo mã câu (A01, B05...) hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Chặng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả chặng</SelectItem>
              <SelectItem value="LOOK">LOOK</SelectItem>
              <SelectItem value="THINK">THINK</SelectItem>
              <SelectItem value="CONNECT">CONNECT</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value="Da_duyet">Đã duyệt</SelectItem>
              <SelectItem value="Can_chinh_sua">Cần chỉnh sửa (*)</SelectItem>
              <SelectItem value="Chua_duyet">Chưa duyệt</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Danh sách câu hỏi ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Chặng / Kiểu</TableHead>
                <TableHead>Nội dung</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow key={q.question_code}>
                  <TableCell className="font-bold">
                    {q.question_code}
                    <div className="text-[11px] font-normal text-muted-foreground">{q.source_set}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{q.stage}</Badge>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{q.concept}</div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="line-clamp-2 font-medium">{q.prompt_text}</div>
                    {q.reviewer_note && (
                      <div className="text-xs text-amber-700 mt-0.5">Lưu ý: {q.reviewer_note}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        q.review_status === 'Da_duyet'
                          ? 'success'
                          : q.review_status === 'Can_chinh_sua'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {q.review_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                    {q.review_status !== 'Da_duyet' && (
                      <Button size="sm" variant="outline" onClick={() => handleQuickApprove(q)}>
                        <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Duyệt
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPreviewSampleAns([])
                        setEditing({ ...q })
                      }}
                    >
                      <Edit3 className="mr-1 h-3.5 w-3.5" /> Sửa / Xem
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit & Live Mobile Preview Dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa & Live Preview Câu hỏi ({editing?.question_code})</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Mã câu</Label>
                    <Input
                      value={editing.question_code}
                      onChange={(e) => setEditing({ ...editing, question_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Chặng</Label>
                    <Select
                      value={editing.stage}
                      onValueChange={(val: Stage) => setEditing({ ...editing, stage: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOOK">LOOK</SelectItem>
                        <SelectItem value="THINK">THINK</SelectItem>
                        <SelectItem value="CONNECT">CONNECT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Kiểu câu hỏi</Label>
                    <Select
                      value={editing.question_type}
                      onValueChange={(val: QuestionType) => setEditing({ ...editing, question_type: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE_CHOICE">SINGLE_CHOICE</SelectItem>
                        <SelectItem value="IMAGE_CHOICE">IMAGE_CHOICE</SelectItem>
                        <SelectItem value="MULTI_FILL_BLANK">MULTI_FILL_BLANK</SelectItem>
                        <SelectItem value="TRUE_FALSE">TRUE_FALSE</SelectItem>
                        <SelectItem value="SPOT_DIFFERENCE">SPOT_DIFFERENCE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Trạng thái duyệt</Label>
                    <Select
                      value={editing.review_status}
                      onValueChange={(val: ReviewStatus) => setEditing({ ...editing, review_status: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chua_duyet">Chua_duyet</SelectItem>
                        <SelectItem value="Can_chinh_sua">Can_chinh_sua</SelectItem>
                        <SelectItem value="Da_duyet">Da_duyet</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Nội dung câu hỏi</Label>
                  <Textarea
                    rows={3}
                    value={editing.prompt_text}
                    onChange={(e) => setEditing({ ...editing, prompt_text: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Các phương án trả lời</Label>
                  {editing.options_json.map((opt, idx) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <Badge className="w-8 justify-center">{opt.key}</Badge>
                      <Input
                        value={opt.text}
                        onChange={(e) => {
                          const next = [...editing.options_json]
                          next[idx] = { ...opt, text: e.target.value }
                          setEditing({ ...editing, options_json: next })
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Đáp án đúng (VD: A hoặc A,B,D)</Label>
                    <Input
                      value={editing.correct_answer_json.keys.join(',')}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          correct_answer_json: {
                            keys: e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={editing.shuffle_options}
                      onCheckedChange={(checked) => setEditing({ ...editing, shuffle_options: checked })}
                    />
                    <Label>Trộn thứ tự đáp án</Label>
                  </div>
                </div>

                <div>
                  <Label>Giải thích đáp án</Label>
                  <Textarea
                    rows={2}
                    value={editing.explanation}
                    onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                  />
                </div>
              </div>

              {/* Live Mobile Preview */}
              <div className="rounded-2xl border-2 border-diva-ink bg-diva-parchment p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-diva-red">
                  <Eye className="h-3.5 w-3.5" /> Live Preview giao diện người chơi
                </div>
                <QuestionRenderer
                  question={editing}
                  selectedKeys={previewSampleAns}
                  onSelect={setPreviewSampleAns}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button disabled={saving} onClick={handleSaveEditing}>
              {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

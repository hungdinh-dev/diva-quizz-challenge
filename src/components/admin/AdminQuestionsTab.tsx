import { useI18n } from '@/lib/i18n'
import React, { useMemo, useState } from 'react'
import { Check, Edit3, Eye } from 'lucide-react'
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
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [editing, setEditing] = useState<QuestionItem | null>(null)
  const [previewSampleAns, setPreviewSampleAns] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (!/^V2035-(0[1-9]|1[0-5])$/.test(q.question_code)) return false
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("Ngân hàng Câu hỏi & Duyệt nội dung", "Question bank & review")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Chỉ câu hỏi ở trạng thái", "Only questions marked")} <strong>{t("Đã duyệt", "Approved")}</strong> {t("mới được phát cho nhân viên làm bài", "are available to employees")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t("Tìm theo mã câu hoặc nội dung…", "Search by question code or text…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder={t("Chặng", "Stage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("Tất cả chặng", "All stages")}</SelectItem>
              <SelectItem value="LOOK">LOOK</SelectItem>
              <SelectItem value="THINK">THINK</SelectItem>
              <SelectItem value="CONNECT">CONNECT</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder={t("Trạng thái", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("Tất cả trạng thái", "All statuses")}</SelectItem>
              <SelectItem value="Da_duyet">{t("Đã duyệt", "Approved")}</SelectItem>
              <SelectItem value="Can_chinh_sua">{t("Cần chỉnh sửa (*)", "Needs changes (*)")}</SelectItem>
              <SelectItem value="Chua_duyet">{t("Chưa duyệt", "Pending review")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Danh sách câu hỏi (", "Questions (")}{filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Mã", "Code")}</TableHead>
                <TableHead>{t("Chặng / Kiểu", "Stage / type")}</TableHead>
                <TableHead>{t("Nội dung", "Question")}</TableHead>
                <TableHead>{t("Trạng thái", "Status")}</TableHead>
                <TableHead className="text-right">{t("Thao tác", "Actions")}</TableHead>
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
                      <div className="text-xs text-amber-700 mt-0.5">{t("Lưu ý:", "Note:")} {q.reviewer_note}</div>
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
                        <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" /> {t("Duyệt", "Approve")}
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
                      <Edit3 className="mr-1 h-3.5 w-3.5" /> {t("Sửa / Xem", "Edit / view")}
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
            <DialogTitle>{t("Chỉnh sửa & Live Preview Câu hỏi (", "Edit & preview question (")}{editing?.question_code})</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>{t("Mã câu", "Question code")}</Label>
                    <Input
                      value={editing.question_code}
                      onChange={(e) => setEditing({ ...editing, question_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("Chặng", "Stage")}</Label>
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
                    <Label>{t("Kiểu câu hỏi", "Question type")}</Label>
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
                        <SelectItem value="ACTION_BUILDER">ACTION_BUILDER</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("Trạng thái duyệt", "Review status")}</Label>
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
                  <Label>{t("Nội dung câu hỏi", "Question text")}</Label>
                  <Textarea
                    rows={3}
                    value={editing.prompt_text}
                    onChange={(e) => setEditing({ ...editing, prompt_text: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("Các phương án trả lời", "Answer choices")}</Label>
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
                    <Label>{t("Đáp án đúng (VD: A hoặc A,B,D)", "Correct keys (e.g. A or A,B,D)")}</Label>
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
                    <Label>{t("Trộn thứ tự đáp án", "Shuffle choices")}</Label>
                  </div>
                </div>

                <div>
                  <Label>{t("Giải thích đáp án", "Answer explanation")}</Label>
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
                  <Eye className="h-3.5 w-3.5" /> {t("Live Preview giao diện người chơi", "Player preview")}
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
              {t("Hủy", "Cancel")}
            </Button>
            <Button disabled={saving} onClick={handleSaveEditing}>
              {saving ? t("Đang lưu...", "Saving…") : t("Lưu câu hỏi", "Save question")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

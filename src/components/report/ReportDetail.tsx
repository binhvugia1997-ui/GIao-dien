import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Image as ImageIcon,
  Info,
  Images,
  ListChecks,
} from 'lucide-react'
import { Button, Card, KeyValue, Modal, StatusChip } from '../ui'
import { REVEAL_DONE, useStore } from '../../state/store'
import { STAGE_LABELS, type Report } from '../../types'
import { cn } from '../../lib/utils'

type DialogKind = 'qpn' | 'causes' | 'counter' | 'after' | null

export function ReportDetail() {
  const s = useStore()
  const r = s.activeReport
  const [dialog, setDialog] = useState<DialogKind>(null)

  if (!r) {
    return (
      <Card title="Thông tin báo cáo" className="min-h-[220px]">
        <p className="text-base2 text-muted">Chọn một báo cáo trong danh sách để xem chi tiết.</p>
      </Card>
    )
  }

  const reveal = s.reveal[r.id] ?? (['completed', 'needs_review', 'error', 'skipped'].includes(r.status) ? REVEAL_DONE : 0)
  const causes = r.results.causes.slice(0, reveal >= 1 ? undefined : 0)
  const qpn = reveal >= 2 ? r.results.qpn : undefined
  const counter = r.results.countermeasures.slice(0, reveal >= 3 ? undefined : 0)
  const after = r.results.afterImages.slice(0, reveal >= 3 ? undefined : 0)
  const excelReady = reveal >= 4 && (r.excelRow !== undefined || r.excelPath !== undefined)
  const isProcessing = r.status === 'processing'

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Card
        title="Thông tin báo cáo"
        actions={isProcessing ? <span className="text-xs2 font-medium text-brand-700">{STAGE_LABELS[s.run.stage]}…</span> : null}
      >
        <KeyValue label="Tên file">
          <span className="font-medium">{r.fileName}</span>
        </KeyValue>
        <KeyValue label="Đường dẫn">
          <span className="font-mono text-xs2">{r.path}</span>
        </KeyValue>
        <KeyValue label="Management Number">
          <span className="font-semibold">{r.managementNumber}</span>
        </KeyValue>
        <KeyValue label="Số slide">{r.slides || '—'}</KeyValue>
        <KeyValue label="Trạng thái">
          <StatusChip status={r.status} />
        </KeyValue>
        <KeyValue label="Thời gian xử lý">
          {r.processedAt ? (
            <span>
              {r.processedAt} <span className="text-muted">({r.durationText})</span>
            </span>
          ) : (
            <span className="text-muted">Chưa xử lý</span>
          )}
        </KeyValue>
        <KeyValue label="Ngày phát sinh">
          <span className="text-muted">{r.occurrenceDate} — đọc từ Management Number</span>
        </KeyValue>

        <div
          className={cn(
            'mt-1.5 rounded-sm2 border px-2 py-1.5 text-base2',
            r.warning ? 'border-warn-500/25 bg-warn-50 text-warn-600' : 'border-lineSoft bg-[#fafcfe] text-muted',
          )}
        >
          <div className="mb-0.5 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Cảnh báo
          </div>
          {r.warning ?? 'Không có cảnh báo cho báo cáo này.'}
        </div>

        <p className="mt-1.5 flex gap-1.5 text-xs2 leading-[16px] text-muted">
          <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-brand-500" />
          Vendor name và Ngày phát sinh để người dùng điền tay trong file kết quả; chương trình không tự điền.
        </p>
      </Card>

      <Card title="Kết quả trích xuất">
        <div className="flex flex-col divide-y divide-lineSoft">
          {/* QPN */}
          <div className="flex items-start gap-2.5 py-2">
            <span className="flex h-[46px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-sm2 border border-line bg-[#f4f7fb]">
              {qpn ? (
                <img src={qpn.src} alt="Ảnh QPN" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base2 font-medium text-header">Ảnh QPN</span>
              <span className="block text-xs2 text-muted">
                {qpn ? `Ảnh gốc từ report nguồn — slide ${qpn.slide}` : 'Chưa trích xuất'}
              </span>
            </span>
            <Button
              className="self-center"
              icon={<Eye className="h-3.5 w-3.5" />}
              disabled={!qpn}
              onClick={() => setDialog('qpn')}
            >
              Xem ảnh lớn
            </Button>
          </div>

          {/* Nguyên nhân */}
          <div className="flex items-center gap-2.5 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm2 border border-line bg-[#f4f7fb] text-brand-600">
              <ListChecks className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base2 font-medium text-header">Nguyên nhân</span>
              <span className="block text-xs2 text-muted">
                {causes.length ? `${causes.length} mục — giữ nguyên văn` : 'Chưa trích xuất'}
              </span>
            </span>
            <Button
              icon={<Eye className="h-3.5 w-3.5" />}
              disabled={!causes.length}
              onClick={() => setDialog('causes')}
            >
              Xem đầy đủ
            </Button>
          </div>

          {/* Đối sách cải tiến */}
          <div className="flex items-center gap-2.5 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm2 border border-line bg-[#f4f7fb] text-brand-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base2 font-medium text-header">Nội dung đối sách cải tiến</span>
              <span className="block text-xs2 text-muted">
                {counter.length
                  ? `${counter.length} mục — sao chép đầy đủ, đã loại phần “Xử lý tạm thời”`
                  : 'Chưa trích xuất'}
              </span>
            </span>
            <Button
              icon={<Eye className="h-3.5 w-3.5" />}
              disabled={!counter.length}
              onClick={() => setDialog('counter')}
            >
              Xem đầy đủ
            </Button>
          </div>

          {/* Ảnh sau cải tiến */}
          <div className="flex items-center gap-2.5 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm2 border border-line bg-[#f4f7fb] text-brand-600">
              <Images className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base2 font-medium text-header">Ảnh Sau cải tiến</span>
              <span className="block text-xs2 text-muted">
                {after.length ? `${after.length} ảnh — phần cải tiến trong sản xuất` : 'Chưa trích xuất'}
              </span>
            </span>
            <Button
              icon={<Eye className="h-3.5 w-3.5" />}
              disabled={!after.length}
              onClick={() => setDialog('after')}
            >
              Xem chi tiết
            </Button>
          </div>

          {/* Excel */}
          <div className="flex items-start gap-2.5 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm2 border border-line bg-[#f4f7fb] text-brand-600">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base2 font-medium text-header">Kết quả Excel</span>
              <span className="block break-all font-mono text-xs2 text-muted">
                {excelReady ? (r.excelPath ?? s.output) : 'Chưa ghi vào file kết quả'}
              </span>
              {excelReady && <span className="block text-xs2 text-muted">Dòng {r.excelRow ?? '—'} trong sheet “Kiểm chứng”</span>}
            </span>
            {excelReady && (
              <Button className="self-center" disabled={s.locked} onClick={s.openOutputFile}>
                Mở file kết quả
              </Button>
            )}
          </div>
        </div>
      </Card>

      <QpnDialog open={dialog === 'qpn'} onClose={() => setDialog(null)} report={r} />
      <TextDialog
        open={dialog === 'causes'}
        onClose={() => setDialog(null)}
        title="Nguyên nhân (nguyên văn)"
        subtitle={`${r.fileName} · Management Number ${r.managementNumber}`}
        items={r.results.causes}
        note="Nội dung được sao chép nguyên văn từ report nguồn, không tóm tắt và không viết lại."
      />
      <TextDialog
        open={dialog === 'counter'}
        onClose={() => setDialog(null)}
        title="Nội dung đối sách cải tiến (sao chép đầy đủ)"
        subtitle={`${r.fileName} · Management Number ${r.managementNumber}`}
        items={r.results.countermeasures}
        note="Sao chép đầy đủ nội dung đối sách cải tiến và loại bỏ phần “Xử lý tạm thời”."
      />
      <AfterImagesDialog open={dialog === 'after'} onClose={() => setDialog(null)} report={r} />
    </div>
  )
}

/* ------------------------------------------------------------------ hộp thoại */

function QpnDialog({ open, onClose, report }: { open: boolean; onClose: () => void; report: Report }) {
  const qpn = report.results.qpn
  return (
    <Modal
      open={open}
      title="Ảnh QPN"
      subtitle={qpn ? `${report.fileName} · slide ${qpn.slide}` : ''}
      onClose={onClose}
      width="max-w-5xl"
      footer={
        <>
          <span className="mr-auto text-xs2 text-muted">
            Ảnh QPN được lấy trực tiếp từ report nguồn (ảnh gốc trong PPTX), không dựng lại và không qua xử lý khác.
          </span>
          <Button variant="primary" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      {qpn && (
        <>
          <div className="overflow-hidden rounded-sm2 border border-line bg-[#f4f7fb]">
            <img src={qpn.src} alt="Ảnh QPN" className="mx-auto block max-h-[70vh] w-auto" />
          </div>
          <p className="mt-2 text-xs2 text-muted">{qpn.caption}</p>
        </>
      )}
    </Modal>
  )
}

function TextDialog({
  open,
  onClose,
  title,
  subtitle,
  items,
  note,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  items: string[]
  note: string
}) {
  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <span className="mr-auto text-xs2 text-muted">{note}</span>
          <Button variant="primary" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      <ol className="flex flex-col gap-2">
        {items.map((text, i) => (
          <li key={i} className="flex gap-2 rounded-sm2 border border-lineSoft bg-[#fafcfe] px-2.5 py-2">
            <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs2 font-semibold text-white">
              {i + 1}
            </span>
            <p className="whitespace-pre-line text-base2 leading-[20px] text-body">{text}</p>
          </li>
        ))}
      </ol>
    </Modal>
  )
}

function AfterImagesDialog({ open, onClose, report }: { open: boolean; onClose: () => void; report: Report }) {
  const images = report.results.afterImages
  const [current, setCurrent] = useState(0)
  const img = images[Math.min(current, Math.max(0, images.length - 1))]

  return (
    <Modal
      open={open}
      title="Ảnh Sau cải tiến"
      subtitle={`${report.fileName} · ${images.length} ảnh lấy từ phần CẢI TIẾN TRONG SẢN XUẤT`}
      onClose={onClose}
      width="max-w-5xl"
      footer={
        <>
          <span className="mr-auto text-xs2 text-muted">
            Chỉ lấy ảnh “Sau cải tiến” thuộc phần cải tiến sản xuất; ảnh “Trước cải tiến” và ảnh ngoài phần này không đưa
            vào file kết quả.
          </span>
          <Button variant="primary" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_170px]">
        <div>
          <div className="overflow-hidden rounded-sm2 border border-line bg-[#f4f7fb]">
            {img && <img src={img.src} alt={img.caption} className="mx-auto block max-h-[62vh] w-auto" />}
          </div>
          {img && (
            <p className="mt-2 text-base2 text-body">
              Slide {img.slide} — <span className="text-muted">{img.caption}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {images.map((image, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={cn(
                'overflow-hidden rounded-sm2 border bg-white p-0.5 text-left',
                i === current ? 'border-brand-500 ring-1 ring-brand-400' : 'border-line hover:border-brand-200',
              )}
            >
              <img src={image.src} alt={image.caption} className="h-[62px] w-full rounded-[2px] object-cover" />
              <span className="block px-1 pb-0.5 pt-1 text-xxs text-muted">Slide {image.slide}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

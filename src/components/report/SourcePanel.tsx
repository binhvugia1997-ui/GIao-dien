import { Info, RefreshCw, Search } from 'lucide-react'
import { Button, Card, Radio, TextInput } from '../ui'
import { PathPicker } from '../PathPicker'
import { FOLDER_CHOICES, OUTPUT_CHOICES, TEMPLATE_CHOICES } from '../../data/mock'
import { useStore } from '../../state/store'
import { useState } from 'react'

type PickerKind = 'folder' | 'template' | 'output' | null

export function SourcePanel() {
  const s = useStore()
  const [picker, setPicker] = useState<PickerKind>(null)
  const disabled = s.locked

  return (
    <Card
      title="Nguồn dữ liệu"
      actions={
        <span className="text-xs2 text-muted">
          {disabled ? 'Đang xử lý — không thể thay đổi nguồn dữ liệu' : 'Thao tác chọn thư mục/file chỉ là mô phỏng'}
        </span>
      }
    >
      <div className="flex flex-col gap-1.5">
        {/* Thư mục báo cáo PPTX */}
        <div className="flex items-center gap-2">
          <label className="w-[132px] shrink-0 text-base2 text-body">Thư mục báo cáo PPTX</label>
          <TextInput
            value={s.folder}
            disabled={disabled}
            placeholder="D:\\Reports"
            onChange={(e) => s.setFolder(e.target.value)}
          />
          <Button disabled={disabled} onClick={() => setPicker('folder')}>
            Chọn…
          </Button>
          <Button variant="primary" disabled={disabled} icon={<Search className="h-3.5 w-3.5" />} onClick={s.scan}>
            Quét
          </Button>
        </div>
        <div className="pl-[136px] text-xs2 text-muted">{s.scanned ? s.scanMessage : 'Chưa quét thư mục.'}</div>

        {/* File kiểm chứng + File kết quả */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 lg:grid-cols-2">
          <div className="flex items-center gap-2">
            <label className="w-[132px] shrink-0 text-base2 text-body">File kiểm chứng Excel</label>
            <TextInput
              value={s.template}
              disabled={disabled}
              placeholder="D:\\Reports\\Kiem_chung_mau.xlsx"
              onChange={(e) => s.setTemplate(e.target.value)}
            />
            <Button disabled={disabled} onClick={() => setPicker('template')}>
              Chọn…
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-[132px] shrink-0 text-base2 text-body">File kết quả</label>
            <TextInput
              value={s.output}
              disabled={disabled}
              placeholder="D:\\Reports\\Output\\Kiem_chung_Ket_qua.xlsx"
              onChange={(e) => s.setOutput(e.target.value)}
            />
            <Button disabled={disabled} onClick={() => setPicker('output')}>
              Chọn…
            </Button>
          </div>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-lineSoft pt-1.5">
          <span className="inline-flex items-center gap-1 text-xs2 text-muted">
            <Info className="h-3.5 w-3.5 text-brand-500" />
            Không ghi đè file kiểm chứng gốc
          </span>

          <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-base2 text-body">Bộ lọc thời gian</span>
            <Radio
              name="period"
              checked={s.periodMode === 'all'}
              onChange={() => s.setPeriodMode('all')}
              label="Tất cả"
              disabled={disabled}
            />
            <Radio
              name="period"
              checked={s.periodMode === 'month'}
              onChange={() => s.setPeriodMode('month')}
              label="Tháng/Năm"
              disabled={disabled}
            />
            {s.periodMode === 'month' && (
              <span className="flex items-center gap-1">
                <TextInput
                  className="w-[46px] text-center"
                  value={s.month}
                  disabled={disabled}
                  onChange={(e) => s.setMonth(e.target.value)}
                />
                <span className="text-muted">/</span>
                <TextInput
                  className="w-[62px] text-center"
                  value={s.year}
                  disabled={disabled}
                  onChange={(e) => s.setYear(e.target.value)}
                />
              </span>
            )}
            <Radio
              name="period"
              checked={s.periodMode === 'range'}
              onChange={() => s.setPeriodMode('range')}
              label="Khoảng ngày"
              disabled={disabled}
            />
            {s.periodMode === 'range' && (
              <span className="flex items-center gap-1">
                <TextInput
                  className="w-[92px] text-center"
                  value={s.fromDate}
                  disabled={disabled}
                  onChange={(e) => s.setFromDate(e.target.value)}
                />
                <span className="text-muted">→</span>
                <TextInput
                  className="w-[92px] text-center"
                  value={s.toDate}
                  disabled={disabled}
                  onChange={(e) => s.setToDate(e.target.value)}
                />
                <span className="text-xs2 text-muted">dd/mm/yyyy, bao gồm cả hai đầu</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs2 text-muted">
              <RefreshCw className="h-3 w-3" />
              Lọc theo ngày phát sinh đọc từ Management Number, trước khi mở PPTX
            </span>
          </span>
        </div>
      </div>

      <PathPicker
        open={picker === 'folder'}
        title="Chọn thư mục báo cáo PPTX"
        kind="folder"
        choices={FOLDER_CHOICES}
        onClose={() => setPicker(null)}
        onPick={(p) => s.setFolder(p)}
      />
      <PathPicker
        open={picker === 'template'}
        title="Chọn file kiểm chứng Excel"
        kind="file"
        choices={TEMPLATE_CHOICES}
        onClose={() => setPicker(null)}
        onPick={(p) => s.setTemplate(p)}
      />
      <PathPicker
        open={picker === 'output'}
        title="Chọn file kết quả"
        kind="file"
        choices={OUTPUT_CHOICES}
        onClose={() => setPicker(null)}
        onPick={(p) => s.setOutput(p)}
      />
    </Card>
  )
}

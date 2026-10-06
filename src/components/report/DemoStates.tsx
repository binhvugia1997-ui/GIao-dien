import { FlaskConical } from 'lucide-react'
import { Button, Card } from '../ui'
import { useStore } from '../../state/store'

const STATES: { key: Parameters<ReturnType<typeof useStore>['demo']>[0]; label: string }[] = [
  { key: 'empty', label: 'Chưa có dữ liệu' },
  { key: 'ready', label: 'Sẵn sàng' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'stopping', label: 'Đang chờ dừng' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'needs_review', label: 'Cần kiểm tra' },
  { key: 'error', label: 'Lỗi' },
  { key: 'skipped', label: 'Bỏ qua' },
]

/** Chỉ có trong bản mẫu: chuyển nhanh giữa các trạng thái để kiểm tra giao diện. */
export function DemoStates() {
  const s = useStore()
  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5 text-brand-500" />
          Mô phỏng trạng thái
        </span>
      }
      actions={
        <span className="text-xs2 text-muted">
          Chỉ dùng cho bản mẫu — ứng dụng thật chuyển trạng thái theo tiến trình xử lý.
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {STATES.map(({ key, label }) => (
          <Button key={key} className="h-[26px]" onClick={() => s.demo(key)}>
            {label}
          </Button>
        ))}
        <span className="ml-1 text-xs2 text-muted">
          Trạng thái hiện tại: <span className="font-medium text-body">{s.run.status}</span>
          {s.run.status === 'processing' && ' · đang xử lý'}
          {s.run.status === 'stopping' && ' · sẽ dừng sau báo cáo hiện tại'}
          {s.run.status === 'done' && ' · đã kết thúc lượt xử lý'}
          {s.run.status === 'idle' && ' · chưa chạy'}
        </span>
      </div>
    </Card>
  )
}

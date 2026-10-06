import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  APP_TITLE,
  DEFAULT_FOLDER,
  DEFAULT_OUTPUT,
  DEFAULT_TEMPLATE,
  DIAGNOSTIC_RESULT,
  DISCOVERED_SERVERS,
  FALLBACK_NOTICE,
  INITIAL_LOG,
  LEARNING_COUNTS,
  LEARNING_MODEL_STATUS,
  MODEL_CHOICES,
  REPORTS,
  RUN_OUTCOME,
  UPDATE_PATH_DEFAULT,
  CONTENT_CANDIDATES,
  IMAGE_CANDIDATES,
} from '../data/mock'
import { formatClock, formatStamp } from '../lib/utils'
import {
  BUCKET_OF,
  STAGE_LABELS,
  STAGE_ORDER,
  STAGE_WEIGHTS,
  type ContentCandidate,
  type DiagnosticRow,
  type DiscoveredServer,
  type ImageCandidate,
  type LogEntry,
  type OllamaConnection,
  type ProcessingRun,
  type Report,
  type StageKey,
  type StatusKey,
  type TabKey,
} from '../types'

export const FILTERS = [
  'Tất cả file đã quét',
  'File cần xử lý',
  'File đã xử lý',
  'File cần kiểm tra',
  'File lỗi',
  'File bị bỏ qua',
  'File đã loại thủ công',
] as const

export type FilterKey = (typeof FILTERS)[number]

export type PeriodMode = 'all' | 'month' | 'range'

export type UpdateState = {
  path: string
  autoCheck: boolean
  status: 'idle' | 'checking' | 'available' | 'latest' | 'error' | 'installing' | 'installed'
  message: string
  available?: { version: string; build: string; package: string; size: string }
  progress: number
  progressStage: string
}

export type LearningState = {
  images: ImageCandidate[]
  contents: ContentCandidate[]
  counts: typeof LEARNING_COUNTS
  modelStatus: typeof LEARNING_MODEL_STATUS
  excelPending: number
  excelLastResult: { kind: 'ok' | 'locked' | 'none'; message: string }
}

type StoreValue = ReturnType<typeof useStoreValue>

const StoreContext = createContext<StoreValue | null>(null)

const IDLE_RUN: ProcessingRun = {
  status: 'idle',
  queue: [],
  index: 0,
  doneCount: 0,
  stage: 'waiting',
  percent: 0,
  currentFile: '',
  elapsedSec: 0,
  remainSec: null,
  startedAt: null,
  finishedAt: null,
  hasSamples: false,
}

/** Thời lượng mô phỏng mỗi giai đoạn (ms) — chỉ dùng cho bản mẫu. */
const STAGE_MS: Record<StageKey, number> = {
  waiting: 0,
  reading: 700,
  analyzing: 1700,
  analyzing_heuristic: 900,
  extracting: 1400,
  extracting_qpn: 800,
  extracting_images: 1100,
  writing_excel: 900,
}

/** Mức "hé lộ" kết quả trích xuất theo giai đoạn đạt được. */
const REVEAL: Record<StageKey, number> = {
  waiting: 0,
  reading: 0,
  analyzing: 0,
  analyzing_heuristic: 0,
  extracting: 1,
  extracting_qpn: 2,
  extracting_images: 3,
  writing_excel: 4,
}

export const REVEAL_DONE = 5

function useStoreValue() {
  const [tab, setTab] = useState<TabKey>('reports')

  /* ------------------------------------------------------------------ danh sách báo cáo */
  const [reports, setReports] = useState<Report[]>(REPORTS)
  const [excludedFrom, setExcludedFrom] = useState<Record<string, StatusKey>>({})
  const [scanned, setScanned] = useState(true)
  const [scanMessage, setScanMessage] = useState('10 file trong thư mục · 8 file cần xử lý')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string>('r1')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('Tất cả file đã quét')

  /* ------------------------------------------------------------------ nguồn dữ liệu */
  const [folder, setFolder] = useState(DEFAULT_FOLDER)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [output, setOutput] = useState(DEFAULT_OUTPUT)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all')
  const [month, setMonth] = useState('9')
  const [year, setYear] = useState('2026')
  const [fromDate, setFromDate] = useState('01/09/2026')
  const [toDate, setToDate] = useState('30/09/2026')

  /* ------------------------------------------------------------------ tuỳ chọn + xử lý */
  const [force, setForce] = useState(false)
  const [run, setRun] = useState<ProcessingRun>(IDLE_RUN)
  const [reveal, setReveal] = useState<Record<string, number>>({})
  const [log, setLog] = useState<LogEntry[]>(INITIAL_LOG)
  const [logCollapsed, setLogCollapsed] = useState(false)

  /* ------------------------------------------------------------------ Ollama */
  const [ollama, setOllama] = useState<OllamaConnection>({
    server: '127.0.0.1',
    port: '11434',
    model: 'qwen3:4b',
    checked: 'unchecked',
    models: MODEL_CHOICES,
    message: 'Chưa kiểm tra kết nối.',
  })
  const [discovering, setDiscovering] = useState(false)
  const [discoveryMessage, setDiscoveryMessage] = useState(
    'Chỉ quét cổng 11434 trong mạng LAN nội bộ khi bạn bấm nút; không tự động đổi server.',
  )
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveredServer[]>([])
  const [appliedServer, setAppliedServer] = useState<string | null>(null)

  /* ------------------------------------------------------------------ cập nhật */
  const [update, setUpdate] = useState<UpdateState>({
    path: UPDATE_PATH_DEFAULT,
    autoCheck: true,
    status: 'idle',
    message: 'Chưa kiểm tra. Thư mục cập nhật có thể là ổ đĩa cục bộ hoặc thư mục mạng (LAN).',
    progress: 0,
    progressStage: '',
  })

  /* ------------------------------------------------------------------ chẩn đoán */
  const [diagRows, setDiagRows] = useState<DiagnosticRow[]>([])
  const [diagRunning, setDiagRunning] = useState(false)

  /* ------------------------------------------------------------------ học cải tiến */
  const [learning, setLearning] = useState<LearningState>({
    images: IMAGE_CANDIDATES,
    contents: CONTENT_CANDIDATES,
    counts: LEARNING_COUNTS,
    modelStatus: LEARNING_MODEL_STATUS,
    excelPending: 0,
    excelLastResult: { kind: 'none', message: '' },
  })
  const [imageReviewIndex, setImageReviewIndex] = useState(0)
  const [contentReviewIndex, setContentReviewIndex] = useState(0)
  const [training, setTraining] = useState(false)

  const startProcessingRef = useRef<(() => void) | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const timers = useRef<number[]>([])
  const registerTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
  }, [])
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const pushLog = useCallback((level: LogEntry['level'], text: string) => {
    setLog((prev) => [...prev, { time: formatClock(new Date()), level, text }].slice(-500))
  }, [])

  /* ------------------------------------------------------------------ dẫn xuất */
  const running = run.status === 'processing' || run.status === 'stopping'
  const locked = running
  const activeReport = reports.find((r) => r.id === activeId) ?? null

  const stats = useMemo(() => {
    const b = { completed: 0, needs_review: 0, error: 0, skipped: 0 }
    reports.forEach((r) => {
      const bucket = BUCKET_OF[r.status]
      if (bucket !== 'other') b[bucket] += 1
    })
    return { ...b, total: reports.length }
  }, [reports])

  const queue = useMemo(
    () => reports.filter((r) => r.status === 'waiting' || r.status === 'new_row').map((r) => r.id),
    [reports],
  )

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const hay = `${r.managementNumber} ${r.fileName} ${r.path}`
      if (search.trim() && !hay.toLowerCase().includes(search.trim().toLowerCase())) return false
      switch (filter) {
        case 'File cần xử lý':
          return r.status === 'waiting' || r.status === 'new_row' || r.status === 'processing'
        case 'File đã xử lý':
          return r.status === 'completed'
        case 'File cần kiểm tra':
          return r.status === 'needs_review'
        case 'File lỗi':
          return r.status === 'error'
        case 'File bị bỏ qua':
          return r.status === 'skipped' || r.status === 'outside_period' || r.status === 'source_duplicate' || r.status === 'fast_skip'
        case 'File đã loại thủ công':
          return r.status === 'excluded'
        default:
          return true
      }
    })
  }, [reports, search, filter])

  const aiMode: 'model' | 'heuristic' = ollama.checked === 'ok' ? 'model' : 'heuristic'

  const ollamaIndicator = useMemo(() => {
    if (ollama.checked === 'ok') return { text: `Ollama: ${ollama.model} — Sẵn sàng`, tone: 'ok' as const }
    if (ollama.checked === 'fail')
      return { text: `Ollama: ${ollama.model} — Không kết nối (heuristic fallback)`, tone: 'warn' as const }
    return { text: `Ollama: ${ollama.model} — Chưa kiểm tra`, tone: 'muted' as const }
  }, [ollama])

  const aiStatusText = useMemo(() => {
    if (ollama.checked === 'ok') return `Đang dùng mô hình ${ollama.model} để xác định vị trí nội dung.`
    return `Không dùng AI${ollama.checked === 'fail' ? ' (không kết nối được Ollama)' : ''} — phân tích bằng từ khoá. ${FALLBACK_NOTICE}`
  }, [ollama])

  /* ------------------------------------------------------------------ thao tác danh sách */
  const scan = useCallback(() => {
    if (locked) return
    if (!folder.trim()) {
      setReports([])
      setScanned(true)
      setScanMessage('Chưa chọn thư mục báo cáo.')
      setActiveId('')
      setSelectedIds([])
      pushLog('WARN', 'Chưa chọn thư mục báo cáo — danh sách trống.')
      return
    }
    setReports(REPORTS)
    setScanned(true)
    setScanMessage('10 file trong thư mục · 8 file cần xử lý')
    setActiveId((prev) => (REPORTS.some((r) => r.id === prev) ? prev : REPORTS[0].id))
    setSelectedIds([])
    pushLog('INFO', `Quét lại thư mục: ${folder} — tìm thấy ${REPORTS.length} file .pptx`)
  }, [folder, locked, pushLog])

  const excludeSelected = useCallback(() => {
    if (locked) return
    const ids = selectedIds.length ? selectedIds : activeReport ? [activeReport.id] : []
    if (!ids.length) return
    setReports((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: 'excluded' as StatusKey, shortResult: 'Loại khỏi danh sách xử lý — không xóa file nguồn' } : r)),
    )
    setExcludedFrom((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        const rep = reports.find((r) => r.id === id)
        if (rep && rep.status !== 'excluded') next[id] = rep.status
      })
      return next
    })
    pushLog('INFO', `Đã loại ${ids.length} báo cáo khỏi danh sách xử lý (không xóa file nguồn).`)
    setSelectedIds([])
  }, [activeReport, locked, pushLog, reports, selectedIds])

  const restoreSelected = useCallback(() => {
    if (locked) return
    const ids = selectedIds.length ? selectedIds : activeReport && activeReport.status === 'excluded' ? [activeReport.id] : []
    if (!ids.length) return
    setReports((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, status: excludedFrom[r.id] ?? 'waiting', shortResult: 'Trong hàng đợi' } : r)),
    )
    pushLog('INFO', `Đã khôi phục ${ids.length} báo cáo vào danh sách xử lý.`)
    setSelectedIds([])
  }, [activeReport, excludedFrom, locked, pushLog, selectedIds])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const toggleAllSelected = useCallback(
    (ids: string[]) => {
      setSelectedIds((prev) => (ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : ids))
    },
    [],
  )

  /* ------------------------------------------------------------------ xử lý (mô phỏng) */
  const engine = useRef<{
    queue: string[]
    index: number
    stageIdx: number
    stageStart: number
    durations: number[]
    startedAt: number
    finished: number[]
    stopping: boolean
  } | null>(null)

  const finishReport = useCallback(
    (id: string, durationMs: number) => {
      const outcome = RUN_OUTCOME[id]
      const now = new Date()
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: outcome?.status ?? 'completed',
                shortResult: outcome?.shortResult ?? 'Nguyên nhân 1 · Cải tiến 2 · Ảnh 2',
                processedAt: formatStamp(now),
                durationText: outcome?.durationText ?? '00:00:24',
                excelRow: r.excelRow ?? 130,
                excelPath: output,
              }
            : r,
        ),
      )
      setReveal((prev) => ({ ...prev, [id]: REVEAL_DONE }))
      pushLog('INFO', `Hoàn thành: ${reports.find((r) => r.id === id)?.fileName ?? id} (${(durationMs / 1000).toFixed(2)}s)`)
    },
    [output, pushLog, reports],
  )

  const endRun = useCallback(
    (stopped: boolean) => {
      const eng = engine.current
      engine.current = null
      setRun((prev) => ({ ...prev, status: 'done', stage: 'waiting', percent: stopped ? prev.percent : 100, finishedAt: Date.now() }))
      pushLog(stopped ? 'WARN' : 'INFO', stopped ? 'Đã dừng theo yêu cầu sau báo cáo hiện tại.' : 'Đã xử lý xong hàng đợi.')
      if (!stopped) {
        setRun((prev) => ({ ...prev, remainSec: 0 }))
      }
      void eng
    },
    [pushLog],
  )

  useEffect(() => {
    if (!running) return
    const tick = window.setInterval(() => {
      const eng = engine.current
      if (!eng) return
      const now = Date.now()
      const stageKey = STAGE_ORDER[eng.stageIdx]
      const stageDuration = eng.durations[eng.stageIdx]
      const elapsedStage = now - eng.stageStart

      if (elapsedStage < stageDuration) {
        setRun((prev) => {
          const perFile = prev.remainSec === null ? null : prev.remainSec
          const doneFraction = prev.doneCount + (STAGE_WEIGHTS[stageKey] ?? 0)
          const percent = prev.queue.length ? Math.min(99, (doneFraction / prev.queue.length) * 100) : 0
          const avg = eng.finished.length ? eng.finished.reduce((a, b) => a + b, 0) / eng.finished.length : null
          const remainSec =
            avg === null
              ? null
              : Math.max(0, Math.round((avg * (prev.queue.length - doneFraction)) / 1000))
          return {
            ...prev,
            stage: stageKey,
            percent,
            elapsedSec: (now - eng.startedAt) / 1000,
            remainSec: remainSec ?? perFile,
            hasSamples: eng.finished.length > 0,
          }
        })
        setReveal((prev) => ({ ...prev, [eng.queue[eng.index]]: Math.max(prev[eng.queue[eng.index]] ?? 0, REVEAL[stageKey] ?? 0) }))
        return
      }

      // giai đoạn kết thúc
      if (eng.stageIdx < eng.durations.length - 1) {
        eng.stageIdx += 1
        eng.stageStart = now
        const nextStage = STAGE_ORDER[eng.stageIdx]
        setRun((prev) => ({ ...prev, stage: nextStage }))
        pushLog('INFO', `[${reports.find((r) => r.id === eng.queue[eng.index])?.managementNumber ?? ''}] ${STAGE_LABELS[nextStage]} …`)
        return
      }

      // báo cáo hiện tại hoàn thành
      const id = eng.queue[eng.index]
      const durationMs = now - eng.stageStart + eng.durations.reduce((a, b) => a + b, 0)
      eng.finished.push(durationMs)
      finishReport(id, durationMs)
      eng.index += 1

      if (eng.stopping || eng.index >= eng.queue.length) {
        setRun((prev) => ({ ...prev, doneCount: eng.index, currentFile: '', percent: eng.stopping ? prev.percent : 100 }))
        endRun(eng.stopping)
        return
      }

      eng.stageIdx = 0
      eng.stageStart = now
      const nextId = eng.queue[eng.index]
      const file = reports.find((r) => r.id === nextId)
      setReports((prev) => prev.map((r) => (r.id === nextId ? { ...r, status: 'processing' as StatusKey, shortResult: 'Đang xử lý' } : r)))
      setRun((prev) => ({
        ...prev,
        index: eng.index,
        doneCount: eng.index,
        stage: 'reading',
        currentFile: file?.fileName ?? '',
      }))
      pushLog('INFO', `Bắt đầu xử lý file: ${file?.fileName ?? nextId}`)
    }, 120)
    return () => window.clearInterval(tick)
  }, [running, endRun, finishReport, pushLog, reports])

  const startProcessing = useCallback(() => {
    if (running) return
    let ids = reports.filter((r) => r.status === 'waiting' || r.status === 'new_row').map((r) => r.id)
    if (force) {
      ids = reports
        .filter((r) => !['excluded', 'outside_period', 'source_duplicate'].includes(r.status))
        .map((r) => r.id)
    }
    if (!ids.length) {
      pushLog('WARN', 'Không có báo cáo nào trong hàng đợi để xử lý.')
      return
    }
    const first = reports.find((r) => r.id === ids[0])
    const durations = STAGE_ORDER.map((s) =>
      aiMode === 'heuristic' && s === 'analyzing' ? STAGE_MS.analyzing_heuristic : STAGE_MS[s],
    )
    engine.current = {
      queue: ids,
      index: 0,
      stageIdx: 0,
      stageStart: Date.now(),
      durations,
      startedAt: Date.now(),
      finished: [],
      stopping: false,
    }
    setReports((prev) => prev.map((r) => (r.id === ids[0] ? { ...r, status: 'processing' as StatusKey, shortResult: 'Đang xử lý' } : r)))
    setActiveId(ids[0])
    setRun({
      status: 'processing',
      queue: ids,
      index: 0,
      doneCount: 0,
      stage: 'reading',
      percent: 0,
      currentFile: first?.fileName ?? '',
      elapsedSec: 0,
      remainSec: null,
      startedAt: Date.now(),
      finishedAt: null,
      hasSamples: false,
    })
    setReveal((prev) => ({ ...prev, [ids[0]]: 0 }))
    pushLog('INFO', `Bắt đầu xử lý file: ${first?.fileName ?? ids[0]}`)
    pushLog('INFO', `Hàng đợi: ${ids.length} báo cáo${force ? ' · chế độ xử lý lại (ghi đè trường tự động)' : ''}.`)
  }, [aiMode, force, pushLog, reports, running])

  const stopAfterCurrent = useCallback(() => {
    if (run.status !== 'processing' || !engine.current) return
    engine.current.stopping = true
    setRun((prev) => ({ ...prev, status: 'stopping' }))
    pushLog('WARN', 'Đã yêu cầu dừng — sẽ dừng sau báo cáo hiện tại.')
  }, [pushLog, run.status])

  startProcessingRef.current = startProcessing
  stopRef.current = stopAfterCurrent

  const resetRun = useCallback(() => {
    setRun(IDLE_RUN)
    setReveal({})
  }, [])

  /* ------------------------------------------------------------------ Ollama */
  const checkConnection = useCallback(() => {
    setOllama((prev) => ({ ...prev, checked: 'unchecked', message: 'Đang kiểm tra kết nối…' }))
    registerTimeout(() => {
      const host = ollama.server.trim()
      const ok = host.length > 0
      setOllama((prev) => ({
        ...prev,
        checked: ok ? 'ok' : 'fail',
        message: ok
          ? `Đã kết nối — http://${host}:${prev.port} · ${prev.models.length} model khả dụng · model đang chọn: ${prev.model}`
          : 'Không kết nối được Ollama — chương trình sẽ dùng phân tích từ khoá.',
      }))
      pushLog(ok ? 'INFO' : 'WARN', ok ? `OLLAMA OK server=${host}:${ollama.port}` : 'OLLAMA không kết nối được — heuristic fallback')
    }, 900)
  }, [ollama.port, ollama.server, pushLog, registerTimeout])

  const refreshModels = useCallback(() => {
    if (!ollama.server.trim()) {
      setOllama((prev) => ({ ...prev, checked: 'fail', message: 'Chưa có server để lấy danh sách model.' }))
      return
    }
    registerTimeout(() => {
      setOllama((prev) => ({
        ...prev,
        models: MODEL_CHOICES,
        checked: 'ok',
        message: `Đã làm mới danh sách model từ http://${prev.server}:${prev.port} (${MODEL_CHOICES.length} model).`,
      }))
      pushLog('INFO', `Làm mới model từ http://${ollama.server}:${ollama.port} — ${MODEL_CHOICES.length} model.`)
    }, 700)
  }, [ollama.port, ollama.server, pushLog, registerTimeout])

  const saveOllamaConfig = useCallback(() => {
    pushLog('INFO', `Đã lưu cấu hình Ollama: http://${ollama.server}:${ollama.port} · model ${ollama.model}`)
    setOllama((prev) => ({ ...prev, message: `Đã lưu cấu hình vào config.json (${prev.server}:${prev.port}, ${prev.model}).` }))
  }, [ollama.model, ollama.port, ollama.server, pushLog])

  const startDiscovery = useCallback(() => {
    setDiscovering(true)
    setDiscoveryMessage('Đang quét cổng 11434 trên dải mạng nội bộ…')
    pushLog('INFO', 'Bắt đầu tìm Ollama trong mạng LAN (chỉ cổng 11434).')
    registerTimeout(() => {
      setDiscovering(false)
      setDiscoveryResults(DISCOVERED_SERVERS)
      setDiscoveryMessage(`Tìm thấy ${DISCOVERED_SERVERS.length} server Ollama trong mạng LAN.`)
      pushLog('INFO', `Tìm thấy ${DISCOVERED_SERVERS.length} server Ollama trong mạng LAN.`)
    }, 2400)
  }, [pushLog, registerTimeout])

  const stopDiscovery = useCallback(() => {
    if (!discovering) return
    setDiscovering(false)
    setDiscoveryMessage(`Đã dừng tìm kiếm theo yêu cầu. Tìm thấy ${discoveryResults.length} server.`)
    pushLog('WARN', 'Người dùng dừng tìm Ollama trong mạng LAN.')
  }, [discovering, discoveryResults.length, pushLog])

  const useServer = useCallback(
    (host: string, port: number) => {
      setOllama((prev) => ({ ...prev, server: host, port: String(port), checked: 'unchecked', message: `Đã chọn server ${host}:${port} — bấm Kiểm tra kết nối để xác nhận.` }))
      setAppliedServer(`${host}:${port}`)
      pushLog('INFO', `Chọn server Ollama ${host}:${port} (không tự động đổi server).`)
    },
    [pushLog],
  )

  /* ------------------------------------------------------------------ cập nhật */
  const checkUpdate = useCallback(
    (startup = false) => {
      setUpdate((prev) => ({
        ...prev,
        status: 'checking',
        message: startup ? 'Đang kiểm tra cập nhật (tự động khi khởi động)…' : 'Đang kiểm tra cập nhật…',
      }))
      registerTimeout(() => {
        setUpdate((prev) => ({
          ...prev,
          status: 'available',
          message: `Đã có bản mới hơn: ${'1.3.3'} — Build ${'016'} (${'ReportExtractor_1.3.3.zip'}, 87.1 MB). Bản hiện tại: 1.3.2 — Build 015.`,
          available: { version: '1.3.3', build: '016', package: 'ReportExtractor_1.3.3.zip', size: '87.1 MB' },
        }))
        pushLog('INFO', 'Kiểm tra cập nhật: có bản 1.3.3 — Build 016.')
      }, 1200)
    },
    [pushLog, registerTimeout],
  )

  const installUpdate = useCallback(() => {
    setUpdate((prev) => ({ ...prev, status: 'installing', progress: 0, progressStage: 'Chuẩn bị gói cập nhật…', message: 'Đang cập nhật — không tắt chương trình.' }))
    const stages = [
      { at: 900, p: 24, stage: 'Chuẩn bị (PREPARING)' },
      { at: 1800, p: 58, stage: 'Đang sao chép gói (COPYING)' },
      { at: 2800, p: 82, stage: 'Đang kiểm tra SHA256 (VERIFYING)' },
      { at: 3700, p: 100, stage: 'Gói đã sẵn sàng (READY)' },
    ]
    stages.forEach(({ at, p, stage }) => {
      registerTimeout(() => {
        setUpdate((prev) => ({ ...prev, progress: p, progressStage: stage }))
        if (p === 100) {
          setUpdate((prev) => ({
            ...prev,
            status: 'installed',
            message: 'Gói cập nhật đã sẵn sàng. Đang khởi động trình cài đặt — chương trình sẽ tự khởi động lại.',
          }))
          pushLog('INFO', 'Gói cập nhật đã kiểm tra SHA256 — bàn giao cho trình cập nhật ngoài (updater).')
        }
      }, at)
    })
  }, [pushLog, registerTimeout])

  /* ------------------------------------------------------------------ chẩn đoán */
  const runDiagnostics = useCallback(() => {
    setDiagRunning(true)
    setDiagRows([])
    pushLog('INFO', 'Chạy chẩn đoán hệ thống…')
    DIAGNOSTIC_RESULT.forEach((row, i) => {
      registerTimeout(() => {
        setDiagRows((prev) => [...prev, row])
        if (i === DIAGNOSTIC_RESULT.length - 1) {
          setDiagRunning(false)
          pushLog('INFO', 'Chẩn đoán hoàn tất: 3 mục đạt, 1 mục cảnh báo (bộ dựng ảnh QPN).')
        }
      }, 500 * (i + 1))
    })
  }, [pushLog, registerTimeout])

  /* ------------------------------------------------------------------ nhật ký */
  const clearLogView = useCallback(() => {
    setLog([])
    pushLog('INFO', 'Đã xóa phần hiển thị nhật ký (file log trên đĩa vẫn giữ nguyên).')
  }, [pushLog])

  const openLogFile = useCallback(() => pushLog('INFO', 'Mở file log: D:\\ReportExtractor\\logs\\app.log'), [pushLog])
  const openLogFolder = useCallback(() => pushLog('INFO', 'Mở thư mục log: D:\\ReportExtractor\\logs'), [pushLog])
  const openOutputFile = useCallback(() => pushLog('INFO', `Mở file kết quả: ${output}`), [output, pushLog])
  const openOutputFolder = useCallback(
    () => pushLog('INFO', `Mở thư mục kết quả: ${output.replace(/[^\\]+$/, '')}`),
    [output, pushLog],
  )

  /* ------------------------------------------------------------------ học cải tiến */
  const labelImage = useCallback(
    (id: string, label: string) => {
      setLearning((prev) => {
        const images = prev.images.map((c) => (c.id === id ? { ...c, userLabel: label } : c))
        const labeled = 18 + images.filter((c) => c.userLabel !== 'UNLABELED').length
        const labeledInList = images.filter((c) => c.userLabel !== 'UNLABELED').length
        return {
          ...prev,
          images,
          counts: {
            ...prev.counts,
            image: { total: prev.counts.image.total, labeled: Math.min(prev.counts.image.total, 18 + labeledInList) },
          },
          modelStatus: {
            ...prev.modelStatus,
            image:
              labeledInList >= 2
                ? `Chưa huấn luyện — chưa đủ dữ liệu học (${Math.min(20, labeled)}/20 nhãn cần thiết). Quy tắc hiện tại vẫn được dùng.`
                : prev.modelStatus.image,
          },
        }
      })
      pushLog('INFO', `Lưu nhãn ảnh: candidate=${id} label=${label}`)
    },
    [pushLog],
  )

  const labelContent = useCallback(
    (id: string, label: string) => {
      setLearning((prev) => {
        const contents = prev.contents.map((c) => (c.id === id ? { ...c, userLabel: label } : c))
        const labeledInList = contents.filter((c) => c.userLabel !== 'UNLABELED').length
        return {
          ...prev,
          contents,
          counts: {
            ...prev.counts,
            content: { total: prev.counts.content.total, labeled: Math.min(prev.counts.content.total, 7 + labeledInList) },
          },
          excelPending: prev.excelPending + 1,
        }
      })
      pushLog('INFO', `Lưu nhãn nội dung: candidate=${id} label=${label}`)
    },
    [pushLog],
  )

  const setNote = useCallback((kind: 'image' | 'content', id: string, note: string) => {
    setLearning((prev) =>
      kind === 'image'
        ? { ...prev, images: prev.images.map((c) => (c.id === id ? { ...c, note } : c)) }
        : { ...prev, contents: prev.contents.map((c) => (c.id === id ? { ...c, note } : c)) },
    )
  }, [])

  const trainModels = useCallback(() => {
    setTraining(true)
    pushLog('INFO', 'Cập nhật mô hình học (ảnh và nội dung độc lập)…')
    registerTimeout(() => {
      setTraining(false)
      setLearning((prev) => ({
        ...prev,
        modelStatus: {
          image: prev.modelStatus.image,
          content: 'Đã huấn luyện — 7 mẫu, cập nhật ' + formatStamp(new Date()) + '. Dùng để xếp hạng vùng nội dung, không viết lại nội dung.',
        },
      }))
      pushLog('INFO', 'Cập nhật mô hình học: mô hình ảnh chưa đủ dữ liệu; mô hình nội dung đã cập nhật.')
    }, 1500)
  }, [pushLog, registerTimeout])

  const exportLearningData = useCallback(() => {
    pushLog('INFO', 'Xuất dữ liệu học: learning_data\\export_20261006.zip')
  }, [pushLog])

  const openLearningFolder = useCallback(() => {
    pushLog('INFO', 'Mở thư mục dữ liệu học: D:\\ReportExtractor\\learning_data')
  }, [pushLog])

  /** Nhãn đã lưu thành công; bước cập nhật Excel có thể bị khóa file. */
  const applyLabelsToExcel = useCallback(
    (retry = false) => {
      if (learning.excelPending === 0 && !retry) {
        setLearning((prev) => ({ ...prev, excelLastResult: { kind: 'ok', message: 'Không có nhãn mới cần cập nhật Excel.' } }))
        return
      }
      if (!retry) {
        pushLog('INFO', `CONTENT_REAPPLY_START — ${learning.excelPending} nhãn đã lưu.`)
        registerTimeout(() => {
          setLearning((prev) => ({
            ...prev,
            excelLastResult: {
              kind: 'locked',
              message:
                'Nhãn đã lưu thành công vào learning_data\\content_labels.jsonl. ' +
                'Chưa cập nhật được file Excel: file đang được mở bởi chương trình khác (WinError 32). ' +
                'Hãy đóng Excel rồi bấm “Thử lại”.',
            },
          }))
          pushLog('WARN', 'CONTENT_REAPPLY_FAILED — file Excel đang bị khóa (WinError 32). Nhãn vẫn được giữ.')
        }, 1100)
        return
      }
      pushLog('INFO', 'CONTENT_REAPPLY_RETRY — thử lại bước cập nhật Excel.')
      registerTimeout(() => {
        setLearning((prev) => ({
          ...prev,
          excelPending: 0,
          excelLastResult: {
            kind: 'ok',
            message: `Đã cập nhật Excel: ${prev.excelPending} dòng từ nhãn đã lưu (dòng 128, 131, 132 …).`,
          },
        }))
        pushLog('INFO', 'CONTENT_REAPPLY_COMMIT_OK — đã cập nhật Excel từ nhãn đã lưu.')
      }, 1200)
    },
    [learning.excelPending, pushLog, registerTimeout],
  )

  /* ------------------------------------------------------------------ mô phỏng trạng thái (bản demo) */
  const demo = useCallback(
    (kind: 'empty' | 'ready' | 'processing' | 'stopping' | 'completed' | 'needs_review' | 'error' | 'skipped') => {
      if (kind === 'empty') {
        setFolder('')
        setReports([])
        setActiveId('')
        setSelectedIds([])
        setScanned(true)
        setScanMessage('Chưa chọn thư mục báo cáo.')
        resetRun()
        return
      }
      if (kind === 'ready') {
        setFolder(DEFAULT_FOLDER)
        setReports(REPORTS)
        setActiveId('r1')
        setSelectedIds([])
        setFilter('Tất cả file đã quét')
        setSearch('')
        setScanMessage('10 file trong thư mục · 8 file cần xử lý')
        resetRun()
        setLog(INITIAL_LOG)
        return
      }
      if (kind === 'processing' || kind === 'stopping') {
        if (queue.length === 0) setReports(REPORTS)
        setFilter('Tất cả file đã quét')
        setSearch('')
        registerTimeout(() => {
          startProcessingRef.current?.()
          if (kind === 'stopping') registerTimeout(() => stopRef.current?.(), 1500)
        }, 60)
        return
      }
      // trạng thái cuối: chọn đúng dòng và cuộn tới bảng
      const target = reports.find((r) => r.status === kind) ?? reports.find((r) => BUCKET_OF[r.status] === kind)
      setFilter('Tất cả file đã quét')
      setSearch('')
      if (target) {
        setActiveId(target.id)
        setSelectedIds([target.id])
      }
      document.querySelector('main')?.scrollTo({ top: 300, behavior: 'smooth' })
    },
    [queue.length, registerTimeout, reports, resetRun],
  )

  const store = {
    /* điều hướng */
    tab,
    setTab,
    /* danh sách báo cáo */
    reports,
    filteredReports,
    stats,
    queue,
    scanned,
    scanMessage,
    activeId,
    setActiveId,
    activeReport,
    selectedIds,
    toggleSelected,
    toggleAllSelected,
    search,
    setSearch,
    filter,
    setFilter,
    scan,
    excludeSelected,
    restoreSelected,
    /* nguồn dữ liệu */
    folder,
    setFolder,
    template,
    setTemplate,
    output,
    setOutput,
    periodMode,
    setPeriodMode,
    month,
    setMonth,
    year,
    setYear,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    /* xử lý */
    force,
    setForce,
    run,
    reveal,
    running,
    locked,
    startProcessing,
    stopAfterCurrent,
    resetRun,
    demo,
    /* nhật ký */
    log,
    pushLog,
    logCollapsed,
    setLogCollapsed,
    clearLogView,
    openLogFile,
    openLogFolder,
    openOutputFile,
    openOutputFolder,
    /* Ollama */
    ollama,
    setOllama,
    ollamaIndicator,
    aiStatusText,
    aiMode,
    discovering,
    discoveryMessage,
    discoveryResults,
    startDiscovery,
    stopDiscovery,
    useServer,
    appliedServer,
    checkConnection,
    refreshModels,
    saveOllamaConfig,
    /* cập nhật */
    update,
    setUpdate,
    checkUpdate,
    installUpdate,
    /* chẩn đoán */
    diagRows,
    diagRunning,
    runDiagnostics,
    /* học cải tiến */
    learning,
    imageReviewIndex,
    setImageReviewIndex,
    contentReviewIndex,
    setContentReviewIndex,
    labelImage,
    labelContent,
    setNote,
    trainModels,
    exportLearningData,
    openLearningFolder,
    applyLabelsToExcel,
    training,
    title: APP_TITLE,
  }

  return store
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore phải dùng bên trong StoreProvider')
  return ctx
}

import { AppHeader } from './components/AppHeader'
import { useStore } from './state/store'
import { LearningTab } from './tabs/LearningTab'
import { ReportListTab } from './tabs/ReportListTab'
import { SettingsTab } from './tabs/SettingsTab'

export default function App() {
  const { tab } = useStore()

  return (
    <div className="flex h-full min-h-0 flex-col bg-app">
      <AppHeader />
      <main className="min-h-0 flex-1 overflow-auto">
        {tab === 'reports' && <ReportListTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'learning' && <LearningTab />}
      </main>
    </div>
  )
}

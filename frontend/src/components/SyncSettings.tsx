import { useState } from 'react'

interface SyncConfig {
  clubSyncEnabled: boolean
  clubSyncCron: string
  eventScrapingEnabled: boolean
  eventScrapingDays: number
  syncIntervalHours: number
}

export function SyncSettings() {
  const [config, setConfig] = useState<SyncConfig>({
    clubSyncEnabled: true,
    clubSyncCron: '0 * * * *',
    eventScrapingEnabled: false,
    eventScrapingDays: 90,
    syncIntervalHours: 1,
  })
  const [message, setMessage] = useState('')

  const handleSave = () => {
    // Voor nu: toon instructies voor GitHub Secrets
    setMessage('✅ Configuratie opgeslagen! Update deze waarden in GitHub Secrets:')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">⚙️ Sync Configuratie</h2>
      
      <div className="space-y-4">
        {/* Club Sync */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.clubSyncEnabled}
              onChange={(e) => setConfig({ ...config, clubSyncEnabled: e.target.checked })}
              className="rounded"
            />
            <span className="font-medium">Club Sync Enabled</span>
          </label>
        </div>

        {/* Sync Interval */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Sync Interval (uren)
          </label>
          <input
            type="number"
            min="1"
            max="24"
            value={config.syncIntervalHours}
            onChange={(e) => setConfig({ ...config, syncIntervalHours: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded"
          />
          <p className="text-xs text-gray-500 mt-1">
            Elke {config.syncIntervalHours} uur club members syncen
          </p>
        </div>

        {/* Cron Schedule */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Cron Schedule
          </label>
          <input
            type="text"
            value={config.clubSyncCron}
            onChange={(e) => setConfig({ ...config, clubSyncCron: e.target.value })}
            className="w-full px-3 py-2 border rounded font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: minute hour day month weekday
          </p>
          <div className="text-xs text-gray-600 mt-2 space-y-1">
            <div>• <code>0 * * * *</code> = Elk uur om :00</div>
            <div>• <code>0 */2 * * *</code> = Elke 2 uur</div>
            <div>• <code>0 0,6,12,18 * * *</code> = Om 00:00, 06:00, 12:00, 18:00</div>
          </div>
        </div>

        {/* Event Scraping */}
        <div className="border-t pt-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.eventScrapingEnabled}
              onChange={(e) => setConfig({ ...config, eventScrapingEnabled: e.target.checked })}
              className="rounded"
            />
            <span className="font-medium">Event Scraping Enabled (MVP)</span>
          </label>
          
          {config.eventScrapingEnabled && (
            <div className="mt-3 ml-6">
              <label className="block text-sm font-medium mb-1">
                Scraping Days (historical range)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={config.eventScrapingDays}
                onChange={(e) => setConfig({ ...config, eventScrapingDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Scrape events van laatste {config.eventScrapingDays} dagen
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          💾 Save Configuration
        </button>

        {/* Message */}
        {message && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="font-medium mb-2">{message}</p>
            <div className="text-sm space-y-1">
              <div>1. Ga naar GitHub repo → Settings → Secrets → Actions</div>
              <div>2. Update deze secrets:</div>
              <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 text-xs overflow-x-auto">
{`SYNC_INTERVAL_HOURS=${config.syncIntervalHours}
SYNC_CRON_SCHEDULE="${config.clubSyncCron}"
EVENT_SCRAPING_ENABLED=${config.eventScrapingEnabled}
EVENT_SCRAPING_DAYS=${config.eventScrapingDays}`}
              </pre>
              <div className="mt-2">3. Workflow wordt automatisch updated bij volgende run</div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
          <p className="font-medium mb-1">ℹ️ Note:</p>
          <p>
            Sync settings worden geconfigureerd via <strong>GitHub Secrets</strong>.
            Dit zorgt ervoor dat ze veilig en centraal beheerd worden.
            Frontend kan deze niet direct aanpassen (zero-cost constraint).
          </p>
        </div>
      </div>
    </div>
  )
}

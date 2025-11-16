import { Link } from 'react-router-dom'
import { Archive as ArchiveIcon, Clock, Database, Users, Calendar, Activity, BarChart3 } from 'lucide-react'

interface ArchiveItemProps {
  icon: React.ReactNode
  title: string
  description: string
  to: string
  deprecated?: string
}

function ArchiveItem({ icon, title, description, to, deprecated }: ArchiveItemProps) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
    >
      <div className="p-6">
        {/* Deprecated Badge */}
        {deprecated && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-full">
              {deprecated}
            </span>
          </div>
        )}

        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors duration-300">
            {icon}
          </div>
          <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          {description}
        </p>

        {/* View Link */}
        <div className="flex items-center text-sm text-blue-600 font-medium group-hover:translate-x-1 transition-transform duration-300">
          Bekijken →
        </div>
      </div>

      {/* Decorative corner */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gray-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </Link>
  )
}

export default function Archive() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl shadow-lg">
              <ArchiveIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900">
                Dashboard Archief
              </h1>
              <p className="text-sm lg:text-base text-gray-600 mt-1">
                Oude dashboard versies bewaard voor referentie
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">
                  Deze dashboards zijn vervangen door moderne versies
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  De nieuwe versies bieden betere performance, mobile support en moderne UI. Deze oude versies blijven beschikbaar voor referentie.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Archive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Status Dashboard (Classic) */}
          <ArchiveItem
            icon={<Activity className="w-6 h-6" />}
            title="System Status Dashboard"
            description="Originele system status pagina met API health monitoring, database stats en algemene metrics. Vervangen door moderne versie met real-time updates."
            to="/admin/archive/dashboard"
            deprecated="Legacy"
          />

          {/* Sync Status (Classic) */}
          <ArchiveItem
            icon={<Database className="w-6 h-6" />}
            title="Sync Status (Classic)"
            description="Eerste sync status implementatie met basis sync logs en handmatige sync triggers. Mist real-time metrics en auto-sync configuratie."
            to="/admin/archive/sync"
            deprecated="Legacy"
          />

          {/* Racing Matrix (Classic) */}
          <ArchiveItem
            icon={<BarChart3 className="w-6 h-6" />}
            title="Racing Matrix (Classic)"
            description="Originele team matrix met basis rider stats en race results. Vervangen door moderne versie met sorteerbare kolommen en mobile support."
            to="/admin/archive/matrix"
            deprecated="Legacy"
          />

          {/* Events (Classic) */}
          <ArchiveItem
            icon={<Calendar className="w-6 h-6" />}
            title="Events (Classic)"
            description="Eerste events pagina met simpele tabel layout. Nieuwe versie heeft filtering, search en betere signup visualisatie."
            to="/admin/archive/events"
            deprecated="Legacy"
          />

          {/* Team Management (Classic) */}
          <ArchiveItem
            icon={<Users className="w-6 h-6" />}
            title="Team Management (Classic)"
            description="Originele riders management pagina met basis CRUD functionaliteit. Mist moderne filters, sync timestamps en mobile optimalisatie."
            to="/admin/archive/riders"
            deprecated="Legacy"
          />
        </div>

        {/* Back to Admin */}
        <div className="mt-12 text-center">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            ← Terug naar Admin
          </Link>
        </div>

        {/* Info Footer */}
        <div className="mt-8 p-6 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-3">ℹ️ Over dit archief</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Waarom bewaren?</strong> Deze dashboards vertegenwoordigen eerdere ontwikkelingsfasen en worden bewaard voor:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Referentie bij regressie testing</li>
              <li>Vergelijking oude vs nieuwe functionaliteit</li>
              <li>Backup bij onverwachte issues in nieuwe versies</li>
              <li>Documentatie van evolutie dashboard architectuur</li>
            </ul>
            <p className="mt-3">
              <strong>Gebruik moderne versies:</strong> Voor productie gebruik altijd de nieuwe dashboards via de Admin Home tegels.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

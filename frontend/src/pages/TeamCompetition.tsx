import { useState } from 'react'
import TeamBuilder from './TeamBuilder'
import TeamViewer from './TeamViewer'

export default function TeamCompetition() {
  const [activeTab, setActiveTab] = useState<'builder' | 'viewer'>('viewer')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      {/* Header met Tabs */}
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-blue-600 to-orange-500 opacity-95"></div>
        <div className="relative px-3 py-4 sm:px-6 sm:py-6 lg:py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 mb-6">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="p-2 sm:p-3 lg:p-4 bg-white/20 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl flex-shrink-0">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
                    <span className="truncate">TEAM COMPETITION</span>
                  </h1>
                  <p className="text-orange-100 text-xs sm:text-sm lg:text-lg xl:text-xl font-semibold mt-1 sm:mt-2 truncate">
                    TeamNL Cloud9 Racing · Build & View Teams
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = 'https://teamnl-cloud9-racing-team-production.up.railway.app/'}
                className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-lg sm:rounded-xl border border-white/30 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl"
              >
                🏠 Dashboard
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => setActiveTab('builder')}
                className={`flex-1 px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base lg:text-lg transition-all shadow-lg ${
                  activeTab === 'builder'
                    ? 'bg-orange-500 text-white border-2 border-orange-300 shadow-orange-500/50'
                    : 'bg-white/10 text-white/60 border-2 border-white/20 hover:bg-white/20'
                }`}
              >
                ✏️ TEAM BUILDER
              </button>
              <button
                onClick={() => setActiveTab('viewer')}
                className={`flex-1 px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base lg:text-lg transition-all shadow-lg ${
                  activeTab === 'viewer'
                    ? 'bg-blue-500 text-white border-2 border-blue-300 shadow-blue-500/50'
                    : 'bg-white/10 text-white/60 border-2 border-white/20 hover:bg-white/20'
                }`}
              >
                👁️ TEAM VIEWER
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-8">
        {activeTab === 'builder' ? <TeamBuilder hideHeader /> : <TeamViewer hideHeader />}
      </div>
    </div>
  )
}

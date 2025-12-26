interface EntryCodeLoginProps {
  onSubmit: (code: string) => void
  code: string
  setCode: (code: string) => void
}

export default function EntryCodeLogin({ onSubmit, code, setCode }: EntryCodeLoginProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(code)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-blue-700/40 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-center mb-2 bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
            Team Builder
          </h1>
          <p className="text-center text-white/70 mb-8">
            Voer de entry code in voor toegang
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Entry Code"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 transition-all text-center tracking-wider uppercase"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              🔓 Ontgrendel
            </button>
          </form>
          <button
            onClick={() => window.history.back()}
            className="w-full mt-4 py-3 bg-white/10 rounded-xl font-semibold text-white/70 hover:bg-white/20 transition-all"
          >
            ← Terug
          </button>
        </div>
      </div>
    </div>
  )
}

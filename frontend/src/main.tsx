import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // ✅ Refresh data bij focus (bijv. terug naar tab)
      refetchOnMount: true, // ✅ Refresh data bij mount (bijv. tussen pagina's navigeren)
      retry: 1,
      staleTime: 10000, // 10 seconden - data wordt sneller als "stale" beschouwd
      gcTime: 300000, // 5 minuten - cache blijft in geheugen (garbage collection time)
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

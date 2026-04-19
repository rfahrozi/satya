import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'

// Caching & Data Fetching Engine (React Query)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // jangan otomatis fetch jika pindah tab browser (menghemat bandwidth)
      retry: 1, // retry jika HTTP fail sekali
      staleTime: 5 * 60 * 1000, // cache 5 menit
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

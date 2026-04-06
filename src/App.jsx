// src/App.jsx
// CHANGED: WakeUp hook at root level so all pages benefit from keep-alive

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useKeepAlive } from './hooks/useKeepAlive'
import CustomerPage from './pages/CustomerPage'
import WaiterPage   from './pages/WaiterPage'
import AdminPage    from './pages/admin/AdminPage'
import WakeUp       from './components/WakeUp'

function NotFound() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center text-center px-4">
      <div>
        <p className="font-display text-amber text-8xl mb-4">404</p>
        <p className="text-mid font-body mb-6">Page not found.</p>
        <a href="/?table=1" className="btn-amber inline-flex">← Go to Menu</a>
      </div>
    </div>
  )
}

// Root wrapper — handles keep-alive pings + wake-up overlay for all pages
function AppContent() {
  const { isWakingUp, retryNow } = useKeepAlive()
  return (
    <>
      {isWakingUp && <WakeUp onRetry={retryNow} />}
      <Routes>
        <Route path="/"       element={<CustomerPage />} />
        <Route path="/waiter" element={<WaiterPage />}   />
        <Route path="/admin"  element={<AdminPage />}    />
        <Route path="*"       element={<NotFound />}     />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

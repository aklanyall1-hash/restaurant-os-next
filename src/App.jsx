import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import ProtectedRoute from './components/ProtectedRoute'
import MenuPage from './pages/MenuPage'
import KitchenPage from './pages/KitchenPage'
import CashierPage from './pages/CashierPage'
import DashboardPage from './pages/DashboardPage'
import TablePage from './pages/TablePage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <div className="min-h-screen bg-dark">
      <Routes>
        {/* Customer-facing QR menu - no navbar, no login */}
        <Route path="/table/:tableNumber" element={<TablePage />} />

        {/* Login - no navbar */}
        <Route path="/login" element={<LoginPage />} />

        {/* Staff pages - with navbar, requires login */}
        <Route path="/*" element={
          <ProtectedRoute>
            <NavBar />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/kitchen" element={<KitchenPage />} />
                <Route path="/cashier" element={<CashierPage />} />
                <Route path="/menu" element={<MenuPage />} />
              </Routes>
            </main>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  )
}

import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import MenuPage from './pages/MenuPage'
import KitchenPage from './pages/KitchenPage'
import CashierPage from './pages/CashierPage'
import DashboardPage from './pages/DashboardPage'
import TablePage from './pages/TablePage'

export default function App() {
  return (
    <div className="min-h-screen bg-dark">
      <Routes>
        {/* Customer-facing QR menu - no navbar */}
        <Route path="/table/:tableNumber" element={<TablePage />} />

        {/* Staff pages - with navbar */}
        <Route path="/*" element={
          <>
            <NavBar />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/kitchen" element={<KitchenPage />} />
                <Route path="/cashier" element={<CashierPage />} />
                <Route path="/menu" element={<MenuPage />} />
              </Routes>
            </main>
          </>
        } />
      </Routes>
    </div>
  )
}

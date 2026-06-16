import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import QRCode from 'qrcode.react'
import Counter from '../components/Counter'

export default function MenuPage() {
  const { restaurantId } = useAuth()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [tables, setTables] = useState([])
  const [activeTab, setActiveTab] = useState('products')
  const [showQR, setShowQR] = useState(null)
  const [form, setForm] = useState({ name_ar: '', price: '', category_id: '', is_available: true })
  const [editId, setEditId] = useState(null)

  const fetchData = async () => {
    const [cats, prods, tbls] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase.from('products').select('*, categories(name_ar)').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase.from('tables').select('*').eq('restaurant_id', restaurantId).order('table_number'),
    ])
    if (cats.data) setCategories(cats.data)
    if (prods.data) setProducts(prods.data)
    if (tbls.data) setTables(tbls.data)
  }

  useEffect(() => {
    if (!restaurantId) return
    fetchData()

    const channel = supabase.channel('menu-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `restaurant_id=eq.${restaurantId}` }, fetchData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [restaurantId])

  const saveProduct = async () => {
    if (!form.name_ar || !form.price) return
    const payload = { ...form, price: Number(form.price), restaurant_id: restaurantId }
    if (editId) {
      await supabase.from('products').update(payload).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('products').insert(payload)
    }
    setForm({ name_ar: '', price: '', category_id: '', is_available: true })
    fetchData()
  }

  const toggleAvailable = async (id, val) => {
    await supabase.from('products').update({ is_available: !val }).eq('id', id)
    fetchData()
  }

  const deleteProduct = async (id) => {
    if (!confirm('حذف المنتج؟')) return
    await supabase.from('products').delete().eq('id', id)
    fetchData()
  }

  const tableUrl = (num) => `${window.location.origin}/table/${num}`

  return (
    <div className="p-4 max-w-5xl mx-auto pattern-bg">
      <h1 className="font-display text-3xl font-bold text-white mb-6 animate-fade-in-up">إدارة المنيو 🍽️</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {[{ id: 'products', label: 'المنتجات' }, { id: 'tables', label: 'الطاولات & QR' }].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === t.id ? 'bg-brand text-white shadow-[0_0_0_1px_rgba(255,107,53,0.4)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'products' && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Add/Edit form */}
          <div className="glass rounded-xl p-5">
            <h2 className="text-white font-bold mb-4 font-display">{editId ? '✏️ تعديل المنتج' : '➕ إضافة منتج'}</h2>
            <div className="space-y-3">
              <input
                placeholder="اسم المنتج بالعربي"
                value={form.name_ar}
                onChange={e => setForm({...form, name_ar: e.target.value})}
                className="w-full bg-white/10 text-white placeholder-gray-500 border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
              />
              <input
                placeholder="السعر"
                type="number"
                value={form.price}
                onChange={e => setForm({...form, price: e.target.value})}
                className="w-full bg-white/10 text-white placeholder-gray-500 border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
              />
              <select
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
                className="w-full bg-surface text-white border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
              >
                <option value="">-- اختر الفئة --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={saveProduct} className="flex-1 bg-brand hover:bg-brand-light text-white font-bold py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98] hover:shadow-[0_0_16px_rgba(255,107,53,0.35)]">
                  {editId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
                {editId && (
                  <button onClick={() => { setEditId(null); setForm({ name_ar: '', price: '', category_id: '', is_available: true }) }} className="px-4 bg-white/10 text-gray-400 rounded-lg transition-colors hover:bg-white/15">
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Products list */}
          <div className="glass rounded-xl p-5 overflow-y-auto max-h-[500px]">
            <h2 className="text-white font-bold mb-4 font-display">المنتجات (<Counter value={products.length} />)</h2>
            <div className="space-y-2">
              {products.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg transition-colors hover:bg-white/[0.07] stagger-item" style={{ animationDelay: `${i * 30}ms` }}>
                  <button
                    onClick={() => toggleAvailable(p.id, p.is_available)}
                    className={`w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${p.is_available ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform duration-200 ${p.is_available ? 'translate-x-0' : ''}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{p.name_ar}</div>
                    <div className="text-gray-500 text-xs">{p.categories?.name_ar}</div>
                  </div>
                  <div className="text-brand font-bold text-sm">{Number(p.price).toFixed(0)} ج</div>
                  <button onClick={() => { setEditId(p.id); setForm({ name_ar: p.name_ar, price: p.price, category_id: p.category_id || '', is_available: p.is_available }) }} className="text-gray-400 hover:text-white text-sm px-2 transition-colors">✏️</button>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300 text-sm px-1 transition-colors">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="glass rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-white font-bold mb-4 font-display">الطاولات & QR Codes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tables.map((t, i) => (
              <div key={t.id} className="bg-white/5 rounded-xl p-4 text-center transition-all duration-200 hover:bg-white/[0.08] hover:-translate-y-0.5 stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="text-white font-bold mb-2 font-display">{t.label}</div>
                <div className="bg-white p-2 rounded-lg inline-block mb-2 cursor-pointer transition-transform duration-200 hover:scale-105" onClick={() => setShowQR(t)}>
                  <QRCode value={tableUrl(t.table_number)} size={80} />
                </div>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => setShowQR(t)}
                    className="flex-1 text-xs text-brand hover:text-white transition-all py-1 rounded hover:bg-white/10"
                  >
                    📱 QR
                  </button>
                  <a
                    href={tableUrl(t.table_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs text-green-400 hover:text-white transition-all py-1 rounded hover:bg-white/10"
                  >
                    🔗 افتح
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in-up" style={{ animationDuration: '0.2s' }} onClick={() => setShowQR(null)}>
          <div className="glass rounded-2xl p-8 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-xl mb-4 font-display">{showQR.label}</h3>
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <QRCode value={tableUrl(showQR.table_number)} size={200} />
            </div>
            <div className="text-gray-500 text-xs mb-4 break-all">{tableUrl(showQR.table_number)}</div>
            <div className="flex gap-3">
              <button onClick={() => setShowQR(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 px-4 py-2.5 rounded-lg transition-colors text-sm">
                إغلاق
              </button>
              <a
                href={tableUrl(showQR.table_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-brand hover:bg-brand-light text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-bold text-center"
              >
                🔗 افتح صفحة الطاولة
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [stations, setStations] = useState([])
  const [activeTab, setActiveTab] = useState('products')
  const [showQR, setShowQR] = useState(null)
  const [form, setForm] = useState({ name_ar: '', price: '', category_id: '', is_available: true, image_url: '', station_id: '', sku: '' })
  const [editId, setEditId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [newStationName, setNewStationName] = useState('')
  const [newStationType, setNewStationType] = useState('kitchen')

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async () => {
    if (!imageFile) return null
    setUploading(true)
    const ext = imageFile.name.split('.').pop()
    const fileName = `${restaurantId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(fileName, imageFile)
    setUploading(false)
    if (error) {
      alert('فشل رفع الصورة: ' + error.message)
      return null
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
    return data.publicUrl
  }

  const fetchData = async () => {
    const [cats, prods, tbls, stns] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase.from('products').select('*, categories(name_ar), stations(name)').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase.from('tables').select('*').eq('restaurant_id', restaurantId).order('table_number'),
      supabase.from('stations').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
    ])
    if (cats.data) setCategories(cats.data)
    if (prods.data) setProducts(prods.data)
    if (tbls.data) setTables(tbls.data)
    if (stns.data) setStations(stns.data)
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
    let imageUrl = form.image_url
    if (imageFile) {
      const uploaded = await uploadImage()
      if (uploaded) imageUrl = uploaded
    }
    const payload = {
      ...form,
      price: Number(form.price),
      restaurant_id: restaurantId,
      image_url: imageUrl,
      station_id: form.station_id || null,
      category_id: form.category_id || null,
    }
    if (editId) {
      await supabase.from('products').update(payload).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('products').insert(payload)
    }
    setForm({ name_ar: '', price: '', category_id: '', is_available: true, image_url: '', station_id: '', sku: '' })
    setImageFile(null)
    setImagePreview(null)
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

  // Stations management
  const createStation = async () => {
    if (!newStationName.trim()) return
    await supabase.from('stations').insert({
      restaurant_id: restaurantId,
      name: newStationName.trim(),
      type: newStationType,
      sort_order: stations.length + 1,
    })
    setNewStationName('')
    fetchData()
  }

  const deleteStation = async (id) => {
    if (!confirm('حذف هذه المحطة؟ سيتم إلغاء ربط المنتجات بها.')) return
    await supabase.from('stations').delete().eq('id', id)
    fetchData()
  }

  // Tables management
  const addTable = async () => {
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => Number(t.table_number) || 0)) + 1 : 1
    await supabase.from('tables').insert({
      restaurant_id: restaurantId,
      table_number: String(nextNum),
      label: `طاولة ${nextNum}`,
    })
    fetchData()
  }

  const deleteTable = async (id) => {
    if (!confirm('حذف هذه الطاولة؟')) return
    await supabase.from('tables').delete().eq('id', id)
    fetchData()
  }

  const tableUrl = (num) => `${window.location.origin}/table/${num}`

  return (
    <div className="p-4 max-w-5xl mx-auto pattern-bg">
      <h1 className="font-display text-3xl font-bold text-white mb-6 animate-fade-in-up">إدارة المنيو 🍽️</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {[{ id: 'products', label: 'المنتجات' }, { id: 'tables', label: 'الطاولات & QR' }, { id: 'stations', label: 'المحطات' }].map(t => (
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

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.station_id}
                  onChange={e => setForm({...form, station_id: e.target.value})}
                  className="w-full bg-surface text-white border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                >
                  <option value="">-- محطة التحضير --</option>
                  {stations.filter(s => s.type === 'kitchen').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input
                  placeholder="الكود (SKU)"
                  value={form.sku}
                  onChange={e => setForm({...form, sku: e.target.value})}
                  className="w-full bg-white/10 text-white placeholder-gray-500 border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">صورة المنتج</label>
                <div className="flex items-center gap-3">
                  {(imagePreview || form.image_url) && (
                    <img
                      src={imagePreview || form.image_url}
                      alt="preview"
                      className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0"
                    />
                  )}
                  <label className="flex-1 cursor-pointer bg-white/5 hover:bg-white/10 border border-dashed border-border rounded-lg px-4 py-3 text-center text-sm text-gray-400 transition-colors">
                    {imageFile ? '✅ تم اختيار صورة' : '📷 اختر صورة'}
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={saveProduct} disabled={uploading} className="flex-1 bg-brand hover:bg-brand-light text-white font-bold py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98] hover:shadow-[0_0_16px_rgba(255,107,53,0.35)] disabled:opacity-50">
                  {uploading ? 'جاري رفع الصورة...' : editId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
                {editId && (
                  <button onClick={() => { setEditId(null); setForm({ name_ar: '', price: '', category_id: '', is_available: true, image_url: '' }); setImageFile(null); setImagePreview(null) }} className="px-4 bg-white/10 text-gray-400 rounded-lg transition-colors hover:bg-white/15">
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Products list */}
          <div className="glass rounded-xl p-5 overflow-y-auto max-h-[500px]">
            <h2 className="text-white font-bold mb-4 font-display">المنتجات (<Counter value={products.length} />)</h2>
            <div className="space-y-1.5">
              {products.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg transition-colors hover:bg-white/[0.07] stagger-item" style={{ animationDelay: `${i * 30}ms` }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name_ar} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0 text-xs">🍽️</div>
                  )}
                  <button
                    onClick={() => toggleAvailable(p.id, p.is_available)}
                    className={`w-8 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${p.is_available ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <span className={`block w-3 h-3 bg-white rounded-full mx-auto transition-transform duration-200 ${p.is_available ? 'translate-x-0' : ''}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs truncate">{p.name_ar}</div>
                    <div className="text-gray-500 text-[10px] flex gap-1.5">
                      <span>{p.categories?.name_ar}</span>
                      {p.stations?.name && <span className="text-brand/70">· {p.stations.name}</span>}
                      {p.sku && <span className="text-gold/70">#{p.sku}</span>}
                    </div>
                  </div>
                  <div className="text-brand font-bold text-xs">{Number(p.price).toFixed(0)}ج</div>
                  <button onClick={() => { setEditId(p.id); setForm({ name_ar: p.name_ar, price: p.price, category_id: p.category_id || '', is_available: p.is_available, image_url: p.image_url || '', station_id: p.station_id || '', sku: p.sku || '' }); setImagePreview(null); setImageFile(null) }} className="text-gray-400 hover:text-white text-xs px-1.5 transition-colors">✏️</button>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300 text-xs px-1 transition-colors">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="glass rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-bold font-display">الطاولات & QR Codes (<Counter value={tables.length} />)</h2>
            <button
              onClick={addTable}
              className="bg-brand hover:bg-brand-light text-white text-sm font-bold px-4 py-2 rounded-lg transition-all duration-200 active:scale-[0.97]"
            >
              + إضافة طاولة
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tables.map((t, i) => (
              <div key={t.id} className="bg-white/5 rounded-xl p-4 text-center transition-all duration-200 hover:bg-white/[0.08] hover:-translate-y-0.5 stagger-item relative group" style={{ animationDelay: `${i * 50}ms` }}>
                <button
                  onClick={() => deleteTable(t.id)}
                  className="absolute top-1 left-1 text-red-400 hover:text-red-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  🗑️
                </button>
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

      {activeTab === 'stations' && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="glass rounded-xl p-5">
            <h2 className="text-white font-bold mb-4 font-display">➕ إضافة محطة عمل</h2>
            <div className="space-y-3">
              <input
                placeholder="اسم المحطة (مثال: المطبخ الرئيسي، الحلواني، كاشير 2)"
                value={newStationName}
                onChange={e => setNewStationName(e.target.value)}
                className="w-full bg-white/10 text-white placeholder-gray-500 border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
              />
              <select
                value={newStationType}
                onChange={e => setNewStationType(e.target.value)}
                className="w-full bg-surface text-white border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
              >
                <option value="kitchen">👨‍🍳 مطبخ / محطة تحضير</option>
                <option value="cashier">🧾 كاشير</option>
              </select>
              <button
                onClick={createStation}
                className="w-full bg-brand hover:bg-brand-light text-white font-bold py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98]"
              >
                إضافة المحطة
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-4 leading-relaxed">
              كل محطة "مطبخ" تقدر تستلم منتجات معينة بس (مثلاً الحلواني يشوف الحلويات بس). محطات "الكاشير" تشوف كل الطلبات الجاهزة من كل المطابخ.
            </p>
          </div>

          <div className="glass rounded-xl p-5">
            <h2 className="text-white font-bold mb-4 font-display">المحطات الحالية (<Counter value={stations.length} />)</h2>
            <div className="space-y-2">
              {stations.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-6">لا توجد محطات بعد</p>
              )}
              {stations.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-center gap-2">
                    <span>{s.type === 'kitchen' ? '👨‍🍳' : '🧾'}</span>
                    <div>
                      <div className="text-white text-sm">{s.name}</div>
                      <div className="text-gray-500 text-xs">{s.type === 'kitchen' ? 'مطبخ' : 'كاشير'}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteStation(s.id)} className="text-red-400 hover:text-red-300 text-sm px-2 transition-colors">🗑️</button>
                </div>
              ))}
            </div>
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

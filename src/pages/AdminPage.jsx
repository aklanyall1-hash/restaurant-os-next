import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function AdminPage() {
  const [restaurants, setRestaurants] = useState([])
  const [profiles, setProfiles] = useState([])
  const [stations, setStations] = useState([])
  const [newRestName, setNewRestName] = useState('')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchAll = async () => {
    const [r, p, s] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*, restaurants(name), stations(name)').order('created_at', { ascending: false }),
      supabase.from('stations').select('*').order('sort_order'),
    ])
    if (r.data) setRestaurants(r.data)
    if (p.data) setProfiles(p.data)
    if (s.data) setStations(s.data)
  }

  useEffect(() => { fetchAll() }, [])

  const createRestaurant = async () => {
    if (!newRestName.trim()) return
    setCreating(true)
    const { error } = await supabase.from('restaurants').insert({ name: newRestName.trim() })
    setCreating(false)
    if (error) {
      setMsg('❌ ' + error.message)
    } else {
      setNewRestName('')
      setMsg('✅ تم إنشاء المطعم')
      fetchAll()
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const assignProfile = async (profileId, updates) => {
    await supabase.from('profiles').update(updates).eq('id', profileId)
    fetchAll()
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pattern-bg">
      <h1 className="font-display text-3xl font-bold text-white mb-2 animate-fade-in-up">لوحة المشرف العام 🛡️</h1>
      <p className="text-gray-500 text-sm mb-6">إدارة المطاعم والمستخدمين على مستوى المنصة</p>

      {/* Create new restaurant */}
      <div className="glass rounded-xl p-5 mb-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <h2 className="text-white font-bold mb-3 font-display">➕ إضافة مطعم جديد</h2>
        <div className="flex gap-3">
          <input
            value={newRestName}
            onChange={e => setNewRestName(e.target.value)}
            placeholder="اسم المطعم"
            className="flex-1 bg-white/10 text-white placeholder-gray-500 border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          <button
            onClick={createRestaurant}
            disabled={creating}
            className="bg-brand hover:bg-brand-light text-white font-bold px-6 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {creating ? '...' : 'إنشاء'}
          </button>
        </div>
        {msg && <div className="text-sm mt-2 text-gray-300">{msg}</div>}
      </div>

      {/* Restaurants list */}
      <div className="glass rounded-xl p-5 mb-6 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <h2 className="text-white font-bold mb-3 font-display">🏪 المطاعم ({restaurants.length})</h2>
        <div className="space-y-2">
          {restaurants.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <div className="text-white">{r.name}</div>
                <div className="text-gray-500 text-xs">{r.id}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${r.is_open ? 'status-ready' : 'status-cancelled'}`}>
                {r.is_open ? 'مفتوح' : 'مغلق'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Users / profiles */}
      <div className="glass rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
        <h2 className="text-white font-bold mb-3 font-display">👥 المستخدمون ({profiles.length})</h2>
        <p className="text-gray-500 text-xs mb-3">لإضافة مستخدم جديد: أنشئ حسابه من Supabase Dashboard ← Authentication ← Add user، وسيظهر هنا لربطه بمطعم.</p>
        <div className="space-y-2">
          {profiles.map(p => {
            const restaurantStations = stations.filter(s => s.restaurant_id === p.restaurant_id && s.type === 'kitchen')
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <div className="text-white text-sm">{p.full_name || p.id.slice(0, 8)}</div>
                  <div className="text-gray-500 text-xs">
                    {p.restaurants?.name || 'بدون مطعم'}
                    {p.stations?.name && ` · ${p.stations.name}`}
                  </div>
                </div>
                <select
                  value={p.restaurant_id || ''}
                  onChange={e => assignProfile(p.id, { restaurant_id: e.target.value || null, station_id: null })}
                  className="bg-surface text-white border border-border rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="">-- بدون مطعم --</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select
                  value={p.role}
                  onChange={e => assignProfile(p.id, { role: e.target.value })}
                  className="bg-surface text-white border border-border rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="staff">موظف</option>
                  <option value="owner">صاحب مطعم</option>
                  <option value="super_admin">مشرف عام</option>
                </select>
                {p.role === 'staff' && p.restaurant_id && (
                  <select
                    value={p.station_id || ''}
                    onChange={e => assignProfile(p.id, { station_id: e.target.value || null })}
                    className="bg-surface text-white border border-border rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value="">-- بدون محطة (يشوف الكل) --</option>
                    {restaurantStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

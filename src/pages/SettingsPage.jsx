import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function SettingsPage() {
  const { restaurantId, refreshProfile } = useAuth()
  const [form, setForm] = useState({ name: '', whatsapp: '', address: '', is_open: true, logo_url: '' })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return
    supabase.from('restaurants').select('*').eq('id', restaurantId).single().then(({ data }) => {
      if (data) setForm({
        name: data.name || '',
        whatsapp: data.whatsapp || '',
        address: data.address || '',
        is_open: data.is_open,
        logo_url: data.logo_url || '',
      })
      setLoading(false)
    })
  }, [restaurantId])

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    setSaving(true)
    setError('')
    let logoUrl = form.logo_url
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const fileName = `${restaurantId}/logo-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, logoFile)
      if (uploadError) {
        setSaving(false)
        setError('فشل رفع الشعار: ' + uploadError.message)
        return
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
      logoUrl = data.publicUrl
    }
    const { error: updateError } = await supabase.from('restaurants').update({ ...form, logo_url: logoUrl }).eq('id', restaurantId)
    if (updateError) {
      setSaving(false)
      setError('فشل حفظ الإعدادات: ' + updateError.message)
      return
    }
    setForm(f => ({ ...f, logo_url: logoUrl }))
    setLogoFile(null)
    setLogoPreview(null)
    setSaving(false)
    setSaved(true)
    refreshProfile?.()
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand animate-pulse">جاري التحميل...</div>
    </div>
  )

  return (
    <div className="p-4 max-w-2xl mx-auto pattern-bg">
      <h1 className="font-display text-3xl font-bold text-white mb-6 animate-fade-in-up">إعدادات المطعم ⚙️</h1>

      <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
        {/* Logo */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">شعار المطعم</label>
          <div className="flex items-center gap-4">
            {(logoPreview || form.logo_url) ? (
              <img src={logoPreview || form.logo_url} alt="logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-2xl">🌟</div>
            )}
            <label className="flex-1 cursor-pointer bg-white/5 hover:bg-white/10 border border-dashed border-border rounded-lg px-4 py-3 text-center text-sm text-gray-400 transition-colors">
              {logoFile ? '✅ تم اختيار شعار جديد' : '📷 تغيير الشعار'}
              <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1.5">اسم المطعم</label>
          <input
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full bg-white/10 text-white border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1.5">رقم الواتساب</label>
          <input
            value={form.whatsapp}
            onChange={e => setForm({...form, whatsapp: e.target.value})}
            placeholder="01xxxxxxxxx"
            className="w-full bg-white/10 text-white placeholder-gray-500 border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1.5">العنوان</label>
          <input
            value={form.address}
            onChange={e => setForm({...form, address: e.target.value})}
            className="w-full bg-white/10 text-white border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <div className="text-white font-medium">حالة المطعم</div>
            <div className="text-gray-500 text-sm">{form.is_open ? 'المطعم مفتوح ويستقبل طلبات' : 'المطعم مغلق - لن يستقبل طلبات جديدة'}</div>
          </div>
          <button
            onClick={() => setForm({...form, is_open: !form.is_open})}
            className={`w-14 h-8 rounded-full transition-all duration-200 flex-shrink-0 relative ${form.is_open ? 'bg-green-500' : 'bg-gray-600'}`}
          >
            <span className={`block w-6 h-6 bg-white rounded-full absolute top-1 transition-transform duration-200 ${form.is_open ? 'right-1' : 'right-7'}`} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-brand hover:bg-brand-light text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 active:scale-[0.98] hover:shadow-[0_0_16px_rgba(255,107,53,0.35)]"
        >
          {saving ? 'جاري الحفظ...' : saved ? '✅ تم الحفظ' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  )
}

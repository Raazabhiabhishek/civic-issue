import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import IssueCard from '../components/IssueCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDate, getErrorMessage } from '../utils/helpers'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiCalendar, FiFileText, FiEdit2, FiCheck, FiX } from 'react-icons/fi'

export default function ProfilePage() {
  const { user, login } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: res } = await api.get('/users/profile')
        setData(res)
        setName(res.user.name)
      } catch (err) {
        toast.error(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleSaveName = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.patch('/users/profile', { name })
      setData(d => ({ ...d, user: { ...d.user, name } }))
      setEditing(false)
      toast.success('Name updated')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner full />

  const u = data?.user || user
  const reports = data?.reports || []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display font-bold text-3xl text-ink-50 mb-8 animate-fade-in">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="space-y-5">
          <div className="card p-6 animate-slide-up text-center">
            <div className="w-20 h-20 bg-civic-500/20 border-2 border-civic-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-civic-400 font-display font-bold text-3xl">{u?.name?.[0]?.toUpperCase()}</span>
            </div>

            {editing ? (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field text-center text-sm flex-1"
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={saving} className="p-2 bg-civic-500/20 text-civic-400 rounded-lg hover:bg-civic-500/30">
                  <FiCheck size={15} />
                </button>
                <button onClick={() => { setEditing(false); setName(u.name) }} className="p-2 bg-ink-700 text-ink-400 rounded-lg hover:bg-ink-600">
                  <FiX size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="font-display font-bold text-xl text-ink-50">{u?.name}</h2>
                <button onClick={() => setEditing(true)} className="text-ink-500 hover:text-ink-300 transition-colors">
                  <FiEdit2 size={13} />
                </button>
              </div>
            )}

            <span className={`inline-flex items-center gap-1 text-xs font-semibold font-body px-2.5 py-1 rounded-full ${
              u?.role === 'admin'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-civic-500/20 text-civic-400 border border-civic-500/30'
            }`}>
              {u?.role === 'admin' ? '🛡️ Admin' : '👤 User'}
            </span>
          </div>

          <div className="card p-5 animate-slide-up stagger-1 space-y-3">
            <h3 className="font-display font-semibold text-ink-100 text-sm">Account Info</h3>
            <div className="space-y-2.5 text-sm font-body">
              <div className="flex items-center gap-3 text-ink-400">
                <FiMail size={14} className="text-ink-600 flex-shrink-0" />
                <span className="truncate">{u?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-ink-400">
                <FiCalendar size={14} className="text-ink-600 flex-shrink-0" />
                Joined {formatDate(u?.createdAt)}
              </div>
              <div className="flex items-center gap-3 text-ink-400">
                <FiFileText size={14} className="text-ink-600 flex-shrink-0" />
                {u?.reportsCount || reports.length} reports submitted
              </div>
            </div>
          </div>
        </div>

        {/* Reports */}
        <div className="lg:col-span-2 animate-slide-up stagger-2">
          <h3 className="font-display font-semibold text-ink-100 mb-4">My Reports</h3>
          {reports.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-ink-400 font-body text-sm">You haven't submitted any reports yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reports.map(r => <IssueCard key={r._id} report={r} compact />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

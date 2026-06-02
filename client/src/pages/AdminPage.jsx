import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminService, reportsService } from '../services/reports'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { timeAgo, CATEGORIES, ADMIN_STATUS_LIST, STATUS_FLOW, getErrorMessage } from '../utils/helpers'
import toast from 'react-hot-toast'
import {
  FiFileText, FiUsers, FiCheckCircle, FiClock,
  FiAlertCircle, FiXCircle, FiSearch, FiRefreshCw,
  FiTrendingUp, FiShield
} from 'react-icons/fi'
import { getSocket } from '../services/socket'

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="card p-5 animate-slide-up">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      {sub !== undefined && (
        <span className="text-ink-500 text-xs font-body">{sub}</span>
      )}
    </div>
    <div className="font-display font-bold text-3xl text-ink-50 mb-1">{value ?? '—'}</div>
    <div className="text-ink-500 text-xs font-body uppercase tracking-wider">{label}</div>
  </div>
)

export default function AdminPage() {
  const [analytics, setAnalytics] = useState(null)
  const [reports, setReports] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [tab, setTab] = useState('overview')
  const [filters, setFilters] = useState({ status: '', category: '', search: '' })
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await adminService.getAnalytics()
        setAnalytics(data.analytics)
      } catch (err) {
        toast.error(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  useEffect(() => {
    if (tab !== 'reports') return
    const fetchReports = async () => {
      setReportsLoading(true)
      try {
        const params = { page, limit: 15 }
        if (filters.status)   params.status   = filters.status
        if (filters.category) params.category = filters.category
        if (filters.search)   params.search   = filters.search
        const { data } = await adminService.getReports(params)
        setReports(data.reports)
        setPagination(data.pagination)
      } catch (err) {
        toast.error(getErrorMessage(err))
      } finally {
        setReportsLoading(false)
      }
    }
    fetchReports()
  }, [tab, filters, page])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onStatusUpdated = async () => {
      try {
        const { data } = await adminService.getAnalytics()
        setAnalytics(data.analytics)

        if (tab === 'reports') {
          const params = { page, limit: 15 }
          if (filters.status) params.status = filters.status
          if (filters.category) params.category = filters.category
          if (filters.search) params.search = filters.search
          const reportsData = await adminService.getReports(params)
          setReports(reportsData.data.reports)
          setPagination(reportsData.data.pagination)
        }
      } catch {
        // Avoid noisy toasts for socket-driven background refresh.
      }
    }

    socket.on('statusUpdated', onStatusUpdated)
    return () => socket.off('statusUpdated', onStatusUpdated)
  }, [tab, page, filters])

  const quickStatusUpdate = async (reportId, newStatus) => {
    setUpdatingId(reportId)
    try {
      await reportsService.updateStatus(reportId, { status: newStatus, note: 'Status updated from admin dashboard' })
      setReports(rs => rs.map(r => r._id === reportId ? { ...r, status: newStatus } : r))
      toast.success(`Status → ${newStatus}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <LoadingSpinner full />

  const a = analytics || {}

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in">
        <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
          <FiShield className="text-amber-400" size={20} />
        </div>
        <div>
          <h1 className="font-display font-bold text-3xl text-ink-50">Admin Panel</h1>
          <p className="text-ink-400 font-body text-sm">System overview and management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-ink-800 p-1 rounded-xl w-fit">
        {['overview', 'reports'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold font-body capitalize transition-all ${
              tab === t ? 'bg-ink-950 text-ink-100 shadow' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Reports"  value={a.totalReports}            icon={FiFileText}    color="bg-blue-500"   />
            <StatCard label="Total Users"    value={a.totalUsers}              icon={FiUsers}       color="bg-purple-500" />
            <StatCard label="Resolved"       value={a.byStatus?.resolved}      icon={FiCheckCircle} color="bg-civic-600"  sub={`${a.resolutionRate}% rate`} />
            <StatCard label="In Progress"    value={a.byStatus?.inProgress}    icon={FiClock}       color="bg-blue-500"  />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status breakdown */}
            <div className="card p-5 animate-slide-up stagger-2">
              <h3 className="font-display font-semibold text-ink-100 mb-5 flex items-center gap-2">
                <FiTrendingUp size={16} /> Status Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Reported',    val: a.byStatus?.reported,   color: 'bg-slate-500' },
                  { label: 'Pending',     val: a.byStatus?.pending,    color: 'bg-yellow-500' },
                  { label: 'Assigned',    val: a.byStatus?.assigned,   color: 'bg-purple-500' },
                  { label: 'In Progress', val: a.byStatus?.inProgress, color: 'bg-blue-500' },
                  { label: 'Resolved',    val: a.byStatus?.resolved,   color: 'bg-civic-500' },
                  { label: 'Verified',    val: a.byStatus?.verified,   color: 'bg-emerald-500' },
                ].map(({ label, val, color }) => {
                  const safeVal = val || 0
                  const pct = a.totalReports ? Math.round((safeVal / a.totalReports) * 100) : 0
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-body mb-1.5">
                        <span className="text-ink-400">{label}</span>
                        <span className="text-ink-300 font-semibold">{safeVal} <span className="text-ink-600">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="card p-5 animate-slide-up stagger-3">
              <h3 className="font-display font-semibold text-ink-100 mb-5">Category Breakdown</h3>
              <div className="space-y-2">
                {(a.categoryBreakdown || []).slice(0, 7).map(({ _id, count }) => (
                  <div key={_id} className="flex items-center justify-between text-sm font-body">
                    <span className="text-ink-400">{_id}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-ink-700 rounded-full overflow-hidden">
                        <div className="h-full bg-civic-500 rounded-full"
                          style={{ width: `${a.totalReports ? Math.round((count / a.totalReports) * 100) : 0}%` }} />
                      </div>
                      <span className="text-ink-300 font-mono text-xs w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent reports */}
          <div className="card p-5 animate-slide-up stagger-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-ink-100">Recent Reports</h3>
              <button onClick={() => setTab('reports')} className="text-civic-400 text-xs font-body hover:text-civic-300">
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {(a.recentReports || []).map(r => (
                <Link key={r._id} to={`/reports/${r._id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-ink-700 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-ink-200 text-sm font-body font-medium truncate group-hover:text-civic-400 transition-colors">{r.title}</p>
                    <p className="text-ink-500 text-xs font-body">{r.category} · {timeAgo(r.createdAt)}</p>
                  </div>
                  <StatusBadge status={r.status} size="sm" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" size={14} />
                  <input
                    type="text"
                    placeholder="Search reports…"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setFilters(f => ({ ...f, search: searchInput })); setPage(1) } }}
                    className="input-field pl-10 text-sm"
                  />
                </div>
              </div>
              <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
                className="input-field w-full sm:w-40 text-sm">
                <option value="">All Statuses</option>
                {STATUS_FLOW.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select value={filters.category} onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1) }}
                className="input-field w-full sm:w-44 text-sm">
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(filters.status || filters.category || filters.search) && (
                <button onClick={() => { setFilters({ status: '', category: '', search: '' }); setSearchInput(''); setPage(1) }}
                  className="btn-secondary text-sm flex items-center gap-1.5">
                  <FiRefreshCw size={13} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {reportsLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-ink-700 bg-ink-900/50">
                      <th className="text-left px-4 py-3 text-ink-500 text-xs uppercase tracking-wider font-semibold">Report</th>
                      <th className="text-left px-4 py-3 text-ink-500 text-xs uppercase tracking-wider font-semibold hidden md:table-cell">Category</th>
                      <th className="text-left px-4 py-3 text-ink-500 text-xs uppercase tracking-wider font-semibold">Status</th>
                      <th className="text-left px-4 py-3 text-ink-500 text-xs uppercase tracking-wider font-semibold hidden lg:table-cell">Reporter</th>
                      <th className="text-left px-4 py-3 text-ink-500 text-xs uppercase tracking-wider font-semibold hidden lg:table-cell">Date</th>
                      <th className="text-left px-4 py-3 text-ink-500 text-xs uppercase tracking-wider font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {reports.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-ink-500">No reports found</td></tr>
                    ) : reports.map(r => (
                      <tr key={r._id} className="hover:bg-ink-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/reports/${r._id}`} className="text-ink-200 hover:text-civic-400 transition-colors font-medium max-w-[200px] block truncate">
                            {r.title}
                          </Link>
                          <span className="text-ink-600 text-xs">{r.upvoteCount || 0} votes · {r.commentCount || 0} comments</span>
                        </td>
                        <td className="px-4 py-3 text-ink-400 hidden md:table-cell">{r.category}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} size="sm" /></td>
                        <td className="px-4 py-3 text-ink-400 hidden lg:table-cell">{r.author?.name}</td>
                        <td className="px-4 py-3 text-ink-500 hidden lg:table-cell">{timeAgo(r.createdAt)}</td>
                        <td className="px-4 py-3">
                          <select
                            value={r.status}
                            onChange={e => quickStatusUpdate(r._id, e.target.value)}
                            disabled={updatingId === r._id}
                            className="bg-ink-700 border border-ink-600 rounded-lg px-2 py-1 text-xs text-ink-200 focus:outline-none focus:ring-1 focus:ring-civic-500 disabled:opacity-50"
                          >
                            {ADMIN_STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-ink-800">
                  <span className="text-ink-500 text-xs font-body">
                    Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">← Prev</button>
                    <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                      className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

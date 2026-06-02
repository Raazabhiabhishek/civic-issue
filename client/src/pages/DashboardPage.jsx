import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiActivity,
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiGrid,
  FiHelpCircle,
  FiHome,
  FiLogOut,
  FiMap,
  FiPieChart,
  FiPlus,
  FiSearch,
  FiSettings,
  FiThumbsUp,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import MapComponent from '../components/MapComponent'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { reportsService } from '../services/reports'
import { CATEGORIES, STATUS_LIST, getErrorMessage, timeAgo } from '../utils/helpers'
import { getSocket } from '../services/socket'

const LEGACY_STATUS_MAP = {
  Submitted: 'Reported',
  Rejected: 'Pending',
}

const normalizeStatus = (status = '') => LEGACY_STATUS_MAP[status] || status

const STATUS_CLASS = {
  Reported: 'bg-slate-500/20 text-slate-300 border border-slate-500/40',
  Pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  Assigned: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  'In Progress': 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  Resolved: 'bg-civic-500/20 text-civic-300 border border-civic-500/40',
  Verified: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
}

const CATEGORY_CLASS = {
  'Road Damage': 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  'Water Supply': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Garbage: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  Sewage: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  'Street Light': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  Traffic: 'bg-red-500/20 text-red-300 border border-red-500/30',
  Other: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
}

const StatCard = ({ label, value, delta, icon: Icon, color }) => (
  <div className="card p-4 border border-ink-700 bg-[#111827] hover:border-civic-500/30 transition-all duration-200">
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] uppercase tracking-wider text-ink-500">{label}</p>
      <span className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
        <Icon size={14} className="text-white" />
      </span>
    </div>
    <p className="text-3xl font-display font-bold text-ink-50 leading-none">{value}</p>
    <p className="text-xs text-civic-400 mt-2">↗ {delta} from last month</p>
  </div>
)

const SidebarItem = ({ icon: Icon, label, active = false, collapsed = false, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? 'bg-civic-500/20 text-civic-300 border border-civic-500/30' : 'text-ink-400 hover:bg-ink-800 hover:text-ink-200'
    }`}
    title={label}
  >
    <Icon size={15} />
    {!collapsed && <span>{label}</span>}
  </button>
)

const IssuesSkeleton = () => (
  <div className="space-y-2.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-ink-900/70 border border-ink-700 rounded-xl p-3 animate-pulse">
        <div className="h-4 bg-ink-700 rounded w-2/3 mb-2" />
        <div className="h-3 bg-ink-700 rounded w-1/3 mb-2" />
        <div className="h-3 bg-ink-700 rounded w-1/2" />
      </div>
    ))}
  </div>
)

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [apiReports, setApiReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ status: '', category: '' })
  const [sortBy, setSortBy] = useState('newest')
  const [quickView, setQuickView] = useState('dashboard')
  const [upvotingId, setUpvotingId] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await reportsService.getAll({ page: 1, limit: 250 })
      const normalized = (data.reports || []).map((report) => ({
        ...report,
        status: normalizeStatus(report.status),
      }))
      setApiReports(normalized)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onStatusUpdated = () => {
      fetchReports()
    }

    socket.on('statusUpdated', onStatusUpdated)
    return () => socket.off('statusUpdated', onStatusUpdated)
  }, [fetchReports])

  const mergedReports = useMemo(() => apiReports, [apiReports])

  const searchedReports = useMemo(() => {
    let list = mergedReports

    const isMine = (report) => {
      const authorId = report.author?._id || report.author
      return String(authorId || '') === String(user?._id || '')
    }

    const isUpvotedByUser = (report) => {
      return (report.upvotes || []).some((id) => String(id) === String(user?._id))
    }

    if (quickView === 'my-issues') {
      list = list.filter((r) => isMine(r))
    }

    if (quickView === 'upvoted') {
      list = list.filter((r) => isUpvotedByUser(r))
    }

    if (searchInput.trim()) {
      const q = searchInput.toLowerCase()
      list = list.filter((r) =>
        `${r.title} ${r.location?.address || ''} ${r.category}`.toLowerCase().includes(q)
      )
    }

    if (filters.status) list = list.filter((r) => normalizeStatus(r.status) === filters.status)
    if (filters.category) list = list.filter((r) => r.category === filters.category)

    if (sortBy === 'upvotes') {
      list = [...list].sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0))
    } else if (sortBy === 'priority') {
      list = [...list].sort((a, b) => {
        const scoreA = (a.upvoteCount || 0) * 3 + (normalizeStatus(a.status) === 'Reported' ? 10 : 0)
        const scoreB = (b.upvoteCount || 0) * 3 + (normalizeStatus(b.status) === 'Reported' ? 10 : 0)
        return scoreB - scoreA
      })
    } else {
      list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    return list
  }, [mergedReports, searchInput, filters, sortBy, quickView, user?._id])

  const handleSidebarAction = (action) => {
    if (action === 'dashboard') {
      setQuickView('dashboard')
      return
    }

    if (action === 'my-issues') {
      setQuickView('my-issues')
      return
    }

    if (action === 'upvoted') {
      setQuickView('upvoted')
      return
    }

    if (action === 'profile') {
      navigate('/profile')
      return
    }

    if (action === 'logout') {
      logout()
      navigate('/login')
      return
    }

    toast('This panel is coming soon.', {
      icon: 'ℹ️',
      style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
    })
  }

  const stats = useMemo(() => {
    const total = mergedReports.length
    const pending = mergedReports.filter((r) => normalizeStatus(r.status) === 'Pending').length
    const inProgress = mergedReports.filter((r) => normalizeStatus(r.status) === 'In Progress').length
    const resolved = mergedReports.filter((r) => ['Resolved', 'Verified'].includes(normalizeStatus(r.status))).length
    return { total, pending, inProgress, resolved }
  }, [mergedReports])

  const trending = useMemo(() => {
    return [...mergedReports].sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0)).slice(0, 5)
  }, [mergedReports])

  const categoryData = useMemo(() => {
    const palette = ['#7c3aed', '#3b82f6', '#22c55e', '#ec4899', '#f97316', '#ef4444']
    const counts = mergedReports.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .map(([category, count], idx) => ({ category, count, color: palette[idx % palette.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [mergedReports])

  const pieParts = useMemo(() => {
    const total = categoryData.reduce((sum, d) => sum + d.count, 0) || 1
    let start = -Math.PI / 2

    return categoryData.map((entry) => {
      const sweep = (entry.count / total) * Math.PI * 2
      const end = start + sweep
      const cx = 74
      const cy = 74
      const r = 62
      const x1 = cx + r * Math.cos(start)
      const y1 = cy + r * Math.sin(start)
      const x2 = cx + r * Math.cos(end)
      const y2 = cy + r * Math.sin(end)
      const large = sweep > Math.PI ? 1 : 0
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
      start = end
      return { ...entry, path }
    })
  }, [categoryData])

  const weekTrend = useMemo(() => {
    const days = []
    const now = new Date()
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      days.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: 0,
      })
    }

    const map = Object.fromEntries(days.map((d) => [d.key, d]))
    mergedReports.forEach((report) => {
      const key = new Date(report.createdAt).toISOString().slice(0, 10)
      if (map[key]) map[key].count += 1
    })

    return days
  }, [mergedReports])

  const linePoints = useMemo(() => {
    const max = Math.max(...weekTrend.map((d) => d.count), 1)
    return weekTrend
      .map((d, idx) => {
        const x = (idx / Math.max(weekTrend.length - 1, 1)) * 220 + 10
        const y = 110 - (d.count / max) * 90
        return `${x},${y}`
      })
      .join(' ')
  }, [weekTrend])

  const handleUpvote = async (report) => {
    setUpvotingId(report._id)
    try {
      const { data } = await reportsService.upvote(report._id)
      setApiReports((prev) =>
        prev.map((item) => {
          if (item._id !== report._id) return item
          const prevUpvotes = item.upvotes || []
          const nextUpvotes = data.upvoted
            ? [...prevUpvotes, user?._id].filter(Boolean)
            : prevUpvotes.filter((id) => String(id) !== String(user?._id))

          return { ...item, upvoteCount: data.upvoteCount, upvotes: nextUpvotes }
        })
      )
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUpvotingId('')
    }
  }

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-4 py-4">
      <div className={`grid grid-cols-1 gap-4 ${sidebarCollapsed ? 'xl:grid-cols-[78px_1fr]' : 'xl:grid-cols-[220px_1fr]'}`}>
        <aside className="card bg-[#0d1628] border-ink-800 p-3 hidden xl:flex xl:flex-col transition-all duration-200">
          <div className="mb-4 px-2">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && <p className="text-civic-400 font-display text-lg font-semibold">CivicReport</p>}
              <button
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="w-7 h-7 rounded-lg border border-ink-700 bg-ink-900/70 text-ink-300 hover:text-white hover:border-civic-500/40 flex items-center justify-center transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <SidebarItem icon={FiHome} label="Dashboard" active={quickView === 'dashboard'} collapsed={sidebarCollapsed} onClick={() => handleSidebarAction('dashboard')} />
            <SidebarItem icon={FiGrid} label="My Issues" active={quickView === 'my-issues'} collapsed={sidebarCollapsed} onClick={() => handleSidebarAction('my-issues')} />
            <SidebarItem icon={FiThumbsUp} label="Upvoted Issues" active={quickView === 'upvoted'} collapsed={sidebarCollapsed} onClick={() => handleSidebarAction('upvoted')} />
            <SidebarItem icon={FiBell} label="Notifications" collapsed={sidebarCollapsed} onClick={() => handleSidebarAction('notifications')} />
            <SidebarItem icon={FiUser} label="Profile" collapsed={sidebarCollapsed} onClick={() => handleSidebarAction('profile')} />
            <SidebarItem icon={FiSettings} label="Settings" collapsed={sidebarCollapsed} onClick={() => handleSidebarAction('settings')} />
            <SidebarItem icon={FiHelpCircle} label="Help & Support" collapsed={sidebarCollapsed} onClick={() => handleSidebarAction('help')} />
            <SidebarItem icon={FiLogOut} label="Logout" collapsed={sidebarCollapsed} onClick={() => handleSidebarAction('logout')} />
          </div>

          {!sidebarCollapsed && (
            <div className="mt-auto rounded-xl border border-civic-500/20 bg-civic-500/10 p-3">
              <p className="text-civic-300 font-semibold text-sm mb-1">Live City Feed</p>
              <p className="text-ink-400 text-xs leading-relaxed">
                You're viewing only real issues from your connected CivicReport backend.
              </p>
              <Link to="/report" className="btn-primary mt-3 w-full text-center text-xs py-2 inline-block">
                Report Issue
              </Link>
            </div>
          )}
        </aside>

        <main className="space-y-4">
          <section className="card bg-[#0b172d] border-ink-800 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-display font-bold text-ink-50">
                  Welcome back, {user?.name?.split(' ')[0] || 'Citizen'}
                </h1>
                <p className="text-ink-400 text-sm mt-1">Here is what is happening in your community</p>
              </div>
              <div className="flex gap-2">
                <Link to="/map" className="btn-secondary text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
                  <FiMap size={15} /> Map View
                </Link>
                <Link to="/report" className="btn-primary text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
                  <FiPlus size={15} /> Report Issue
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard label="Total Issues" value={stats.total} delta="12%" icon={FiAlertTriangle} color="bg-slate-600" />
              <StatCard label="Pending" value={stats.pending} delta="8%" icon={FiClock} color="bg-amber-500" />
              <StatCard label="In Progress" value={stats.inProgress} delta="5%" icon={FiActivity} color="bg-blue-500" />
              <StatCard label="Resolved" value={stats.resolved} delta="20%" icon={FiCheckCircle} color="bg-civic-600" />
            </div>
          </section>

          <section className="grid grid-cols-1 2xl:grid-cols-[1.25fr_1fr] gap-4">
            <div className="card bg-[#0f1a30] border-ink-800 p-4">
              <div className="flex flex-col lg:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={14} />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search issues..."
                    className="input-field pl-9 py-2.5 text-sm"
                  />
                </div>

                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="input-field py-2.5 text-sm w-full lg:w-40"
                >
                  <option value="">All Statuses</option>
                  {STATUS_LIST.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <select
                  value={filters.category}
                  onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                  className="input-field py-2.5 text-sm w-full lg:w-40"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field py-2.5 text-sm w-full lg:w-36"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="upvotes">Sort: Upvotes</option>
                  <option value="priority">Sort: Priority</option>
                </select>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-ink-200 text-sm font-semibold">Recent Issues</p>
                <button
                  onClick={() => {
                    setSearchInput('')
                    setFilters({ status: '', category: '' })
                    setSortBy('newest')
                  }}
                  className="text-civic-400 hover:text-civic-300 text-xs flex items-center gap-1"
                >
                  Clear <FiChevronRight size={12} />
                </button>
              </div>

              {loading ? (
                <IssuesSkeleton />
              ) : searchedReports.length === 0 ? (
                <div className="rounded-xl p-4 border border-ink-700 bg-ink-900/60 text-center">
                  <p className="text-ink-200 font-semibold mb-1">No issues found</p>
                  <p className="text-ink-500 text-sm">Try changing filters or search nearby issue keywords.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {searchedReports.slice(0, 6).map((report) => {
                    const userUpvoted = (report.upvotes || []).some((id) => String(id) === String(user?._id))

                    return (
                      <div
                        key={report._id}
                        className="rounded-xl border border-ink-700 bg-ink-900/60 p-2.5 hover:border-civic-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={report.images?.[0]?.url || placeholderImage('Civic Issue', '#1f2937')}
                            alt={report.title}
                            className="w-14 h-14 rounded-md object-cover border border-ink-700"
                          />

                          <div className="min-w-0 flex-1">
                            <Link to={`/reports/${report._id}`} className="text-sm text-ink-100 font-semibold truncate block hover:text-civic-300">
                              {report.title}
                            </Link>
                            <p className="text-xs text-ink-500 truncate">{report.location?.address || 'Location unavailable'}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_CLASS[report.category] || CATEGORY_CLASS.Other}`}>
                                {report.category}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_CLASS[normalizeStatus(report.status)] || 'bg-ink-700 text-ink-300 border border-ink-600'}`}>
                                {normalizeStatus(report.status)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <button
                              onClick={() => handleUpvote(report)}
                              disabled={upvotingId === report._id}
                              className={`px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 ml-auto ${
                                userUpvoted
                                  ? 'bg-civic-500/20 text-civic-300 border-civic-500/30'
                                  : 'bg-ink-800 text-ink-300 border-ink-600 hover:border-civic-500/30'
                              }`}
                            >
                              <FiThumbsUp size={11} />
                              {upvotingId === report._id ? '...' : report.upvoteCount || 0}
                            </button>
                            <p className="text-[11px] text-ink-500 mt-1">{timeAgo(report.createdAt)}</p>
                            {userUpvoted && <p className="text-[10px] text-civic-400 mt-0.5">You already upvoted</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card bg-[#0f1a30] border-ink-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-ink-100 font-semibold">Issue Map</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-ink-400"><span className="w-2 h-2 rounded-full bg-civic-500" /> Low</span>
                  <span className="flex items-center gap-1 text-ink-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium</span>
                  <span className="flex items-center gap-1 text-ink-400"><span className="w-2 h-2 rounded-full bg-red-500" /> High</span>
                </div>
              </div>
              <div className="h-[390px] rounded-xl overflow-hidden border border-ink-700 mb-3">
                <MapComponent reports={mergedReports.slice(0, 120)} center={[26.4499, 80.3319]} zoom={12} height="100%" />
              </div>
              <Link to="/map" className="btn-secondary text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
                <FiMap size={13} /> View Full Map
              </Link>
            </div>
          </section>

          <section id="analytics" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="card bg-[#0f1a30] border-ink-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-ink-100 font-semibold flex items-center gap-2"><FiTrendingUp size={14} /> Trending Issues</h3>
                <Link to="/dashboard#analytics" className="text-civic-400 text-xs hover:text-civic-300">View All</Link>
              </div>
              <div className="space-y-2">
                {trending.slice(0, 5).map((issue, idx) => (
                  <Link key={issue._id} to={`/reports/${issue._id}`} className="block rounded-lg border border-ink-700 p-2.5 hover:border-civic-500/30 transition-colors">
                    <p className="text-sm text-ink-100">{idx + 1}. {issue.title}</p>
                    <p className="text-xs text-ink-500 mt-1">👍 {issue.upvoteCount || 0} upvotes</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="card bg-[#0f1a30] border-ink-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-ink-100 font-semibold flex items-center gap-2"><FiPieChart size={14} /> Issues by Category</h3>
                <Link to="/dashboard#analytics" className="text-civic-400 text-xs hover:text-civic-300">View All</Link>
              </div>
              <div className="flex items-center gap-4">
                <svg width="148" height="148" viewBox="0 0 148 148" className="flex-shrink-0">
                  {pieParts.map((part) => (
                    <path key={part.category} d={part.path} fill={part.color} />
                  ))}
                  <circle cx="74" cy="74" r="26" fill="#0f172a" />
                  <text x="74" y="72" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600">{stats.total}</text>
                  <text x="74" y="84" textAnchor="middle" fill="#64748b" fontSize="8">Total</text>
                </svg>
                <div className="space-y-1.5">
                  {categoryData.map((item) => (
                    <div key={item.category} className="flex items-center gap-2 text-xs text-ink-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate max-w-[120px]">{item.category}</span>
                      <span className="text-ink-500">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card bg-[#0f1a30] border-ink-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-ink-100 font-semibold flex items-center gap-2"><FiActivity size={14} /> Issues Over Time (7 Days)</h3>
                <Link to="/dashboard#analytics" className="text-civic-400 text-xs hover:text-civic-300">View All</Link>
              </div>
              <svg width="240" height="130" viewBox="0 0 240 130">
                <polyline points={linePoints} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {weekTrend.map((day, idx) => {
                  const max = Math.max(...weekTrend.map((d) => d.count), 1)
                  const x = (idx / Math.max(weekTrend.length - 1, 1)) * 220 + 10
                  const y = 110 - (day.count / max) * 90
                  return <circle key={day.key} cx={x} cy={y} r="3" fill="#60a5fa" />
                })}
              </svg>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-ink-500 mt-1">
                {weekTrend.map((day) => (
                  <span key={day.key} className="text-center">{day.label}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="card bg-[#0f1a30] border-ink-800 p-4">
            <p className="text-ink-100 font-semibold mb-3">How It Works</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="border border-ink-700 rounded-xl p-3 bg-ink-900/50">
                <p className="text-civic-300 text-xs font-semibold mb-1">1. Report</p>
                <p className="text-ink-400 text-xs">Citizens report issues with photo and location.</p>
              </div>
              <div className="border border-ink-700 rounded-xl p-3 bg-ink-900/50">
                <p className="text-civic-300 text-xs font-semibold mb-1">2. Upvote</p>
                <p className="text-ink-400 text-xs">Community voting increases issue priority.</p>
              </div>
              <div className="border border-ink-700 rounded-xl p-3 bg-ink-900/50">
                <p className="text-civic-300 text-xs font-semibold mb-1">3. Action</p>
                <p className="text-ink-400 text-xs">Authorities take action based on urgency and votes.</p>
              </div>
              <div className="border border-ink-700 rounded-xl p-3 bg-ink-900/50">
                <p className="text-civic-300 text-xs font-semibold mb-1">4. Resolve</p>
                <p className="text-ink-400 text-xs">Resolved issues are tracked for transparency.</p>
              </div>
            </div>
          </section>

          {loading && (
            <div className="flex justify-center py-6">
              <LoadingSpinner />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

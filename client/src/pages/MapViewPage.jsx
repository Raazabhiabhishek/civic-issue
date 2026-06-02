import { useState, useEffect } from 'react'
import { reportsService } from '../services/reports'
import MapComponent from '../components/MapComponent'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { CATEGORIES, STATUS_LIST, CATEGORY_ICONS, getErrorMessage } from '../utils/helpers'
import toast from 'react-hot-toast'
import { FiX, FiList } from 'react-icons/fi'

const LEGACY_STATUS_MAP = {
  Submitted: 'Reported',
  Rejected: 'Pending',
}

const normalizeStatus = (status = '') => LEGACY_STATUS_MAP[status] || status

export default function MapViewPage() {
  const [reports, setReports] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', category: '' })
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data } = await reportsService.getAll({ limit: 500 })
        const normalized = (data.reports || []).map((report) => ({
          ...report,
          status: normalizeStatus(report.status),
        }))
        setReports(normalized)
        setFiltered(normalized)
      } catch (err) {
        toast.error(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  useEffect(() => {
    let result = reports
    if (filters.status)   result = result.filter(r => normalizeStatus(r.status) === filters.status)
    if (filters.category) result = result.filter(r => r.category === filters.category)
    setFiltered(result)
  }, [filters, reports])

  const statusCounts = STATUS_LIST.reduce((acc, s) => {
    acc[s] = reports.filter(r => r.status === s).length
    return acc
  }, {})

  if (loading) return <LoadingSpinner full />

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="bg-ink-900 border-b border-ink-800 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-ink-100 font-display font-semibold">
          <span>Map View</span>
          <span className="text-civic-400 text-sm">({filtered.length} issues)</span>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Status filter */}
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="input-field py-1.5 text-xs w-36"
          >
            <option value="">All Statuses</option>
            {STATUS_LIST.map(s => (
              <option key={s} value={s}>{s} ({statusCounts[s]})</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            className="input-field py-1.5 text-xs w-40"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
          </select>

          {(filters.status || filters.category) && (
            <button
              onClick={() => setFilters({ status: '', category: '' })}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors font-body"
            >
              <FiX size={13} /> Clear
            </button>
          )}

          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <FiList size={13} /> Legend
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1">
          <MapComponent reports={filtered} zoom={5} height="100%" />
        </div>

        {/* Legend / stats panel */}
        {panelOpen && (
          <div className="w-64 bg-ink-900 border-l border-ink-800 overflow-y-auto flex-shrink-0 animate-fade-in">
            <div className="p-4 border-b border-ink-800 flex items-center justify-between">
              <span className="font-display font-semibold text-ink-100 text-sm">Map Legend</span>
              <button onClick={() => setPanelOpen(false)} className="text-ink-500 hover:text-ink-300">
                <FiX size={16} />
              </button>
            </div>

            {/* Status indicators */}
            <div className="p-4 border-b border-ink-800">
              <p className="label mb-3">By Status</p>
              <div className="space-y-2">
                {[
                  { status: 'Reported',   color: '#94a3b8' },
                  { status: 'Pending',    color: '#eab308' },
                  { status: 'Assigned',   color: '#a855f7' },
                  { status: 'In Progress', color: '#3b82f6' },
                  { status: 'Resolved',    color: '#22c55e' },
                  { status: 'Verified',    color: '#10b981' },
                ].map(({ status, color }) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="18" viewBox="0 0 14 18">
                        <path d="M7 0C3.134 0 0 3.134 0 7c0 4.667 7 11 7 11s7-6.333 7-11C14 3.134 10.866 0 7 0z"
                          fill={color} />
                      </svg>
                      <span className="text-ink-300 text-xs font-body">{status}</span>
                    </div>
                    <span className="text-ink-500 text-xs font-mono">{statusCounts[status]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="p-4">
              <p className="label mb-3">By Category</p>
              <div className="space-y-1.5">
                {CATEGORIES.map(cat => {
                  const count = reports.filter(r => r.category === cat).length
                  if (count === 0) return null
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-ink-400 text-xs font-body flex items-center gap-1.5">
                        <span>{CATEGORY_ICONS[cat]}</span> {cat}
                      </span>
                      <span className="text-ink-500 text-xs font-mono">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

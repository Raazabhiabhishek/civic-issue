import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminService, reportsService } from '../services/reports'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  ADMIN_STATUS_LIST,
  CATEGORY_ICONS,
  STATUS_FLOW,
  formatDate,
  getErrorMessage,
  timeAgo,
} from '../utils/helpers'
import toast from 'react-hot-toast'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiMapPin,
  FiShield,
  FiUploadCloud,
  FiUser,
} from 'react-icons/fi'
import { getSocket } from '../services/socket'

const LEGACY_STATUS_MAP = {
  Submitted: 'Reported',
  Rejected: 'Pending',
}

const normalizeStatus = (status = '') => LEGACY_STATUS_MAP[status] || status

const getHistoryActorLabel = (item) => {
  if (item.updatedByRole === 'admin') return 'Admin'
  if (item.updatedByRole === 'worker') return 'Worker'
  if (item.updatedByRole === 'user') return 'User'
  return item.updatedBy?.role === 'admin' ? 'Admin' : 'Worker'
}

export default function ReportDetailPage() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workers, setWorkers] = useState([])
  const [workerLoading, setWorkerLoading] = useState(false)
  const [statusUpdate, setStatusUpdate] = useState('Reported')
  const [assignedTo, setAssignedTo] = useState('')
  const [note, setNote] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [afterImageFile, setAfterImageFile] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const feedRef = useRef(null)

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const { data } = await reportsService.getIssueById(id)
        const nextStatus = normalizeStatus(data.report.status)
        setReport({ ...data.report, status: nextStatus })
        setStatusUpdate(nextStatus)
        setAdminNotes(data.report.adminNotes || '')
        setAssignedTo(data.report.assignedTo?._id || '')
      } catch (err) {
        toast.error(getErrorMessage(err))
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchIssue()
  }, [id, navigate])

  useEffect(() => {
    if (!isAdmin) return

    const fetchWorkers = async () => {
      setWorkerLoading(true)
      try {
        const { data } = await adminService.getWorkers()
        setWorkers(data.workers || [])
      } catch (err) {
        toast.error(getErrorMessage(err))
      } finally {
        setWorkerLoading(false)
      }
    }
    fetchWorkers()
  }, [id, isAdmin])

  useEffect(() => {
    if (!feedRef.current) return
    feedRef.current.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [report?.statusHistory?.length])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onStatusUpdated = (payload) => {
      if (payload?.issueId === id) {
        refreshIssue()
      }
    }

    socket.on('statusUpdated', onStatusUpdated)
    return () => socket.off('statusUpdated', onStatusUpdated)
  }, [id])

  const history = useMemo(() => {
    const entries = report?.statusHistory || []
    return [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }, [report?.statusHistory])

  const currentStatus = normalizeStatus(report?.status || 'Reported')
  const currentStatusIndex = Math.max(0, STATUS_FLOW.indexOf(currentStatus))
  const isAuthor = report?.author?._id?.toString() === user?._id?.toString()
  const canVerify = isAuthor && currentStatus === 'Resolved'
  const coordinates = report?.location?.coordinates
  const locationText = report?.location?.address?.trim()
    || (Array.isArray(coordinates) && coordinates.length === 2
      ? `Lat: ${coordinates[1].toFixed(5)}, Lng: ${coordinates[0].toFixed(5)}`
      : 'Location not available')

  const findStatusTimestamp = (status) => {
    const entry = [...history].reverse().find((item) => normalizeStatus(item.status) === status)
    return entry?.timestamp || null
  }

  const refreshIssue = async () => {
    const { data } = await reportsService.getIssueById(id)
    const nextStatus = normalizeStatus(data.report.status)
    setReport({ ...data.report, status: nextStatus })
    setStatusUpdate(nextStatus)
    setAdminNotes(data.report.adminNotes || '')
    setAssignedTo(data.report.assignedTo?._id || '')
  }

  const handleStatusUpdate = async () => {
    if (!statusUpdate) return
    setUpdatingStatus(true)
    try {
      const payload = new FormData()
      payload.append('status', statusUpdate)
      payload.append('assignedTo', assignedTo || '')
      payload.append('note', note.trim())
      payload.append('adminNotes', adminNotes)
      if (afterImageFile) {
        payload.append('afterImage', afterImageFile)
      }

      const { data } = await reportsService.updateIssueStatus(id, payload)
      setReport({ ...data.report, status: normalizeStatus(data.report.status) })
      setNote('')
      setAfterImageFile(null)
      toast.success('Status updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleVerification = async (nextStatus) => {
    setVerifying(true)
    try {
      const verificationNote =
        nextStatus === 'Verified'
          ? 'Citizen confirmed the issue has been resolved.'
          : 'Citizen reported issue is still unresolved.'

      await reportsService.updateIssueStatus(id, {
        status: nextStatus,
        note: verificationNote,
      })
      await refreshIssue()
      toast.success('Verification submitted')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setVerifying(false)
    }
  }

  if (loading) return <LoadingSpinner full />
  if (!report)  return null

  const catIcon = CATEGORY_ICONS[report.category] || '📌'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-ink-400 hover:text-ink-100 text-sm font-body mb-6 transition-colors"
      >
        <FiArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6 rounded-2xl bg-[#111827] border border-ink-700/70 shadow-card animate-fade-in">
            <div className="flex flex-col md:flex-row gap-5">
              {report.images?.[0]?.url && (
                <img
                  src={report.images[0].url}
                  alt={report.title}
                  className="w-full md:w-60 h-44 rounded-xl object-cover border border-ink-700"
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm text-ink-500 font-body mb-1">Issue Summary</p>
                    <h1 className="font-display font-semibold text-2xl text-ink-50 leading-tight">
                      {catIcon} {report.title}
                    </h1>
                  </div>
                  <StatusBadge status={currentStatus} size="lg" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-body">
                  <div className="rounded-xl bg-[#0B1220] border border-ink-700/70 px-3 py-2">
                    <p className="text-ink-500">Category</p>
                    <p className="text-ink-200 font-medium">{report.category}</p>
                  </div>
                  <div className="rounded-xl bg-[#0B1220] border border-ink-700/70 px-3 py-2">
                    <p className="text-ink-500">Created</p>
                    <p className="text-ink-200 font-medium">{formatDate(report.createdAt, 'MMM d, yyyy p')}</p>
                  </div>
                  <div className="rounded-xl bg-[#0B1220] border border-ink-700/70 px-3 py-2 sm:col-span-2">
                    <p className="text-ink-500 flex items-center gap-1"><FiMapPin size={14} /> Location</p>
                    <p className="text-ink-200 font-medium">{locationText}</p>
                  </div>
                </div>

                <div className="mt-4 text-sm text-ink-400 font-body flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5"><FiUser size={13} /> {report.author?.name || 'Unknown'}</span>
                  <span className="inline-flex items-center gap-1.5"><FiClock size={13} /> {timeAgo(report.createdAt)}</span>
                </div>
              </div>
            </div>

            {(report.images?.[0]?.url || report.afterImage?.url) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-ink-700 bg-[#0B1220] p-3">
                  <p className="text-xs uppercase tracking-wider text-ink-500 mb-2">Before Image</p>
                  {report.images?.[0]?.url ? (
                    <img src={report.images[0].url} alt="Before issue" className="w-full h-52 object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-52 rounded-lg bg-ink-900 flex items-center justify-center text-ink-500 text-sm">No before image</div>
                  )}
                </div>

                <div className="rounded-xl border border-ink-700 bg-[#0B1220] p-3">
                  <p className="text-xs uppercase tracking-wider text-ink-500 mb-2">After Image</p>
                  {report.afterImage?.url ? (
                    <img src={report.afterImage.url} alt="After resolution" className="w-full h-52 object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-52 rounded-lg bg-ink-900 flex items-center justify-center text-ink-500 text-sm">Not uploaded yet</div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="card p-6 rounded-2xl bg-[#111827] border border-ink-700/70 shadow-card animate-slide-up">
            <h2 className="text-lg text-ink-100 font-display font-semibold mb-5">Status Timeline</h2>
            <div className="space-y-5">
              {STATUS_FLOW.map((step, index) => {
                const isCompleted = index < currentStatusIndex
                const isCurrent = index === currentStatusIndex
                const timestamp = findStatusTimestamp(step)

                return (
                  <div key={step} className="relative pl-12">
                    {index < STATUS_FLOW.length - 1 && (
                      <span
                        className={`absolute left-5 top-7 h-12 w-[2px] rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-civic-500' : 'bg-ink-700'
                        }`}
                      />
                    )}

                    <span
                      className={`absolute left-0 top-0 h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-500 ${
                        isCompleted
                          ? 'bg-civic-500 border-civic-400 text-white'
                          : isCurrent
                            ? 'bg-civic-500/20 border-civic-400 text-civic-300 shadow-[0_0_18px_rgba(34,197,94,0.35)]'
                            : 'bg-ink-900 border-ink-700 text-ink-500'
                      }`}
                    >
                      {isCompleted ? <FiCheck size={16} /> : <span className="text-xs font-semibold">{index + 1}</span>}
                    </span>

                    <div className={`rounded-xl px-4 py-3 border transition-all duration-300 ${isCurrent ? 'border-civic-500/40 bg-civic-500/10' : 'border-ink-700 bg-[#0B1220]'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <StatusBadge status={step} size="md" />
                        <span className="text-xs text-ink-500 flex items-center gap-1.5">
                          <FiCalendar size={12} />
                          {timestamp ? formatDate(timestamp, 'MMM d, yyyy p') : 'Awaiting update'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="card p-6 rounded-2xl bg-[#111827] border border-ink-700/70 shadow-card animate-slide-up stagger-1">
            <h2 className="text-lg text-ink-100 font-display font-semibold mb-4">Status Updates</h2>
            <div ref={feedRef} className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {history.length === 0 && (
                <p className="text-sm text-ink-500 font-body">No status updates yet.</p>
              )}

              {history.map((item) => (
                <div key={item._id} className="rounded-xl bg-[#0B1220] border border-ink-700/70 p-4 hover:border-civic-500/40 transition-all duration-200">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <StatusBadge status={normalizeStatus(item.status)} size="sm" />
                    <span className="text-xs text-ink-500">{formatDate(item.timestamp, 'MMM d, yyyy p')}</span>
                  </div>
                  <p className="text-sm text-ink-200 font-body leading-relaxed mb-2">
                    {item.note || 'Status updated'}
                  </p>
                  <p className="text-xs text-ink-500 font-body">
                    Updated by {getHistoryActorLabel(item)}
                    {item.updatedBy?.name ? ` · ${item.updatedBy.name}` : item.updatedByName ? ` · ${item.updatedByName}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {canVerify && (
            <section className="rounded-2xl border border-civic-500/30 bg-civic-500/10 p-5 animate-slide-up stagger-2">
              <h3 className="text-civic-300 font-display font-semibold text-lg mb-2">Was your issue resolved?</h3>
              <p className="text-sm text-civic-100/90 font-body mb-4">
                Your confirmation helps CivicReport close cases faster and improve transparency.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={verifying}
                  onClick={() => handleVerification('Verified')}
                  className="btn-primary"
                >
                  {verifying ? 'Submitting...' : 'Yes, verify issue'}
                </button>
                <button
                  disabled={verifying}
                  onClick={() => handleVerification('In Progress')}
                  className="btn-secondary"
                >
                  {verifying ? 'Submitting...' : 'No, reopen issue'}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card p-5 rounded-2xl bg-[#111827] border border-ink-700/70 shadow-card animate-slide-up">
            <h3 className="text-ink-100 text-sm font-semibold font-display mb-3">Current Status</h3>
            <StatusBadge status={currentStatus} size="lg" />
            {report.assignedTo?.name && (
              <p className="text-sm text-ink-300 mt-3 font-body">
                Assigned to <span className="text-civic-300 font-medium">{report.assignedTo.name}</span>
              </p>
            )}
          </section>

          {isAdmin && (
            <section className="rounded-2xl border border-civic-500/30 bg-[#111827] p-5 shadow-card animate-slide-up stagger-1">
              <h2 className="text-civic-300 text-sm font-semibold font-display mb-4 flex items-center gap-2">
                <FiShield size={14} /> Admin Control Panel
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="label mb-2 block">Status</label>
                  <select
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    className="input-field"
                  >
                    {ADMIN_STATUS_LIST.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label mb-2 block">Assign Worker</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="input-field"
                    disabled={workerLoading}
                  >
                    <option value="">Unassigned</option>
                    {workers.map((worker) => (
                      <option key={worker._id} value={worker._id}>{worker.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label mb-2 block">Update Note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Write a timeline update note..."
                  />
                </div>

                <div>
                  <label className="label mb-2 block">Admin Message</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Public message shown to the user..."
                  />
                </div>

                <div>
                  <label className="label mb-2 block">After Image (Optional)</label>
                  <label className="input-field flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-ink-400 truncate">
                      {afterImageFile ? afterImageFile.name : 'Upload resolution proof image'}
                    </span>
                    <FiUploadCloud className="text-civic-400" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setAfterImageFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <button
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {updatingStatus && <LoadingSpinner size="sm" />}
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </section>
          )}

          {report.adminNotes && (
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 animate-slide-up stagger-2">
              <p className="text-amber-300 text-xs uppercase tracking-widest font-semibold mb-1">Latest Admin Message</p>
              <p className="text-amber-100 text-sm font-body leading-relaxed">{report.adminNotes}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

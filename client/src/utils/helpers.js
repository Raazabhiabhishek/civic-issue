import { formatDistanceToNow, format } from 'date-fns'

export const timeAgo = (date) => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

export const formatDate = (date, fmt = 'MMM d, yyyy') => {
  try {
    return format(new Date(date), fmt)
  } catch {
    return 'Unknown'
  }
}

export const STATUS_CONFIG = {
  Reported: {
    color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
    label: 'Reported',
  },
  Pending: {
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    dot: 'bg-yellow-400',
    label: 'Pending',
  },
  Assigned: {
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
    label: 'Assigned',
  },
  'In Progress': {
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
    label: 'In Progress',
  },
  Resolved: {
    color: 'bg-civic-500/20 text-civic-300 border-civic-500/30',
    dot: 'bg-civic-400',
    label: 'Resolved',
  },
  Verified: {
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    label: 'Verified',
  },
  // Legacy aliases for old database values.
  Submitted: {
    color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
    label: 'Reported',
  },
  Rejected: {
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    dot: 'bg-yellow-400',
    label: 'Pending',
  },
}

export const CATEGORIES = [
  'Road Damage',
  'Street Light',
  'Garbage',
  'Water Supply',
  'Sewage',
  'Public Safety',
  'Park & Recreation',
  'Traffic',
  'Other',
]

export const CATEGORY_ICONS = {
  'Road Damage':      '🛣️',
  'Street Light':     '💡',
  'Garbage':          '🗑️',
  'Water Supply':     '💧',
  'Sewage':           '🚰',
  'Public Safety':    '🛡️',
  'Park & Recreation':'🌳',
  'Traffic':          '🚦',
  'Other':            '📌',
}

export const STATUS_FLOW = ['Reported', 'Pending', 'Assigned', 'In Progress', 'Resolved', 'Verified']

export const ADMIN_STATUS_LIST = ['Reported', 'Pending', 'Assigned', 'In Progress', 'Resolved']

export const STATUS_LIST = [...STATUS_FLOW]

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong'

export const truncate = (str, n = 120) =>
  str?.length > n ? str.slice(0, n) + '…' : str

import { Link } from 'react-router-dom'
import { FiMapPin, FiThumbsUp, FiMessageCircle, FiClock } from 'react-icons/fi'
import StatusBadge from './StatusBadge'
import { timeAgo, truncate, CATEGORY_ICONS } from '../utils/helpers'

export default function IssueCard({ report, compact = false }) {
  if (!report) return null

  const icon = CATEGORY_ICONS[report.category] || '📌'
  const hasImage = report.images?.length > 0

  return (
    <Link
      to={`/reports/${report._id}`}
      className="card block hover:border-ink-600 hover:bg-ink-750 transition-all duration-200 overflow-hidden group animate-slide-up"
    >
      {/* Image */}
      {!compact && hasImage && (
        <div className="aspect-video overflow-hidden bg-ink-900">
          <img
            src={report.images[0].url}
            alt={report.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <h3 className="font-display font-semibold text-ink-100 text-sm leading-snug group-hover:text-civic-400 transition-colors truncate">
              {report.title}
            </h3>
          </div>
          <StatusBadge status={report.status} size="sm" />
        </div>

        {/* Description */}
        {!compact && (
          <p className="text-ink-400 text-xs font-body leading-relaxed mb-3">
            {truncate(report.description, 100)}
          </p>
        )}

        {/* Category pill */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs font-semibold font-body px-2 py-0.5 bg-ink-700 text-ink-300 rounded-lg">
            {report.category}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-ink-500 text-xs font-body">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FiThumbsUp size={11} />
              {report.upvoteCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <FiMessageCircle size={11} />
              {report.commentCount || 0}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {report.location?.address && (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <FiMapPin size={11} />
                <span className="truncate">{report.location.address}</span>
              </span>
            )}
            <span className="flex items-center gap-1 flex-shrink-0">
              <FiClock size={11} />
              {timeAgo(report.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FiMap, FiPlusCircle, FiGrid, FiUser, FiShield,
  FiLogOut, FiMenu, FiX, FiAlertCircle, FiBarChart2, FiBell
} from 'react-icons/fi'
import { notificationService } from '../services/reports'
import { getSocket } from '../services/socket'
import { timeAgo } from '../utils/helpers'

const NavItem = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold font-body transition-all duration-200 ${
        isActive
          ? 'bg-civic-500/20 text-civic-400'
          : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800'
      }`
    }
  >
    <Icon size={16} />
    {label}
  </NavLink>
)

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  )

  const refreshNotifications = async () => {
    try {
      const { data } = await notificationService.getAll({ limit: 15 })
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // Avoid noisy toasts for periodic refresh in navbar.
    }
  }

  useEffect(() => {
    if (!user?._id) return
    refreshNotifications()
  }, [user?._id])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user?._id) return

    const onStatusUpdated = (payload) => {
      if (payload?.authorId === user._id) {
        refreshNotifications()
      }
    }

    socket.on('statusUpdated', onStatusUpdated)
    return () => socket.off('statusUpdated', onStatusUpdated)
  }, [user?._id])

  useEffect(() => {
    if (!showNotifications || unreadNotifications === 0) return

    const markRead = async () => {
      try {
        await notificationService.markAllRead()
        setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
        setUnreadCount(0)
      } catch {
        // No-op
      }
    }

    markRead()
  }, [showNotifications, unreadNotifications])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const close = () => setMobileOpen(false)

  return (
    <nav className="sticky top-0 z-50 bg-ink-950/80 backdrop-blur-xl border-b border-ink-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-civic-500 rounded-lg flex items-center justify-center">
              <FiAlertCircle className="text-white" size={18} />
            </div>
            <span className="font-display font-bold text-lg text-ink-50 tracking-tight">
              CivicReport
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavItem to="/dashboard" icon={FiGrid}      label="Dashboard" />
            <NavItem to="/map"       icon={FiMap}       label="Map View" />
            <NavItem to="/report"    icon={FiPlusCircle} label="Report Issue" />
            <NavItem to="/dashboard#analytics" icon={FiBarChart2} label="Analytics" />
            {isAdmin && <NavItem to="/admin" icon={FiShield} label="Admin" />}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifications((value) => !value)}
                className="relative p-2 text-ink-500 hover:text-ink-100 transition-colors rounded-xl hover:bg-ink-800"
              >
                <FiBell size={16} />
                {(unreadCount > 0 || unreadNotifications > 0) && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-civic-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {Math.min(99, unreadCount || unreadNotifications)}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-ink-700 flex items-center justify-between">
                    <p className="text-ink-100 text-sm font-semibold">Notifications</p>
                    <span className="text-xs text-ink-500">{notifications.length} total</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-ink-500 text-sm p-4">No notifications yet.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item._id}
                          className={`px-4 py-3 border-b border-ink-800/70 ${item.read ? 'bg-transparent' : 'bg-civic-500/10'}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 w-2 h-2 rounded-full ${item.read ? 'bg-ink-600' : 'bg-civic-400'}`} />
                            <div className="min-w-0">
                              <p className="text-sm text-ink-200 leading-relaxed">{item.message}</p>
                              <p className="text-xs text-ink-500 mt-1">{timeAgo(item.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold font-body transition-all duration-200 ${
                  isActive ? 'text-civic-400' : 'text-ink-400 hover:text-ink-100'
                }`
              }
            >
              <div className="w-7 h-7 bg-civic-500/20 border border-civic-500/30 rounded-lg flex items-center justify-center">
                <span className="text-civic-400 text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
              </div>
              <span className="max-w-[100px] truncate">{user?.name}</span>
            </NavLink>
            <button onClick={handleLogout} className="p-2 text-ink-500 hover:text-red-400 transition-colors rounded-xl hover:bg-red-400/10">
              <FiLogOut size={16} />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-ink-400 hover:text-ink-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-ink-900 border-t border-ink-800 px-4 py-4 space-y-1 animate-fade-in">
          <NavItem to="/dashboard" icon={FiGrid}       label="Dashboard"    onClick={close} />
          <NavItem to="/map"       icon={FiMap}        label="Map View"     onClick={close} />
          <NavItem to="/report"    icon={FiPlusCircle} label="Report Issue" onClick={close} />
          <NavItem to="/dashboard#analytics" icon={FiBarChart2} label="Analytics" onClick={close} />
          <NavItem to="/profile"   icon={FiUser}       label="Profile"      onClick={close} />
          {isAdmin && <NavItem to="/admin" icon={FiShield} label="Admin Panel" onClick={close} />}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold font-body text-red-400 hover:bg-red-400/10 transition-all w-full"
          >
            <FiLogOut size={16} /> Logout
          </button>
        </div>
      )}
    </nav>
  )
}

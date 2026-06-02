import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FcGoogle } from 'react-icons/fc'
import {
  FiAlertCircle,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiMapPin,
  FiShield,
  FiTrendingUp,
  FiUser,
  FiCheckCircle,
  FiLoader,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/helpers'

export default function LoginPage() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loginMode, setLoginMode] = useState('citizen')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const resetFeedback = () => setError('')

  const handleForgotPassword = (e) => {
    e.preventDefault()
    setError('Password reset is not configured yet. Please contact support.')
  }

  const handleGoogleLogin = () => {
    setError('Google sign-in is not connected yet.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { user } = await login(form.email, form.password)

      if (loginMode === 'admin' && user?.role !== 'admin') {
        logout()
        throw new Error('Use the citizen login for regular accounts.')
      }

      if (loginMode === 'citizen' && user?.role === 'admin') {
        logout()
        throw new Error('Use the admin login for government authority accounts.')
      }

      toast.success('Welcome back!')
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.08fr_0.92fr]">
        <aside className="hidden lg:flex flex-col justify-between p-8 xl:p-10 border-r border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
                <FiAlertCircle className="text-white" size={22} />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-white/45">CivicReport</p>
                <h1 className="font-display text-2xl font-semibold text-white">CivicReport</h1>
              </div>
            </div>

            <div className="max-w-lg space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
                <FiTrendingUp size={14} /> Smart city issue intelligence
              </span>
              <h2 className="font-display text-4xl font-bold leading-tight text-white xl:text-5xl">
                Report. Track. Improve your city.
              </h2>
              <p className="max-w-lg text-sm leading-6 text-slate-300 xl:text-base">
                A modern crowdsourced civic issue reporting system for residents and government teams to coordinate action faster.
              </p>
            </div>
          </div>

          <div className="relative rounded-[32px] border border-white/10 bg-[#111827]/90 p-4 shadow-2xl shadow-black/30">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
            <div className="relative grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-white/8 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">City command overview</p>
                    <p className="text-xs text-slate-400">Live civic activity preview</p>
                  </div>
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Live</div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Open', value: '128' },
                    { label: 'In progress', value: '56' },
                    { label: 'Resolved', value: '412' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-2.5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                      <p className="mt-1.5 text-lg font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-24 rounded-3xl border border-white/8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-3">
                  <div className="flex h-full items-end gap-3">
                    {[42, 58, 35, 70, 54, 78, 46].map((height, index) => (
                      <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-emerald-500 to-cyan-400" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                {[
                  { title: 'Pothole on Main Street', meta: 'Assigned to field crew', badge: 'In progress', tone: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
                  { title: 'Broken traffic light', meta: 'Reported 12 minutes ago', badge: 'New', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
                  { title: 'Overflowing garbage bin', meta: 'Awaiting inspection', badge: 'Pending', tone: 'bg-amber-500/15 text-amber-200 border-amber-500/20' },
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/8 bg-white/[0.03] p-3.5">
                    <div className="mb-2.5 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${item.tone}`}>{item.badge}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/6">
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: item.badge === 'New' ? '28%' : item.badge === 'Pending' ? '52%' : '76%' }} />
                    </div>
                  </div>
                ))}
                <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <FiMapPin size={14} />
                    <span className="text-sm font-medium">Smart routing enabled</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-300">
                    Reports are prioritized by location, severity, and recency to help teams act faster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-[560px]">
            <div className="lg:hidden mb-6 rounded-[28px] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
                  <FiAlertCircle className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-white/45">CivicReport</p>
                  <h1 className="font-display text-xl font-semibold text-white">Report. Track. Improve your city.</h1>
                </div>
              </div>
            </div>

            <section className="rounded-[32px] border border-white/10 bg-[#111827]/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/35">Sign in</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold text-white">Welcome back</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Choose your portal and access your CivicReport account.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  <FiCheckCircle size={14} /> Secure access
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLoginMode('citizen')}
                  className={`rounded-3xl border p-4 text-left transition-all duration-200 ${loginMode === 'citizen'
                    ? 'border-emerald-500/40 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${loginMode === 'citizen' ? 'bg-emerald-500' : 'bg-white/8'}`}>
                      <FiUser className="text-white" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-white">Citizen</p>
                      <p className="text-xs text-slate-400">Public reporting portal</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLoginMode('admin')}
                  className={`rounded-3xl border p-4 text-left transition-all duration-200 ${loginMode === 'admin'
                    ? 'border-emerald-500/40 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${loginMode === 'admin' ? 'bg-emerald-500' : 'bg-white/8'}`}>
                      <FiShield className="text-white" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-white">Admin</p>
                      <p className="text-xs text-slate-400">Government authority access</p>
                    </div>
                  </div>
                </button>
              </div>

              {error ? (
                <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
                    <p>{error}</p>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5" onChange={resetFeedback}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500/40 focus:bg-white/[0.05]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label className="block text-sm font-medium text-slate-200">Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-emerald-400 transition-colors hover:text-emerald-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500/40 focus:bg-white/[0.05]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" size={16} />
                      Signing in
                    </>
                  ) : (
                    <>
                      Login
                      <FiArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                <span>Or continue with</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 font-medium text-white transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <FcGoogle size={20} />
                Login with Google
              </button>

              <p className="mt-6 text-center text-sm text-slate-400">
                New to CivicReport?{' '}
                <Link to="/signup" className="font-medium text-emerald-400 transition-colors hover:text-emerald-300">
                  Sign up
                </Link>
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

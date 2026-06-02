export default function LoadingSpinner({ full, size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

  const spinner = (
    <div className={`${sizes[size]} border-2 border-ink-700 border-t-civic-500 rounded-full animate-spin`} />
  )

  if (full) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}

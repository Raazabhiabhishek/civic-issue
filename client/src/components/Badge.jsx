// Premium SaaS-style Badge component
export default function Badge({ className = '', color = 'primary', children }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-600/10 text-green-400',
    warning: 'bg-yellow-600/10 text-yellow-400',
    danger: 'bg-red-600/10 text-red-400',
    neutral: 'bg-text-secondary/10 text-text-secondary',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors[color]} ${className}`}>
      {children}
    </span>
  )
}

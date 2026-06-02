// Premium SaaS-style Card component
export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-card rounded-2xl shadow-card border border-border transition-all duration-200 ease-in-out ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

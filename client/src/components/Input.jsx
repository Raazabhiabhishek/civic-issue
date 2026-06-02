// Premium SaaS-style Input component
export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl bg-cardAlt border border-border px-4 py-2 text-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 ease-in-out placeholder:text-text-secondary ${className}`}
      {...props}
    />
  )
}

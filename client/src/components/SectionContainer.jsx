// Premium SaaS-style SectionContainer for page sections
export default function SectionContainer({ className = '', children, ...props }) {
  return (
    <section className={`max-w-7xl mx-auto px-4 sm:px-8 py-10 ${className}`} {...props}>
      {children}
    </section>
  )
}

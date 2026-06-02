// Premium SaaS-style Button component
export default function Button({ className = '', variant = 'primary', full = false, children, ...props }) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const variants = {
    primary:
      'bg-primary text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95',
    secondary:
      'bg-cardAlt text-text-secondary border border-border hover:bg-card hover:scale-[1.02] active:scale-95',
    outline:
      'bg-transparent border border-primary text-primary hover:bg-primary/10 hover:scale-[1.02] active:scale-95',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

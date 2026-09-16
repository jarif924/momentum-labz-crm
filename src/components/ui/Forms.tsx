/* eslint-disable @typescript-eslint/no-unused-vars */



export function Button({ 
  children, 
  variant = 'primary', 
  size = 'default',
  className = '',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive',
  size?: 'default' | 'compact'
}) {
  const base = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:opacity-50 disabled:pointer-events-none rounded-[10px]";
  
  const variants = {
    primary: "bg-neutral-900 text-neutral-0 hover:bg-neutral-800",
    accent: "bg-accent-500 text-neutral-900 hover:bg-accent-700",
    secondary: "bg-neutral-0 text-neutral-900 border border-neutral-200 hover:bg-neutral-50",
    ghost: "bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50",
    destructive: "bg-neutral-0 text-danger-text border border-danger-text/30 hover:bg-danger-bg",
  };

  const sizes = {
    default: "h-10 px-4 text-sm",
    compact: "h-8 px-3 text-xs"
  };

  return (
    <button 
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = '', label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-medium text-neutral-600">{label}</label>}
      <input 
        className={`h-10 rounded-[10px] border border-neutral-200 bg-neutral-0 px-3 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-accent-500/20 transition-all ${error ? 'border-danger-text' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger-text">{error}</span>}
    </div>
  );
}

export function Select({ className = '', label, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-medium text-neutral-600">{label}</label>}
      <select 
        className={`h-10 rounded-[10px] border border-neutral-200 bg-neutral-0 px-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-[3px] focus:ring-accent-500/20 transition-all appearance-none ${error ? 'border-danger-text' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger-text">{error}</span>}
    </div>
  );
}

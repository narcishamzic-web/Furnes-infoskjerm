import React from 'react';
export function Button({ children, className='', variant='default', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50',
    secondary: 'bg-white text-slate-900'
  };
  return <button className={`${base} ${variants[variant]||variants.default} ${className}`} {...props}>{children}</button>;
}

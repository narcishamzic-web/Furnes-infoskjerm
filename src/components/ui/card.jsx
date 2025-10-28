import React from 'react';
export function Card({ className='', children }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white/70 backdrop-blur ${className}`}>{children}</div>;
}
export function CardHeader({ className='', children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
export function CardTitle({ className='', children }) {
  return <div className={`text-xl font-semibold ${className}`}>{children}</div>;
}
export function CardContent({ className='', children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

import React from 'react';
export function Input(props){ return <input {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2 ${props.className||''}`} /> }

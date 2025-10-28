import React from 'react';
export function Textarea(props){ return <textarea {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2 ${props.className||''}`}/> }

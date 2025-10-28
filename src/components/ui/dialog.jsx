import React from "react";

export function Dialog({ children }) {
  // Viktig: alltid rendre children (så Trigger-knappen alltid vises)
  return <>{children}</>;
}

export function DialogTrigger({ asChild, children }) {
  // Vi lar knappen selv styre open-state via onClick i SkoleInfoskjerm.jsx
  return children;
}

export function DialogContent({ className = "", children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="fixed inset-0 bg-black/40"></div>
      <div className={`relative z-10 max-h-[90vh] w-[92vw] max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

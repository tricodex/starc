import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Card({ children, className = '', title, description }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-zinc-100 shadow-xl shadow-zinc-200/50 overflow-hidden ${className}`}>
      {(title || description) && (
        <div className="px-6 py-5 border-b border-zinc-100">
          {title && <h3 className="text-lg font-semibold text-zinc-900 font-display">{title}</h3>}
          {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

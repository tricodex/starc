import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function Input({ label, error, rightElement, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`
            block w-full rounded-xl border-zinc-200 bg-zinc-50 
            focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white
            transition-colors duration-200
            placeholder:text-zinc-400
            disabled:opacity-50 disabled:bg-zinc-100
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`
              block w-full rounded-lg border px-3 py-2 text-sm text-gray-900
              placeholder-gray-400 shadow-sm transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              disabled:bg-gray-50 disabled:cursor-not-allowed
              ${error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-gray-300'}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textAreaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textAreaId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <textarea
          id={textAreaId}
          ref={ref}
          className={`
            block w-full rounded-lg border px-3 py-2 text-sm text-gray-900
            placeholder-gray-400 shadow-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-gray-300'}
            ${className}
          `}
          rows={4}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

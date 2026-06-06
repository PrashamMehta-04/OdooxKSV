import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type BaseProps = {
  label: string;
  hint?: string;
};

export function TextField({ label, hint, ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="input" {...props} />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function SelectField({ label, hint, children, ...props }: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="input" {...props}>
        {children}
      </select>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({ label, hint, ...props }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <textarea className="input input--textarea" {...props} />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}


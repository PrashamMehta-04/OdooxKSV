import type { ReactNode } from 'react';

export function SectionCard({
  title,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>{title}</h2>
        </div>
        {actions ? <div className="card__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}


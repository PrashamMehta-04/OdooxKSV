import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {icon ? <span className="stat-card__icon">{icon}</span> : null}
      </div>
      <div className="stat-card__value">{value}</div>
      {detail ? <div className="stat-card__detail">{detail}</div> : null}
    </article>
  );
}


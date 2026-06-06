import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', padding = true }) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${padding ? 'p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className = '' }) => (
  <div className={`flex items-start justify-between mb-4 ${className}`}>
    <div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendUp,
  colorClass = 'bg-primary-50 text-primary-600',
  className = '',
}) => (
  <Card className={className}>
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium h-10 flex items-center line-clamp-2 leading-tight">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 whitespace-nowrap overflow-visible">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${colorClass} flex-shrink-0`}>{icon}</div>
    </div>
  </Card>
);

export default Card;

import React from 'react';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  type?: 'default' | 'danger';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, type = 'default' }) => {
  return (
    <div className="stat-card card">
      <div className="stat-title">{title}</div>
      <div className={`stat-value ${type === 'danger' ? 'text-danger' : 'text-primary'}`}>
        {value}
      </div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );
};

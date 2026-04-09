import React from 'react';
import clsx from 'clsx';
import './Badge.css';

type BadgeStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'finalized' | 'active';

interface BadgeProps {
  status: BadgeStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className }) => {
  const normStatus = status.toLowerCase() as BadgeStatus;
  
  const statusClassMap: Record<string, string> = {
    queued: 'badge-warning',
    processing: 'badge-info',
    active: 'badge-info',
    completed: 'badge-success',
    finalized: 'badge-success',
    failed: 'badge-danger',
  };

  const badgeClass = statusClassMap[normStatus] || 'badge-default';

  return (
    <span className={clsx('badge', badgeClass, className)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

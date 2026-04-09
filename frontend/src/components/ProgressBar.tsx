import React from 'react';
import './ProgressBar.css';
import clsx from 'clsx';

interface ProgressBarProps {
  progress: number;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md';
  colorClass?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  label, 
  sublabel,
  size = 'md',
  colorClass = 'bg-primary'
}) => {
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="progress-container">
      {(label || sublabel) && (
        <div className="progress-text-row">
          {label && <span className="progress-label">{label}</span>}
          {sublabel && <span className="progress-sublabel">{sublabel}</span>}
        </div>
      )}
      <div className={clsx('progress-track', `size-${size}`)}>
        <div 
          className={clsx('progress-fill', colorClass)} 
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
};

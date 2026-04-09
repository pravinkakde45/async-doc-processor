import React, { useEffect } from 'react';
import { useTopBarContext } from '../context/TopBarContext';
import { TrendingUp, Clock } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import './Analytics.css';

export const Analytics: React.FC = () => {
  const { setTopbarTitle } = useTopBarContext();

  useEffect(() => {
    setTopbarTitle(
      <>
        <span>Platform</span> {'>'} Analytics
      </>
    );
  }, [setTopbarTitle]);

  return (
    <div className="analytics-page">
      <div className="dashboard-header">
        <div className="header-text">
          <h1>System Analytics</h1>
          <p>Monitor processing throughput and model extraction confidence across your organization.</p>
        </div>
      </div>

      <div className="stats-grid m-b">
        <StatCard 
          title="TOTAL PROCESSED" 
          value="14,291" 
          subtitle="+1.2% from last week" 
        />
        <StatCard 
          title="AVG EXTRACTION TIME" 
          value="4.2s" 
          subtitle="-0.3s improvement" 
        />
        <StatCard 
          title="AVG CONFIDENCE" 
          value="94.8%" 
          subtitle="Top tier accuracy" 
        />
        <StatCard 
          title="API ERRORS" 
          value="0.1%" 
          subtitle="Within SLA acceptable range" 
        />
      </div>

      <div className="analytics-grid">
        <div className="card">
          <h3 className="section-title mb-4 flex items-center gap-2"><TrendingUp size={16}/> PROCESSING VOLUME</h3>
          <div className="chart-placeholder flex items-end justify-between gap-2 mt-6">
            {[40, 65, 45, 80, 50, 95, 60].map((height, i) => (
              <div key={i} className="bar-wrapper">
                <div className="bar bg-primary-light" style={{ height: '100px' }}>
                  <div className="bar-fill bg-primary" style={{ height: `${height}%` }}></div>
                </div>
                <div className="bar-label">Day {i+1}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title mb-4 flex items-center gap-2"><Clock size={16}/> PROCESSING TIMES</h3>
          <div className="flex-col gap-4 mt-6">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Invoices</span>
                <span className="text-muted">3.2s avg</span>
              </div>
              <div className="progress-track size-md"><div className="progress-fill bg-info" style={{ width: '32%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Contracts</span>
                <span className="text-muted">5.8s avg</span>
              </div>
              <div className="progress-track size-md"><div className="progress-fill bg-warning" style={{ width: '58%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Resumes</span>
                <span className="text-muted">2.1s avg</span>
              </div>
              <div className="progress-track size-md"><div className="progress-fill bg-success" style={{ width: '21%' }}></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

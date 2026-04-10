import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, UploadCloud, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { useTopBarContext } from '../context/TopBarContext';
import type { DocumentInfo } from '../types';
import { fetchDocuments } from '../api';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { setTopbarTitle } = useTopBarContext();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setTopbarTitle(
      <>
        <span>Archive</span> {'>'} Async Processing
      </>
    );

    const loadData = async () => {
      try {
        const data = await fetchDocuments();
        // Since we don't have persistent progress saving on the backend model for non-active docs perfectly mapped to a progress integer,
        // we'll simulate progress value based on status just for the table view where necessary,
        // or rely on active SSE for anything currently processing.
        setDocuments(data);
      } catch (err) {
        console.error("Failed to load documents", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    // Poll every 5s to keep list fresh
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [setTopbarTitle]);

  const activeCount = documents.filter(d => d.status === 'processing' || d.status === 'queued').length;
  const completedCount = documents.filter(d => d.status === 'completed' || d.status === 'finalized').length;
  const errorCount = documents.filter(d => d.status === 'failed').length;
  const total = documents.length;
  const efficiency = total > 0 ? (((total - errorCount) / total) * 100).toFixed(1) + '%' : '0%';

  const filteredDocs = documents.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'completed') return d.status === 'completed' || d.status === 'finalized';
    return d.status === filter;
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="text-primary" />;
    if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return <FileSpreadsheet className="text-success" />;
    if (fileType.includes('image')) return <ImageIcon className="text-warning" />;
    return <FileText className="text-muted" />;
  };

  const getProgressForDoc = (doc: DocumentInfo): { val: number; label: string } | null => {
    const statusStr = doc.status.toLowerCase();
    if (statusStr === 'completed' || statusStr === 'finalized') return null;
    if (statusStr === 'failed') return null;
    if (statusStr === 'queued') return { val: 0, label: 'Waiting...' };
    // Simulated active state for list view since we don't store 0-100 in DB
    return { val: 40, label: 'Processing...' }; 
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="header-text">
          <h1>Documents</h1>
          <p>Manage your automated document workflows. Everything is processed through secure kinetic archiving.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/upload')}>
          <UploadCloud size={18} /> Upload Document
        </button>
      </div>

      <div className="stats-grid m-b">
        <StatCard 
          title="ACTIVE" 
          value={activeCount} 
          subtitle="Documents currently processing" 
        />
        <StatCard 
          title="COMPLETED" 
          value={completedCount} 
          subtitle="All time successful" 
        />
        <StatCard 
          title="EFFICIENCY" 
          value={efficiency} 
          subtitle="Successful async completion" 
        />
        <StatCard 
          title="ERRORS" 
          value={errorCount} 
          subtitle="Requires manual intervention" 
          type="danger" 
        />
      </div>

      <div className="table-card card">
        <div className="table-filters flex justify-between items-center mb-6">
          <div className="tabs inline">
            <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Items</button>
            <button className={`tab ${filter === 'queued' ? 'active' : ''}`} onClick={() => setFilter('queued')}>Queued</button>
            <button className={`tab ${filter === 'processing' ? 'active' : ''}`} onClick={() => setFilter('processing')}>Processing</button>
            <button className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
            <button className={`tab ${filter === 'failed' ? 'active' : ''}`} onClick={() => setFilter('failed')}>Failed</button>
          </div>
          <select className="input-field w-auto">
            <option>Sort by Date</option>
            <option>Sort by Name</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>FILE NAME</th>
                <th>TYPE</th>
                <th>UPLOAD DATE</th>
                <th>STATUS</th>
                <th>PROGRESS</th>
              </tr>
            </thead>
            <tbody>
              {loading && documents.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
              ) : filteredDocs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4">No documents found.</td></tr>
              ) : (
                filteredDocs.map(doc => {
                  const progressData = getProgressForDoc(doc);
                  return (
                    <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)} className="clickable-row">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="table-icon">
                            {getFileIcon(doc.file_type)}
                          </div>
                          <div>
                            <div className="font-medium">{doc.filename}</div>
                            <div className="text-xs text-muted">{(doc.size / 1024 / 1024).toFixed(1)} MB</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-capitalize">{doc.file_type.split('/')[1] || doc.file_type}</td>
                      <td>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</td>
                      <td><Badge status={doc.status} /></td>
                      <td style={{ width: '200px' }}>
                        {progressData ? (
                          <div className="table-progress">
                            <span className="text-xs font-medium text-primary mr-2">{progressData.val}%</span>
                            <span className="text-xs text-muted mr-2">• {progressData.label}</span>
                            <ProgressBar progress={progressData.val} size="sm" />
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

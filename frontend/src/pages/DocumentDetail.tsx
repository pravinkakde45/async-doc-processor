import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Download, CheckCircle, Lock, Server, X } from 'lucide-react';
import { useTopBarContext } from '../context/TopBarContext';
import { fetchDocument, updateDocument, finalizeDocument } from '../api';
import type { DocumentInfo, ExtractedData } from '../types';
import './DocumentDetail.css';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setTopbarTitle } = useTopBarContext();

  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<ExtractedData>({});
  const [keywordsInput, setKeywordsInput] = useState('');

  useEffect(() => {
    if (!id) return;
    
    const loadDoc = async () => {
      try {
        const data = await fetchDocument(id);
        setDoc(data);
        setFormData(data.extracted_data || {});
        setKeywordsInput((data.extracted_data?.keywords || []).join(', '));
        
        setTopbarTitle(
          <>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Documents</span> {'>'} {data.filename}
          </>
        );
      } catch (err) {
        console.error("Failed", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadDoc();
    // In a fully dynamic app, we'd add SSE here if status is active
  }, [id, navigate, setTopbarTitle]);

  const handleExport = () => {
    window.location.href = `/api/v1/documents/${id}/export?format=json`;
  };

  const handleFinalize = async () => {
    if (!id) return;
    try {
      const data = await finalizeDocument(id);
      setDoc(data);
    } catch (e) {
      alert("Failed to finalize.");
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Parse keywords
      const kw = keywordsInput.split(',').map(k => k.trim()).filter(Boolean);
      const payload = { ...formData, keywords: kw };
      const data = await updateDocument(id, payload);
      setDoc(data);
    } catch (e) {
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading document details...</div>;
  if (!doc) return <div>Document not found.</div>;

  const isFinalized = doc.is_finalized || doc.status === 'finalized';

  return (
    <div className="detail-page">
      <div className="detail-header flex justify-between items-center mb-6">
        <h1>Document Analysis</h1>
        <div className="flex gap-4">
          <button className="btn-outline" onClick={handleExport}>
            <Download size={16} /> Export
          </button>
          {!isFinalized && (
            <button className="btn-primary" onClick={handleFinalize}>
              Finalize Result
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="left-column flex-col gap-6">
          {/* Metadata Card */}
          <div className="card">
            <h3 className="section-title mb-4">FILE METADATA</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="icon-box bg-primary-light">
                <FileText className="text-primary" size={24} />
              </div>
              <div>
                <div className="font-semibold">{doc.filename}</div>
                <div className="text-sm text-muted">
                  {(doc.size / 1024 / 1024).toFixed(1)} MB • {doc.file_type}
                </div>
              </div>
            </div>
            
            <div className="meta-grid">
              <div>
                <label>UPLOADED</label>
                <div>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</div>
              </div>
              <div>
                <label>OWNER</label>
                <div>Sarah Jenkins</div> {/* Static mock as per design */}
              </div>
              <div>
                <label>ACCESS</label>
                <div>Departmental</div>
              </div>
              <div>
                <label>HASH</label>
                <div className="text-muted">#a2b4...9f0</div>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="card">
            <h3 className="section-title mb-4">PROCESSING TIMELINE</h3>
            
            <div className="timeline">
              <div className="timeline-item completed">
                <div className="timeline-icon bg-success"><CheckCircle size={14} color="white" /></div>
                <div className="timeline-content">
                  <div className="font-semibold">Document received</div>
                  <div className="text-xs text-muted">{format(new Date(doc.created_at), 'MMM dd, hh:mm a')}</div>
                </div>
              </div>
              <div className="timeline-item completed">
                <div className="timeline-icon bg-success"><CheckCircle size={14} color="white" /></div>
                <div className="timeline-content">
                  <div className="font-semibold">Parsing Engine</div>
                  <div className="text-xs text-muted">Completed</div>
                </div>
              </div>
              <div className={`timeline-item ${doc.status === 'completed' || isFinalized ? 'completed' : 'active'}`}>
                <div className={`timeline-icon ${doc.status === 'completed' || isFinalized ? 'bg-success' : 'bg-primary'}`}>
                  {doc.status === 'completed' || isFinalized ? <CheckCircle size={14} color="white" /> : <div className="dot-inner" />}
                </div>
                <div className="timeline-content">
                  <div className="flex justify-between w-full">
                    <div className="font-semibold">Extraction Phase</div>
                    {(doc.status !== 'completed' && !isFinalized) && <span className="timeline-badge text-xs">ACTIVE</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {doc.status === 'completed' || isFinalized ? 'Completed' : 'OCR Analysis: 65% complete'}
                  </div>
                </div>
              </div>
              <div className={`timeline-item ${isFinalized ? 'completed' : 'pending'}`}>
                <div className="timeline-icon bg-hover"><Server size={14} className="text-muted" /></div>
                <div className="timeline-content">
                  <div className="font-semibold">Archive Storage</div>
                  <div className="text-xs text-muted">{isFinalized ? 'Archived' : 'Pending extraction'}</div>
                </div>
              </div>
              <div className={`timeline-item ${isFinalized ? 'completed' : 'pending'}`}>
                <div className="timeline-icon bg-hover"><Lock size={14} className="text-muted" /></div>
                <div className="timeline-content">
                  <div className="font-semibold">Final Verification</div>
                  <div className="text-xs text-muted">{isFinalized ? 'Locked' : 'Awaiting automation'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-column flex-col gap-6">
          <div className="card fill-height flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="icon-btn-small bg-primary-light">
                  <FileText size={16} className="text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Edit Extracted Data</h3>
              </div>
              <div className="text-xs text-muted">Auto-saved 2m ago</div>
            </div>

            <div className="form-group mb-4">
              <label className="section-title">DOCUMENT TITLE</label>
              <input 
                className="input-field mt-1 title-input" 
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                disabled={isFinalized}
              />
            </div>

            <div className="flex gap-4 mb-4">
              <div className="form-group flex-1">
                <label className="section-title">CATEGORY</label>
                <select 
                  className="input-field mt-1"
                  value={formData.category || 'Financial / Invoices'}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  disabled={isFinalized}
                >
                  <option value="Financial / Invoices">Financial / Invoices</option>
                  <option value="Legal / Contracts">Legal / Contracts</option>
                  <option value="HR / Resumes">HR / Resumes</option>
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="section-title">DETECTION CONFIDENCE</label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="progress-track size-md flex-1">
                    <div className="progress-fill bg-primary" style={{ width: '94%' }} />
                  </div>
                  <span className="font-semibold">94%</span>
                </div>
              </div>
            </div>

            <div className="form-group mb-4 flex-1 flex-col">
              <label className="section-title">EXTRACTED SUMMARY</label>
              <textarea 
                className="input-field mt-1 flex-1 summary-textarea"
                value={formData.summary || ''}
                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                disabled={isFinalized}
              />
            </div>

            <div className="form-group mb-6">
              <label className="section-title">EXTRACTED KEYWORDS</label>
              <div className="flex gap-2 flex-wrap mt-2">
                {(formData.keywords || []).map((kw, i) => (
                  <span key={i} className="keyword-tag">{kw} <X size={12} className="tag-close"/></span>
                ))}
                {!isFinalized && (
                  <input 
                    className="add-tag-btn" 
                    placeholder="+ Add tag (comma separated)"
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="edit-footer mt-auto flex justify-between items-center pt-4">
              <div className="text-xs text-muted flex items-center gap-2">
                <span>ⓘ</span> Finalizing will lock this record for audit purposes.
              </div>
              <div className="flex gap-4">
                <button className="btn-outline" disabled={isFinalized}>Discard</button>
                <button className="btn-primary edit-save-btn" onClick={handleSave} disabled={isFinalized || saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

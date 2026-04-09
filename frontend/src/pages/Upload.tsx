import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, RefreshCw, FileText } from 'lucide-react';
import { useTopBarContext } from '../context/TopBarContext';
import { uploadDocuments, retryDocument } from '../api';
import type { DocumentInfo, ProgressEvent } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { Badge } from '../components/Badge';
import './Upload.css';

interface UploadItem extends DocumentInfo {
  progressValue: number;
  progressStep: string;
}

export const Upload: React.FC = () => {
  const { setTopbarTitle } = useTopBarContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  useEffect(() => {
    setTopbarTitle(
      <>
        <span>Documents</span> {'>'} New Upload
      </>
    );
  }, [setTopbarTitle]);

  // Hook up SSE for active uploads
  useEffect(() => {
    const activeUploads = uploads.filter(
      u => u.status !== 'completed' && u.status !== 'failed' && u.status !== 'finalized'
    );
    
    if (activeUploads.length === 0) return;

    const eventSources: EventSource[] = [];

    activeUploads.forEach(upload => {
      const source = new EventSource(`/api/v1/documents/${upload.id}/progress`);
      
      source.onmessage = (e) => {
        const event: ProgressEvent = JSON.parse(e.data);
        
        setUploads(prev => prev.map(item => {
          if (item.id === event.document_id) {
            return {
              ...item,
              status: event.status,
              progressValue: event.progress,
              progressStep: event.step,
            };
          }
          return item;
        }));

        if (event.progress >= 100 || event.status === 'completed' || event.status === 'failed') {
          source.close();
        }
      };

      eventSources.push(source);
    });

    return () => {
      eventSources.forEach(s => s.close());
    };
  }, [uploads.length]); // Dependency on length means it will re-evaluate when new files are added

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    
    try {
      const responseDocs = await uploadDocuments(fileArray);
      const newItems: UploadItem[] = responseDocs.map(doc => ({
        ...doc,
        progressValue: 0,
        progressStep: 'queued'
      }));
      setUploads(prev => [...newItems, ...prev]);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload files.");
    }
  };

  const handleRetry = async (documentId: string) => {
    try {
      await retryDocument(documentId);
      setUploads(prev => prev.map(item => {
        if (item.id === documentId) {
          return {
            ...item,
            status: 'queued',
            progressValue: 0,
            progressStep: 'queued'
          };
        }
        return item;
      }));
    } catch (err) {
      console.error("Retry failed", err);
      alert("Failed to retry document.");
    }
  };

  return (
    <div className="upload-page">
      <div className="card upload-card mb-6">
        <div className="upload-header flex justify-between items-center mb-4">
          <div>
            <h2>Upload Documents</h2>
            <p className="text-sm">Add new files to your kinetic archive for processing.</p>
          </div>
          <button className="icon-btn icon-border"><X size={16} /></button>
        </div>

        <div 
          className={`dropzone ${isDragging ? 'drag-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <div className="dropzone-icon">
            <UploadCloud size={24} className="text-primary" />
          </div>
          <h3 className="mt-4 font-semibold">Drag and drop documents here</h3>
          <p className="text-sm text-muted mt-2">Support for PDF, DOCX, and XLSX files.<br/>Max file size 50MB.</p>
          
          <input 
            type="file" 
            multiple 
            className="hidden-input" 
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button 
            className="btn-outline mt-6"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </button>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="upload-queue">
          <h3 className="queue-title mb-4">QUEUED FOR PROCESSING ({uploads.length})</h3>
          
          <div className="queue-list flex-col gap-4">
            {uploads.map(item => (
              <div key={item.id} className={`queue-item ${item.status === 'failed' ? 'item-failed' : ''}`}>
                <div className="queue-item-icon">
                  {item.status === 'failed' ? (
                    <span className="text-danger flex justify-center w-full">!</span>
                  ) : (
                    <FileText className="text-primary" size={20} />
                  )}
                </div>
                
                <div className="queue-item-content">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="font-semibold">{item.filename}</div>
                      <div className="text-xs text-muted flex items-center gap-1">
                        {(item.size / 1024 / 1024).toFixed(1)} MB • {
                           item.status === 'completed' ? 'Processing Complete' :
                           item.status === 'failed' ? <span className="text-danger">Unsupported file format or error</span> :
                           item.status === 'queued' ? 'Ready to process' :
                           `${item.progressValue}% complete`
                        }
                      </div>
                    </div>
                    
                    <div className="queue-item-actions">
                      {item.status === 'failed' ? (
                        <button className="icon-btn-small" title="Retry" onClick={() => handleRetry(item.id)}><RefreshCw size={14} /></button>
                      ) : item.status === 'queued' ? (
                        <Badge status="queued" />
                      ) : (
                        <button className="icon-btn-small"><X size={14} /></button>
                      )}
                    </div>
                  </div>
                  
                  {item.status !== 'queued' && item.status !== 'failed' && item.status !== 'completed' && (
                    <ProgressBar progress={item.progressValue} size="sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="upload-footer mt-6 flex justify-between items-center">
            <div className="text-xs text-muted flex items-center gap-2">
              <span>🛡</span> All uploads are encrypted and processed securely.
            </div>
            <div className="flex gap-4">
              <button className="btn-outline">Cancel</button>
              <button className="btn-primary">Submit Files</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

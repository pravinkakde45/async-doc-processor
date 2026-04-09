import type { DocumentInfo, ExtractedData } from '../types';

const API_BASE = '/api/v1';

export const fetchDocuments = async (): Promise<DocumentInfo[]> => {
  const res = await fetch(`${API_BASE}/documents?limit=100`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
};

export const fetchDocument = async (id: string): Promise<DocumentInfo> => {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.json();
};

export const uploadDocuments = async (files: File[]): Promise<DocumentInfo[]> => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

export const updateDocument = async (id: string, data: ExtractedData): Promise<DocumentInfo> => {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
};

export const finalizeDocument = async (id: string): Promise<DocumentInfo> => {
  const res = await fetch(`${API_BASE}/documents/${id}/finalize`, { method: 'POST' });
  if (!res.ok) throw new Error('Finalize failed');
  return res.json();
};

export const retryDocument = async (id: string): Promise<DocumentInfo> => {
  const res = await fetch(`${API_BASE}/documents/${id}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error('Retry failed');
  return res.json();
};

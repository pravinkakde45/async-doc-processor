export type DocumentStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'finalized';

export interface ExtractedData {
  title?: string;
  category?: string;
  confidence?: number;
  summary?: string;
  keywords?: string[];
  [key: string]: any;
}

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  size: number;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  is_finalized: boolean;
  extracted_data?: ExtractedData;
}

export interface ProgressEvent {
  document_id: string;
  status: DocumentStatus;
  step: string;
  progress: number;
}

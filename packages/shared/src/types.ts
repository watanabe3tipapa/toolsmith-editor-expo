export type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  wordCount: number;
};

export type DocumentSummary = Omit<DocumentRecord, 'content'>;

export type ExportFormat = 'md' | 'html' | 'json' | 'qmd' | 'txt';

export type ExportOption = {
  format: ExportFormat;
  label: string;
  ext: string;
  mime: string;
  content: string;
};

export type ThemeName = 'cosmic' | 'brutalist' | 'cupertino';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

import { create } from 'zustand';
import type { DocumentRecord } from '@toolsmith/shared';
import {
  createDocument,
  deleteDocument,
  ensureInitialDocument,
  listDocuments,
} from '../db/database';

type DocumentState = {
  documents: DocumentRecord[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (content?: string) => Promise<DocumentRecord>;
  remove: (id: string) => Promise<void>;
  upsert: (document: DocumentRecord) => void;
};

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  loading: true,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const initial = await ensureInitialDocument();
      const documents = await listDocuments();
      set({ documents: documents.length > 0 ? documents : [initial], loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '文書を読み込めませんでした。',
      });
    }
  },

  create: async (content) => {
    const document = await createDocument({ content });
    set((state) => ({ documents: [document, ...state.documents] }));
    return document;
  },

  remove: async (id) => {
    await deleteDocument(id);
    set((state) => ({ documents: state.documents.filter((doc) => doc.id !== id) }));
  },

  upsert: (document) => {
    set((state) => {
      const exists = state.documents.some((doc) => doc.id === document.id);
      const documents = exists
        ? state.documents.map((doc) => (doc.id === document.id ? document : doc))
        : [document, ...state.documents];
      documents.sort((a, b) => b.updatedAt - a.updatedAt);
      return { documents };
    });
  },
}));

import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  DEFAULT_MARKDOWN,
  countWords,
  extractTitle,
  type DocumentRecord,
} from '@toolsmith/shared';

const DATABASE_NAME = 'toolsmith.db';
const SCHEMA_VERSION = 1;

type DocumentRow = {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
  word_count: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(database: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS documents (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        content_md  TEXT NOT NULL DEFAULT '',
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        exported_at INTEGER,
        word_count  INTEGER NOT NULL DEFAULT 0,
        tags        TEXT NOT NULL DEFAULT '[]'
      );

      CREATE INDEX IF NOT EXISTS idx_documents_updated_at
        ON documents(updated_at DESC);

      CREATE TABLE IF NOT EXISTS app_settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auto_save_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL,
        saved_at    INTEGER NOT NULL,
        size_bytes  INTEGER,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      PRAGMA user_version = 1;
    `);
  }
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (database) => {
        await migrate(database);
        return database;
      })
      .catch((error) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

function mapRow(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    wordCount: row.word_count,
  };
}

const SELECT_COLUMNS = `
  SELECT id, title, content_md AS content, created_at, updated_at, word_count
  FROM documents
`;

export async function listDocuments(): Promise<DocumentRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<DocumentRow>(
    `${SELECT_COLUMNS} ORDER BY updated_at DESC`,
  );
  return rows.map(mapRow);
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<DocumentRow>(
    `${SELECT_COLUMNS} WHERE id = ?`,
    id,
  );
  return row ? mapRow(row) : null;
}

export async function countDocuments(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM documents',
  );
  return row?.total ?? 0;
}

export async function createDocument(
  input: { content?: string; title?: string } = {},
): Promise<DocumentRecord> {
  const database = await getDatabase();
  const content = input.content ?? '';
  const now = Date.now();
  const record: DocumentRecord = {
    id: Crypto.randomUUID(),
    title: input.title?.trim() || extractTitle(content),
    content,
    createdAt: now,
    updatedAt: now,
    wordCount: countWords(content),
  };

  await database.runAsync(
    `INSERT INTO documents (id, title, content_md, created_at, updated_at, word_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    record.id,
    record.title,
    record.content,
    record.createdAt,
    record.updatedAt,
    record.wordCount,
  );

  return record;
}

export async function saveDocument(record: DocumentRecord): Promise<DocumentRecord> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE documents
       SET title = ?, content_md = ?, updated_at = ?, word_count = ?
     WHERE id = ?`,
    record.title,
    record.content,
    record.updatedAt,
    record.wordCount,
    record.id,
  );
  return record;
}

export async function deleteDocument(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM documents WHERE id = ?', id);
}

export async function ensureInitialDocument(): Promise<DocumentRecord> {
  const total = await countDocuments();
  if (total > 0) {
    const documents = await listDocuments();
    return documents[0];
  }
  return createDocument({ content: DEFAULT_MARKDOWN });
}

export async function getStorageSummary(): Promise<{ documents: number; bytes: number }> {
  const database = await getDatabase();
  const documents = await countDocuments();
  const pageCount = await database.getFirstAsync<{ page_count: number }>('PRAGMA page_count');
  const pageSize = await database.getFirstAsync<{ page_size: number }>('PRAGMA page_size');
  return {
    documents,
    bytes: (pageCount?.page_count ?? 0) * (pageSize?.page_size ?? 0),
  };
}

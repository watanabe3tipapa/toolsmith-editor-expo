import { describe, expect, it } from 'vitest';
import {
  buildExportOptions,
  buildFilename,
  convertToHtml,
  convertToJson,
  convertToQmd,
  findExportOption,
  formatTimestamp,
  sanitizeFilename,
} from '../export';

describe('sanitizeFilename', () => {
  it('replaces characters that are invalid on common filesystems', () => {
    expect(sanitizeFilename('a/b:c')).toBe('a_b_c');
  });

  it('collapses whitespace and trims', () => {
    expect(sanitizeFilename('  hello   world  ')).toBe('hello world');
  });

  it('limits the filename length to 80 characters', () => {
    expect(sanitizeFilename('x'.repeat(100))).toHaveLength(80);
  });

  it('falls back to a default name', () => {
    expect(sanitizeFilename('   ')).toBe('document');
  });
});

describe('formatTimestamp', () => {
  it('formats a local date as YYYYMMDD_HHmmss', () => {
    expect(formatTimestamp(new Date(2026, 0, 2, 3, 4, 5))).toBe('20260102_030405');
  });
});

describe('buildFilename', () => {
  it('combines the sanitized title, timestamp, and extension', () => {
    expect(buildFilename('My Doc', 'md', new Date(2026, 0, 2, 3, 4, 5))).toBe(
      'My Doc_20260102_030405.md',
    );
  });
});

describe('buildExportOptions', () => {
  it('returns all five export formats in display order', () => {
    const options = buildExportOptions('# Hello', 'My Doc');

    expect(options.map((option) => option.format)).toEqual(['md', 'html', 'json', 'qmd', 'txt']);
    expect(options.map((option) => option.ext)).toEqual(['md', 'html', 'json', 'qmd', 'txt']);
    expect(options[0].content).toBe('# Hello');
    expect(options[4].content).toBe('# Hello');
  });

  it('uses the expected MIME types', () => {
    const options = buildExportOptions('body', 'title');

    expect(options.find((option) => option.format === 'html')?.mime).toBe('text/html');
    expect(options.find((option) => option.format === 'json')?.mime).toBe('application/json');
    expect(options.find((option) => option.format === 'txt')?.mime).toBe('text/plain');
  });
});

describe('findExportOption', () => {
  it('finds an option by format', () => {
    const options = buildExportOptions('body', 'title');

    expect(findExportOption(options, 'qmd')?.ext).toBe('qmd');
  });

  it('returns undefined for a missing format', () => {
    expect(findExportOption(buildExportOptions('body', 'title'), 'pdf' as never)).toBeUndefined();
  });
});

describe('convertToHtml', () => {
  it('wraps the converted body in a standalone document', () => {
    const html = convertToHtml('# Title');

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<h1>Title</h1>');
  });

  it('converts inline emphasis and code', () => {
    expect(convertToHtml('**bold** and *italic* and `code`')).toContain(
      '<strong>bold</strong> and <em>italic</em> and <code>code</code>',
    );
  });
});

describe('convertToJson', () => {
  it('produces a JSON backup with the markdown content', () => {
    const parsed = JSON.parse(convertToJson('# Hello')) as Record<string, unknown>;

    expect(parsed.content).toBe('# Hello');
    expect(parsed.format).toBe('markdown');
    expect(parsed.editor).toBe('TOOLSMITH EDITOR');
    expect(typeof parsed.createdAt).toBe('string');
  });
});

describe('convertToQmd', () => {
  it('adds a Quarto YAML front matter', () => {
    const qmd = convertToQmd('# Hello', 'My "Doc"');

    expect(qmd.startsWith('---\n')).toBe(true);
    expect(qmd).toContain('title: "My \\"Doc\\""');
    expect(qmd.endsWith('\n\n# Hello')).toBe(true);
  });
});

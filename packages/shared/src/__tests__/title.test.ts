import { describe, expect, it } from 'vitest';
import { DEFAULT_TITLE } from '../constants';
import { countCharacters, countWords, extractTitle } from '../title';

describe('extractTitle', () => {
  it('uses the first H1 heading', () => {
    expect(extractTitle('# Hello\n\nbody')).toBe('Hello');
  });

  it('trims surrounding whitespace in the heading', () => {
    expect(extractTitle('#   Spaced title   \nbody')).toBe('Spaced title');
  });

  it('finds a heading even when it is not the first line', () => {
    expect(extractTitle('intro paragraph\n\n# Later heading')).toBe('Later heading');
  });

  it('falls back to the first non-empty line', () => {
    expect(extractTitle('  first line  \n\nsecond line')).toBe('first line');
  });

  it('truncates the fallback line to 40 characters', () => {
    expect(extractTitle('x'.repeat(100))).toHaveLength(40);
  });

  it('returns the default title for empty content', () => {
    expect(extractTitle('')).toBe(DEFAULT_TITLE);
    expect(extractTitle('\n  \n')).toBe(DEFAULT_TITLE);
  });
});

describe('countWords', () => {
  it('counts whitespace separated words', () => {
    expect(countWords('one two   three')).toBe(3);
  });

  it('returns zero for blank content', () => {
    expect(countWords('   \n\t ')).toBe(0);
  });

  it('counts space separated Japanese words', () => {
    expect(countWords('日本語 の 文章')).toBe(3);
  });
});

describe('countCharacters', () => {
  it('counts UTF-16 code units like String#length', () => {
    expect(countCharacters('abc')).toBe(3);
    expect(countCharacters('日本語')).toBe(3);
  });
});

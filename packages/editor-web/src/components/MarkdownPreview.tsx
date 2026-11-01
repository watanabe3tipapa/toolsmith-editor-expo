import { useMemo } from 'react';
import AbcSheet from './AbcSheet';

type MarkdownPreviewProps = {
  markdown: string;
  visible?: boolean;
};

const ABC_FENCE = /```\s*(?:music-)?abc\s*\r?\n([\s\S]*?)```/g;

function extractAbcBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = ABC_FENCE.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function MarkdownPreview({ markdown, visible = true }: MarkdownPreviewProps) {
  const abcBlocks = useMemo(() => extractAbcBlocks(markdown), [markdown]);

  if (!visible) return null;

  return (
    <div className="markdown-preview" aria-label="Markdownソースプレビュー">
      <div className="markdown-preview-header">
        <h2>ソースプレビュー</h2>
        {abcBlocks.length > 0 && <span className="abc-count">ABC x{abcBlocks.length}</span>}
      </div>
      <pre className="markdown-preview-source">
        {markdown || '入力するとMarkdownプレビューが表示されます…'}
      </pre>
      {abcBlocks.map((abc, index) => (
        <AbcSheet key={`abc-${index}`} abc={abc} />
      ))}
    </div>
  );
}

export default MarkdownPreview;

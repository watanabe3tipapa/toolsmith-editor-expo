import React, { useCallback, useEffect, useState } from 'react';
import { EditorState } from 'lexical';
import { $getRoot, $getSelection, $isRangeSelection, $createParagraphNode, UNDO_COMMAND, REDO_COMMAND, FORMAT_TEXT_COMMAND, type TextFormatType } from 'lexical';
import { INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $createHeadingNode, $createQuoteNode, type HeadingTagType } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Terminal,
  Link,
  Undo,
  Redo,
  Subscript,
  Superscript,
  Minus,
  Table2,
  Download,
  Save,
} from 'lucide-react';
import type { ExportFormat } from '@toolsmith/shared';
import LinkEditorModal from './LinkEditorModal';

type ToolbarButtonProps = {
  icon: React.ComponentType<{ size?: number }>;
  isActive?: boolean;
  onClick: () => void;
  title: string;
};

function ToolbarButton({ icon: Icon, isActive, onClick, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={isActive || undefined}
      className={`shrink-0 p-2 transition-all rounded hover:bg-primary/20 ${
        isActive
          ? 'text-primary drop-shadow-[0_0_8px_var(--color-primary)]'
          : 'text-foreground/70 hover:text-primary'
      }`}
    >
      <Icon size={18} />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-primary/30 mx-1" aria-hidden="true" />;
}

type ToolbarProps = {
  editor: any;
  onExport: (format: ExportFormat) => void;
  onSaveRequest: () => void;
};

const EXPORT_MENU: Array<{ format: ExportFormat; label: string }> = [
  { format: 'md', label: 'Markdown (.md)' },
  { format: 'html', label: 'HTML (.html)' },
  { format: 'json', label: 'JSON (.json)' },
  { format: 'qmd', label: 'Quarto (.qmd)' },
  { format: 'txt', label: 'Plain Text (.txt)' },
];

function Toolbar({ editor, onExport, onSaveRequest }: ToolbarProps) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsUnderline(selection.hasFormat('underline'));
        setIsStrikethrough(selection.hasFormat('strikethrough'));
        setIsCode(selection.hasFormat('code'));
        setIsSubscript(selection.hasFormat('subscript'));
        setIsSuperscript(selection.hasFormat('superscript'));
      }
    };

    return editor.registerUpdateListener(({ editorState }: { editorState: EditorState }) => {
      editorState.read(updateToolbar);
    });
  }, [editor]);

  const undo = useCallback(() => {
    editor?.dispatchCommand(UNDO_COMMAND, undefined);
  }, [editor]);

  const redo = useCallback(() => {
    editor?.dispatchCommand(REDO_COMMAND, undefined);
  }, [editor]);

  const formatText = useCallback((format: TextFormatType) => {
    editor?.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  }, [editor]);

  const insertHeading = useCallback((level: HeadingTagType) => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        const heading = $createHeadingNode(level);
        paragraph.replace(heading);
        heading.select(0, 0);
        return;
      }
      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElement();
      if (topLevel) {
        const heading = $createHeadingNode(level);
        const paragraph = $createParagraphNode();
        heading.append(paragraph);
        topLevel.replace(heading);
        heading.select(0, 0);
      }
    });
  }, [editor]);

  const insertQuote = useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        const quote = $createQuoteNode();
        const paragraph = $createParagraphNode();
        quote.append(paragraph);
        $getRoot().append(quote);
        quote.select(0, 0);
        return;
      }
      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElement();
      if (topLevel) {
        const quote = $createQuoteNode();
        const paragraph = $createParagraphNode();
        quote.append(paragraph);
        topLevel.replace(quote);
        quote.select(0, 0);
      }
    });
  }, [editor]);

  const insertCodeBlock = useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        const code = $createCodeNode();
        const paragraph = $createParagraphNode();
        code.append(paragraph);
        $getRoot().append(code);
        code.select(0, 0);
        return;
      }
      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElement();
      if (topLevel) {
        const code = $createCodeNode();
        const paragraph = $createParagraphNode();
        code.append(paragraph);
        topLevel.replace(code);
        code.select(0, 0);
      }
    });
  }, [editor]);

  const insertList = useCallback((listType: 'bullet' | 'number' | 'check') => {
    if (!editor) return;
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else if (listType === 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else if (listType === 'check') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    }
  }, [editor]);

  const insertLink = useCallback(() => {
    setLinkModalOpen(true);
  }, []);

  const submitLink = useCallback(
    (url: string) => {
      editor?.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    },
    [editor],
  );

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3', includeHeaders: { rows: true, columns: false } });
  }, [editor]);

  const insertHorizontalRule = useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([$createParagraphNode()]);
      }
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
    });
  }, [editor]);

  return (
    <div className="toolbar-scroll" role="toolbar" aria-label="書式ツールバー">
      <ToolbarButton icon={Undo} onClick={undo} title="元に戻す" />
      <ToolbarButton icon={Redo} onClick={redo} title="やり直す" />
      <Divider />
      <ToolbarButton icon={Bold} isActive={isBold} onClick={() => formatText('bold')} title="太字" />
      <ToolbarButton icon={Italic} isActive={isItalic} onClick={() => formatText('italic')} title="斜体" />
      <ToolbarButton icon={Underline} isActive={isUnderline} onClick={() => formatText('underline')} title="下線" />
      <ToolbarButton icon={Strikethrough} isActive={isStrikethrough} onClick={() => formatText('strikethrough')} title="取り消し線" />
      <ToolbarButton icon={Code} isActive={isCode} onClick={() => formatText('code')} title="インラインコード" />
      <ToolbarButton icon={Subscript} isActive={isSubscript} onClick={() => formatText('subscript')} title="下付き" />
      <ToolbarButton icon={Superscript} isActive={isSuperscript} onClick={() => formatText('superscript')} title="上付き" />
      <Divider />
      <ToolbarButton icon={Heading1} onClick={() => insertHeading('h1')} title="見出し1" />
      <ToolbarButton icon={Heading2} onClick={() => insertHeading('h2')} title="見出し2" />
      <ToolbarButton icon={Heading3} onClick={() => insertHeading('h3')} title="見出し3" />
      <ToolbarButton icon={Heading4} onClick={() => insertHeading('h4')} title="見出し4" />
      <ToolbarButton icon={Heading5} onClick={() => insertHeading('h5')} title="見出し5" />
      <ToolbarButton icon={Heading6} onClick={() => insertHeading('h6')} title="見出し6" />
      <Divider />
      <ToolbarButton icon={List} onClick={() => insertList('bullet')} title="箇条書き" />
      <ToolbarButton icon={ListOrdered} onClick={() => insertList('number')} title="番号付きリスト" />
      <ToolbarButton icon={ListChecks} onClick={() => insertList('check')} title="チェックリスト" />
      <ToolbarButton icon={Quote} onClick={insertQuote} title="引用" />
      <ToolbarButton icon={Terminal} onClick={insertCodeBlock} title="コードブロック" />
      <Divider />
      <ToolbarButton icon={Link} onClick={insertLink} title="リンクを挿入" />
      <ToolbarButton icon={Table2} onClick={insertTable} title="表を挿入" />
      <ToolbarButton icon={Minus} onClick={insertHorizontalRule} title="水平線" />
      <Divider />
      <ToolbarButton icon={Save} onClick={onSaveRequest} title="保存" />
      <div className="relative shrink-0">
        <ToolbarButton icon={Download} isActive={showDownloadMenu} onClick={() => setShowDownloadMenu(!showDownloadMenu)} title="書き出し" />
        {showDownloadMenu && (
            <div className="absolute top-full left-0 mt-1 py-1 bg-black/90 border border-primary/50 rounded shadow-lg z-50 min-w-[160px]" role="menu" aria-label="書き出し形式">
            {EXPORT_MENU.map((option) => (
              <button
                key={option.format}
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowDownloadMenu(false);
                  onExport(option.format);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-foreground/80 hover:bg-primary/20 hover:text-primary transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <LinkEditorModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSubmit={submitLink}
      />
    </div>
  );
}

export default Toolbar;
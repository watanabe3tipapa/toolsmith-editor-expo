import type { MultilineElementTransformer } from '@lexical/markdown';
import type { LexicalNode } from 'lexical';
import { $createTextNode } from 'lexical';
import {
  $createTableNodeWithDimensions,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';

function escapePipe(text: string): string {
  return text.replace(/\|/g, '\\|');
}

function cellText(cellNode: LexicalNode): string {
  if (!$isTableCellNode(cellNode)) return '';
  return cellNode.getTextContent().replace(/\n/g, ' ').trim();
}

function exportTable(node: LexicalNode): string | null {
  if (!$isTableNode(node)) return null;
  const rows: string[][] = [];
  for (const rowNode of node.getChildren()) {
    if (!$isTableRowNode(rowNode)) continue;
    const cells: string[] = [];
    for (const cellNode of rowNode.getChildren()) {
      if ($isTableCellNode(cellNode)) cells.push(escapePipe(cellText(cellNode)));
    }
    rows.push(cells);
  }
  if (rows.length === 0) return null;

  const columnCount = Math.max(...rows.map((row) => row.length));
  const output: string[] = [];

  rows.forEach((row, index) => {
    while (row.length < columnCount) row.push('');
    if (index === 1) {
      output.push(`| ${rows[0].map(() => '---').join(' | ')} |`);
    }
    output.push(`| ${row.join(' | ')} |`);
  });

  return output.join('\n');
}

function parseGfmTable(lines: string[]): string[][] | null {
  const rows: string[][] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());
    rows.push(cells);
  }
  if (rows.length < 2) return null;

  const header = rows[0];
  const separator = rows[1];
  const isSeparatorRow =
    separator.length === header.length &&
    separator.every((cell) => /^:?-+:?$/.test(cell));
  if (!isSeparatorRow) return null;

  rows.splice(1, 1);
  return rows;
}

const TABLE: MultilineElementTransformer = {
  type: 'multiline-element',
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: exportTable,
  regExpStart: /^\s*\|/,
  replace: () => false,
  handleImportAfterStartMatch({ lines, rootNode, startLineIndex }) {
    let endIndex = startLineIndex;
    while (endIndex < lines.length && /^\s*\|.*\|\s*$/.test(lines[endIndex])) {
      endIndex += 1;
    }
    if (endIndex === startLineIndex) return null;

    const tableLines = lines.slice(startLineIndex, endIndex);
    const rows = parseGfmTable(tableLines);
    if (rows == null) return null;

    const columnCount = Math.max(...rows.map((row) => row.length));
    const tableNode = $createTableNodeWithDimensions(rows.length, columnCount, true);

    let rowIndex = 0;
    for (const rowNode of tableNode.getChildren()) {
      if (!$isTableRowNode(rowNode)) continue;
      let cellIndex = 0;
      for (const cellNode of rowNode.getChildren()) {
        if (!$isTableCellNode(cellNode)) continue;
        const raw = rows[rowIndex]?.[cellIndex] ?? '';
        const text = raw.replace(/\\\|/g, '|');
        if (text) cellNode.append($createTextNode(text));
        cellIndex += 1;
      }
      rowIndex += 1;
    }

    rootNode.append(tableNode);
    return [true, endIndex - 1];
  },
};

export { TABLE };
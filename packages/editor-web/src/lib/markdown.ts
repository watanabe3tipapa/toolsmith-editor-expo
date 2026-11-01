import { $createCodeNode, $isCodeNode, CodeNode } from '@lexical/code';
import { TRANSFORMERS, CODE, type Transformer } from '@lexical/markdown';
import {
  $createTextNode,
  type ElementNode,
  type LexicalNode,
} from 'lexical';
import { TABLE } from './table';

const CODE_START_REGEX = /^[ \t]*```([\w-]+)?/;
const CODE_END_REGEX = /[ \t]*```$/;

/**
 * Lexical 標準の CODE トランスフォーマーは言語名に `\w+` しか許可しないため、
 * `music-abc` のようなハイフン入りのフェンスが `music` + 本文 `-abc` に分解される。
 * ABC 記譜のフェンスをそのまま往復させるため、言語名に `-` を許可した
 * トランスフォーマーで標準の CODE を置き換える。
 */
const CODE_WITH_HYPHEN: Transformer = {
  dependencies: [CodeNode],
  export: (node: LexicalNode) => {
    if (!$isCodeNode(node)) return null;
    const textContent = node.getTextContent();
    return (
      '```' +
      (node.getLanguage() || '') +
      (textContent ? '\n' + textContent : '') +
      '\n' +
      '```'
    );
  },
  regExpEnd: {
    optional: true,
    regExp: CODE_END_REGEX,
  },
  regExpStart: CODE_START_REGEX,
  replace: (
    rootNode: ElementNode,
    children: LexicalNode[] | null,
    startMatch: string[],
    endMatch: string[] | null,
    linesInBetween: string[] | null,
    isImport: boolean,
  ) => {
    if (!children && linesInBetween) {
      if (linesInBetween.length === 1) {
        if (endMatch) {
          const codeBlockNode = $createCodeNode();
          const code = startMatch[1] + linesInBetween[0];
          codeBlockNode.append($createTextNode(code));
          rootNode.append(codeBlockNode);
          return;
        }
        const codeBlockNode = $createCodeNode(startMatch[1]);
        const code = linesInBetween[0].startsWith(' ')
          ? linesInBetween[0].slice(1)
          : linesInBetween[0];
        codeBlockNode.append($createTextNode(code));
        rootNode.append(codeBlockNode);
        return;
      }

      const codeBlockNode = $createCodeNode(startMatch[1]);
      if (linesInBetween[0].trim().length === 0) {
        while (linesInBetween.length > 0 && !linesInBetween[0].length) {
          linesInBetween.shift();
        }
      } else {
        linesInBetween[0] = linesInBetween[0].startsWith(' ')
          ? linesInBetween[0].slice(1)
          : linesInBetween[0];
      }
      while (
        linesInBetween.length > 0 &&
        !linesInBetween[linesInBetween.length - 1].length
      ) {
        linesInBetween.pop();
      }
      codeBlockNode.append($createTextNode(linesInBetween.join('\n')));
      rootNode.append(codeBlockNode);
      return;
    }

    if (children) {
      const codeBlockNode = $createCodeNode(startMatch[1]);
      codeBlockNode.append(...children);
      rootNode.replace(codeBlockNode);
      if (!isImport) {
        codeBlockNode.select(0, 0);
      }
    }
  },
  type: 'multiline-element',
};

export const TRANSFORMERS_WITH_TABLE: Transformer[] = [
  ...TRANSFORMERS.filter((transformer) => transformer !== CODE),
  CODE_WITH_HYPHEN,
  TABLE,
];

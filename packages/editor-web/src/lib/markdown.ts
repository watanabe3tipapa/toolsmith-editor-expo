import { TRANSFORMERS } from '@lexical/markdown';
import type { Transformer } from '@lexical/markdown';
import { TABLE } from './table';

export const TRANSFORMERS_WITH_TABLE: Array<Transformer> = [
  ...TRANSFORMERS,
  TABLE,
];
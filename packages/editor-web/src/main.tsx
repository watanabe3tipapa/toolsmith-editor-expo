import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import './editor.css';
import EditorApp from './EditorApp';

const container = document.getElementById('root');
if (!container) throw new Error('Editor root element was not found.');

createRoot(container).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { NotebookPage } from './NotebookPage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotebookPage id="three-wash-sq" />
  </StrictMode>,
);

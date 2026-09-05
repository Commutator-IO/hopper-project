import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { LedgerPage } from './LedgerPage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LedgerPage id="book-i" />
  </StrictMode>,
);

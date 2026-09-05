import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ContributePage } from './ContributePage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContributePage />
  </StrictMode>,
);

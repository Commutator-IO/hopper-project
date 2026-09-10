import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { DiariesPage } from './DiariesPage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DiariesPage />
  </StrictMode>,
);

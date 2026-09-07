import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { FormatsPage } from './FormatsPage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FormatsPage />
  </StrictMode>,
);

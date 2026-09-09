import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { SchemaPage } from './SchemaPage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SchemaPage />
  </StrictMode>,
);

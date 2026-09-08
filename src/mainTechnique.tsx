import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { TechniquePage } from './TechniquePage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TechniquePage />
  </StrictMode>,
);

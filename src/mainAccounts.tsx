import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AccountsPage } from './AccountsPage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountsPage />
  </StrictMode>,
);

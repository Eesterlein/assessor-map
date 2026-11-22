import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './hooks/AuthContext';
import { SettingsProvider } from './hooks/SettingsContext';
import { AutoDetectTipg } from './components/AutoDetectTipg';
import { setWorkerUrl } from 'maplibre-gl';
// MapLibre 6 parses tiles in a separate module worker; point it at Vite's bundled copy.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

setWorkerUrl(maplibreWorkerUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SettingsProvider>
        <AuthProvider>
          <AutoDetectTipg />
          <App />
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>
);

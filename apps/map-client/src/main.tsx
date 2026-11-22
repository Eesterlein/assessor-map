import React from 'react';
import ReactDOM from 'react-dom/client';
import { NuqsAdapter } from 'nuqs/adapters/react';
import App from './App';
import '@techtraverse/map-ui-lib/tailwind.css';
import './styles/main.css';
import { setWorkerUrl } from 'maplibre-gl';
// MapLibre 6 parses tiles in a separate module worker; point it at Vite's bundled copy.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

setWorkerUrl(maplibreWorkerUrl);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NuqsAdapter>
      <App />
    </NuqsAdapter>
  </React.StrictMode>
);

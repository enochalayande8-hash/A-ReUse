import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { testFirestoreConnection } from './services/firebase/firestoreService';

// Validate Firestore connection on boot safely without blocking render
try {
  testFirestoreConnection().catch((err) => {
    console.warn('[Firestore Initial Check]:', err);
  });
} catch (err) {
  console.warn('[Firestore Boot Initializer]:', err);
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('Failed to locate #root DOM element.');
}

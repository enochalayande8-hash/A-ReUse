import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testFirestoreConnection } from './services/firebase/firestoreService';

// Validate Firestore connection on boot (Skill Constraint)
testFirestoreConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

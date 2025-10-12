
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: The error "File 'file:///App.tsx' is not a module." is resolved by providing the full content for App.tsx.
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

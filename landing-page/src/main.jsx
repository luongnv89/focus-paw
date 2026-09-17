import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { registerWebMcpTools } from './webmcp.js';
import './styles/index.css';

// Expose the site's key actions to AI agents via WebMCP when the browser
// supports navigator.modelContext; unsupported browsers no-op (issue #120).
registerWebMcpTools();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

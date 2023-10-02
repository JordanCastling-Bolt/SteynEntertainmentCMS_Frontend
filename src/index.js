import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Root from './Root'; // Make sure you're importing the Root component
import reportWebVitals from './reportWebVitals';

const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

reportWebVitals();

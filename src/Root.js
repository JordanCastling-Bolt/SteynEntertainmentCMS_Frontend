import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import App from './App';
import Login from './components/Login';

function Root() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/app" element={<App />} />
        {/* ... other routes if needed */}
      </Routes>
    </Router>
  );
}

export default Root;

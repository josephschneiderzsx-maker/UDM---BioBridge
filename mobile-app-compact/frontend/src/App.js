import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ServerConfigScreen from './screens/ServerConfigScreen';
import LoginScreen from './screens/LoginScreen';
import DoorListScreen from './screens/DoorListScreen';
import DoorControlScreen from './screens/DoorControlScreen';
import SplashScreen from './screens/SplashScreen';
import './App.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkState = () => {
      const serverUrl = localStorage.getItem('serverUrl');
      const token = localStorage.getItem('token');
      const tenant = localStorage.getItem('tenant');

      if (!serverUrl) {
        setInitialRoute('/config');
      } else if (!token || !tenant) {
        setInitialRoute('/login');
      } else {
        setInitialRoute('/doors');
      }
    };

    checkState();
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash || !initialRoute) {
    return (
      <div className="mobile-frame">
        <SplashScreen />
      </div>
    );
  }

  return (
    <div className="mobile-frame">
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Navigate to={initialRoute} replace />} />
            <Route path="/config" element={<ServerConfigScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/doors" element={<DoorListScreen />} />
            <Route path="/door/:id" element={<DoorControlScreen />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </div>
  );
}

export default App;

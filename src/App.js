import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import RestaurantDetail from './components/RestaurantDetail';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    }, (error) => {
      console.error("Auth state changed error:", error);
      setAuthError(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage currentUser={currentUser} authError={authError} />} />
        <Route path="/adreslerim" element={<HomePage currentUser={currentUser} authError={authError} />} />
        <Route path="/siparislerim" element={<HomePage currentUser={currentUser} authError={authError} />} />
        <Route path="/odeme-yontemlerim" element={<HomePage currentUser={currentUser} authError={authError} />} />
        <Route path="/iletisim-tercihlerim" element={<HomePage currentUser={currentUser} authError={authError} />} />
        <Route path="/hesabim" element={<HomePage currentUser={currentUser} authError={authError} />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App; 
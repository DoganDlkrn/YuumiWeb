import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import RestaurantDetail from "./components/RestaurantDetail";
import { auth } from "./firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect sonucunu işle (Google ile giriş için)
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // Başarılı giriş
          console.log("Redirect sonrası başarılı giriş:", result.user.email);
        }
      } catch (error) {
        // Redirect hatası
        console.error("Google giriş hatası:", error.code, error.message);
        setError("Google ile giriş yapılırken bir hata oluştu: " + error.message);
      }
    };

    handleRedirect();
  }, []);

  // Oturum durumunu takip et
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      console.log("Oturum durumu değişti:", currentUser ? currentUser.email : "Giriş yapılmadı");
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage currentUser={user} authError={error} />} />
        <Route path="/adreslerim" element={<HomePage currentUser={user} authError={error} />} />
        <Route path="/siparislerim" element={<HomePage currentUser={user} authError={error} />} />
        <Route path="/odeme-yontemlerim" element={<HomePage currentUser={user} authError={error} />} />
        <Route path="/iletisim-tercihlerim" element={<HomePage currentUser={user} authError={error} />} />
        <Route path="/hesabim" element={<HomePage currentUser={user} authError={error} />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />
        <Route path="/restaurant/:id/menu" element={<RestaurantDetail initialTab="menu" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
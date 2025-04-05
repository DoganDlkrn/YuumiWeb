import React, { useState } from "react";
import "./LoginModal.css"; // Aynı stil dosyasını kullanabiliriz
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function RegisterModal({ onClose, onLoginClick }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Kayıt işlemi
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      setError("Lütfen zorunlu alanları doldurunuz.");
      return;
    }
    
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      // Firebase ile kullanıcı oluşturma
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Kullanıcı başarıyla oluşturuldu:", userCredential.user.email);
      
      // Başarılı kayıt
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error("Kayıt hatası:", error.code);
      
      if (error.code === 'auth/email-already-in-use') {
        setError("Bu e-posta adresi zaten kullanımda.");
      } else if (error.code === 'auth/invalid-email') {
        setError("Geçersiz e-posta adresi.");
      } else if (error.code === 'auth/weak-password') {
        setError("Şifre çok zayıf.");
      } else {
        setError("Kayıt sırasında bir hata oluştu: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="login-modal">
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
        
        <h2>Üye Ol</h2>
        <p>Hemen üye ol ve avantajlardan yararlan</p>
        
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">Kaydınız başarıyla tamamlandı! Yönlendiriliyorsunuz...</div>}
        
        <form onSubmit={handleRegister} className="auth-options">
          <div className="auth-input-group">
            <input 
              type="text" 
              placeholder="Ad Soyad" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input 
              type="email" 
              placeholder="E-posta" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Şifre" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input 
              type="tel" 
              placeholder="Telefon Numarası" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          
          <button 
            type="submit"
            className="auth-button register-button"
            disabled={loading}
          >
            {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
          </button>
          
          <div className="auth-footer">
            <p>
              Zaten bir hesabın var mı? {" "}
              <button 
                type="button"
                onClick={onLoginClick} 
                className="link-button"
                disabled={loading}
              >
                Giriş Yap
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
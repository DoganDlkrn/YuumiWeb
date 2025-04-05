import React, { useState, useEffect } from "react";
import "./LoginModal.css";
import googleLogo from "../assets/google.png"; // Google logosu için (varsa)
import { auth } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithRedirect
} from "firebase/auth";

export default function LoginModal({ onClose, onRegisterClick, authError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authError || "");
  const [loading, setLoading] = useState(false);
  
  // authError değişirse hata mesajını güncelle
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);
  
  // Email/Şifre ile giriş yapma
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Lütfen e-posta ve şifre alanlarını doldurunuz.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
      onClose(); // Başarılı giriş sonrası modalı kapat
    } catch (error) {
      switch(error.code) {
        case "auth/invalid-credential":
          setError("E-posta veya şifre hatalı.");
          break;
        case "auth/too-many-requests":
          setError("Çok fazla hatalı giriş. Lütfen daha sonra tekrar deneyiniz.");
          break;
        default:
          setError("Giriş yaparken bir hata oluştu. Lütfen tekrar deneyiniz.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Google ile giriş yapma
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Optimizasyon ve sorun giderme
      const provider = new GoogleAuthProvider();
      
      // Kapsamları sınırlandırıp sadece gerekli olanları isteyelim
      provider.addScope('email');
      provider.addScope('profile');
      
      // Firebase web API ile tarayıcıyı kontrol etme
      provider.setCustomParameters({
        prompt: 'select_account', // Her zaman hesap seçtir
        login_hint: email || '', // Varsa e-postayı öner
      });
      
      // Daha az bilgili yapılandırma deneyeceğiz
      console.log("Google login attempt - new approach");
      
      // Popup yerine redirect deneyelim (bu sayfadan ayrılacak)
      await signInWithRedirect(auth, provider);
      
      // Bu noktaya hiç ulaşılmayacak çünkü redirect ile sayfa yeniden yüklenecek
      // Redirect sonuçları App.jsx'te ele alınıyor
    } catch (error) {
      console.error("Google login error:", error.code, error.message);
      
      if (error.code === 'auth/unauthorized-domain') {
        setError("Bu domain Google ile giriş için yetkilendirilmemiş. Lütfen e-posta/şifre ile giriş yapın.");
      } else if (error.code?.includes('api-key')) {
        setError("API anahtarı hatası. Lütfen e-posta/şifre ile giriş yapın.");
      } else {
        setError(`Google ile giriş yapılamadı: ${error.message || "Bilinmeyen hata"}`);
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
        
        <h2>Giriş Yap</h2>
        <p>Hesabına giriş yaparak devam et</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleEmailLogin} className="auth-options">
          <div className="auth-input-group">
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
          </div>
          
          <button 
            type="submit"
            className="auth-button login-button"
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
          
          <div className="divider">
            <span>ya da</span>
          </div>
          
          <button 
            type="button"
            className="auth-button google-button"
            onClick={() => {
              // Firebase değil, manuel Google OAuth yönlendirmesi
              window.location.href = "https://accounts.google.com/signin";
            }}
            disabled={loading}
          >
            <img src={googleLogo} alt="Google" className="google-icon" />
            <span>Google ile giriş yap</span>
          </button>
          
          <div className="auth-footer">
            <p>
              Hesabın yok mu? {" "}
              <button 
                type="button"
                onClick={onRegisterClick} 
                className="link-button"
                disabled={loading}
              >
                Üye Ol
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
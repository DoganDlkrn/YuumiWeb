import React, { useState, useEffect } from "react";
import "./LoginModal.css";
import googleLogo from "../assets/google.png"; // Google logosu için (varsa)
import logo from "../assets/Y.png"; // Add logo import
import turkeyFlag from "../assets/turkey_flag.png"; // Türk bayrağı import
import { auth } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithRedirect,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";

export default function LoginModal({ onClose, onRegisterClick, authError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authError || "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email"); // email, phone
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  
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
      
      try {
        // Popup kullanarak Google ile giriş yapalım (redirect yerine)
        const result = await signInWithPopup(auth, provider);
        onClose(); // Başarılı giriş sonrası modalı kapat
      } catch (error) {
        // Popup başarısız olursa, alternatif bir yaklaşım deneyin
        console.error("Popup failed, trying alternative approach:", error);
        // Popup başarısız oldu, manuel yönlendirme yapalım
        window.location.href = "https://accounts.google.com/signin";
      }
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
  
  // Telefon numarası formatlama
  const formatPhoneNumber = (input) => {
    // Sadece rakamları al
    const numbers = input.replace(/\D/g, '');
    
    // Maksimum 10 rakam
    const limitedNumbers = numbers.slice(0, 10);
    
    // Formatla: XXX XXX XX XX
    let formatted = '';
    for (let i = 0; i < limitedNumbers.length; i++) {
      // Boşluk ekle: 3. rakamdan sonra, 6. rakamdan sonra ve 8. rakamdan sonra
      if (i === 3 || i === 6 || i === 8) {
        formatted += ' ';
      }
      formatted += limitedNumbers[i];
    }
    
    return formatted;
  };

  const handlePhoneChange = (e) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setPhone(formattedPhone);
  };
  
  // Telefon numarası ile giriş - doğrulama kodu gönderme
  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    
    if (!phone) {
      setError("Lütfen telefon numaranızı giriniz.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      // Telefon numarasını düzelt
      const phoneNumber = "+90" + phone.replace(/\s/g, '');
      
      // Web için reCAPTCHA doğrulama oluştur
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible'
        });
      }
      
      // SMS gönder
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        phoneNumber, 
        window.recaptchaVerifier
      );
      
      // Doğrulama kodu ekranını göster
      setVerificationId(confirmationResult.verificationId);
      setShowVerification(true);
      
    } catch (error) {
      console.error("Telefon giriş hatası:", error);
      setError("Telefon numarası doğrulaması başarısız: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Doğrulama kodu ile giriş tamamlama
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!verificationCode) {
      setError("Lütfen doğrulama kodunu giriniz.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      // Doğrulama kodunu gönder
      const credential = firebase.auth.PhoneAuthProvider.credential(
        verificationId, 
        verificationCode
      );
      
      // Kullanıcı giriş yap
      await signInWithCredential(auth, credential);
      
      // Modal kapat
      onClose();
      
    } catch (error) {
      console.error("Kod doğrulama hatası:", error);
      setError("Doğrulama kodu yanlış veya süresi dolmuş.");
    } finally {
      setLoading(false);
    }
  };
  
  // Şifre görünürlüğünü değiştir
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Giriş metodunu değiştir
  const switchLoginMethod = (method) => {
    setLoginMethod(method);
    setError(""); // Hata mesajını temizle
  };
  
  return (
    <>
      <div className="modal-overlay">
        <div className="login-modal">
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
          
          <h2>Giriş Yap</h2>
          <p>Hesabına giriş yaparak devam et</p>
          
          {error && <div className="auth-error">{error}</div>}
          
          {/* Giriş methodu seçimi */}
          <div className="login-method-tabs">
            <button 
              className={`tab-button ${loginMethod === 'email' ? 'active' : ''}`}
              onClick={() => switchLoginMethod('email')}
            >
              E-posta ile
            </button>
            <button 
              className={`tab-button ${loginMethod === 'phone' ? 'active' : ''}`}
              onClick={() => switchLoginMethod('phone')}
            >
              Telefon ile
            </button>
          </div>
          
          {loginMethod === 'email' ? (
            <form onSubmit={handleEmailLogin} className="auth-options">
              <div className="auth-input-group">
                <input 
                  type="email" 
                  placeholder="E-posta" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
                
                <div className="password-input-container">
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Şifre" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                  <button 
                    type="button"
                    className="password-toggle" 
                    onClick={togglePasswordVisibility}
                    tabIndex="-1"
                    aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    <div className={showPassword ? "eye-open" : "eye-closed"}></div>
                  </button>
                </div>
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
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <img src={googleLogo} alt="Google" className="google-icon" />
                <span>Google ile giriş yap</span>
              </button>
            </form>
          ) : showVerification ? (
            <form onSubmit={handleVerifyCode} className="auth-options">
              <div className="auth-input-group">
                <p className="verification-text">
                  <strong>{"+90" + phone.replace(/\s/g, '')}</strong> numaralı telefona doğrulama kodu gönderdik.
                </p>
                <input 
                  type="text" 
                  placeholder="Doğrulama Kodu" 
                  value={verificationCode} 
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
              </div>
              
              <button 
                type="submit"
                className="auth-button login-button"
                disabled={loading}
              >
                {loading ? "Doğrulanıyor..." : "Doğrula"}
              </button>
              
              <button 
                type="button"
                className="link-button"
                onClick={() => setShowVerification(false)}
                disabled={loading}
              >
                Geri Dön
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneLogin} className="auth-options">
              <div className="auth-input-group">
                <div className="phone-input-container">
                  <div className="country-code">
                    <img src={turkeyFlag} alt="Turkey" className="country-flag" />
                    <span>+90</span>
                  </div>
                  <input 
                    type="tel" 
                    placeholder="Telefon Numarası" 
                    value={phone}
                    onChange={handlePhoneChange}
                    className="phone-input"
                  />
                </div>
              </div>
              
              <div id="recaptcha-container"></div>
              
              <button 
                type="submit"
                className="auth-button login-button"
                disabled={loading}
              >
                {loading ? "Kod gönderiliyor..." : "Doğrulama Kodu Gönder"}
              </button>
            </form>
          )}
          
          <div className="auth-footer">
            <p>
              Hesabın yok mu? {" "}
              <button 
                type="button"
                onClick={onRegisterClick} 
                className="link-button"
                disabled={loading}
              >
                Kayıt Ol
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
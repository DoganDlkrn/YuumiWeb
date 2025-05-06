import React, { useState } from "react";
import "./LoginModal.css"; // Aynı stil dosyasını kullanabiliriz
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import turkeyFlag from "../assets/turkey_flag.png"; // Türk bayrağı import
import googleLogo from "../assets/google.png"; // Google logosu için

export default function RegisterModal({ onClose, onLoginClick }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Kayıt işlemi
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Lütfen zorunlu alanları doldurunuz.");
      return;
    }
    
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      // Firebase ile kullanıcı oluşturma
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Kullanıcı profilini güncelle (ad, soyad, telefon)
      await userCredential.user.updateProfile({
        displayName: `${firstName} ${lastName}`
      });
      
      // Ekstra bilgileri veritabanına kaydedebiliriz (telefon gibi)
      // Firestore kullanılıyorsa buraya ekleme yapılabilir
      
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

  // Google ile kayıt işlemi
  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      setError("");
      
      const provider = new GoogleAuthProvider();
      
      // Kapsamları sınırlandırıp sadece gerekli olanları isteyelim
      provider.addScope('email');
      provider.addScope('profile');
      
      // Firebase web API ile tarayıcıyı kontrol etme
      provider.setCustomParameters({
        prompt: 'select_account', // Her zaman hesap seçtir
      });
      
      // Popup kullanarak Google ile giriş yapalım
      const result = await signInWithPopup(auth, provider);
      onClose(); // Başarılı giriş sonrası modalı kapat
      
    } catch (error) {
      console.error("Google kayıt hatası:", error.code, error.message);
      
      if (error.code === 'auth/unauthorized-domain') {
        setError("Bu domain Google ile kayıt için yetkilendirilmemiş.");
      } else if (error.code?.includes('api-key')) {
        setError("API anahtarı hatası. Lütfen e-posta/şifre ile kayıt olun.");
      } else {
        setError(`Google ile kayıt yapılamadı: ${error.message || "Bilinmeyen hata"}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Telefon formatını düzenleme
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
  
  // Şifre görünürlüğünü değiştir
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="modal-overlay">
      <div className="login-modal">
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
        
        <h2>Kayıt Ol</h2>
        <p>Hemen üye ol ve avantajlardan yararlan</p>
        
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">Kaydınız başarıyla tamamlandı! Yönlendiriliyorsunuz...</div>}
        
        <form onSubmit={handleRegister} className="auth-options">
          <div className="auth-input-group">
            <div className="name-input-container">
              <input 
                type="text" 
                placeholder="Ad" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="name-input"
              />
              <input 
                type="text" 
                placeholder="Soyad" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="name-input"
              />
            </div>
            
            <input 
              type="email" 
              placeholder="E-posta" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
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
            
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Şifre Tekrar" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit"
            className="auth-button register-button"
            disabled={loading}
          >
            {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
          </button>
          
          <div className="auth-separator">
            <span>ya da</span>
          </div>
          
          <button 
            type="button"
            className="auth-button google-button"
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            <img src={googleLogo} alt="Google" className="google-logo" />
            Google ile giriş yap
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
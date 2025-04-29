import React, { useState } from "react";
import "./LoginModal.css"; // Aynı stil dosyasını kullanabiliriz
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import turkeyFlag from "../assets/turkey_flag.png"; // Türk bayrağı import

export default function RegisterModal({ onClose, onLoginClick }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
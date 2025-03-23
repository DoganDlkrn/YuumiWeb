import React from "react";
import "./LoginModal.css"; // Aynı stil dosyasını kullanabiliriz

export default function RegisterModal({ onClose, onLoginClick }) {
  return (
    <div className="modal-overlay">
      <div className="login-modal">
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
        
        <h2>Üye Ol</h2>
        <p>Hemen üye ol ve avantajlardan yararlan</p>
        
        <div className="auth-options">
          <div className="auth-input-group">
            <input type="text" placeholder="Ad Soyad" />
            <input type="email" placeholder="E-posta" />
            <input type="password" placeholder="Şifre" />
            <input type="tel" placeholder="Telefon Numarası" />
          </div>
          
          <button className="auth-button register-button">Kayıt Ol</button>
          
          <div className="auth-footer">
            <p>
              Zaten bir hesabın var mı? {" "}
              <button 
                onClick={onLoginClick} 
                className="link-button"
              >
                Giriş Yap
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
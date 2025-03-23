import React from "react";
import "./LoginModal.css";
import googleLogo from "../assets/google.png"; // Google logosu için (varsa)

export default function LoginModal({ onClose, onRegisterClick }) {
  return (
    <div className="modal-overlay">
      <div className="login-modal">
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
        
        <h2>Giriş Yap</h2>
        <p>Hesabına giriş yaparak devam et</p>
        
        <div className="auth-options">
          <div className="auth-input-group">
            <input type="email" placeholder="E-posta" />
            <input type="password" placeholder="Şifre" />
          </div>
          
          <button className="auth-button login-button">Giriş Yap</button>
          
          <div className="divider">
            <span>ya da</span>
          </div>
          
          <button className="auth-button google-button">
            <img src={googleLogo} alt="Google" className="google-icon" />
            <span>Google ile giriş yap</span>
          </button>
          
          <div className="auth-footer">
            <p>
              Hesabın yok mu? {" "}
              <button 
                onClick={onRegisterClick} 
                className="link-button"
              >
                Üye Ol
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
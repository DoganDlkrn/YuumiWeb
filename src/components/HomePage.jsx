import React, { useState } from "react";
import "./HomePage.css";
import logoImg from "../assets/Y.png";
import basketImg from "../assets/basket.png";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";

export default function HomePage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('haftalik'); // Varsayılan olarak haftalık seçili
  
  // Giriş Yap modalını gösterme fonksiyonu
  const openLoginModal = () => {
    setShowLoginModal(true);
    setShowRegisterModal(false);
  };
  
  // Kayıt Ol modalını gösterme fonksiyonu
  const openRegisterModal = () => {
    setShowRegisterModal(true);
    setShowLoginModal(false);
  };
  
  // Modalı kapatma fonksiyonu
  const closeModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };
  
  return (
    <div className="homepage">
      <header className="navbar">
        <div className="nav-left">
          <img src={logoImg} alt="Yuumi Logo" className="logo" />
          <span className="brand">Yuumi</span>
        </div>
        
        {/* Navbar içinde kategori sekmeleri */}
        <div className="nav-center">
          <div className="navbar-categories">
            <button 
              className={`category-button ${activeCategory === 'haftalik' ? 'active' : ''}`}
              onClick={() => setActiveCategory('haftalik')}
            >
              <div className="category-icon weekly-icon"></div>
              <span>Haftalık</span>
            </button>
            <button 
              className={`category-button ${activeCategory === 'gunluk' ? 'active' : ''}`}
              onClick={() => setActiveCategory('gunluk')}
            >
              <div className="category-icon daily-icon"></div>
              <span>Günlük</span>
            </button>
          </div>
        </div>
        
        <div className="nav-right">
          <button 
            className="btn login-btn" 
            onClick={openLoginModal}
          >
            Giriş Yap
          </button>
          <button 
            className="btn register-btn" 
            onClick={openRegisterModal}
          >
            Kayıt Ol
          </button>
          <img src={basketImg} alt="Sepet" className="basket-icon" />
        </div>
      </header>
      
      <section className="hero">
        <h1>
          {activeCategory === 'haftalik' 
            ? 'Haftalık yemek planınız kapınızda!' 
            : 'Günlük taze yemekler anında kapınızda!'}
        </h1>
        <p>
          {activeCategory === 'haftalik' 
            ? 'Yuumi ile haftalık yemek planı yapabilir, tüm hafta için siparişlerinizi önceden planlayabilirsiniz.'
            : 'Yuumi ile günlük taze yemek siparişlerinizi hızla kapınıza getirebilirsiniz.'}
        </p>
        <div className="address-bar">
          <input type="text" placeholder="Adresini Belirle veya Seç" />
          <button className="btn btn-location">Konumumu Bul</button>
          <button className="btn btn-explore">Keşfet</button>
        </div>
      </section>
      
      {/* Modallar */}
      {showLoginModal && (
        <LoginModal 
          onClose={closeModals} 
          onRegisterClick={openRegisterModal} 
        />
      )}
      
      {showRegisterModal && (
        <RegisterModal 
          onClose={closeModals} 
          onLoginClick={openLoginModal} 
        />
      )}
    </div>
  );
}
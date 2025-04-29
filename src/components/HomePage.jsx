import React, { useState, useEffect, useRef } from "react";
import "./HomePage.css";
import logoImg from "../assets/Y.png";
import basketImg from "../assets/basket.png";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function HomePage({ currentUser, authError }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('haftalik'); // Varsayılan olarak haftalık seçili
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  
  // Sayfa yüklendiğinde hata varsa Login modalını göster
  useEffect(() => {
    if (authError) {
      console.log("Auth hatası nedeniyle login modal açılıyor:", authError);
      setShowLoginModal(true);
    }
  }, [authError]);
  
  // Menü dışında bir yere tıklandığında profil menüsünü kapat
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);
  
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
  
  // Profil menüsünü aç/kapat
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };
  
  // Çıkış yapma fonksiyonu
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowProfileMenu(false);
    } catch (error) {
      console.error("Çıkış yaparken hata oluştu:", error);
    }
  };
  
  // Kullanıcının adını döndüren yardımcı fonksiyon
  const getUserDisplayName = () => {
    if (currentUser) {
      if (currentUser.displayName) {
        return currentUser.displayName;
      } else {
        // E-posta adresinden kullanıcı adını çıkar (@ işaretinden önceki kısım)
        return currentUser.email.split('@')[0];
      }
    }
    return "";
  };
  
  // Telefon numarasını formatla
  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    return phone;
  };
  
  return (
    <div className="homepage">
      <header className="navbar">
        <div className="nav-left">
          <a href="/" className="logo-link">
            <img src={logoImg} alt="Yuumi Logo" className="logo" />
            <span className="brand">Yuumi</span>
          </a>
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
          {currentUser ? (
            <div className="profile-container" ref={profileMenuRef}>
              <button className="profile-button" onClick={toggleProfileMenu}>
                <div className="profile-icon"></div>
                <span className="user-name">{getUserDisplayName()}</span>
              </button>
              
              {showProfileMenu && (
                <div className="profile-dropdown">
                  <div className="profile-header">
                    <div className="profile-info">
                      <p className="profile-name">{getUserDisplayName()}</p>
                      <p className="profile-email">{currentUser.email}</p>
                      {currentUser.phoneNumber && (
                        <p className="profile-phone">{formatPhoneNumber(currentUser.phoneNumber)}</p>
                      )}
                    </div>
                  </div>
                  
                  <ul className="profile-menu-items">
                    <li><button className="profile-menu-item"><div className="item-icon address-icon"></div>Adreslerim</button></li>
                    <li><button className="profile-menu-item"><div className="item-icon orders-icon"></div>Geçmiş Siparişlerim</button></li>
                    <li><button className="profile-menu-item"><div className="item-icon payment-icon"></div>Ödeme Yöntemlerim</button></li>
                    <li><button className="profile-menu-item"><div className="item-icon contact-icon"></div>İletişim Tercihlerim</button></li>
                    <li><button className="profile-menu-item logout-item" onClick={handleLogout}><div className="item-icon logout-icon"></div>Çıkış Yap</button></li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
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
          authError={authError}
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
import React, { useState, useEffect, useRef } from "react";
import "./HomePage.css";
import logoImg from "../assets/Y.png";
import basketImg from "../assets/basket.png";
import orderImg from "../assets/order.png"; // Sipariş ikonu için order.png eklendi
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

export default function HomePage({ currentUser, authError }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('haftalik'); // Varsayılan olarak haftalık seçili
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // İletişim tercihleri için toggle state'leri
  const [emailPreference, setEmailPreference] = useState(true);
  const [notificationPreference, setNotificationPreference] = useState(true);
  const [smsPreference, setSmsPreference] = useState(true);
  const [phonePreference, setPhonePreference] = useState(true);
  
  // Sayfa değiştiğinde activePage'i güncelle
  useEffect(() => {
    const path = location.pathname.substring(1) || 'home';
    setActivePage(path);
  }, [location]);
  
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
  
  // Sayfa değiştirme fonksiyonu
  const navigateTo = (page) => {
    navigate(`/${page}`);
    setShowProfileMenu(false);
  };
  
  // Başlık metnini belirleme
  const getHeaderTitle = () => {
    switch(activePage) {
      case 'home':
        return (
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
        );
      case 'adreslerim':
        return <h2 className="page-title blue-title">Adreslerim</h2>;
      case 'siparislerim':
        return <h2 className="page-title blue-title">Geçmiş Siparişlerim</h2>;
      case 'odeme-yontemlerim':
        return <h2 className="page-title blue-title">Ödeme Yöntemlerim</h2>;
      case 'iletisim-tercihlerim':
        return <h2 className="page-title blue-title">İletişim Tercihlerim</h2>;
      default:
        return (
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
        );
    }
  };
  
  // Farklı sayfaların içeriği
  const renderPageContent = () => {
    switch(activePage) {
      case 'home':
        return (
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
        );
      case 'adreslerim':
        return (
          <div className="page-content">
            <div className="address-list">
              <div className="address-item">
                <div className="address-icon"></div>
                <div className="address-details">
                  <h3>Ev</h3>
                  <p>Çaydaçıra, M5RC+QC, 23350 Şahinkaya/Merkez/Elazığ, Türkiye</p>
                </div>
                <button className="address-delete-btn">Sil</button>
              </div>
              
              <div className="address-item active">
                <div className="address-icon"></div>
                <div className="address-details">
                  <h3>Diğer</h3>
                  <p>Üniversite kütüphanesi, Bina No: 23400, Kat: 1, Elazığ Merkez, Elazığ</p>
                </div>
                <div className="address-check"></div>
              </div>
              
              <button className="add-address-btn">
                <span>+</span> Yeni Adres Ekle
              </button>
            </div>
          </div>
        );
      case 'siparislerim':
        return (
          <div className="page-content">
            <div className="order-list">
              <div className="order-item">
                <div className="order-header">
                  <div className="order-date">24 Mart 2025 • 15:32</div>
                  <div className="order-price">₺380,00</div>
                </div>
                <div className="order-details">
                  <h3>Hot Döner, Merkez (Üniversite Mah.)</h3>
                </div>
                <div className="order-actions">
                  <button className="btn btn-rate">Değerlendir</button>
                  <button className="btn btn-reorder">Tekrarla</button>
                </div>
              </div>
              
              <div className="order-item">
                <div className="order-header">
                  <div className="order-date">12 Mart 2025 • 20:00</div>
                  <div className="order-price">₺230,00</div>
                </div>
                <div className="order-details">
                  <h3>Maydonoz Döner, Merkez (Çaydaçıra Mah.)</h3>
                </div>
                <div className="order-actions">
                  <button className="btn btn-rate">Değerlendir</button>
                  <button className="btn btn-reorder">Tekrarla</button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'odeme-yontemlerim':
        return (
          <div className="page-content">
            <div className="payment-methods">
              <div className="payment-card">
                <div className="card-logo mastercard"></div>
                <div className="card-details">
                  <div className="card-name">Garanti</div>
                  <div className="card-number">517040******38</div>
                </div>
                <button className="card-delete-btn">Sil</button>
              </div>
              
              <div className="payment-card">
                <div className="card-logo troy"></div>
                <div className="card-details">
                  <div className="card-name">Doğan</div>
                  <div className="card-number">97920840******05</div>
                </div>
                <button className="card-delete-btn">Sil</button>
              </div>
              
              <button className="add-payment-btn">
                <span>+</span> Kredi/Banka Kartı
              </button>
            </div>
          </div>
        );
      case 'iletisim-tercihlerim':
        return (
          <div className="page-content">
            <div className="communication-preferences">
              <div className="preference-item">
                <div className="preference-header">E-Posta</div>
                <div className="preference-label">
                  <p>Kampanyalarla ilgili e-posta almak istiyorum.</p>
                </div>
                <div 
                  className={`preference-toggle ${emailPreference ? 'active' : 'inactive'}`}
                  onClick={() => setEmailPreference(!emailPreference)}
                >
                  <div className="toggle-switch"></div>
                </div>
              </div>
              
              <div className="preference-item">
                <div className="preference-header">Bildirim</div>
                <div className="preference-label">
                  <p>Kampanyalarla ilgili bildirim almak istiyorum.</p>
                </div>
                <div 
                  className={`preference-toggle ${notificationPreference ? 'active' : 'inactive'}`}
                  onClick={() => setNotificationPreference(!notificationPreference)}
                >
                  <div className="toggle-switch"></div>
                </div>
              </div>
              
              <div className="preference-item">
                <div className="preference-header">SMS</div>
                <div className="preference-label">
                  <p>Kampanyalarla ilgili SMS almak istiyorum.</p>
                </div>
                <div 
                  className={`preference-toggle ${smsPreference ? 'active' : 'inactive'}`}
                  onClick={() => setSmsPreference(!smsPreference)}
                >
                  <div className="toggle-switch"></div>
                </div>
              </div>
              
              <div className="preference-item">
                <div className="preference-header">Telefon</div>
                <div className="preference-label">
                  <p>Kampanyalarla ilgili cep telefonumdan aranmak istiyorum.</p>
                </div>
                <div 
                  className={`preference-toggle ${phonePreference ? 'active' : 'inactive'}`}
                  onClick={() => setPhonePreference(!phonePreference)}
                >
                  <div className="toggle-switch"></div>
                </div>
              </div>
              
              <div className="preference-note">
                <p>*Kampanyalarla ilgili iletişim tercihlerini kapattığında siparişlerin ve üyelik ayarlarınla ilgili e-posta / bildirim almaya devam edersin.</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <section className="hero">
            <h1>Sayfa Bulunamadı</h1>
            <p>Aradığınız sayfa mevcut değil.</p>
          </section>
        );
    }
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
        
        {/* Navbar içinde dinamik başlık */}
        <div className="nav-center">
          {getHeaderTitle()}
        </div>
        
        <div className="nav-right">
          {currentUser ? (
            <div className="profile-container" ref={profileMenuRef}>
              <button className="profile-button" onClick={toggleProfileMenu}>
                <div className="profile-icon"></div>
                <span className="user-name">{getUserDisplayName()}</span>
                <div className={`dropdown-arrow ${showProfileMenu ? 'up' : 'down'}`}></div>
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
                    <li><button className="profile-menu-item" onClick={() => navigateTo('adreslerim')}><div className="item-icon address-icon"></div>Adreslerim</button></li>
                    <li><button className="profile-menu-item" onClick={() => navigateTo('siparislerim')}><div className="item-icon orders-icon"></div>Geçmiş Siparişlerim</button></li>
                    <li><button className="profile-menu-item" onClick={() => navigateTo('odeme-yontemlerim')}><div className="item-icon payment-icon"></div>Ödeme Yöntemlerim</button></li>
                    <li><button className="profile-menu-item" onClick={() => navigateTo('iletisim-tercihlerim')}><div className="item-icon contact-icon"></div>İletişim Tercihlerim</button></li>
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
      
      {/* Sayfa içeriği */}
      {renderPageContent()}
      
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
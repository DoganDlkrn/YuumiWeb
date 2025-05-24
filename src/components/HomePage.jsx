import React, { useState, useEffect, useRef } from "react";
import "./HomePage.css";
import logoImg from "../assets/Y.png";
import basketImg from "../assets/cartblack.png";
import orderImg from "../assets/order.png"; // Sipariş ikonu için order.png eklendi
import robotIcon from "../assets/robot.png"; // robot.png import edildi
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import RestaurantGrid from "./RestaurantGrid"; // Import RestaurantGrid component
import { auth, db } from "../firebase";
import { signOut, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import MapComponent from './MapComponent';
import WeeklyPlan from './WeeklyPlan';
import AiChefBot from './AiChefBot'; // Chatbot bileşeni import edildi
import './AiChefBot.css'; // Chatbot stil dosyası import edildi
import { collection, getDocs } from "firebase/firestore"; // Firestore fonksiyonları import edildi

// Chatbot icon SVG (örnek - kendi SVG'nizi kullanabilirsiniz)
/*
const ChatbotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    <line x1="12" y1="7" x2="12" y2="11"></line>
    <line x1="9" y1="9" x2="15" y2="9"></line>
  </svg>
);
*/

export default function HomePage({ currentUser, authError }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('haftalik'); // Varsayılan olarak haftalık seçili
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Filtre state'leri
  const [selectedSorting, setSelectedSorting] = useState('onerilen');
  const [selectedKitchenTypes, setSelectedKitchenTypes] = useState([]);
  const [minPriceValue, setMinPriceValue] = useState(0);
  const [maxPriceValue, setMaxPriceValue] = useState(500);
  const [showMinPrice, setShowMinPrice] = useState(false);
  const [showMaxPrice, setShowMaxPrice] = useState(false);
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  const [showAllKitchenTypes, setShowAllKitchenTypes] = useState(false);
  
  // İletişim tercihleri için toggle state'leri
  const [emailPreference, setEmailPreference] = useState(true);
  const [notificationPreference, setNotificationPreference] = useState(true);
  const [smsPreference, setSmsPreference] = useState(true);
  const [phonePreference, setPhonePreference] = useState(true);
  
  // Add password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Add state for editing account details
  const [editingField, setEditingField] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [surnameInput, setSurnameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  // Add states for all field edit modals
  const [showNameModal, setShowNameModal] = useState(false);
  const [showSurnameModal, setShowSurnameModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  
  // Add state to manage addresses
  const [addresses, setAddresses] = useState([
    {
      id: 'address-1',
      label: 'Ev',
      fullAddress: 'Cumhuriyet Mah. Prof. Dr. Ahmet Babababa Blv. No: 21, Elazığ',
      isActive: true
    },
    {
      id: 'address-2',
      label: 'İş',
      fullAddress: 'Fırat Üniversitesi, Mühendislik Fakültesi, Merkez/Elazığ',
      isActive: false
    }
  ]);

  // Add state for tracking selected address
  const [selectedAddressId, setSelectedAddressId] = useState('address-1');
  
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
      // Show loading and redirect to home
      setLoading(true);
      setTimeout(() => {
        navigate('/');
        setLoading(false);
      }, 1000);
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
  
  // Kullanıcının sadece adını döndüren yardımcı fonksiyon
  const getUserFirstName = () => {
    if (currentUser) {
      if (currentUser.displayName) {
        return currentUser.displayName.split(' ')[0];
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
    
    // Format the phone number if needed
    const numbers = phone.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < numbers.length; i++) {
      // Add spaces after 3rd, 6th, and 8th digits
      if (i === 3 || i === 6 || i === 8) {
        formatted += ' ';
      }
      formatted += numbers[i];
    }
    return formatted;
  };
  
  // Sayfa değiştirme fonksiyonu
  const navigateTo = (page) => {
    navigate(`/${page}`);
    setShowProfileMenu(false);
  };
  
  // Filtre işlemleri
  const handleSortingChange = (sorting) => {
    setSelectedSorting(sorting);
  };
  
  const handleKitchenTypeToggle = (type) => {
    if (selectedKitchenTypes.includes(type)) {
      setSelectedKitchenTypes(selectedKitchenTypes.filter(item => item !== type));
    } else {
      setSelectedKitchenTypes([...selectedKitchenTypes, type]);
    }
  };
  
  // Kategori değiştirme işleyicisi
  const handleCategoryChange = (category) => {
    console.log("Kategori değiştiriliyor:", category);
    setActiveCategory(category);
    // Kategori değiştiğinde URL değiştirme olmadan state güncelleme
  };
  
  // Başlık metnini belirleme
  const getHeaderTitle = () => {
    switch(activePage) {
      case 'home':
        return (
          <div className="navbar-categories">
            <button 
              className={`category-button ${activeCategory === 'haftalik' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('haftalik')}
            >
              <div className="category-icon weekly-icon"></div>
              <span>Haftalık</span>
            </button>
            <button 
              className={`category-button ${activeCategory === 'gunluk' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('gunluk')}
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
      case 'hesabim':
        return <h2 className="page-title blue-title">Hesabım</h2>;
      default:
        return (
          <div className="navbar-categories">
            <button 
              className={`category-button ${activeCategory === 'haftalik' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('haftalik')}
            >
              <div className="category-icon weekly-icon"></div>
              <span>Haftalık</span>
            </button>
            <button 
              className={`category-button ${activeCategory === 'gunluk' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('gunluk')}
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
          <div className="content-with-filter">
            <div className="filter-sidebar">
              <div className="filter-section">
                <h3 className="filter-title">Filtrele</h3>
                
                <div className="filter-group">
                  <h4 className="filter-group-title">Sıralama</h4>
                  <div className="filter-options">
                    <label className="filter-option">
                      <input 
                        type="radio" 
                        name="sorting" 
                        checked={selectedSorting === 'onerilen'} 
                        onChange={() => handleSortingChange('onerilen')}
                      />
                      <span className="filter-label">Önerilen (Varsayılan)</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="radio" 
                        name="sorting" 
                        checked={selectedSorting === 'teslimat'} 
                        onChange={() => handleSortingChange('teslimat')}
                      />
                      <span className="filter-label">Teslimat Süresi</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="radio" 
                        name="sorting" 
                        checked={selectedSorting === 'puan'} 
                        onChange={() => handleSortingChange('puan')}
                      />
                      <span className="filter-label">Restoran Puanı</span>
                    </label>
                  </div>
                </div>
                
                <div className="filter-group">
                  <h4 className="filter-group-title">Mutfak</h4>
                  <div className="search-input">
                    <input 
                      type="text" 
                      placeholder="Mutfak arayın" 
                      className="mutfak-search-input"
                    />
                    <span className="search-icon">🔍</span>
                  </div>
                  <div className={`filter-options ${showAllKitchenTypes ? 'expanded' : 'collapsed'}`}>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('balik')} 
                        onChange={() => handleKitchenTypeToggle('balik')}
                      />
                      <span className="filter-label">Balık ve Deniz Ürünleri</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('burger')} 
                        onChange={() => handleKitchenTypeToggle('burger')}
                      />
                      <span className="filter-label">Burger</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('cag')} 
                        onChange={() => handleKitchenTypeToggle('cag')}
                      />
                      <span className="filter-label">Cağ Kebap</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('cig')} 
                        onChange={() => handleKitchenTypeToggle('cig')}
                      />
                      <span className="filter-label">Çiğ Köfte</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('dondurma')} 
                        onChange={() => handleKitchenTypeToggle('dondurma')}
                      />
                      <span className="filter-label">Dondurma</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('doner')} 
                        onChange={() => handleKitchenTypeToggle('doner')}
                      />
                      <span className="filter-label">Döner</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('dunya')} 
                        onChange={() => handleKitchenTypeToggle('dunya')}
                      />
                      <span className="filter-label">Dünya Mutfağı</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('ev')} 
                        onChange={() => handleKitchenTypeToggle('ev')}
                      />
                      <span className="filter-label">Ev Yemekleri</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('kahvalti')} 
                        onChange={() => handleKitchenTypeToggle('kahvalti')}
                      />
                      <span className="filter-label">Kahvaltı & Börek</span>
                    </label>
                    
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('kofte')} 
                        onChange={() => handleKitchenTypeToggle('kofte')}
                      />
                      <span className="filter-label">Köfte</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('manti')} 
                        onChange={() => handleKitchenTypeToggle('manti')}
                      />
                      <span className="filter-label">Mantı</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('pide')} 
                        onChange={() => handleKitchenTypeToggle('pide')}
                      />
                      <span className="filter-label">Pide & Lahmacun</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('pizza')} 
                        onChange={() => handleKitchenTypeToggle('pizza')}
                      />
                      <span className="filter-label">Pizza</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('tatli')} 
                        onChange={() => handleKitchenTypeToggle('tatli')}
                      />
                      <span className="filter-label">Tatlı & Pastane</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('tavuk')} 
                        onChange={() => handleKitchenTypeToggle('tavuk')}
                      />
                      <span className="filter-label">Tavuk</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('tost')} 
                        onChange={() => handleKitchenTypeToggle('tost')}
                      />
                      <span className="filter-label">Tost & Sandviç</span>
                    </label>
                  </div>
                  <button className="show-more-btn" onClick={() => setShowAllKitchenTypes(!showAllKitchenTypes)}>
                    {showAllKitchenTypes ? 'Daha az göster' : 'Daha fazla göster'}
                  </button>
                </div>
                
                <div className="filter-group">
                  <h4 className="filter-group-title">Fiyat Aralığı</h4>
                  <div className="price-range-slider">
                    <div className="slider-track">
                      <div 
                        className="slider-progress" 
                        style={{
                          left: `${(minPriceValue / 1000) * 100}%`,
                          width: `${((maxPriceValue - minPriceValue) / 1000) * 100}%`
                        }}
                      ></div>
                      <div 
                        className="slider-handle" 
                        style={{left: `${(minPriceValue / 1000) * 100}%`}}
                        onMouseEnter={() => setShowMinPrice(true)}
                        onMouseLeave={() => !isDraggingMin && setShowMinPrice(false)}
                        onMouseDown={() => {
                          setShowMinPrice(true);
                          setIsDraggingMin(true);
                        }}
                        onMouseUp={() => {
                          setIsDraggingMin(false);
                          setShowMinPrice(false);
                        }}
                      >
                        <div 
                          className="slider-value" 
                          style={{opacity: (showMinPrice || isDraggingMin) ? 1 : 0}}
                        >
                          {minPriceValue} TL
                        </div>
                      </div>
                      <div 
                        className="slider-handle" 
                        style={{left: `${(maxPriceValue / 1000) * 100}%`}}
                        onMouseEnter={() => setShowMaxPrice(true)}
                        onMouseLeave={() => !isDraggingMax && setShowMaxPrice(false)}
                        onMouseDown={() => {
                          setShowMaxPrice(true);
                          setIsDraggingMax(true);
                        }}
                        onMouseUp={() => {
                          setIsDraggingMax(false);
                          setShowMaxPrice(false);
                        }}
                      >
                        <div 
                          className="slider-value" 
                          style={{opacity: (showMaxPrice || isDraggingMax) ? 1 : 0}}
                        >
                          {maxPriceValue} TL
                        </div>
                      </div>
                    </div>
                    <div className="price-range-limits">
                      <span>{minPriceValue} TL</span>
                      <span>{maxPriceValue} TL</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={minPriceValue}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value < maxPriceValue) {
                          setMinPriceValue(value);
                        }
                      }}
                      onMouseDown={() => {
                        setShowMinPrice(true);
                        setIsDraggingMin(true);
                      }}
                      onMouseUp={() => {
                        setIsDraggingMin(false);
                        setShowMinPrice(false);
                      }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        top: 0,
                        height: '20px',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 3
                      }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={maxPriceValue}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value > minPriceValue) {
                          setMaxPriceValue(value);
                        }
                      }}
                      onMouseDown={() => {
                        setShowMaxPrice(true);
                        setIsDraggingMax(true);
                      }}
                      onMouseUp={() => {
                        setIsDraggingMax(false);
                        setShowMaxPrice(false);
                      }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        top: 0,
                        height: '20px',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 4
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="main-content">
              {activeCategory === 'haftalik' ? (
                <WeeklyPlan />
              ) : (
                <RestaurantGrid 
                  category={activeCategory} 
                  selectedKitchenTypes={selectedKitchenTypes} 
                  selectedSorting={selectedSorting}
                />
              )}
            </div>
          </div>
        );
      case 'adreslerim':
        return (
          <div className="page-content">
            <div className="address-list">
              {!showAddAddress ? (
                <>
                  {addresses.map((address) => (
                    <div 
                      key={address.id}
                      className={`address-item ${address.id === selectedAddressId ? 'active' : ''}`}
                      onClick={() => selectAddress(address.id)}
                    >
                      <div className={`address-icon ${address.label.toLowerCase()}-icon`}></div>
                      <div className="address-details">
                        <h3>{address.label}</h3>
                        <p>{address.fullAddress}</p>
                      </div>
                      {address.id === selectedAddressId && <div className="address-check"></div>}
                      <button 
                        className="address-delete-btn" 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent selection when deleting
                          handleDeleteAddress(address.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  <button className="add-address-btn" onClick={handleAddAddress}>
                    <span>+</span> Yeni Adres Ekle
                  </button>
                </>
              ) : (
                <div className="address-form">
                  <h3 className="address-form-title">Yeni Adres Ekle</h3>
                  
                  {/* Map component */}
                  <div className="map-container">
                    <MapComponent 
                      ref={mapRef}
                      onLocationSelect={handleLocationSelect}
                      initialLocation={userLocation}
                    />
                    
                    {/* Location button */}
                    <button className="location-button" onClick={findUserLocation}>
                      <div className="location-icon"></div>
                    </button>
                  </div>
                  
                  <div className="map-search">
                    <input 
                      type="text" 
                      placeholder="Adres ara veya haritada işaretle..." 
                      value={newAddress.fullAddress}
                      onChange={(e) => setNewAddress({...newAddress, fullAddress: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
                    />
                    <button onClick={searchAddress}>Ara</button>
                  </div>
                  
                  <div className="address-tags">
                    <div 
                      className={`address-tag ${newAddress.label === 'Ev' ? 'active' : ''}`}
                      onClick={() => changeAddressTag('Ev')}
                    >
                      <div className="tag-icon home-icon"></div>
                      <span>Ev</span>
                    </div>
                    <div 
                      className={`address-tag ${newAddress.label === 'İş' ? 'active' : ''}`}
                      onClick={() => changeAddressTag('İş')}
                    >
                      <div className="tag-icon work-icon"></div>
                      <span>İş</span>
                    </div>
                    <div 
                      className={`address-tag ${newAddress.label === 'Diğer' ? 'active' : ''}`}
                      onClick={() => changeAddressTag('Diğer')}
                    >
                      <div className="tag-icon other-icon"></div>
                      <span>Diğer</span>
                    </div>
                  </div>
                  
                  <div className="address-form-fields">
                    <div className="form-row">
                      <label>Adres Başlığı</label>
                      <input 
                        type="text" 
                        placeholder="Örn: Ev, İş, Annemin Evi..." 
                        value={newAddress.label}
                        onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-row">
                      <label>Tam Adres</label>
                      <p className="detected-address">{newAddress.fullAddress}</p>
                    </div>
                    
                    <div className="address-details-section">
                      <h4>Adres Detayları</h4>
                      <div className="form-row-inline">
                        <div className="form-group">
                          <label>Apartman/Site Adı</label>
                          <input 
                            type="text" 
                            placeholder="Apartman veya site adı" 
                            value={newAddress.buildingName || ''}
                            onChange={(e) => setNewAddress({...newAddress, buildingName: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Blok/Daire No</label>
                          <input 
                            type="text" 
                            placeholder="Blok ve daire no" 
                            value={newAddress.blockNumber || ''}
                            onChange={(e) => setNewAddress({...newAddress, blockNumber: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="form-row-inline">
                        <div className="form-group">
                          <label>Kat</label>
                          <input 
                            type="text" 
                            placeholder="Kat no" 
                            value={newAddress.floor || ''}
                            onChange={(e) => setNewAddress({...newAddress, floor: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Kapı/Daire No</label>
                          <input 
                            type="text" 
                            placeholder="Kapı veya daire no" 
                            value={newAddress.doorNumber || ''}
                            onChange={(e) => setNewAddress({...newAddress, doorNumber: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <label>Adres Tarifi</label>
                      <textarea 
                        placeholder="Teslimat görevlisine eklemek istediğiniz notlar..." 
                        value={newAddress.details || ''}
                        onChange={(e) => setNewAddress({...newAddress, details: e.target.value})}
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="form-buttons">
                    <button className="cancel-btn" onClick={cancelAddAddress}>Vazgeç</button>
                    <button className="save-btn" onClick={saveNewAddress}>Kaydet</button>
                  </div>
                </div>
              )}
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
      case 'hesabim':
        return (
          <div className="page-content">
            <div className="account-settings">
              <div className="account-section">
                <h3 className="section-subtitle">Hesap Bilgilerim</h3>
                <div className="account-info">
                  <div className="info-row">
                    <div className="info-label">Ad</div>
                    <div className="info-value">{currentUser?.displayName?.split(' ')[0] || 'Belirtilmemiş'}</div>
                    <button className="edit-btn-icon" aria-label="Düzenle" onClick={() => handleEditField('name')}>
                      <span className="pencil-icon"></span>
                    </button>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Soyad</div>
                    <div className="info-value">{currentUser?.displayName?.split(' ')[1] || 'Belirtilmemiş'}</div>
                    <button className="edit-btn-icon" aria-label="Düzenle" onClick={() => handleEditField('surname')}>
                      <span className="pencil-icon"></span>
                    </button>
                  </div>
                  <div className="info-row">
                    <div className="info-label">E-posta</div>
                    <div className="info-value non-editable">{currentUser?.email}</div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Telefon</div>
                    <div className="info-value">{displayPhoneNumber(currentUser?.phoneNumber) || 'Belirtilmemiş'}</div>
                    <button className="edit-btn-icon" aria-label="Düzenle" onClick={() => handleEditField('phone')}>
                      <span className="pencil-icon"></span>
                    </button>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Şifre</div>
                    <div className="info-value">********</div>
                    <button className="edit-btn-icon" aria-label="Değiştir" onClick={() => handleEditField('password')}>
                      <span className="pencil-icon"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="content-with-filter">
            <div className="filter-sidebar">
              <div className="filter-section">
                <h3 className="filter-title">Filtrele</h3>
                
                <div className="filter-group">
                  <h4 className="filter-group-title">Sıralama</h4>
                  <div className="filter-options">
                    <label className="filter-option">
                      <input 
                        type="radio" 
                        name="sorting" 
                        checked={selectedSorting === 'onerilen'} 
                        onChange={() => handleSortingChange('onerilen')}
                      />
                      <span className="filter-label">Önerilen (Varsayılan)</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="radio" 
                        name="sorting" 
                        checked={selectedSorting === 'teslimat'} 
                        onChange={() => handleSortingChange('teslimat')}
                      />
                      <span className="filter-label">Teslimat Süresi</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="radio" 
                        name="sorting" 
                        checked={selectedSorting === 'puan'} 
                        onChange={() => handleSortingChange('puan')}
                      />
                      <span className="filter-label">Restoran Puanı</span>
                    </label>
                  </div>
                </div>
                
                <div className="filter-group">
                  <h4 className="filter-group-title">Mutfak</h4>
                  <div className="search-input">
                    <input 
                      type="text" 
                      placeholder="Mutfak arayın" 
                      className="mutfak-search-input"
                    />
                    <span className="search-icon">🔍</span>
                  </div>
                  <div className={`filter-options ${showAllKitchenTypes ? 'expanded' : 'collapsed'}`}>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('balik')} 
                        onChange={() => handleKitchenTypeToggle('balik')}
                      />
                      <span className="filter-label">Balık ve Deniz Ürünleri</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('burger')} 
                        onChange={() => handleKitchenTypeToggle('burger')}
                      />
                      <span className="filter-label">Burger</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('cag')} 
                        onChange={() => handleKitchenTypeToggle('cag')}
                      />
                      <span className="filter-label">Cağ Kebap</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('cig')} 
                        onChange={() => handleKitchenTypeToggle('cig')}
                      />
                      <span className="filter-label">Çiğ Köfte</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('dondurma')} 
                        onChange={() => handleKitchenTypeToggle('dondurma')}
                      />
                      <span className="filter-label">Dondurma</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('doner')} 
                        onChange={() => handleKitchenTypeToggle('doner')}
                      />
                      <span className="filter-label">Döner</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('dunya')} 
                        onChange={() => handleKitchenTypeToggle('dunya')}
                      />
                      <span className="filter-label">Dünya Mutfağı</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('ev')} 
                        onChange={() => handleKitchenTypeToggle('ev')}
                      />
                      <span className="filter-label">Ev Yemekleri</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('kahvalti')} 
                        onChange={() => handleKitchenTypeToggle('kahvalti')}
                      />
                      <span className="filter-label">Kahvaltı & Börek</span>
                    </label>
                    
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('kofte')} 
                        onChange={() => handleKitchenTypeToggle('kofte')}
                      />
                      <span className="filter-label">Köfte</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('manti')} 
                        onChange={() => handleKitchenTypeToggle('manti')}
                      />
                      <span className="filter-label">Mantı</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('pide')} 
                        onChange={() => handleKitchenTypeToggle('pide')}
                      />
                      <span className="filter-label">Pide & Lahmacun</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('pizza')} 
                        onChange={() => handleKitchenTypeToggle('pizza')}
                      />
                      <span className="filter-label">Pizza</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('tatli')} 
                        onChange={() => handleKitchenTypeToggle('tatli')}
                      />
                      <span className="filter-label">Tatlı & Pastane</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('tavuk')} 
                        onChange={() => handleKitchenTypeToggle('tavuk')}
                      />
                      <span className="filter-label">Tavuk</span>
                    </label>
                    <label className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={selectedKitchenTypes.includes('tost')} 
                        onChange={() => handleKitchenTypeToggle('tost')}
                      />
                      <span className="filter-label">Tost & Sandviç</span>
                    </label>
                  </div>
                  <button className="show-more-btn" onClick={() => setShowAllKitchenTypes(!showAllKitchenTypes)}>
                    {showAllKitchenTypes ? 'Daha az göster' : 'Daha fazla göster'}
                  </button>
                </div>
                
                <div className="filter-group">
                  <h4 className="filter-group-title">Fiyat Aralığı</h4>
                  <div className="price-range-slider">
                    <div className="slider-track">
                      <div 
                        className="slider-progress" 
                        style={{
                          left: `${(minPriceValue / 1000) * 100}%`,
                          width: `${((maxPriceValue - minPriceValue) / 1000) * 100}%`
                        }}
                      ></div>
                      <div 
                        className="slider-handle" 
                        style={{left: `${(minPriceValue / 1000) * 100}%`}}
                        onMouseEnter={() => setShowMinPrice(true)}
                        onMouseLeave={() => !isDraggingMin && setShowMinPrice(false)}
                        onMouseDown={() => {
                          setShowMinPrice(true);
                          setIsDraggingMin(true);
                        }}
                        onMouseUp={() => {
                          setIsDraggingMin(false);
                          setShowMinPrice(false);
                        }}
                      >
                        <div 
                          className="slider-value" 
                          style={{opacity: (showMinPrice || isDraggingMin) ? 1 : 0}}
                        >
                          {minPriceValue} TL
                        </div>
                      </div>
                      <div 
                        className="slider-handle" 
                        style={{left: `${(maxPriceValue / 1000) * 100}%`}}
                        onMouseEnter={() => setShowMaxPrice(true)}
                        onMouseLeave={() => !isDraggingMax && setShowMaxPrice(false)}
                        onMouseDown={() => {
                          setShowMaxPrice(true);
                          setIsDraggingMax(true);
                        }}
                        onMouseUp={() => {
                          setIsDraggingMax(false);
                          setShowMaxPrice(false);
                        }}
                      >
                        <div 
                          className="slider-value" 
                          style={{opacity: (showMaxPrice || isDraggingMax) ? 1 : 0}}
                        >
                          {maxPriceValue} TL
                        </div>
                      </div>
                    </div>
                    <div className="price-range-limits">
                      <span>{minPriceValue} TL</span>
                      <span>{maxPriceValue} TL</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={minPriceValue}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value < maxPriceValue) {
                          setMinPriceValue(value);
                        }
                      }}
                      onMouseDown={() => {
                        setShowMinPrice(true);
                        setIsDraggingMin(true);
                      }}
                      onMouseUp={() => {
                        setIsDraggingMin(false);
                        setShowMinPrice(false);
                      }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        top: 0,
                        height: '20px',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 3
                      }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={maxPriceValue}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value > minPriceValue) {
                          setMaxPriceValue(value);
                        }
                      }}
                      onMouseDown={() => {
                        setShowMaxPrice(true);
                        setIsDraggingMax(true);
                      }}
                      onMouseUp={() => {
                        setIsDraggingMax(false);
                        setShowMaxPrice(false);
                      }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        top: 0,
                        height: '20px',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 4
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="main-content">
              <RestaurantGrid 
                category={activeCategory} 
                selectedKitchenTypes={selectedKitchenTypes} 
                selectedSorting={selectedSorting}
              />
            </div>
          </div>
        );
    }
  };
  
  // Password change handler
  const handlePasswordChange = () => {
    setShowPasswordModal(true);
  };
  
  // Password submit handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validate passwords
    if (!currentPassword) {
      setPasswordError('Mevcut şifrenizi giriniz');
      return;
    }
    
    if (!newPassword) {
      setPasswordError('Yeni şifrenizi giriniz');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor');
      return;
    }
    
    try {
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      setPasswordSuccess('Şifreniz başarıyla değiştirildi');
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Mevcut şifreniz yanlış');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('Şifre çok zayıf');
      } else {
        setPasswordError(`Şifre değiştirme işlemi başarısız oldu: ${error.message}`);
      }
    }
  };
  
  // Close password modal
  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };
  
  const [loading, setLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Ev',
    fullAddress: '',
    details: '',
    latitude: null,
    longitude: null,
    buildingName: '',
    blockNumber: '',
    floor: '',
    doorNumber: ''
  });
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);
  
  // Function to handle location selected from map
  const handleLocationSelect = (locationData) => {
    setNewAddress({
      ...newAddress,
      fullAddress: locationData.address,
      latitude: locationData.latitude,
      longitude: locationData.longitude
    });
  };
  
  // Function to find user's current location
  const findUserLocation = () => {
    if (mapRef.current) {
      mapRef.current.findUserLocation();
    }
  };
  
  // Search for an address
  const searchAddress = () => {
    if (mapRef.current && newAddress.fullAddress) {
      mapRef.current.searchAddress(newAddress.fullAddress);
    }
  };
  
  // Handle adding a new address
  const handleAddAddress = () => {
    setShowAddAddress(true);
  };
  
  // Load addresses from localStorage on component mount
  useEffect(() => {
    const savedAddresses = localStorage.getItem('yuumiAddresses');
    if (savedAddresses) {
      try {
        const parsedAddresses = JSON.parse(savedAddresses);
        setAddresses(parsedAddresses);
        
        // Set the selected address to the one marked active or the first one
        const activeAddress = parsedAddresses.find(addr => addr.isActive) || parsedAddresses[0];
        if (activeAddress) {
          setSelectedAddressId(activeAddress.id);
        }
      } catch (error) {
        console.error('Error parsing saved addresses:', error);
      }
    }
  }, []);

  // Select an address
  const selectAddress = (id) => {
    // Update the addresses to mark the selected one as active
    const updatedAddresses = addresses.map(addr => ({
      ...addr,
      isActive: addr.id === id
    }));
    
    setAddresses(updatedAddresses);
    setSelectedAddressId(id);
    
    // Save to localStorage
    localStorage.setItem('yuumiAddresses', JSON.stringify(updatedAddresses));
  };

  // Save the new address
  const saveNewAddress = () => {
    // Validation
    if (!newAddress.fullAddress || !newAddress.latitude || !newAddress.longitude) {
      alert("Lütfen haritadan bir konum seçin veya adres arayın.");
      return;
    }
    
    if (!newAddress.label) {
      alert("Lütfen adres için bir başlık girin.");
      return;
    }
    
    // For a better user experience, compile the full address with details
    const fullAddressWithDetails = [
      newAddress.buildingName && `${newAddress.buildingName}`,
      newAddress.blockNumber && `Blok: ${newAddress.blockNumber}`,
      newAddress.floor && `Kat: ${newAddress.floor}`,
      newAddress.doorNumber && `Daire: ${newAddress.doorNumber}`,
      newAddress.details && newAddress.details
    ].filter(Boolean).join(', ');
    
    // Create new address object with unique ID
    const newAddressObj = {
      id: `address-${Date.now()}`,
      label: newAddress.label,
      fullAddress: newAddress.fullAddress + (fullAddressWithDetails ? `, ${fullAddressWithDetails}` : ''),
      latitude: newAddress.latitude,
      longitude: newAddress.longitude,
      details: {
        buildingName: newAddress.buildingName,
        blockNumber: newAddress.blockNumber,
        floor: newAddress.floor,
        doorNumber: newAddress.doorNumber,
        additionalNotes: newAddress.details
      },
      isActive: addresses.length === 0 // Make active if it's the first address
    };
    
    // Add to addresses state
    const updatedAddresses = [...addresses, newAddressObj];
    setAddresses(updatedAddresses);
    
    // Save to localStorage
    localStorage.setItem('yuumiAddresses', JSON.stringify(updatedAddresses));
    
    // Hide the form
    setShowAddAddress(false);
    
    // Reset the form
    setNewAddress({
      label: 'Ev',
      fullAddress: '',
      details: '',
      latitude: null,
      longitude: null,
      buildingName: '',
      blockNumber: '',
      floor: '',
      doorNumber: ''
    });
  };
  
  // Cancel adding new address
  const cancelAddAddress = () => {
    setShowAddAddress(false);
    setNewAddress({
      label: 'Ev',
      fullAddress: '',
      details: '',
      latitude: null,
      longitude: null,
      buildingName: '',
      blockNumber: '',
      floor: '',
      doorNumber: ''
    });
  };
  
  // Change address tag/label
  const changeAddressTag = (tag) => {
    setNewAddress({
      ...newAddress,
      label: tag
    });
  };
  
  // Edit field handlers
  const handleEditField = (field) => {
    if (field === 'name') {
      setNameInput(currentUser?.displayName?.split(' ')[0] || '');
      setShowNameModal(true);
    } else if (field === 'surname') {
      setSurnameInput(currentUser?.displayName?.split(' ')[1] || '');
      setShowSurnameModal(true);
    } else if (field === 'phone') {
      // Remove +90 prefix if it exists for editing
      const phone = currentUser?.phoneNumber || '';
      const formattedPhone = phone.startsWith('+90') ? phone.substring(3) : phone;
      setPhoneInput(formatPhoneNumber(formattedPhone));
      setShowPhoneModal(true);
    } else if (field === 'password') {
      setShowPasswordModal(true);
    }
  };

  const saveFieldEdit = async (field) => {
    try {
      if (field === 'name') {
        const surname = currentUser?.displayName?.split(' ')[1] || '';
        // Show confirmation dialog with properly styled buttons
        if (window.confirm(`"${nameInput}" adını onaylıyor musunuz?`)) {
          console.log('Updating name to:', `${nameInput} ${surname}`);
          await updateProfile(auth.currentUser, { 
            displayName: `${nameInput} ${surname}` 
          });
          setShowNameModal(false);
          // Force a reload to show updated profile
          window.location.reload();
        }
      } else if (field === 'surname') {
        const name = currentUser?.displayName?.split(' ')[0] || '';
        // Show confirmation dialog with properly styled buttons
        if (window.confirm(`"${surnameInput}" soyadını onaylıyor musunuz?`)) {
          console.log('Updating surname to:', `${name} ${surnameInput}`);
          await updateProfile(auth.currentUser, { 
            displayName: `${name} ${surnameInput}` 
          });
          setShowSurnameModal(false);
          // Force a reload to show updated profile
          window.location.reload();
        }
      } else if (field === 'phone') {
        // Show confirmation dialog with properly styled buttons
        if (window.confirm(`"+90${phoneInput.replace(/\s+/g, '')}" telefon numarasını onaylıyor musunuz?`)) {
          console.log('Updating phone to:', phoneInput);
          // Note: Phone number update requires a more complex verification flow with Firebase
          // For this implementation we'll simulate it with an alert
          alert('Telefon numarası güncellendi');
          setShowPhoneModal(false);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Güncelleme sırasında bir hata oluştu: ${error.message}`);
    }
  };

  const cancelFieldEdit = (field) => {
    if (field === 'name') {
      setShowNameModal(false);
    } else if (field === 'surname') {
      setShowSurnameModal(false);
    } else if (field === 'phone') {
      setShowPhoneModal(false);
    } else if (field === 'password') {
      setShowPasswordModal(false);
    }
  };
  
  // Update display formatting for phone numbers to include +90 prefix
  const displayPhoneNumber = (phone) => {
    if (!phone) return "Belirtilmemiş";
    // Clean up the phone number and add +90 prefix if not already there
    const cleanPhone = phone.replace(/\s+/g, '');
    return phone.startsWith('+90') ? phone : `+90${cleanPhone}`;
  };
  
  // Clean up mapRef object when component unmounts
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, []);

  // Add a function to delete an address
  const handleDeleteAddress = (addressId) => {
    if (window.confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
      // Remove the address from the addresses array
      const updatedAddresses = addresses.filter(address => address.id !== addressId);
      setAddresses(updatedAddresses);
      
      // If the deleted address was the selected one, select the first remaining address
      if (addressId === selectedAddressId && updatedAddresses.length > 0) {
        setSelectedAddressId(updatedAddresses[0].id);
        
        // Update active status for the first address
        updatedAddresses[0].isActive = true;
      }
      
      // Save to localStorage
      localStorage.setItem('yuumiAddresses', JSON.stringify(updatedAddresses));
    }
  };
  
  // Find and update the restaurant loading timeout if there is one
  // If there's a useEffect block for loading restaurants, reduce the timeout or remove it

  // Add or update the restaurant loading logic:
  useEffect(() => {
    // Any existing restaurant loading code
    
    // If loading is controlled by a state, set a shorter timeout
    const loadingTimeout = setTimeout(() => {
      if (setLoading) {
        setLoading(false);
      }
    }, 500); // Reduce this from whatever it was before to 500ms
    
    return () => clearTimeout(loadingTimeout);
  }, []);

  const [cartItemCount, setCartItemCount] = useState(0);
  
  // Load cart items count from sessionStorage
  useEffect(() => {
    const updateCartCount = () => {
      const storedCart = sessionStorage.getItem('yuumiCart');
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          setCartItemCount(parsedCart.length);
        } catch (error) {
          console.error('Error parsing cart data:', error);
        }
      }
    };
    
    // Update count immediately
    updateCartCount();
    
    // Listen for storage events (for cross-tab syncing)
    window.addEventListener('storage', updateCartCount);
    
    // Set up interval to check cart periodically
    const interval = setInterval(updateCartCount, 1000);
    
    return () => {
      window.removeEventListener('storage', updateCartCount);
      clearInterval(interval);
    };
  }, []);
  
  // Navigate to cart
  const goToCart = () => {
    navigate('/sepetim');
  };

  const [showChatbot, setShowChatbot] = useState(false); // Chatbot görünürlük state'i
  const [allRestaurantsForBot, setAllRestaurantsForBot] = useState([]); // Chatbot için restoran listesi

  // Chatbot için restoran verilerini çekme
  const fetchAllRestaurants = async () => {
    try {
      const restaurantsRef = collection(db, "restaurants");
      const restaurantsSnapshot = await getDocs(restaurantsRef);
      const restaurantsList = [];
      for (const restaurantDoc of restaurantsSnapshot.docs) {
        const restaurantData = {
          id: restaurantDoc.id,
          ...restaurantDoc.data(),
          menu: [], // menu veya items olarak gelecek veriyi standartlaştır
        };
        // Firestore'dan menu veya items alt koleksiyonunu çek
        const menuCollectionNames = ['menu', 'items']; // Olası koleksiyon adları
        for (const menuName of menuCollectionNames) {
            const menuRef = collection(db, "restaurants", restaurantDoc.id, menuName);
            const menuSnapshot = await getDocs(menuRef);
            if (!menuSnapshot.empty) {
                restaurantData.menu = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                break; // İlk bulunan menüyü kullan
            }
        }
        // Eğer menu Firestore alt koleksiyonu olarak yoksa, ana dokümandaki menuItems veya items alanını kontrol et
        if (restaurantData.menu.length === 0) {
            if (restaurantData.menuItems && Array.isArray(restaurantData.menuItems)) {
                restaurantData.menu = restaurantData.menuItems;
            } else if (restaurantData.items && Array.isArray(restaurantData.items)) {
                restaurantData.menu = restaurantData.items;
            }
        }
        restaurantsList.push(restaurantData);
      }
      setAllRestaurantsForBot(restaurantsList);
      console.log("Chatbot için restoranlar yüklendi:", restaurantsList);
    } catch (error) {
      console.error("Restoranlar chatbot için yüklenirken hata:", error);
    }
  };

  useEffect(() => {
    fetchAllRestaurants(); // Component mount olduğunda restoranları yükle
    // ... (diğer useEffect içeriği)
  }, []);

  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
  };

  return (
    <div className="homepage">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <p>Yuumi yükleniyor...</p>
          </div>
        </div>
      )}
      <header className="navbar">
        <div className="nav-left">
          <a href="/" className="logo-link">
            <img src={logoImg} alt="Yuumi Logo" className="logo" />
            <span className="brand">Yuumi</span>
          </a>
        </div>
        
        {/* Navbar içinde dinamik başlık */}
        <div className="nav-center">
          {activePage === 'home' ? (
            <div className="tab-container">
              <div className={`tab-item ${activeCategory === 'haftalik' ? 'active' : ''}`} onClick={() => handleCategoryChange('haftalik')}>
                <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeCategory === 'haftalik' ? "#00B2FF" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <text x="12" y="19" textAnchor="middle" fontSize="9" fontFamily="Arial" fill={activeCategory === 'haftalik' ? "#00B2FF" : "#555"}>7</text>
                </svg>
                <span className="tab-label">Haftalık</span>
              </div>
              <div className={`tab-item ${activeCategory === 'gunluk' ? 'active' : ''}`} onClick={() => handleCategoryChange('gunluk')}>
                <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeCategory === 'gunluk' ? "#00B2FF" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span className="tab-label">Günlük</span>
              </div>
            </div>
          ) : (
            getHeaderTitle()
          )}
        </div>
        
        <div className="nav-right">
          {/* Chatbot Icon - Moved here */}
          <div className="nav-icon chatbot-icon" onClick={toggleChatbot} title="Yuumi AI Chef">
            <img src={robotIcon} alt="Yuumi AI Chef" style={{ width: '24px', height: '24px' }} />
          </div>
          {currentUser ? (
            <div className="profile-container" ref={profileMenuRef}>
              <button className="profile-button" onClick={toggleProfileMenu}>
                <div className="profile-icon"></div>
                <span className="user-name">{getUserFirstName()}</span>
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
                  
                  <div className="profile-menu-items">
                    <button className="profile-menu-item" onClick={() => navigateTo('hesabim')}>
                      <div className="item-icon account-icon"></div>
                      <span>Hesabım</span>
                    </button>
                    <button className="profile-menu-item" onClick={() => navigateTo('adreslerim')}>
                      <div className="item-icon address-icon"></div>
                      <span>Adreslerim</span>
                    </button>
                    <button className="profile-menu-item" onClick={() => navigateTo('siparislerim')}>
                      <div className="item-icon orders-icon"></div>
                      <span>Geçmiş Siparişlerim</span>
                    </button>
                    <button className="profile-menu-item" onClick={() => navigateTo('odeme-yontemlerim')}>
                      <div className="item-icon payment-icon"></div>
                      <span>Ödeme Yöntemlerim</span>
                    </button>
                    <button className="profile-menu-item" onClick={() => navigateTo('iletisim-tercihlerim')}>
                      <div className="item-icon contact-icon"></div>
                      <span>İletişim Tercihlerim</span>
                    </button>
                    <button className="profile-menu-item logout-item" onClick={handleLogout}>
                      <div className="item-icon logout-icon"></div>
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="login-button" onClick={openLoginModal}>Giriş Yap</button>
              <button className="register-button" onClick={openRegisterModal}>Kaydol</button>
            </div>
          )}
          
          <div className="cart-icon-container" onClick={goToCart}>
            <img src={basketImg} alt="Sepet" className="basket-icon" />
            {cartItemCount > 0 && <span className="cart-count-badge">{cartItemCount}</span>}
          </div>
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
      
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3 className="modal-title">Şifre Değiştirme</h3>
            
            {passwordError && <div className="password-error">{passwordError}</div>}
            {passwordSuccess && <div className="password-success">{passwordSuccess}</div>}
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-input-group">
                <label>Mevcut Şifre</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              
              <div className="modal-input-group">
                <label>Yeni Şifre</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              
              <div className="modal-input-group">
                <label>Şifreyi Tekrarla</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => cancelFieldEdit('password')}>
                  Kapat
                </button>
                <button type="submit" className="save-btn">
                  Şifre Değiştir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Name Edit Modal */}
      {showNameModal && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3 className="modal-title">Ad Değiştirme</h3>
            
            <div className="modal-input-group">
              <label>Ad</label>
              <input 
                type="text" 
                value={nameInput} 
                onChange={(e) => setNameInput(e.target.value)} 
                placeholder="Adınız"
              />
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => cancelFieldEdit('name')}>İptal</button>
              <button className="save-btn" onClick={() => saveFieldEdit('name')}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Surname Edit Modal */}
      {showSurnameModal && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3 className="modal-title">Soyad Değiştirme</h3>
            
            <div className="modal-input-group">
              <label>Soyad</label>
              <input 
                type="text" 
                value={surnameInput} 
                onChange={(e) => setSurnameInput(e.target.value)} 
                placeholder="Soyadınız"
              />
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => cancelFieldEdit('surname')}>İptal</button>
              <button className="save-btn" onClick={() => saveFieldEdit('surname')}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Edit Modal */}
      {showPhoneModal && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3 className="modal-title">Telefon Değiştirme</h3>
            
            <div className="modal-input-group">
              <label>Telefon</label>
              <div className="phone-input-container">
                <div className="country-code">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg" className="flag-icon" alt="TR" />
                  +90
                </div>
                <input 
                  type="text" 
                  value={phoneInput} 
                  onChange={(e) => setPhoneInput(formatPhoneNumber(e.target.value))} 
                  placeholder="Telefon Numarası"
                  className="phone-input"
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => cancelFieldEdit('phone')}>İptal</button>
              <button className="save-btn" onClick={() => saveFieldEdit('phone')}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Component */}
      {showChatbot && 
        <AiChefBot 
          restaurants={allRestaurantsForBot} 
          onClose={toggleChatbot} 
        />
      }
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import "./HomePage.css";
import logoImg from "../assets/Y.png";
import basketImg from "../assets/basket.png";
import orderImg from "../assets/order.png"; // Sipariş ikonu için order.png eklendi
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import RestaurantGrid from "./RestaurantGrid"; // Import RestaurantGrid component
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import MapComponent from './MapComponent';

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
  const [minSepetTutari, setMinSepetTutari] = useState(0);
  const [showMinPrice, setShowMinPrice] = useState(false);
  const [showMaxPrice, setShowMaxPrice] = useState(false);
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  const [showSepetTutari, setShowSepetTutari] = useState(false);
  const [isDraggingSepet, setIsDraggingSepet] = useState(false);
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
      case 'hesabim':
        return <h2 className="page-title blue-title">Hesabım</h2>;
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
                        checked={selectedSorting === 'mesafe'} 
                        onChange={() => handleSortingChange('mesafe')}
                      />
                      <span className="filter-label">Mesafe</span>
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
                  <div className={`filter-options ${showAllKitchenTypes ? 'expanded' : 'scrollable'}`}>
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
                  <h4 className="filter-group-title">Minimum Sepet Tutarı</h4>
                  <div className="price-range-slider">
                    <div className="slider-track">
                      <div 
                        className="slider-progress" 
                        style={{
                          left: 0,
                          width: `${(minSepetTutari / 1000) * 100}%`
                        }}
                      ></div>
                      <div 
                        className="slider-handle" 
                        style={{left: `${(minSepetTutari / 1000) * 100}%`}}
                        onMouseEnter={() => setShowSepetTutari(true)}
                        onMouseLeave={() => !isDraggingSepet && setShowSepetTutari(false)}
                        onMouseDown={() => {
                          setShowSepetTutari(true);
                          setIsDraggingSepet(true);
                        }}
                        onMouseUp={() => {
                          setIsDraggingSepet(false);
                          setShowSepetTutari(false);
                        }}
                      >
                        <div 
                          className="slider-value" 
                          style={{opacity: (showSepetTutari || isDraggingSepet) ? 1 : 0}}
                        >
                          {minSepetTutari} TL
                        </div>
                      </div>
                    </div>
                    <div className="price-range-limits">
                      <span>0 TL</span>
                      <span>Tümü</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={minSepetTutari}
                      onChange={(e) => setMinSepetTutari(parseInt(e.target.value))}
                      onMouseDown={() => {
                        setShowSepetTutari(true);
                        setIsDraggingSepet(true);
                      }}
                      onMouseUp={() => {
                        setIsDraggingSepet(false);
                        setShowSepetTutari(false);
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
                  </div>
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
              />
            </div>
          </div>
        );
      case 'adreslerim':
        return (
          <div className="page-content">
            <div className="address-list">
              {!showAddAddress ? (
                <>
                  <div className="address-item active">
                    <div className="address-icon home-icon"></div>
                    <div className="address-details">
                      <h3>Ev</h3>
                      <p>Cumhuriyet Mah. Prof. Dr. Ahmet Babababa Blv. No: 21, Elazığ</p>
                    </div>
                    <div className="address-check"></div>
                    <button className="address-delete-btn">×</button>
                  </div>
                  
                  <div className="address-item">
                    <div className="address-icon work-icon"></div>
                    <div className="address-details">
                      <h3>İş</h3>
                      <p>Fırat Üniversitesi, Mühendislik Fakültesi, Merkez/Elazığ</p>
                    </div>
                    <button className="address-delete-btn">×</button>
                  </div>
                  
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
                    <button className="edit-btn-icon" aria-label="Düzenle">
                      <span className="pencil-icon"></span>
                    </button>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Soyad</div>
                    <div className="info-value">{currentUser?.displayName?.split(' ')[1] || 'Belirtilmemiş'}</div>
                    <button className="edit-btn-icon" aria-label="Düzenle">
                      <span className="pencil-icon"></span>
                    </button>
                  </div>
                  <div className="info-row">
                    <div className="info-label">E-posta</div>
                    <div className="info-value non-editable">{currentUser?.email}</div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Telefon</div>
                    <div className="info-value">{formatPhoneNumber(currentUser?.phoneNumber) || 'Belirtilmemiş'}</div>
                    <button className="edit-btn-icon" aria-label="Düzenle">
                      <span className="pencil-icon"></span>
                    </button>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Şifre</div>
                    <div className="info-value">********</div>
                    <button className="edit-btn-icon" aria-label="Değiştir" onClick={handlePasswordChange}>
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
                        checked={selectedSorting === 'mesafe'} 
                        onChange={() => handleSortingChange('mesafe')}
                      />
                      <span className="filter-label">Mesafe</span>
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
                  <div className={`filter-options ${showAllKitchenTypes ? 'expanded' : 'scrollable'}`}>
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
                  <h4 className="filter-group-title">Minimum Sepet Tutarı</h4>
                  <div className="price-range-slider">
                    <div className="slider-track">
                      <div 
                        className="slider-progress" 
                        style={{
                          left: 0,
                          width: `${(minSepetTutari / 1000) * 100}%`
                        }}
                      ></div>
                      <div 
                        className="slider-handle" 
                        style={{left: `${(minSepetTutari / 1000) * 100}%`}}
                        onMouseEnter={() => setShowSepetTutari(true)}
                        onMouseLeave={() => !isDraggingSepet && setShowSepetTutari(false)}
                        onMouseDown={() => {
                          setShowSepetTutari(true);
                          setIsDraggingSepet(true);
                        }}
                        onMouseUp={() => {
                          setIsDraggingSepet(false);
                          setShowSepetTutari(false);
                        }}
                      >
                        <div 
                          className="slider-value" 
                          style={{opacity: (showSepetTutari || isDraggingSepet) ? 1 : 0}}
                        >
                          {minSepetTutari} TL
                        </div>
                      </div>
                    </div>
                    <div className="price-range-limits">
                      <span>0 TL</span>
                      <span>Tümü</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={minSepetTutari}
                      onChange={(e) => setMinSepetTutari(parseInt(e.target.value))}
                      onMouseDown={() => {
                        setShowSepetTutari(true);
                        setIsDraggingSepet(true);
                      }}
                      onMouseUp={() => {
                        setIsDraggingSepet(false);
                        setShowSepetTutari(false);
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
                  </div>
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
      // Password change logic would go here (Firebase implementation)
      // This is a placeholder for now
      console.log('Şifre değiştirme işlemi: ', currentPassword, newPassword);
      
      setPasswordSuccess('Şifreniz başarıyla değiştirildi');
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      setPasswordError('Şifre değiştirme işlemi başarısız oldu');
      console.error('Şifre değiştirme hatası:', error);
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
    
    // In a real app, you would save this to a database
    // For demo purposes, we'll just hide the form
    setShowAddAddress(false);
    
    // You would typically save the address to a backend here
    console.log("Saved address:", {
      ...newAddress,
      formattedAddress: `${newAddress.fullAddress}${fullAddressWithDetails ? ', ' + fullAddressWithDetails : ''}`
    });
    
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
      
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="password-modal">
          <div className="password-content">
            <h2>Şifre Değiştirme</h2>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label htmlFor="currentPassword">Mevcut Şifre</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">Yeni Şifre</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Şifreyi Tekrarla</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit">Şifre Değiştir</button>
            </form>
            {passwordError && <p className="error">{passwordError}</p>}
            {passwordSuccess && <p className="success">{passwordSuccess}</p>}
            <button onClick={closePasswordModal}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
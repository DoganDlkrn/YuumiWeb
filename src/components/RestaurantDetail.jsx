import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './RestaurantDetail.css';

export default function RestaurantDetail({ initialTab = 'info' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [showAddedAnimation, setShowAddedAnimation] = useState(null);
  const [showCartPreview, setShowCartPreview] = useState(false);

  // Set active tab based on initialTab prop
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);
        console.log("Restoran verisi çekiliyor:", id);
        
        const docRef = doc(db, "restaurants", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          console.log("Firebase'den çekilen restoran verisi:", data);
          
          // Menü verilerini işle
          if (!data.menu || (Array.isArray(data.menu) && data.menu.length === 0)) {
            console.log("Menü verisi bulunamadı veya boş, menu alt koleksiyonunu kontrol ediyorum");
            
            // Menü alt koleksiyonunu kontrol et
            try {
              const menuColRef = collection(db, "restaurants", id, "menu");
              console.log("Menu koleksiyon referansı oluşturuldu:", menuColRef);
              
              const menuSnapshot = await getDocs(menuColRef);
              console.log("Menu koleksiyonu sorgusu tamamlandı, belge sayısı:", menuSnapshot.size);
              
              if (!menuSnapshot.empty) {
                const menuItems = menuSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
                data.menu = menuItems;
                console.log("Menü alt koleksiyonundan çekildi:", menuItems);
              } else {
                console.log("Menü alt koleksiyonu boş, alternatif yapıları kontrol ediyorum");
                
                // menuItems alanını kontrol et
                if (data.menuItems && Array.isArray(data.menuItems) && data.menuItems.length > 0) {
                  console.log("menuItems alanından menü verileri bulundu:", data.menuItems);
                  data.menu = data.menuItems;
                } else {
                  // Nested menü yapısı kontrolü
                  if (data.menu && typeof data.menu === 'object' && !Array.isArray(data.menu)) {
                    console.log("Nested menü yapısı tespit edildi");
                    const menuItems = [];
                    
                    // Kategori gruplarını dön
                    Object.keys(data.menu).forEach(categoryKey => {
                      const category = data.menu[categoryKey];
                      console.log(`Kategori grubu işleniyor: ${categoryKey}`, category);
                      
                      // Her kategori içindeki menü öğelerini dön
                      if (typeof category === 'object') {
                        Object.keys(category).forEach(itemKey => {
                          const item = category[itemKey];
                          
                          // Geçerli bir menü öğesi mi kontrol et
                          if (item && typeof item === 'object' && item.isim && (item.fiyat || item.fiyat === 0)) {
                            // Kategori adını belirle
                            let kategoriAdi;
                            if (categoryKey === '0') {
                              kategoriAdi = 'Pizzalar';
                            } else if (categoryKey === '1') {
                              kategoriAdi = 'Makarnalar';
                            } else if (item.kategori) {
                              kategoriAdi = item.kategori;
                            } else {
                              kategoriAdi = 'Diğer';
                            }
                            
                            console.log(`Menü öğesi ekleniyor: ${item.isim}, kategori: ${kategoriAdi}`);
                            menuItems.push({
                              id: itemKey,
                              kategori: kategoriAdi,
                              ...item
                            });
                          }
                        });
                      }
                    });
                    
                    if (menuItems.length > 0) {
                      data.menu = menuItems;
                      console.log("Nested menü yapısından çekildi:", menuItems);
                    } else {
                      console.log("Nested menü yapısından hiç öğe çekilemedi");
                      data.menu = [];
                    }
                  } else {
                    console.log("Hiçbir menü yapısı bulunamadı, boş bir menü dizisi oluşturuluyor");
                    data.menu = [];
                  }
                }
              }
            } catch (error) {
              console.error("Menü verisi çekilirken hata:", error);
              data.menu = [];
            }
          } else {
            console.log("Restoran verisinde menü doğrudan mevcut:", data.menu);
          }
          
          console.log("İşlenmiş final restoran verisi:", data);
          setRestaurant(data);
          
          // Varsayılan aktif kategoriyi ayarla
          if (data.menu && data.menu.length > 0) {
            const categories = getCategories(data);
            console.log("Mevcut kategoriler:", categories);
            if (categories.length > 0) {
              setActiveCategory(categories[0]);
              console.log("Aktif kategori ayarlandı:", categories[0]);
            }
          }
        } else {
          console.log("Restoran bulunamadı!");
          setRestaurant(null);
        }
      } catch (error) {
        console.error("Restoran verisi çekilirken hata:", error);
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurantData();
    }
  }, [id]);

  // Sepet toplamını hesapla
  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + (item.fiyat * item.quantity), 0);
    setCartTotal(total);
  }, [cart]);

  const handleBack = () => {
    navigate(-1);
  };

  // Menüden kategorileri al
  const getCategories = (restaurantData) => {
    if (restaurantData.menu && Array.isArray(restaurantData.menu) && restaurantData.menu.length > 0) {
      // Kategori değeri olmayan öğeleri "Diğer" olarak işaretle
      const safeMenu = restaurantData.menu.map(item => ({
        ...item,
        kategori: item.kategori || 'Diğer'
      }));
      
      return [...new Set(safeMenu.map(item => item.kategori))];
    } else if (restaurantData.menuItems && Array.isArray(restaurantData.menuItems) && restaurantData.menuItems.length > 0) {
      const safeMenuItems = restaurantData.menuItems.map(item => ({
        ...item,
        kategori: item.kategori || 'Diğer'
      }));
      
      return [...new Set(safeMenuItems.map(item => item.kategori))];
    }
    return [];
  };

  // Sepete ürün ekle
  const addToCart = (item) => {
    setCart(prevCart => {
      // Ürün sepette var mı kontrol et
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex >= 0) {
        // Varsa miktarı güncelle
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + 1
        };
        return updatedCart;
      } else {
        // Yoksa yeni ekle
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
    
    // Eklendi animasyonu göster
    setShowAddedAnimation(item.id);
    setTimeout(() => setShowAddedAnimation(null), 500);
  };

  // Sepetten ürün çıkar
  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === itemId);
      
      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart];
        if (updatedCart[existingItemIndex].quantity > 1) {
          // Miktarı azalt
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            quantity: updatedCart[existingItemIndex].quantity - 1
          };
        } else {
          // Ürünü kaldır
          updatedCart.splice(existingItemIndex, 1);
        }
        return updatedCart;
      }
      return prevCart;
    });
  };

  // Sepetteki ürün miktarını al
  const getItemQuantity = (itemId) => {
    const item = cart.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  // Sepeti temizle
  const clearCart = () => {
    setCart([]);
  };

  // Siparişi tamamla
  const proceedToCheckout = () => {
    // Şimdilik bir başarı mesajı göster
    alert('Siparişiniz alındı! Sipariş tutarı: ₺' + cartTotal.toFixed(2));
    clearCart();
  };

  // Sepet önizlemesini aç/kapat
  const toggleCartPreview = () => {
    setShowCartPreview(!showCartPreview);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Restoran bilgileri yükleniyor...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="error-container">
        <div className="error-message">Restoran bulunamadı!</div>
        <button className="back-button" onClick={handleBack}>Ana Sayfaya Dön</button>
      </div>
    );
  }

  console.log("Render aşamasındaki restoran verisi:", restaurant);

  // Menü öğelerini kategorilere göre grupla
  const menuByCategory = {};
  if (restaurant.menu && Array.isArray(restaurant.menu) && restaurant.menu.length > 0) {
    restaurant.menu.forEach(item => {
      const kategori = item.kategori || 'Diğer';
      if (!menuByCategory[kategori]) {
        menuByCategory[kategori] = [];
      }
      menuByCategory[kategori].push(item);
    });
    console.log("Kategorilere göre gruplanmış menü:", menuByCategory);
  } else if (restaurant.menuItems && Array.isArray(restaurant.menuItems) && restaurant.menuItems.length > 0) {
    restaurant.menuItems.forEach(item => {
      const kategori = item.kategori || 'Diğer';
      if (!menuByCategory[kategori]) {
        menuByCategory[kategori] = [];
      }
      menuByCategory[kategori].push(item);
    });
    console.log("menuItems'tan kategorilere göre gruplanmış menü:", menuByCategory);
  }

  // Tüm kategorileri al
  const categories = getCategories(restaurant);
  console.log("Render için hazırlanan kategoriler:", categories);

  return (
    <div className="restaurant-detail-container">
      <div className="restaurant-header">
        <button className="back-button" onClick={handleBack}>
          ← Geri
        </button>
        <div className="restaurant-header-info">
          <h1 className="restaurant-name">{restaurant.isim}</h1>
          <p className="restaurant-category">{restaurant.kategori}</p>
          <div className="restaurant-meta">
            <span className="restaurant-rating">★ {restaurant.puan || '4.5'}</span>
            <span className="delivery-time">{restaurant.teslimatSuresi || '25-40 dk'}</span>
            <span className="delivery-fee">Ücretsiz Teslimat</span>
          </div>
          <p className="restaurant-address">{restaurant.adres}</p>
          <p className="restaurant-hours">{restaurant.calismaSaatleri || restaurant.calismaSaatleri1}</p>
        </div>
      </div>

      <div className="restaurant-content">
        {categories && categories.length > 0 ? (
          <>
        <div className="category-list">
          {categories.map(category => (
            <button
              key={category}
              className={`category-button ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="menu-container">
          {categories.map(category => (
            <div
              key={category}
              className={`menu-category ${activeCategory === category ? 'active' : ''}`}
              id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <h2 className="category-title">{category}</h2>
              <div className="menu-items">
                {menuByCategory[category]?.map(item => (
                  <div key={item.id} className="menu-item">
                    <div className="menu-item-info">
                      <h3 className="menu-item-name">{item.isim}</h3>
                      <p className="menu-item-description">{item.aciklama || ''}</p>
                    </div>
                    <div className="menu-item-actions">
                      <span className="menu-item-price">
                        ₺{typeof item.fiyat === 'number' ? item.fiyat.toFixed(2) : item.fiyat}
                      </span>
                      <div className="quantity-controls">
                        {getItemQuantity(item.id) > 0 && (
                          <>
                            <button 
                              className="quantity-btn remove-btn"
                              onClick={() => removeFromCart(item.id)}
                            >
                              -
                            </button>
                            <span className="quantity">{getItemQuantity(item.id)}</span>
                          </>
                        )}
                        <button 
                          className={`add-to-cart-button ${showAddedAnimation === item.id ? 'animate' : ''}`}
                          onClick={() => addToCart(item)}
                        >
                          {getItemQuantity(item.id) === 0 ? '+ Ekle' : '+'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
          </>
        ) : (
          <div className="no-menu-message">
            <p>Bu restoran için menü bilgisi bulunmamaktadır.</p>
          </div>
        )}
      </div>

      {/* Sepet butonu ve önizleme */}
      {cart.length > 0 && (
        <>
          <button className="cart-button" onClick={toggleCartPreview}>
            <div className="cart-icon"></div>
            <span className="cart-count">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            <span className="cart-total">₺{cartTotal.toFixed(2)}</span>
          </button>
          
          {showCartPreview && (
            <div className="cart-preview">
              <h3 className="cart-preview-title">Sepetim</h3>
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-quantity">{item.quantity}x</span>
                      <span className="cart-item-name">{item.isim}</span>
                    </div>
                    <div className="cart-item-price">₺{(item.fiyat * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="cart-total-row">
                <span>Toplam:</span>
                <span className="cart-preview-total">₺{cartTotal.toFixed(2)}</span>
              </div>
              <div className="cart-actions">
                <button className="clear-cart-btn" onClick={clearCart}>Sepeti Temizle</button>
                <button className="checkout-btn" onClick={proceedToCheckout}>Sipariş Ver</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 
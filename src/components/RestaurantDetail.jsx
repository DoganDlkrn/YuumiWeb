import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './RestaurantDetail.css';

export default function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [showAddedAnimation, setShowAddedAnimation] = useState(null);
  const [showCartPreview, setShowCartPreview] = useState(false);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "restaurants", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          
          // If there's no menu in the data, try to fetch it from a subcollection
          if (!data.menu && !data.menuItems) {
            const menuSnapshot = await getDocs(collection(db, "restaurants", id, "menu"));
            const menuItems = menuSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            data.menu = menuItems;
          }
          
          setRestaurant(data);
          
          // Set the default active category
          if (data.menu && data.menu.length > 0) {
            const categories = getCategories(data);
            setActiveCategory(categories[0]);
          } else if (data.menuItems && data.menuItems.length > 0) {
            const categories = getCategories(data);
            setActiveCategory(categories[0]);
          }
        } else {
          console.log("No such restaurant!");
          // Create a default restaurant for demo purposes
          createDemoRestaurant();
        }
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
        // Create a default restaurant in case of error
        createDemoRestaurant();
      } finally {
        setLoading(false);
      }
    };

    // Create a demo restaurant with menu for testing
    const createDemoRestaurant = () => {
      const demoRestaurant = {
        id: "demo-restaurant",
        isim: "Elazığ Sofrası",
        kategori: "Ev Yemekleri & Yöresel",
        puan: "4.7",
        teslimatSuresi: "25-40 dk",
        adres: "İzzetpaşa Mah. Hürriyet Cad. No: 5, Merkez/Elazığ",
        calismaSaatleri: "08:00 - 20:00",
        menu: [
          {
            id: "es_01",
            isim: "Günün Çorbası",
            aciklama: "Yanında pilav ile",
            fiyat: 25,
            kategori: "Ana Yemekler"
          },
          {
            id: "es_02",
            isim: "Kuru Fasulye",
            aciklama: "Yanında pilav ile",
            fiyat: 55,
            kategori: "Ana Yemekler"
          },
          {
            id: "es_03",
            isim: "İçli Köfte (Adet)",
            aciklama: "Elazığ usulü",
            fiyat: 25,
            kategori: "Ana Yemekler"
          },
          {
            id: "es_04",
            isim: "Harput Köfte",
            aciklama: "Elazığ'ın meşhur köftesi",
            fiyat: 65,
            kategori: "Ana Yemekler"
          },
          {
            id: "es_05",
            isim: "Ayran",
            aciklama: "Ev yapımı ayran",
            fiyat: 15,
            kategori: "İçecekler"
          },
          {
            id: "es_06",
            isim: "Sütlaç",
            aciklama: "Fırında sütlaç",
            fiyat: 35,
            kategori: "Tatlılar"
          },
          {
            id: "es_07",
            isim: "Kadayıf",
            aciklama: "Cevizli kadayıf",
            fiyat: 45,
            kategori: "Tatlılar"
          }
        ]
      };
      
      setRestaurant(demoRestaurant);
      
      // Set the default active category
      if (demoRestaurant.menu && demoRestaurant.menu.length > 0) {
        const categories = getCategories(demoRestaurant);
        setActiveCategory(categories[0]);
      }
    };

    if (id) {
      fetchRestaurantData();
    }
  }, [id]);

  // Calculate cart total when cart changes
  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + (item.fiyat * item.quantity), 0);
    setCartTotal(total);
  }, [cart]);

  const handleBack = () => {
    navigate(-1);
  };

  // Function to get unique categories from the menu
  const getCategories = (restaurantData) => {
    if (restaurantData.menu) {
      return [...new Set(restaurantData.menu.map(item => item.kategori))];
    } else if (restaurantData.menuItems) {
      return [...new Set(restaurantData.menuItems.map(item => item.kategori))];
    }
    return ["Ana Yemekler", "Tatlılar", "İçecekler"];
  };

  // Add item to cart
  const addToCart = (item) => {
    setCart(prevCart => {
      // Check if item is already in cart
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + 1
        };
        return updatedCart;
      } else {
        // Add new item with quantity 1
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
    
    // Show added animation
    setShowAddedAnimation(item.id);
    setTimeout(() => setShowAddedAnimation(null), 500);
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === itemId);
      
      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart];
        if (updatedCart[existingItemIndex].quantity > 1) {
          // Decrease quantity
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            quantity: updatedCart[existingItemIndex].quantity - 1
          };
        } else {
          // Remove item if quantity is 1
          updatedCart.splice(existingItemIndex, 1);
        }
        return updatedCart;
      }
      return prevCart;
    });
  };

  // Get item quantity in cart
  const getItemQuantity = (itemId) => {
    const item = cart.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Proceed to checkout
  const proceedToCheckout = () => {
    // For now, just display a success message
    alert('Siparişiniz alındı! Sipariş tutarı: ₺' + cartTotal.toFixed(2));
    clearCart();
  };

  // Toggle cart preview
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

  // Group menu items by category
  const menuByCategory = {};
  if (restaurant.menu) {
    restaurant.menu.forEach(item => {
      if (!menuByCategory[item.kategori]) {
        menuByCategory[item.kategori] = [];
      }
      menuByCategory[item.kategori].push(item);
    });
  } else if (restaurant.menuItems) {
    // Support for alternative menu structure
    restaurant.menuItems.forEach(item => {
      if (!menuByCategory[item.kategori]) {
        menuByCategory[item.kategori] = [];
      }
      menuByCategory[item.kategori].push(item);
    });
  }

  // Get all categories
  const categories = getCategories(restaurant);

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
          <p className="restaurant-hours">{restaurant.calismaSaatleri}</p>
        </div>
      </div>

      <div className="restaurant-content">
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
      </div>

      {/* Cart button and preview */}
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
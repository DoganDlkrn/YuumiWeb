import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, query, where, getDocs as getDocsQuery } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './RestaurantDetail.css';

export default function RestaurantDetail({ initialTab = 'menu' }) {
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
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [calculatedRating, setCalculatedRating] = useState(0);
  const [activePlanContext, setActivePlanContext] = useState(null);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  // Retrieve active plan context from localStorage on component mount
  useEffect(() => {
    try {
      const planContextString = localStorage.getItem('yuumi_active_plan_context');
      if (planContextString) {
        const planContext = JSON.parse(planContextString);
        console.log("Retrieved active plan context:", planContext);
        setActivePlanContext(planContext);
        
        // If we have an active plan context, we should show the floating action bar
        // when there are items in the cart
        setShowFloatingBar(true);
      }
    } catch (error) {
      console.error("Error parsing active plan context:", error);
    }
  }, []);
  
  // Cleanup effect - remove active plan context when component unmounts
  useEffect(() => {
    return () => {
      // Don't remove the context on unmount as we need it when returning to WeeklyPlan
      // The context will be managed by WeeklyPlan.jsx
    };
  }, []);

  // Set active tab based on initialTab prop
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Hide any standalone menu button at the bottom
  useEffect(() => {
    const hideMenuButtons = () => {
      // Find all buttons with text containing "Menü" except those in the tab navigation
      const allButtons = document.querySelectorAll('button:not(.restaurant-nav-tab)');
      allButtons.forEach(button => {
        if (button.textContent.includes('Menü') && !button.closest('.restaurant-tabs') && !button.closest('.category-list')) {
          button.style.display = 'none';
        }
      });
      
      // Also hide any standalone menu links
      const menuLinks = document.querySelectorAll('a');
      menuLinks.forEach(link => {
        if (link.textContent.includes('Menü') && !link.closest('.restaurant-tabs') && !link.closest('.category-list')) {
          link.style.display = 'none';
        }
      });

      // Hide menu button that is standalone and inside a blue circle
      const blueCircleMenuBtn = document.querySelector('.menu-button-blue, .menu-btn, button.menu-standalone, .menu-button');
      if (blueCircleMenuBtn) {
        blueCircleMenuBtn.style.display = 'none';
      }
    };
    
    // Run once when component mounts
    hideMenuButtons();
    
    // Also run after a slight delay to catch any dynamically added elements
    const timer = setTimeout(hideMenuButtons, 500);
    
    // Run again after a longer delay to ensure all dynamic content is loaded
    const longTimer = setTimeout(hideMenuButtons, 2000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(longTimer);
    };
  }, []);

  // Yorumları yükleme
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      
      try {
        const reviewsRef = collection(db, "restaurants", id, "reviews");
        const reviewsSnap = await getDocs(reviewsRef);
        
        if (!reviewsSnap.empty) {
          const reviewsData = reviewsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate() || new Date()
          }));
          
          setReviews(reviewsData);
          
          // Calculate average rating
          let totalRating = 0;
          reviewsData.forEach(review => {
            if (review.rating) {
              totalRating += review.rating;
            }
          });
          
          const avgRating = totalRating / reviewsData.length;
          setCalculatedRating(avgRating.toFixed(1));
          
          // Check if current user has already reviewed
          const currentUser = auth.currentUser;
          if (currentUser) {
            const userReviewData = reviewsData.find(review => review.userId === currentUser.uid);
            if (userReviewData) {
              setUserReview(userReviewData);
              setHasUserReviewed(true);
            }
          }
        } else {
          setCalculatedRating(restaurant?.puan || '4.5');
        }
      } catch (error) {
        console.error("Yorumlar yüklenirken hata:", error);
      }
    };
    
    fetchReviews();
  }, [id, restaurant]);

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
                              kategoriAdi = 'Menü';
                            } else if (categoryKey === '1') {
                              kategoriAdi = 'Makarnalar';
                            } else if (item.kategori) {
                              kategoriAdi = item.kategori;
                            } else {
                              kategoriAdi = 'Menü';
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
      // Kategori değeri olmayan öğeleri "Menü" olarak işaretle
      const safeMenu = restaurantData.menu.map(item => ({
        ...item,
        kategori: item.kategori || 'Menü'
      }));
      
      return [...new Set(safeMenu.map(item => item.kategori))];
    } else if (restaurantData.menuItems && Array.isArray(restaurantData.menuItems) && restaurantData.menuItems.length > 0) {
      const safeMenuItems = restaurantData.menuItems.map(item => ({
        ...item,
        kategori: item.kategori || 'Menü'
      }));
      
      return [...new Set(safeMenuItems.map(item => item.kategori))];
    }
    return [];
  };

  // Sepete ürün ekle
  const addToCart = (item) => {
    // Add to local cart state
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
    
    // Add to sessionStorage for global cart
    const storedCart = sessionStorage.getItem('yuumiCart') || '[]';
    let parsedCart = [];
    try {
      parsedCart = JSON.parse(storedCart);
    } catch (e) {
      console.error('Error parsing cart:', e);
      parsedCart = [];
    }
    
    // Create cart item with plan info if available
    const cartItem = {
      id: `item-${Date.now()}`,
      restaurantId: restaurant.id,
      restaurantName: restaurant.isim || restaurant.name,
      restaurantImage: restaurant.image || restaurant.logoUrl || 'https://via.placeholder.com/100',
      itemId: item.id,
      itemName: item.isim || item.name,
      price: typeof item.fiyat === 'number' ? 
        `₺${item.fiyat.toFixed(2)}` : 
        item.fiyat || `₺${item.price?.toFixed(2) || '0.00'}`,
      quantity: 1,
    };
    
    // Add plan info if active plan context exists
    if (activePlanContext) {
      cartItem.planInfo = {
        dayIndex: activePlanContext.dayIndex,
        planId: activePlanContext.planId
      };
      console.log("Adding item with plan info:", cartItem);
      
      // Show the floating bar if coming from weekly plan
      setShowFloatingBar(true);
    }
    
    const existingItemIndex = parsedCart.findIndex(i => i.itemId === cartItem.itemId);
    if (existingItemIndex !== -1) {
      // Increase quantity
      parsedCart[existingItemIndex].quantity += 1;
    } else {
      // Add new item
      parsedCart.push(cartItem);
    }
    
    // Save updated cart
    sessionStorage.setItem('yuumiCart', JSON.stringify(parsedCart));
    
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

  // Go to cart page
  const goToCart = () => {
    navigate('/sepetim');
  };
  
  // Continue to weekly plan
  const continueToWeeklyPlan = () => {
    // Make sure the active plan context is preserved when navigating back
    // so WeeklyPlan.jsx can use it for synchronization
    console.log("Continuing to weekly plan with context:", activePlanContext);
    
    // Navigate back to the weekly plan view
    navigate('/');
  };

  // Yeni yorum ekle
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Yorum yapmak için giriş yapmalısınız.");
      return;
    }
    
    if (newReviewText.trim() === '') {
      alert("Lütfen yorum yazınız.");
      return;
    }
    
    if (newReviewRating === 0) {
      alert("Lütfen bir yıldız puanı seçiniz.");
      return;
    }
    
    if (hasUserReviewed) {
      alert("Bu restoran için zaten bir yorum yapmışsınız.");
      return;
    }
    
    try {
      setReviewSubmitting(true);
      
      const reviewData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email.split('@')[0],
        userPhoto: currentUser.photoURL || null,
        rating: newReviewRating,
        text: newReviewText,
        date: new Date()
      };
      
      const reviewsRef = collection(db, "restaurants", id, "reviews");
      const docRef = await addDoc(reviewsRef, reviewData);
      
      const newReview = {
        id: docRef.id,
        ...reviewData
      };
      
      // Update reviews and recalculate average rating
      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      
      // Recalculate average rating
      let totalRating = 0;
      updatedReviews.forEach(review => {
        if (review.rating) {
          totalRating += review.rating;
        }
      });
      
      const avgRating = totalRating / updatedReviews.length;
      setCalculatedRating(avgRating.toFixed(1));
      
          setUserReview(newReview);
    setHasUserReviewed(true);
    setNewReviewText('');
    setNewReviewRating(0);
    
    alert("Yorumunuz başarıyla eklendi!");
    } catch (error) {
      console.error("Yorum eklenirken hata:", error);
      alert("Yorum eklenirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Tarih formatla
  const formatDate = (date) => {
    if (!date) return "";
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('tr-TR', options);
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
      const kategori = item.kategori || 'Menü';
      if (!menuByCategory[kategori]) {
        menuByCategory[kategori] = [];
      }
      menuByCategory[kategori].push(item);
    });
    console.log("Kategorilere göre gruplanmış menü:", menuByCategory);
  } else if (restaurant.menuItems && Array.isArray(restaurant.menuItems) && restaurant.menuItems.length > 0) {
    restaurant.menuItems.forEach(item => {
      const kategori = item.kategori || 'Menü';
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
        <div className="restaurant-header-info">
          <h1 className="restaurant-name">{restaurant.isim}</h1>
          <p className="restaurant-category">{restaurant.kategori}</p>
          <div className="restaurant-meta">
            <div className="restaurant-rating">
              <span className="star">★</span> {calculatedRating || restaurant.puan || '4.5'}
              <span className="review-count">({reviews.length})</span>
            </div>
            <span className="delivery-time">{restaurant.teslimatSuresi || '25-40 dk'}</span>
            <span className="delivery-fee">Ücretsiz Teslimat</span>
          </div>
          <p className="restaurant-address">{restaurant.adres}</p>
          <p className="restaurant-hours">{restaurant.calismaSaatleri || restaurant.calismaSaatleri1}</p>
        </div>
      </div>

      <div className="restaurant-tabs">
        <button 
          className={`restaurant-tab restaurant-nav-tab ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          Menü
        </button>
        <button 
          className={`restaurant-tab restaurant-nav-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Yorumlar ({reviews.length})
        </button>
        <button 
          className={`restaurant-tab restaurant-nav-tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Bilgiler
        </button>
      </div>

      <div className="restaurant-content">
        {activeTab === 'menu' && (
          <>
            {categories && categories.length > 0 ? (
              <>
                <div className="category-list">
                  {categories.map(category => (
                    <div key={category}>
                      {category}
                    </div>
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
          </>
        )}

        {activeTab === 'reviews' && (
          <div className="reviews-container">
            <div className="reviews-header">
              <h2>Restoran Yorumları</h2>
              {!hasUserReviewed && auth.currentUser && (
                <div className="review-form">
                  <h3>Yorum Yap</h3>
                  <form onSubmit={handleSubmitReview}>
                    <div className="rating-selector">
                      <p>Puanınız: <span className="required">*</span></p>
                      <div className="star-rating">
                        {[5, 4, 3, 2, 1].map(star => (
                          <span 
                            key={star}
                            className={`rating-star ${newReviewRating >= star ? 'selected' : ''}`}
                            onClick={() => setNewReviewRating(star)}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {newReviewRating === 0 && <p className="rating-error">Lütfen bir yıldız seçiniz</p>}
                    </div>
                    <textarea 
                      placeholder="Deneyiminizi paylaşın..."
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      required
                    ></textarea>
                    <button 
                      type="submit" 
                      className="submit-review" 
                      disabled={reviewSubmitting || newReviewRating === 0}
                    >
                      {reviewSubmitting ? 'Gönderiliyor...' : 'Yorum Yap'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="reviews-list">
              {reviews.length > 0 ? (
                reviews.map(review => (
                  <div key={review.id} className="review-item">
                    <div className="review-header">
                      <div className="reviewer-info">
                        <div className="reviewer-avatar">
                          {review.userPhoto ? (
                            <img src={review.userPhoto} alt={review.userName} />
                          ) : (
                            <div className="avatar-placeholder">{review.userName?.charAt(0)}</div>
                          )}
                        </div>
                        <div className="reviewer-meta">
                          <div className="reviewer-name">{review.userName}</div>
                          <div className="review-date">{formatDate(review.date)}</div>
                        </div>
                      </div>
                      <div className="review-rating">
                        <span className="star filled">★</span>
                        <span>{review.rating}</span>
                      </div>
                    </div>
                    <div className="review-content">
                      <p>{review.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-reviews">
                  <p>Bu restoran için henüz yorum yapılmamış.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="restaurant-info-tab">
            <div className="info-section">
              <h3>Restoran Bilgileri</h3>
              <div className="info-item">
                <div className="info-icon address-icon"></div>
                <div className="info-content">
                  <h4>Adres</h4>
                  <p>{restaurant.adres}</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon time-icon"></div>
                <div className="info-content">
                  <h4>Çalışma Saatleri</h4>
                  <p>{restaurant.calismaSaatleri || restaurant.calismaSaatleri1 || "12:00 - 22:00"}</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon phone-icon"></div>
                <div className="info-content">
                  <h4>Telefon</h4>
                  <p>{restaurant.telefon || "Bilgi bulunmuyor"}</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon category-icon"></div>
                <div className="info-content">
                  <h4>Mutfak</h4>
                  <p>{restaurant.kategori}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Remove the side cart button and replace with bottom floating bar */}
      {cart.length > 0 && !activePlanContext && (
        <div className="floating-action-bar">
          <div className="action-bar-info">
            <span className="action-bar-count">{cart.reduce((sum, item) => sum + item.quantity, 0)} ürün</span>
            <span className="action-bar-total">₺{cartTotal.toFixed(2)}</span>
          </div>
          <div className="action-bar-buttons">
            <button className="action-button cart-button-secondary" onClick={goToCart}>
              Sepete Git
            </button>
          </div>
        </div>
      )}
      
      {/* Floating action bar for weekly plan navigation */}
      {showFloatingBar && activePlanContext && cart.length > 0 && (
        <div className="floating-action-bar">
          <div className="action-bar-info">
            <span className="action-bar-count">{cart.reduce((sum, item) => sum + item.quantity, 0)} ürün</span>
            <span className="action-bar-total">₺{cartTotal.toFixed(2)}</span>
          </div>
          <div className="action-bar-buttons">
            <button className="action-button continue-button" onClick={continueToWeeklyPlan}>
              Devam Et
            </button>
            <button className="action-button cart-button-secondary" onClick={goToCart}>
              Sepete Git
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
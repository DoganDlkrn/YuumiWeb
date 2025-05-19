import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import './RestaurantGridStyles.css';
import './WeeklyPlan.css';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function WeeklyPlan() {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [weeklyPlan, setWeeklyPlan] = useState(generateWeeklyPlan());
  const [showRestaurantSelection, setShowRestaurantSelection] = useState(false);
  const [selectedPlanInfo, setSelectedPlanInfo] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerConfig, setTimePickerConfig] = useState({
    planId: null,
    hours: 12,
    minutes: 0
  });
  // Sepet durumu için yeni state
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState({});
  const [showCartActions, setShowCartActions] = useState(false);
  const [headerCart, setHeaderCart] = useState([]);  // Add this new state for the header cart

  const navigate = useNavigate();

  // Load weekly plan from localStorage on component mount
  useEffect(() => {
    const savedPlan = localStorage.getItem('yuumiWeeklyPlan');
    if (savedPlan) {
      try {
        const parsedPlan = JSON.parse(savedPlan);
        setWeeklyPlan(parsedPlan);
      } catch (error) {
        console.error('Error parsing saved weekly plan:', error);
      }
    }
  }, []);

  // Fetch restaurants from Firebase
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const restaurantsRef = collection(db, "restaurants");
        const restaurantsSnapshot = await getDocs(restaurantsRef);
        const restaurantsList = [];

        for (const restaurantDoc of restaurantsSnapshot.docs) {
          const restaurantData = {
            id: restaurantDoc.id,
            ...restaurantDoc.data(),
            items: []
          };

          // Fetch menu items for each restaurant
          try {
            const menuRef = collection(db, "restaurants", restaurantDoc.id, "menu");
            const menuSnapshot = await getDocs(menuRef);
            
            if (!menuSnapshot.empty) {
              restaurantData.items = menuSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
            } else if (restaurantData.menuItems && Array.isArray(restaurantData.menuItems)) {
              restaurantData.items = restaurantData.menuItems;
            }
          } catch (error) {
            console.error(`Error fetching menu for restaurant ${restaurantDoc.id}:`, error);
          }

          restaurantsList.push(restaurantData);
        }

        setRestaurants(restaurantsList);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Generate a weekly plan starting from today
  function generateWeeklyPlan() {
    const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    const weekPlan = [];
    
    for (let i = 0; i < 7; i++) {
      const planDate = new Date(today);
      planDate.setDate(today.getDate() + i);
      const dayNumber = planDate.getDay();
      
      // Get current time for the default time value
      const currentHour = today.getHours();
      const currentMinute = Math.ceil(today.getMinutes() / 5) * 5; // Round to nearest 5 minutes
      const defaultTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      weekPlan.push({
        id: i + 1,
        name: daysOfWeek[dayNumber],
        date: planDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
        completed: false,
        plans: [
          {
            id: `plan-${i}-1`,
            name: 'Plan 1',
            time: i === 0 ? defaultTime : '12:00',
            selections: []
          }
        ]
      });
    }
    
    return weekPlan;
  }

  // Navigating between days
  const goToNextDay = () => {
    if (activeDayIndex < weeklyPlan.length - 1) {
      setActiveDayIndex(activeDayIndex + 1);
    }
  };

  const goToPrevDay = () => {
    if (activeDayIndex > 0) {
      setActiveDayIndex(activeDayIndex - 1);
    }
  };

  const goToDay = (index) => {
    setActiveDayIndex(index);
  };

  // Complete the current day and move to next
  const completeCurrentDay = () => {
    const updatedPlan = [...weeklyPlan];
    updatedPlan[activeDayIndex].completed = true;
    setWeeklyPlan(updatedPlan);
    
    // Save to localStorage
    localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
    
    // Move to next day automatically if not the last day
    if (activeDayIndex < weeklyPlan.length - 1) {
      setActiveDayIndex(activeDayIndex + 1);
    }
  };

  // Add a new plan to the current day
  const addNewPlan = () => {
    const updatedPlan = [...weeklyPlan];
    const currentDay = updatedPlan[activeDayIndex];
    const newPlanNumber = currentDay.plans.length + 1;
    
    // Get current time for the default time value
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.ceil(now.getMinutes() / 5) * 5; // Round to nearest 5 minutes
    const defaultTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    currentDay.plans.push({
      id: `plan-${activeDayIndex}-${newPlanNumber}`,
      name: `Plan ${newPlanNumber}`,
      time: defaultTime,
      selections: []
    });
    
    setWeeklyPlan(updatedPlan);
    
    // Save to localStorage
    localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
  };

  // Open time picker
  const openTimePicker = (planId) => {
    const plan = weeklyPlan[activeDayIndex].plans.find(p => p.id === planId);
    if (!plan) return;
    
    const [hours, minutes] = plan.time.split(':').map(Number);
    
    setTimePickerConfig({
      planId,
      hours,
      minutes
    });
    
    setShowTimePicker(true);
  };

  // Handle time changes in picker
  const handleTimeChange = (type, value) => {
    setTimePickerConfig(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // Confirm time selection
  const confirmTimeSelection = () => {
    const { planId, hours, minutes } = timePickerConfig;
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    updatePlanTime(planId, formattedTime);
    setShowTimePicker(false);
  };

  // Update plan time
  const updatePlanTime = (planId, time) => {
    const updatedPlan = [...weeklyPlan];
    const currentDay = updatedPlan[activeDayIndex];
    const planIndex = currentDay.plans.findIndex(plan => plan.id === planId);
    
    if (planIndex >= 0) {
      currentDay.plans[planIndex].time = time;
      setWeeklyPlan(updatedPlan);
      
      // Save to localStorage
      localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
    }
  };

  // Validate if time is valid (after current time)
  const isTimeValid = (hours, minutes) => {
    if (activeDayIndex > 0) return true; // Future days are always valid
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (hours > currentHour) return true;
    if (hours === currentHour && minutes >= currentMinute) return true;
    
    return false;
  };

  // Open restaurant selection for a plan
  const openRestaurantSelection = (planId) => {
    setSelectedPlanInfo({
      dayIndex: activeDayIndex,
      planId
    });
    setShowRestaurantSelection(true);
  };
  
  // Close restaurant selection
  const closeRestaurantSelection = () => {
    setShowRestaurantSelection(false);
    setSelectedPlanInfo(null);
  };

  // Sepete yemek ekleme fonksiyonu
  const addItemToCart = (restaurantId, itemId) => {
    if (!selectedPlanInfo) return;
    
    const { dayIndex, planId } = selectedPlanInfo;
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;
    
    const item = restaurant.items.find(i => i.id === itemId);
    if (!item) return;
    
    const itemPrice = typeof item.fiyat === 'number' ? 
      `₺${item.fiyat.toFixed(2)}` : 
      item.fiyat || `₺${item.price?.toFixed(2) || '0.00'}`;
    
    const cartItem = {
      id: `item-${Date.now()}`,
      restaurantId,
      restaurantName: restaurant.name || restaurant.isim,
      restaurantImage: restaurant.image || restaurant.logoUrl || 'https://via.placeholder.com/100',
      itemId,
      itemName: item.name || item.isim,
      price: itemPrice,
      quantity: 1,
      dayIndex,
      planId
    };
    
    // Sepete ekle (gün/plan bazlı)
    const cartKey = `${dayIndex}-${planId}`;
    
    setCart(prevCart => {
      const updatedCart = { ...prevCart };
      if (!updatedCart[cartKey]) {
        updatedCart[cartKey] = [];
      }
      updatedCart[cartKey].push(cartItem);
      return updatedCart;
    });
    
    // Add to header cart as well
    setHeaderCart(prev => [...prev, cartItem]);
    
    // Save to sessionStorage for global access
    const storedCart = sessionStorage.getItem('yuumiCart') || '[]';
    let parsedCart = [];
    try {
      parsedCart = JSON.parse(storedCart);
    } catch (e) {
      console.error('Error parsing cart:', e);
      parsedCart = [];
    }
    
    // Check if the item already exists in the cart
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
    
    // Sepet aksiyonlarını göster
    setShowCartActions(true);
    
    // Update the cart icon in the header
    updateHeaderCartIcon();
    
    // Also add to weekly plan right away to show in Plan 1
    const updatedPlan = [...weeklyPlan];
    const planIndex = updatedPlan[dayIndex].plans.findIndex(plan => plan.id === planId);
    
    if (planIndex >= 0) {
      // Check if the item is already in the plan
      const existingSelection = updatedPlan[dayIndex].plans[planIndex].selections.find(
        s => s.itemName === cartItem.itemName && s.restaurantName === cartItem.restaurantName
      );
      
      if (!existingSelection) {
        updatedPlan[dayIndex].plans[planIndex].selections.push({
          id: cartItem.id,
          restaurantName: cartItem.restaurantName,
          restaurantImage: cartItem.restaurantImage,
          itemName: cartItem.itemName,
          price: cartItem.price
        });
        
        setWeeklyPlan(updatedPlan);
        
        // Save weekly plan to localStorage
        localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
      }
    }
  };

  // Function to update the cart icon in header
  const updateHeaderCartIcon = () => {
    // Find the cart icon in the header
    const cartIcon = document.querySelector('.basket-icon');
    if (!cartIcon) return;
    
    // Create or update the cart count badge
    let badge = document.querySelector('.cart-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'cart-badge';
      cartIcon.parentNode.appendChild(badge);
    }
    
    // Calculate total items in header cart
    const totalItems = headerCart.length;
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  };
  
  // Update header cart when component mounts/unmounts
  useEffect(() => {
    // Add CSS for the cart badge
    const style = document.createElement('style');
    style.textContent = `
      .cart-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #00B2FF;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
    
    // Update the cart icon on mount
    updateHeaderCartIcon();
    
    // Clean up when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Update the header cart icon whenever headerCart changes
  useEffect(() => {
    updateHeaderCartIcon();
  }, [headerCart]);

  // Sepetin içeriğini plana ekle
  const addCartToSelection = () => {
    if (!selectedPlanInfo) return;
    
    const { dayIndex, planId } = selectedPlanInfo;
    const cartKey = `${dayIndex}-${planId}`;
    const cartItems = cart[cartKey] || [];
    
    if (cartItems.length === 0) return;
    
    const updatedPlan = [...weeklyPlan];
    const planIndex = updatedPlan[dayIndex].plans.findIndex(plan => plan.id === planId);
    
    if (planIndex >= 0) {
      // Sepetteki öğeleri plana ekle
      cartItems.forEach(item => {
        updatedPlan[dayIndex].plans[planIndex].selections.push({
          id: item.id,
          restaurantName: item.restaurantName,
          restaurantImage: item.restaurantImage,
          itemName: item.itemName,
          price: item.price
        });
      });
      
      setWeeklyPlan(updatedPlan);
      
      // Save weekly plan to localStorage to persist between navigation
      localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
      
      // Sepeti temizle
      setCart(prevCart => {
        const updatedCart = { ...prevCart };
        delete updatedCart[cartKey];
        return updatedCart;
      });
      
      // Clear header cart as well
      setHeaderCart([]);
      
      setShowCartActions(false);
      setShowRestaurantSelection(false);
      setSelectedPlanInfo(null);
    }
  };

  // Sepeti temizle
  const clearCart = () => {
    if (!selectedPlanInfo) return;
    
    const { dayIndex, planId } = selectedPlanInfo;
    const cartKey = `${dayIndex}-${planId}`;
    
    setCart(prevCart => {
      const updatedCart = { ...prevCart };
      delete updatedCart[cartKey];
      return updatedCart;
    });
    
    // Clear header cart as well
    setHeaderCart([]);
    
    setShowCartActions(false);
  };

  // Sonraki plana veya güne devam et
  const continueToNextPlanOrDay = () => {
    // Önce sepeti seçimlere ekle
    addCartToSelection();
    
    if (!selectedPlanInfo) return;
    
    // Günü Bitir işlevselliği - Bir sonraki güne geçiş
    // Mevcut günü tamamlanmış olarak işaretle
    const updatedPlan = [...weeklyPlan];
    updatedPlan[activeDayIndex].completed = true;
    setWeeklyPlan(updatedPlan);
    
    // Save to localStorage
    localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
    
    // Bir sonraki güne geç (son gün değilse)
    if (activeDayIndex < weeklyPlan.length - 1) {
      setActiveDayIndex(activeDayIndex + 1);
    }
    
    // Sepeti kapat
    setShowCart(false);
    
    // Restaurant selection view'ı kapat
    setShowRestaurantSelection(false);
    setSelectedPlanInfo(null);
  };

  // Ayrı bir fonksiyon olarak "Güne Devam Et" için continueInSameDay
  const continueInSameDay = () => {
    // Önce sepeti seçimlere ekle
    addCartToSelection();
    
    // Sepeti kapat
    setShowCart(false);
    
    // Restaurant selection view'ı kapat
    setShowRestaurantSelection(false);
    
    // Aynı güne yeni bir plan ekle
    addNewPlan();
  };

  // Sepet içeriğini göster
  const toggleCart = () => {
    setShowCart(!showCart);
  };

  // Sepetten öğe sil
  const removeCartItem = (itemId) => {
    if (!selectedPlanInfo) return;
    
    const { dayIndex, planId } = selectedPlanInfo;
    const cartKey = `${dayIndex}-${planId}`;
    
    setCart(prevCart => {
      const updatedCart = { ...prevCart };
      if (!updatedCart[cartKey]) return prevCart;
      
      updatedCart[cartKey] = updatedCart[cartKey].filter(item => item.id !== itemId);
      
      if (updatedCart[cartKey].length === 0) {
        delete updatedCart[cartKey];
        setShowCartActions(false);
      }
      
      return updatedCart;
    });
    
    // Also remove from header cart
    setHeaderCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Mevcut plandaki sepet öğelerinin sayısını hesapla
  const getCurrentCartItemCount = () => {
    if (!selectedPlanInfo) return 0;
    
    const { dayIndex, planId } = selectedPlanInfo;
    const cartKey = `${dayIndex}-${planId}`;
    
    return (cart[cartKey] || []).length;
  };

  // Sepetteki öğelerin toplam fiyatını hesapla
  const calculateCartTotal = () => {
    if (!selectedPlanInfo) return 0;
    
    const { dayIndex, planId } = selectedPlanInfo;
    const cartKey = `${dayIndex}-${planId}`;
    const items = cart[cartKey] || [];
    
    return items.reduce((total, item) => {
      const price = parseFloat(item.price.replace('₺', '').replace(',', '.'));
      return total + (price * item.quantity);
    }, 0);
  };

  // Add meal selection to a plan
  const addSelectionToPlan = (restaurantId, itemId) => {
    if (!selectedPlanInfo) return;
    
    const { dayIndex, planId } = selectedPlanInfo;
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;
    
    const item = restaurant.items.find(i => i.id === itemId);
    if (!item) return;
    
    const updatedPlan = [...weeklyPlan];
    const planIndex = updatedPlan[dayIndex].plans.findIndex(plan => plan.id === planId);
    
    if (planIndex >= 0) {
      const itemPrice = typeof item.fiyat === 'number' ? 
        `₺${item.fiyat.toFixed(2)}` : 
        item.fiyat || `₺${item.price?.toFixed(2) || '0.00'}`;
      
      updatedPlan[dayIndex].plans[planIndex].selections.push({
        id: `selection-${Date.now()}`,
        restaurantName: restaurant.name || restaurant.isim,
        restaurantImage: restaurant.image || 'https://via.placeholder.com/100',
        itemName: item.name || item.isim,
        price: itemPrice
      });
      
      setWeeklyPlan(updatedPlan);
      
      // Save to localStorage
      localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
    }
  };

  // Remove a selection from a plan
  const removeSelection = (planId, selectionId) => {
    const updatedPlan = [...weeklyPlan];
    const currentDay = updatedPlan[activeDayIndex];
    const planIndex = currentDay.plans.findIndex(plan => plan.id === planId);
    
    if (planIndex >= 0) {
      currentDay.plans[planIndex].selections = currentDay.plans[planIndex].selections.filter(
        selection => selection.id !== selectionId
      );
      
      setWeeklyPlan(updatedPlan);
      
      // Save to localStorage
      localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
    }
  };

  // Calculate total cost of plan
  const calculateTotalCost = () => {
    let total = 0;
    weeklyPlan.forEach(day => {
      day.plans.forEach(plan => {
        plan.selections.forEach(selection => {
          const price = selection.price.replace('₺', '').replace(',', '.');
          total += parseFloat(price) || 0;
        });
      });
    });
    
    return total;
  };

  // Complete meal selection - close restaurant selection mode
  const completeMealSelection = () => {
    if (getCurrentCartItemCount() > 0) {
      addCartToSelection();
    }
    
    setShowRestaurantSelection(false);
    setSelectedPlanInfo(null);
  };

  // Continue to next plan or day after selection
  const continueToNext = () => {
    if (!selectedPlanInfo) return;
    
    const { dayIndex, planId } = selectedPlanInfo;
    const day = weeklyPlan[dayIndex];
    const planIndex = day.plans.findIndex(plan => plan.id === planId);
    
    // Check if there's another plan in the current day
    if (planIndex < day.plans.length - 1) {
      // Go to next plan
      setSelectedPlanInfo({
        dayIndex,
        planId: day.plans[planIndex + 1].id
      });
    } else if (dayIndex < weeklyPlan.length - 1) {
      // Go to first plan of next day
      setSelectedPlanInfo({
        dayIndex: dayIndex + 1,
        planId: weeklyPlan[dayIndex + 1].plans[0].id
      });
      setActiveDayIndex(dayIndex + 1);
    } else {
      // We're at the last plan of the last day
      completeMealSelection();
    }
  };

  // Generate time picker wheel items
  const generateTimeOptions = (type) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (type === 'hours') {
      const options = [];
      for (let i = 0; i < 24; i++) {
        // If it's today, only show hours from current hour onwards
        if (activeDayIndex === 0 && i < currentHour) continue;
        options.push(
          <div 
            key={i} 
            className={`time-option ${timePickerConfig.hours === i ? 'selected' : ''}`}
            onClick={() => handleTimeChange('hours', i)}
          >
            {i.toString().padStart(2, '0')}
          </div>
        );
      }
      return options;
    } else {
      const options = [];
      for (let i = 0; i < 60; i += 5) {
        // If it's today and current hour, only show minutes from current minute onwards
        if (activeDayIndex === 0 && timePickerConfig.hours === currentHour && i < currentMinute) continue;
        options.push(
          <div 
            key={i} 
            className={`time-option ${timePickerConfig.minutes === i ? 'selected' : ''}`}
            onClick={() => handleTimeChange('minutes', i)}
          >
            {i.toString().padStart(2, '0')}
          </div>
        );
      }
      return options;
    }
  };

  // Add new function to handle restaurant card click
  const viewRestaurantDetails = (restaurantId) => {
    if (restaurantId) {
      navigate(`/restaurant/${restaurantId}`);
    }
  };

  // Add a function to navigate to cart page
  const goToCart = () => {
    navigate('/sepetim');
  };

  // Loading state
  if (loading && showRestaurantSelection) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Restoranlar yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="weekly-plan-container">
      {showRestaurantSelection ? (
        <div className="restaurant-selection-view">
          <div className="restaurant-selection-header">
            <button className="back-btn" onClick={closeRestaurantSelection}>
              ← Geri
            </button>
            <div className="selection-header-content">
              <h2 className="selection-day-title">
                {selectedPlanInfo ? (
                  <>
                    {weeklyPlan[selectedPlanInfo.dayIndex].name} - {weeklyPlan[selectedPlanInfo.dayIndex].date}
                  </>
                ) : 'Restoran Seç'}
              </h2>
              <div className="selection-time">
                {selectedPlanInfo && (
                  <span>{weeklyPlan[selectedPlanInfo.dayIndex].plans.find(p => p.id === selectedPlanInfo.planId)?.time} için planlama yapıyorsunuz</span>
                )}
              </div>
            </div>
            <div className="selection-actions">
              <button 
                className="complete-selection-btn" 
                onClick={completeMealSelection}
              >
                Tamamla
              </button>
            </div>
          </div>
          
          <div className="restaurant-grid">
            {restaurants.map(restaurant => {
              const topItems = restaurant.items.slice(0, 3);
              return (
                <div 
                  key={restaurant.id} 
                  className="restaurant-card"
                  onClick={() => viewRestaurantDetails(restaurant.id)}
                >
                  <div className="restaurant-header">
                    <img 
                      src={restaurant.image || restaurant.logoUrl || 'https://via.placeholder.com/100'} 
                      alt={restaurant.name || restaurant.isim} 
                      className="restaurant-image"
                    />
                  </div>
                  
                  <div className="restaurant-name-section">
                    <h3 className="restaurant-name">{restaurant.name || restaurant.isim}</h3>
                    <div className="restaurant-category">{restaurant.category || restaurant.kategori}</div>
                  </div>
                  
                  <div className="restaurant-details">
                    <div className="restaurant-hours">
                      {restaurant.calismaSaatleri || restaurant.calismaSaatleri1 || "12:00 - 22:00"}
                    </div>
                    <div className="restaurant-address">
                      {restaurant.address || restaurant.adres}
                    </div>
                  </div>
                  
                  <div className="restaurant-meta-row">
                    <div className="restaurant-rating">
                      <span className="star">★</span> {restaurant.rating || restaurant.puan || '4.5'} 
                      <span className="rating-count">({restaurant.reviewCount || '0'})</span>
                    </div>
                    <div className="delivery-info">
                      <span className="delivery-time">{restaurant.deliveryTime || restaurant.teslimatSuresi || '25-40 dk'}</span>
                      <span className="delivery-fee">Ücretsiz</span>
                    </div>
                  </div>
                  
                  {/* Simple action buttons for the most popular items */}
                  {topItems.length > 0 && (
                    <div className="quick-add-section">
                      {topItems.map(item => (
                        <button 
                          key={item.id} 
                          className="quick-add-btn"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent click from bubbling to restaurant card
                            addItemToCart(restaurant.id, item.id);
                          }}
                        >
                          {(item.name || item.isim).substring(0, 20)}{(item.name || item.isim).length > 20 ? '...' : ''} Ekle
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Sepet aksiyon butonu */}
          {showCartActions && getCurrentCartItemCount() > 0 && (
            <div className="cart-floating-btn" onClick={goToCart}>
              <div className="cart-btn-content">
                <span>{getCurrentCartItemCount()} ürün</span>
                <span className="cart-btn-price">₺{calculateCartTotal().toFixed(2)}</span>
              </div>
              <div className="cart-btn-label">Sepete Git</div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="weekly-plan-header">
            <h2 className="weekly-plan-title">Haftalık Yemek Planı</h2>
          </div>
          
          <div className="day-navigation">
            <div className="day-connector"></div>
            
            <div className="day-nav-arrow prev" onClick={goToPrevDay}>
              &#8592;
            </div>
            
            {weeklyPlan.map((day, index) => (
              <div 
                key={day.id} 
                className="day-indicator" 
                onClick={() => goToDay(index)}
              >
                <div className={`day-circle ${index === activeDayIndex ? 'active' : ''} ${day.completed ? 'completed' : ''}`}>
                  {index + 1}
                </div>
                <div className="day-name">{day.name}</div>
              </div>
            ))}
            
            <div className="day-nav-arrow next" onClick={goToNextDay}>
              &#8594;
            </div>
          </div>
          
          <div className="day-content">
            <div className="day-content-header">
              <div className="day-title">
                {weeklyPlan[activeDayIndex]?.name} - {weeklyPlan[activeDayIndex]?.date}
              </div>
              <div className="day-actions">
                <button className="add-plan-btn" onClick={addNewPlan}>
                  + Yeni Plan Ekle
                </button>
                <button 
                  className="complete-day-btn" 
                  onClick={completeCurrentDay}
                  disabled={weeklyPlan[activeDayIndex]?.completed}
                >
                  Günü Tamamla
                </button>
              </div>
            </div>
            
            <div className="plan-slots">
              {weeklyPlan[activeDayIndex]?.plans.map(plan => (
                <div key={plan.id} className="plan-slot">
                  <div className="plan-slot-header">
                    <div className="plan-name">{plan.name}</div>
                    <div className="time-selector" onClick={() => openTimePicker(plan.id)}>
                      <div className="selected-time">
                        {plan.time}
                        <div className="time-note">Saati değiştirmek için tıklayın</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="selections-container">
                    {plan.selections.length > 0 ? (
                      plan.selections.map(selection => (
                        <div key={selection.id} className="meal-selection">
                          <img 
                            src={selection.restaurantImage || 'https://via.placeholder.com/100'} 
                            alt={selection.restaurantName}
                            className="meal-thumbnail"
                          />
                          <div className="meal-info">
                            <div className="meal-name">{selection.itemName}</div>
                            <div className="meal-restaurant">{selection.restaurantName}</div>
                          </div>
                          <div className="meal-price">{selection.price}</div>
                          <button 
                            className="remove-meal-btn" 
                            onClick={() => removeSelection(plan.id, selection.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <button 
                        className="add-meal-btn"
                        onClick={() => openRestaurantSelection(plan.id)}
                      >
                        + Yemek Ekle
                      </button>
                    )}
                    
                    {plan.selections.length > 0 && (
                      <button 
                        className="add-more-btn"
                        onClick={() => openRestaurantSelection(plan.id)}
                      >
                        + Daha Fazla Yemek Ekle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="weekly-plan-footer">
            <div className="weekly-total">
              Toplam: ₺{calculateTotalCost().toFixed(2)}
            </div>
            <button className="weekly-checkout-btn">
              Siparişi Tamamla
            </button>
          </div>
        </>
      )}
      
      {/* Time Picker Modal */}
      {showTimePicker && (
        <div className="time-picker-overlay" onClick={() => setShowTimePicker(false)}>
          <div className="time-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="time-picker-header">
              <h3>Saat Seçin</h3>
              <div className="current-time-note">
                Teslimat saati seçin
              </div>
            </div>
            <div className="time-picker-content">
              <div className="time-picker-columns">
                <div className="time-picker-column">
                  <div className="time-picker-label">Saat</div>
                  <div className="time-current"></div>
                  <div className="time-options-container">
                    {generateTimeOptions('hours')}
                  </div>
                </div>
                
                <div className="time-picker-separator">:</div>
                
                <div className="time-picker-column">
                  <div className="time-picker-label">Dakika</div>
                  <div className="time-current"></div>
                  <div className="time-options-container">
                    {generateTimeOptions('minutes')}
                  </div>
                </div>
              </div>
            </div>
            <div className="time-picker-actions">
              <button 
                className="time-cancel-btn"
                onClick={() => setShowTimePicker(false)}
              >
                İptal
              </button>
              <button 
                className="time-confirm-btn"
                onClick={confirmTimeSelection}
                disabled={!isTimeValid(timePickerConfig.hours, timePickerConfig.minutes)}
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
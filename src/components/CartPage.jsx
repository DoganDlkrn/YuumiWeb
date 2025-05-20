import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './HomePage.css';
import './RestaurantGridStyles.css';
import './CartPage.css';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [weeklyPlanData, setWeeklyPlanData] = useState(null);
  const navigate = useNavigate();

  // Load weekly plan data for referencing plan names
  useEffect(() => {
    const loadWeeklyPlan = () => {
      const savedPlan = localStorage.getItem('yuumiWeeklyPlan');
      if (savedPlan) {
        try {
          const parsedPlan = JSON.parse(savedPlan);
          setWeeklyPlanData(parsedPlan);
        } catch (error) {
          console.error('Error parsing weekly plan data:', error);
        }
      }
    };

    loadWeeklyPlan();
  }, []);

  // Load cart items from sessionStorage when component mounts
  useEffect(() => {
    const storedCart = sessionStorage.getItem('yuumiCart');
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error('Error parsing cart data:', error);
      }
    }
  }, []);

  // Calculate total whenever cart changes
  useEffect(() => {
    const total = cart.reduce((sum, item) => {
      const price = parseFloat(item.price.replace('₺', '').replace(',', '.'));
      return sum + (price * item.quantity);
    }, 0);
    setCartTotal(total);
  }, [cart]);

  // Check if user is logged in
  const checkUserLogin = () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Sipariş vermek için giriş yapmalısınız!");
      navigate('/');
      return false;
    }
    return true;
  };

  // Update item quantity or remove if quantity becomes 0
  const updateQuantity = (itemId, delta) => {
    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0); // Remove items with 0 quantity
    
    setCart(updatedCart);
    sessionStorage.setItem('yuumiCart', JSON.stringify(updatedCart));
  };

  // Clear the entire cart
  const clearCart = () => {
    setCart([]);
    sessionStorage.removeItem('yuumiCart');
  };

  // Get plan name from plan info
  const getPlanLabel = (planInfo) => {
    if (!planInfo || !weeklyPlanData) return null;
    
    const { dayIndex, planId } = planInfo;
    
    if (weeklyPlanData[dayIndex] && weeklyPlanData[dayIndex].plans) {
      const plan = weeklyPlanData[dayIndex].plans.find(p => p.id === planId);
      if (plan) {
        return `${weeklyPlanData[dayIndex].name} - ${plan.name}`;
      }
    }
    
    return null;
  };

  // Group cart items by restaurant and plan
  const groupedCartItems = () => {
    const grouped = {};
    
    cart.forEach(item => {
      const key = item.planInfo 
        ? `${item.restaurantId}-${item.planInfo.dayIndex}-${item.planInfo.planId}`
        : `${item.restaurantId}-regular`;
      
      if (!grouped[key]) {
        grouped[key] = {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          restaurantImage: item.restaurantImage,
          planInfo: item.planInfo,
          items: []
        };
      }
      
      grouped[key].items.push(item);
    });
    
    return Object.values(grouped);
  };

  // Proceed to checkout
  const proceedToCheckout = () => {
    if (!checkUserLogin()) return;
    if (cart.length === 0) {
      alert("Sepetiniz boş!");
      return;
    }

    // Group cart items by restaurant
    const restaurantGroups = {};
    cart.forEach(item => {
      if (!restaurantGroups[item.restaurantId]) {
        restaurantGroups[item.restaurantId] = {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          restaurantImage: item.restaurantImage,
          items: [],
          total: 0
        };
      }
      
      const price = parseFloat(item.price.replace('₺', '').replace(',', '.'));
      restaurantGroups[item.restaurantId].items.push({
        id: item.id,
        name: item.itemName,
        price: item.price,
        quantity: item.quantity,
        planInfo: item.planInfo
      });
      
      restaurantGroups[item.restaurantId].total += price * item.quantity;
    });
    
    // Create orders from restaurant groups
    const orders = Object.values(restaurantGroups).map(group => ({
      id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: auth.currentUser.uid,
      restaurantId: group.restaurantId,
      restaurantName: group.restaurantName,
      restaurantImage: group.restaurantImage,
      items: group.items,
      total: group.total,
      status: 'processing', // Initial status
      orderDate: Date.now(),
      estimatedDelivery: Date.now() + (30 * 60 * 1000) // 30 minutes from now
    }));
    
    // Get existing active orders or initialize empty array
    const storedActiveOrders = sessionStorage.getItem('yuumiActiveOrders');
    let activeOrders = [];
    
    if (storedActiveOrders) {
      try {
        activeOrders = JSON.parse(storedActiveOrders);
      } catch (error) {
        console.error('Error parsing active orders:', error);
      }
    }
    
    // Add new orders to active orders
    const updatedActiveOrders = [...activeOrders, ...orders];
    sessionStorage.setItem('yuumiActiveOrders', JSON.stringify(updatedActiveOrders));
    
    // Clear cart
    clearCart();
    
    // Show success message and navigate to orders page
    alert(`Siparişiniz alındı! Toplam: ₺${cartTotal.toFixed(2)}`);
    navigate('/siparislerim');
  };

  // Go back to previous page
  const goBack = () => {
    navigate(-1);
  };

  // Format price to ensure consistent display
  const formatPrice = (priceStr) => {
    if (!priceStr) return '₺0.00';
    
    // If it doesn't start with ₺, add it
    if (!priceStr.startsWith('₺')) {
      priceStr = '₺' + priceStr;
    }
    
    // Extract the number part
    const numPart = priceStr.replace('₺', '').replace(',', '.');
    const numValue = parseFloat(numPart);
    
    // Format with two decimal places
    return `₺${numValue.toFixed(2)}`;
  };

  // Go to weekly plan
  const goToWeeklyPlan = () => {
    navigate('/');
  };

  return (
    <div className="cart-page-container">
      <div className="cart-header-container">
        <div className="cart-page-header">
          <button className="back-btn" onClick={goBack}>
            ← Geri
          </button>
          <h1 className="cart-page-title">Sepetim</h1>
          <div className="header-spacer"></div> {/* For flex space-between alignment */}
        </div>
      </div>

      {cart.length > 0 ? (
        <div className="cart-content">
          <div className="cart-items-wrapper">
            {groupedCartItems().map(group => (
              <div key={`${group.restaurantId}-${group.planInfo?.dayIndex || 'regular'}`} className="cart-group">
                <div className="cart-group-header">
                  <img src={group.restaurantImage || 'https://via.placeholder.com/50'} alt="" className="restaurant-icon" />
                  <div className="restaurant-info">
                    <div className="restaurant-name">{group.restaurantName}</div>
                    {group.planInfo && weeklyPlanData && (
                      <div className="plan-tag">
                        {getPlanLabel(group.planInfo)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="cart-items">
                  {group.items.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="item-details">
                        <h3 className="item-name">{item.itemName}</h3>
                        <div className="item-price">{formatPrice(item.price)}</div>
                      </div>
                      <div className="item-quantity-controls">
                        <button 
                          className="quantity-btn minus" 
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          -
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button 
                          className="quantity-btn plus" 
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="cart-summary">
            <h2>Sipariş Özeti</h2>
            <div className="summary-row">
              <span>Ara Toplam</span>
              <span>₺{cartTotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Teslimat Ücreti</span>
              <span>₺0.00</span>
            </div>
            <div className="summary-row">
              <span>Platform Ücreti</span>
              <span>₺0.00</span>
            </div>
            <div className="summary-row total">
              <span>Toplam</span>
              <span>₺{cartTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="cart-actions">
            <button className="clear-cart-btn" onClick={clearCart}>
              Sepeti Temizle
            </button>
            <button className="checkout-btn" onClick={proceedToCheckout}>
              Siparişi Tamamla
            </button>
          </div>
          
          <div className="weekly-plan-link">
            <button className="go-to-weekly-plan-btn" onClick={goToWeeklyPlan}>
              Haftalık Plan Sayfasına Dön
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-cart">
          <div className="empty-cart-icon"></div>
          <p className="empty-cart-message">Sepetiniz boş.</p>
          <button 
            className="continue-shopping-btn"
            onClick={() => navigate('/')}
          >
            Alışverişe Devam Et
          </button>
        </div>
      )}
    </div>
  );
} 
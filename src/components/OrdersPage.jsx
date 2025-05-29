import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './CartPage.css';
import './OrdersPage.css';

export default function OrdersPage() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [timeLeft, setTimeLeft] = useState({});
  const navigate = useNavigate();

  // Fetch orders when component mounts
  useEffect(() => {
    const fetchOrders = async () => {
      // Make sure user is logged in
      const user = auth.currentUser;
      if (!user) {
        navigate('/');
        return;
      }

      try {
        // Get orders from sessionStorage first (for demo/testing)
        const storedActiveOrders = sessionStorage.getItem('yuumiActiveOrders');
        const storedPastOrders = sessionStorage.getItem('yuumiPastOrders');

        if (storedActiveOrders) {
          setActiveOrders(JSON.parse(storedActiveOrders));
        }

        if (storedPastOrders) {
          setPastOrders(JSON.parse(storedPastOrders));
        }

       
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
  }, [navigate]);

  // Track remaining delivery time
  useEffect(() => {
    if (activeOrders.length === 0) return;

    const calculateTimeLeft = () => {
      const newTimeLeft = {};
      
      activeOrders.forEach(order => {
        if (order.estimatedDelivery) {
          const difference = order.estimatedDelivery - Date.now();
          
          if (difference > 0) {
            const minutes = Math.floor(difference / 1000 / 60);
            const seconds = Math.floor((difference / 1000) % 60);
            newTimeLeft[order.id] = {
              minutes,
              seconds,
              total: difference
            };
          } else {
            newTimeLeft[order.id] = { minutes: 0, seconds: 0, total: 0 };
          }
        }
      });
      
      setTimeLeft(newTimeLeft);
    };
    
    // Calculate immediately on mount
    calculateTimeLeft();
    
    // Then update every second
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [activeOrders]);

  // Simulate order progress and delivery
  useEffect(() => {
    if (activeOrders.length === 0) return;

    // Function to update order status based on elapsed time
    const updateOrderStatus = () => {
      const updatedOrders = activeOrders.map(order => {
        // Check if estimated delivery time has passed
        if (order.estimatedDelivery && Date.now() >= order.estimatedDelivery) {
          // Mark as delivered when time is up
          return { ...order, status: 'delivered' };
        }
        
        const elapsedMinutes = (Date.now() - order.orderDate) / (1000 * 60);
        
        if (elapsedMinutes < 5 && order.status === 'processing') {
          // After 5 minutes, change to preparing
          return order;
        } else if (elapsedMinutes >= 5 && elapsedMinutes < 15 && order.status === 'processing') {
          // Change to preparing
          return { ...order, status: 'preparing' };
        } else if (elapsedMinutes >= 15 && elapsedMinutes < 25 && order.status === 'preparing') {
          // Change to delivering
          return { ...order, status: 'delivering' };
        }
        
        return order;
      });
      
      // Filter orders that need to be moved to past orders (delivered)
      const newPastOrders = updatedOrders.filter(order => order.status === 'delivered');
      const remainingActiveOrders = updatedOrders.filter(order => order.status !== 'delivered');
      
      if (newPastOrders.length > 0) {
        // Add to past orders
        const updatedPastOrders = [...pastOrders, ...newPastOrders];
        setPastOrders(updatedPastOrders);
        sessionStorage.setItem('yuumiPastOrders', JSON.stringify(updatedPastOrders));
        
        // Update active orders
        setActiveOrders(remainingActiveOrders);
        sessionStorage.setItem('yuumiActiveOrders', JSON.stringify(remainingActiveOrders));
      } else if (JSON.stringify(updatedOrders) !== JSON.stringify(activeOrders)) {
        // Just update status if no orders were delivered
        setActiveOrders(updatedOrders);
        sessionStorage.setItem('yuumiActiveOrders', JSON.stringify(updatedOrders));
      }
    };
    
    // Update every 30 seconds
    const timer = setInterval(updateOrderStatus, 30000);
    
    // Initial check when component mounts
    updateOrderStatus();
    
    return () => clearInterval(timer);
  }, [activeOrders, pastOrders]);

  const goBack = () => {
    navigate(-1);
  };

  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format time left
  const formatTimeLeft = (orderId) => {
    const time = timeLeft[orderId];
    if (!time) return '';
    
    return `${time.minutes}:${time.seconds < 10 ? '0' : ''}${time.seconds}`;
  };

  // Simulate a delivered order (for testing)
  const simulateDelivery = (orderId) => {
    const orderToUpdate = activeOrders.find(order => order.id === orderId);
    if (!orderToUpdate) return;
    
    // Remove from active orders
    const filteredActiveOrders = activeOrders.filter(order => order.id !== orderId);
    setActiveOrders(filteredActiveOrders);
    sessionStorage.setItem('yuumiActiveOrders', JSON.stringify(filteredActiveOrders));
    
    // Add to past orders
    const updatedOrder = { ...orderToUpdate, status: 'delivered' };
    const updatedPastOrders = [...pastOrders, updatedOrder];
    setPastOrders(updatedPastOrders);
    sessionStorage.setItem('yuumiPastOrders', JSON.stringify(updatedPastOrders));
    
    alert('Sipariş teslim edildi!');
  };

  // Get order status text
  const getStatusText = (status) => {
    switch (status) {
      case 'processing':
        return 'Sipariş Alındı';
      case 'preparing':
        return 'Hazırlanıyor';
      case 'delivering':
        return 'Yolda';
      case 'delivered':
        return 'Teslim Edildi';
      case 'canceled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  return (
    <div className="orders-page-container">
      {/* Üst bar ekleme */}
      <div className="orders-top-bar">
        <h1 className="orders-top-title">Siparişlerim</h1>
      </div>

      <div className="orders-page-header">
        <button className="back-btn" onClick={goBack}>
          ← Geri
        </button>
        <h1 className="orders-page-title">Siparişlerim</h1>
        <div></div> {/* For flex space-between alignment */}
      </div>

      <div className="orders-tabs">
        <button 
          className={`orders-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Aktif Siparişler
        </button>
        <button 
          className={`orders-tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Geçmiş Siparişler
        </button>
      </div>

      <div className="orders-content">
        {activeTab === 'active' && (
          <div className="active-orders">
            {activeOrders.length > 0 ? (
              activeOrders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-restaurant">
                      <img src={order.restaurantImage} alt={order.restaurantName} />
                      <h3>{order.restaurantName}</h3>
                    </div>
                    <div className="order-status-info">
                      <span className={`status-pill ${order.status}`}>
                        {getStatusText(order.status)}
                      </span>
                      {order.estimatedDelivery && (
                        <div className="delivery-time">
                          <span className="time-label">Tahmini Teslimat: </span>
                          <span className="time-value">{formatTimeLeft(order.id)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="order-details">
                    <div className="order-items">
                      {order.items.map(item => (
                        <div key={item.id} className="order-item">
                          <span className="item-quantity">{item.quantity}x</span>
                          <span className="item-name">{item.name}</span>
                          <span className="item-price">{item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="order-meta">
                      <div className="order-date">
                        Sipariş Tarihi: {formatDate(order.orderDate)}
                      </div>
                      <div className="order-total">
                        Toplam: ₺{order.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {/* For testing/demo purposes */}
                  <div className="order-actions">
                    <button 
                      className="deliver-btn" 
                      onClick={() => simulateDelivery(order.id)}
                    >
                      Teslim Edildi (Test)
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-orders">
                <div className="empty-orders-icon">🍽️</div>
                <p className="empty-orders-message">Aktif siparişiniz bulunmamaktadır.</p>
                <button 
                  className="continue-shopping-btn"
                  onClick={() => navigate('/')}
                >
                  Sipariş Ver
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'past' && (
          <div className="past-orders">
            {pastOrders.length > 0 ? (
              pastOrders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-restaurant">
                      <img src={order.restaurantImage} alt={order.restaurantName} />
                      <h3>{order.restaurantName}</h3>
                    </div>
                    <div className="order-status">
                      <span className={`status-pill ${order.status}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>
                  <div className="order-details">
                    <div className="order-items">
                      {order.items.map(item => (
                        <div key={item.id} className="order-item">
                          <span className="item-quantity">{item.quantity}x</span>
                          <span className="item-name">{item.name}</span>
                          <span className="item-price">{item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="order-meta">
                      <div className="order-date">
                        Sipariş Tarihi: {formatDate(order.orderDate)}
                      </div>
                      <div className="order-total">
                        Toplam: ₺{order.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="order-actions">
                    <button className="reorder-btn" onClick={() => alert('Tekrar sipariş verilecek')}>
                      Tekrar Sipariş Ver
                    </button>
                    <button className="review-btn" onClick={() => alert('Değerlendirme sayfasına yönlendirilecek')}>
                      Değerlendir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-orders">
                <div className="empty-orders-icon">📋</div>
                <p className="empty-orders-message">Geçmiş siparişiniz bulunmamaktadır.</p>
                <button 
                  className="continue-shopping-btn"
                  onClick={() => navigate('/')}
                >
                  Sipariş Ver
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
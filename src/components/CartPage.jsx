import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import './RestaurantGridStyles.css';
import './CartPage.css';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const navigate = useNavigate();

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

  // Remove an item from cart
  const removeCartItem = (itemId) => {
    const updatedCart = cart.filter(item => item.id !== itemId);
    setCart(updatedCart);
    sessionStorage.setItem('yuumiCart', JSON.stringify(updatedCart));
  };

  // Update item quantity
  const updateQuantity = (itemId, delta) => {
    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCart(updatedCart);
    sessionStorage.setItem('yuumiCart', JSON.stringify(updatedCart));
  };

  // Clear the entire cart
  const clearCart = () => {
    setCart([]);
    sessionStorage.removeItem('yuumiCart');
  };

  // Proceed to checkout
  const proceedToCheckout = () => {
    alert(`Siparişiniz alındı! Toplam: ₺${cartTotal.toFixed(2)}`);
    clearCart();
    navigate('/');
  };

  // Go back to weekly planning
  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="cart-page-container">
      <div className="cart-page-header">
        <button className="back-btn" onClick={goBack}>
          ← Geri
        </button>
        <h1 className="cart-page-title">Sepetim</h1>
        <div></div> {/* For flex space-between alignment */}
      </div>

      {cart.length > 0 ? (
        <>
          <div className="cart-items-list">
            {cart.map(item => (
              <div key={item.id} className="cart-item-card">
                <div className="cart-item-image">
                  <img src={item.restaurantImage} alt={item.restaurantName} />
                </div>
                <div className="cart-item-details">
                  <div className="cart-item-name">{item.itemName}</div>
                  <div className="cart-item-restaurant">{item.restaurantName}</div>
                  <div className="cart-item-price">{item.price}</div>
                </div>
                <div className="cart-item-actions">
                  <div className="quantity-controls">
                    <button 
                      className="quantity-btn remove-btn"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      className="quantity-btn add-btn"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <button 
                    className="delete-item-btn"
                    onClick={() => removeCartItem(item.id)}
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="cart-total">
              <span>Toplam:</span>
              <span className="cart-total-amount">₺{cartTotal.toFixed(2)}</span>
            </div>
            <div className="cart-actions">
              <button className="clear-cart-btn" onClick={clearCart}>
                Sepeti Temizle
              </button>
              <button className="checkout-btn" onClick={proceedToCheckout}>
                Siparişi Tamamla
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
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
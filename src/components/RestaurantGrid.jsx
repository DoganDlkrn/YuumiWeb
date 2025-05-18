import React, { useState, useEffect } from 'react';
import './RestaurantGrid.css';
import './RestaurantGridStyles.css';
import './DailyViewStyles.css';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function RestaurantGrid({ category, selectedKitchenTypes = [] }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        console.log("Firestore'dan restoranlar çekiliyor...");
        
        // Firebase'den restoranları çek
        const restaurantsRef = collection(db, "restaurants");
        const querySnapshot = await getDocs(restaurantsRef);
        
        console.log("Firestore sorgusu tamamlandı, belge sayısı:", querySnapshot.size);
        
        const restaurantsArray = [];
        
        // For each restaurant, fetch reviews to calculate average rating
        for (const restaurantDoc of querySnapshot.docs) {
          const restaurantId = restaurantDoc.id;
          const restaurantInfo = restaurantDoc.data();
          
          // Fetch reviews
          const reviewsRef = collection(db, "restaurants", restaurantId, "reviews");
          const reviewsSnapshot = await getDocs(reviewsRef);
          
          let totalRating = 0;
          let reviewCount = reviewsSnapshot.size;
          
          // Calculate average rating
          if (reviewCount > 0) {
            reviewsSnapshot.docs.forEach(reviewDoc => {
              const reviewData = reviewDoc.data();
              if (reviewData.rating) {
                totalRating += reviewData.rating;
              }
            });
            
            const averageRating = totalRating / reviewCount;
            
            // Add restaurant with calculated rating and review count
            restaurantsArray.push({
              id: restaurantId,
              ...restaurantInfo,
              calculatedRating: averageRating.toFixed(1),
              reviewCount: reviewCount
            });
          } else {
            // If no reviews, use default rating or add without rating
            restaurantsArray.push({
              id: restaurantId,
              ...restaurantInfo,
              calculatedRating: restaurantInfo.puan || '4.5',
              reviewCount: 0
            });
          }
        }
        
        console.log("Firestore'dan çekilen tüm restoranlar:", restaurantsArray);
        setRestaurants(restaurantsArray);
      } catch (error) {
        console.error("Restoranları çekerken hata oluştu:", error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const handleRestaurantClick = (restaurantId) => {
    console.log("Restoran sayfasına yönlendiriliyor:", restaurantId);
    navigate(`/restaurant/${restaurantId}`);
  };

  const matchesKitchenTypes = (restaurant) => {
    // Filtre seçilmemişse tüm restoranları göster
    if (!selectedKitchenTypes || selectedKitchenTypes.length === 0) {
      return true;
    }

    // Restoran kategorisini daha güvenli bir şekilde kontrol et
    const kategori = restaurant.kategori?.toLowerCase() || '';
    
    // Seçilen filtrelere göre restoranları filtrele
    for (const kitchenType of selectedKitchenTypes) {
      // Farklı mutfak türleri için eşleşme kontrolü
      if (kitchenType === 'balik' && (kategori.includes('balık') || kategori.includes('deniz'))) {
        return true;
      }
      if (kitchenType === 'burger' && kategori.includes('burger')) {
        return true;
      }
      if (kitchenType === 'cag' && kategori.includes('cağ kebap')) {
        return true;
      }
      if (kitchenType === 'cig' && kategori.includes('çiğ köfte')) {
        return true;
      }
      if (kitchenType === 'dondurma' && kategori.includes('dondurma')) {
        return true;
      }
      if (kitchenType === 'doner' && kategori.includes('döner')) {
        return true;
      }
      if (kitchenType === 'dunya' && kategori.includes('dünya')) {
        return true;
      }
      if (kitchenType === 'ev' && kategori.includes('ev')) {
        return true;
      }
      if (kitchenType === 'kahvalti' && (kategori.includes('kahvaltı') || kategori.includes('börek'))) {
        return true;
      }
      if (kitchenType === 'kofte' && kategori.includes('köfte')) {
        return true;
      }
      if (kitchenType === 'manti' && kategori.includes('mantı')) {
        return true;
      }
      if (kitchenType === 'pide' && (kategori.includes('pide') || kategori.includes('lahmacun'))) {
        return true;
      }
    }
    
    return false;
  };

  // Filtreye göre restoranları filtrele
  const filteredRestaurants = restaurants.filter(matchesKitchenTypes);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Restoranlar yükleniyor...</div>
      </div>
    );
  }

  if (filteredRestaurants.length === 0) {
    return <div className="no-restaurants">
      {selectedKitchenTypes.length > 0 
        ? "Seçili filtrelere uygun restoran bulunamadı. Lütfen farklı bir filtreleme deneyin." 
        : "Restoran bulunamadı. Lütfen daha sonra tekrar deneyin."}
    </div>;
  }

  return (
    <div className="restaurant-grid-container">
      <h2 className="grid-title">{category === 'haftalik' ? 'Haftalık Plan İçin Önerilen Restoranlar' : 'Günlük Önerilen Restoranlar'}</h2>
      <div className="restaurant-grid">
        {filteredRestaurants.map(restaurant => (
          <div 
            key={restaurant.id} 
            className="restaurant-card"
            onClick={() => handleRestaurantClick(restaurant.id)}
          >
            <div className="restaurant-header">
              {restaurant.logoUrl ? (
                <img 
                  src={restaurant.logoUrl} 
                  alt={restaurant.isim} 
                  className="restaurant-image" 
                />
              ) : (
                <img 
                  src="https://via.placeholder.com/100" 
                  alt={restaurant.isim} 
                  className="restaurant-image" 
                />
              )}
            </div>
            
            <div className="restaurant-name-section">
              <h3 className="restaurant-name">{restaurant.isim}</h3>
              <div className="restaurant-category">{restaurant.kategori}</div>
            </div>
            
            <div className="restaurant-details">
              <div className="restaurant-hours">
                {restaurant.calismaSaatleri || restaurant.calismaSaatleri1 || "12:00 - 22:00"}
              </div>
              <div className="restaurant-address">
                {restaurant.adres}
              </div>
            </div>
            
            <div className="restaurant-meta-row">
              <div className="restaurant-rating">
                <span className="star">★</span> {restaurant.calculatedRating || restaurant.puan || '4.5'} 
                <span className="rating-count">({restaurant.reviewCount || '0'})</span>
              </div>
              <div className="delivery-info">
                <span className="delivery-time">{restaurant.teslimatSuresi || '25-40 dk'}</span>
                <span className="delivery-fee">Ücretsiz</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
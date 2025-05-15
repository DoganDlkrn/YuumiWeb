import React, { useState, useEffect } from 'react';
import './RestaurantGrid.css';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
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
        
        if (querySnapshot.empty) {
          console.log("Restoranlar koleksiyonu boş, veri bulunamadı!");
          setRestaurants([]);
        } else {
          const restaurantData = querySnapshot.docs.map(doc => {
            console.log("Belge ID:", doc.id);
            return {
              id: doc.id,
              ...doc.data()
            };
          });
          
          console.log("Firestore'dan çekilen tüm restoranlar:", restaurantData);
          setRestaurants(restaurantData);
        }
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
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt={restaurant.isim} className="restaurant-image" />
            ) : (
              <div className="restaurant-image-placeholder">
                <span className="placeholder-text">{restaurant.isim?.charAt(0) || "R"}</span>
              </div>
            )}
            <div className="restaurant-info">
              <h3>{restaurant.isim}</h3>
              <p className="restaurant-category">{restaurant.kategori}</p>
              <div className="restaurant-details">
                <p className="restaurant-hours">{restaurant.calismaSaatleri || restaurant.calismaSaatleri1}</p>
                <p className="restaurant-location">{restaurant.adres}</p>
              </div>
              <div className="restaurant-footer">
                <div className="restaurant-rating">
                  <span className="star">★</span>
                  <span>{restaurant.puan || 4.5}</span>
                </div>
                <div className="restaurant-delivery">
                  <span>{restaurant.teslimatSuresi || '25-40 dk'}</span>
                  <span className="free-delivery">Ücretsiz</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
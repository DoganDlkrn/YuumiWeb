import React, { useState, useEffect } from 'react';
import './RestaurantGrid.css';
import './RestaurantGridStyles.css';
import './DailyViewStyles.css';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { getDistance } from '../utils/locationUtils'; // Konum yardımcı fonksiyonunu import et

// Ortalama sürüş hızı (km/saat) - bunu ihtiyaca göre ayarlayabilirsiniz
const AVERAGE_DRIVING_SPEED_KMH = 30;
// Sabit hazırlık süresi (dakika)
const PREPARATION_TIME_MINUTES = 10;

// Fiyat string'ini sayıya çeviren yardımcı fonksiyon (örn: "₺25.50" -> 25.50)
const parsePrice = (priceString) => {
  if (typeof priceString === 'number') return priceString;
  if (typeof priceString !== 'string') return null;
  const cleanedString = priceString.replace('₺', '').replace(',', '.');
  const price = parseFloat(cleanedString);
  return isNaN(price) ? null : price;
};

// Bir restoranın ortalama ürün fiyatını hesaplayan yardımcı fonksiyon
const calculateAveragePrice = (restaurant) => {
  console.log(`--- Ortalama Fiyat Hesaplanıyor: ${restaurant.isim || restaurant.id} ---`);
  if (!restaurant.items || !Array.isArray(restaurant.items) || restaurant.items.length === 0) {
    console.log(` -> Menü boş veya tanımsız. Ortalama: Hesaplanamadı (Infinity)`);
    return Infinity;
  }
  let totalPrice = 0;
  let validPriceCount = 0;
  console.log(` -> Menüdeki toplam ürün sayısı: ${restaurant.items.length}`);

  restaurant.items.forEach((item, index) => {
    const priceString = item.fiyat || item.price;
    console.log(`  - Ürün ${index + 1} (${item.isim || 'İsimsiz'}): Ham fiyat alanı ('${priceString}')`);
    const price = parsePrice(priceString);
    if (price !== null) {
      console.log(`    -> Parse Edilmiş Fiyat: ${price}`);
      totalPrice += price;
      validPriceCount++;
    } else {
      console.log(`    -> Fiyat parse edilemedi veya tanımsız.`);
    }
  });

  if (validPriceCount === 0) {
    console.log(` -> Geçerli fiyatı olan ürün bulunamadı. Ortalama: Hesaplanamadı (Infinity)`);
    return Infinity;
  }
  const average = totalPrice / validPriceCount;
  console.log(` -> Hesaplanan Ortalama Fiyat: ${average.toFixed(2)} (Toplam: ${totalPrice.toFixed(2)}, Geçerli Ürün Sayısı: ${validPriceCount})`);
  return average;
};

export default function RestaurantGrid({ category, selectedKitchenTypes = [], selectedSorting }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [sortedRestaurants, setSortedRestaurants] = useState([]);

  const fetchUserLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          console.log("Web: Kullanıcı konumu alındı:", position.coords);
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error("Web: Konum alınırken hata oluştu:", error);
          let message = "Konum bilgisi alınamadı.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Konum izni reddedildi. Restoranları mesafeye göre sıralamak için lütfen izin verin.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Konum bilgisi mevcut değil.";
              break;
            case error.TIMEOUT:
              message = "Konum alma isteği zaman aşımına uğradı.";
              break;
            default:
              message = "Bilinmeyen bir hata oluştu.";
              break;
          }
          setLocationError(message);
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      const message = "Tarayıcınız konum servisini desteklemiyor.";
      console.error(message);
      setLocationError(message);
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    fetchUserLocation();
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);
      try {
        const restaurantsRef = collection(db, "restaurants");
        const restaurantsSnapshot = await getDocs(restaurantsRef);
        const restaurantsList = [];
        for (const restaurantDoc of restaurantsSnapshot.docs) {
          const restaurantData = {
            id: restaurantDoc.id,
            ...restaurantDoc.data(),
            items: []
          };
          try {
            const menuRef = collection(db, "restaurants", restaurantDoc.id, "menu");
            const menuSnapshot = await getDocs(menuRef);
            if (!menuSnapshot.empty) {
              restaurantData.items = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else if (restaurantData.menuItems && Array.isArray(restaurantData.menuItems)) {
              restaurantData.items = restaurantData.menuItems;
            }
          } catch (menuError) {
            console.error(`Error fetching menu for restaurant ${restaurantDoc.id}:`, menuError);
          }
          restaurantsList.push(restaurantData);
        }
        setRestaurants(restaurantsList);
      } catch (err) {
        console.error("Error fetching restaurants:", err);
        setError("Restoranlar yüklenirken bir hata oluştu.");
      }
      setLoading(false);
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (restaurants.length > 0 && !isLoadingLocation) {
      console.log(`Restoranlar sıralanıyor. Kriter: ${selectedSorting}, Kullanıcı konumu:`, currentLocation);
      
      let processedRestaurants = restaurants.map(restaurant => {
        let distance = Infinity;
        let travelTimeMinutes = Infinity;
        let totalEstimatedTimeMinutes = Infinity;
        const averagePrice = calculateAveragePrice(restaurant);
        const rating = parseFloat(restaurant.calculatedRating || restaurant.puan || '0');

        if (currentLocation && restaurant.konum && 
            typeof restaurant.konum.latitude === 'number' && 
            typeof restaurant.konum.longitude === 'number') {
          distance = getDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            restaurant.konum.latitude,
            restaurant.konum.longitude
          );
          if (distance !== Infinity) {
            travelTimeMinutes = (distance / AVERAGE_DRIVING_SPEED_KMH) * 60;
            totalEstimatedTimeMinutes = PREPARATION_TIME_MINUTES + travelTimeMinutes;
          } 
        } else {
            // console.warn(`Restoran ${restaurant.isim} için konum bilgisi eksik veya hatalı, veya kullanıcı konumu yok.`);
        }

        if (restaurant.isim === "Harpit Kebap Salonu" || restaurant.isim === "Ocakbaşı Keyfi") {
          if (totalEstimatedTimeMinutes !== Infinity) {
            totalEstimatedTimeMinutes += 10;
          }
        }
        
        return { 
            ...restaurant, 
            distance,
            travelTimeMinutes,
            totalEstimatedTimeMinutes,
            averagePrice,
            rating
        };
      });

      let sorted = [...processedRestaurants];

      switch (selectedSorting) {
        case 'teslimat':
          sorted.sort((a, b) => (a.totalEstimatedTimeMinutes || Infinity) - (b.totalEstimatedTimeMinutes || Infinity));
          console.log("Sıralama: Teslimat Süresi", sorted.map(r => ({ name: r.isim, time: r.totalEstimatedTimeMinutes })));
          break;
        case 'puan':
          sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0)); // Yüksekten düşüğe
          console.log("Sıralama: Restoran Puanı", sorted.map(r => ({ name: r.isim, rating: r.rating })));
          break;
        case 'onerilen': // Ortalama fiyata göre (ucuzdan pahalıya)
        default:
          sorted.sort((a, b) => (a.averagePrice || Infinity) - (b.averagePrice || Infinity));
          console.log("--- Sıralama Sonucu: Önerilen (Ortalama Fiyat) ---");
          sorted.forEach(r => {
            const avgPriceDisplay = r.averagePrice === Infinity ? 'Hesaplanamadı' : r.averagePrice.toFixed(2);
            const totalItems = r.items?.length || 0;
            console.log(`  - ${r.isim}: Ortalama Fiyat: ${avgPriceDisplay}, Toplam Menü Ürünü: ${totalItems}`);
          });
          break;
      }
      
      setSortedRestaurants(sorted);

    } else if (restaurants.length > 0) {
        const defaultSorted = restaurants.map(r => ({ 
            ...r, 
            distance: undefined, 
            travelTimeMinutes: undefined,
            totalEstimatedTimeMinutes: PREPARATION_TIME_MINUTES,
            averagePrice: calculateAveragePrice(r),
            rating: parseFloat(r.calculatedRating || r.puan || '0')
        }));
        // Konum yoksa varsayılan olarak fiyata göre sırala
        defaultSorted.sort((a, b) => (a.averagePrice || Infinity) - (b.averagePrice || Infinity));
        setSortedRestaurants(defaultSorted);
        console.log("--- Kullanıcı konumu olmadan varsayılan sıralama (Önerilen - Fiyat) uygulandı: ---");
        defaultSorted.forEach(r => {
          const avgPriceDisplay = r.averagePrice === Infinity ? 'Hesaplanamadı' : r.averagePrice.toFixed(2);
          const totalItems = r.items?.length || 0;
          console.log(`  - ${r.isim}: Ortalama Fiyat: ${avgPriceDisplay}, Toplam Menü Ürünü: ${totalItems}`);
        });
    }
  }, [currentLocation, restaurants, isLoadingLocation, selectedSorting]); // selectedSorting bağımlılık olarak eklendi

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
  const filteredRestaurants = sortedRestaurants.filter(matchesKitchenTypes);

  if (isLoadingLocation || loading) {
    return <div className="loading-state">Restoranlar ve konum bilgisi yükleniyor...</div>;
  }

  if (error) {
    return <div className="error-state">Hata: {error}</div>;
  }
  
  if (locationError && !currentLocation) {
      return (
          <div className="location-error-state">
              <p>{locationError}</p>
              <button onClick={fetchUserLocation} className="retry-location-btn">Tekrar Dene</button>
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
                {restaurant.totalEstimatedTimeMinutes !== Infinity && restaurant.totalEstimatedTimeMinutes !== undefined ? (
                  (() => {
                    const time = Math.round(restaurant.totalEstimatedTimeMinutes);
                    const lowerBound = Math.floor(time / 5) * 5;
                    const upperBound = lowerBound + 5;
                    return (
                      <span className="delivery-time">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-clock" style={{ marginRight: '4px' }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {lowerBound}-{upperBound} dk
                      </span>
                    );
                  })()
                ) : (
                  <span className="delivery-time">{restaurant.teslimatSuresi || '25-40 dk'}</span> // Konum yoksa veya hesaplanamıyorsa varsayılanı göster
                )}
                <span className="delivery-fee">Ücretsiz</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
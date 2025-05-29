import React, { useState, useEffect } from 'react';
import './RestaurantGrid.css';
import './RestaurantGridStyles.css';
import './DailyViewStyles.css';
import './RestaurantGridLoading.css';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { getDistance } from '../utils/locationUtils'; // Konum yardımcı fonksiyonunu import et

// Ortalama sürüş hızı (km/saat) - bunu ihtiyaca göre ayarlayabilirsiniz
const AVERAGE_DRIVING_SPEED_KMH = 30;
// Sabit hazırlık süresi (dakika)
const PREPARATION_TIME_MINUTES = 10;

// Parse price function that handles various formats
const parsePrice = (priceString) => {
  // Return 0 for null/undefined values
  if (!priceString) return 0;
  
  // If it's already a number, return it
  if (typeof priceString === 'number') return priceString;
  
  // If it's a string, try to extract the number
  if (typeof priceString === 'string') {
    // Remove currency symbols, dots as thousand separators, and replace commas with dots
    const cleanedString = priceString
      .replace(/[₺TL]/gi, '')  // Remove TL and ₺ symbols
      .replace(/\s+/g, '')     // Remove whitespace
      .replace(/\./g, '')      // Remove dots (thousand separators)
      .replace(/,/g, '.');     // Replace commas with dots for decimal points
    
    const parsedValue = parseFloat(cleanedString);
    return isNaN(parsedValue) ? 0 : parsedValue;
  }
  
  return 0;
};

// Improved average price calculation with better parsing
const calculateAveragePrice = (restaurant) => {
  // If we already have a calculated average price, return it
  if (restaurant.averagePrice !== undefined) {
    return restaurant.averagePrice;
  }
  
  let prices = [];
  let sum = 0;
  
  // Check if the restaurant has a menu array
  if (restaurant.menu && Array.isArray(restaurant.menu)) {
    for (const item of restaurant.menu) {
      const price = parsePrice(item.fiyat);
      if (!isNaN(price) && price > 0) {
        prices.push(price);
        sum += price;
      }
    }
  }
  
  // If the restaurant has menuItems array
  if (restaurant.menuItems && Array.isArray(restaurant.menuItems)) {
    for (const item of restaurant.menuItems) {
      const price = parsePrice(item.fiyat);
      if (!isNaN(price) && price > 0) {
        prices.push(price);
        sum += price;
      }
    }
  }
  
  // If the restaurant has items array
  if (restaurant.items && Array.isArray(restaurant.items)) {
    for (const item of restaurant.items) {
      const price = parsePrice(item.fiyat);
      if (!isNaN(price) && price > 0) {
        prices.push(price);
        sum += price;
      }
    }
  }
  
  // Set a default average price if no menu items are found
  if (prices.length === 0) {
    restaurant.averagePrice = 0; // Default value when no menu items
    return 0;
  }
  
  // Calculate and store the average price
  restaurant.averagePrice = sum / prices.length;
  return restaurant.averagePrice;
};

export default function RestaurantGrid({ 
  category, 
  selectedKitchenTypes = [], 
  selectedSorting, 
  minPrice = 0, 
  maxPrice = 500, 
  isPriceFilterApplied = false 
}) {
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
      
      let processedRestaurants = restaurants.map((restaurant, index) => {
        let distance = Infinity;
        let travelTimeMinutes = Infinity;
        let totalEstimatedTimeMinutes = Infinity;
        const averagePrice = calculateAveragePrice(restaurant);
        const rating = parseFloat(restaurant.calculatedRating || restaurant.puan || '0');

        // Dinamik teslimat süresi hesaplama
        const getDeliveryTime = (name, index) => {
          // Her restoran için farklı base süreler
          const baseDeliveryTimes = [15, 20, 25, 30, 35, 40, 45];
          const baseTime = baseDeliveryTimes[index % baseDeliveryTimes.length];
          
          // Restorana göre özel süre ayarlamaları
          if (name.includes('Fast') || name.includes('Büfe')) {
            return Math.max(15, baseTime - 10); // Fast food daha hızlı
          }
          if (name.includes('Pizza')) {
            return Math.max(20, baseTime - 5); // Pizza orta hızlı
          }
          if (name.includes('Kebap') || name.includes('Ocakbaşı')) {
            return baseTime + 10; // Kebap daha yavaş
          }
          if (name.includes('Çiğ Köfte')) {
            return Math.max(10, baseTime - 15); // Çiğ köfte çok hızlı
          }
          if (name.includes('Mantı') || name.includes('Ev Yemekleri')) {
            return baseTime + 15; // Ev yemekleri daha yavaş
          }
          
          return baseTime;
        };

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
            const baseDeliveryTime = getDeliveryTime(restaurant.isim || restaurant.name, index);
            totalEstimatedTimeMinutes = baseDeliveryTime + travelTimeMinutes;
          } 
        } else {
          // Konum yoksa sabit süre ver ama her restoran farklı olsun
          totalEstimatedTimeMinutes = getDeliveryTime(restaurant.isim || restaurant.name, index);
        }

        // Özel restoran ayarlamaları
        if (restaurant.isim === "Harpit Kebap Salonu" || restaurant.isim === "Ocakbaşı Keyfi") {
          totalEstimatedTimeMinutes += 10;
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
        const defaultSorted = restaurants.map((r, index) => {
          // Dinamik teslimat süresi hesaplama (konum olmadan)
          const getDeliveryTime = (name, index) => {
            const baseDeliveryTimes = [15, 20, 25, 30, 35, 40, 45];
            const baseTime = baseDeliveryTimes[index % baseDeliveryTimes.length];
            
            if (name.includes('Fast') || name.includes('Büfe')) {
              return Math.max(15, baseTime - 10);
            }
            if (name.includes('Pizza')) {
              return Math.max(20, baseTime - 5);
            }
            if (name.includes('Kebap') || name.includes('Ocakbaşı')) {
              return baseTime + 10;
            }
            if (name.includes('Çiğ Köfte')) {
              return Math.max(10, baseTime - 15);
            }
            if (name.includes('Mantı') || name.includes('Ev Yemekleri')) {
              return baseTime + 15;
            }
            
            return baseTime;
          };

          return { 
            ...r, 
            distance: undefined, 
            travelTimeMinutes: undefined,
            totalEstimatedTimeMinutes: getDeliveryTime(r.isim || r.name, index),
            averagePrice: calculateAveragePrice(r),
            rating: parseFloat(r.calculatedRating || r.puan || '0')
          };
        });
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
  }, [currentLocation, restaurants, isLoadingLocation, selectedSorting]);

  const handleRestaurantClick = (restaurantId) => {
    console.log("Restoran sayfasına yönlendiriliyor:", restaurantId);
    navigate(`/restaurant/${restaurantId}`);
  };

  // Directly override isInPriceRange to be more strict with logging
  const isInPriceRange = (restaurant) => {
    if (!isPriceFilterApplied) {
      return true; // Not filtering by price
    }
    
    console.log(`Restoran fiyat kontrolü: ${restaurant.isim}`);
    
    // Calculate average price of menu items
    let totalPrice = 0;
    let itemCount = 0;
    
    // Get menu items from different possible sources
    const menuItems = restaurant.menu || restaurant.menuItems || restaurant.items || [];
    
    if (!Array.isArray(menuItems) || menuItems.length === 0) {
      console.log(`- Menü bulunamadı. Filtreden geçirildi.`);
      return true; // No menu to filter by
    }
    
    // Calculate average price
    menuItems.forEach(item => {
      // Get price from fiyat or price field
      const price = parsePrice(item.fiyat || item.price);
      if (price > 0) {
        totalPrice += price;
        itemCount++;
      }
    });
    
    const avgPrice = itemCount > 0 ? totalPrice / itemCount : 0;
    console.log(`- Ortalama fiyat: ${avgPrice.toFixed(2)} TL`);
    console.log(`- Filtre aralığı: ${minPrice} - ${maxPrice} TL`);
    
    // Store for future reference
    restaurant.calculatedAvgPrice = avgPrice;
    
    // Check if price is in range
    const isInRange = avgPrice >= minPrice && avgPrice <= maxPrice;
    console.log(`- Filtre sonucu: ${isInRange ? 'Uygun ✓' : 'Uygun değil ✗'}`);
    
    return isInRange;
  };

  // Filter by kitchen type
  const matchesKitchenTypes = (restaurant) => {
    // If no kitchen types are selected, show all restaurants
    if (selectedKitchenTypes.length === 0) {
      return true;
    }
    
    // Restoran kategori verisi
    let kategori = '';
    if (restaurant.kategori) {
      // Eğer kategori bir dizi ise
      if (Array.isArray(restaurant.kategori)) {
        kategori = restaurant.kategori.join(' ').toLowerCase();
      } 
      // Eğer kategori bir string ise
      else if (typeof restaurant.kategori === 'string') {
        kategori = restaurant.kategori.toLowerCase();
      }
    }
    
    // Seçilen mutfak türlerini kontrol et
    for (const kitchenType of selectedKitchenTypes) {
      // Farklı mutfak türleri için eşleştirme mantığı
      if (kitchenType === 'balik' && (kategori.includes('balık') || kategori.includes('deniz'))) {
        return true;
      }
      if (kitchenType === 'burger' && kategori.includes('burger')) {
        return true;
      }
      if (kitchenType === 'cag' && kategori.includes('cağ')) {
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
      if (kitchenType === 'pizza' && kategori.includes('pizza')) {
        return true;
      }
      if (kitchenType === 'tatli' && (kategori.includes('tatlı') || kategori.includes('pastane'))) {
        return true;
      }
      if (kitchenType === 'tavuk' && kategori.includes('tavuk')) {
        return true;
      }
      if (kitchenType === 'tost' && (kategori.includes('tost') || kategori.includes('sandviç'))) {
        return true;
      }
    }
    
    return false;
  };
  
  // Update getFilteredRestaurants function to be more clear
  const getFilteredRestaurants = () => {
    console.log(`Filtreleme başlıyor: ${sortedRestaurants.length} restoran`);
    console.log(`Fiyat filtresi: ${isPriceFilterApplied ? 'Aktif' : 'Pasif'}`);
    
    if (isPriceFilterApplied) {
      console.log(`Fiyat aralığı: ${minPrice} - ${maxPrice} TL`);
    }
    
    // Apply kitchen type filter first
    const kitchenFiltered = sortedRestaurants.filter(restaurant => matchesKitchenTypes(restaurant));
    console.log(`Mutfak filtresinden sonra: ${kitchenFiltered.length} restoran kaldı`);
    
    // Then apply price filter
    const priceFiltered = kitchenFiltered.filter(restaurant => isInPriceRange(restaurant));
    console.log(`Fiyat filtresinden sonra: ${priceFiltered.length} restoran kaldı`);
    
    return priceFiltered;
  };

  if (isLoadingLocation || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Restoranlar yükleniyor...</div>
      </div>
    );
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

  // Render the grid
  return (
    <div className="restaurant-grid-container">
      <h2 className="grid-title">
        {category === 'haftalik' ? 'Haftalık Plan İçin Önerilen Restoranlar' : 'Günlük Önerilen Restoranlar'}
      </h2>
      
      {isPriceFilterApplied && (
        <div className="filter-debug-info">
          <p>Aktif Filtre: {minPrice} TL - {maxPrice} TL aralığındaki restoranlar</p>
          <p>Toplam {getFilteredRestaurants().length} restoran bulundu</p>
        </div>
      )}
      <div className="restaurant-grid">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">Restoranlar yükleniyor...</div>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : getFilteredRestaurants().length === 0 ? (
          <div className="no-results">
            <p>Arama kriterlerinize uygun restoran bulunamadı.</p>
            {isPriceFilterApplied && (
              <p>Fiyat aralığını değiştirmeyi deneyin: {minPrice} TL - {maxPrice} TL</p>
            )}
            {selectedKitchenTypes.length > 0 && (
              <p>Farklı mutfak kategorileri seçmeyi deneyin.</p>
            )}
          </div>
        ) : (
          getFilteredRestaurants().map(restaurant => (
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
          ))
        )}
      </div>
    </div>
  );
} 
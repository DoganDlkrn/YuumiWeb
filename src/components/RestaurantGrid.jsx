import React, { useState, useEffect } from 'react';
import './RestaurantGrid.css';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function RestaurantGrid({ category }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "restaurants"));
        const restaurantData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRestaurants(restaurantData);
        console.log("Fetched restaurants:", restaurantData);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        // Add some demo data if Firebase fetch fails
        setRestaurants([
          {
            id: "cigkofteci-ahmet-usta",
            isim: "Çiğköfteci Ahmet Usta",
            kategori: "Çiğ Köfte",
            puan: "4.5",
            teslimatSuresi: "25-40 dk",
            adres: "Doğukent Mah. Çarşı İçi No: 7, Elazığ",
            calismaSaatleri: "10:00 - 01:00",
            logoUrl: "https://via.placeholder.com/150/008000/FFFFFF/?text=Çiğköfteci"
          },
          {
            id: "deniz-yildizi-balikcisi",
            isim: "Deniz Yıldızı Balıkçısı",
            kategori: "Balık & Deniz Ürünleri",
            puan: "4.7",
            teslimatSuresi: "25-40 dk",
            adres: "Göl Kenarı Yolu, Sivrice/Elazığ",
            calismaSaatleri: "12:00 - 22:00",
            logoUrl: "https://via.placeholder.com/150/0000FF/FFFFFF/?text=Balık"
          },
          {
            id: "dragon-wok",
            isim: "Dragon Wok",
            kategori: "Çin Mutfağı",
            puan: "4.3",
            teslimatSuresi: "25-40 dk",
            adres: "Cumhuriyet Mah. Fatih Ahmet Baba Blv. No: 21, Elazığ",
            calismaSaatleri: "12:00 - 22:00",
            logoUrl: "https://via.placeholder.com/150/FF0000/FFFFFF/?text=Çin"
          },
          {
            id: "elazig-manti",
            isim: "Elazığ Mantı & Gözleme",
            kategori: "Mantı & Gözleme",
            puan: "4.6",
            teslimatSuresi: "20-35 dk",
            adres: "Rizaiye Mah. Hacı Tevfik Efendi Sok. No: 9, Elazığ",
            calismaSaatleri: "08:00 - 19:00",
            logoUrl: "https://via.placeholder.com/150/FFA500/FFFFFF/?text=Mantı"
          },
          {
            id: "elazig-sofrasi",
            isim: "Elazığ Sofrası",
            kategori: "Ev Yemekleri & Yöresel",
            puan: "4.7",
            teslimatSuresi: "25-40 dk",
            adres: "İzzetpaşa Mah. Hürriyet Cad. No: 5, Merkez/Elazığ",
            calismaSaatleri: "08:00 - 20:00",
            logoUrl: "https://via.placeholder.com/150/964B00/FFFFFF/?text=Yöresel"
          },
          {
            id: "fistikzade-pastanesi",
            isim: "Fıstıkzade Pastanesi",
            kategori: "Pastane & Fırın",
            puan: "4.8",
            teslimatSuresi: "20-30 dk",
            adres: "Çaydaçıra Mah. Necip Fazıl Kısakürek Cad. No: 30, Elazığ",
            calismaSaatleri: "07:00 - 21:00",
            logoUrl: "https://via.placeholder.com/150/FF00FF/FFFFFF/?text=Pastane"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const handleRestaurantClick = (restaurantId) => {
    console.log("Navigating to restaurant:", restaurantId);
    navigate(`/restaurant/${restaurantId}`);
  };

  if (loading) {
    return <div className="loading-spinner">Restoranlar yükleniyor...</div>;
  }

  return (
    <div className="restaurant-grid-container">
      <h2 className="grid-title">{category === 'haftalik' ? 'Haftalık Plan İçin Önerilen Restoranlar' : 'Günlük Önerilen Restoranlar'}</h2>
      <div className="restaurant-grid">
        {restaurants.map(restaurant => (
          <div 
            key={restaurant.id} 
            className="restaurant-card"
            onClick={() => handleRestaurantClick(restaurant.id)}
          >
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt={restaurant.isim} className="restaurant-image" />
            ) : (
              <div className="restaurant-image-placeholder">
                <span className="placeholder-text">{restaurant.isim.charAt(0)}</span>
              </div>
            )}
            <div className="restaurant-info">
              <h3>{restaurant.isim}</h3>
              <p className="restaurant-category">{restaurant.kategori}</p>
              <div className="restaurant-details">
                <p className="restaurant-hours">{restaurant.calismaSaatleri}</p>
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
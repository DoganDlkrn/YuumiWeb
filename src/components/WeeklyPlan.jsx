import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  // Load weekly plan from localStorage and cart from sessionStorage on component mount
  useEffect(() => {
    // Load weekly plan from localStorage
    const savedPlan = localStorage.getItem('yuumiWeeklyPlan');
    if (savedPlan) {
      try {
        const parsedPlan = JSON.parse(savedPlan);
        console.log("Loaded weekly plan from localStorage");
        setWeeklyPlan(parsedPlan);
      } catch (error) {
        console.error('Error parsing saved weekly plan:', error);
      }
    }
    
    // Load global cart from sessionStorage
    const savedCart = sessionStorage.getItem('yuumiCart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        console.log(`Loaded ${parsedCart.length} items from global cart`);
        
        // Convert flat cart to day/plan based cart
        const dayPlanCart = {};
        
        parsedCart.forEach(item => {
          if (item.planInfo) {
            const { dayIndex, planId } = item.planInfo;
            const cartKey = `${dayIndex}-${planId}`;
            
            if (!dayPlanCart[cartKey]) {
              dayPlanCart[cartKey] = [];
            }
            
            // Check if item already exists
            const existingIndex = dayPlanCart[cartKey].findIndex(
              existing => existing.itemId === item.itemId && 
                         existing.restaurantId === item.restaurantId
            );
            
            if (existingIndex >= 0) {
              // Update quantity if item already exists
              dayPlanCart[cartKey][existingIndex].quantity += item.quantity;
            } else {
              // Add new item
              dayPlanCart[cartKey].push(item);
            }
          }
        });
        
        setCart(dayPlanCart);
        
        // Set header cart for display
        setHeaderCart(parsedCart);
      } catch (error) {
        console.error('Error parsing saved cart:', error);
      }
    }
    
    // Check for active plan context in localStorage
    const activePlanContext = localStorage.getItem('yuumiActivePlanContext');
    if (activePlanContext) {
      try {
        const parsedContext = JSON.parse(activePlanContext);
        console.log("Restoring active plan context:", parsedContext);
        
        // Wait a bit to ensure weekly plan is loaded first
        setTimeout(() => {
          const { dayIndex, planId } = parsedContext;
          
          if (typeof dayIndex === 'number' && planId) {
            // Set the active day
            setActiveDayIndex(dayIndex);
            
            // Set selected plan info
            setSelectedPlanInfo(parsedContext);
          }
        }, 100);
      } catch (error) {
        console.error('Error parsing active plan context:', error);
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
      
      // Get current time for today's default time value, use rounded minutes
      let defaultTime;
      if (i === 0) { // Today
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes(); // Use actual minutes
        defaultTime = `${currentHour.toString().padStart(2, '0')}:${
          currentMinute.toString().padStart(2, '0') // Ensure minutes are always two digits
        }`;
      } else {
        defaultTime = '12:00'; // Default for future days
      }
      
      weekPlan.push({
        id: i + 1,
        name: daysOfWeek[dayNumber],
        date: planDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
        completed: false,
        plans: [
          {
            id: `plan-${i}-1`,
            name: 'Plan 1',
            time: defaultTime,
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
    // If clicking on already active day, deselect it
    if (index === activeDayIndex) {
      setActiveDayIndex(null);
    } else {
      setActiveDayIndex(index);
    }
  };

  // Add a new function to handle double click on day indicator for deselecting
  const handleDayDoubleClick = (index) => {
    const updatedPlan = [...weeklyPlan];
    if (updatedPlan[index].completed) {
      updatedPlan[index].completed = false;
      setWeeklyPlan(updatedPlan);
      localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
    }
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
    const defaultTime = `${currentHour.toString().padStart(2, '0')}:${
      currentMinute >= 60 ? '00' : currentMinute.toString().padStart(2, '0')
    }`;
    
    const newPlanId = `plan-${activeDayIndex}-${newPlanNumber}`;
    
    currentDay.plans.push({
      id: newPlanId,
      name: `Plan ${newPlanNumber}`,
      time: defaultTime,
      selections: []
    });
    
    setWeeklyPlan(updatedPlan);
    
    // Save to localStorage
    localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
    
    // Automatically switch to the new plan
    switchToPlan(activeDayIndex, newPlanId);
  };

  // Function to delete a plan from the current day
  const deletePlan = (planIdToDelete) => {
    const updatedWeeklyPlan = weeklyPlan.map((day, dayIdx) => {
      if (dayIdx === activeDayIndex) {
        // Filter out the plan to be deleted
        const updatedPlans = day.plans.filter(plan => plan.id !== planIdToDelete);
        return { ...day, plans: updatedPlans };
      }
      return day;
    });

    setWeeklyPlan(updatedWeeklyPlan);
    localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedWeeklyPlan));

    // If the deleted plan was the selected one, clear selectedPlanInfo
    if (selectedPlanInfo && selectedPlanInfo.planId === planIdToDelete) {
      setSelectedPlanInfo(null);
      // Optionally, select the first plan if available or handle UI appropriately
      const currentDayPlans = updatedWeeklyPlan[activeDayIndex]?.plans;
      if (currentDayPlans && currentDayPlans.length > 0) {
        switchToPlan(activeDayIndex, currentDayPlans[0].id);
      } else {
        // Handle case where no plans are left for the day
        // e.g., by not calling switchToPlan or showing a message
      }
    }
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
    // Clear any existing active plan context first
    localStorage.removeItem('yuumi_active_plan_context');
    
    // Set the current selected plan info
    setSelectedPlanInfo({
      dayIndex: activeDayIndex,
      planId
    });
    
    console.log("Opening restaurant selection for plan:", {
      dayIndex: activeDayIndex,
      planId
    });
    
    setShowRestaurantSelection(true);
  };
  
  // Close restaurant selection
  const closeRestaurantSelection = () => {
    setShowRestaurantSelection(false);
    setSelectedPlanInfo(null);
    
    // Make sure the active plan context is cleared
    localStorage.removeItem('yuumi_active_plan_context');
  };

  // Add a modified addItemToCart function to better handle cart state
  const addItemToCart = (restaurantId, itemId) => {
    if (!selectedPlanInfo) {
      console.error("No plan selected. Cannot add item to cart.");
      return;
    }
    
    const { dayIndex, planId } = selectedPlanInfo;
    console.log(`Adding item to cart. Day Index: ${dayIndex}, Plan ID: ${planId}`);
    
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (!restaurant) {
      console.error(`Restaurant not found with ID: ${restaurantId}`);
      return;
    }
    
    const item = restaurant.items.find(i => i.id === itemId);
    if (!item) {
      console.error(`Item not found with ID: ${itemId} in restaurant ${restaurantId}`);
      return;
    }
    
    console.log(`Found item: ${item.name || item.isim} in restaurant: ${restaurant.name || restaurant.isim}`);
    
    const itemPrice = typeof item.fiyat === 'number' ? 
      `₺${item.fiyat.toFixed(2)}` : 
      item.fiyat || `₺${item.price?.toFixed(2) || '0.00'}`;
    
    const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const cartItem = {
      id: uniqueId,
      restaurantId,
      restaurantName: restaurant.name || restaurant.isim,
      restaurantImage: restaurant.image || restaurant.logoUrl || 'https://via.placeholder.com/100',
      itemId,
      itemName: item.name || item.isim,
      price: itemPrice,
      quantity: 1,
      planInfo: {
        dayIndex,
        planId
      }
    };
    
    // Step 1: First update the weekly plan to ensure items appear in the plan
    const updatedWeeklyPlan = JSON.parse(JSON.stringify(weeklyPlan)); // Deep clone to avoid reference issues
    
    if (dayIndex >= 0 && dayIndex < updatedWeeklyPlan.length) {
      const dayPlan = updatedWeeklyPlan[dayIndex];
      const planIndex = dayPlan.plans.findIndex(plan => plan.id === planId);
      
      if (planIndex >= 0) {
        // Check if item already exists to avoid duplicates
        const existingSelectionIndex = dayPlan.plans[planIndex].selections.findIndex(
          s => s.itemId === itemId && s.restaurantId === restaurantId
        );
        
        if (existingSelectionIndex >= 0) {
          console.log(`Item already exists in plan at day ${dayIndex}, plan ${planId}. Updating quantity.`);
          // In the future we could update quantity here if needed
        } else {
          // Add to plan
          const selectionItem = {
            id: uniqueId,
            restaurantId: cartItem.restaurantId,
            restaurantName: cartItem.restaurantName,
            restaurantImage: cartItem.restaurantImage,
            itemId: itemId,
            itemName: cartItem.itemName,
            price: cartItem.price
          };
          
          dayPlan.plans[planIndex].selections.push(selectionItem);
          console.log(`Added item "${cartItem.itemName}" to plan at day ${dayIndex}, plan ${planId}`);
        }
        
        // Set updated weekly plan
        setWeeklyPlan(updatedWeeklyPlan);
        
        // Save updated plan to localStorage
        localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedWeeklyPlan));
      } else {
        console.error(`Plan not found with ID: ${planId} in day ${dayIndex}`);
      }
    } else {
      console.error(`Invalid day index: ${dayIndex}`);
    }
    
    // Step 2: Update the cart state by day/plan
    const cartKey = `${dayIndex}-${planId}`;
    
    setCart(prevCart => {
      const updatedCart = { ...prevCart };
      if (!updatedCart[cartKey]) {
        updatedCart[cartKey] = [];
      }
      
      // Check if item already exists in cart
      const existingItemIndex = updatedCart[cartKey].findIndex(
        i => i.itemId === itemId && i.restaurantId === restaurantId
      );
      
      if (existingItemIndex >= 0) {
        // Increase quantity for existing item
        updatedCart[cartKey][existingItemIndex].quantity += 1;
        console.log(`Increased quantity for item "${cartItem.itemName}" in cart for day ${dayIndex}, plan ${planId}`);
      } else {
        // Add new item to cart
        updatedCart[cartKey].push({...cartItem});
        console.log(`Added item "${cartItem.itemName}" to cart for day ${dayIndex}, plan ${planId}`);
      }
      
      return updatedCart;
    });
    
    // Step 3: Update header cart for display
    setHeaderCart(prev => {
      const updatedHeaderCart = [...prev];
      const existingItemIndex = updatedHeaderCart.findIndex(
        i => i.itemId === itemId && i.restaurantId === restaurantId
      );
      
      if (existingItemIndex >= 0) {
        updatedHeaderCart[existingItemIndex].quantity += 1;
        console.log(`Increased quantity for item "${cartItem.itemName}" in header cart`);
      } else {
        updatedHeaderCart.push({...cartItem});
        console.log(`Added item "${cartItem.itemName}" to header cart`);
      }
      
      return updatedHeaderCart;
    });
    
    // Step 4: Update global cart in sessionStorage
    setTimeout(() => {
      updateGlobalCart();
    }, 100);
    
    // Show cart actions
    setShowCartActions(true);
  };

  // Function to update the global cart from weekly plan - IMPROVED
  const updateGlobalCart = () => {
    console.log("Updating global cart from weekly plan data...");
    
    // Get all selections from all plans
    const cartItems = [];
    const processedItems = new Set(); // Track processed items to avoid duplicates
    
    weeklyPlan.forEach((day, dayIndex) => {
      day.plans.forEach(plan => {
        if (plan.selections && plan.selections.length > 0) {
          console.log(`Processing ${plan.selections.length} items in day ${dayIndex}, plan ${plan.id}`);
          
          plan.selections.forEach(selection => {
            // Create a unique identifier for the item
            const itemKey = `${selection.restaurantId || 'unknown'}-${selection.itemId || 'unknown'}-${dayIndex}-${plan.id}`;
            
            // Skip if already processed
            if (processedItems.has(itemKey)) {
              console.log(`Skipping duplicate item: ${selection.itemName}`);
              return;
            }
            
            processedItems.add(itemKey);
            
            // Find if the item exists in the cart state to get the correct quantity
            let quantity = 1;
            const cartKey = `${dayIndex}-${plan.id}`;
            if (cart[cartKey]) {
              const cartItem = cart[cartKey].find(
                item => item.itemId === selection.itemId && 
                       item.restaurantId === selection.restaurantId
              );
              if (cartItem) {
                quantity = cartItem.quantity;
              }
            }
            
            // Create a cart item for each selection
            cartItems.push({
              id: selection.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              restaurantId: selection.restaurantId || 'unknown',
              restaurantName: selection.restaurantName,
              restaurantImage: selection.restaurantImage || 'https://via.placeholder.com/100',
              itemId: selection.itemId || 'unknown',
              itemName: selection.itemName,
              price: selection.price,
              quantity: quantity,
              planInfo: {
                dayIndex: dayIndex,
                planId: plan.id
              }
            });
            
            console.log(`Added to global cart: ${selection.itemName} (${quantity}) for day ${dayIndex}, plan ${plan.id}`);
          });
        }
      });
    });
    
    // Save to sessionStorage
    sessionStorage.setItem('yuumiCart', JSON.stringify(cartItems));
    console.log(`Updated global cart with ${cartItems.length} unique items`);
    
    // Update the cart icon count
    updateHeaderCartIcon();
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

  // Plandan Ürün Silme
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
      
      // Update the global cart after removing the item
      updateGlobalCart();
    }
  };

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
        // Check if the item already exists in plan to avoid duplicates
        const existingSelectionIndex = updatedPlan[dayIndex].plans[planIndex].selections.findIndex(
          selection => selection.itemName === item.itemName && 
                      selection.restaurantName === item.restaurantName
        );
        
        // Only add if not already in plan
        if (existingSelectionIndex === -1) {
          updatedPlan[dayIndex].plans[planIndex].selections.push({
            id: item.id,
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            restaurantImage: item.restaurantImage,
            itemName: item.itemName,
            price: item.price
          });
        }
      });
      
      setWeeklyPlan(updatedPlan);
      
      // Save to localStorage
      localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedPlan));
      
      // Update the global cart with the new plan items
      updateGlobalCart();
      
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
    if (!restaurantId) return;
    
    if (selectedPlanInfo) {
      console.log("Selected plan info before navigation:", selectedPlanInfo);
      
      // Save the current selected plan info to localStorage before navigating
      localStorage.setItem('yuumi_active_plan_context', JSON.stringify({
        dayIndex: selectedPlanInfo.dayIndex,
        planId: selectedPlanInfo.planId
      }));
      
      // Add a small delay to ensure the localStorage is set before navigation
      setTimeout(() => {
        navigate(`/restaurant/${restaurantId}`);
      }, 50);
    } else {
      navigate(`/restaurant/${restaurantId}`);
    }
  };

  // Add useEffect to sync sessionStorage cart items back to weekly plan when returning
  useEffect(() => {
    // This function will sync cart items with plan info back to the weekly plan
    const syncCartItemsToPlan = () => {
      const storedCart = sessionStorage.getItem('yuumiCart');
      const activePlanContext = localStorage.getItem('yuumi_active_plan_context');
      
      console.log("Syncing cart items to plan. Active context:", activePlanContext);
      
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          const planInfoItems = parsedCart.filter(item => item.planInfo);
          
          if (planInfoItems.length > 0) {
            console.log("Found items with plan info to sync:", planInfoItems);
            
            // Create a copy of the current weekly plan
            const updatedWeeklyPlan = [...weeklyPlan];
            
            // Process items with plan info
            planInfoItems.forEach(item => {
              const { dayIndex, planId } = item.planInfo;
              
              // Check if day and plan exist
              if (updatedWeeklyPlan[dayIndex] && 
                  updatedWeeklyPlan[dayIndex].plans) {
                
                const planIndex = updatedWeeklyPlan[dayIndex].plans.findIndex(
                  plan => plan.id === planId
                );
                
                if (planIndex >= 0) {
                  // Check if item already exists in plan to avoid duplicates
                  const existingSelectionIndex = updatedWeeklyPlan[dayIndex].plans[planIndex].selections.findIndex(
                    selection => selection.itemName === item.itemName && 
                                selection.restaurantName === item.restaurantName
                  );
                  
                  if (existingSelectionIndex === -1) {
                    // Add the item to the plan if it doesn't already exist
                    updatedWeeklyPlan[dayIndex].plans[planIndex].selections.push({
                      id: item.id,
                      restaurantName: item.restaurantName,
                      restaurantImage: item.restaurantImage,
                      itemName: item.itemName,
                      price: item.price
                    });
                    
                    console.log(`Added item ${item.itemName} to day ${dayIndex}, plan ${planId}`);
                  }
                }
              }
            });
            
            // Only update if changes were made
            if (JSON.stringify(updatedWeeklyPlan) !== JSON.stringify(weeklyPlan)) {
              console.log("Updating weekly plan with synced items");
              
              // Update the weekly plan state with synchronized items
              setWeeklyPlan(updatedWeeklyPlan);
              
              // Save to localStorage
              localStorage.setItem('yuumiWeeklyPlan', JSON.stringify(updatedWeeklyPlan));
            }
          }
        } catch (error) {
          console.error("Error syncing cart items to plan:", error);
        }
      }
    };
    
    // Run synchronization when component mounts and when location changes
    syncCartItemsToPlan();
  }, [navigate, weeklyPlan]);
  
  // Use location to detect when we return from restaurant detail
  useEffect(() => {
    // Check if we're returning from a restaurant detail page
    if (location.pathname === '/' && localStorage.getItem('yuumi_active_plan_context')) {
      console.log("Detected return from restaurant detail page");
      
      // Sync cart items first
      const syncCartItems = async () => {
        // Get active plan context
        try {
          const planContextString = localStorage.getItem('yuumi_active_plan_context');
          if (planContextString) {
            const planContext = JSON.parse(planContextString);
            console.log("Retrieved active plan context on return:", planContext);
            
            // Set active day and plan based on the context
            if (planContext.dayIndex !== undefined) {
              setActiveDayIndex(planContext.dayIndex);
            }
            
            // Set selected plan info to continue adding items to the same plan
            setSelectedPlanInfo(planContext);
            
            // Give the state updates time to propagate
            setTimeout(() => {
              // Clear plan context after processing
              localStorage.removeItem('yuumi_active_plan_context');
            }, 100);
          }
        } catch (error) {
          console.error("Error processing active plan context:", error);
        }
      };
      
      syncCartItems();
    }
  }, [location.pathname]);

  // Function to switch between different plans
  const switchToPlan = (dayIndex, planId) => {
    console.log(`Switching to day ${dayIndex}, plan ${planId}`);
    
    // Make sure we have valid indices
    if (dayIndex < 0 || dayIndex >= weeklyPlan.length) {
      console.error(`Invalid day index: ${dayIndex}`);
      return;
    }
    
    const day = weeklyPlan[dayIndex];
    const planIndex = day.plans.findIndex(plan => plan.id === planId);
    
    if (planIndex < 0) {
      console.error(`Plan with ID ${planId} not found in day ${dayIndex}`);
      return;
    }
    
    // Update the active day if needed
    if (activeDayIndex !== dayIndex) {
      setActiveDayIndex(dayIndex);
    }
    
    // Set the selected plan info
    setSelectedPlanInfo({
      dayIndex,
      planId,
      planName: day.plans[planIndex].name,
      planTime: day.plans[planIndex].time
    });
    
    // Check if we have any items in the selected plan
    const planSelections = day.plans[planIndex].selections || [];
    console.log(`Plan has ${planSelections.length} items`);
    
    // If we had opened restaurant selection previously, close it
    if (showRestaurantSelection) {
      setShowRestaurantSelection(false);
    }
    
    // Ensure cart state is synchronized with the selected plan
    syncCartWithSelectedPlan(dayIndex, planId);
    
    // Save the current context to localStorage for persistence between page navigations
    localStorage.setItem('yuumiActivePlanContext', JSON.stringify({
      dayIndex,
      planId,
      planName: day.plans[planIndex].name,
      planTime: day.plans[planIndex].time
    }));
  };
  
  // Function to synchronize cart with selected plan
  const syncCartWithSelectedPlan = (dayIndex, planId) => {
    console.log(`Synchronizing cart with day ${dayIndex}, plan ${planId}`);
    
    // Make sure the plan exists in our data
    if (dayIndex < 0 || dayIndex >= weeklyPlan.length) {
      console.error(`Invalid day index: ${dayIndex}`);
      return;
    }
    
    const day = weeklyPlan[dayIndex];
    const planIndex = day.plans.findIndex(plan => plan.id === planId);
    
    if (planIndex < 0) {
      console.error(`Plan with ID ${planId} not found in day ${dayIndex}`);
      return;
    }
    
    // Get the current selections for this plan
    const planSelections = day.plans[planIndex].selections || [];
    const cartKey = `${dayIndex}-${planId}`;
    
    // Ensure the cart has an entry for this plan/day combo
    setCart(prevCart => {
      const updatedCart = { ...prevCart };
      
      if (!updatedCart[cartKey] || !Array.isArray(updatedCart[cartKey])) {
        updatedCart[cartKey] = [];
      }
      
      // Build a new cart entry based on plan selections
      // but retain quantity info if it exists
      const newCartItems = [];
      
      planSelections.forEach(selection => {
        // Check if item exists in cart already
        const existingItem = updatedCart[cartKey].find(
          item => item.itemId === selection.itemId && 
                 item.restaurantId === selection.restaurantId
        );
        
        // Create or update the cart item
        const cartItem = {
          id: selection.id,
          restaurantId: selection.restaurantId,
          restaurantName: selection.restaurantName,
          restaurantImage: selection.restaurantImage,
          itemId: selection.itemId,
          itemName: selection.itemName,
          price: selection.price,
          quantity: existingItem ? existingItem.quantity : 1,
          planInfo: {
            dayIndex,
            planId
          }
        };
        
        newCartItems.push(cartItem);
      });
      
      updatedCart[cartKey] = newCartItems;
      
      return updatedCart;
    });
    
    // Update the global cart asynchronously to avoid state update conflicts
    setTimeout(() => {
      updateGlobalCart();
    }, 100);
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    viewRestaurantDetails(restaurant.id);
                  }}
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
                            e.preventDefault();
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
            </div>
            
            {weeklyPlan.map((day, index) => (
              <div 
                key={day.id} 
                className="day-indicator" 
                onClick={() => goToDay(index)}
                onDoubleClick={() => handleDayDoubleClick(index)}
              >
                <div className={`day-circle ${index === activeDayIndex ? 'active' : ''} ${day.completed ? 'completed' : ''}`}>
                  {index + 1}
                </div>
                <div className="day-name">{day.name}</div>
              </div>
            ))}
            
            <div className="day-nav-arrow next" onClick={goToNextDay}>
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
                    {/* Add delete button for plans other than 'Plan 1' */}
                    {plan.name !== 'Plan 1' ? (
                      <button 
                        className="delete-plan-btn" 
                        onClick={() => deletePlan(plan.id)}
                        aria-label={`Sil ${plan.name}`}
                      >
                        ×
                      </button>
                    ) : (
                      <div 
                        className="delete-plan-btn" // Aynı sınıfı kullanarak boyutlandırmayı miras al
                        style={{ visibility: 'hidden', cursor: 'default' }} // Görünmez yap ve işaretçi olmasın
                        aria-hidden="true"
                      >
                        × {/* Boyut içeriğe bağlıysa içerik gerekli olabilir */}
                      </div>
                    )}
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
                // disabled={!isTimeValid(timePickerConfig.hours, timePickerConfig.minutes)} // Temporarily remove disabled for testing time
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
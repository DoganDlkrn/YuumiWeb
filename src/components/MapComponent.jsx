import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import './MapComponent.css';

// Google Maps container style
const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '8px'
};

// Default center (Turkey)
const defaultCenter = {
  lat: 39.0,
  lng: 35.0
};

// Libraries to load
const libraries = ['places'];

// Use a valid API key - this is a placeholder and should be replaced with your actual API key
// Consider using environment variables for production
const GOOGLE_MAPS_API_KEY = "AIzaSyBzNJUPs-h1VxX4wWlM0SeWgQTZqjx9WOE";

const MapComponent = React.forwardRef(({ onLocationSelect, initialLocation }, ref) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [centerMarkerVisible, setCenterMarkerVisible] = useState(true);
  
  // Load the Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });
  
  // Map reference
  const mapRef = useRef(null);
  
  // Map load callback
  const onLoad = useCallback((map) => {
    mapRef.current = map;
    setMap(map);
    
    // Add marker if initial location is provided
    if (initialLocation) {
      setMarker(initialLocation);
      setCenterMarkerVisible(false);
    }
  }, [initialLocation]);
  
  // Map unmount callback
  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMap(null);
  }, []);
  
  // Handle click on map
  const handleMapClick = useCallback((event) => {
    const clickedLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    
    setMarker(clickedLocation);
    setCenterMarkerVisible(false);
    reverseGeocode(clickedLocation);
  }, []);
  
  // Use Google's Geocoder to convert location to address
  const reverseGeocode = useCallback((location) => {
    if (!window.google) return;
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const address = results[0].formatted_address;
        
        // Call the parent component's handler with location data
        onLocationSelect({
          latitude: location.lat,
          longitude: location.lng,
          address
        });
      }
    });
  }, [onLocationSelect]);
  
  // Find user's current location
  const findUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Set marker and center map
          setMarker(userLocation);
          setCenterMarkerVisible(false);
          if (mapRef.current) {
            mapRef.current.panTo(userLocation);
            mapRef.current.setZoom(15);
          }
          
          // Reverse geocode to get address
          reverseGeocode(userLocation);
        },
        (error) => {
          console.error("Error getting user location:", error);
          alert("Konumunuzu alamadık. Lütfen izinleri kontrol edin veya manuel olarak adres girin.");
        }
      );
    } else {
      alert("Tarayıcınız konum desteği sunmuyor. Lütfen manuel olarak adres girin.");
    }
  }, [reverseGeocode]);
  
  // Search for an address
  const searchAddress = useCallback((address) => {
    if (!window.google || !mapRef.current) return;
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const locationObj = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        // Set marker and center map
        setMarker(locationObj);
        setCenterMarkerVisible(false);
        mapRef.current.panTo(locationObj);
        mapRef.current.setZoom(15);
        
        // Reverse geocode to get full address
        reverseGeocode(locationObj);
      } else {
        alert("Adresi bulamadık. Lütfen başka bir adres deneyin.");
      }
    });
  }, [reverseGeocode]);
  
  // Expose methods to parent component
  React.useImperativeHandle(
    ref,
    () => ({
      findUserLocation,
      searchAddress
    }),
    [findUserLocation, searchAddress]
  );
  
  // Handle marker drag end
  const onMarkerDragEnd = useCallback((event) => {
    const newLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    
    setMarker(newLocation);
    reverseGeocode(newLocation);
  }, [reverseGeocode]);

  // Handle map drag
  const handleMapDrag = useCallback(() => {
    // Show the center marker when user drags the map
    setCenterMarkerVisible(true);
  }, []);

  // Handle map drag end
  const handleMapDragEnd = useCallback(() => {
    if (!mapRef.current) return;
    
    // Get the center of the map after drag
    const center = mapRef.current.getCenter();
    const newLocation = {
      lat: center.lat(),
      lng: center.lng()
    };
    
    // Use the center location
    setMarker(newLocation);
    setCenterMarkerVisible(false);
    reverseGeocode(newLocation);
  }, [reverseGeocode]);
  
  if (loadError) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        color: '#666',
        borderRadius: '8px'
      }}>
        Harita yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
      </div>
    );
  }
  
  return isLoaded ? (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialLocation || defaultCenter}
        zoom={initialLocation ? 15 : 6}
        onClick={handleMapClick}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onDrag={handleMapDrag}
        onDragEnd={handleMapDragEnd}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        }}
      >
        {marker && !centerMarkerVisible && (
          <Marker
            position={marker}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
          />
        )}
      </GoogleMap>
      
      {/* Center marker that stays fixed in the middle of the map */}
      {centerMarkerVisible && (
        <div className="map-center-marker">
          <div className="center-marker-inner"></div>
          <div className="center-marker-circle"></div>
        </div>
      )}
      
      {/* Instructions label */}
      {centerMarkerVisible && (
        <div className="map-instructions">
          Haritada konumunuzu doğrulamak için haritayı sürükleyin
        </div>
      )}
    </div>
  ) : (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f0f0',
      color: '#666',
      borderRadius: '8px'
    }}>
      Harita yükleniyor...
    </div>
  );
});

export default MapComponent; 
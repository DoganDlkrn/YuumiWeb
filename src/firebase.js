// Firebase yapılandırma
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

// Firebase yapılandırma bilgileri - tam versiyon
const firebaseConfig = {
  apiKey: "AIzaSyBzNJUPs-h1VxX4wWlM0SeWgQTZqjx9WOE",
  authDomain: "yuumi-4606b.firebaseapp.com",
  projectId: "yuumi-4606b",
  storageBucket: "yuumi-4606b.firebasestorage.app",
  messagingSenderId: "156043387950",
  appId: "1:156043387950:web:c988988b17b57f3edc2bbf"
};

// Firebase başlat
const app = initializeApp(firebaseConfig);

// Auth servisini özel yapılandırma ile oluştur
const auth = getAuth();

// Auth dili ayarları
auth.useDeviceLanguage();

// Persistence ayarını yap
setPersistence(auth, browserLocalPersistence);

// Test telefon numaraları için ayarlar (geliştirme ortamında)
// NOT: Gerçek ortamda bu ayarı kaldırın!
if (process.env.NODE_ENV === 'development') {
  auth.settings.appVerificationDisabledForTesting = true;
}

// Authentication servisini dışa aktar
export { auth }; 
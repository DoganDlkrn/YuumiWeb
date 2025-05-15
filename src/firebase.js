// Firebase yapılandırma
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"; // Import Firestore

// Firebase yapılandırma bilgileri - tam versiyon
const firebaseConfig = {
  apiKey: "AIzaSyBzNJUPs-h1VxX4wWlM0SeWgQTZqjx9WOE",
  authDomain: "yuumi-4606b.firebaseapp.com",
  projectId: "yuumi-4606b",
  storageBucket: "yuumi-4606b.appspot.com",
  messagingSenderId: "156043387950",
  appId: "1:156043387950:web:c988988b17b57f3edc2bbf"
};

// Firebase başlat
const app = initializeApp(firebaseConfig);

// Auth servisini özel yapılandırma ile oluştur
const auth = getAuth();

// Firestore veritabanını başlat
const db = getFirestore(app);

// Konsola Firestore bağlantısının kurulduğunu bildir
console.log("Firebase ve Firestore bağlantısı kuruldu:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// Auth dili ayarları
auth.useDeviceLanguage();

// Persistence ayarını yap
setPersistence(auth, browserLocalPersistence);

// Test telefon numaraları için ayarlar (geliştirme ortamında)
// NOT: Gerçek ortamda bu ayarı kaldırın!
if (process.env.NODE_ENV === 'development') {
  auth.settings.appVerificationDisabledForTesting = true;
}

// Authentication ve Firestore servislerini dışa aktar
export { auth, db }; 
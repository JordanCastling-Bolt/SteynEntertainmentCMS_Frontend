import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from '@firebase/analytics'; // Import required function for analytics

const firebaseConfig = {
    apiKey: "AIzaSyC5EC-6Aizvcfe-Wudb0imYUrkOHaSOGms",
    authDomain: "steynentertainment-800ea.firebaseapp.com",
    projectId: "steynentertainment-800ea",
    storageBucket: "steynentertainment-800ea.appspot.com",
    messagingSenderId: "272896532211",
    appId: "1:272896532211:android:304fcef5e3de0c6b7aa186"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(firebaseApp);

// Initialize Storage
const storage = getStorage(firebaseApp); 

// Initialize Firebase Analytics
const analytics = getAnalytics(firebaseApp);

export { db, storage, analytics }; // Export db, storage, and analytics for usage in other parts of your app

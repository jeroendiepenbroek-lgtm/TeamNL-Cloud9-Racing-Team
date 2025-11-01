// Copy the Firebase config from your Firebase Console -> Web app
// Rename to firebaseConfig.ts or fill values here

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration for zwiftracingcloud9 project
// Web app config - publieke credentials (veilig voor frontend gebruik)
export const firebaseConfig = {
  apiKey: "AIzaSyBpzDDCsGlQ8Wl8Z-L3JW_gX87d9fCe6u8",
  authDomain: "zwiftracingcloud9.firebaseapp.com",
  projectId: "zwiftracingcloud9",
  storageBucket: "zwiftracingcloud9.appspot.com",
  messagingSenderId: "102024699123793624328",
  appId: "1:102024699123793624328:web:8a3c5e7f2b4d9c1a6e8f3b"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

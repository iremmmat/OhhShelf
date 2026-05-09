import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// REPLACE THESE VALUES WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAtoagZtGoGIy-4f_Xj-jjz1DZV437dSmc",
  authDomain: "ohhshelf.firebaseapp.com",
  projectId: "ohhshelf",
  storageBucket: "ohhshelf.firebasestorage.app",
  messagingSenderId: "828512946940",
  appId: "1:828512946940:web:7db484c4c1edb36d0da579"
};

// Initialize Firebase and the Database
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
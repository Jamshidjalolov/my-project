import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAVYJJAlUpORfloUJ3pG_G8JGEXI8sbwPQ",
  authDomain: "food-b9283.firebaseapp.com",
  projectId: "food-b9283",
  storageBucket: "food-b9283.firebasestorage.app",
  messagingSenderId: "521931889898",
  appId: "1:521931889898:web:ea0c256dc3b0381dd88b93",
  measurementId: "G-BJWFJLEBB6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
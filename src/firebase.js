import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Dine egne verdier fra Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCSXDa85SOJDQmMOZDyxzL2brJdzOsbG4E",
  authDomain: "infoskjerm-82c04.firebaseapp.com",
  projectId: "infoskjerm-82c04",
  storageBucket: "infoskjerm-82c04.appspot.com",
  messagingSenderId: "379507493266",
  appId: "1:379507493266:web:83efac349ce2dd1a6d94b",
  measurementId: "G-X6ZTJ2KFWF"
};

// 🔹 Initialiser Firebase
const app = initializeApp(firebaseConfig);

// 🔹 Eksporter Auth og Firestore slik at nettsiden kan bruke dem
export const auth = getAuth(app);
export const db = getFirestore(app);

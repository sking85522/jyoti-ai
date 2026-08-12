import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDzp_kecrp9vEzKtqTMj1S7RjsQDovLY0M",
  authDomain: "hritikai.firebaseapp.com",
  databaseURL: "https://hritikai-default-rtdb.firebaseio.com",
  projectId: "hritikai",
  storageBucket: "hritikai.firebasestorage.app",
  messagingSenderId: "363304760036",
  appId: "1:363304760036:web:eb54f8e16413483d5af2f1",
  measurementId: "G-4HJ9HKM4R6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

// Use initializeFirestore with auto-detect long polling to prevent connection failures in sandboxed/iframe environments
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

// Prevent "Database is closing/hidden" IndexedDB errors in sandboxed iframe contexts
setPersistence(auth, browserLocalPersistence).catch(() => {
  setPersistence(auth, inMemoryPersistence).catch(() => {});
});




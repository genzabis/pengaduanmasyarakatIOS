import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBUTLjFry3VyvLOw85Th7h59Txz6GohhKo",
  projectId: "fir-chat-8ca91",
  databaseURL: "https://fir-chat-8ca91-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "fir-chat-8ca91.firebasestorage.app",
  messagingSenderId: "647784359192",
  appId: "1:647784359192:android:bd1f11d322f7da900a2a6d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

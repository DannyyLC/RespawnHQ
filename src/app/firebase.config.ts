import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDD3ov2SBnE5KKgJ2pNJlzox0q_jgh7yW8",
  authDomain: "respawnhq.firebaseapp.com",
  projectId: "respawnhq",
  storageBucket: "respawnhq.firebasestorage.app",
  messagingSenderId: "232540360519",
  appId: "1:232540360519:web:1d14202c9d9a9998fb0662"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
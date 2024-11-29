import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyBORVExVW0fZE_-ujhhrZjNAMRaD5ccl5w",
    authDomain: "gerenciador-tarefas-3e2c0.firebaseapp.com",
    projectId: "gerenciador-tarefas-3e2c0",
    storageBucket: "gerenciador-tarefas-3e2c0.firebasestorage.app",
    messagingSenderId: "732936685062",
    appId: "1:732936685062:web:c5996377b85a8ed01aa587"
  };


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);


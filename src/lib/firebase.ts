import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    const missing = [];
    if (!firebaseConfig.apiKey) missing.push('PUBLIC_FIREBASE_API_KEY');
    if (!firebaseConfig.projectId) missing.push('PUBLIC_FIREBASE_PROJECT_ID');
    if (!firebaseConfig.authDomain) missing.push('PUBLIC_FIREBASE_AUTH_DOMAIN');
    
    throw new Error(
        `Firebase configuration is missing. Missing variables: ${missing.join(', ')}. ` +
        `Please check your .env file. In Astro, client-side variables must use PUBLIC_ prefix.`
    );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;

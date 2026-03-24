import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, getDocs, serverTimestamp, query, where, collection, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import type { User as UserType } from './types';

/**
 * Registra un nuevo usuario
 */
export async function registerUser(
  email: string, 
  password: string, 
  displayName: string
): Promise<User> {
  try {
    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Actualizar perfil con displayName
    await updateProfile(user, { displayName });

    // Crear documento de usuario en Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName,
      email,
      groups: [],
      canCreateGroups: false,
      groupCreationSlots: 0,
      createdAt: serverTimestamp()
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Error al registrar usuario');
  }
}

/**
 * Inicia sesión con email y contraseña
 */
export async function loginUser(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Error al iniciar sesión');
  }
}

/**
 * Envía un correo para restablecer la contraseña.
 * Firebase envía el email con un enlace; el usuario restablece la contraseña desde ahí.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message || 'Error al enviar el correo de recuperación');
  }
}

/**
 * Cierra sesión
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Error al cerrar sesión');
  }
}

/**
 * Obtiene el usuario actual autenticado
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Observa cambios en el estado de autenticación
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Obtiene los datos del usuario desde Firestore
 */
export async function getUserData(uid: string): Promise<UserType | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserType;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener datos del usuario');
  }
}

/**
 * Obtiene múltiples usuarios en batch usando Promise.all para paralelizar lecturas
 * Más eficiente que hacer lecturas secuenciales
 */
export async function batchGetUsers(uids: string[]): Promise<Map<string, UserType>> {
  const usersMap = new Map<string, UserType>();
  
  // Firestore permite máximo 10 documentos por batch
  const batchSize = 10;
  
  for (let i = 0; i < uids.length; i += batchSize) {
    const batch = uids.slice(i, i + batchSize);
    
    // Usar Promise.all para paralelizar las lecturas (más eficiente que secuencial)
    const userPromises = batch.map(async (uid) => {
      try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          return { uid, data: userDoc.data() as UserType };
        }
        return { uid, data: null };
      } catch {
        return { uid, data: null };
      }
    });
    
    const results = await Promise.all(userPromises);
    results.forEach(({ uid, data }) => {
      if (data) {
        usersMap.set(uid, data);
      }
    });
  }
  
  return usersMap;
}

/**
 * Actualiza el perfil del usuario
 */
export async function updateUserProfile(uid: string, data: Partial<UserType>): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });
  } catch (error: any) {
    throw new Error(error.message || 'Error al actualizar perfil');
  }
}

const AVATAR_PATH = 'users';
const AVATAR_FILE = 'avatar';

/**
 * Sube o reemplaza el avatar del usuario en Storage y actualiza la URL en Firestore.
 * Ruta en Storage: users/{uid}/avatar (extensión según el archivo).
 * Solo el usuario autenticado puede subir su propio avatar.
 */
export async function uploadUserAvatar(uid: string, file: File): Promise<string> {
  if (auth.currentUser?.uid !== uid) {
    throw new Error('Solo puedes subir tu propio avatar');
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (!allowed.includes(ext)) {
    throw new Error('Formato no permitido. Usa: ' + allowed.join(', '));
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('La imagen no puede superar 2 MB');
  }

  const path = `${AVATAR_PATH}/${uid}/${AVATAR_FILE}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);
  await updateUserProfile(uid, { avatarUrl: downloadUrl });
  return downloadUrl;
}

/**
 * Elimina el avatar del usuario en Storage y quita avatarUrl del documento en Firestore.
 * No falla si no había avatar.
 */
export async function deleteUserAvatar(uid: string): Promise<void> {
  if (auth.currentUser?.uid !== uid) {
    throw new Error('Solo puedes eliminar tu propio avatar');
  }
  const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  for (const e of ext) {
    const path = `${AVATAR_PATH}/${uid}/${AVATAR_FILE}.${e}`;
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (_) {
      // Ignorar si no existe
    }
  }
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { avatarUrl: deleteField() });
}

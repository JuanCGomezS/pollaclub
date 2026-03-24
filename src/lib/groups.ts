import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { getCurrentUser } from './auth';
import { db } from './firebase';
import type { Group } from './types';

/**
 * Obtiene todos los grupos de una competición
 */
export async function getGroupsByCompetition(competitionId: string): Promise<Group[]> {
  try {
    const groupsQuery = query(
      collection(db, 'groups'),
      where('competitionId', '==', competitionId)
    );
    const snapshot = await getDocs(groupsQuery);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener grupos de la competición');
  }
}

/**
 * Obtiene un grupo por ID
 */
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (groupDoc.exists()) {
      return { id: groupDoc.id, ...groupDoc.data() } as Group;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener grupo');
  }
}

/**
 * Obtiene todos los grupos de un usuario
 */
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    // Buscar grupos donde el usuario es participante o admin
    const groupsQuery = query(
      collection(db, 'groups'),
      where('participants', 'array-contains', userId)
    );
    
    const groupsSnapshot = await getDocs(groupsQuery);
    const groups: Group[] = [];
    
    groupsSnapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() } as Group);
    });
    
    // También buscar grupos donde es admin
    const adminQuery = query(
      collection(db, 'groups'),
      where('adminUid', '==', userId)
    );
    
    const adminSnapshot = await getDocs(adminQuery);
    adminSnapshot.forEach((doc) => {
      const group = { id: doc.id, ...doc.data() } as Group;
      // Evitar duplicados
      if (!groups.find(g => g.id === group.id)) {
        groups.push(group);
      }
    });
    
    return groups;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener grupos del usuario');
  }
}

/**
 * Crea un nuevo grupo
 */
export async function createGroup(
  competitionId: string,
  name: string,
  adminUid: string,
  settings: Group['settings']
): Promise<{ groupId: string; code: string }> {
  try {
    const userRef = doc(db, 'users', adminUid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('No se encontró configuración del usuario para crear grupo');
    }

    const userData = userDoc.data();
    const canCreateGroups = userData.canCreateGroups === true;
    const purchasedMaxParticipants = Number(userData.purchasedMaxParticipants || 0);
    const slots = Number(userData.groupCreationSlots || 0);

    if (!canCreateGroups) {
      throw new Error('No tienes permiso para crear grupos');
    }

    if (purchasedMaxParticipants < 1) {
      throw new Error('Tu plan no tiene cupo de participantes configurado');
    }

    if (slots < 1) {
      throw new Error('No tienes cupos disponibles para crear grupos');
    }

    // Generar código único
    const code = generateGroupCode();
    
    // Crear documento del grupo
    const groupRef = doc(collection(db, 'groups'));
    const groupId = groupRef.id;
    
    const now = Timestamp.now();
    
    await setDoc(groupRef, {
      id: groupId,
      competitionId,
      name,
      code,
      adminUid,
      participants: [adminUid],
      planCode: userData.purchasedPlanCode || 'manual',
      planName: userData.purchasedPlanName || 'Plan Manual',
      maxParticipants: purchasedMaxParticipants,
      isActive: true,
      settings,
      createdAt: now,
      updatedAt: now
    });
    
    // Actualizar el usuario para agregar el grupo
    await updateDoc(userRef, {
      groups: arrayUnion(groupId),
      groupCreationSlots: Math.max(slots - 1, 0),
      canCreateGroups: slots - 1 > 0
    });
    
    return { groupId, code };
  } catch (error: any) {
    console.error('[createGroup] Error general:', error);
    throw new Error(error.message || 'Error al crear grupo');
  }
}

/**
 * Unirse a un grupo usando código
 */
export async function joinGroupByCode(code: string, userId: string): Promise<Group> {
  try {
    // Buscar grupo por código
    const groupsQuery = query(
      collection(db, 'groups'),
      where('code', '==', code)
    );
    
    const groupsSnapshot = await getDocs(groupsQuery);
    
    if (groupsSnapshot.empty) {
      throw new Error('Código de grupo no válido');
    }
    
    const groupDoc = groupsSnapshot.docs[0];
    const groupData = groupDoc.data();
    const groupId = groupDoc.id;
    
    // Verificar que el usuario no esté ya en el grupo
    if (groupData.participants.includes(userId)) {
      throw new Error('Ya eres participante de este grupo');
    }

    // Validar cupo máximo según plan del grupo (incluye admin dentro de participants)
    if (
      typeof groupData.maxParticipants === 'number' &&
      groupData.maxParticipants > 0 &&
      groupData.participants.length >= groupData.maxParticipants
    ) {
      throw new Error(
        `Este grupo alcanzó su límite de ${groupData.maxParticipants} participantes para el plan actual`
      );
    }
    
    // Agregar usuario al grupo
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      participants: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });
    
    // Actualizar o crear documento del usuario
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Si el documento no existe, crearlo con datos básicos
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }
      
      await setDoc(userRef, {
        uid: userId,
        displayName: currentUser.displayName || `Usuario ${userId.substring(0, 8)}`,
        email: currentUser.email || '',
        groups: [groupId],
        canCreateGroups: false,
        groupCreationSlots: 0,
        createdAt: serverTimestamp()
      });
    } else {
      // Si existe, actualizarlo
      await updateDoc(userRef, {
        groups: arrayUnion(groupId)
      });
    }
    
    return { 
      id: groupDoc.id, 
      ...groupData, 
      participants: [...groupData.participants, userId] 
    } as Group;
  } catch (error: any) {
    throw new Error(error.message || 'Error al unirse al grupo');
  }
}

/**
 * Genera un código único para el grupo
 */
function generateGroupCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PD-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Verifica si un usuario es admin del grupo
 */
export function isGroupAdmin(group: Group, userId: string): boolean {
  return group.adminUid === userId;
}

/**
 * Verifica si un usuario es participante del grupo
 */
export function isGroupParticipant(group: Group, userId: string): boolean {
  return group.participants.includes(userId) || group.adminUid === userId;
}

/**
 * Verifica si un usuario tiene permiso para crear grupos
 */
export async function canUserCreateGroups(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    const slots = Number(userData.groupCreationSlots || 0);
    return userData.canCreateGroups === true && slots > 0;
  } catch (error: any) {
    console.error('Error al verificar permiso de creación:', error);
    return false;
  }
}

/**
 * Obtiene la configuración comercial activa del usuario para crear grupos.
 */
export async function getUserGroupPlan(userId: string): Promise<{
  planName: string;
  maxParticipants: number;
  slots: number;
} | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const planName = String(userData.purchasedPlanName || 'Sin plan');
    const maxParticipants = Number(userData.purchasedMaxParticipants || 0);
    const slots = Number(userData.groupCreationSlots || 0);

    return { planName, maxParticipants, slots };
  } catch (error) {
    console.error('Error al obtener plan del usuario:', error);
    return null;
  }
}

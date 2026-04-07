rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isGroupParticipant(groupId) {
      let group = get(/databases/$(database)/documents/groups/$(groupId));
      return request.auth.uid in group.data.participants || 
             request.auth.uid == group.data.adminUid;
    }
    
    function isGroupAdmin(groupId) {
      let group = get(/databases/$(database)/documents/groups/$(groupId));
      return request.auth.uid == group.data.adminUid;
    }
    
    function isMatchScheduled(competitionId, matchId) {
      let matchDoc = get(/databases/$(database)/documents/competitions/$(competitionId)/matches/$(matchId));
      return matchDoc.data.status == 'scheduled';
    }

    // Plan free: freeMatchIds.hasAny. Otros: sin tope o matchNumber <= maxMatchNumber. (Sin if: no soportado.)
    function isWithinGroupMatchLimit(groupId, matchId) {
      let groupDoc = get(/databases/$(database)/documents/groups/$(groupId));
      return (groupDoc.data.planCode == 'free_3_matches' &&
              groupDoc.data.freeMatchIds != null &&
              groupDoc.data.freeMatchIds.hasAny([matchId])) ||
             (groupDoc.data.planCode != 'free_3_matches' &&
              (groupDoc.data.maxMatchNumber == null ||
               get(/databases/$(database)/documents/competitions/$(groupDoc.data.competitionId)/matches/$(matchId)).data.matchNumber
                 <= groupDoc.data.maxMatchNumber));
    }
    
    function isBonusLocked(competitionId) {
      // Verificar si los pronósticos bonus están bloqueados para esta competición
      let competition = get(/databases/$(database)/documents/competitions/$(competitionId));
      let results = get(/databases/$(database)/documents/competitions/$(competitionId)/results/main);
      return (exists(results) && results.data.isLocked) || 
             (exists(competition) && 
              competition.data.bonusSettings != null &&
              competition.data.bonusSettings.bonusLockDate != null && 
              competition.data.bonusSettings.bonusLockDate < request.time);
    }
    
    // Verifica si el usuario tiene permiso para crear grupos
    function canUserCreateGroups() {
      let userDocPath = /databases/$(database)/documents/users/$(request.auth.uid);
      // Verificar que el documento existe
      return exists(userDocPath) && 
             get(userDocPath).data.canCreateGroups == true;
    }
    
    // ============================================
    // COMPETITIONS (lectura pública, escritura solo super admin)
    // ============================================
    match /competitions/{competitionId} {
      allow read: if true;  // Cualquiera puede leer competiciones
      allow write: if false;  // Solo super admin manual
      
      // Resultados de la competición
      match /results/{resultId} {
        allow read: if true;  // Lectura pública
        allow write: if false;  // Solo super admin manual
      }
    }
    
    // ============================================
    // MATCHES (lectura pública, escritura solo super admin)
    // ============================================
    match /competitions/{competitionId}/matches/{matchId} {
      allow read: if true;  // Cualquiera puede leer partidos
      allow write: if false;  // Solo desde Cloud Functions o super admin manual
    }

    // ============================================
    // TEAMS (lectura pública, escritura solo super admin)
    // ============================================
    match /competitions/{competitionId}/teams/{teamId} {
      allow read: if true;  // Cualquiera puede leer equipos
      allow write: if false;  // Solo super admin / scripts
    }

    // ============================================
    // PLAYERS (lectura pública, escritura solo super admin)
    // ============================================
    match /competitions/{competitionId}/players/{playerId} {
      allow read: if true;
      allow write: if false;
    }
    
    // ============================================
    // GROUPS
    // ============================================
    match /groups/{groupId} {
      // Leer: 
      allow read: if isAuthenticated();
      
      // CREAR: Solo usuarios con permiso canCreateGroups = true
      // Además, el adminUid debe ser el usuario autenticado
      allow create: if isAuthenticated() && 
                       canUserCreateGroups() &&
                       request.resource.data.adminUid == request.auth.uid;
      
      // Actualizar: 
      // - Admin del grupo puede actualizar (excepto settings)
      // - Cualquier usuario autenticado puede agregarse a sí mismo usando arrayUnion
      allow update: if isAuthenticated() && (
                      (isGroupAdmin(groupId) &&
                       (!exists(resource) || 
                        (resource.data.keys().hasAll(['settings']) && 
                         request.resource.data.keys().hasAll(['settings']) &&
                         resource.data.settings.pointsExactScore == request.resource.data.settings.pointsExactScore &&
                         resource.data.settings.pointsWinner == request.resource.data.settings.pointsWinner))) ||
                      // Usuario puede agregarse a sí mismo: verificación simplificada
                      (request.auth.uid != resource.data.adminUid &&
                       !(request.auth.uid in resource.data.participants) &&
                       request.auth.uid in request.resource.data.participants &&
                       // Solo se modifican participants y updatedAt (no settings ni otros campos críticos)
                       !request.resource.data.diff(resource.data).affectedKeys().hasAny(['settings', 'adminUid', 'competitionId', 'name', 'code', 'isActive', 'createdAt', 'id']))
                    );
      
      // ============================================
      // PREDICTIONS (pronósticos de partidos)
      // ============================================
      match /predictions/{predictionId} {
        // Leer:
        // - El dueño siempre puede leer
        // - Cualquier participante del grupo puede leer pronósticos de otros participantes
        //   si el partido ya inició (para tablas de posiciones)
        // - Los participantes pueden leer todos los pronósticos del grupo para calcular
        //   la tabla general (necesario para GroupLeaderboard)
        // Leer:
        // - El dueño siempre puede leer sus propios pronósticos (incluso de partidos scheduled)
        // - Cualquier participante del grupo puede leer pronósticos de otros participantes
        //   si el partido ya inició (para tablas de posiciones por partido)
        // - IMPORTANTE: Para la tabla general (GroupLeaderboard), los participantes necesitan
        //   poder leer todos los pronósticos del grupo. Esto es seguro porque:
        //   * Solo los participantes del grupo pueden leer
        //   * Los pronósticos de partidos scheduled solo pueden ser modificados por su dueño
        //   * Es necesario para calcular la tabla general de posiciones
        // - Permite que los participantes del grupo lean todos los pronósticos del grupo
        //   para poder calcular la tabla general de posiciones
        allow read: if isAuthenticated() && isGroupParticipant(groupId);
        
        // Crear/Actualizar:
        // - Solo el dueño
        // - Solo si el partido está scheduled
        allow create, update: if isAuthenticated() && 
                                 isGroupParticipant(groupId) &&
                                 request.resource.data.userId == request.auth.uid &&
                                 isMatchScheduled(get(/databases/$(database)/documents/groups/$(groupId)).data.competitionId, request.resource.data.matchId) &&
                                 isWithinGroupMatchLimit(groupId, request.resource.data.matchId);
        
        // No permitir eliminar (por integridad)
        allow delete: if false;
      }
      
      // ============================================
      // BONUS PREDICTIONS (pronósticos bonus)
      // ============================================
      match /bonusPredictions/{bonusId} {
        // Leer: todos los participantes del grupo
        allow read: if isAuthenticated() && isGroupParticipant(groupId);
        
        // Crear/Actualizar:
        // - Solo el dueño
        // - Solo si aún no se bloqueó (según configuración de la competición)
        allow create, update: if isAuthenticated() && 
                                 isGroupParticipant(groupId) &&
                                 request.resource.data.userId == request.auth.uid &&
                                 !isBonusLocked(get(/databases/$(database)/documents/groups/$(groupId)).data.competitionId);
        
        allow delete: if false;
      }
    }
    
    // ============================================
    // USERS
    // ============================================
    match /users/{userId} {
      // Leer: cualquier usuario autenticado (para ver nombres)
      allow read: if isAuthenticated();
      
      // Crear: solo el mismo usuario al registrarse
      // IMPORTANTE: canCreateGroups debe ser false por defecto
      allow create: if isAuthenticated() && 
                       request.auth.uid == userId &&
                       request.resource.data.canCreateGroups == false;
      
      // Actualizar: solo el mismo usuario
      // IMPORTANTE: canCreateGroups no puede pasarse de false a true (solo admin/script).
      // Pero SÍ se permite pasar de true a false (cuando createGroup consume el último slot).
      allow update: if isAuthenticated() && 
                       request.auth.uid == userId &&
                       (request.resource.data.diff(resource.data).affectedKeys().hasAny(['canCreateGroups']) == false ||
                        (resource.data.canCreateGroups == true && request.resource.data.canCreateGroups == false));
    }
    
  }
}

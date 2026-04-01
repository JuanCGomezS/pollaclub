import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getArgValue(flag: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function printUsageAndExit(): never {
  console.log(`
Usage:
  npm run activate:user-plan -- --email <email> --plan-code <code> --plan-name <name> --max-participants <n> [--slots <n>] [--max-match-number <n>] [--clear-max-match-number] [--disable-create]
  npm run activate:user-plan -- --email <email> --free-trial [--slots <n>] [--skip-group-sync]

Required:
  --email               User email in Firebase Auth / users collection
  --plan-code           Internal code (example: plan_1_15)
  --plan-name           Display name (example: Plan 1-15)
  --max-participants    Max participants allowed in created group

Optional:
  --slots               Number of groups user can create with this activation (default: 1)
  --max-match-number    Max matchNumber enabled for predictions (example: 3 for free trial)
  --clear-max-match-number
                        Removes purchasedMaxMatchNumber (useful when upgrading from free trial to paid)
  --free-trial          Shortcut for plan gratuito: free_3_matches, maxParticipants=5, maxMatchNumber=3
  --disable-create      If present, keeps canCreateGroups=false even if slots > 0
  --skip-group-sync     If present, only updates users/{uid} (does not update any group document)
  --group-id <id>       If present, only updates groups/<id> (must exist and adminUid must match). Mutually exclusive with --skip-group-sync.

Example:
  npm run activate:user-plan -- --email user@mail.com --plan-code plan_1_15 --plan-name "Plan 1-15" --max-participants 15 --slots 1
  npm run activate:user-plan -- --email user@mail.com --plan-code plan_1_5 --plan-name "Plan 1-5" --max-participants 5 --slots 1 --clear-max-match-number
  npm run activate:user-plan -- --email user@mail.com --free-trial --slots 1 --group-id abc123

  Creación
- npx tsx scripts/activate-user-plan.ts --email eslost04@gmail.com --free-trial --slots 1
- npx tsx scripts/activate-user-plan.ts --email eslost04@gmail.com --plan-code plan_1_15 --plan-name "Plan 1-15" --max-participants 15 --slots 1 --clear-max-match-number
Actualización
- npx tsx scripts/activate-user-plan.ts --email eslost04@gmail.com --free-trial --slots 0 --group-id eXlet9tP9I4UVXYvEZtl
- npx tsx scripts/activate-user-plan.ts --email eslost04@gmail.com --plan-code plan_1_15 --plan-name "Plan 1-15" --max-participants 15 --slots 0 --group-id xyz789 --clear-max-match-number
`);
  process.exit(1);
}

const email = getArgValue('--email');
const freeTrial = process.argv.includes('--free-trial');
const explicitPlanCode = getArgValue('--plan-code');
const explicitPlanName = getArgValue('--plan-name');
const explicitMaxParticipantsRaw = getArgValue('--max-participants');
const explicitMaxMatchNumberRaw = getArgValue('--max-match-number');
const clearMaxMatchNumber = process.argv.includes('--clear-max-match-number');
const slotsRaw = getArgValue('--slots');
const disableCreate = process.argv.includes('--disable-create');
const skipGroupSync = process.argv.includes('--skip-group-sync');
const groupId = getArgValue('--group-id')?.trim();

if (!email) {
  printUsageAndExit();
}

const userEmail = email;

if (skipGroupSync && groupId) {
  console.error(
    'Error: use either --skip-group-sync or --group-id, not both (--skip-group-sync skips all groups; --group-id targets one group)'
  );
  process.exit(1);
}

const planCode = freeTrial ? 'free_3_matches' : explicitPlanCode;
const planName = freeTrial ? 'Prueba gratis 3 partidos' : explicitPlanName;
const maxParticipantsRaw = freeTrial ? '5' : explicitMaxParticipantsRaw;
const maxMatchNumberRaw = freeTrial ? '3' : explicitMaxMatchNumberRaw;

if (!planCode || !planName || !maxParticipantsRaw) {
  printUsageAndExit();
}

const maxParticipants = Number(maxParticipantsRaw);
const maxMatchNumber = Number(maxMatchNumberRaw || '0');
const slots = Number(slotsRaw ?? '1');

if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
  console.error('Error: --max-participants must be a number >= 1');
  process.exit(1);
}

if (!Number.isFinite(slots) || slots < 0) {
  console.error('Error: --slots must be a number >= 0');
  process.exit(1);
}

if (!Number.isFinite(maxMatchNumber) || maxMatchNumber < 0) {
  console.error('Error: --max-match-number must be a number >= 0');
  process.exit(1);
}

if (clearMaxMatchNumber && maxMatchNumber > 0) {
  console.error('Error: use either --max-match-number or --clear-max-match-number, not both');
  process.exit(1);
}

const projectId =
  process.env.PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error(
    'Error: PUBLIC_FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID is missing in .env'
  );
  process.exit(1);
}

function initAdmin() {
  if (admin.apps.length > 0) return;

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let serviceAccount: any = null;

  if (serviceAccountPath) {
    try {
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      console.log('Using service account from GOOGLE_APPLICATION_CREDENTIALS');
    } catch {
      console.warn('Could not read service account from GOOGLE_APPLICATION_CREDENTIALS');
    }
  }

  if (!serviceAccount) {
    try {
      const localPath = join(__dirname, 'service-account-key.json');
      serviceAccount = JSON.parse(readFileSync(localPath, 'utf8'));
      console.log('Using service account from scripts/service-account-key.json');
    } catch {
      // ignore and try ADC
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId
    });
    return;
  }

  admin.initializeApp({ projectId });
  console.log('Using Application Default Credentials');
}

async function run() {
  initAdmin();

  const db = admin.firestore();
  const auth = admin.auth();

  try {
    const authUser = await auth.getUserByEmail(userEmail);
    const uid = authUser.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    const canCreateGroups = !disableCreate && slots > 0;
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (!userDoc.exists) {
      const createPayload: Record<string, unknown> = {
        uid,
        displayName: authUser.displayName || `Usuario ${uid.slice(0, 8)}`,
        email: authUser.email || userEmail,
        groups: [],
        canCreateGroups,
        purchasedPlanCode: planCode,
        purchasedPlanName: planName,
        purchasedMaxParticipants: maxParticipants,
        groupCreationSlots: slots,
        createdAt: now
      };

      if (maxMatchNumber > 0) {
        createPayload.purchasedMaxMatchNumber = maxMatchNumber;
      }

      await userRef.set({
        ...createPayload
      });
      console.log(`Created users/${uid} and activated plan`);
    } else {
      const updatePayload: Record<string, unknown> = {
        canCreateGroups,
        purchasedPlanCode: planCode,
        purchasedPlanName: planName,
        purchasedMaxParticipants: maxParticipants,
        groupCreationSlots: slots
      };

      if (maxMatchNumber > 0) {
        updatePayload.purchasedMaxMatchNumber = maxMatchNumber;
      } else if (clearMaxMatchNumber) {
        updatePayload.purchasedMaxMatchNumber = admin.firestore.FieldValue.delete();
      }

      await userRef.update({
        ...updatePayload
      });
      console.log(`Updated users/${uid} with activated plan`);
    }

    const groupUpdatePayload = (): Record<string, unknown> => {
      const groupUpdate: Record<string, unknown> = {
        planCode,
        planName,
        maxParticipants,
        updatedAt: now
      };

      if (maxMatchNumber > 0) {
        groupUpdate.maxMatchNumber = maxMatchNumber;
      } else if (clearMaxMatchNumber) {
        groupUpdate.maxMatchNumber = admin.firestore.FieldValue.delete();
      }

      return groupUpdate;
    };

    let syncedGroups = 0;
    if (!skipGroupSync) {
      if (groupId) {
        const groupRef = db.collection('groups').doc(groupId);
        const groupSnap = await groupRef.get();

        if (!groupSnap.exists) {
          console.error(`Error: groups/${groupId} does not exist`);
          process.exit(1);
        }

        const adminUid = groupSnap.get('adminUid');
        if (adminUid !== uid) {
          console.error(
            `Error: groups/${groupId} adminUid does not match this user (expected ${uid}, got ${String(adminUid)})`
          );
          process.exit(1);
        }

        await groupRef.update(groupUpdatePayload());
        syncedGroups = 1;
      } else {
        const groupsSnapshot = await db
          .collection('groups')
          .where('adminUid', '==', uid)
          .get();

        const updates = groupsSnapshot.docs.map(async (groupDoc) => {
          await groupDoc.ref.update(groupUpdatePayload());
        });

        await Promise.all(updates);
        syncedGroups = groupsSnapshot.size;
      }
    }

    console.log('--- Activation summary ---');
    console.log(`email: ${userEmail}`);
    console.log(`uid: ${uid}`);
    console.log(`planCode: ${planCode}`);
    console.log(`planName: ${planName}`);
    console.log(`maxParticipants: ${maxParticipants}`);
    console.log(`maxMatchNumber: ${maxMatchNumber > 0 ? maxMatchNumber : 'no limit'}`);
    if (clearMaxMatchNumber) {
      console.log('purchasedMaxMatchNumber: cleared');
    }
    console.log(`groupCreationSlots: ${slots}`);
    console.log(`canCreateGroups: ${canCreateGroups}`);
    if (groupId && !skipGroupSync) {
      console.log(`groupId (targeted sync): ${groupId}`);
    }
    console.log(
      `groupsSynced: ${skipGroupSync ? 'skipped' : syncedGroups}${groupId && !skipGroupSync ? ' (single group)' : skipGroupSync ? '' : ' (all where adminUid matches)'}`
    );
    process.exit(0);
  } catch (error: any) {
    console.error('Failed to activate user plan:', error?.message || error);
    process.exit(1);
  }
}

run();

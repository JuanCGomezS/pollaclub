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
  npm run activate:user-plan -- --email <email> --plan-code <code> --plan-name <name> --max-participants <n> [--slots <n>] [--disable-create]

Required:
  --email               User email in Firebase Auth / users collection
  --plan-code           Internal code (example: plan_1_15)
  --plan-name           Display name (example: Plan 1-15)
  --max-participants    Max participants allowed in created group

Optional:
  --slots               Number of groups user can create with this activation (default: 1)
  --disable-create      If present, keeps canCreateGroups=false even if slots > 0

Example:
  npm run activate:user-plan -- --email user@mail.com --plan-code plan_1_15 --plan-name "Plan 1-15" --max-participants 15 --slots 1
`);
  process.exit(1);
}

const email = getArgValue('--email');
const planCode = getArgValue('--plan-code');
const planName = getArgValue('--plan-name');
const maxParticipantsRaw = getArgValue('--max-participants');
const slotsRaw = getArgValue('--slots');
const disableCreate = process.argv.includes('--disable-create');

if (!email || !planCode || !planName || !maxParticipantsRaw) {
  printUsageAndExit();
}

const maxParticipants = Number(maxParticipantsRaw);
const slots = Number(slotsRaw ?? '1');

if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
  console.error('Error: --max-participants must be a number >= 1');
  process.exit(1);
}

if (!Number.isFinite(slots) || slots < 0) {
  console.error('Error: --slots must be a number >= 0');
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
    const authUser = await auth.getUserByEmail(email);
    const uid = authUser.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    const canCreateGroups = !disableCreate && slots > 0;
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (!userDoc.exists) {
      await userRef.set({
        uid,
        displayName: authUser.displayName || `Usuario ${uid.slice(0, 8)}`,
        email: authUser.email || email,
        groups: [],
        canCreateGroups,
        purchasedPlanCode: planCode,
        purchasedPlanName: planName,
        purchasedMaxParticipants: maxParticipants,
        groupCreationSlots: slots,
        createdAt: now
      });
      console.log(`Created users/${uid} and activated plan`);
    } else {
      await userRef.update({
        canCreateGroups,
        purchasedPlanCode: planCode,
        purchasedPlanName: planName,
        purchasedMaxParticipants: maxParticipants,
        groupCreationSlots: slots
      });
      console.log(`Updated users/${uid} with activated plan`);
    }

    console.log('--- Activation summary ---');
    console.log(`email: ${email}`);
    console.log(`uid: ${uid}`);
    console.log(`planCode: ${planCode}`);
    console.log(`planName: ${planName}`);
    console.log(`maxParticipants: ${maxParticipants}`);
    console.log(`groupCreationSlots: ${slots}`);
    console.log(`canCreateGroups: ${canCreateGroups}`);
    process.exit(0);
  } catch (error: any) {
    console.error('Failed to activate user plan:', error?.message || error);
    process.exit(1);
  }
}

run();

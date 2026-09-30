const admin = require('firebase-admin');
const ApiError = require('../utils/ApiError');

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;


function getFirebaseApp() {
  if (admin.apps.length) {
    return admin.apps[0];
  }

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    
    console.warn(
      '[firebaseAdmin] FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are not fully ' +
        'set. Firebase-backed auth routes (/api/v1/auth/firebase/*) will return 401 until they are configured in .env.'
    );
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (err) {
    console.error('[firebaseAdmin] Failed to initialize Firebase Admin SDK:', err.message);
    return null;
  }
}


async function verifyFirebaseToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw ApiError.invalidToken('Firebase ID token is required');
  }

  const app = getFirebaseApp();
  if (!app) {
    throw ApiError.invalidToken(
      'Firebase Admin is not configured on the server. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and ' +
        'FIREBASE_PRIVATE_KEY in the backend .env file.'
    );
  }

  try {
    return await admin.auth(app).verifyIdToken(idToken);
  } catch (err) {
    throw ApiError.invalidToken('Invalid or expired Firebase session. Please log in again');
  }
}

module.exports = { admin, verifyFirebaseToken };

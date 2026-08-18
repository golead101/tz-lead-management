const admin = require('firebase-admin');

// Initialize firebase admin with project ID
try {
  admin.initializeApp({ projectId: 'leads-management-tz' });
} catch (e) {}

const db = admin.firestore();

async function check() {
  const docRef = db.collection('settings').doc('integrations');
  const snap = await docRef.get();
  if (snap.exists) {
    console.log("Integrations data in Firestore:");
    console.log(JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("Integrations document does not exist in Firestore.");
  }
}

check();

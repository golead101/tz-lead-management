const admin = require('firebase-admin');

try {
  admin.initializeApp({
    projectId: 'leads-management-tz'
  });
} catch (e) {}

const db = admin.firestore();

async function check() {
  console.log('Fetching latest campaign...');
  const campsSnap = await db.collection('whatsapp_campaigns').orderBy('createdAt', 'desc').limit(1).get();
  if (campsSnap.empty) {
    console.log('No campaigns found.');
    return;
  }
  const camp = campsSnap.docs[0].data();
  const campId = campsSnap.docs[0].id;
  console.log(`Latest Campaign ID: ${campId}`, camp);

  console.log('Fetching recipients...');
  const recSnap = await db.collection('whatsapp_recipients').doc(campId).get();
  if (recSnap.exists) {
    console.log('Recipients:', recSnap.data());
  } else {
    console.log('No recipients document found for this campaign.');
  }

  console.log('Checking message maps...');
  const mapSnap = await db.collection('whatsapp_message_map').limit(10).get();
  mapSnap.docs.forEach(doc => {
    console.log(`Map: ${doc.id} =>`, doc.data());
  });
}

check().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

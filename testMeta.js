const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin with local emulator or default credentials
if (!admin.apps.length) {
  const serviceAccount = require('./functions/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function testMetaAPI() {
  try {
    console.log('Fetching credentials from Firestore...');
    const integrationDoc = await db.collection('settings').doc('integrations').get();
    
    if (!integrationDoc.exists) {
      console.log('No integration settings found.');
      return;
    }
    
    const whatsapp = integrationDoc.data().whatsapp;
    const accessToken = whatsapp.accessToken || whatsapp.systemToken;
    const phoneNumberId = whatsapp.phoneNumberId;
    const apiVersion = whatsapp.apiVersion || 'v20.0';

    console.log('--- CREDENTIALS FOUND ---');
    console.log('Phone Number ID:', phoneNumberId);
    console.log('Token Prefix:', accessToken.substring(0, 15) + '...');
    console.log('API Version:', apiVersion);

    const url = \https://graph.facebook.com/\/\/messages\;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '918465068120', // From user's screenshot
      type: 'text',
      text: { body: 'Test message from test script' }
    };

    console.log('\n--- SENDING RAW REQUEST TO META ---');
    console.log('URL:', url);
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      }
    });

    console.log('\nSUCCESS! Meta accepted the message:');
    console.log(response.data);

  } catch (error) {
    console.log('\nFAILED! Meta rejected the message:');
    if (error.response) {
      console.log('Status Code:', error.response.status);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testMetaAPI();

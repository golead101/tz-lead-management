const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });
const cryptoHelper = require('./crypto');

// Initialize Firebase Admin
try {
  admin.initializeApp();
} catch (e) {
  console.log('Firebase Admin already initialized.');
}

const db = admin.firestore();

/**
 * Helper to fetch credentials from Firestore, decrypting encrypted fields.
 */
async function getDecryptedCredentials() {
  const integrationDoc = await db.collection('settings').doc('integrations').get();
  if (!integrationDoc.exists) {
    throw new Error('Google Ads integration is not configured in Firestore settings.');
  }
  const data = integrationDoc.data();
  const google = data.google;
  if (!google) {
    throw new Error('Google Ads settings not found.');
  }

  return {
    customerId: google.customerId || '',
    clientId: google.clientId || '',
    webhookPasskey: google.webhookPasskey || '',
    enabled: google.enabled || false,
    developerToken: cryptoHelper.decrypt(google.developerToken),
    clientSecret: cryptoHelper.decrypt(google.clientSecret),
    refreshToken: cryptoHelper.decrypt(google.refreshToken)
  };
}

/**
 * Helper to get a Google OAuth access token using a refresh token.
 */
async function getAccessToken(clientId, clientSecret, refreshToken) {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    return response.data.access_token;
  } catch (err) {
    const errorDetails = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('Failed to get Google OAuth access token:', errorDetails);
    throw new Error(`Google OAuth authentication failed: ${errorDetails}`);
  }
}

/**
 * 1. googleAdsValidate
 * Verifies connection to Google Ads API using provided or stored credentials.
 */
exports.googleAdsValidate = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let logId = `val-log-${Date.now()}`;
    let logRef = db.collection('googleAdsLogs').doc(logId);

    try {
      let { customerId, developerToken, clientId, clientSecret, refreshToken } = req.body;

      // If secrets are passed as masked placeholders, pull stored credentials from db
      if (!developerToken || developerToken.includes('•••') || !clientSecret || clientSecret.includes('•••') || !refreshToken || refreshToken.includes('•••')) {
        const stored = await getDecryptedCredentials();
        if (!developerToken || developerToken.includes('•••')) developerToken = stored.developerToken;
        if (!clientSecret || clientSecret.includes('•••')) clientSecret = stored.clientSecret;
        if (!refreshToken || refreshToken.includes('•••')) refreshToken = stored.refreshToken;
        if (!customerId) customerId = stored.customerId;
        if (!clientId) clientId = stored.clientId;
      }

      // Decrypt credentials in case they were passed as encrypted values from the frontend
      developerToken = cryptoHelper.decrypt(developerToken);
      clientSecret = cryptoHelper.decrypt(clientSecret);
      refreshToken = cryptoHelper.decrypt(refreshToken);

      if (!customerId || !developerToken || !clientId || !clientSecret || !refreshToken) {
        return res.status(400).json({ error: 'All configuration credentials are required.' });
      }

      const cleanCustomerId = customerId.replace(/-/g, '').trim();

      // 1. Authenticate with Google OAuth
      const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

      // 2. Query Google Ads API (fetch single campaign to test token and access status)
      const query = 'SELECT campaign.id, campaign.name FROM campaign LIMIT 1';
      
      const response = await axios.post(
        `https://googleads.googleapis.com/v24/customers/${cleanCustomerId}/googleAds:search`,
        { query },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json'
          }
        }
      );

      // Successfully connected
      await logRef.set({
        timestamp: new Date().toISOString(),
        type: 'validation',
        status: 'success',
        message: 'Successfully validated and connected to Google Ads API.'
      });

      return res.status(200).json({ success: true, message: 'Google Ads integration validated successfully!' });

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('Validation Error details:', errorMsg);

      await logRef.set({
        timestamp: new Date().toISOString(),
        type: 'validation',
        status: 'failed',
        errorMessage: errorMsg
      });

      return res.status(400).json({
        success: false,
        error: 'Connection validation failed.',
        details: errorMsg
      });
    }
  });
});

/**
 * 2. googleAdsWebhook
 * Public endpoint to receive Google Ads Lead Form webhook posts.
 */
exports.googleAdsWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const payload = req.body;
  console.log('Received Google Ads lead webhook payload:', JSON.stringify(payload));

  // 1. Verify Passkey
  const webhookKeyHeader = req.headers['google-ads-key'] || req.query.key;
  let credentials;
  try {
    credentials = await getDecryptedCredentials();
  } catch (e) {
    console.error('Failed to load credentials for verification:', e.message);
    return res.status(500).send('CRM Configuration Error');
  }

  const expectedKey = credentials.webhookPasskey;
  if (!expectedKey || (webhookKeyHeader !== expectedKey && payload.google_key !== expectedKey)) {
    console.warn('Unauthorized webhook payload mismatch. Invalid passkey.');
    return res.status(401).send('Unauthorized');
  }

  // 2. Parse lead details
  const leadId = payload.lead_id;
  if (!leadId) {
    console.error('Missing lead_id in webhook payload.');
    return res.status(400).send('Bad Request: Missing lead_id');
  }

  const columns = payload.user_column_data || [];
  const campaignId = payload.campaign_id || 'N/A';
  const adgroupId = payload.adgroup_id || 'N/A';

  // Extract core contact values
  let fullName = 'Google Ads Inquiry';
  let email = '';
  let phone = '';
  let location = 'Google Ad';
  let education = 'Not Provided';
  let course = 'Data Science & Artificial Intelligence'; // Default mapping if not found

  columns.forEach(col => {
    const colId = col.column_id || '';
    const colName = (col.column_name || '').toLowerCase();
    const val = col.string_value || '';

    if (colId === 'FULL_NAME' || colName.includes('name')) {
      fullName = val;
    } else if (colId === 'EMAIL' || colName.includes('email') || colName.includes('mail')) {
      email = val.toLowerCase().trim();
    } else if (colId === 'PHONE_NUMBER' || colName.includes('phone') || colName.includes('number')) {
      phone = val;
    } else if (colId === 'POSTAL_CODE' || colId === 'CITY' || colName.includes('city') || colName.includes('location')) {
      location = val;
    } else if (colId === 'WORK_EMAIL' || colName.includes('course')) {
      course = val;
    }
  });

  let logId = `web-log-${Date.now()}`;
  let logRef = db.collection('googleAdsLogs').doc(logId);

  try {
    // 3. Deduplication Check
    const existingLeads = await db.collection('leads')
      .where('googleLeadId', '==', leadId)
      .limit(1)
      .get();

    if (!existingLeads.empty) {
      console.log(`Lead with googleLeadId ${leadId} already exists. Skipping duplicate import.`);
      await logRef.set({
        timestamp: new Date().toISOString(),
        type: 'webhook',
        status: 'skipped',
        leadId: leadId,
        message: 'Skipped duplicate lead import.'
      });
      return res.status(200).send('Duplicate Skipped');
    }

    // Secondary email deduplication (prevent importing duplicate leads submitted in last 48 hours)
    if (email) {
      const emailLeads = await db.collection('leads')
        .where('email', '==', email)
        .where('source', '==', 'Google Ads')
        .get();

      // Check if any was created in the last 48 hours
      const now = Date.now();
      const duplicateByEmail = emailLeads.docs.some(doc => {
        const lead = doc.data();
        const createdTime = lead.createdDate ? new Date(lead.createdDate).getTime() : 0;
        return (now - createdTime) < 48 * 60 * 60 * 1000;
      });

      if (duplicateByEmail) {
        console.log(`Lead with email ${email} was already imported via Google Ads in last 48 hours. Skipping.`);
        await logRef.set({
          timestamp: new Date().toISOString(),
          type: 'webhook',
          status: 'skipped',
          email: email,
          message: 'Skipped email duplicate lead in last 48 hours.'
        });
        return res.status(200).send('Duplicate Email Skipped');
      }
    }

    // 4. Create Lead Record matching CRM Schema
    const leadRecord = {
      id: `lead-gads-${Date.now()}`,
      googleLeadId: leadId,
      name: fullName,
      email: email,
      phone: phone,
      location: location,
      education: education,
      course: course,
      source: 'Google Ads',
      stage: 'New Lead',
      counselor: 'Maha', // Default assignee
      createdDate: new Date().toISOString(),
      lastContacted: new Date().toISOString(),
      customFields: {
        campaignId: campaignId,
        adgroupId: adgroupId,
        isTestWebhook: payload.is_test || false
      },
      timeline: [{
        id: `log-${Date.now()}`,
        type: 'system',
        title: 'Lead Captured via Google Ads',
        content: `Campaign ID: ${campaignId}, Ad Group ID: ${adgroupId}. Webhook ingestion complete.`,
        timestamp: new Date().toISOString(),
        user: 'Google Ads Server'
      }],
      whatsappMessages: []
    };

    // Write directly to Firestore
    await db.collection('leads').doc(leadRecord.id).set(leadRecord);

    await logRef.set({
      timestamp: new Date().toISOString(),
      type: 'webhook',
      status: 'success',
      leadId: leadId,
      name: fullName,
      message: 'Successfully imported lead from webhook.'
    });

    return res.status(200).send('Success');

  } catch (err) {
    console.error('Webhook Lead Capture Error:', err);
    await logRef.set({
      timestamp: new Date().toISOString(),
      type: 'webhook',
      status: 'failed',
      leadId: leadId,
      errorMessage: err.message
    });
    return res.status(500).send('Internal Server Error');
  }
});

/**
 * 3. googleAdsSync
 * Queries Google Ads API to sync lead form submissions from the last 48 hours.
 * Can be triggered manually from the dashboard or via a scheduler.
 */
exports.googleAdsSync = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let logId = `sync-log-${Date.now()}`;
    let logRef = db.collection('googleAdsLogs').doc(logId);

    try {
      // 1. Get Decrypted Credentials
      const creds = await getDecryptedCredentials();
      if (!creds.enabled) {
        return res.status(400).json({ error: 'Google Ads integration is not active. Please enable it in Settings.' });
      }

      const cleanCustomerId = creds.customerId.replace(/-/g, '').trim();

      // 2. Authenticate
      const accessToken = await getAccessToken(creds.clientId, creds.clientSecret, creds.refreshToken);

      // Calculate date range (past 48 hours for safety overlap)
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 3. Query Google Ads API lead_form_submission_data
      // This resource retrieves details of user lead form submissions.
      const query = `
        SELECT
          lead_form_submission_data.id,
          lead_form_submission_data.campaign,
          lead_form_submission_data.ad_group,
          lead_form_submission_data.lead_form_submission_fields,
          lead_form_submission_data.submission_date_time
        FROM lead_form_submission_data
        WHERE lead_form_submission_data.submission_date_time >= '${fortyEightHoursAgo}'
        LIMIT 100
      `;

      const response = await axios.post(
        `https://googleads.googleapis.com/v24/customers/${cleanCustomerId}/googleAds:search`,
        { query },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': creds.developerToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const rows = response.data.results || [];
      let leadsImported = 0;
      let leadsSkipped = 0;

      for (const row of rows) {
        const leadData = row.lead_form_submission_data;
        const leadId = leadData.id;
        const fields = leadData.lead_form_submission_fields || [];
        const submissionTime = leadData.submission_date_time || new Date().toISOString();
        const campaign = leadData.campaign || 'N/A';
        const adGroup = leadData.ad_group || 'N/A';

        // Check deduplication
        const duplicateCheck = await db.collection('leads')
          .where('googleLeadId', '==', leadId)
          .limit(1)
          .get();

        if (!duplicateCheck.empty) {
          leadsSkipped++;
          continue;
        }

        // Map fields
        let fullName = 'Google Ads Inquiry';
        let email = '';
        let phone = '';

        fields.forEach(f => {
          const colId = f.field_type; // e.g. FULL_NAME, EMAIL, PHONE_NUMBER
          const val = f.string_value || '';
          if (colId === 'FULL_NAME') {
            fullName = val;
          } else if (colId === 'EMAIL') {
            email = val.toLowerCase().trim();
          } else if (colId === 'PHONE_NUMBER') {
            phone = val;
          }
        });

        // Insert lead
        const leadRecord = {
          id: `lead-gads-sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          googleLeadId: leadId,
          name: fullName,
          email: email,
          phone: phone,
          location: 'Google Ad',
          education: 'Not Provided',
          course: 'Data Science & Artificial Intelligence',
          source: 'Google Ads',
          stage: 'New Lead',
          counselor: 'Maha',
          createdDate: submissionTime,
          lastContacted: new Date().toISOString(),
          customFields: {
            campaign: campaign,
            adGroup: adGroup,
            syncedVia: 'reconciliation_api'
          },
          timeline: [{
            id: `log-${Date.now()}`,
            type: 'system',
            title: 'Lead Synced via Google Ads API',
            content: `Reconciled lead. submission date: ${submissionTime}. Campaign: ${campaign}`,
            timestamp: new Date().toISOString(),
            user: 'API Sync Worker'
          }],
          whatsappMessages: []
        };

        await db.collection('leads').doc(leadRecord.id).set(leadRecord);
        leadsImported++;
      }

      await logRef.set({
        timestamp: new Date().toISOString(),
        type: 'api_reconciliation',
        status: 'success',
        leadsImported: leadsImported,
        leadsSkipped: leadsSkipped,
        message: `API reconciliation sync completed. Imported ${leadsImported} new leads, skipped ${leadsSkipped} duplicates.`
      });

      // Update integrations setting to record sync time
      await db.collection('settings').doc('integrations').set({
        google: {
          lastSyncedAt: new Date().toISOString()
        }
      }, { merge: true });

      return res.status(200).json({
        success: true,
        leadsImported,
        leadsSkipped,
        message: 'Google Ads API reconciliation completed successfully.'
      });

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('API Sync Reconciliation failed:', errorMsg);

      await logRef.set({
        timestamp: new Date().toISOString(),
        type: 'api_reconciliation',
        status: 'failed',
        errorMessage: errorMsg
      });

      return res.status(500).json({
        success: false,
        error: 'Sync reconciliation failed.',
        details: errorMsg
      });
    }
  });
});

/**
 * 4. encryptGoogleCredentials
 * Firestore trigger to automatically encrypt sensitive Google Ads credentials in-place.
 */
exports.encryptGoogleCredentials = functions.firestore
  .document('settings/integrations')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null;
    const data = change.after.data();
    const google = data.google;
    if (!google) return null;

    let needsUpdate = false;
    const updatedGoogle = { ...google };

    const sensitiveFields = ['developerToken', 'clientSecret', 'refreshToken'];

    const isEncrypted = (val) => {
      if (!val) return true; // empty is fine
      const parts = val.split(':');
      if (parts.length !== 2) return false;
      const [iv, cipher] = parts;
      return iv.length === 32 && /^[0-9a-fA-F]+$/.test(iv) && /^[0-9a-fA-F]+$/.test(cipher);
    };

    sensitiveFields.forEach(field => {
      const val = google[field];
      if (val && !isEncrypted(val)) {
        updatedGoogle[field] = cryptoHelper.encrypt(val);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      console.log('Encrypting Google Ads credentials in Firestore trigger.');
      return change.after.ref.set({ google: updatedGoogle }, { merge: true });
    }

    return null;
  });

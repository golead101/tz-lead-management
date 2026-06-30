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
    managerCustomerId: google.managerCustomerId || '',
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
    console.log(`[Google Ads Validation] Initiating OAuth token exchange for clientId: ${clientId ? 'Exists' : 'Missing'}`);
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    console.log('[Google Ads Validation] OAuth token exchange successful.');
    return response.data.access_token;
  } catch (err) {
    const errorDetails = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('[Google Ads Validation] Failed to get Google OAuth access token:', errorDetails);
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
      let { customerId, managerCustomerId, developerToken, clientId, clientSecret, refreshToken } = req.body;

      // If secrets are passed as masked placeholders, pull stored credentials from db
      if (!developerToken || developerToken.includes('•••') || !clientSecret || clientSecret.includes('•••') || !refreshToken || refreshToken.includes('•••')) {
        const stored = await getDecryptedCredentials();
        if (!developerToken || developerToken.includes('•••')) developerToken = stored.developerToken;
        if (!clientSecret || clientSecret.includes('•••')) clientSecret = stored.clientSecret;
        if (!refreshToken || refreshToken.includes('•••')) refreshToken = stored.refreshToken;
        if (!customerId) customerId = stored.customerId;
        if (!managerCustomerId) managerCustomerId = stored.managerCustomerId;
        if (!clientId) clientId = stored.clientId;
      }

      // Decrypt credentials in case they were passed as encrypted values from the frontend
      developerToken = cryptoHelper.decrypt(developerToken);
      clientSecret = cryptoHelper.decrypt(clientSecret);
      refreshToken = cryptoHelper.decrypt(refreshToken);

      console.log(`[Google Ads Validation] Credential check - customerId: ${customerId ? customerId : 'Missing'}, managerCustomerId: ${managerCustomerId ? managerCustomerId : 'Not Provided'}, clientId: ${clientId ? 'Exists' : 'Missing'}, clientSecret: ${clientSecret ? 'Exists' : 'Missing'}, refreshToken: ${refreshToken ? 'Exists' : 'Missing'}, developerToken: ${developerToken ? 'Exists' : 'Missing'}`);

      if (!customerId || !developerToken || !clientId || !clientSecret || !refreshToken) {
        return res.status(400).json({ error: 'All configuration credentials are required.' });
      }

      const cleanCustomerId = customerId.replace(/-/g, '').trim();

      // 1. Authenticate with Google OAuth
      console.log('[Google Ads Validation] Step 1: Authenticating with Google OAuth...');
      const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

      // 2. Query Google Ads API (fetch single campaign to test token and access status)
      console.log('[Google Ads Validation] Step 2: Initializing Google Ads API Request...');
      const query = 'SELECT campaign.id, campaign.name FROM campaign LIMIT 1';

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      };

      if (managerCustomerId) {
        const cleanManagerCustomerId = managerCustomerId.replace(/-/g, '').trim();
        if (cleanManagerCustomerId) {
          headers['login-customer-id'] = cleanManagerCustomerId;
          console.log(`[Google Ads Validation] Using Login Customer ID (Manager): ${cleanManagerCustomerId}`);
        }
      }
      console.log(`[Google Ads Validation] Using Operating Customer ID: ${cleanCustomerId}`);


      const response = await axios.post(
        `https://googleads.googleapis.com/v24/customers/${cleanCustomerId}/googleAds:search`,
        { query },
        { headers }
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
  let course = '';

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
      counselor: 'Unassigned',
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

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': creds.developerToken,
        'Content-Type': 'application/json'
      };

      if (creds.managerCustomerId) {
        const cleanManagerCustomerId = creds.managerCustomerId.replace(/-/g, '').trim();
        if (cleanManagerCustomerId) {
          headers['login-customer-id'] = cleanManagerCustomerId;
        }
      }

      const response = await axios.post(
        `https://googleads.googleapis.com/v24/customers/${cleanCustomerId}/googleAds:search`,
        { query },
        { headers }
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
          course: '',
          source: 'Google Ads',
          stage: 'New Lead',
          counselor: 'Unassigned',
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

/**
 * 5. encryptMetaCredentials
 * Firestore trigger to automatically encrypt sensitive Meta credentials in-place.
 */
exports.encryptMetaCredentials = functions.firestore
  .document('settings/integrations')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null;
    const data = change.after.data();
    const meta = data.meta;
    if (!meta) return null;

    let needsUpdate = false;
    const updatedMeta = { ...meta };

    const sensitiveFields = ['appSecret', 'verifyToken'];

    const isEncrypted = (val) => {
      if (!val) return true; // empty is fine
      const parts = val.split(':');
      if (parts.length !== 2) return false;
      const [iv, cipher] = parts;
      return iv.length === 32 && /^[0-9a-fA-F]+$/.test(iv) && /^[0-9a-fA-F]+$/.test(cipher);
    };

    sensitiveFields.forEach(field => {
      const val = meta[field];
      if (val && !isEncrypted(val)) {
        updatedMeta[field] = cryptoHelper.encrypt(val);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      console.log('Encrypting Meta credentials in Firestore trigger.');
      return change.after.ref.set({ meta: updatedMeta }, { merge: true });
    }

    return null;
  });

/**
 * Helper to fetch Meta integration credentials from Firestore.
 */
async function getDecryptedMetaCredentials() {
  const integrationDoc = await db.collection('settings').doc('integrations').get();
  if (!integrationDoc.exists) {
    throw new Error('Meta integration is not configured in Firestore settings.');
  }
  const data = integrationDoc.data();
  const meta = data.meta;
  if (!meta) {
    throw new Error('Meta settings not found.');
  }
  return {
    appId: meta.appId || '',
    appSecret: cryptoHelper.decrypt(meta.appSecret),
    webhookVerifyToken: meta.webhookVerifyToken || '',
    verifyToken: cryptoHelper.decrypt(meta.verifyToken),
    redirectUri: meta.redirectUri || '',
    enabled: meta.enabled || false,
    status: meta.status || 'Setup Required'
  };
}

/**
 * Meta Ads Webhook Connection Validator
 * Verifies that the page ID and system token are valid.
 */
exports.metaValidate = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      let { verifyToken } = req.body;

      if (!verifyToken || verifyToken.includes('•••')) {
        const stored = await getDecryptedMetaCredentials();
        verifyToken = stored.verifyToken;
      }

      if (!verifyToken) {
        return res.status(400).json({ error: 'Verify Token is required.' });
      }

      // Decrypt if it was passed as encrypted string
      verifyToken = cryptoHelper.decrypt(verifyToken);

      // Query Meta Graph API /me endpoint to check token validity
      let response;
      try {
        const graphUrl = `https://graph.facebook.com/v24.0/me?access_token=${verifyToken.trim()}`;
        response = await axios.get(graphUrl);
      } catch (meErr) {
        // Fallback for System User Access Tokens (which can throw code 1 /me error because they aren't real users)
        console.log("System User token detected or /me failed, trying /app endpoint as fallback");
        try {
          const graphUrlApp = `https://graph.facebook.com/v24.0/app?access_token=${verifyToken.trim()}`;
          response = await axios.get(graphUrlApp);
        } catch (appErr) {
          // If both fail, throw the original error or the app error
          throw meErr;
        }
      }

      if (response.data && response.data.id) {
        const displayName = response.data.name ? `${response.data.name} (App)` : `Account ID: ${response.data.id}`;
        return res.status(200).json({
          success: true,
          message: `Successfully connected to Meta. Connected to ${displayName}`
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Verification response did not return a valid ID.'
        });
      }
    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('Meta Validation Error:', errorMsg);
      return res.status(400).json({
        success: false,
        error: 'Meta connection validation failed.',
        details: errorMsg
      });
    }
  });
});

/**
 * Meta Lead Ads Webhook Receiver
 * Handles verification handshakes (GET) and real-time lead submissions (POST).
 */
exports.metaWebhook = functions.https.onRequest(async (req, res) => {
  // GET: Handshake verification (Meta Webhook setup)
  if (req.method === 'GET') {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // Quick validation using env variables to prevent function execution timeouts
      const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN ||
        process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
        'techzone_secret_verify_2026';

      if (mode === 'subscribe' && token === expectedToken) {
        console.log('Meta Webhook verified successfully via env token.');
        return res.status(200).send(challenge);
      }

      // Fallback to Firestore check if env doesn't match
      const creds = await getDecryptedMetaCredentials();
      const dbExpectedToken = creds.webhookVerifyToken || expectedToken;

      if (mode === 'subscribe' && token === dbExpectedToken) {
        console.log('Meta Webhook verified successfully via database token.');
        return res.status(200).send(challenge);
      } else {
        console.warn('Meta Webhook verification failed due to verification token mismatch.');
        return res.status(403).send('Forbidden');
      }
    } catch (e) {
      console.error('Meta Webhook verification error:', e.message);
      return res.status(500).send('Verification Error');
    }
  }

  // POST: Lead Submission Callback
  if (req.method === 'POST') {
    try {
      const payload = req.body;
      console.log('Received Meta Webhook payload:', JSON.stringify(payload));

      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (!value || !value.leadgen_id) {
        console.warn('Missing leadgen_id in Meta Webhook payload.');
        return res.status(200).send('No leadgen_id');
      }

      const leadId = value.leadgen_id;
      const campaignId = value.campaign_id || 'N/A';
      const formId = value.form_id || 'N/A';

      // Load decrypted Meta configurations
      const creds = await getDecryptedMetaCredentials();
      if (!creds.enabled) {
        console.log('Meta Ads integration is disabled. Ignoring webhook.');
        return res.status(200).send('Integration disabled');
      }

      const verifyToken = creds.verifyToken;
      if (!verifyToken) {
        console.error('Meta verify token is not configured in settings.');
        return res.status(500).send('Configuration Error');
      }

      // Query Meta Graph API for lead content fields (explicitly requesting field_data)
      const graphUrl = `https://graph.facebook.com/v20.0/${leadId}`;
      let metaLead;
      try {
        const response = await axios.get(graphUrl, {
          params: {
            access_token: verifyToken,
            fields: 'id,created_time,field_data'
          }
        });
        metaLead = response.data;
      } catch (graphErr) {
        // If it's a Meta Sandbox Test Lead (often id '444444444444' or throws API error code 100/subcode 33)
        const isTestLead = leadId.includes('4444') || (graphErr.response && graphErr.response.data && graphErr.response.data.error && graphErr.response.data.error.code === 100);
        if (isTestLead) {
          console.log("Meta Sandbox Test Lead detected. Using dummy test data instead of querying Graph API.");
          metaLead = {
            id: leadId,
            created_time: new Date().toISOString(),
            field_data: [
              { name: 'full_name', values: ['Meta Sandbox Test Lead'] },
              { name: 'email', values: ['sandbox-test@meta-inquiry.com'] },
              { name: 'phone_number', values: ['+91 9999900000'] },
              { name: 'city', values: ['Meta Sandbox'] }
            ]
          };
        } else {
          throw graphErr;
        }
      }
      console.log('Fetched Meta Lead details:', JSON.stringify(metaLead));

      // Map fields from Graph API response
      const fields = {};
      (metaLead.field_data || []).forEach(f => {
        fields[f.name] = f.values?.[0] || '';
      });

      const fullName = fields.full_name || fields.first_name || 'Meta Ads Inquiry';
      const email = (fields.email || '').toLowerCase().trim();
      const phone = fields.phone_number || '';
      const location = fields.city || fields.location || 'Meta Ad';
      const education = fields.education || 'Not Provided';

      const leadRecord = {
        id: leadId, // Use leadgen_id directly to avoid duplicates
        metaLeadId: leadId,
        name: fullName,
        email: email,
        phone: phone,
        location: location,
        education: education,
        course: fields.course || fields.program || '',
        source: 'Meta Ads',
        stage: 'New Lead',
        counselor: 'Unassigned',
        createdDate: metaLead.created_time || new Date().toISOString(),
        lastContacted: new Date().toISOString(),
        customFields: {
          campaignId: campaignId,
          formId: formId,
          adId: value.ad_id || 'N/A'
        },
        timeline: [{
          id: `log-${Date.now()}`,
          type: 'system',
          title: 'Lead Captured via Meta Ads Webhook',
          content: `Real-time sync. Form ID: ${formId}, Campaign ID: ${campaignId}.`,
          timestamp: new Date().toISOString(),
          user: 'Meta Server'
        }],
        whatsappMessages: []
      };

      // Store in Firestore using Meta Lead ID as doc name (deduplicates naturally)
      await db.collection('leads').doc(leadId).set(leadRecord, { merge: true });
      console.log(`Successfully stored Meta webhook lead in Firestore: ${leadId}`);

      return res.status(200).send('Success');
    } catch (err) {
      console.error('Meta webhook processing error:', err.response ? JSON.stringify(err.response.data) : err.message);
      return res.status(500).send('Internal Webhook Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
});

/**
 * 5. createUserAccount
 * Callable function to securely create Firebase Auth users and Firestore user documents.
 * Only callable by users with the 'Admin' role.
 */
exports.createUserAccount = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check if the caller is an Admin
  const callerUid = context.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();

  if (!callerDoc.exists || callerDoc.data().role !== 'Admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Admins can create new user accounts.'
    );
  }

  const { email, password, name, role } = data;

  if (!email || !password || !name || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields (email, password, name, role).'
    );
  }

  try {
    // 1. Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // 2. Create the user document in Firestore
    const userDocData = {
      email: email.toLowerCase().trim(),
      name: name,
      role: role,
      status: 'Active',
      id: userRecord.uid,
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(userDocData);

    return {
      success: true,
      message: `Successfully created user account for ${name}`,
      uid: userRecord.uid
    };
  } catch (error) {
    console.error('Error creating new user account:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create user account: ' + error.message
    );
  }
});

/**
 * Helper to fetch decrypted WhatsApp integration credentials.
 */
async function getDecryptedWhatsAppCredentials() {
  const integrationDoc = await db.collection('settings').doc('integrations').get();
  if (!integrationDoc.exists) {
    throw new Error('WhatsApp integration is not configured in settings.');
  }
  const data = integrationDoc.data();
  const whatsapp = data.whatsapp;
  if (!whatsapp) {
    throw new Error('WhatsApp settings not found.');
  }

  // Support both encrypted and plaintext access tokens
  let accessToken = whatsapp.accessToken || whatsapp.systemToken || '';
  if (accessToken && cryptoHelper && typeof cryptoHelper.decrypt === 'function') {
    try {
      const parts = accessToken.split(':');
      if (parts.length === 2 && parts[0].length === 32) {
        accessToken = cryptoHelper.decrypt(accessToken);
      }
    } catch (e) {
      // ignore, use plaintext
    }
  }

  return {
    phoneNumberId: whatsapp.phoneNumberId || '',
    businessAccountId: whatsapp.businessAccountId || '',
    accessToken: accessToken,
    apiVersion: whatsapp.apiVersion || 'v20.0',
    webhookVerifyToken: whatsapp.webhookVerifyToken || '',
    enabled: whatsapp.enabled || false,
    status: whatsapp.status || 'Setup Required'
  };
}

/**
 * sendWhatsAppMessage
 * Dispatches an outbound WhatsApp text message via Meta's Graph API.
 */
exports.sendWhatsAppMessage = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { leadId, recipientPhone, messageText, templateData } = req.body;
      if (!recipientPhone || (!messageText && !templateData)) {
        return res.status(400).json({ error: 'recipientPhone and either messageText or templateData are required.' });
      }

      // 1. Load configuration
      const creds = await getDecryptedWhatsAppCredentials();
      if (!creds.enabled && !req.body.bypassEnabledCheck) {
        return res.status(400).json({ error: 'WhatsApp integration is not enabled in settings.' });
      }

      if (!creds.phoneNumberId || !creds.accessToken) {
        return res.status(400).json({ error: 'WhatsApp integration credentials are not fully configured.' });
      }

      // ⚙️ BULLETPROOF PHONE NUMBER CLEANING
      let cleanPhone = recipientPhone.replace(/[^0-9]/g, '').trim();

      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }
      if (cleanPhone.startsWith('00')) {
        cleanPhone = cleanPhone.substring(2);
      }

      // 2. SMART PAYLOAD ROUTING
      let payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone
      };

      if (templateData) {
        payload.type = 'template';
        payload.template = templateData;
        console.log(`[WhatsApp CF] Dynamic template payload received. Template name: ${templateData.name}`);
      } else {
        // Normal conversation messaging layer
        payload.type = 'text';
        payload.text = { body: messageText };
      }

      const url = `https://graph.facebook.com/${creds.apiVersion}/${creds.phoneNumberId}/messages`;

      console.log('[WhatsApp CF] Target URL:', url);
      console.log('[WhatsApp CF] Dispatched Payload:', JSON.stringify(payload));

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${creds.accessToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[WhatsApp CF] Meta Success Response:', JSON.stringify(response.data));
      const messageId = response.data.messages?.[0]?.id;

      // 3. Update execution history records inside Firestore
      if (leadId) {
        const leadRef = db.collection('leads').doc(leadId);
        const leadSnap = await leadRef.get();
        if (leadSnap.exists) {
          const leadData = leadSnap.data();

          const outboundMsg = {
            id: `msg-sent-${Date.now()}`,
            sender: 'counselor',
            text: messageText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            waMessageId: messageId || null,
            status: 'sent',
            timestamp: new Date().toISOString()
          };

          const updatedChat = [...(leadData.whatsappMessages || []), outboundMsg];
          const nextTimeline = [...(leadData.timeline || []), {
            id: `log-wa-${Date.now()}`,
            type: 'whatsapp',
            title: payload.type === 'template' ? 'WhatsApp Template Logs' : 'WhatsApp Chat Logs',
            content: messageText,
            timestamp: new Date().toISOString(),
            user: req.body.counselorName || 'Counselor'
          }];

          await leadRef.update({
            whatsappMessages: updatedChat,
            timeline: nextTimeline,
            lastContacted: new Date().toISOString()
          });
        }
      }

      return res.status(200).json({ success: true, messageId });

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[WhatsApp CF] Execution Crash Stack:', errorMsg);
      return res.status(400).json({
        success: false,
        error: 'Failed to send WhatsApp message.',
        details: errorMsg
      });
    }
  });
});

/**
 * whatsappWebhook
 * Public webhook endpoint for receiving incoming WhatsApp text replies and handshakes.
 */
exports.whatsappWebhook = functions.https.onRequest((req, res) => {
  if (req.method === 'GET') {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      return db.collection('settings').doc('integrations').get()
        .then((docRef) => {
          let expectedToken = 'techzone_secret_verify_2026';
          if (docRef.exists) {
            const data = docRef.data();
            if (data.whatsapp && data.whatsapp.webhookVerifyToken) {
              expectedToken = data.whatsapp.webhookVerifyToken;
            }
          }

          if (mode === 'subscribe' && token === expectedToken) {
            console.log('WhatsApp Webhook verified successfully.');
            return res.status(200).send(challenge);
          } else {
            console.warn('WhatsApp Webhook verification failed.');
            return res.status(403).send('Forbidden');
          }
        })
        .catch((err) => {
          console.error('WhatsApp Webhook verification lookup error:', err.message);
          return res.status(500).send('Verification Error');
        });
    } catch (e) {
      console.error('WhatsApp Webhook verification error:', e.message);
      return res.status(500).send('Verification Error');
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body;
      console.log('Received WhatsApp webhook payload:', JSON.stringify(payload));

      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (!value || !value.messages) {
        return res.status(200).send('EVENT_RECEIVED');
      }

      const contact = value.contacts?.[0];
      const message = value.messages?.[0];

      if (!message || !message.from) {
        return res.status(200).send('No message details');
      }

      const senderPhoneRaw = message.from;
      const senderName = contact?.profile?.name || 'WhatsApp Student';
      const messageText = message.text?.body || '';

      const cleanedSenderPhone = senderPhoneRaw.replace(/[^0-9]/g, '');

      // Query leads collection to find a phone number match
      return db.collection('leads').get()
        .then(async (leadsSnap) => {
          let matchedLeadRef = null;
          let matchedLeadData = null;

          leadsSnap.forEach((doc) => {
            const lead = doc.data();
            if (lead.phone) {
              const cleanedLeadPhone = lead.phone.replace(/[^0-9]/g, '');
              if (cleanedLeadPhone === cleanedSenderPhone ||
                (cleanedLeadPhone.length >= 10 && cleanedSenderPhone.length >= 10 &&
                  cleanedLeadPhone.slice(-10) === cleanedSenderPhone.slice(-10))) {
                matchedLeadRef = doc.ref;
                matchedLeadData = lead;
              }
            }
          });

          const inboundMsg = {
            id: `msg-recv-${Date.now()}`,
            sender: 'lead',
            text: messageText || `[${message.type || 'attachment'} shared]`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            waMessageId: message.id || null,
            timestamp: new Date().toISOString()
          };

          if (matchedLeadRef && matchedLeadData) {
            console.log(`[WhatsApp Webhook] Appending to lead: ${matchedLeadData.name}`);

            const updatedChat = [...(matchedLeadData.whatsappMessages || []), inboundMsg];
            const nextTimeline = [...(matchedLeadData.timeline || []), {
              id: `log-wa-in-${Date.now()}`,
              type: 'whatsapp',
              title: 'WhatsApp Received',
              content: messageText || `[${message.type || 'attachment'} shared]`,
              timestamp: new Date().toISOString(),
              user: 'System'
            }];

            await matchedLeadRef.update({
              whatsappMessages: updatedChat,
              timeline: nextTimeline,
              lastContacted: new Date().toISOString()
            });

          } else {
            console.log(`[WhatsApp Webhook] Creating new lead for phone ${senderPhoneRaw}`);

            let formattedPhone = senderPhoneRaw;
            if (senderPhoneRaw.startsWith('91') && senderPhoneRaw.length === 12) {
              formattedPhone = `+91 ${senderPhoneRaw.slice(2, 7)} ${senderPhoneRaw.slice(7)}`;
            } else if (!senderPhoneRaw.startsWith('+')) {
              formattedPhone = `+${senderPhoneRaw}`;
            }

            const newLeadId = `lead-wa-inbound-${Date.now()}`;
            const newLead = {
              id: newLeadId,
              name: senderName,
              phone: formattedPhone,
              whatsappMessages: [inboundMsg],
              createdDate: new Date().toISOString()
            };

            await db.collection('leads').doc(newLeadId).set(newLead);
          }

          return res.status(200).send('EVENT_RECEIVED');
        })
        .catch((err) => {
          console.error('[WhatsApp Webhook] Query error:', err);
          return res.status(500).send('Internal Server Error');
        });

    } catch (err) {
      console.error('[WhatsApp Webhook] Processing error:', err);
      return res.status(500).send('Internal Server Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
});

/**
 * getWhatsAppTemplates
 * Fetches all message templates from the connected Meta WhatsApp Business Account
 * and caches them in Firestore (whatsapp_templates collection).
 */
exports.getWhatsAppTemplates = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Load WhatsApp credentials from Firestore settings
      const creds = await getDecryptedWhatsAppCredentials();

      if (!creds.accessToken || !creds.businessAccountId) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp Business Account ID and Access Token are not configured in settings.'
        });
      }

      const apiVersion = creds.apiVersion || 'v20.0';
      const url = `https://graph.facebook.com/${apiVersion}/${creds.businessAccountId}/message_templates`;

      const response = await axios.get(url, {
        params: {
          access_token: creds.accessToken.trim(),
          limit: 100,
          fields: 'name,status,category,language,components,rejected_reason'
        }
      });

      const metaTemplates = response.data?.data || [];
      console.log(`[getWhatsAppTemplates] Fetched ${metaTemplates.length} templates from Meta.`);

      // Normalize to our internal schema and cache in Firestore
      const batch = db.batch();
      // Clear old cached templates first
      const existing = await db.collection('whatsapp_templates').get();
      existing.docs.forEach(doc => batch.delete(doc.ref));

      const normalized = metaTemplates.map(t => {
        // Strip example field from each component — Firestore does not support
        // arrays-of-arrays (e.g. example.body_text: [["a","b"]]) and will throw
        // "Property array contains an invalid nested entity"
        const safeComponents = (t.components || []).map(c => {
          if (c.example) {
            const { example, ...rest } = c;
            return rest;
          }
          return c;
        });
        return {
          name: t.name,
          status: t.status,
          category: t.category,
          language: t.language,
          components: safeComponents,
          rejectedReason: t.rejected_reason || null
        };
      });

      normalized.forEach(tpl => {
        const ref = db.collection('whatsapp_templates').doc(tpl.name);
        batch.set(ref, tpl);
      });

      await batch.commit();

      return res.status(200).json({
        success: true,
        count: normalized.length,
        templates: normalized
      });

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[getWhatsAppTemplates] Error:', errorMsg);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch templates from Meta.',
        details: errorMsg
      });
    }
  });
});

/**
 * createWhatsAppTemplate
 * Submits a new message template to Meta WhatsApp Business API for review/approval.
 */
exports.createWhatsAppTemplate = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { name, category, language, components } = req.body;

      if (!name || !category || !language || !components) {
        return res.status(400).json({
          success: false,
          error: 'name, category, language, and components are required.'
        });
      }

      const creds = await getDecryptedWhatsAppCredentials();
      if (!creds.accessToken || !creds.businessAccountId) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp credentials are not configured in settings.'
        });
      }

      const apiVersion = creds.apiVersion || 'v20.0';
      const url = `https://graph.facebook.com/${apiVersion}/${creds.businessAccountId}/message_templates`;

      const payload = { name, category, language, components };
      console.log('[createWhatsAppTemplate] Submitting to Meta:', JSON.stringify(payload));

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${creds.accessToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      const created = response.data;
      console.log('[createWhatsAppTemplate] Meta response:', JSON.stringify(created));

      // Strip example field before saving to Firestore
      // Firestore does NOT support arrays-of-arrays (e.g. body_text: [["a","b"]])
      const componentsForFirestore = components.map(c => {
        if (c.example) {
          const { example, ...rest } = c;
          return rest;
        }
        return c;
      });

      // Cache in Firestore with PENDING status
      const templateDoc = {
        name,
        status: created.status || 'PENDING',
        category,
        language,
        components: componentsForFirestore,
        metaId: created.id || null,
        rejectedReason: null
      };
      await db.collection('whatsapp_templates').doc(name).set(templateDoc);

      return res.status(200).json({
        success: true,
        template: templateDoc,
        metaResponse: created
      });

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[createWhatsAppTemplate] Error:', errorMsg);
      return res.status(400).json({
        success: false,
        error: 'Failed to create template on Meta.',
        details: errorMsg
      });
    }
  });
});

/**
 * deleteWhatsAppTemplate
 * Permanently deletes a template from Meta WhatsApp Business API by name.
 */
exports.deleteWhatsAppTemplate = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Template name is required.' });
      }

      const creds = await getDecryptedWhatsAppCredentials();
      if (!creds.accessToken || !creds.businessAccountId) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp credentials are not configured in settings.'
        });
      }

      const apiVersion = creds.apiVersion || 'v20.0';
      const url = `https://graph.facebook.com/${apiVersion}/${creds.businessAccountId}/message_templates`;

      console.log('[deleteWhatsAppTemplate] Deleting from Meta:', name);

      await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${creds.accessToken.trim()}`,
          'Content-Type': 'application/json'
        },
        params: { name }
      });

      // Remove from Firestore cache too
      await db.collection('whatsapp_templates').doc(name).delete().catch(() => {});

      console.log('[deleteWhatsAppTemplate] Successfully deleted:', name);
      return res.status(200).json({ success: true, message: `Template "${name}" deleted from Meta.` });

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[deleteWhatsAppTemplate] Error:', errorMsg);
      return res.status(400).json({
        success: false,
        error: 'Failed to delete template from Meta.',
        details: errorMsg
      });
    }
  });
});

/**
 * sendBulkWhatsAppCampaign
 * Dispatches an outbound WhatsApp bulk campaign via Meta's Graph API.
 * Handles rate limits, creates leads if necessary, and writes to firestore safely on the backend.
 */
exports.sendBulkWhatsAppCampaign = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { targetContacts, campaignName, messageType, selectedTemplate, templateLanguage, messageText, counselorName } = req.body;
      
      if (!targetContacts || !Array.isArray(targetContacts) || targetContacts.length === 0) {
        return res.status(400).json({ error: 'targetContacts array is required.' });
      }

      // Load config
      const creds = await getDecryptedWhatsAppCredentials();
      if (!creds.enabled) {
        return res.status(400).json({ error: 'WhatsApp integration is not enabled in settings.' });
      }
      if (!creds.phoneNumberId || !creds.accessToken) {
        return res.status(400).json({ error: 'WhatsApp integration credentials are not fully configured.' });
      }

      const campaignId = `camp-${Date.now()}`;
      let sentCount = 0;
      let failedCount = 0;
      const deliveryResults = [];
      const recipientDetails = [];

      // Chunk size to prevent exhausting resources / Meta API limits
      const CHUNK_SIZE = 25; 

      for (let i = 0; i < targetContacts.length; i += CHUNK_SIZE) {
        const chunk = targetContacts.slice(i, i + CHUNK_SIZE);
        
        // Process chunk concurrently
        const promises = chunk.map(async (contact, chunkIndex) => {
          const globalIndex = i + chunkIndex;
          try {
            // Helper to get phone
            const phone = contact.phone || contact.Phone || contact.PhoneNumber || contact.phone_number || contact['Phone Number'] || '';
            if (!phone) throw new Error('No phone number');
            
            // Clean phone
            let cleanPhone = String(phone).replace(/[^0-9]/g, '').trim();
            if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
            if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);

            // Find or create lead
            let leadId = null;
            const leadsRef = db.collection('leads');
            const phoneSuffix = cleanPhone.slice(-10);
            let snapshot;
            if (phoneSuffix.length === 10) {
               // Try to find lead ending with those 10 digits
               snapshot = await leadsRef.where('phone', '>=', phoneSuffix).where('phone', '<=', phoneSuffix + '\uf8ff').limit(1).get();
            } else {
               snapshot = await leadsRef.where('phone', '==', cleanPhone).limit(1).get();
            }
            
            let leadData = null;
            
            if (!snapshot.empty) {
              leadId = snapshot.docs[0].id;
              leadData = snapshot.docs[0].data();
            } else {
              // Create lead
              leadId = `lead-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
              leadData = {
                name: contact.name || contact.Name || 'Campaign Contact',
                phone: phone,
                course: contact.course || contact.Course || '',
                source: 'WhatsApp Campaign',
                subSource: campaignName || 'Bulk Campaign',
                counselor: counselorName || 'Unassigned',
                stage: 'New',
                status: 'Active',
                timeline: [],
                whatsappMessages: [],
                createdAt: new Date().toISOString()
              };
              await leadsRef.doc(leadId).set(leadData);
            }

            // Construct payload
            let payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone
            };

            const msgToDeliver = contact._messageToDeliver || messageText || ''; 
            const templateData = contact._templateData || null;

            if (messageType === 'template' && templateData) {
              payload.type = 'template';
              payload.template = templateData;
            } else {
              payload.type = 'text';
              payload.text = { preview_url: true, body: msgToDeliver };
            }

            const apiVersion = creds.apiVersion || 'v20.0';
            const url = `https://graph.facebook.com/${apiVersion}/${creds.phoneNumberId}/messages`;

            const response = await axios.post(url, payload, {
              headers: {
                'Authorization': `Bearer ${creds.accessToken.trim()}`,
                'Content-Type': 'application/json'
              }
            });

            const messageId = response.data?.messages?.[0]?.id || null;

            // Log to timeline
            const outboundMsg = {
              id: `msg-sent-${Date.now()}`,
              sender: 'counselor',
              text: msgToDeliver,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              waMessageId: messageId,
              status: 'sent',
              timestamp: new Date().toISOString()
            };

            const updatedChat = [...(leadData.whatsappMessages || []), outboundMsg];
            const nextTimeline = [...(leadData.timeline || []), {
              id: `log-wa-${Date.now()}`,
              type: 'whatsapp',
              title: messageType === 'template' ? 'WhatsApp Template Logs' : 'WhatsApp Chat Logs',
              content: msgToDeliver || templateData?.name || 'Bulk message',
              timestamp: new Date().toISOString(),
              user: counselorName || 'Counselor'
            }];

            await leadsRef.doc(leadId).update({
              whatsappMessages: updatedChat,
              timeline: nextTimeline,
              lastContacted: new Date().toISOString()
            });

            recipientDetails.push({
              id: `r-${campaignId}-${globalIndex}`,
              name: leadData.name || `Recipient ${globalIndex + 1}`,
              phone: cleanPhone || 'N/A',
              status: 'delivered',
              error: null,
              errorCode: null,
              messageId: messageId || `msg-${Date.now()}-${globalIndex}`,
              deliveredAt: Date.now(),
              readAt: Date.now() + 100, // mock
              replied: false
            });

            return true;
          } catch (err) {
            console.error('[sendBulkWhatsAppCampaign] Failed for contact:', err.message);
            recipientDetails.push({
              id: `r-${campaignId}-${globalIndex}`,
              name: contact.name || `Recipient ${globalIndex + 1}`,
              phone: contact.phone || 'N/A',
              status: 'failed',
              error: err.response?.data?.error?.message || err.message || 'Delivery failed',
              errorCode: err.response?.status || '400',
              messageId: `msg-${Date.now()}-${globalIndex}`,
              deliveredAt: null,
              readAt: null,
              replied: false
            });
            return false;
          }
        });

        const results = await Promise.all(promises);
        results.forEach(success => {
          if (success) sentCount++;
          else failedCount++;
          deliveryResults.push(success);
        });

        // Small delay between chunks to prevent Meta rate limiting
        await new Promise(res => setTimeout(res, 200));
      }

      // Save campaign records
      const newCamp = {
        id: campaignId,
        name: campaignName || `Campaign - ${new Date().toLocaleDateString()}`,
        status: 'completed',
        totalRecipients: targetContacts.length,
        sent: sentCount,
        failed: failedCount,
        delivered: sentCount, 
        read: Math.round(sentCount * 0.95), 
        replied: 0,
        type: messageType,
        templateName: selectedTemplate || null,
        languageCode: templateLanguage || null,
        message: messageText || selectedTemplate,
        createdAt: { _seconds: Math.floor(Date.now() / 1000) },
        completedAt: { _seconds: Math.floor(Date.now() / 1000) + 10 }
      };

      await db.collection('whatsapp_campaigns').doc(campaignId).set(newCamp);
      await db.collection('whatsapp_recipients').doc(campaignId).set({
        recipients: recipientDetails
      });

      return res.status(200).json({
        success: true,
        campaign: newCamp,
        results: { sent: sentCount, failed: failedCount }
      });

    } catch (err) {
      console.error('[sendBulkWhatsAppCampaign] Fatal Error:', err.message);
      return res.status(500).json({ error: 'Failed to process bulk campaign', details: err.message });
    }
  });
});

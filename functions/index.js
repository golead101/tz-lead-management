const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });
const cryptoHelper = require('./crypto');
const Busboy = require('busboy');

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

    let needsUpdate = false;
    const updatePayload = {};

    const isEncrypted = (val) => {
      if (!val) return true; // empty is fine
      const parts = val.split(':');
      if (parts.length !== 2) return false;
      const [iv, cipher] = parts;
      return iv.length === 32 && /^[0-9a-fA-F]+$/.test(iv) && /^[0-9a-fA-F]+$/.test(cipher);
    };

    // 1. Process Meta credentials if they exist
    const meta = data.meta;
    if (meta) {
      const updatedMeta = { ...meta };
      const sensitiveMetaFields = ['appSecret', 'verifyToken'];
      let metaNeedsUpdate = false;

      sensitiveMetaFields.forEach(field => {
        const val = meta[field];
        if (val && !isEncrypted(val)) {
          updatedMeta[field] = cryptoHelper.encrypt(val);
          metaNeedsUpdate = true;
        }
      });

      if (metaNeedsUpdate) {
        updatePayload.meta = updatedMeta;
        needsUpdate = true;
      }
    }

    // 2. Process Instagram credentials if they exist
    const instagram = data.instagram;
    if (instagram) {
      const updatedInstagram = { ...instagram };
      const sensitiveInstagramFields = ['accessToken'];
      let instagramNeedsUpdate = false;

      sensitiveInstagramFields.forEach(field => {
        const val = instagram[field];
        if (val && !isEncrypted(val)) {
          updatedInstagram[field] = cryptoHelper.encrypt(val);
          instagramNeedsUpdate = true;
        }
      });

      if (instagramNeedsUpdate) {
        updatePayload.instagram = updatedInstagram;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      console.log('Encrypting Meta/Instagram credentials in Firestore trigger.');
      return change.after.ref.set(updatePayload, { merge: true });
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

      const leadDocId = phone || leadId;

      const leadRecord = {
        id: leadDocId, // Use phone as ID to avoid duplicates across campaigns
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

      // Store in Firestore using phone number as doc name (deduplicates naturally)
      await db.collection('leads').doc(leadDocId).set(leadRecord, { merge: true });
      console.log(`Successfully stored Meta webhook lead in Firestore: ${leadDocId}`);

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
    status: whatsapp.status || 'Setup Required',
    appId: data.meta?.appId || ''
  };
}

/**
 * Helper to fetch decrypted Instagram integration credentials.
 */
async function getDecryptedInstagramCredentials() {
  const integrationDoc = await db.collection('settings').doc('integrations').get();
  if (!integrationDoc.exists) {
    throw new Error('Integrations settings document does not exist.');
  }
  const data = integrationDoc.data();
  const instagram = data.instagram;
  if (!instagram) {
    throw new Error('Instagram settings not found in integrations.');
  }

  // Support both encrypted and plaintext access tokens
  const rawToken = instagram.accessToken || '';
  let accessToken = rawToken;
  let wasDecrypted = false;
  let decryptionError = null;

  if (rawToken && cryptoHelper && typeof cryptoHelper.decrypt === 'function') {
    try {
      const parts = rawToken.split(':');
      if (parts.length === 2 && parts[0].length === 32) {
        accessToken = cryptoHelper.decrypt(rawToken);
        wasDecrypted = true;
      }
    } catch (e) {
      decryptionError = e.message;
      // ignore, use raw value (may be plaintext fallback)
    }
  }

  // === SAFE DIAGNOSTIC LOGGING — no full token exposed ===
  const tokenForLog = accessToken;
  console.log('[InstaCreds Diagnostic]', JSON.stringify({
    rawStoredLength: rawToken.length,
    rawStoredIsEncryptedFormat: rawToken.includes(':') && rawToken.split(':')[0].length === 32,
    decryptAttempted: wasDecrypted,
    decryptionError: decryptionError || null,
    resolvedTokenExists: !!tokenForLog,
    resolvedTokenLength: tokenForLog.length,
    resolvedTokenPrefix4: tokenForLog.length >= 4 ? tokenForLog.slice(0, 4) : '(short)',
    resolvedTokenSuffix4: tokenForLog.length >= 4 ? tokenForLog.slice(-4) : '(short)',
    enabled: instagram.enabled || false,
    pageId: instagram.pageId || '',
    instagramAccountId: instagram.instagramAccountId || '',
    apiVersion: instagram.apiVersion || 'v20.0',
    encryptionKeySource: process.env.ENCRYPTION_KEY ? 'env_var' : 'fallback_default',
  }));
  // ======================================================

  return {
    enabled: instagram.enabled || false,
    pageId: instagram.pageId || '',
    instagramAccountId: instagram.instagramAccountId || '',
    accessToken: accessToken,
    apiVersion: instagram.apiVersion || 'v20.0',
    webhookVerifyToken: instagram.webhookVerifyToken || ''
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
 * sendInstagramMessage
 * Dispatches an outbound Instagram text message via Meta's Graph API.
 */
exports.sendInstagramMessage = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { leadId, instagramUserId, messageText, counselorName } = req.body;
      if (!messageText) {
        return res.status(400).json({ error: 'messageText is required.' });
      }
      if (!leadId && !instagramUserId) {
        return res.status(400).json({ error: 'Either leadId or instagramUserId must be provided.' });
      }

      // 1. Load configuration
      const creds = await getDecryptedInstagramCredentials();
      if (!creds.enabled && !req.body.bypassEnabledCheck) {
        return res.status(400).json({ error: 'Instagram integration is not enabled in settings.' });
      }

      if (!creds.pageId || !creds.accessToken) {
        return res.status(400).json({ error: 'Instagram integration credentials (pageId, accessToken) are not fully configured.' });
      }

      // 2. Resolve destination ID and lead reference
      let targetUserId = instagramUserId;
      let leadRef = null;
      let leadData = null;

      if (leadId) {
        leadRef = db.collection('leads').doc(leadId);
        const leadSnap = await leadRef.get();
        if (leadSnap.exists) {
          leadData = leadSnap.data();
          if (leadData.instagramUserId) {
            targetUserId = leadData.instagramUserId;
          }
        }
      }

      if (!targetUserId) {
        return res.status(400).json({ error: 'instagramUserId could not be resolved from lead or request.' });
      }

      // 3. Dispatch outbound HTTP call to Meta Instagram API
      const payload = {
        recipient: { id: targetUserId },
        message: { text: messageText }
      };

      const url = `https://graph.instagram.com/${creds.apiVersion}/${creds.instagramAccountId}/messages`;

      console.log('[Instagram Outbound CF] Target URL:', url);
      console.log('[Instagram Outbound CF] Payload:', JSON.stringify(payload));

      let messageId = null;
      let apiError = null;

      try {
        const response = await axios.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${creds.accessToken.trim()}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('[Instagram Outbound CF] Meta Success Response:', JSON.stringify(response.data));
        messageId = response.data.message_id;
      } catch (err) {
        apiError = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error('[Instagram Outbound CF] Meta API Error Details:', apiError);
      }

      // 4. Update lead history records inside Firestore
      if (leadRef && leadData) {
        const outboundMsg = {
          id: `msg-sent-${Date.now()}`,
          sender: 'counselor',
          text: messageText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          igMessageId: messageId || null,
          status: messageId ? 'sent' : 'failed',
          timestamp: new Date().toISOString()
        };

        const updatedChat = [...(leadData.instagramMessages || []), outboundMsg];

        // Log both successes and failures to timeline
        const nextTimeline = [...(leadData.timeline || []), {
          id: `log-ig-${Date.now()}`,
          type: 'instagram',
          title: messageId ? 'Instagram Message Dispatched' : 'Instagram Message Failed',
          content: messageId ? messageText : `Failed to dispatch: "${messageText}". Error: ${apiError}`,
          timestamp: new Date().toISOString(),
          user: counselorName || 'Counselor'
        }];

        // Proactively fetch profile information on outbound message if name is raw placeholder
        let finalUsername = leadData.instagramUsername || '';
        let finalDisplayName = leadData.name || '';

        if (!finalUsername || !finalDisplayName || finalDisplayName.startsWith('Instagram User')) {
          try {
            const profileUrl = `https://graph.facebook.com/${creds.apiVersion}/${targetUserId}`;
            const profileRes = await axios.get(profileUrl, {
              params: {
                fields: 'name,username',
                access_token: creds.accessToken.trim()
              }
            });
            if (profileRes.data) {
              finalUsername = profileRes.data.username || finalUsername;
              finalDisplayName = profileRes.data.name || finalDisplayName;
              console.log(`[Instagram Outbound CF] Fetched profile info on outbound. username = ${finalUsername}, name = ${finalDisplayName}`);
            }
          } catch (err) {
            console.error('[Instagram Outbound CF] Failed to fetch Instagram profile details on outbound:', err.response ? JSON.stringify(err.response.data) : err.message);
          }
        }

        const updateData = {
          instagramMessages: updatedChat,
          timeline: nextTimeline,
          lastContacted: new Date().toISOString()
        };

        if (finalUsername) {
          updateData.instagramUsername = finalUsername;
        }
        if (finalDisplayName && (!leadData.name || leadData.name.startsWith('Instagram User'))) {
          updateData.name = finalDisplayName;
        }

        await leadRef.update(updateData);
      }

      if (apiError) {
        return res.status(400).json({
          success: false,
          error: 'Failed to send Instagram message.',
          details: apiError
        });
      }

      return res.status(200).json({ success: true, messageId });

    } catch (err) {
      console.error('[Instagram Outbound CF] Critical error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while processing outbound Instagram message.',
        details: err.message
      });
    }
  });
});

/**
 * whatsappWebhook
 * Public webhook endpoint for receiving incoming WhatsApp text replies and handshakes.
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
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
      let messageText = '';
      if (message.text?.body) {
        messageText = message.text.body;
      } else if (typeof message.text === 'string') {
        messageText = message.text;
      } else if (message.type === 'interactive') {
        if (message.interactive?.button_reply) {
          messageText = message.interactive.button_reply.title || message.interactive.button_reply.id || '';
        } else if (message.interactive?.list_reply) {
          messageText = message.interactive.list_reply.title || message.interactive.list_reply.id || '';
        }
      } else if (message.type === 'button') {
        if (typeof message.button === 'string') {
          messageText = message.button;
        } else if (message.button) {
          messageText = message.button.text || message.button.payload || '';
        } else if (message.button_reply) {
          messageText = message.button_reply.title || message.button_reply.id || '';
        }
      }

      // Exhaustive fallback checks for button text across all WhatsApp webhook schemas
      if (!messageText) {
        messageText = message.button?.text ||
                      message.button?.payload ||
                      (typeof message.button === 'string' ? message.button : '') ||
                      message.interactive?.button_reply?.title ||
                      message.interactive?.button_reply?.id ||
                      message.interactive?.list_reply?.title ||
                      message.button_reply?.title ||
                      message.button_reply?.id ||
                      message.text?.body ||
                      message.body ||
                      '';
      }

      const cleanedSenderPhone = senderPhoneRaw.replace(/[^0-9]/g, '');

      let matchedLeadRef = null;
      let matchedLeadData = null;

      const checkDoc = (docSnap) => {
        if (matchedLeadRef) return;
        const lead = docSnap.data() || {};
        const docId = docSnap.id || '';

        const phoneVal = lead.phone || docId || '';
        const cleanedLeadPhone = String(phoneVal).replace(/[^0-9]/g, '');

        if (cleanedLeadPhone && cleanedSenderPhone) {
          if (cleanedLeadPhone === cleanedSenderPhone ||
            (cleanedLeadPhone.length >= 10 && cleanedSenderPhone.length >= 10 &&
              cleanedLeadPhone.slice(-10) === cleanedSenderPhone.slice(-10))) {
            matchedLeadRef = docSnap.ref;
            matchedLeadData = lead;
          }
        }
      };

      // 1. Direct document lookup by ID (highly optimized)
      const directLeadDoc = await db.collection('leads').doc(cleanedSenderPhone).get();
      if (directLeadDoc.exists) {
        checkDoc(directLeadDoc);
      }

      // 2. Query matches by phone field if direct lookup missed (indexed query)
      if (!matchedLeadRef) {
        const last10Digits = cleanedSenderPhone.length >= 10 ? cleanedSenderPhone.slice(-10) : '';
        const phoneVariants = [
          senderPhoneRaw,
          cleanedSenderPhone,
          `+${cleanedSenderPhone}`,
          last10Digits ? `+91 ${last10Digits.slice(0, 5)} ${last10Digits.slice(5)}` : null,
          last10Digits ? `+91${last10Digits}` : null,
          last10Digits
        ].filter(Boolean);

        const leadsSnap = await db.collection('leads').where('phone', 'in', phoneVariants.slice(0, 10)).get();
        leadsSnap.forEach(checkDoc);
      }

      // 3. Fallback to i-frame check if still not found (indexed query)
      if (!matchedLeadRef) {
        const last10Digits = cleanedSenderPhone.length >= 10 ? cleanedSenderPhone.slice(-10) : '';
        const phoneVariants = [
          senderPhoneRaw,
          cleanedSenderPhone,
          `+${cleanedSenderPhone}`,
          last10Digits ? `+91 ${last10Digits.slice(0, 5)} ${last10Digits.slice(5)}` : null,
          last10Digits ? `+91${last10Digits}` : null,
          last10Digits
        ].filter(Boolean);

        const iframeSnap = await db.collection('i-frame').where('phone', 'in', phoneVariants.slice(0, 10)).get();
        iframeSnap.forEach(checkDoc);
      }

      const inboundMsg = {
        id: `msg-recv-${Date.now()}`,
        sender: 'lead',
        text: messageText || `[${message.type || 'attachment'} shared]`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        waMessageId: message.id || null,
        timestamp: new Date().toISOString()
      };

      if (matchedLeadRef && matchedLeadData) {
        console.log(`[WhatsApp Webhook] Appending to lead: ${matchedLeadData.name || matchedLeadData.id}`);

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

        const newLeadId = cleanedSenderPhone || `lead-wa-inbound-${Date.now()}`;
        const newLead = {
          id: newLeadId,
          name: senderName,
          phone: formattedPhone,
          whatsappMessages: [inboundMsg],
          createdDate: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        await db.collection('leads').doc(newLeadId).set(newLead);
      }

      try {
        const chatbotDoc = await db.collection('settings').doc('whatsapp_chatbot').get();
        if (chatbotDoc.exists) {
          const chatbotSettings = chatbotDoc.data();
          const replies = chatbotSettings.customReplies || [];
          
          // Find a match (case-insensitive)
          const lowerMsg = messageText.toLowerCase().trim();
          const matchedReply = replies.find(r => {
            if (!r.trigger) return false;
            const triggers = r.trigger.split(',').map(t => t.trim().toLowerCase());
            return triggers.some(t => lowerMsg.includes(t) || t === lowerMsg);
          });

          if (matchedReply) {
            console.log(`[WhatsApp Webhook] Trigger matched for "${lowerMsg}":`, matchedReply.responseType);
            
            const creds = await getDecryptedWhatsAppCredentials();
            if (creds.accessToken && creds.phoneNumberId) {
              let payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: senderPhoneRaw
              };

              if (matchedReply.responseType === 'Text') {
                payload.type = 'text';
                payload.text = { preview_url: false, body: matchedReply.preview };
              } else if (matchedReply.responseType === 'Template') {
                payload.type = 'template';
                payload.template = { name: matchedReply.preview, language: { code: 'en' } };
              } else if (matchedReply.responseType === 'Document') {
                const docFile = (chatbotSettings.mediaFiles || []).find(f => f.name === matchedReply.preview);
                if (docFile && docFile.url) {
                  payload.type = 'document';
                  payload.document = { link: docFile.url, filename: docFile.name };
                }
              } else if (matchedReply.responseType === 'Buttons') {
                payload.type = 'interactive';
                const buttons = (Array.isArray(matchedReply.buttons) ? matchedReply.buttons : []).map((btn, i) => ({
                  type: 'reply',
                  reply: { id: `btn_${i}`, title: btn.substring(0, 20) }
                }));
                payload.interactive = {
                  type: 'button',
                  body: { text: matchedReply.preview },
                  action: { buttons }
                };
              }

              if (payload.type) {
                const url = `https://graph.facebook.com/${creds.apiVersion}/${creds.phoneNumberId}/messages`;
                await axios.post(url, payload, {
                  headers: { 'Authorization': `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' }
                });
                console.log(`[WhatsApp Webhook] Chatbot auto-reply sent successfully!`);
              }
            }
          }
        }
      } catch (botErr) {
        console.error('[WhatsApp Webhook] Chatbot auto-reply error:', botErr.message);
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      console.error('[WhatsApp Webhook] Processing error:', err);
      return res.status(500).send('Internal Server Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
});

// ==================== INSTAGRAM STATEFUL CHATBOT HELPERS ====================

const DEFAULT_FLOW = {
  startNode: "welcome",
  nodes: [
    {
      id: "welcome",
      type: "Message",
      name: "👋 Welcome",
      data: {
        message: "👋 Hello! Welcome to TechZone Academy.\n\nThank you for reaching out to us.\n\nTo assist you better, could you please share your:\n\n👤 Full Name"
      },
      nextNodeId: "collect_details"
    },
    {
      id: "collect_details",
      type: "CollectInfo",
      name: "👤 Collect Details",
      data: {
        message: "Please share your Full Name and Mobile Number."
      },
      nextNodeId: "course_selection"
    },
    {
      id: "course_selection",
      type: "Choice",
      name: "🎓 Course Selection",
      data: {
        message: "Thank you! 😊\n\nWhich course are you interested in?",
        choices: [
          { label: "Data Science", payload: "course_data_science", nextNodeId: "ds_info" },
          { label: "Data Analytics", payload: "course_data_analytics", nextNodeId: "da_info" },
          { label: "Artificial Intelligence", payload: "course_ai", nextNodeId: "ai_info" },
          { label: "Digital Marketing", payload: "course_digital_marketing", nextNodeId: "dm_info" }
        ]
      }
    },
    // Data Science Flow
    {
      id: "ds_info",
      type: "Choice",
      name: "📚 Data Science Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Data Science program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "ds_syllabus", nextNodeId: "ds_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "ds_syllabus",
      type: "FAQ",
      name: "📌 DS Syllabus",
      data: {
        course: "Data Science",
        message: "Here’s a brief overview of our Data Science program:\n\n✅ Python\n✅ SQL\n✅ Statistics\n✅ Power BI\n✅ Machine Learning\n✅ Deep Learning\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    // Data Analytics Flow
    {
      id: "da_info",
      type: "Choice",
      name: "📚 Data Analytics Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Data Analytics program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "da_syllabus", nextNodeId: "da_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "da_syllabus",
      type: "FAQ",
      name: "📌 DA Syllabus",
      data: {
        course: "Data Analytics",
        message: "Here’s a brief overview of our Data Analytics program:\n\n✅ Excel\n✅ Power BI / Tableau\n✅ SQL\n✅ Python\n✅ Statistics\n✅ Data Warehousing\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    // AI Flow
    {
      id: "ai_info",
      type: "Choice",
      name: "📚 AI Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Artificial Intelligence program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "ai_syllabus", nextNodeId: "ai_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "ai_syllabus",
      type: "FAQ",
      name: "📌 AI Syllabus",
      data: {
        course: "Artificial Intelligence",
        message: "Here’s a brief overview of our Artificial Intelligence program:\n\n✅ Python & Mathematics\n✅ Machine Learning\n✅ Deep Learning\n✅ Natural Language Processing (NLP)\n✅ Computer Vision\n✅ Generative AI (LLMs)\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    // Digital Marketing Flow
    {
      id: "dm_info",
      type: "Choice",
      name: "📚 DM Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Digital Marketing program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "dm_syllabus", nextNodeId: "dm_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "dm_syllabus",
      type: "FAQ",
      name: "📌 DM Syllabus",
      data: {
        course: "Digital Marketing",
        message: "Here’s a brief overview of our Digital Marketing program:\n\n✅ SEO (Search Engine Optimization)\n✅ SEM (Search Engine Marketing)\n✅ Social Media Marketing (SMM)\n✅ Content Marketing\n✅ Email Marketing\n✅ Web Analytics (GA4)\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "faq_fees",
      type: "FAQ",
      name: "📌 Fees Info",
      data: {
        message: "Our counselor will provide you with the latest fee structure and any ongoing offers.\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "faq_duration",
      type: "FAQ",
      name: "📌 Duration Info",
      data: {
        message: "The duration depends on the learning track you choose.\n\nOur counselor can explain the complete roadmap.\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "faq_demo",
      type: "FAQ",
      name: "📌 Demo Info",
      data: {
        message: "Great! 😊\n\nYour request for a FREE Demo Class has been received.\n\nOne of our counselors will contact you shortly.\n\n📞 For immediate assistance, call us on +91 6304872757.",
        setFields: { "demoRequested": true }
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "faq_placement",
      type: "Condition",
      name: "📌 Placement Info Check",
      data: {
        conditionType: "check_crm_placement"
      },
      trueNodeId: "course_info", 
      falseNodeId: "counselor_handoff"
    },
    {
      id: "counselor_handoff",
      type: "CounselorHandoff",
      name: "👨💼 Counselor Handoff",
      data: {
        message: "Thank you for your question. 😊\n\nOne of our counselors will connect with you shortly and provide detailed information.\n\n📞 For immediate assistance, you can also call us on +91 6304872757."
      }
    }
  ]
};

async function sendInstagramDirectMessage(recipientId, text, creds, quickReplies = null) {
  const url = `https://graph.instagram.com/${creds.apiVersion}/${creds.instagramAccountId}/messages`;
  
  const messageObj = { text: text };
  if (quickReplies && Array.isArray(quickReplies) && quickReplies.length > 0) {
    messageObj.quick_replies = quickReplies.map(qr => ({
      content_type: "text",
      title: qr.title || qr.label || "",
      payload: qr.payload || ""
    }));
  }

  const payload = {
    recipient: { id: recipientId },
    message: messageObj
  };
  console.log(`[Instagram Chatbot] Sending DM to ${recipientId}: ${text} with ${quickReplies ? quickReplies.length : 0} quick replies`);
  try {
    const res = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${creds.accessToken.trim()}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('[Instagram Chatbot] Meta API response:', res.data);
    return res.data;
  } catch (err) {
    const errMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('[Instagram Chatbot] Failed to send message via Meta API:', errMsg);
    throw err;
  }
}

async function fetchCRMPlacementInfo(courseName) {
  try {
    const snap = await db.collection('courses').get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const dbName = (data.name || '').toLowerCase();
      const targetName = courseName.toLowerCase();
      if (dbName === targetName || dbName.includes(targetName) || targetName.includes(dbName)) {
        return data.placement || data.placementInfo || data.placementAssistance || null;
      }
    }
  } catch (err) {
    console.error("[Instagram Chatbot] Error fetching course placement info:", err);
  }
  return null;
}

function matchCourseSelection(text) {
  const normalized = text.toLowerCase().trim();
  if (normalized === '1' || normalized.includes('one') || normalized.includes('science') || normalized.includes('data science')) {
    return 'Data Science';
  }
  if (normalized === '2' || normalized.includes('two') || normalized.includes('analytics') || normalized.includes('data analytics')) {
    return 'Data Analytics';
  }
  if (normalized === '3' || normalized.includes('three') || normalized.includes('artificial') || normalized.includes('intelligence') || normalized === 'ai') {
    return 'Artificial Intelligence';
  }
  if (normalized === '4' || normalized.includes('four') || normalized.includes('digital') || normalized.includes('marketing')) {
    return 'Digital Marketing';
  }
  return null;
}

function matchFAQChoice(text) {
  const normalized = text.toLowerCase().trim();
  if (normalized.includes('fee')) return 'Fees';
  if (normalized.includes('duration') || normalized.includes('time') || normalized.includes('month') || normalized.includes('long')) return 'Duration';
  if (normalized.includes('syllabus') || normalized.includes('module') || normalized.includes('topic') || normalized.includes('curriculum') || normalized.includes('learn')) return 'Syllabus';
  if (normalized.includes('demo') || normalized.includes('class')) return 'Demo Class';
  if (normalized.includes('placement') || normalized.includes('job') || normalized.includes('career') || normalized.includes('assistance')) return 'Placement Assistance';
  return null;
}

function getCanonicalPhone(phoneStr) {
  if (!phoneStr) return '';
  // Remove all non-digits (spaces, hyphens, parentheses, plus sign, etc.)
  const cleanDigits = String(phoneStr).replace(/\D/g, '');
  // Take the last 10 digits to resolve +91, 91, 0, etc.
  return cleanDigits.slice(-10);
}

async function deduplicateInstagramLead({ senderId, rawPhone, currentLeadData, currentLeadId, finalUsername, finalDisplayName }) {
  const canonicalSearchPhone = getCanonicalPhone(rawPhone);
  console.log(`[Instagram Lead Dedup] RAW_PHONE: ${rawPhone}`);
  console.log(`[Instagram Lead Dedup] CANONICAL_PHONE: ${canonicalSearchPhone}`);
  console.log(`[Instagram Lead Dedup] LEAD_LOOKUP_START: Searching for canonical phone ${canonicalSearchPhone}`);

  if (!canonicalSearchPhone || canonicalSearchPhone.length < 10) {
    console.log(`[Instagram Lead Dedup] Normalized phone too short: ${canonicalSearchPhone}. Skipping search.`);
    console.log(`[Instagram Lead Dedup] CREATING_NEW_LEAD: true`);
    return null;
  }

  // 1. Fetch all leads to find a match by canonical phone
  const leadsSnap = await db.collection('leads').get();
  console.log(`[Instagram Lead Dedup] LEAD_LOOKUP_RESULTS: Scanned ${leadsSnap.size} leads`);
  let existingLeadDoc = null;
  let existingLeadData = null;

  leadsSnap.forEach((doc) => {
    const data = doc.data();
    if (data.phone) {
      const canonicalLeadPhone = getCanonicalPhone(data.phone);
      // Exclude the current temporary shell lead
      if (canonicalLeadPhone === canonicalSearchPhone && doc.id !== currentLeadId) {
        existingLeadDoc = doc;
        existingLeadData = data;
      }
    }
  });

  const found = !!existingLeadDoc;
  if (found) {
    const existingLeadId = existingLeadDoc.id;
    console.log(`[Instagram Lead Dedup] MATCHED_LEAD_ID: ${existingLeadId}`);
    console.log(`[Instagram Lead Dedup] MATCHED_LEAD_PHONE: ${existingLeadData.phone}`);
    console.log(`[Instagram Lead Dedup] MATCHED_LEAD_SOURCE: ${existingLeadData.source}`);
    console.log(`[Instagram Lead Dedup] REUSING_EXISTING_LEAD: ${existingLeadId}`);

    // 2. Perform merge using a transaction to avoid race conditions
    await db.runTransaction(async (transaction) => {
      // Get fresh data inside the transaction
      const freshExistingSnap = await transaction.get(db.collection('leads').doc(existingLeadId));
      if (!freshExistingSnap.exists) {
        throw new Error('Existing lead not found during transaction');
      }
      const existingData = freshExistingSnap.data();

      // Name handling: Preserve existing name if proper; otherwise use Instagram display name or username
      let finalName = existingData.name || '';
      const isNamePlaceholder = !finalName || 
        finalName.toLowerCase().startsWith('instagram user') ||
        ['test', 'student', 'walk-in', 'guest', 'unnamed', 'placeholder'].includes(finalName.toLowerCase().trim());
      
      if (isNamePlaceholder) {
        if (finalDisplayName && !finalDisplayName.toLowerCase().startsWith('instagram user')) {
          finalName = finalDisplayName;
        } else if (finalUsername && !finalUsername.toLowerCase().startsWith('instagram user')) {
          finalName = finalUsername;
        } else if (currentLeadData && currentLeadData.name && !currentLeadData.name.toLowerCase().startsWith('instagram user')) {
          finalName = currentLeadData.name;
        }
      }

      // Source handling: Do not replace original source. Keep it.
      const originalSource = existingData.source || 'Walk-in';
      const existingChannels = existingData.channels || [originalSource];
      const updatedChannels = Array.from(new Set([...existingChannels, 'Instagram']));

      // Merge Instagram message history
      const existingMsgs = existingData.instagramMessages || [];
      const shellMsgs = currentLeadData ? (currentLeadData.instagramMessages || []) : [];
      const mergedMsgs = [...existingMsgs];
      shellMsgs.forEach(sMsg => {
        const alreadyExists = mergedMsgs.some(eMsg => 
          (sMsg.igMessageId && eMsg.igMessageId === sMsg.igMessageId) ||
          (!sMsg.igMessageId && eMsg.text === sMsg.text && eMsg.time === sMsg.time)
        );
        if (!alreadyExists) {
          mergedMsgs.push(sMsg);
        }
      });

      // Merge timeline logs
      const existingTimeline = existingData.timeline || [];
      const shellTimeline = currentLeadData ? (currentLeadData.timeline || []) : [];
      const mergedTimeline = [...existingTimeline];
      shellTimeline.forEach(sLog => {
        const alreadyExists = mergedTimeline.some(eLog => eLog.id === sLog.id);
        if (!alreadyExists) {
          mergedTimeline.push(sLog);
        }
      });

      // Update fields
      const updateData = {
        name: finalName,
        source: originalSource,
        channels: updatedChannels,
        instagramUserId: senderId,
        instagramUsername: finalUsername || existingData.instagramUsername || '',
        instagramMessages: mergedMsgs,
        timeline: mergedTimeline,
        lastContacted: new Date().toISOString(),
        instagramSenderId: senderId,
        instagramConversationId: senderId,
        lastInstagramMessageAt: new Date().toISOString()
      };

      transaction.update(db.collection('leads').doc(existingLeadId), updateData);

      if (currentLeadId && currentLeadId !== existingLeadId) {
        transaction.delete(db.collection('leads').doc(currentLeadId));
      }
    });

    return {
      id: existingLeadId,
      ref: db.collection('leads').doc(existingLeadId)
    };
  } else {
    console.log(`[Instagram Lead Dedup] CREATING_NEW_LEAD: ${currentLeadId}`);
    return null;
  }
}

// ==================== END INSTAGRAM CHATBOT HELPERS ====================

/**
 * instagramWebhook
 * Public webhook endpoint for receiving incoming Instagram verification handshakes (Phase 2A).
 */
exports.instagramWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method === 'GET') {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const docRef = await db.collection('settings').doc('integrations').get();
      if (!docRef.exists) {
        const errorMsg = 'Integrations settings document does not exist in Firestore';
        console.error(JSON.stringify({
          event: 'instagram_webhook_verification',
          status: 'config_error',
          error: errorMsg
        }));
        return res.status(500).send('Configuration Error');
      }

      const data = docRef.data();
      const instagram = data.instagram;
      if (!instagram || !instagram.webhookVerifyToken) {
        const errorMsg = 'Instagram webhook verify token is not configured in integrations settings';
        console.error(JSON.stringify({
          event: 'instagram_webhook_verification',
          status: 'config_error',
          error: errorMsg
        }));
        return res.status(500).send('Configuration Error');
      }

      const expectedToken = instagram.webhookVerifyToken;

      if (mode === 'subscribe' && token === expectedToken) {
        console.log(JSON.stringify({
          event: 'instagram_webhook_verification',
          status: 'success',
          mode: mode,
          providedToken: token,
          challenge: challenge
        }));
        return res.status(200).send(challenge);
      } else {
        console.warn(JSON.stringify({
          event: 'instagram_webhook_verification',
          status: 'failed',
          mode: mode,
          providedToken: token,
          expectedToken: expectedToken,
          challenge: challenge
        }));
        return res.status(403).send('Forbidden');
      }
    } catch (e) {
      console.error(JSON.stringify({
        event: 'instagram_webhook_verification',
        status: 'error',
        error: e.message
      }));
      return res.status(500).send('Verification Error');
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body;

      console.log('[Instagram Webhook] POST received. Payload:', JSON.stringify(payload));

      // Basic payload validation
      if (!payload || payload.object !== 'instagram' || !payload.entry) {
        console.warn('[Instagram Webhook] Invalid Instagram webhook payload structure:', JSON.stringify(payload));
        return res.status(400).send('Invalid Payload');
      }

      const entry = payload.entry?.[0];
      let messaging = entry?.messaging?.[0];
      let formatDetected = 'messaging';

      // Fallback for Meta Developer Dashboard test payloads (changes/field/value)
      if (!messaging && entry?.changes?.[0]) {
        const change = entry.changes[0];
        if (change.field === 'messages') {
          messaging = change.value;
          formatDetected = 'changes';
        }
      }

      if (!messaging) {
        console.log('[Instagram Webhook] No messaging or changes.messages event found in entry.');
        return res.status(200).send('EVENT_RECEIVED');
      }

      console.log(`[Instagram Webhook] Payload format detected: "${formatDetected}"`);

      const senderId = messaging.sender?.id;
      const message = messaging.message;

      if (!senderId || !message) {
        console.log('[Instagram Webhook] Missing senderId or message details.');
        return res.status(200).send('EVENT_RECEIVED');
      }

      console.log(`[Instagram Webhook] Processing message: senderId = ${senderId}, mid = ${message.mid}`);

      // Ignore echoes (messages sent by our own business account)
      if (message.is_echo) {
        console.log(`[Instagram Webhook] Echo message ignored: mid = ${message.mid}`);
        return res.status(200).send('EVENT_RECEIVED');
      }

      const messageId = message.mid;
      const messageText = message.text || `[${(message.attachments?.[0]?.type) || 'attachment'} shared]`;
      const fallbackUsername = messaging.sender?.username || '';

      // Atomic Idempotency check using Firestore transaction to ignore duplicate webhook deliveries
      if (messageId) {
        const processedMsgRef = db.collection('instagramProcessedMessages').doc(messageId);
        try {
          await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(processedMsgRef);
            if (doc.exists) {
              throw new Error('DUPLICATE_MESSAGE');
            }
            transaction.set(processedMsgRef, { processedAt: new Date().toISOString() });
          });
        } catch (err) {
          if (err.message === 'DUPLICATE_MESSAGE') {
            console.log(`[Instagram Webhook] Duplicate message ignored via transaction: mid = ${messageId}`);
            return res.status(200).send('EVENT_RECEIVED');
          }
          console.error('[Instagram Webhook] Transaction error checking processed messages:', err.message);
        }
      }

      // 1. Fetch real Instagram profile details securely on the backend
      console.log('[Instagram Profile] Looking up profile:', {
        senderId,
        endpoint: `https://graph.facebook.com/<apiVersion>/${senderId}?fields=name,username`
      });

      let apiUsername = '';
      let apiDisplayName = '';
      try {
        const creds = await getDecryptedInstagramCredentials();
        if (creds.enabled && creds.accessToken) {
          const profileUrl = `https://graph.instagram.com/${creds.apiVersion}/${senderId}`;
          const profileRes = await axios.get(profileUrl, {
            params: {
              fields: 'username',
              access_token: creds.accessToken.trim()
            }
          });

          console.log('[Instagram Profile] Response:', {
            status: profileRes.status,
            data: profileRes.data
          });

          if (profileRes.data) {
            apiUsername = profileRes.data.username || '';
            apiDisplayName = profileRes.data.name || '';
          }
        } else {
          console.log('[Instagram Profile] Integration disabled or accessToken missing.');
        }
      } catch (err) {
        const sanitizedErr = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error('[Instagram Profile] Error response:', sanitizedErr);
      }

      const finalUsername = apiUsername || fallbackUsername;
      const finalDisplayName = apiDisplayName || '';

      // 2. Query leads collection using optimized check to avoid collection scans
      const expectedLeadId = `ig-${senderId}`;
      const leadDocRef = db.collection('leads').doc(expectedLeadId);
      const leadSnap = await leadDocRef.get();

      let matchedLeadRef = null;
      let matchedLeadData = null;
      let isDuplicate = false;

      if (leadSnap.exists) {
        matchedLeadRef = leadDocRef;
        matchedLeadData = leadSnap.data();

        const messages = matchedLeadData.instagramMessages || [];
        if (messages.some(m => m.igMessageId === messageId)) {
          isDuplicate = true;
        }
      } else {
        // Also query by instagramUserId index just in case a lead document was created manually or has a different ID
        const querySnap = await db.collection('leads').where('instagramUserId', '==', senderId).limit(1).get();
        if (!querySnap.empty) {
          const matchedDoc = querySnap.docs[0];
          matchedLeadRef = matchedDoc.ref;
          matchedLeadData = matchedDoc.data();

          const messages = matchedLeadData.instagramMessages || [];
          if (messages.some(m => m.igMessageId === messageId)) {
            isDuplicate = true;
          }
        }
      }
      
      let activeLeadId = matchedLeadRef ? matchedLeadRef.id : expectedLeadId;

      if (isDuplicate) {
        console.log(`[Instagram Webhook] Duplicate message ignored: mid = ${messageId}`);
        return res.status(200).send('EVENT_RECEIVED');
      }

      const inboundMsg = {
        id: `msg-recv-${Date.now()}`,
        sender: 'lead',
        text: messageText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        igMessageId: messageId || null,
        timestamp: new Date().toISOString()
      };

      // Define priority: instagramUsername -> Instagram display name -> Existing valid lead name -> Instagram User <ID>
      let nameToStore = '';
      if (finalUsername) {
        nameToStore = finalUsername;
      } else if (finalDisplayName) {
        nameToStore = finalDisplayName;
      } else if (matchedLeadData && matchedLeadData.name && !matchedLeadData.name.startsWith('Instagram User')) {
        nameToStore = matchedLeadData.name;
      } else {
        nameToStore = `Instagram User ${senderId}`;
      }

      console.log('[Instagram Webhook] Resolved lead identity name:', nameToStore);

      if (matchedLeadRef && matchedLeadData) {
        console.log(`[Instagram Webhook] Updating existing lead: ${nameToStore} with resolved identity`);

        const updatedChat = [...(matchedLeadData.instagramMessages || []), inboundMsg];
        const nextTimeline = [...(matchedLeadData.timeline || []), {
          id: `log-ig-in-${Date.now()}`,
          type: 'instagram',
          title: 'Instagram Message Received',
          content: messageText,
          timestamp: new Date().toISOString(),
          user: 'System'
        }];

        const updateData = {
          name: nameToStore,
          instagramUsername: finalUsername || matchedLeadData.instagramUsername || '',
          instagramMessages: updatedChat,
          timeline: nextTimeline,
          lastContacted: new Date().toISOString()
        };

        if (!matchedLeadData.createdDate) {
          updateData.createdDate = new Date().toISOString();
        }

        await matchedLeadRef.update(updateData);
      } else {
        console.log(`[Instagram Webhook] Creating new lead for Instagram User: ${senderId} with name: ${nameToStore}`);

        const newLead = {
          id: expectedLeadId,
          name: nameToStore,
          email: '',
          phone: '',
          location: 'Instagram Direct Message',
          education: 'Not Provided',
          course: '',
          source: 'Instagram',
          subSource: '',
          counselor: 'Unassigned',
          stage: 'New Lead',
          temperature: 'Warm',
          createdDate: new Date().toISOString(),
          lastContacted: new Date().toISOString(),
          customFields: {},
          timeline: [
            {
              id: `log-${Date.now()}`,
              type: 'system',
              title: 'Lead Captured',
              content: 'Inquiry successfully entered system via Instagram Message Webhook.',
              timestamp: new Date().toISOString(),
              user: 'System'
            }
          ],
          whatsappMessages: [],
          instagramUserId: senderId,
          instagramUsername: finalUsername,
          instagramMessages: [inboundMsg]
        };

        await db.collection('leads').doc(expectedLeadId).set(newLead);
      }

      // === INSTAGRAM CHATBOT AUTO-REPLY LOGIC ===
      // Meta sends timestamps in Unix SECONDS (not ms). Convert to ms for Date.now() comparison.
      // Prefer messaging.timestamp (per-message precision) over entry.time (entry-level approximation).
      const rawTs = messaging.timestamp || entry.time;
      const messageTimestamp = rawTs ? Number(rawTs) * 1000 : Date.now();
      const isOldMessage = (Date.now() - messageTimestamp) > 2 * 60 * 1000; // Ignore > 2 mins old

      if (messageText && !isOldMessage) {
        try {
          console.log('[Instagram Chatbot] Checking chatbot settings for message:', messageText);
          const chatbotDoc = await db.collection('settings').doc('instagram_chatbot').get();

          if (chatbotDoc.exists) {
            const chatbotSettings = chatbotDoc.data();
            console.log('[Instagram Chatbot] Loaded settings. Enabled:', chatbotSettings.enabled);

            if (chatbotSettings.enabled) {
              // Fetch latest lead data to ensure state is fresh
              const freshLeadDoc = await db.collection('leads').doc(activeLeadId).get();
              let currentLeadData = freshLeadDoc.exists ? freshLeadDoc.data() : null;

              if (currentLeadData && (currentLeadData.botPaused || currentLeadData.handoffRequired)) {
                console.log('[Instagram Chatbot] Chatbot is paused for this lead (counselor handoff active). Skipping.');
              } else {
                const lowerMsg = messageText.toLowerCase().trim();
                const startTriggers = ["hi", "hello", "hey", "assalamualaikum"];
                const isStartTrigger = startTriggers.includes(lowerMsg);
                const quickReplyPayload = message.quick_reply?.payload || null;

                // Priority Check: Active chatbotState -> Start triggers -> Quick Auto-Reply rules
                const hasActiveState = currentLeadData && currentLeadData.chatbotState && currentLeadData.chatbotState.currentNodeId;

                if (chatbotSettings.flowEnabled && (hasActiveState || isStartTrigger || quickReplyPayload === "ask_something_else")) {
                  const flow = chatbotSettings.flow || DEFAULT_FLOW;
                  const state = (currentLeadData && currentLeadData.chatbotState) ? currentLeadData.chatbotState : { 
                    flowId: "main_lead_capture",
                    currentNodeId: null, 
                    collectedFields: {} 
                  };
                  
                  let nextNodeId = state.currentNodeId;
                  let replyText = "";
                  let updatedFields = {};
                  let updatedCollectedFields = { ...(state.collectedFields || {}) };

                  if (isStartTrigger || !nextNodeId) {
                    nextNodeId = flow.startNode || "welcome";
                    updatedCollectedFields = {};
                    updatedFields.course = ""; // Clear selected course context on restart
                  }

                  // Handle manual loop back via quick reply
                  if (quickReplyPayload === "ask_something_else") {
                    const activeCourseName = updatedFields.course || (currentLeadData && currentLeadData.course) || "Data Science";
                    if (activeCourseName === "Data Science") nextNodeId = "ds_info";
                    else if (activeCourseName === "Data Analytics") nextNodeId = "da_info";
                    else if (activeCourseName === "Artificial Intelligence") nextNodeId = "ai_info";
                    else if (activeCourseName === "Digital Marketing") nextNodeId = "dm_info";
                    else nextNodeId = "course_info";
                  }

                  let isVirtualNode = nextNodeId === "collect_name" || nextNodeId === "collect_phone";
                  let currentNode = flow.nodes.find(n => n.id === nextNodeId);
                  
                  if (!currentNode && !isVirtualNode) {
                    nextNodeId = flow.startNode || "welcome";
                    currentNode = flow.nodes.find(n => n.id === nextNodeId);
                  }

                  if (currentNode || isVirtualNode) {
                    const nodeType = currentNode ? currentNode.type : (nextNodeId === "collect_name" ? "CollectName" : "CollectPhone");
                    const nodeId = currentNode ? currentNode.id : nextNodeId;

                    console.log(`[Instagram Chatbot] Executing node: ${nodeId} (${nodeType}) with payload: ${quickReplyPayload}`);

                    if (currentNode && currentNode.type === "Trigger") {
                      nextNodeId = currentNode.nextNodeId;
                      currentNode = flow.nodes.find(n => n.id === nextNodeId);
                    }

                    if (currentNode && (currentNode.type === "Message" || currentNode.id === "welcome")) {
                      replyText = "👋 Hello! Welcome to TechZone Academy.\n\nThank you for reaching out to us.\n\nTo assist you better, could you please share your:\n\n👤 Full Name";
                      nextNodeId = "collect_name";
                    } 
                    else if (nodeId === "collect_name" || nodeType === "CollectName") {
                      console.log('[Instagram Chatbot] collect_name state message received:', messageText);

                      // Backward compatibility check: check if they sent name + phone in one message
                      let searchText = messageText || '';
                      if (message.attachments && Array.isArray(message.attachments)) {
                        message.attachments.forEach(att => {
                          if (att.title) searchText += ' ' + att.title;
                          if (att.payload) {
                            if (att.payload.phone_number) searchText += ' ' + att.payload.phone_number;
                            if (att.payload.title) searchText += ' ' + att.payload.title;
                            if (att.payload.url) searchText += ' ' + att.payload.url;
                          }
                        });
                      }

                      const phoneRegex = /(?:\+?91|0)?\s*-?\s*[6-9](?:\s*-?\s*\d){9}\b/;
                      const match = searchText.match(phoneRegex);

                      if (match) {
                        console.log('[Instagram Chatbot] Phone number detected in collect_name. Processing combined message.');
                        const rawPhone = match[0];
                        const cleanDigits = rawPhone.replace(/\D/g, '');
                        const tenDigits = cleanDigits.slice(-10);
                        const normalizedPhone = `+91${tenDigits}`;

                        let nameCandidate = messageText.replace(rawPhone, '').replace(/[,;:-]/g, '').trim().replace(/\s+/g, ' ');
                        nameCandidate = nameCandidate.replace(/^(my name is|i am|this is|here is|name is)\s+/i, '').trim();

                        updatedCollectedFields.phone = true;
                        updatedCollectedFields.name = true;

                        const finalName = (nameCandidate.length >= 2 && !/^\d+$/.test(nameCandidate))
                          ? nameCandidate
                          : ((currentLeadData && currentLeadData.name && !currentLeadData.name.startsWith('Instagram User') ? currentLeadData.name : null) || finalDisplayName || finalUsername || `Instagram User ${senderId}`);

                        console.log(`[Instagram Chatbot] Extracted name: ${finalName}`);

                        // Deduplicate lead before proceeding
                        const dedupResult = await deduplicateInstagramLead({
                          senderId,
                          rawPhone,
                          currentLeadData: { ...currentLeadData, name: finalName },
                          currentLeadId: activeLeadId,
                          finalUsername,
                          finalDisplayName
                        });

                        if (dedupResult) {
                          activeLeadId = dedupResult.id;
                          matchedLeadRef = dedupResult.ref;
                          const mergedDoc = await matchedLeadRef.get();
                          currentLeadData = mergedDoc.exists ? mergedDoc.data() : null;
                          updatedFields = {};
                        } else {
                          updatedFields.name = finalName;
                          updatedFields.phone = normalizedPhone;
                          updatedFields.source = "Instagram";
                          updatedFields.stage = "New Lead";
                        }

                        console.log(`[Instagram Chatbot] Lead updated: ${activeLeadId}`);
                        console.log(`[Instagram Lead Dedup] FINAL_ACTIVE_LEAD_ID: ${activeLeadId}`);
                        console.log('[Instagram Chatbot] Advancing to Course Selection');

                        nextNodeId = "course_selection";
                        const nextNode = flow.nodes.find(n => n.id === nextNodeId);
                        if (nextNode) {
                          replyText = nextNode.data.message || "Thank you! 😊\n\nWhich course are you interested in?";
                          nextNodeId = nextNode.id;
                        }
                      } else {
                        // They only sent name (normal flow)
                        let nameCandidate = messageText.replace(/[,;:-]/g, '').trim().replace(/\s+/g, ' ');
                        nameCandidate = nameCandidate.replace(/^(my name is|i am|this is|here is|name is)\s+/i, '').trim();

                        const finalName = (nameCandidate.length >= 2 && !/^\d+$/.test(nameCandidate))
                          ? nameCandidate
                          : ((currentLeadData && currentLeadData.name && !currentLeadData.name.startsWith('Instagram User') ? currentLeadData.name : null) || finalDisplayName || finalUsername || `Instagram User ${senderId}`);

                        console.log(`[Instagram Chatbot] Extracted name: ${finalName}`);

                        updatedCollectedFields.name = true;
                        updatedFields.name = finalName;

                        replyText = "Thank you! 😊\n\n📱 Now, please share your mobile number.";
                        nextNodeId = "collect_phone";
                      }
                    }
                    else if (nodeId === "collect_phone" || nodeType === "CollectPhone") {
                      console.log('[Instagram Chatbot] collect_phone state message received:', messageText);

                      let searchText = messageText || '';
                      if (message.attachments && Array.isArray(message.attachments)) {
                        message.attachments.forEach(att => {
                          if (att.title) searchText += ' ' + att.title;
                          if (att.payload) {
                            if (att.payload.phone_number) searchText += ' ' + att.payload.phone_number;
                            if (att.payload.title) searchText += ' ' + att.payload.title;
                            if (att.payload.url) searchText += ' ' + att.payload.url;
                          }
                        });
                      }

                      const phoneRegex = /(?:\+?91|0)?\s*-?\s*[6-9](?:\s*-?\s*\d){9}\b/;
                      const match = searchText.match(phoneRegex);
                      
                      console.log('[Instagram Chatbot] Phone detected:', !!match);

                      if (match) {
                        const rawPhone = match[0];
                        const cleanDigits = rawPhone.replace(/\D/g, '');
                        const tenDigits = cleanDigits.slice(-10);
                        const normalizedPhone = `+91${tenDigits}`;

                        updatedCollectedFields.phone = true;
                        updatedCollectedFields.name = true;

                        // Deduplicate lead before proceeding
                        const dedupResult = await deduplicateInstagramLead({
                          senderId,
                          rawPhone,
                          currentLeadData,
                          currentLeadId: activeLeadId,
                          finalUsername,
                          finalDisplayName
                        });

                        if (dedupResult) {
                          activeLeadId = dedupResult.id;
                          matchedLeadRef = dedupResult.ref;
                          const mergedDoc = await matchedLeadRef.get();
                          currentLeadData = mergedDoc.exists ? mergedDoc.data() : null;
                          updatedFields = {};
                        } else {
                          updatedFields.phone = normalizedPhone;
                          updatedFields.source = "Instagram";
                          updatedFields.stage = "New Lead";
                        }

                        console.log(`[Instagram Chatbot] Lead updated: ${activeLeadId}`);
                        console.log(`[Instagram Lead Dedup] FINAL_ACTIVE_LEAD_ID: ${activeLeadId}`);
                        console.log('[Instagram Chatbot] Advancing to Course Selection');

                        nextNodeId = "course_selection";
                        const nextNode = flow.nodes.find(n => n.id === nextNodeId);
                        if (nextNode) {
                          replyText = nextNode.data.message || "Thank you! 😊\n\nWhich course are you interested in?";
                          nextNodeId = nextNode.id;
                        }
                      } else {
                        // Re-prompt for phone
                        replyText = "Please enter a valid 10-digit Indian mobile number (e.g., +91XXXXXXXXXX) to proceed.";
                        nextNodeId = "collect_phone";
                      }
                    }
                    else if (currentNode && (currentNode.type === "CollectInfo" || currentNode.id === "collect_details")) {
                      // Fallback support for older visual nodes named collect_details
                      console.log('[Instagram Chatbot] Collect Details message received (collect_details fallback)');
                      
                      let searchText = messageText || '';
                      if (message.attachments && Array.isArray(message.attachments)) {
                        message.attachments.forEach(att => {
                          if (att.title) searchText += ' ' + att.title;
                          if (att.payload) {
                            if (att.payload.phone_number) searchText += ' ' + att.payload.phone_number;
                            if (att.payload.title) searchText += ' ' + att.payload.title;
                            if (att.payload.url) searchText += ' ' + att.payload.url;
                          }
                        });
                      }

                      const phoneRegex = /(?:\+?91|0)?\s*-?\s*[6-9](?:\s*-?\s*\d){9}\b/;
                      const match = searchText.match(phoneRegex);
                      
                      console.log('[Instagram Chatbot] Phone detected:', !!match);

                      if (match) {
                        const rawPhone = match[0];
                        const cleanDigits = rawPhone.replace(/\D/g, '');
                        const tenDigits = cleanDigits.slice(-10);
                        const normalizedPhone = `+91${tenDigits}`;

                        let nameCandidate = messageText.replace(rawPhone, '').replace(/[,;:-]/g, '').trim().replace(/\s+/g, ' ');
                        nameCandidate = nameCandidate.replace(/^(my name is|i am|this is|here is|name is)\s+/i, '').trim();

                        updatedCollectedFields.phone = true;
                        updatedCollectedFields.name = true;

                        const finalName = (nameCandidate.length >= 2 && !/^\d+$/.test(nameCandidate))
                          ? nameCandidate
                          : ((currentLeadData && currentLeadData.name && !currentLeadData.name.startsWith('Instagram User') ? currentLeadData.name : null) || finalDisplayName || finalUsername || `Instagram User ${senderId}`);

                        console.log(`[Instagram Chatbot] Extracted name: ${finalName}`);

                        // Deduplicate lead before proceeding
                        const dedupResult = await deduplicateInstagramLead({
                          senderId,
                          rawPhone,
                          currentLeadData: { ...currentLeadData, name: finalName },
                          currentLeadId: activeLeadId,
                          finalUsername,
                          finalDisplayName
                        });

                        if (dedupResult) {
                          activeLeadId = dedupResult.id;
                          matchedLeadRef = dedupResult.ref;
                          const mergedDoc = await matchedLeadRef.get();
                          currentLeadData = mergedDoc.exists ? mergedDoc.data() : null;
                          updatedFields = {};
                        } else {
                          updatedFields.name = finalName;
                          updatedFields.phone = normalizedPhone;
                          updatedFields.source = "Instagram";
                          updatedFields.stage = "New Lead";
                        }

                        console.log(`[Instagram Chatbot] Lead updated: ${activeLeadId}`);
                        console.log(`[Instagram Lead Dedup] FINAL_ACTIVE_LEAD_ID: ${activeLeadId}`);
                        console.log('[Instagram Chatbot] Advancing to Course Selection');

                        nextNodeId = "course_selection";
                        const nextNode = flow.nodes.find(n => n.id === nextNodeId);
                        if (nextNode) {
                          replyText = nextNode.data.message || "Thank you! 😊\n\nWhich course are you interested in?";
                          nextNodeId = nextNode.id;
                        }
                      } else {
                        const hasName = updatedCollectedFields.name || (currentLeadData && currentLeadData.name && !currentLeadData.name.startsWith('Instagram User'));
                        if (!hasName) {
                          updatedCollectedFields.name = true;
                          replyText = "Thank you! 😊 Please share your 10-digit mobile number to proceed.";
                        } else {
                          replyText = "Please enter a valid 10-digit Indian mobile number (e.g., +91XXXXXXXXXX) to proceed.";
                        }
                        nextNodeId = "collect_details";
                      }
                    } 
                    else if (currentNode && currentNode.type === "Choice" && currentNode.id === "course_selection") {
                      let selection = null;
                      // Match payload first
                      if (quickReplyPayload) {
                        const choices = currentNode.data?.choices || [];
                        const matchedChoice = choices.find(c => c.payload === quickReplyPayload);
                        if (matchedChoice) {
                          selection = matchedChoice.value || matchedChoice.label;
                        }
                      }
                      
                      // Fallback to text matching
                      if (!selection) {
                        selection = matchCourseSelection(messageText);
                      }

                      if (selection) {
                        updatedFields.course = selection;
                        updatedCollectedFields.course = true;

                        // Route to correct visual info node based on selection choices or standard fallback
                        const choices = currentNode.data?.choices || [];
                        const matchedChoice = choices.find(c => c.label.toLowerCase() === selection.toLowerCase() || c.payload === quickReplyPayload);
                        if (matchedChoice && matchedChoice.nextNodeId) {
                          nextNodeId = matchedChoice.nextNodeId;
                        } else {
                          if (selection === "Data Science") nextNodeId = "ds_info";
                          else if (selection === "Data Analytics") nextNodeId = "da_info";
                          else if (selection === "Artificial Intelligence") nextNodeId = "ai_info";
                          else if (selection === "Digital Marketing") nextNodeId = "dm_info";
                          else nextNodeId = "course_info";
                        }

                        const nextNode = flow.nodes.find(n => n.id === nextNodeId);
                        if (nextNode) {
                          replyText = nextNode.data.message || "Excellent choice! What would you like to know?";
                        }
                      } else {
                        replyText = currentNode.data.message || "Please select a course:";
                        nextNodeId = currentNode.id;
                      }
                    } 
                    else if (currentNode && currentNode.type === "Choice" && ["course_info", "ds_info", "da_info", "ai_info", "dm_info"].includes(currentNode.id)) {
                      let matchedPayload = quickReplyPayload;
                      if (!matchedPayload) {
                        // Fallback: translate text input to matching payload
                        const choiceMatch = matchFAQChoice(messageText);
                        if (choiceMatch === 'Fees') matchedPayload = 'faq_fees';
                        else if (choiceMatch === 'Duration') matchedPayload = 'faq_duration';
                        else if (choiceMatch === 'Syllabus') matchedPayload = 'faq_syllabus';
                        else if (choiceMatch === 'Demo Class') matchedPayload = 'faq_demo';
                        else if (choiceMatch === 'Placement Assistance') matchedPayload = 'faq_placement';
                      }

                      if (matchedPayload) {
                        const choices = currentNode.data.choices || [];
                        let choice = choices.find(c => c.payload === matchedPayload);
                        
                        // Fallback text helper mapping if choices array does not map correctly
                        if (!choice) {
                          if (matchedPayload === 'faq_fees') choice = { nextNodeId: 'faq_fees' };
                          else if (matchedPayload === 'faq_duration') choice = { nextNodeId: 'faq_duration' };
                          else if (matchedPayload === 'faq_demo') choice = { nextNodeId: 'faq_demo' };
                          else if (matchedPayload === 'faq_placement') choice = { nextNodeId: 'faq_placement' };
                          else if (matchedPayload === 'faq_syllabus') {
                            const activeCourse = updatedFields.course || (currentLeadData && currentLeadData.course) || "Data Science";
                            if (activeCourse === 'Data Analytics') choice = { nextNodeId: 'da_syllabus' };
                            else if (activeCourse === 'Artificial Intelligence') choice = { nextNodeId: 'ai_syllabus' };
                            else if (activeCourse === 'Digital Marketing') choice = { nextNodeId: 'dm_syllabus' };
                            else choice = { nextNodeId: 'ds_syllabus' };
                          }
                        }

                        if (choice && choice.nextNodeId) {
                          nextNodeId = choice.nextNodeId;
                          
                          // Handle dynamic routing for Syllabus if the visual flow chose generic faq_syllabus
                          if (nextNodeId === 'faq_syllabus') {
                            const activeCourse = updatedFields.course || (currentLeadData && currentLeadData.course) || "Data Science";
                            if (activeCourse === 'Data Analytics') nextNodeId = 'da_syllabus';
                            else if (activeCourse === 'Artificial Intelligence') nextNodeId = 'ai_syllabus';
                            else if (activeCourse === 'Digital Marketing') nextNodeId = 'dm_syllabus';
                            else nextNodeId = 'ds_syllabus';
                          }

                          const targetNode = flow.nodes.find(n => n.id === nextNodeId);
                          if (targetNode) {
                            if (targetNode.type === "Condition" && targetNode.id === "faq_placement") {
                              const selectedCourse = updatedFields.course || (currentLeadData && currentLeadData.course) || "Data Science";
                              const placementInfo = await fetchCRMPlacementInfo(selectedCourse);
                              if (placementInfo) {
                                replyText = placementInfo;
                                if (selectedCourse === "Data Science") nextNodeId = "ds_info";
                                else if (selectedCourse === "Data Analytics") nextNodeId = "da_info";
                                else if (selectedCourse === "Artificial Intelligence") nextNodeId = "ai_info";
                                else if (selectedCourse === "Digital Marketing") nextNodeId = "dm_info";
                                else nextNodeId = "course_info";
                              } else {
                                nextNodeId = "counselor_handoff";
                                const handoffNode = flow.nodes.find(n => n.id === nextNodeId);
                                if (handoffNode) {
                                  replyText = handoffNode.data.message;
                                  updatedFields.botPaused = true;
                                  updatedFields.handoffRequired = true;
                                }
                              }
                            } 
                            else {
                              replyText = targetNode.data.message;
                              if (targetNode.data.setFields) {
                                updatedFields = { ...updatedFields, ...targetNode.data.setFields };
                              }

                              if (targetNode.id === "counselor_handoff" || targetNode.id === "faq_demo") {
                                updatedFields.botPaused = true;
                                updatedFields.handoffRequired = true;
                                nextNodeId = "counselor_handoff";
                              } else {
                                const activeCourse = updatedFields.course || (currentLeadData && currentLeadData.course) || "Data Science";
                                if (activeCourse === "Data Science") nextNodeId = "ds_info";
                                else if (activeCourse === "Data Analytics") nextNodeId = "da_info";
                                else if (activeCourse === "Artificial Intelligence") nextNodeId = "ai_info";
                                else if (activeCourse === "Digital Marketing") nextNodeId = "dm_info";
                                else nextNodeId = "course_info";
                              }
                            }
                          }
                        }
                      } else {
                        replyText = currentNode.data.message || "Please select an option:";
                        nextNodeId = currentNode.id;
                      }
                    }

                    if (replyText) {
                      const creds = await getDecryptedInstagramCredentials();
                      if (creds.enabled && creds.accessToken) {
                        
                        // Dynamically build quick replies based on destination node
                        let outgoingQuickReplies = null;
                        
                        if (nextNodeId === "course_selection") {
                          console.log('[Instagram Chatbot] COURSE_SELECTION_SEND_START');
                          console.log(`[Instagram Chatbot] COURSE_SELECTION_SEND_REASON: Transitioning to course selection after details ingestion`);
                          console.log(`[Instagram Chatbot] COURSE_SELECTION_MESSAGE_ID: ${messageId}`);
                          console.log(`[Instagram Chatbot] CHATBOT_STATE_BEFORE: ${state ? JSON.stringify(state) : 'null'}`);

                          console.log('[Instagram Chatbot] Sending Course Selection quick replies');
                          const selNode = flow.nodes.find(n => n.id === "course_selection");
                          const choices = selNode?.data?.choices || [];
                          outgoingQuickReplies = choices.map(c => ({
                            title: c.label,
                            payload: c.payload || `course_${c.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
                          }));

                          console.log('[Instagram Chatbot] COURSE_SELECTION_SEND_END');
                        } 
                        else if (["course_info", "ds_info", "da_info", "ai_info", "dm_info"].includes(nextNodeId)) {
                          const infoNode = flow.nodes.find(n => n.id === nextNodeId);
                          const choices = infoNode?.data?.choices || [];
                          const activeCourseName = updatedFields.course || (currentLeadData && currentLeadData.course) || "Data Science";
                          replyText = replyText.replace("{{course}}", activeCourseName);
                          
                          outgoingQuickReplies = choices.map(c => ({
                            title: c.label,
                            payload: c.payload || `faq_${c.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
                          }));
                        }
                        else if (["faq_fees", "faq_duration", "faq_syllabus", "ds_syllabus", "da_syllabus", "ai_syllabus", "dm_syllabus"].includes(nextNodeId)) {
                          // Loop back node, offer "Ask Something Else" button
                          outgoingQuickReplies = [
                            {
                              title: "Ask Something Else",
                              payload: "ask_something_else"
                            }
                          ];
                        }

                        const replyRes = await sendInstagramDirectMessage(senderId, replyText, creds, outgoingQuickReplies);
                        const replyMessageId = replyRes?.message_id || `msg-sent-${Date.now()}`;

                        const botMsg = {
                          id: `msg-sent-${Date.now()}`,
                          sender: 'counselor',
                          text: replyText,
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          igMessageId: replyMessageId,
                          status: 'sent',
                          timestamp: new Date().toISOString()
                        };

                        const latestLeadDoc = await db.collection('leads').doc(activeLeadId).get();
                        if (latestLeadDoc.exists) {
                          const freshLeadData = latestLeadDoc.data();
                          const updatedChat = [...(freshLeadData.instagramMessages || []), botMsg];
                          const nextTimeline = [...(freshLeadData.timeline || []), {
                            id: `log-ig-out-${Date.now()}`,
                            type: 'instagram',
                            title: 'Instagram Auto-Reply Dispatched',
                            content: replyText,
                            timestamp: new Date().toISOString(),
                            user: 'System Automation'
                          }];

                          await db.collection('leads').doc(activeLeadId).update({
                            ...updatedFields,
                            instagramMessages: updatedChat,
                            timeline: nextTimeline,
                            lastContacted: new Date().toISOString(),
                            chatbotState: {
                              flowId: "main_lead_capture",
                              currentNodeId: nextNodeId,
                              collectedFields: updatedCollectedFields,
                              lastInteractionAt: new Date().toISOString()
                            }
                          });
                        }
                      }
                    }
                  }
                } 
                else {
                  // Fallback to Quick Auto-Reply Rules
                  const replies = chatbotSettings.customReplies || [];
                  const lowerMsg = messageText.toLowerCase().trim();
                  const matchedReply = replies.find(r => {
                    if (!r.trigger) return false;
                    const triggers = r.trigger.split(',').map(t => t.trim().toLowerCase());
                    return triggers.some(t => lowerMsg.includes(t) || t === lowerMsg);
                  });

                  if (matchedReply) {
                    console.log(`[Instagram Chatbot] Quick Reply matched for "${lowerMsg}":`, matchedReply.reply);
                    const creds = await getDecryptedInstagramCredentials();
                    if (creds.enabled && creds.accessToken) {
                      const replyRes = await sendInstagramDirectMessage(senderId, matchedReply.reply, creds);
                      const replyMessageId = replyRes?.message_id || `msg-sent-${Date.now()}`;

                      const botMsg = {
                        id: `msg-sent-${Date.now()}`,
                        sender: 'counselor',
                        text: matchedReply.reply,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        igMessageId: replyMessageId,
                        status: 'sent',
                        timestamp: new Date().toISOString()
                      };

                      const latestLeadDoc = await db.collection('leads').doc(activeLeadId).get();
                      if (latestLeadDoc.exists) {
                        const freshLeadData = latestLeadDoc.data();
                        const updatedChat = [...(freshLeadData.instagramMessages || []), botMsg];
                        const nextTimeline = [...(freshLeadData.timeline || []), {
                          id: `log-ig-out-${Date.now()}`,
                          type: 'instagram',
                          title: 'Instagram Auto-Reply Dispatched',
                          content: matchedReply.reply,
                          timestamp: new Date().toISOString(),
                          user: 'System Automation'
                        }];

                        await db.collection('leads').doc(activeLeadId).update({
                          instagramMessages: updatedChat,
                          timeline: nextTimeline,
                          lastContacted: new Date().toISOString()
                        });
                      }
                    }
                  } else {
                    console.log('[Instagram Chatbot] No quick reply trigger matched.');
                  }
                }
              }
            } else {
              console.log('[Instagram Chatbot] Chatbot disabled.');
            }
          } else {
            console.log('[Instagram Chatbot] Chatbot settings document not found.');
          }
        } catch (botErr) {
          console.error('[Instagram Chatbot] Auto-reply error:', botErr.response ? JSON.stringify(botErr.response.data) : botErr.message);
        }
      }
      // ==========================================

      return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      console.error('[Instagram Webhook] Critical webhook processing error:', err);
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

      const payload = { name, category, language, components, allow_category_change: true };
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
      await db.collection('whatsapp_templates').doc(name).delete().catch(() => { });

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
exports.sendBulkWhatsAppCampaign = functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { targetContacts, campaignName, messageType, selectedTemplate, templateLanguage, messageText, counselorName, existingCampaignId } = req.body;

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

      const campaignId = existingCampaignId || `camp-${Date.now()}`;
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
            }

            // 2. Check by exact doc ID = cleanPhone or phoneSuffix
            if (!leadData && cleanPhone) {
              let docSnap = await leadsRef.doc(cleanPhone).get();
              if (docSnap.exists) {
                leadId = docSnap.id;
                leadData = docSnap.data();
              } else if (phoneSuffix) {
                docSnap = await leadsRef.doc(phoneSuffix).get();
                if (docSnap.exists) {
                  leadId = docSnap.id;
                  leadData = docSnap.data();
                }
              }
            }

            // 3. Check by phone field matching (handles formatted strings with spaces/dashes)
            if (!leadData && phoneSuffix.length === 10) {
              const formattedPhoneVariants = [
                cleanPhone,
                phone,
                phoneSuffix,
                `+91${phoneSuffix}`,
                `+91 ${phoneSuffix}`,
                `${phoneSuffix.slice(0, 5)} ${phoneSuffix.slice(5)}`,
                `+91 ${phoneSuffix.slice(0, 5)} ${phoneSuffix.slice(5)}`,
                `91 ${phoneSuffix.slice(0, 5)} ${phoneSuffix.slice(5)}`,
                `+91-${phoneSuffix.slice(0, 5)}-${phoneSuffix.slice(5)}`
              ];

              // Deduplicate variants
              const uniqueVariants = [...new Set(formattedPhoneVariants.filter(Boolean))];
              const phoneQueries = uniqueVariants.map(variant => leadsRef.where('phone', '==', variant).limit(1).get());

              const querySnapshots = await Promise.all(phoneQueries);
              for (const snap of querySnapshots) {
                if (!snap.empty) {
                  leadId = snap.docs[0].id;
                  leadData = snap.docs[0].data();
                  break;
                }
              }
            }
            
            if (!leadData) {
              // Contact not found in CRM — do NOT create a new lead.
              // Build a minimal in-memory object just to construct the message payload.
              leadId = cleanPhone || `temp-${Date.now()}`;
              leadData = {
                name: contact.name || contact.Name || contact.phone || cleanPhone,
                phone: phone || cleanPhone,
                stage: contact.stage || 'New Lead',
                course: contact.course || contact.Course || '',
                counselor: counselorName || 'Unassigned',
              };
              // Do NOT write to Firestore — we just send the message
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

            // NOTE: We do NOT update the lead document in Firestore.
            // This ensures campaigns do not modify existing leads, change their last contacted status, or add messages to their timeline/whatsapp inbox.
            // Existing leads and imported CSV contacts remain completely untouched.

            recipientDetails.push({
              id: `r-${campaignId}-${globalIndex}`,
              name: leadData.name || `Recipient ${globalIndex + 1}`,
              phone: cleanPhone || 'N/A',
              status: 'sent',
              error: null,
              errorCode: null,
              messageId: messageId || `msg-${Date.now()}-${globalIndex}`,
              deliveredAt: null,
              readAt: null,
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

        await new Promise(res => setTimeout(res, 200));
      }

      const newCamp = {
        id: campaignId,
        name: campaignName || `Campaign - ${new Date().toLocaleDateString()}`,
        status: 'completed',
        totalRecipients: targetContacts.length,
        sent: sentCount,
        failed: failedCount,
        delivered: 0,
        read: 0,
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

/**
 * onLeadCreated
 * Triggered automatically when a new lead is added to Firestore.
 * Automated welcome message sending disabled.
 */
exports.onLeadCreated = functions.firestore
  .document('leads/{leadId}')
  .onCreate(async (snap, context) => {
    console.log(`[onLeadCreated] Automated welcome message sending is disabled per system configuration for lead ${context.params.leadId}.`);
    return null;
  });

/**
 * uploadMetaTemplateMedia
 * Uploads a file to Meta's Resumable Upload API for Template creation.
 */
exports.uploadMetaTemplateMedia = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const creds = await getDecryptedWhatsAppCredentials();
      if (!creds.accessToken || !creds.appId) {
        return res.status(400).json({ success: false, error: 'Meta integration missing App ID or Access Token.' });
      }

      const busboy = Busboy({ headers: req.headers });
      let fileBuffer = null;
      let mimeType = '';
      let fileName = '';

      busboy.on('file', (fieldname, file, info) => {
        fileName = info.filename;
        mimeType = info.mimeType;
        const chunks = [];
        file.on('data', (data) => chunks.push(data));
        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on('finish', async () => {
        if (!fileBuffer) {
          return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }

        try {
          // 1. Create Upload Session
          const sessionUrl = `https://graph.facebook.com/v20.0/${creds.appId}/uploads?file_length=${fileBuffer.length}&file_type=${mimeType}`;
          const sessionRes = await axios.post(sessionUrl, {}, {
            headers: {
              'Authorization': `OAuth ${creds.accessToken}`
            }
          });

          const uploadId = sessionRes.data.id;
          if (!uploadId) {
            throw new Error('Meta did not return an upload session ID');
          }

          // 2. Upload file data
          const uploadUrl = `https://graph.facebook.com/v20.0/${uploadId}`;
          const uploadRes = await axios.post(uploadUrl, fileBuffer, {
            headers: {
              'Authorization': `OAuth ${creds.accessToken}`,
              'file_offset': '0',
              'Content-Type': 'application/octet-stream'
            }
          });

          const handle = uploadRes.data.h;
          if (!handle) {
            throw new Error('Meta did not return a media handle');
          }

          return res.status(200).json({ success: true, handle });
        } catch (error) {
          console.error('[uploadMetaTemplateMedia] Error:', error.response?.data || error.message);
          return res.status(500).json({ success: false, error: 'Failed to upload media to Meta' });
        }
      });

      busboy.end(req.rawBody);
    } catch (e) {
      console.error('[uploadMetaTemplateMedia] Initialization Error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });
});

/**
 * processScheduledCampaigns
 * Runs every 5 minutes to dispatch scheduled WhatsApp campaigns.
 */
exports.processScheduledCampaigns = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  try {
    const now = new Date().toISOString();
    const campaignsRef = db.collection('whatsapp_campaigns');
    const scheduledQuery = await campaignsRef
      .where('status', '==', 'scheduled')
      .where('scheduledFor', '<=', now)
      .get();

    if (scheduledQuery.empty) {
      console.log('[processScheduledCampaigns] No scheduled campaigns due.');
      return null;
    }

    const projectId = process.env.GCLOUD_PROJECT || (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : 'leads-management-tz');
    const region = 'us-central1';

    const baseUrl = process.env.FUNCTIONS_EMULATOR === 'true'
      ? `http://127.0.0.1:5001/${projectId}/${region}/sendBulkWhatsAppCampaign`
      : `https://${region}-${projectId}.cloudfunctions.net/sendBulkWhatsAppCampaign`;

    for (const docSnapshot of scheduledQuery.docs) {
      const camp = docSnapshot.data();
      const campaignId = docSnapshot.id;
      console.log(`[processScheduledCampaigns] Processing campaign: ${campaignId}`);

      await campaignsRef.doc(campaignId).update({ status: 'processing' });

      const recipientsDoc = await db.collection('whatsapp_recipients').doc(campaignId).get();
      let recipientsList = [];
      if (recipientsDoc.exists) {
        recipientsList = recipientsDoc.data().recipients || [];
      }

      if (recipientsList.length === 0) {
        await campaignsRef.doc(campaignId).update({ status: 'completed', sent: 0, failed: 0 });
        continue;
      }

      console.log(`[processScheduledCampaigns] Dispatching ${recipientsList.length} messages for ${campaignId}`);
      try {
        await axios.post(baseUrl, {
          targetContacts: recipientsList,
          campaignName: camp.name,
          messageType: camp.type,
          selectedTemplate: camp.templateName,
          templateLanguage: camp.languageCode,
          messageText: camp.message,
          counselorName: 'System Auto-Sender',
          existingCampaignId: campaignId
        });
      } catch (err) {
        console.error(`[processScheduledCampaigns] Failed to dispatch campaign ${campaignId}:`, err.message);
        await campaignsRef.doc(campaignId).update({ status: 'failed' });
      }
    }
  } catch (error) {
    console.error('[processScheduledCampaigns] Fatal Error:', error);
  }
  return null;
});
exports.db = db;



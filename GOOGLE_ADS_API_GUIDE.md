# Developer Guide: Integrating Google Ads API with TechZone Lead CRM

This step-by-step guide explains how to connect the Google Ads API and Lead Form Extensions to the CRM. It covers Google Developer Console setup, OAuth credential generation, Google Ads API Center approval, and CRM configuration.

---

## Overview of the Integration Architecture

The integration works via two paths:
1. **Real-time Webhook Ingestion**: Google Ads Server calls the deployed `googleAdsWebhook` Cloud Function instantly whenever a student submits a Lead Form asset.
2. **Reconciliation Sync API**: The CRM calls Google Ads API (`googleAds:search` v24 REST endpoint) to reconcile leads from the past 48 hours to ensure no webhook events were missed.

---

## Step 1: Google Cloud Project & API Enablement

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select your existing CRM project.
3. In the search bar, search for **Google Ads API** and click **Enable**.

---

## Step 2: Configure OAuth Consent Screen

1. In the Google Cloud Console, navigate to **APIs & Services** > **OAuth consent screen**.
2. Select **Internal** (if your users are in the same Google Workspace) or **External** (if using personal `@gmail.com` accounts). Click **Create**.
3. Fill in the App Name (e.g., `TechZone CRM Connector`) and your Support Email.
4. Under **Scopes**, add `/auth/adwords` (Google Ads access scope).
5. If using "External", add your testing Gmail addresses to the **Test Users** list.

---

## Step 3: Create OAuth 2.0 Client Credentials

1. Navigate to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** > **OAuth client ID**.
3. Set the Application Type to **Web application** (or **Desktop app** for easier manual token retrieval).
4. Add the following under **Authorized redirect URIs** (for Web Apps):
   * `https://developers.google.com/oauthplayground` (useful for retrieving the refresh token in Step 4).
5. Click **Create** and save your **Client ID** and **Client Secret**.

---

## Step 4: Retrieve the OAuth 2.0 Refresh Token

To allow the CRM's background workers to run without human login, you need a long-lived **Refresh Token**:

1. Open the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the **Gear icon (OAuth 2.0 Configuration)** in the top right:
   * Check **Use own OAuth credentials**.
   * Enter the **Client ID** and **Client Secret** you created in Step 3.
3. In the left panel (Step 1 of the playground), paste this scope into the input box:
   `https://www.googleapis.com/auth/adwords`
   * Click **Authorize APIs**. Log in with the Google account that manages your Google Ads MCC.
4. In Step 2 of the playground, click **Exchange authorization code for tokens**.
5. Copy the generated **Refresh Token** from the JSON response box.

---

## Step 5: Generate a Google Ads Developer Token

1. Log in to your **Google Ads Manager Account (MCC)** (Note: The developer token must be requested from a Manager Account, not a standard individual account).
2. Go to **Tools and Settings** > **Setup** > **API Center**.
3. Fill out the Developer details form to generate your **Developer Token**.
4. The token will be issued immediately in **Test Access** status.

---

## Step 6: Configure the CRM Environment (`.env`)

1. Open the `.env` file in the CRM root directory.
2. Fill in the values retrieved in the previous steps. 
3. ⚠️ **Critical Check**: Ensure there are **no leading or trailing whitespaces**, and no spaces in the middle of the values (especially the Refresh Token).

```env
GOOGLE_ADS_CLIENT_ID=your_clean_oauth_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your_clean_oauth_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_clean_oauth_refresh_token
GOOGLE_ADS_DEVELOPER_TOKEN=your_clean_developer_token
```

Once saved in `.env`, open the CRM web UI and click **Save Connection Configurations** on the Google Ads integration panel. This will encrypt the keys and write them to Firestore.

---

## Step 7: Testing Connection vs Production Access

### Scenario A: Testing in Sandbox Mode (Test MCC)
Since your Developer Token initially has **Test Access**, you cannot query live production accounts. To test:
1. Create a Test Manager Account at [Google Ads API Test Accounts](https://developers.google.com/google-ads/api/docs/first-call/test-accounts). (It will have a red "Test Account" banner).
2. Create a **Test Client Account** inside that Test Manager.
3. Enter the Customer ID of this Test Client Account (format: `123-456-7890`) into the CRM settings and click **Test API Connection**.

### Scenario B: Launching to Production (Apply for Basic Access)
To sync your live, real-time campaign leads:
1. In your main Google Ads Manager Account (MCC), go to **Tools and Settings** > **Setup** > **API Center**.
2. Click **Apply for Basic Access**.
3. Describe your use case (e.g., *"We are building an internal student CRM to ingest leads from Google Ads Lead Form Webhooks and map them to campaigns"*).
4. Once approved (usually in 24 hours), update your CRM Customer ID to your production account ID.

---

## Step 8: Configuring Google Ads Lead Form Webhook

To capture leads instantly when a user submits a form on Google Ads:

1. Deployed Webhook URL:
   `https://us-central1-<your-project-id>.cloudfunctions.net/googleAdsWebhook?key=YOUR_WEBHOOK_PASSKEY`
2. In your Google Ads dashboard, go to your **Lead Form Asset** settings.
3. Paste the URL above into the **Webhook URL** field.
4. Copy the `YOUR_WEBHOOK_PASSKEY` (defined as `webhookPasskey` in your settings) and paste it into the **Key (Security Passkey)** field.
5. Click **Send Test Data** in Google Ads to verify a mock lead instantly arrives in the CRM dashboard.

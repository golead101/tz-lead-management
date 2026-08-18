# Lead Management CRM — Platform Integration & Webhook Guide

Welcome to the **Lead Management CRM Integration Guide**. This document is designed to help you connect external websites, landing pages, and lead sources to your CRM database automatically in real time. 

You can hand this document directly to your web developer or agency to complete the setup.

---

## 1. Choosing Your Integration Path

Depending on whether your institute's website already has a form or needs one, choose the corresponding path below:

### 💡 Path A: "Our website ALREADY has a registration form"
*(e.g., You use a WordPress plugin like Elementor Forms, Webflow Forms, custom HTML, or similar).*

You **do not** need to change the design or layout of your website. Your developer will keep your existing form exactly as it is, and simply paste a lightweight JavaScript interceptor script underneath it.

* **How it behaves:** 
  1. The student sees your beautiful, existing website form.
  2. The student enters their details and clicks "Submit".
  3. The invisible script copies the inputs in the background and sends a duplicate copy to our CRM database in a split-second.
  4. The form continues its original task (like saving to your WordPress database or sending you an email).
  
---

### 💡 Path B: "Our website DOES NOT have a registration form yet"
*(e.g., You have a static homepage, a new landing page with just text/images, or want to display a pre-built form).*

You do not need to design or build a form. We provide a pre-made, mobile-responsive form widget that is already beautifully styled in your institute's branding colors.

* **How it behaves:**
  1. Your developer copy-pastes a single line of standard HTML code (an `<iframe>` container, just like embedding a YouTube video) on your webpage.
  2. The CRM’s branded form instantly renders and displays on your website.
  3. When a student enters their details and clicks submit, the inquiry goes straight into your CRM **"New Lead"** queue.

---

### 💡 Path C: "We DO NOT have a website at all"
*(e.g., You only run digital marketing campaigns on Instagram, Meta Ads, Google Ads, or WhatsApp).*

You do not need a website to capture digital inquiries. 

* **How it behaves:**
  1. Copy your unique **Branded Standalone Link** from the CRM.
  2. Paste it in your **Instagram Bio, TikTok Link, WhatsApp Business description, or Google Maps listing**.
  3. When a student clicks the link, they are taken to a beautiful, clean, full-screen inquiry form hosted on our secure CRM servers. Submitting it logs the student directly in your CRM.

---

## 2. How the CRM Knows Where to Route and Save the Data

When a student clicks "Submit" from any location, the CRM backend instantly identifies your institute and drops the lead into your specific dashboard. It achieves this using three key passports:

### 🔑 Passport 1: The Secure API Authorization Token (For Webhooks)
Every developer script or POST webhook request is configured with a secure cryptographic API key (Token) in the HTTP headers:
`'Authorization': 'Bearer YOUR_INSTITUTE_API_TOKEN'`
* **How it saves:** This token is generated inside your CRM Admin Settings and is tied exclusively to your account. When the backend receives a lead, it verifies this token in a fraction of a millisecond and maps it to your specific institute database.

### 🔑 Passport 2: The URL Slug ID (For IFrames & Public Links)
In embed links and public stand-alone form links, a unique cryptographic slug identifier is appended at the very end of the web address:
`https://crm.your-institute.com/forms/embed/inst_aarav_mumbai_786`
* **How it saves:** The backend parses the `/inst_aarav_mumbai_786` segment from the URL, looks up your credentials, and drops the student's lead into your queue.

### 🔑 Passport 3: Hidden Fields (For Auto-Assign & Marketing UTMs)
Form submissions can carry hidden payload data that students don't see:
* `<input type="hidden" name="utm_source" value="MetaAds" />` maps the student profile to the exact campaign they came from.
* `<input type="hidden" name="assigned_counselor" value="Elena Gilbert" />` immediately assigns that lead to your counselor Elena Gilbert for outbound follow-ups.

---

## 3. Developer Handover Cheat Sheet

If you have a web developer, copy-paste the sections below and send it to them:

### Developer Task 1: Integrating with an Existing Website Form
Please add this lightweight event listener script to the footer of your registration webpage to capture form submissions and forward them to our CRM endpoint:

```html
<script>
  document.getElementById('YOUR_EXISTING_FORM_ID').addEventListener('submit', async (e) => {
    // 1. Gather all form values entered by the student
    const formData = new FormData(e.target);
    const leadData = Object.fromEntries(formData.entries());

    // 2. Secretly send the payload to the CRM in the background
    try {
      await fetch('https://crm-api.your-institute.com/v1/webhooks/leads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': 'Bearer YOUR_INSTITUTE_API_TOKEN' 
        },
        body: JSON.stringify(leadData)
      });
    } catch(err) {
       console.error('CRM capture webhook sync error:', err);
    }
  });
</script>
```

### Developer Task 2: Embedding the Pre-Built branded IFrame Widget
Please paste this standard HTML container widget into the section where you want to render the lead capture form:

```html
<iframe 
  src="https://crm.your-institute.com/forms/embed/YOUR_INSTITUTE_SLUG_ID" 
  width="100%" 
  height="460px" 
  style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);"
  allow="payment; camera; microphone"
  loading="lazy">
</iframe>
```

---
*Document Created: 2026-05-25 • Lead Management CRM System Integration Desk*

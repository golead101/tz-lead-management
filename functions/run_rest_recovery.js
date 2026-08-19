const axios = require('axios');
const fs = require('fs');

const configPath = 'C:\\Users\\lenovo\\.config\\configstore\\firebase-tools.json';
let accessToken = '';

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  accessToken = config.tokens.access_token;
} catch (e) {
  console.error('Failed to read firebase token:', e.message);
  process.exit(1);
}

const authHeader = `Bearer ${accessToken}`;
const baseUrl = 'https://firestore.googleapis.com/v1/projects/leads-management-tz/databases/(default)';

function getCleanPhone(raw) {
  if (!raw) return '';
  let clean = String(raw).replace(/\D/g, '').trim();
  if (clean.length === 10) clean = '91' + clean;
  if (clean.startsWith('00')) clean = clean.substring(2);
  return clean;
}

const resolveName = (c) => {
  const customKeys = ['first_name', 'First Name', 'full_name', 'Full Name', 'contact_name', 'Contact Name', 'student_name', 'Student Name'];
  for (const key of customKeys) {
    const val = c[key]?.stringValue || c[key];
    if (val && String(val).trim() && String(val).trim() !== 'Campaign Contact') {
      return String(val).trim();
    }
  }

  for (const key of Object.keys(c)) {
    if (key.toLowerCase().trim() !== 'name' && key.toLowerCase().includes('name')) {
      const val = c[key]?.stringValue || c[key];
      if (val && String(val).trim() && String(val).trim() !== 'Campaign Contact') {
        return String(val).trim();
      }
    }
  }

  const fallbackKeys = ['name', 'Name'];
  for (const key of fallbackKeys) {
    const val = c[key]?.stringValue || c[key];
    if (val && String(val).trim()) {
      return String(val).trim();
    }
  }

  return '';
};

async function run() {
  const writeMode = process.argv.includes('--write');

  const phoneToNameMap = {};
  let totalOriginalContacts = 0;

  console.log('1a. Fetching contact lists...');
  try {
    const contactsRes = await axios.get(`${baseUrl}/documents/whatsapp_contacts?pageSize=100`, {
      headers: { Authorization: authHeader }
    });

    if (contactsRes.data && contactsRes.data.documents) {
      contactsRes.data.documents.forEach(docSnap => {
        const fields = docSnap.fields || {};
        const contactsVal = fields.contacts || {};
        const contactsArray = contactsVal.arrayValue?.values || [];
        
        contactsArray.forEach(valWrapper => {
          const contactFields = valWrapper.mapValue?.fields || {};
          
          let rawPhone = '';
          const phoneKeys = ['phone', 'Phone', 'PhoneNumber', 'phone_number', 'Phone Number'];
          for (const k of phoneKeys) {
            if (contactFields[k]?.stringValue) {
              rawPhone = contactFields[k].stringValue;
              break;
            }
          }

          const name = resolveName(contactFields);
          const cleanPhone = getCleanPhone(rawPhone);
          if (cleanPhone && name) {
            phoneToNameMap[cleanPhone] = name;
            totalOriginalContacts++;
          }
        });
      });
    }
  } catch (e) {
    console.error('Error fetching contacts:', e.message);
  }

  console.log('1b. Fetching campaign recipients...');
  try {
    const recipientsRes = await axios.get(`${baseUrl}/documents/whatsapp_recipients?pageSize=100`, {
      headers: { Authorization: authHeader }
    });

    if (recipientsRes.data && recipientsRes.data.documents) {
      recipientsRes.data.documents.forEach(docSnap => {
        const fields = docSnap.fields || {};
        const recipientsVal = fields.recipients || {};
        const recipientsArray = recipientsVal.arrayValue?.values || [];
        
        recipientsArray.forEach(valWrapper => {
          const contactFields = valWrapper.mapValue?.fields || {};
          
          let rawPhone = '';
          const phoneKeys = ['phone', 'Phone', 'PhoneNumber', 'phone_number', 'Phone Number'];
          for (const k of phoneKeys) {
            if (contactFields[k]?.stringValue) {
              rawPhone = contactFields[k].stringValue;
              break;
            }
          }

          const name = resolveName(contactFields);
          const cleanPhone = getCleanPhone(rawPhone);
          if (cleanPhone && name) {
            phoneToNameMap[cleanPhone] = name;
            totalOriginalContacts++;
          }
        });
      });
    }
  } catch (e) {
    console.error('Error fetching recipients:', e.message);
  }

  console.log('2. Querying leads...');
  const queryUrl = `${baseUrl}/documents:runQuery`;
  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: 'leads' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'name' },
          op: 'EQUAL',
          value: { stringValue: 'Campaign Contact' }
        }
      }
    }
  };

  const queryRes = await axios.post(queryUrl, queryPayload, {
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
  });

  const queryResults = queryRes.data || [];
  const leadsToUpdate = [];
  const unmatchedLeads = [];

  queryResults.forEach(result => {
    if (!result.document) return;
    
    const doc = result.document;
    const namePath = doc.name;
    const leadId = namePath.split('/').pop();
    const fields = doc.fields || {};
    
    const rawPhone = fields.phone?.stringValue || '';
    const cleanPhone = getCleanPhone(rawPhone);
    const matchedName = phoneToNameMap[cleanPhone];

    if (matchedName && matchedName !== 'Campaign Contact') {
      leadsToUpdate.push({
        leadId,
        phone: rawPhone,
        currentName: 'Campaign Contact',
        matchedName,
        path: namePath
      });
    } else {
      unmatchedLeads.push({
        leadId,
        phone: rawPhone,
        currentName: 'Campaign Contact'
      });
    }
  });

  // Generate Markdown Preview Report
  let report = `# Campaign Leads Name Recovery Preview Report\n\n`;
  report += `This report outlines the matching results between existing CRM leads showing "Campaign Contact" and original campaigns/contacts databases.\n\n`;
  report += `### Summary\n`;
  report += `- Total Leads Evaluated: **${queryResults.filter(r => r.document).length}**\n`;
  report += `- Confident Matches Found: **${leadsToUpdate.length}**\n`;
  report += `- Unmatched Records: **${unmatchedLeads.length}**\n\n`;
  
  report += `### Confident Matches (High Confidence)\n`;
  report += `| Firestore Lead ID | Phone | Current Name | Matched Original Name | Match Confidence |\n`;
  report += `| --- | --- | --- | --- | --- |\n`;
  leadsToUpdate.forEach(item => {
    report += `| \`${item.leadId}\` | \`${item.phone}\` | ${item.currentName} | **${item.matchedName}** | High |\n`;
  });
  
  report += `\n### Unmatched Records (No Match Found)\n`;
  report += `| Firestore Lead ID | Phone | Current Name | Matched Original Name | Match Confidence |\n`;
  report += `| --- | --- | --- | --- | --- |\n`;
  unmatchedLeads.forEach(item => {
    report += `| \`${item.leadId}\` | \`${item.phone}\` | ${item.currentName} | *No Match Found* | None |\n`;
  });

  fs.writeFileSync('C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\0485de18-aa68-49fb-9fe5-05f353881b38\\preview_report.md', report);
  console.log('Markdown preview report written successfully!');

  if (writeMode && leadsToUpdate.length > 0) {
    console.log(`\nWrite mode is ENABLED. Performing updates to ${leadsToUpdate.length} records...`);
    for (const item of leadsToUpdate) {
      const updateUrl = `https://firestore.googleapis.com/v1/${item.path}?updateMask.fieldPaths=name`;
      const payload = {
        fields: {
          name: { stringValue: item.matchedName }
        }
      };

      await axios.patch(updateUrl, payload, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
      });
      console.log(`  Updated lead ${item.leadId} -> "${item.matchedName}"`);
    }
    console.log('\nAll matches recovered successfully!');
  } else {
    console.log('\nDRY-RUN completed. Run with --write argument to recover actual names.');
  }
}

run().catch(err => {
  console.error('Error during execution:', err.response ? err.response.data : err.message);
});

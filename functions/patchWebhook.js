const fs = require('fs');

let content = fs.readFileSync('index.js', 'utf8');

// Patch 1: Interactive buttons
content = content.replace(
  `const messageText = message.text?.body || '';`,
  `let messageText = message.text?.body || '';
      if (message.type === 'interactive') {
        if (message.interactive?.button_reply) {
          messageText = message.interactive.button_reply.title;
        } else if (message.interactive?.list_reply) {
          messageText = message.interactive.list_reply.title;
        }
      }`
);

// Patch 2: String(lead.phone) bug
content = content.replace(
  `const cleanedLeadPhone = lead.phone.replace(/[^0-9]/g, '');`,
  `const cleanedLeadPhone = String(lead.phone).replace(/[^0-9]/g, '');`
);

// Patch 3: Chatbot logic with 2 min expiration check
const targetString = `          return res.status(200).send('EVENT_RECEIVED');`;

const chatbotCode = `          // === CHATBOT AUTO-REPLY LOGIC ===
          const messageTimestamp = message.timestamp ? parseInt(message.timestamp, 10) * 1000 : Date.now();
          const isOldMessage = (Date.now() - messageTimestamp) > 2 * 60 * 1000; // Ignore > 2 mins old

          if (messageText && !isOldMessage) {
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
                  return triggers.includes(lowerMsg);
                });

                if (matchedReply) {
                  console.log(\`[WhatsApp Webhook] Trigger matched for "\${lowerMsg}":\`, matchedReply.responseType);
                  
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
                        reply: { id: \`btn_\${i}\`, title: btn.substring(0, 20) }
                      }));
                      payload.interactive = {
                        type: 'button',
                        body: { text: matchedReply.preview },
                        action: { buttons }
                      };
                    }

                    if (payload.type) {
                      const url = \`https://graph.facebook.com/\${creds.apiVersion}/\${creds.phoneNumberId}/messages\`;
                      await axios.post(url, payload, {
                        headers: { 'Authorization': \`Bearer \${creds.accessToken}\`, 'Content-Type': 'application/json' }
                      });
                      console.log(\`[WhatsApp Webhook] Chatbot auto-reply sent successfully!\`);
                    }
                  }
                }
              }
            } catch (botErr) {
              console.error('[WhatsApp Webhook] Chatbot auto-reply error:', botErr.message);
            }
          }
          // ===============================

          return res.status(200).send('EVENT_RECEIVED');`;

content = content.replace(targetString, chatbotCode);

fs.writeFileSync('index.js', content);
console.log('Successfully patched index.js');

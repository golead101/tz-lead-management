import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';

export default function WhatsAppConsole() {
  const {
    leads,
    activeRole,
    activeUser,
    sendWhatsAppMsg,
    selectedLeadId,
    setSelectedLeadId
  } = useCRM();

  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);

  // Filter contacts by counselor permissions
  const contactLeads = leads.filter(lead => {
    if (activeRole === 'Counselor') {
      return lead.counselor === activeUser;
    }
    return true;
  });

  // Set default selected contact if none active
  useEffect(() => {
    if (!selectedLeadId && contactLeads.length > 0) {
      setSelectedLeadId(contactLeads[0].id);
    }
  }, [selectedLeadId, contactLeads, setSelectedLeadId]);

  const activeLead = leads.find(l => l.id === selectedLeadId);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeLead?.whatsappMessages]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeLead) return;
    
    sendWhatsAppMsg(activeLead.id, messageText);
    setMessageText('');
    setShowSlashMenu(false);
  };

  // Pre-formatted templates dispatcher
  const templates = [
    {
      id: 'welcome',
      name: 'Brochure & Welcome Text',
      text: 'Hi {{student_name}}, thank you for contacting our institute! Here is the program overview brochure. Let me know when is a good time to speak.'
    },
    {
      id: 'demo-rem',
      name: 'Demo Class invitation',
      text: 'Hello {{student_name}}! This is {{counselor_name}} from the academy. Your live class demo is scheduled for tomorrow. Here is the Meet link: meet.google.com/abc-def-ghi'
    },
    {
      id: 'fee-details',
      name: 'Fee Structure Check',
      text: 'Hey {{student_name}}, as requested, our course fees is ₹75,000. We also offer monthly student loan options starting at ₹5,000/month. Let me know if you would like me to block a batch seat.'
    }
  ];

  const applyTemplate = (tplText) => {
    if (!activeLead) return;
    let formatted = tplText
      .replace('{{student_name}}', activeLead.name)
      .replace('{{counselor_name}}', activeLead.counselor);
    
    setMessageText(formatted);
  };

  const slashShortcuts = [
    { code: '/welcome', title: 'Welcome Greeting', text: 'Hi {{student_name}}, thank you for contacting our academy! Here is the detailed program overview brochure. Let me know when is a good time to speak.' },
    { code: '/fees', title: 'Course Fee Info', text: 'Hey {{student_name}}, the total course fees is ₹75,000. We also offer monthly student loan options starting at ₹5,000/month. Let me know if you would like me to block a batch seat.' },
    { code: '/demo', title: 'Demo Class Link', text: 'Hello {{student_name}}! This is {{counselor_name}} from the academy. Your live class demo link is: meet.google.com/abc-def-ghi' },
    { code: '/call', title: 'Request Call Time', text: 'Hi {{student_name}}, I tried reaching you over phone but couldn\'t connect. Please let me know a good time to call you back today. Thanks!' }
  ];

  const applySlashShortcut = (shortcut) => {
    if (!activeLead) return;
    const formatted = shortcut.text
      .replace('{{student_name}}', activeLead.name)
      .replace('{{counselor_name}}', activeLead.counselor || activeUser);
    setMessageText(formatted);
    setShowSlashMenu(false);
  };

  const getSuggestionPills = () => {
    if (!activeLead) return [];
    const course = activeLead.course || '';
    const generic = [
      { label: '📞 Request Call Time', text: `Hi ${activeLead.name}! I tried calling you. Please let me know a good time to connect today for a brief discussion.` },
      { label: '🌟 Book Demo Slot', text: `Hello ${activeLead.name}, we are hosting a live interactive demo class this week. Would you like me to book a free slot for you?` }
    ];
    if (course.toLowerCase().includes('web') || course.toLowerCase().includes('front') || course.toLowerCase().includes('full')) {
      return [
        { label: '💻 Web Dev Fees', text: `Hi ${activeLead.name}, the fees for our Full-Stack Web Development program is ₹75,000, payable in interest-free monthly installments of ₹6,250.` },
        { label: '🕒 Evening Batches', text: `Hello ${activeLead.name}, we have an upcoming evening batch starting next Monday (7:00 PM - 9:00 PM). Would this timing suit your schedule?` },
        ...generic
      ];
    } else if (course.toLowerCase().includes('data') || course.toLowerCase().includes('ai') || course.toLowerCase().includes('science')) {
      return [
        { label: '🤖 Data Science Fees', text: `Hi ${activeLead.name}, the Data Science & AI program is ₹95,000, including 6 months of live interactive classes and 100% placement assurance.` },
        { label: '🚀 Free AI Bootcamp', text: `Hi ${activeLead.name}, we are organizing a free AI & ML Live Bootcamp this Saturday at 11:30 AM. Would you like a VIP attendee pass?` },
        ...generic
      ];
    }
    return [
      { label: '📖 Fee Structure', text: `Hi ${activeLead.name}, let me share the detailed program structure and the scholarship fee discount breakdown with you. Do you have 5 minutes to connect?` },
      ...generic
    ];
  };

  const handleInputChange = (val) => {
    setMessageText(val);
    setShowSlashMenu(val.startsWith('/') && !val.includes(' '));
  };

  const filteredSlashShortcuts = slashShortcuts.filter(s => s.code.startsWith(messageText));

  return (
    <div className="fade-in">
      <div className="welcome-header" style={{ marginBottom: '16px' }}>
        <h2 className="welcome-title">WhatsApp Communication Dashboard</h2>
        <p className="welcome-subtitle">Simulate real-time business communication, brochure delivery confirmations, and bot notifications with student inquiries.</p>
      </div>

      <div className="whatsapp-chat-container">
        {/* Contacts Sidebar list (Left) */}
        <div className="whatsapp-contacts-list">
          {contactLeads.length === 0 ? (
            <div className="text-center" style={{ padding: '20px', color: 'var(--text-muted)' }}>
              No active contacts.
            </div>
          ) : (
            contactLeads.map(lead => {
              const isActive = lead.id === selectedLeadId;
              const lastMsg = lead.whatsappMessages?.[lead.whatsappMessages.length - 1];
              
              return (
                <button
                  key={lead.id}
                  className={`whatsapp-contact-item w-full ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <div className="chat-avatar">
                    {lead.name.split(' ').map(n=>n[0]).join('').toUpperCase()}
                  </div>
                  <div className="contact-info-block">
                    <span className="contact-name">{lead.name}</span>
                    <span className="contact-status" title={lastMsg?.text || lead.phone}>
                      {lastMsg ? `${lastMsg.sender === 'counselor' ? 'You: ' : ''}${lastMsg.text}` : lead.phone}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Chat Panel Content (Right) */}
        <div className="whatsapp-chat-pane">
          {activeLead ? (
            <>
              {/* Chat Header */}
              <div className="chat-pane-header">
                <div>
                  <h4 className="chat-pane-title">{activeLead.name}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activeLead.phone} | Assigned: {activeLead.counselor}</span>
                </div>
              </div>

              {/* Chat message bubbles stream */}
              <div className="chat-bubbles-stream">
                {activeLead.whatsappMessages?.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742h.01m2.996 0h.01m3.014 0h.01M9 16.5h.01m2.996 0h.01m3.01 0h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p style={{ marginTop: '10px' }}>No conversation logged yet. Select a template below or type to start.</p>
                  </div>
                ) : (
                  activeLead.whatsappMessages?.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`chat-bubble ${msg.sender === 'counselor' ? 'outgoing' : 'incoming'}`}
                    >
                      <div>{msg.text}</div>
                      <div className="bubble-time">{msg.time}</div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat suggestions pills deck */}
              <div className="chat-suggestions-deck">
                {getSuggestionPills().map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="chat-suggestion-pill"
                    onClick={() => setMessageText(pill.text)}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Chat Form bar */}
              <form onSubmit={handleSend} className="whatsapp-chat-input-bar" style={{ position: 'relative' }}>
                {showSlashMenu && filteredSlashShortcuts.length > 0 && (
                  <div className="slash-commands-popover">
                    <div className="cmd-section-title" style={{ padding: '6px 14px 2px 14px' }}>Quick Slash Templates</div>
                    {filteredSlashShortcuts.map((s, idx) => (
                      <div 
                        key={idx} 
                        className="slash-command-item"
                        onClick={() => applySlashShortcut(s)}
                      >
                        <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{s.code}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Template Quick Selection Launcher */}
                <div style={{ position: 'relative' }}>
                  <select 
                    defaultValue="" 
                    className="filter-select"
                    style={{ background: 'rgba(239, 68, 68, 0.06)', color: 'var(--primary)', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '11.5px', fontWeight: '700', borderRadius: 'var(--radius-full)', padding: '5px 12px' }}
                    onChange={(e) => {
                      if (e.target.value) {
                        applyTemplate(e.target.value);
                        e.target.value = ''; // reset selection
                      }
                    }}
                  >
                    <option value="" disabled>✨ Use Preset Templates</option>
                    {templates.map(tpl => (
                      <option key={tpl.id} value={tpl.text}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                <input 
                  type="text" 
                  className="whatsapp-input" 
                  placeholder="Type a message... (Type / for templates)"
                  value={messageText}
                  onChange={(e) => handleInputChange(e.target.value)}
                />
                
                <button type="submit" className="primary-btn" style={{ background: 'var(--primary)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: '700' }}>
                  Send
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: 'rotate(45deg)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              <p style={{ marginTop: '12px' }}>Please select a student contact to audit communications history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

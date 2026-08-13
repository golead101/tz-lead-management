import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Search, Check, CheckCheck, Clock,
  AlertCircle, Paperclip, FileText
} from 'lucide-react';
import { whatsappDb } from './whatsappDb';
import { useCRM } from '../../context/CRMContext';

const BRAND_BLUE = '#2563eb';

function formatTime(ts) {
  if (!ts) return '';
  const date = new Date(ts._seconds * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 2 * oneDay) return 'Yesterday';
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(ts) {
  if (!ts) return '';
  const date = new Date(ts._seconds * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDisplayTime(msg) {
  if (msg.timestamp && msg.timestamp._seconds) {
    return formatMessageTime(msg.timestamp);
  }
  if (msg.id) {
    const match = msg.id.match(/\d+$/);
    if (match) {
      return formatMessageTime({ _seconds: Math.floor(parseInt(match[0], 10) / 1000) });
    }
  }
  return msg.time || '';
}

function formatPhone(phone) {
  if (!phone) return '';
  // Strip ALL leading '+' signs first (handles ++91, +91, etc.)
  const clean = String(phone).replace(/^\++/, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return `+${clean}`;
}

function StatusIcon({ status, size = 14 }) {
  switch (status) {
    case 'sent':
      return <Check size={size} color="#94a3b8" />;
    case 'delivered':
      return <CheckCheck size={size} color="#94a3b8" />;
    case 'read':
      return <CheckCheck size={size} color="#53bdeb" />;
    case 'failed':
      return <AlertCircle size={size} color="#ef4444" />;
    default:
      return <CheckCheck size={size} color="#53bdeb" />; // Default to read/delivered for simulated messages
  }
}

function LeadStatusBadge({ stage }) {
  const currentStage = stage || 'New Lead';
  const stageLower = currentStage.toLowerCase();

  let bg = '#eff6ff';
  let border = '#bfdbfe';
  let color = '#1e40af';
  let icon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );

  if (stageLower.includes('converted') || stageLower.includes('won')) {
    bg = '#f0fdf4';
    border = '#bbf7d0';
    color = '#15803d';
    icon = (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  } else if (stageLower.includes('interested')) {
    bg = '#f0fdf4';
    border = '#86efac';
    color = '#166534';
    icon = (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
    );
  } else if (stageLower.includes('follow-up') || stageLower.includes('later') || stageLower.includes('busy')) {
    bg = '#fefce8';
    border = '#fef08a';
    color = '#a16207';
    icon = (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  } else if (stageLower.includes('not interested') || stageLower.includes('wrong') || stageLower.includes('lost')) {
    bg = '#fef2f2';
    border = '#fecaca';
    color = '#b91c1c';
    icon = (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  } else if (stageLower.includes('demo')) {
    bg = '#faf5ff';
    border = '#e9d5ff';
    color = '#6b21a8';
    icon = (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        background: bg,
        border: `1px solid ${border}`,
        color: color,
        lineHeight: '1.3',
        width: 'fit-content'
      }}
    >
      {icon}
      {currentStage}
    </span>
  );
}

export default function InboxPage() {
  const { leads, sendWhatsAppMsg, updateLead, activeRole, activeUser, showToastMsg, selectedLeadId, setSelectedLeadId } = useCRM();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inboxFilter, setInboxFilter] = useState('all');
  const messagesEndRef = useRef(null);
  
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedTemplate, setAttachedTemplate] = useState(null);
  const [metaTemplates, setMetaTemplates] = useState([]);

  useEffect(() => {
    setMetaTemplates(whatsappDb.getTemplates());
  }, []);
  
  const mockStorageFiles = [
    { id: 1, name: 'AI_Course_Brochure.pdf', type: 'document', size: '2.4 MB' },
    { id: 2, name: 'Campus_Tour.mp4', type: 'video', size: '14.1 MB' },
    { id: 3, name: 'Promo_Offer_Poster.jpg', type: 'image', size: '1.1 MB' },
    { id: 4, name: 'Fee_Structure_2026.pdf', type: 'document', size: '0.8 MB' }
  ];

  const handleAttachClick = () => {
    setShowStorageModal(true);
  };

  // Dynamically compute conversations from CRM leads
  const conversations = React.useMemo(() => {
    const filteredLeads = leads.filter(lead => {
      if (selectedLeadId && lead.id === selectedLeadId) return true;
      if (activeRole === 'Counselor' && lead.counselor !== activeUser) return false;
      const msgs = lead.whatsappMessages || [];

      // If user is explicitly viewing the 'campaign' filter tab, show leads with campaign history
      if (inboxFilter === 'campaign') {
        return msgs.length > 0;
      }

      // For 'all', 'unread', 'read': Hide leads with no messages OR leads that only have bulk campaign broadcasts with no inbound replies!
      if (msgs.length === 0) return false;

      const hasInbound = msgs.some(m => m.sender === 'lead' || m.type === 'inbound' || m.isInbound);
      const hasDirectChat = msgs.some(m => (m.sender === 'counselor' || m.sender === 'user') && !m.isCampaign && !m.isTemplate && !m.id?.includes('camp') && !m.title?.toLowerCase().includes('campaign'));

      return hasInbound || hasDirectChat;
    });

    const mapped = filteredLeads.map(lead => {
      const msgs = lead.whatsappMessages || [];
      const lastMsg = msgs[msgs.length - 1];
      
      let lastMessageAt = null;
      if (lastMsg) {
        const match = lastMsg.id ? lastMsg.id.match(/\d+$/) : null;
        lastMessageAt = match ? { _seconds: Math.floor(parseInt(match[0], 10) / 1000) } : { _seconds: Math.floor(Date.now() / 1000) };
      } else {
        lastMessageAt = { _seconds: Math.floor(new Date(lead.createdDate || Date.now()).getTime() / 1000) };
      }

      const unreadCount = msgs.reduce((acc, m) => {
        if (m.sender === 'lead' && !m.read) return acc + 1;
        return acc;
      }, 0);

      return {
        id: lead.id,
        phone: lead.phone,
        contactName: lead.name,
        lastMessage: lastMsg ? (lastMsg.text || lastMsg.content || 'Message') : 'No messages yet',
        lastMessageAt,
        lastDirection: lastMsg ? (lastMsg.sender === 'counselor' ? 'outbound' : 'inbound') : null,
        unreadCount,
        repliedToCampaign: lead.source === 'WhatsApp Campaign' || msgs.some(m => m.sender === 'lead' && msgs.some(om => om.sender === 'counselor' && om.id.includes('campaign'))),
        lead
      };
    });

    return mapped.sort((a, b) => {
      const timeA = a.lastMessageAt?._seconds || 0;
      const timeB = b.lastMessageAt?._seconds || 0;
      return timeB - timeA;
    });
  }, [leads, activeRole, activeUser, inboxFilter, selectedLeadId]);

  const targetLead = leads.find(l => l.id === selectedLeadId);
  const selectedConvo = conversations.find(c => c.id === selectedLeadId) || (targetLead ? {
    id: targetLead.id,
    phone: targetLead.phone,
    contactName: targetLead.name,
    lastMessage: 'No messages yet',
    unreadCount: 0,
    lead: targetLead
  } : null);
  const messages = targetLead?.whatsappMessages || selectedConvo?.lead?.whatsappMessages || [];

  // Automatically select first contact if none is active and there are contacts (desktop only)
  useEffect(() => {
    if (!selectedLeadId && conversations.length > 0 && window.innerWidth > 768) {
      setSelectedLeadId(conversations[0].id);
    }
  }, [selectedLeadId, conversations]);

  useEffect(() => {
    if (selectedLeadId) {
      markAsRead(selectedLeadId);
    }
  }, [selectedLeadId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markAsRead = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const msgs = lead.whatsappMessages || [];
    const hasUnread = msgs.some(m => m.sender === 'lead' && !m.read);
    if (hasUnread) {
      const updatedMsgs = msgs.map(m => m.sender === 'lead' ? { ...m, read: true } : m);
      updateLead(leadId, { whatsappMessages: updatedMsgs });
    }
  };

  const handleSendReply = () => {
    if ((!replyText.trim() && !attachedFile && !attachedTemplate) || !selectedLeadId || sending) return;
    setSending(true);
    let text = replyText.trim();
    let templateData = null;
    
    if (attachedFile) {
      text = text ? `${text}\n[Attached: ${attachedFile.name}]` : `[Attached: ${attachedFile.name}]`;
    }
    if (attachedTemplate) {
      const bodyText = attachedTemplate.components?.find(c => c.type === 'BODY')?.text || '';
      text = text ? `${text}\n\n${bodyText}` : bodyText;
      
      const apiComponents = [];
      const origComponents = attachedTemplate.components || [];
      
      origComponents.forEach(comp => {
        if (comp.type === 'HEADER' && comp.format === 'IMAGE') {
          apiComponents.push({ type: 'header', parameters: [{ type: 'image', image: { link: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80' } }] });
        } else if (comp.type === 'HEADER' && comp.format === 'DOCUMENT') {
          apiComponents.push({ type: 'header', parameters: [{ type: 'document', document: { link: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' } }] });
        } else if (comp.type === 'HEADER' && comp.format === 'VIDEO') {
          apiComponents.push({ type: 'header', parameters: [{ type: 'video', video: { link: 'https://www.w3schools.com/html/mov_bbb.mp4' } }] });
        } else if (comp.type === 'BODY' && comp.example?.body_text?.[0]) {
          const paramsCount = comp.example.body_text[0].length;
          const parameters = [];
          for (let i = 0; i < paramsCount; i++) {
             parameters.push({ type: 'text', text: comp.example.body_text[0][i] || 'Demo User' });
          }
          apiComponents.push({ type: 'body', parameters });
        }
      });

      templateData = {
        name: attachedTemplate.name,
        language: { code: attachedTemplate.language || 'en' }
      };
      
      if (apiComponents.length > 0) {
        templateData.components = apiComponents;
      }
    }
    
    setReplyText('');
    setAttachedFile(null);
    setAttachedTemplate(null);

    sendWhatsAppMsg(selectedLeadId, text, templateData);
    setSending(false);
  };

  const filteredConversations = conversations.filter(c => {
    if (inboxFilter === 'unread' && !(c.unreadCount > 0)) return false;
    if (inboxFilter === 'read' && c.unreadCount > 0) return false;
    if (inboxFilter === 'campaign' && !c.repliedToCampaign) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.phone || '').includes(q) ||
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className={`whatsapp-inbox-container ${selectedLeadId ? 'mobile-chat-open' : ''}`} style={{ height: '100%', overflow: 'hidden' }}>
      {/* Sidebar (Left) */}
      <div className="whatsapp-sidebar">
        {/* Search */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                border: 'none', background: 'none', outline: 'none',
                flex: 1, padding: '8px 12px', fontSize: '14px',
              }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e9edef', padding: '0 12px' }}>
          {['all', 'unread', 'read', 'campaign'].map(f => (
            <button
              key={f}
              onClick={() => setInboxFilter(f)}
              style={{
                padding: '12px 10px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: inboxFilter === f ? 600 : 400,
                color: inboxFilter === f ? BRAND_BLUE : '#667781',
                background: 'none',
                borderBottom: inboxFilter === f ? `3px solid ${BRAND_BLUE}` : '3px solid transparent',
              }}
            >
              {f === 'all' ? `All` :
               f === 'unread' ? `Unread` :
               f === 'read' ? `Read` : `Campaigns`}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              No conversations found.
            </div>
          ) : (
            filteredConversations.map(convo => (
              <div
                key={convo.id}
                onClick={() => setSelectedLeadId(convo.id)}
                className={`sidebar-item ${selectedLeadId === convo.id ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#dfe5e7', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontWeight: 500, color: '#54656f', fontSize: '1.1rem' }}>
                    {(convo.contactName || convo.phone || 'C').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {/* Top Row: Lead Status Pill Badge & Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <LeadStatusBadge stage={convo.lead?.stage} />
                    <span style={{ fontSize: '12px', color: '#667781', fontWeight: '400' }}>
                      {formatTime(convo.lastMessageAt)}
                    </span>
                  </div>

                  {/* Middle Row: Lead Name */}
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#111b21', marginTop: '1px' }}>
                    {convo.contactName || formatPhone(convo.phone)}
                  </div>

                  {/* Bottom Row: Message preview & unread badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 1 }}>
                    <span style={{
                      fontSize: '13px', color: '#667781',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {convo.lastDirection === 'outbound' && <StatusIcon status="read" size={14} />} {convo.lastMessage}
                    </span>
                    {convo.unreadCount > 0 && (
                      <span style={{
                        background: '#25d366', color: '#fff', borderRadius: '50%',
                        width: 20, height: 20, fontSize: '11px', fontWeight: 700,
                        display: 'grid', placeItems: 'center', flexShrink: 0
                      }}>
                        {convo.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area (Right) */}
      <div className="whatsapp-chat-area">
        {selectedLeadId ? (
          <>
            {/* Header */}
            <div className="whatsapp-header chat-active-header">
              <div className="chat-header-info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Mobile Back Button */}
                <button 
                  className="mobile-back-btn"
                  onClick={() => setSelectedLeadId(null)}
                  style={{
                    background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#54656f'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div className="chat-header-avatar" style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#dfe5e7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontWeight: 500, color: '#54656f' }}>
                    {(selectedConvo?.contactName || selectedConvo?.phone || 'C').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="chat-header-text">
                  <div className="chat-header-name" style={{ fontWeight: 500, fontSize: '15px', color: '#0f172a' }}>{selectedConvo?.contactName || formatPhone(selectedConvo?.phone)}</div>
                  <div className="chat-header-phone" style={{ fontSize: '12px', color: '#667781' }}>{formatPhone(selectedConvo?.phone)}</div>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 5%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', fontSize: '14px' }}>
                  <MessageCircle size={48} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No messages in this chat. Send a message to start.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound' || msg.sender === 'counselor';
                  return (
                    <div key={msg.id} className={`message-bubble ${isOutbound ? 'bubble-outbound' : 'bubble-inbound'}`}>
                      <div style={{ color: '#0f172a', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      <div className="message-time">
                        {getDisplayTime(msg)}
                        {isOutbound && <StatusIcon status={msg.status || 'read'} size={15} />}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attached File Preview */}
            {attachedFile && (
              <div style={{ background: '#f0f2f5', padding: '10px 16px 0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e2e8f0', padding: '8px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{attachedFile.type === 'video' ? '🎥' : attachedFile.type === 'image' ? '🖼️' : '📄'}</span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>{attachedFile.name}</span>
                  </div>
                  <button onClick={() => setAttachedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '16px' }}>×</button>
                </div>
              </div>
            )}

            {/* Attached Template Preview */}
            {attachedTemplate && (
              <div style={{ background: '#f0f2f5', padding: attachedFile ? '4px 16px 0 16px' : '10px 16px 0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e2e8f0', padding: '8px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}><FileText size={18} color="#54656f" /></span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>Template: {attachedTemplate.name}</span>
                  </div>
                  <button onClick={() => setAttachedTemplate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '16px' }}>×</button>
                </div>
              </div>
            )}

            {/* Reply Input Bar */}
            <div className="chat-input-bar" style={{ background: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Paperclip 
                className="chat-clip-icon" 
                size={22} 
                color="#54656f" 
                style={{ cursor: 'pointer' }} 
                onClick={handleAttachClick}
                title="Attach file"
              />
              <FileText 
                className="chat-clip-icon" 
                size={22} 
                color="#54656f" 
                style={{ cursor: 'pointer' }} 
                onClick={() => setShowTemplateModal(true)}
                title="Use template"
              />
              <input
                className="chat-input-field"
                type="text"
                placeholder="Type a message"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                style={{
                  flex: 1, background: '#fff', border: 'none', borderRadius: '8px',
                  padding: '10px 14px', outline: 'none', fontSize: '15px',
                }}
              />
              <button
                className="chat-send-btn"
                onClick={handleSendReply}
                disabled={sending}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <Send size={22} color={replyText.trim() ? BRAND_BLUE : '#94a3b8'} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', color: '#667781' }}>
            <div>
              <MessageCircle size={80} strokeWidth={1} style={{ opacity: 0.2, margin: '0 auto' }} />
              <div style={{ fontSize: '24px', fontWeight: 300, marginTop: 12, color: '#0f172a' }}>WhatsApp Inbox</div>
              <p style={{ fontSize: '14px', marginTop: 6 }}>Select a conversation to start messaging.</p>
            </div>
          </div>
        )}
      </div>

      {/* Firebase Storage Modal */}
      {showStorageModal && (
        <div className="storage-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'grid', placeItems: 'center' }} onClick={() => setShowStorageModal(false)}>
          <div className="storage-modal-content" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '440px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>Select from Storage</h3>
              <button onClick={() => setShowStorageModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mockStorageFiles.map(file => (
                <div 
                  key={file.id} 
                  onClick={() => {
                    setAttachedFile(file);
                    if (showToastMsg) showToastMsg(`Attached "${file.name}" to conversation!`);
                    setShowStorageModal(false);
                  }} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '22px' }}>{file.type === 'video' ? '🎥' : file.type === 'image' ? '🖼️' : '📄'}</span>
                    <span style={{ fontWeight: '500', color: '#334155', fontSize: '14px' }}>{file.name}</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>{file.size}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Templates Modal */}
      {showTemplateModal && (
        <div className="storage-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'grid', placeItems: 'center' }} onClick={() => setShowTemplateModal(false)}>
          <div className="storage-modal-content" style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '440px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>Select WhatsApp Template</h3>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
              {metaTemplates.length === 0 && (
                <div style={{ padding: '16px', color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
                  No templates found. Make sure you sync them from Meta in the WhatsApp templates section.
                </div>
              )}
              {metaTemplates.map(template => {
                const bodyText = template.components?.find(c => c.type === 'BODY')?.text || '';
                return (
                  <div 
                    key={template.name} 
                    onClick={() => {
                      setAttachedTemplate(template);
                      setShowTemplateModal(false);
                    }} 
                    style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{template.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Search, Check, CheckCheck, Clock,
  AlertCircle, Paperclip
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
  const clean = phone.replace(/^\++/, '');
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

export default function InboxPage() {
  const { leads, sendWhatsAppMsg, updateLead, activeRole, activeUser } = useCRM();
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inboxFilter, setInboxFilter] = useState('all');
  const messagesEndRef = useRef(null);

  // Dynamically compute conversations from CRM leads
  const conversations = React.useMemo(() => {
    const contactLeads = leads.filter(lead => {
      if (activeRole === 'Counselor') {
        return lead.counselor === activeUser;
      }
      return true;
    });

    const mapped = contactLeads.map(lead => {
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
        lastMessage: lastMsg ? lastMsg.text : 'No messages yet',
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
  }, [leads, activeRole, activeUser]);

  const selectedConvo = conversations.find(c => c.id === selectedLeadId);
  const messages = selectedConvo?.lead?.whatsappMessages || [];

  // Automatically select first contact if none is active and there are contacts
  useEffect(() => {
    if (!selectedLeadId && conversations.length > 0) {
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
    if (!replyText.trim() || !selectedLeadId || sending) return;
    setSending(true);
    const text = replyText.trim();
    setReplyText('');

    sendWhatsAppMsg(selectedLeadId, text);
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
    <div className="whatsapp-inbox-container" style={{ height: '100%', overflow: 'hidden' }}>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500, fontSize: '15px', color: '#111b21' }}>
                      {convo.contactName || formatPhone(convo.phone)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#667781' }}>
                      {formatTime(convo.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
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
                        display: 'grid', placeItems: 'center',
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
            <div className="whatsapp-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#dfe5e7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontWeight: 500, color: '#54656f' }}>
                    {(selectedConvo?.contactName || selectedConvo?.phone || 'C').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '15px', color: '#0f172a' }}>{selectedConvo?.contactName || formatPhone(selectedConvo?.phone)}</div>
                  <div style={{ fontSize: '12px', color: '#667781' }}>{formatPhone(selectedConvo?.phone)}</div>
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

            {/* Reply Input Bar */}
            <div style={{ background: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Paperclip size={22} color="#54656f" style={{ cursor: 'pointer' }} />
              <input
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
                onClick={handleSendReply}
                disabled={sending}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <Send size={24} color={replyText.trim() ? BRAND_BLUE : '#54656f'} />
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
    </div>
  );
}

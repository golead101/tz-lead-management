import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Search, Check, CheckCheck, Clock,
  AlertCircle, Paperclip
} from 'lucide-react';
import { mockDb } from './mockData';

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

function formatPhone(phone) {
  if (!phone) return '';
  if (phone.length === 12 && phone.startsWith('91')) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 7)} ${phone.slice(7)}`;
  }
  return `+${phone}`;
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
      return <Clock size={size} color="#94a3b8" />;
  }
}

export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inboxFilter, setInboxFilter] = useState('all');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone);
      markAsRead(selectedPhone);
    } else {
      setMessages([]);
    }
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = () => {
    try {
      const convos = mockDb.getConversations();
      setConversations(convos);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const loadMessages = (phone) => {
    try {
      const allMsgs = mockDb.getMessages();
      const chatMsgs = allMsgs[phone] || [];
      setMessages(chatMsgs);
    } catch (error) {
      console.error(error);
    }
  };

  const markAsRead = (phone) => {
    try {
      const updated = conversations.map(c => 
        c.phone === phone ? { ...c, unreadCount: 0 } : c
      );
      mockDb.saveConversations(updated);
      setConversations(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedPhone || sending) return;
    setSending(true);

    const text = replyText.trim();
    setReplyText('');

    setTimeout(() => {
      const newMsg = {
        id: `m-${Date.now()}`,
        waMessageId: `wam-${Date.now()}`,
        direction: 'outbound',
        phone: selectedPhone,
        type: 'text',
        text: text,
        timestamp: { _seconds: Math.floor(Date.now() / 1000) },
        status: 'read',
        read: true
      };

      // Update message list
      const allMsgs = mockDb.getMessages();
      const chatMsgs = [...(allMsgs[selectedPhone] || []), newMsg];
      allMsgs[selectedPhone] = chatMsgs;
      mockDb.saveMessages(allMsgs);

      // Update conversation last message preview
      const updatedConvos = conversations.map(c => {
        if (c.phone === selectedPhone) {
          return {
            ...c,
            lastMessage: text,
            lastMessageAt: { _seconds: Math.floor(Date.now() / 1000) },
            lastDirection: 'outbound',
            unreadCount: 0
          };
        }
        return c;
      });
      mockDb.saveConversations(updatedConvos);

      setMessages(chatMsgs);
      setConversations(updatedConvos);
      setSending(false);

      // Trigger mock inbound reply from user after 1.5 seconds!
      setTimeout(() => {
        const contactObj = conversations.find(c => c.phone === selectedPhone);
        const contactName = contactObj ? contactObj.contactName : 'Student';
        
        const responseMsg = {
          id: `m-reply-${Date.now()}`,
          waMessageId: `wam-reply-${Date.now()}`,
          direction: 'inbound',
          phone: selectedPhone,
          type: 'text',
          text: `Hi! Thank you for details. This is ${contactName}. I will review this information and check with my counselor.`,
          timestamp: { _seconds: Math.floor(Date.now() / 1000) },
          status: 'delivered',
          read: false
        };

        const updatedAllMsgs = mockDb.getMessages();
        const updatedChatMsgs = [...(updatedAllMsgs[selectedPhone] || []), responseMsg];
        updatedAllMsgs[selectedPhone] = updatedChatMsgs;
        mockDb.saveMessages(updatedAllMsgs);

        const finalConvos = mockDb.getConversations().map(c => {
          if (c.phone === selectedPhone) {
            return {
              ...c,
              lastMessage: responseMsg.text,
              lastMessageAt: responseMsg.timestamp,
              lastDirection: 'inbound',
              unreadCount: 1
            };
          }
          return c;
        });
        mockDb.saveConversations(finalConvos);

        // Only update active screen if user is still viewing this contact!
        setSelectedPhone(prev => {
          if (prev === selectedPhone) {
            setMessages(updatedChatMsgs);
          }
          return prev;
        });
        setConversations(finalConvos);
      }, 1500);

    }, 800);
  };

  const filteredConversations = conversations.filter(c => {
    if (inboxFilter === 'unread' && !(c.unreadCount > 0)) return false;
    if (inboxFilter === 'read' && c.unreadCount > 0) return false;
    if (inboxFilter === 'campaign' && !c.repliedToCampaign) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.phone.includes(q) ||
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    );
  });

  const selectedConvo = conversations.find(c => c.phone === selectedPhone);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

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
          {filteredConversations.map(convo => (
            <div
              key={convo.phone}
              onClick={() => setSelectedPhone(convo.phone)}
              className={`sidebar-item ${selectedPhone === convo.phone ? 'active' : ''}`}
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
                  {(convo.contactName || convo.phone).charAt(0).toUpperCase()}
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
          ))}
        </div>
      </div>

      {/* Chat Area (Right) */}
      <div className="whatsapp-chat-area">
        {selectedPhone ? (
          <>
            {/* Header */}
            <div className="whatsapp-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#dfe5e7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontWeight: 500, color: '#54656f' }}>
                    {(selectedConvo?.contactName || selectedPhone).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '15px', color: '#0f172a' }}>{selectedConvo?.contactName || formatPhone(selectedPhone)}</div>
                  <div style={{ fontSize: '12px', color: '#667781' }}>{formatPhone(selectedPhone)}</div>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 5%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {messages.map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div key={msg.id} className={`message-bubble ${isOutbound ? 'bubble-outbound' : 'bubble-inbound'}`}>
                    <div style={{ color: '#0f172a' }}>{msg.text}</div>
                    <div className="message-time">
                      {formatMessageTime(msg.timestamp)}
                      {isOutbound && <StatusIcon status={msg.status} size={15} />}
                    </div>
                  </div>
                );
              })}
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

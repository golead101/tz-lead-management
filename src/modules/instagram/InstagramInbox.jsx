import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Search, Check, CheckCheck, AlertCircle, Clock
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { whatsappDb } from '../gowhatsapp/whatsappDb';
import InstagramFlowBuilder from './InstagramFlowBuilder';
import './instagram.css';

function formatTime(timestampStr) {
  if (!timestampStr) return '';
  const date = new Date(timestampStr);
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

function getDisplayTime(msg) {
  if (msg.timestamp) {
    const date = new Date(msg.timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return msg.time || '';
}

function StatusIcon({ status, size = 14 }) {
  switch (status) {
    case 'sending':
      return <Clock size={size} className="animate-spin text-slate-400" />;
    case 'sent':
      return <Check size={size} color="#ffffff" />;
    case 'delivered':
      return <CheckCheck size={size} color="#ffffff" />;
    case 'read':
      return <CheckCheck size={size} color="#ffffff" />;
    case 'failed':
      return <AlertCircle size={size} color="#ef4444" />;
    default:
      return <CheckCheck size={size} color="#ffffff" />;
  }
}

export default function InstagramInbox() {
  const { leads, sendInstagramMsg, updateLead } = useCRM();
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inboxFilter, setInboxFilter] = useState('all');
  const messagesEndRef = useRef(null);

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'chatbot'
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [chatbotSettings, setChatbotSettings] = useState({
    enabled: false,
    flowEnabled: false,
    flow: null,
    customReplies: []
  });
  const [editingReply, setEditingReply] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTrigger, setFormTrigger] = useState('');
  const [formReply, setFormReply] = useState('');

  // Fetch settings from local storage/Firestore via whatsappDb listener
  useEffect(() => {
    if (activeTab === 'chatbot') {
      const data = whatsappDb.getInstagramChatbotSettings();
      if (data) {
        setChatbotSettings({
          enabled: data.enabled || false,
          flowEnabled: data.flowEnabled || false,
          flow: data.flow || null,
          customReplies: data.customReplies || []
        });
      }
    }
  }, [activeTab, showFlowBuilder]);

  const handleSaveChatbotSettings = async () => {
    try {
      whatsappDb.saveInstagramChatbotSettings(chatbotSettings);
      alert('Instagram chatbot settings saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    }
  };

  const handleAddOrUpdateReply = (e) => {
    e.preventDefault();
    if (!formTrigger.trim() || !formReply.trim()) return;

    setChatbotSettings(prev => {
      const updatedReplies = editingReply
        ? prev.customReplies.map(r => r.id === editingReply.id ? { ...r, trigger: formTrigger.trim(), reply: formReply.trim() } : r)
        : [...prev.customReplies, { id: 'ig-r-' + Date.now(), trigger: formTrigger.trim(), reply: formReply.trim() }];
      return { ...prev, customReplies: updatedReplies };
    });

    setFormTrigger('');
    setFormReply('');
    setEditingReply(null);
    setShowAddForm(false);
  };

  const handleDeleteReply = (id) => {
    if (window.confirm('Are you sure you want to delete this auto-reply rule?')) {
      setChatbotSettings(prev => ({
        ...prev,
        customReplies: prev.customReplies.filter(r => r.id !== id)
      }));
    }
  };

  const handleStartEdit = (reply) => {
    setEditingReply(reply);
    setFormTrigger(reply.trigger);
    setFormReply(reply.reply);
    setShowAddForm(true);
  };

  const renderChatbotSettings = () => {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
        {/* Toggle Card */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Enable Instagram Auto-Replies</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: 4, marginBottom: 0 }}>
                When enabled, the chatbot will automatically respond to matching incoming Instagram DM triggers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={chatbotSettings.enabled} 
                onChange={(e) => setChatbotSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                style={{ width: 44, height: 24, accentColor: '#E1306C', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>

        {/* Section 1 - Stateful Conversation Flow Card */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 44, height: 44, background: 'rgba(225, 48, 108, 0.1)', color: '#E1306C', borderRadius: '10px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Conversation Flow</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: 4, marginBottom: 0 }}>
                  Main Lead Capture Flow • {chatbotSettings.flow?.nodes?.length || 7} Steps
                </p>
                
                {/* Enable toggle for flow */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={chatbotSettings.flowEnabled}
                    onChange={(e) => setChatbotSettings(prev => ({ ...prev, flowEnabled: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: '#E1306C', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Enable Conversational Flow</span>
                </label>
              </div>
            </div>

            <button 
              onClick={() => setShowFlowBuilder(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'white', color: '#E1306C', border: '1px solid #E1306C', borderRadius: 8,
                padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(225, 48, 108, 0.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              Open Flow Builder →
            </button>
          </div>
        </div>

        {/* Section 2 - Quick Auto-Reply Rules */}
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>⚡ Quick Auto-Reply Rules</h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: 4, marginBottom: 0 }}>
                Useful for simple independent replies. Do NOT force simple rules into the visual flow.
              </p>
            </div>
            {!showAddForm && (
              <button 
                onClick={() => { setShowAddForm(true); setEditingReply(null); setFormTrigger(''); setFormReply(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#E1306C', color: '#ffffff', border: 'none', borderRadius: 8,
                  padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Add Rule
              </button>
            )}
          </div>

          {showAddForm && (
            <form onSubmit={handleAddOrUpdateReply} style={{ background: '#f8fafc', borderRadius: 8, padding: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{editingReply ? 'Edit Rule' : 'New Rule'}</div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: 4 }}>
                  Triggers (comma separated)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. hi, hello, hey" 
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: 4 }}>
                  Response Text
                </label>
                <textarea 
                  placeholder="Type the automatic response here..." 
                  value={formReply}
                  onChange={(e) => setFormReply(e.target.value)}
                  required
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '14px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifycontent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button 
                  type="button" 
                  onClick={() => { setShowAddForm(false); setEditingReply(null); }}
                  style={{ background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ background: '#E1306C', color: '#ffffff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {editingReply ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          )}

          {chatbotSettings.customReplies.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              No custom auto-reply rules configured yet. Click "Add Rule" to create one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatbotSettings.customReplies.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0, paddingRight: 16 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(r.trigger || '').split(',').map((t, idx) => (
                        <span key={idx} style={{ background: 'rgba(225, 48, 108, 0.1)', color: '#E1306C', fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.reply}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button 
                      onClick={() => handleStartEdit(r)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                      title="Edit"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteReply(r.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                      title="Delete"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button 
            onClick={handleSaveChatbotSettings}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#22c55e', color: '#ffffff', border: 'none', borderRadius: 8,
              padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.2)'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    );
  };

  // Filter and map leads with Instagram integration details
  const conversations = React.useMemo(() => {
    const leadsWithIg = leads.filter(lead => lead.instagramUserId || (lead.instagramMessages && lead.instagramMessages.length > 0));

    // Group leads by instagramUserId to avoid duplicate conversations
    const grouped = {};
    leadsWithIg.forEach(lead => {
      const igUserId = lead.instagramUserId || lead.id || '';
      if (!igUserId) return;

      const existing = grouped[igUserId];
      if (!existing) {
        grouped[igUserId] = lead;
      } else {
        // Prefer the lead that contains more or latest instagramMessages
        const existingMsgs = existing.instagramMessages || [];
        const currentMsgs = lead.instagramMessages || [];
        if (currentMsgs.length > existingMsgs.length) {
          grouped[igUserId] = lead;
        } else if (currentMsgs.length === existingMsgs.length) {
          const existingTime = new Date(existing.lastContacted || existing.createdDate || 0).getTime();
          const currentTime = new Date(lead.lastContacted || lead.createdDate || 0).getTime();
          if (currentTime > existingTime) {
            grouped[igUserId] = lead;
          }
        }
      }
    });

    return Object.values(grouped)
      .map(lead => {
        const msgs = lead.instagramMessages || [];
        const lastMsg = msgs[msgs.length - 1];
        
        const lastMessageAt = lastMsg ? (lastMsg.timestamp || lead.lastContacted || lead.createdDate) : (lead.lastContacted || lead.createdDate);
        
        // Identity prioritization:
        // 1. instagramUsername
        // 2. lead.name if it doesn't start with "Instagram User"
        // 3. Fallback: Instagram User <instagramUserId>
        let displayName = lead.instagramUsername || '';
        if (!displayName && lead.name && !lead.name.startsWith('Instagram User')) {
          displayName = lead.name;
        }
        if (!displayName) {
          displayName = `Instagram User ${lead.instagramUserId || lead.id}`;
        }

        return {
          id: lead.id,
          instagramUserId: lead.instagramUserId || '',
          contactName: displayName,
          lastMessage: lastMsg ? lastMsg.text : 'No messages yet',
          lastMessageAt: lastMessageAt || new Date().toISOString(),
          lastDirection: lastMsg ? (lastMsg.sender === 'counselor' ? 'outbound' : 'inbound') : null,
          lead
        };
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [leads]);

  const selectedConvo = conversations.find(c => c.id === selectedLeadId);
  const messages = selectedConvo?.lead?.instagramMessages || [];

  // Desktop auto-select first conversation
  useEffect(() => {
    if (!selectedLeadId && conversations.length > 0 && window.innerWidth > 768) {
      setTimeout(() => {
        setSelectedLeadId(conversations[0].id);
      }, 0);
    }
  }, [selectedLeadId, conversations]);

  // Reset selectedLeadId if it is not in the conversations list anymore (e.g. during logout)
  useEffect(() => {
    if (selectedLeadId && !conversations.some(c => c.id === selectedLeadId)) {
      setSelectedLeadId(null);
    }
  }, [selectedLeadId, conversations]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedLeadId || sending) return;

    setSending(true);
    const textToSend = replyText.trim();
    setReplyText(''); // Clear input optimistically

    const result = await sendInstagramMsg(selectedLeadId, textToSend);
    setSending(false);
    
    if (result && !result.success) {
      // If sending failed, restore the reply text so they don't lose it
      setReplyText(textToSend);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (inboxFilter === 'unread') return false; // Not supported by standard IG webhook schema
    if (inboxFilter === 'read') return true;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      c.instagramUserId.toLowerCase().includes(q)
    );
  });

  if (showFlowBuilder) {
    return (
      <div className="gowhatsapp-scope instagram-scope" style={{ padding: '20px', background: '#f8fafc', height: '100%', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Instagram Chatbot Flow Builder</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Configure stateful conversational lead-capture rules</p>
          </div>
        </div>
        <InstagramFlowBuilder 
          flowData={chatbotSettings.flow} 
          onSave={(updatedFlow) => {
            const newSettings = { ...chatbotSettings, flow: updatedFlow, flowEnabled: true };
            setChatbotSettings(newSettings);
            whatsappDb.saveInstagramChatbotSettings(newSettings);
            alert('Instagram chatbot conversational flow saved successfully!');
            setShowFlowBuilder(false);
          }} 
          onClose={() => setShowFlowBuilder(false)} 
        />
      </div>
    );
  }

  return (
    <div className={`gowhatsapp-scope instagram-scope whatsapp-inbox-container ${selectedLeadId ? 'mobile-chat-open' : ''}`}>
      {/* Top Tab Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 24px',
        borderBottom: '1px solid #e2e8f0',
        background: '#ffffff',
        zIndex: 20,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => setActiveTab('chats')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'chats' ? '#E1306C' : '#64748b',
              borderBottom: activeTab === 'chats' ? '2px solid #E1306C' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'chatbot' ? '#E1306C' : '#64748b',
              borderBottom: activeTab === 'chatbot' ? '2px solid #E1306C' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            Chatbot Auto-Replies
          </button>
        </div>
      </div>

      {activeTab === 'chats' ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar (Left) */}
      <div className="whatsapp-sidebar" style={{ borderRight: '1px solid #e2e8f0' }}>
        {/* Search */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search Instagram chats..."
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
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 12px' }}>
          {['all', 'read'].map(f => (
            <button
              key={f}
              onClick={() => setInboxFilter(f)}
              className={inboxFilter === f ? 'tab-active-indicator' : ''}
              style={{
                padding: '12px 10px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: inboxFilter === f ? 600 : 400,
                color: '#667781',
                background: 'none',
                borderBottom: '3px solid transparent',
              }}
            >
              {f === 'all' ? 'All' : 'Read'}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              No Instagram conversations found.
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
                {/* Avatar (Instagram gradient background) */}
                <div 
                  className="avatar-instagram" 
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '1.1rem' }}>
                    {convo.contactName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                      {convo.contactName}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {formatTime(convo.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{
                      fontSize: '13px', color: '#64748b',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {convo.lastMessage}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area (Right) */}
      <div className="whatsapp-chat-area">
        {selectedConvo ? (
          <>
            {/* Header */}
            <div className="instagram-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Mobile Back Button */}
                <button 
                  className="mobile-back-btn"
                  onClick={() => setSelectedLeadId(null)}
                  style={{
                    background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div 
                  className="avatar-instagram" 
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>
                    {(selectedConvo?.contactName || '').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>{selectedConvo?.contactName}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Instagram Direct</div>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 5%', display: 'flex', flexDirection: 'column', gap: 8, background: '#fafafa' }}>
              {messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', fontSize: '14px' }}>
                  <MessageCircle size={48} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No messages in this chat. Send a message to start.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutbound = msg.sender === 'counselor' || msg.direction === 'outbound';
                  return (
                    <div key={msg.id} className={`message-bubble ${isOutbound ? 'bubble-outbound' : 'bubble-inbound'}`}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      <div className="message-time">
                        {getDisplayTime(msg)}
                        {isOutbound && (
                          msg.status === 'sending' ? (
                            <span className="status-sending">sending...</span>
                          ) : msg.status === 'failed' ? (
                            <span className="status-failed" title="Message failed to send. Try copy-pasting and sending again.">⚠️ failed</span>
                          ) : (
                            <StatusIcon status={msg.status || 'sent'} />
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Counselor Resume Banner */}
            {selectedConvo?.lead?.botPaused && (
              <div style={{
                background: '#fffbeb',
                borderTop: '1px solid #fef3c7',
                borderBottom: '1px solid #fef3c7',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px',
                color: '#b45309'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} color="#d97706" />
                  <span><strong>Chatbot Paused</strong>: Counselor handoff is active for this conversation.</span>
                </div>
                <button
                  onClick={() => {
                    updateLead(selectedConvo.id, {
                      botPaused: false,
                      handoffRequired: false,
                      chatbotState: null
                    });
                  }}
                  style={{
                    background: '#d97706',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  Resume Chatbot
                </button>
              </div>
            )}

            {/* Reply Input Bar */}
            <div className="chat-input-bar" style={{ background: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                className="chat-input-field"
                type="text"
                placeholder="Type a message..."
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
                disabled={sending || !replyText.trim()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <Send size={22} color={replyText.trim() ? '#E1306C' : '#94a3b8'} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', color: '#64748b' }}>
            <div>
              <MessageCircle size={80} strokeWidth={1} style={{ opacity: 0.2, margin: '0 auto', color: '#E1306C' }} />
              <div style={{ fontSize: '24px', fontWeight: 300, marginTop: 12, color: '#0f172a' }}>Instagram Inbox</div>
              <p style={{ fontSize: '14px', marginTop: 6 }}>Select an Instagram conversation to start messaging.</p>
            </div>
          </div>
        )}
        </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
          {renderChatbotSettings()}
        </div>
      )}
    </div>
  );
}

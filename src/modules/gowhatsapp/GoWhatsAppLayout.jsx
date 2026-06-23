import React, { useState } from 'react';
import {
  MessageCircle,
  LayoutDashboard,
  Send,
  Users,
  FileText,
  Settings,
  ArrowLeft,
  Inbox,
  TrendingUp,
  Bot
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

const BRAND_BLUE = '#2563eb';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Inbox', icon: Inbox, view: 'inbox' },
  { label: 'New Campaign', icon: Send, view: 'new-campaign' },
  { label: 'Campaigns', icon: TrendingUp, view: 'campaigns' }, // Wait, in friend's code it used BarChart3 for campaigns, we can use TrendingUp or other icons
  { label: 'Contacts', icon: Users, view: 'contacts' },
  { label: 'Templates', icon: FileText, view: 'templates' },
  { label: 'Chatbot', icon: Bot, view: 'chatbot' }
];

const GoWhatsAppLayout = ({ children, subView, setSubView }) => {
  const { activeUser, setActiveView } = useCRM();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = activeUser || 'User';

  const handleNavClick = (view) => {
    setSubView(view);
    setMobileOpen(false);
  };

  const handleBackToDashboard = () => {
    setActiveView('dashboard');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ flex: 1, padding: subView === 'inbox' ? 0 : '24px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default GoWhatsAppLayout;

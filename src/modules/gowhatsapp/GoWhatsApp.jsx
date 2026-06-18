import React, { useState } from 'react';
import './gowhatsapp.css';
import GoWhatsAppDashboard from './GoWhatsAppDashboard';
import NewCampaign from './NewCampaign';
import CampaignsList from './CampaignsList';
import CampaignReport from './CampaignReport';
import ContactsPage from './ContactsPage';
import TemplatesPage from './TemplatesPage';
import SettingsPage from './SettingsPage';
import InboxPage from './InboxPage';
import AnalyticsPage from './AnalyticsPage';
import ChatbotSettingsPage from './ChatbotSettingsPage';
import GoWhatsAppLayout from './GoWhatsAppLayout';

const GoWhatsApp = () => {
  // Persist subView to sessionStorage so page refresh stays on same tab
  const [subView, setSubViewRaw] = useState(
    () => sessionStorage.getItem('gowha_subview') || 'dashboard'
  );
  const setSubView = (view) => {
    sessionStorage.setItem('gowha_subview', view);
    setSubViewRaw(view);
  };
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [reusedCampaign, setReusedCampaign] = useState(null);

  const navigateToCampaignReport = (id) => {
    setSelectedCampaignId(id);
    setSubView('campaign-report');
  };

  const getContent = () => {
    switch (subView) {
      case 'inbox':
        return <InboxPage />;
      case 'analytics':
        return <AnalyticsPage setSubView={setSubView} />;
      case 'chatbot':
        return <ChatbotSettingsPage />;
      case 'new-campaign':
        return <NewCampaign setSubView={setSubView} reusedCampaign={reusedCampaign} />;
      case 'campaign-report':
        return <CampaignReport campaignId={selectedCampaignId} setSubView={setSubView} />;
      case 'campaigns':
        return <CampaignsList setSubView={setSubView} navigateToReport={navigateToCampaignReport} setReusedCampaign={setReusedCampaign} />;
      case 'contacts':
        return <ContactsPage />;
      case 'templates':
        return <TemplatesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <GoWhatsAppDashboard setSubView={setSubView} navigateToReport={navigateToCampaignReport} />;
    }
  };

  return (
    <div className="gowhatsapp-scope">
      <GoWhatsAppLayout subView={subView} setSubView={setSubView}>
        <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {getContent()}
        </div>
      </GoWhatsAppLayout>
    </div>
  );
};

export default GoWhatsApp;

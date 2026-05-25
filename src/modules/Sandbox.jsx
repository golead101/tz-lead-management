import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function Sandbox() {
  const { addLead, courses } = useCRM();

  // Sandbox Form States
  const [sbName, setSbName] = useState('');
  const [sbEmail, setSbEmail] = useState('');
  const [sbPhone, setSbPhone] = useState('');
  const [sbLocation, setSbLocation] = useState('Pune');
  const [sbCourse, setSbCourse] = useState(courses[0]?.name || 'Full-Stack Web Development');
  const [sbSource, setSbSource] = useState('Website Form');

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Auto sync to CRM context instantly in real-time!
    addLead({
      name: sbName,
      email: sbEmail,
      phone: sbPhone,
      location: sbLocation,
      course: sbCourse,
      source: sbSource,
      priority: 'Hot' // Website submissions are marked Hot by default
    });

    setSubmitted(true);
    
    // Clear Form after brief timeout
    setTimeout(() => {
      setSbName('');
      setSbEmail('');
      setSbPhone('');
      setSubmitted(false);
    }, 4000);
  };

  // Developer code integration template
  const codeSnippet = `<!-- Lead Management CRM Lead Capture Widget -->
<form id="institute-lead-form">
  <input type="text" name="student_name" placeholder="Name" required />
  <input type="email" name="student_email" placeholder="Email" required />
  <input type="tel" name="student_phone" placeholder="Phone" required />
  <select name="interested_course">
    <option value="Full-Stack Web Development">Web Dev</option>
    <option value="Data Science & AI">Data Science & AI</option>
  </select>
  
  <!-- Campaign UTM Tracking Parameters -->
  <input type="hidden" name="utm_source" value="GoogleSearchAds" />
  <input type="hidden" name="utm_campaign" value="WebDev_June2026" />
  
  <button type="submit">Submit Inquiry</button>
</form>

<script>
  document.getElementById('institute-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const leadData = Object.fromEntries(formData.entries());

    // Pipes lead data directly into institute Firebase DB hook in real-time
    try {
      const response = await fetch('https://crm-api.your-institute.com/v1/webhooks/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_INSTITUTE_API_TOKEN' },
        body: JSON.stringify(leadData)
      });
      if (response.ok) alert('Application submitted successfully!');
    } catch(err) {
       console.error('CRM sync error:', err);
    }
  });
</script>`;

  return (
    <div className="fade-in">
      <div className="welcome-header">
        <h2 className="welcome-title">Lead Integration Sandbox</h2>
        <p className="welcome-subtitle">Integrate existing landing pages, WordPress grids, or Google Forms to auto-capture student inquiries instantly.</p>
      </div>

      <div className="sandbox-split">
        {/* Left Hand: Developer copyable snippet */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">Copyable Capture Webhook Snippet</h3>
            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>HTML5 / Javascript</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Copy-paste this lightweight inline script into the footer of your main WordPress, Wix, Webflow landing forms to sync inquiries.
          </p>

          <div className="code-viewer-block">
            <div className="code-header-bar">
              <span>embed-snippet.html</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(codeSnippet);
                  alert('Integration code copied to clipboard!');
                }}
                style={{ color: 'var(--primary-light)', fontSize: '10px', fontWeight: '700' }}
              >
                Copy Code
              </button>
            </div>
            <pre className="code-pre">{codeSnippet}</pre>
          </div>
        </div>

        {/* Right Hand: Visual mock website sandbox form */}
        <div className="dashboard-panel">
          <h3 className="panel-title" style={{ marginBottom: '14px' }}>Visual Sandbox Integration Simulator</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Submit an inquiry through this mock student landing form and watch it instantly propagate inside the pipeline board!
          </p>

          <div className="mock-browser-frame">
            <div className="browser-header-mockup">
              <div className="browser-dot" />
              <div className="browser-dot" />
              <div className="browser-dot" />
              <div className="browser-url-bar">https://academy-course-admissions.com/enroll</div>
            </div>

            <div className="browser-content" style={{ background: '#f9fafb' }}>
              {submitted ? (
                <div className="text-center fade-in" style={{ padding: '40px 0' }}>
                  <div className="profile-avatar" style={{ margin: '0 auto 12px', background: 'var(--primary)', color: '#ffffff' }}>
                    ✓
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}>Inquiry Submitted Successfully!</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Capturing webhook sync to your dashboard database. Switch navigation tabs to check it out in real-time!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center', marginBottom: '4px' }}>Student Inquiry Form</h4>
                  
                  <div className="form-group" style={{ marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Student Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required
                      placeholder="e.g. Rohan Malhotra"
                      style={{ background: '#ffffff', borderColor: 'var(--border-color)', height: '34px', fontSize: '12px', color: 'var(--text-primary)' }}
                      value={sbName}
                      onChange={(e) => setSbName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Email ID</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      required
                      placeholder="rohan@gmail.com"
                      style={{ background: '#ffffff', borderColor: 'var(--border-color)', height: '34px', fontSize: '12px', color: 'var(--text-primary)' }}
                      value={sbEmail}
                      onChange={(e) => setSbEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Contact Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required
                      placeholder="+91 96543 21098"
                      style={{ background: '#ffffff', borderColor: 'var(--border-color)', height: '34px', fontSize: '12px', color: 'var(--text-primary)' }}
                      value={sbPhone}
                      onChange={(e) => setSbPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Program of Interest</label>
                    <select 
                      className="form-control"
                      style={{ background: '#ffffff', borderColor: 'var(--border-color)', height: '34px', fontSize: '12px', color: 'var(--text-primary)' }}
                      value={sbCourse}
                      onChange={(e) => setSbCourse(e.target.value)}
                    >
                      {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group two-col" style={{ marginBottom: '0' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Location</label>
                      <select 
                        className="form-control"
                        style={{ background: '#ffffff', borderColor: 'var(--border-color)', height: '34px', fontSize: '12px', color: 'var(--text-primary)' }}
                        value={sbLocation}
                        onChange={(e) => setSbLocation(e.target.value)}
                      >
                        <option value="Pune">Pune</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Bangalore">Bangalore</option>
                        <option value="Delhi">Delhi</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Lead Source</label>
                      <select 
                        className="form-control"
                        style={{ background: '#ffffff', borderColor: 'var(--border-color)', height: '34px', fontSize: '12px', color: 'var(--text-primary)' }}
                        value={sbSource}
                        onChange={(e) => setSbSource(e.target.value)}
                      >
                        <option value="Website Form">Website Form Widget</option>
                        <option value="Meta Ads">Instagram Lead Form</option>
                        <option value="Google Search">Google Lead Form</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="primary-btn w-full mt-4" 
                    style={{ background: 'var(--primary)', color: '#ffffff', fontWeight: '700', boxShadow: '0 4px 12px var(--primary-glow)' }}
                  >
                    Submit Admissions Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { verifySoftwareLicense } from '../utils/licenseChecker';

export default function ActivationScreen({ status, currentProjectId, onLicenseActivated }) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // File drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processLicenseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processLicenseFile(e.target.files[0]);
    }
  };

  const processLicenseFile = async (file) => {
    setErrorMsg('');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const parsed = JSON.parse(text);

        // Verification call
        const checkResult = await verifySoftwareLicense(parsed, currentProjectId);
        if (checkResult.success) {
          if (window.__TAURI__) {
            try {
              await window.__TAURI__.core.invoke('write_license_file', { contents: text });
            } catch (err) {
              setErrorMsg("Failed to write license file to disk: " + err.message);
              setIsProcessing(false);
              return;
            }
          } else {
            localStorage.setItem('crm_license_file', text);
          }
          onLicenseActivated();
        } else {
          const reasons = {
            id_mismatch: "This license file is bound to another database configuration (Project ID mismatch).",
            expired: "This license file has expired.",
            tampered: "This license signature is invalid or has been modified.",
            missing: "Invalid license file structure."
          };
          setErrorMsg(reasons[checkResult.reason] || "License verification failed. Please try again.");
        }
      } catch (err) {
        setErrorMsg("Failed to parse license file. Please upload a valid license.dat JSON file.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Error reading file.");
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const [localMachineId, setLocalMachineId] = React.useState('Fetching...');

  React.useEffect(() => {
    if (window.__TAURI__) {
      window.__TAURI__.core.invoke('get_machine_id')
        .then(id => setLocalMachineId(id))
        .catch(err => setLocalMachineId('N/A (Error querying ID)'));
    } else {
      setLocalMachineId('N/A (Browser Mode)');
    }
  }, []);

  // Status-specific copy
  const getStatusDetails = () => {
    switch (status) {
      case 'hardware_mismatch':
        return {
          title: "Hardware Lock Active",
          desc: "This license file is locked to a different workstation. Please register a valid license matching this computer's Machine ID.",
          color: "var(--color-followup)",
          badge: "Hardware Mismatch"
        };
      case 'expired':
        return {
          title: "Evaluation Period Expired",
          desc: "Your CRM trial evaluation phase has completed. To keep accessing lead registers and counselor pipelines, please upload a permanent license key file below.",
          color: "var(--color-followup)",
          badge: "Trial Expired"
        };
      case 'rollback':
        return {
          title: "System Date Discrepancy",
          desc: "Clock tampering has been detected on this workstation. Please sync your computer date and time settings to the actual current date to restore CRM operations.",
          color: "var(--color-interested)",
          badge: "Clock Rollback"
        };
      case 'tampered':
      case 'invalid':
        return {
          title: "Verification Failure",
          desc: "The licensing payload integrity check has failed. The file signatures do not match our keys. Please make sure you are using an unmodified license.dat file.",
          color: "#ef4444",
          badge: "Invalid Signature"
        };
      case 'id_mismatch':
        return {
          title: "Database Domain Mismatch",
          desc: `This license is configured for a different Firestore database. This instance is locked to project: [${currentProjectId}]. Please upload the correct client file.`,
          color: "var(--color-new)",
          badge: "ID Mismatch"
        };
      default:
        return {
          title: "Activation Required",
          desc: "Welcome to the Lead Management CRM. This installation requires a valid license payload to access databases and start lead management routes.",
          color: "var(--primary)",
          badge: "Unlicensed Instance"
        };
    }
  };

  const info = getStatusDetails();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'var(--dark-bg)',
      fontFamily: 'var(--font-body)',
      padding: '20px',
      overflow: 'auto',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: 'var(--dark-surface-solid)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '36px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04)',
        textAlign: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Top visual accent */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: 'var(--radius-md)',
          background: `${info.color}15`,
          color: info.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          fontSize: '24px',
          fontWeight: 'bold',
          lineHeight: '54px'
        }}>
          🛡️
        </div>

        {/* Lock Label */}
        <div>
          <span style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            fontWeight: '700',
            letterSpacing: '1px',
            color: info.color,
            background: `${info.color}15`,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)'
          }}>
            {info.badge}
          </span>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '22px',
            fontWeight: '800',
            marginTop: '12px',
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px'
          }}>
            {info.title}
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginTop: '8px',
            lineHeight: '1.6'
          }}>
            {info.desc}
          </p>
        </div>

        {/* Dynamic Firebase Project Info */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{
            fontSize: '11px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Database Lock (Project ID):</span>
            <strong style={{ color: 'var(--text-primary)' }}>{currentProjectId}</strong>
          </div>

          <div style={{
            fontSize: '11px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Workstation Machine ID:</span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '10px' }}>{localMachineId}</strong>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '40px 20px',
            background: dragActive ? 'var(--primary-glow)' : 'transparent',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            position: 'relative'
          }}
        >
          <input
            type="file"
            id="file-upload"
            accept=".dat"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {isProcessing ? "Processing File..." : "Drag & Drop license.dat"}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              or click here to browse files
            </div>
          </label>
        </div>

        {/* Error Notification Banner */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Lead Management Platform v1.0.0 &copy; 2026. All rights reserved.
        </div>
      </div>
    </div>
  );
}

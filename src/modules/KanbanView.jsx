import React, { useState, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import DetailTimeline from './DetailTimeline';

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGE_META = {
  'New Lead':       { color: '#3b82f6', light: '#eff6ff', icon: '👤' },
  'Contacted':      { color: '#22c55e', light: '#f0fdf4', icon: '📞' },
  'Interested':     { color: '#a855f7', light: '#fdf4ff', icon: '⭐' },
  'Demo Scheduled': { color: '#eab308', light: '#fefce8', icon: '📅' },
  'Demo Attended':  { color: '#14b8a6', light: '#f0fdfa', icon: '🖥️' },
  'Follow-up':      { color: '#f97316', light: '#fff7ed', icon: '🔄' },
  'Free Class':     { color: '#ec4899', light: '#fdf2f8', icon: '🎓' },
  'Not Interested': { color: '#94a3b8', light: '#f8fafc', icon: '❌' },
  'Converted':      { color: '#16a34a', light: '#f0fdf4', icon: '✅' },
  'Closed':         { color: '#a3a3a3', light: '#fafafa', icon: '🔒' },
};

const VISIBLE_STAGES = [
  'New Lead', 'Contacted', 'Interested', 'Demo Scheduled',
  'Demo Attended', 'Follow-up', 'Free Class', 'Converted',
];

function getInitials(name = '') {
  return name.trim().split(' ').map(p => p[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
}

// ── Lead Card ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, onOpen, onDragStart }) {
  const [hovered, setHovered] = useState(false);
  const hue = (lead.name || 'L').charCodeAt(0) * 7 % 360;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onClick={() => onOpen(lead.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: `1px solid ${hovered ? '#c7d7f0' : '#e8edf4'}`,
        padding: '13px 14px',
        cursor: 'grab',
        transition: 'box-shadow 0.15s, transform 0.12s, border-color 0.12s',
        boxShadow: hovered ? '0 6px 18px rgba(0,0,0,0.11)' : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        userSelect: 'none',
      }}
    >
      {/* Avatar + name/phone */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: `hsl(${hue},50%,90%)`, color: `hsl(${hue},55%,35%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11.5px', fontWeight: '800',
        }}>
          {getInitials(lead.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lead.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '1px' }}>
            {lead.phone || '—'}
          </div>
        </div>
        {lead.temperature && lead.temperature !== 'Unassigned' && (
          <span style={{ fontSize: '14px', flexShrink: 0 }} title={lead.temperature}>
            {lead.temperature === 'Hot' ? '🔥' : lead.temperature === 'Cold' ? '❄️' : '☀️'}
          </span>
        )}
      </div>

      {/* Course pill */}
      {lead.course && (
        <div style={{
          marginTop: '9px', fontSize: '10.5px', fontWeight: '600',
          background: '#f1f5f9', color: '#475569',
          borderRadius: '6px', padding: '3px 9px', display: 'inline-block',
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lead.course}
        </div>
      )}

      {/* Meta row */}
      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {lead.source && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {lead.source === 'Walk-in' && lead.subSource ? `Walk-in (${lead.subSource})` : lead.source}
          </div>
        )}
        {lead.counselor && lead.counselor !== 'Unassigned' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {lead.counselor}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, onOpen, onDragStart, onDrop }) {
  const [dragOver, setDragOver] = useState(false);
  const meta = STAGE_META[stage] || { color: '#64748b', light: '#f8fafc', icon: '•' };

  return (
    <div style={{
      width: '265px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRadius: '12px',
      overflow: 'hidden',
      border: `1px solid ${dragOver ? meta.color : '#e2e8f0'}`,
      transition: 'border-color 0.15s',
      boxShadow: dragOver ? `0 0 0 2px ${meta.color}40` : 'none',
    }}>
      {/* Column header */}
      <div style={{
        background: meta.light,
        borderBottom: `3px solid ${meta.color}`,
        padding: '11px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '15px' }}>{meta.icon}</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', flex: 1 }}>{stage}</span>
        <span style={{
          background: meta.color, color: '#fff',
          borderRadius: '12px', padding: '2px 9px',
          fontSize: '11px', fontWeight: '800', minWidth: '24px', textAlign: 'center',
        }}>
          {leads.length}
        </span>
      </div>

      {/* Droppable card area — fixed height, scrolls vertically inside the box */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(e, stage); }}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '10px 9px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: dragOver ? `${meta.color}08` : meta.light,
          transition: 'background 0.15s',
          minHeight: 0,
          maxHeight: 'calc(100vh - 215px)',
        }}
      >
        {leads.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic', textAlign: 'center',
            padding: '20px 8px', border: `2px dashed ${dragOver ? meta.color : '#e2e8f0'}`,
            borderRadius: '8px', transition: 'border-color 0.15s',
          }}>
            {dragOver ? 'Drop here' : 'No leads'}
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onOpen={onOpen} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main KanbanView ───────────────────────────────────────────────────────────
export default function KanbanView() {
  const {
    leads, courses, counselors, pipelineStages,
    activeRole, activeUser, searchQuery,
    setSelectedLeadId, updateLeadStage,
  } = useCRM();

  // Filters
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterTemp, setFilterTemp] = useState('All');
  const [filterCounselor, setFilterCounselor] = useState(activeRole === 'Counselor' ? activeUser : 'All');
  const [filterSource, setFilterSource] = useState('All');
  const [search, setSearch] = useState('');

  // Local modal state — opens on this page, no redirect
  const [modalLeadId, setModalLeadId] = useState(null);

  // Drag state
  const dragLeadId = useRef(null);

  const handleDragStart = (e, leadId) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, targetStage) => {
    const id = dragLeadId.current;
    if (!id) return;
    const lead = leads.find(l => l.id === id);
    if (lead && lead.stage !== targetStage) {
      updateLeadStage(id, targetStage, `Stage moved to "${targetStage}" via Kanban drag.`);
    }
    dragLeadId.current = null;
  };

  const handleOpenCard = (id) => {
    setSelectedLeadId(id);
    setModalLeadId(id);
  };

  const handleCloseModal = () => setModalLeadId(null);

  // Active stages
  const orderedStages = VISIBLE_STAGES.filter(s =>
    pipelineStages.some(ps => ps.name === s) || leads.some(l => l.stage === s)
  );

  // Unique sources
  const uniqueSources = ['All', ...new Set(leads.map(l => (l.source || '').trim()).filter(Boolean))];

  // Filter leads
  const filtered = leads.filter(lead => {
    if (activeRole === 'Counselor' && lead.counselor !== activeUser) return false;
    if (filterCourse !== 'All' && lead.course !== filterCourse) return false;
    if (filterTemp !== 'All' && lead.temperature !== filterTemp) return false;
    if (filterCounselor !== 'All') {
      if (filterCounselor === 'Unassigned') {
        const c = (lead.counselor || '').trim().toLowerCase();
        if (c && c !== 'unassigned' && c !== 'none') return false;
      } else if (lead.counselor !== filterCounselor) return false;
    }
    if (filterSource !== 'All') {
      if (!(lead.source || '').toLowerCase().includes(filterSource.toLowerCase())) return false;
    }
    const q = (search || searchQuery || '').toLowerCase().trim();
    if (q) {
      if (!`${lead.name} ${lead.phone} ${lead.email} ${lead.course}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isFiltered = filterCourse !== 'All' || filterTemp !== 'All' ||
    filterCounselor !== (activeRole === 'Counselor' ? activeUser : 'All') ||
    filterSource !== 'All' || !!search;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <FilterSelect label="Course" value={filterCourse} onChange={setFilterCourse}>
          <option value="All">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </FilterSelect>

        <FilterSelect label="Temperature" value={filterTemp} onChange={setFilterTemp}>
          <option value="All">All</option>
          <option value="Hot">🔥 Hot</option>
          <option value="Warm">☀️ Warm</option>
          <option value="Cold">❄️ Cold</option>
        </FilterSelect>

        {activeRole !== 'Counselor' && (
          <FilterSelect label="Assigned To" value={filterCounselor} onChange={setFilterCounselor}>
            <option value="All">All Agents</option>
            <option value="Unassigned">Unassigned</option>
            {counselors.filter(c => c.status !== 'Deactivated').map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </FilterSelect>
        )}

        <FilterSelect label="Source" value={filterSource} onChange={setFilterSource}>
          {uniqueSources.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sources' : s}</option>)}
        </FilterSelect>

        {/* Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginLeft: '4px' }}>
          <label style={labelStyle}>Search</label>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '30px', paddingRight: '10px', height: '34px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12.5px', outline: 'none', width: '180px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {isFiltered && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ ...labelStyle, visibility: 'hidden' }}>x</label>
            <button onClick={() => { setFilterCourse('All'); setFilterTemp('All'); setFilterCounselor(activeRole === 'Counselor' ? activeUser : 'All'); setFilterSource('All'); setSearch(''); }}
              style={{ height: '34px', padding: '0 14px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Board ───────────────────────────────────────────────────────────── */}
      <div style={{
        height: 'calc(100vh - 155px)',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '16px 20px',
        display: 'flex',
        gap: '14px',
        alignItems: 'stretch',
        flexShrink: 0,
      }}>
        {orderedStages.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={filtered.filter(l => l.stage === stage)}
            onOpen={handleOpenCard}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* ── Lead Detail Modal (stays on this page) ──────────────────────────── */}
      {modalLeadId && (() => {
        const lead = leads.find(l => l.id === modalLeadId);
        if (!lead) return null;
        return (
          <div
            onClick={handleCloseModal}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-primary)',
                borderRadius: '16px',
                width: '95vw', maxWidth: '1100px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
                position: 'relative',
              }}
            >
              <button
                onClick={handleCloseModal}
                title="Close"
                style={{
                  position: 'absolute', top: '14px', right: '14px', zIndex: 10,
                  width: '30px', height: '30px', borderRadius: '50%',
                  border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <DetailTimeline onClose={handleCloseModal} backText="Back to Lead Stages" />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
const labelStyle = { fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <label style={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          height: '34px', padding: '0 28px 0 10px',
          border: '1px solid var(--border-color)', borderRadius: '8px',
          fontSize: '12.5px', color: 'var(--text-primary)',
          background: 'var(--bg-primary)', outline: 'none',
          cursor: 'pointer', minWidth: '120px',
        }}
      >
        {children}
      </select>
    </div>
  );
}

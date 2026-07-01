import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Upload, Trash2, FileSpreadsheet, Eye, Edit3, Plus, Save, X, Check, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { whatsappDb, deleteContactListById } from './whatsappDb';
import { useCRM } from '../../context/CRMContext';

const BRAND_BLUE = '#2563eb';

export default function ContactsPage() {
  const fileInputRef = useRef(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // View contacts modal
  const [viewingList, setViewingList] = useState(null);
  const [viewContacts, setViewContacts] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPage, setViewPage] = useState(1);
  const [viewPageSize, setViewPageSize] = useState(100);
  const [exportingListId, setExportingListId] = useState(null);

  // Editing contact
  const [editingContactId, setEditingContactId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [savingContact, setSavingContact] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newContactValues, setNewContactValues] = useState({});

  // Manual List Creation
  const [creatingManual, setCreatingManual] = useState(false);
  const [manualListName, setManualListName] = useState('');
  const [manualColumns, setManualColumns] = useState(['name', 'phone']);
  const [manualRows, setManualRows] = useState([{}, {}, {}]);
  const [savingManual, setSavingManual] = useState(false);

  const { leads, addLead, updateLead, deleteLead } = useCRM();

  useEffect(() => {
    loadLists();
  }, [leads.length]);

  const loadLists = () => {
    try {
      const data = whatsappDb.getContactLists();

      const crmList = {
        id: 'crm-leads-all',
        name: 'Active CRM Leads (Live)',
        contactCount: leads.length,
        columns: ['name', 'phone', 'course', 'stage', 'counselor'],
        createdAt: new Date().toISOString(),
        isLive: true
      };

      setLists([crmList, ...data]);
    } catch (error) {
      console.error('Failed to load lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const importContactsAsCRMLeads = (contactsList, sourceName) => {
    contactsList.forEach(contact => {
      let phone = String(contact.phone || contact.Phone || '').trim();
      if (!phone) return;
      const cleanPhone = phone.replace(/\D/g, '');
      const existing = leads.find(l => l.phone && String(l.phone).replace(/\D/g, '') === cleanPhone);
      if (!existing) {
        addLead({
          name: contact.name || contact.Name || 'Campaign Contact',
          phone: phone,
          course: contact.course || contact.Course || '',
          source: 'WhatsApp Upload',
          subSource: sourceName
        });
      }
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (jsonData.length === 0) {
          alert('File is empty');
          setUploading(false);
          return;
        }

        const cols = Object.keys(jsonData[0]);
        const listId = `list-${Date.now()}`;
        const listName = file.name.replace(/\.[^.]+$/, '');

        // Save list record
        const currentLists = whatsappDb.getContactLists();
        const updatedLists = [
          ...currentLists,
          {
            id: listId,
            name: listName,
            contactCount: jsonData.length,
            columns: cols,
            createdAt: new Date().toISOString()
          }
        ];
        whatsappDb.saveContactLists(updatedLists);

        // Save contacts details
        const allContacts = whatsappDb.getContacts();
        allContacts[listId] = jsonData.map((c, i) => ({ id: `c-${Date.now()}-${i}`, ...c }));
        whatsappDb.saveContacts(allContacts);

        // Import into active leads
        importContactsAsCRMLeads(jsonData, listName);

        setLists(updatedLists);
        alert(`Successfully uploaded "${listName}" with ${jsonData.length} contacts.`);
      } catch (error) {
        alert('Failed to parse file. Please upload a valid CSV or Excel file.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSaveManualList = () => {
    const validRows = manualRows.filter(row => {
      return manualColumns.some(col => row[col] && row[col].trim() !== '');
    });

    if (validRows.length === 0) {
      alert('Please add at least one valid contact row');
      return;
    }

    setSavingManual(true);
    setTimeout(() => {
      const listId = `list-${Date.now()}`;
      const listName = manualListName.trim() || `Manual List - ${new Date().toLocaleDateString()}`;

      const updatedLists = [
        ...whatsappDb.getContactLists(),
        {
          id: listId,
          name: listName,
          contactCount: validRows.length,
          columns: manualColumns,
          createdAt: new Date().toISOString()
        }
      ];

      const allContacts = whatsappDb.getContacts();
      allContacts[listId] = validRows.map((r, i) => ({ id: `c-${Date.now()}-${i}`, ...r }));

      whatsappDb.saveContactLists(updatedLists);
      whatsappDb.saveContacts(allContacts);

      // Import into active leads
      importContactsAsCRMLeads(validRows, listName);

      setLists(updatedLists);
      setCreatingManual(false);
      setSavingManual(false);
    }, 800);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact list?')) return;
    try {
      // Optimistically remove from UI immediately (keep crmList)
      const crmList = {
        id: 'crm-leads-all',
        name: 'Active CRM Leads (Live)',
        contactCount: leads.length,
        columns: ['name', 'phone', 'course', 'stage', 'counselor'],
        createdAt: new Date().toISOString(),
        isLive: true
      };
      setLists(prev => [crmList, ...prev.filter(l => l.id !== id && l.id !== 'crm-leads-all')]);
      // Delete from Firestore + localStorage directly (no race condition)
      await deleteContactListById(id);
    } catch (error) {
      console.error('Failed to delete list:', error);
      alert('Failed to delete list');
      loadLists(); // reload on error
    }
  };

  const handleView = (list) => {
    setViewingList(list);
    setViewLoading(true);
    setEditingContactId(null);
    setAddingNew(false);
    setViewPage(1);

    setTimeout(() => {
      if (list.isLive) {
        setViewContacts(leads);
      } else {
        const allContacts = whatsappDb.getContacts();
        const contacts = allContacts[list.id] || [];
        setViewContacts(contacts);
      }
      setViewLoading(false);
    }, 300);
  };

  const downloadContacts = (list, contacts, format = 'xlsx') => {
    if (!contacts.length) {
      alert('This list has no contacts to export');
      return;
    }
    const cols = (list.columns && list.columns.length ? list.columns : Object.keys(contacts[0] || {}))
      .filter(c => c !== 'id' && c !== 'timeline' && c !== 'whatsappMessages');
    const safeName = (list.name || 'contacts').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80);
    const stringify = (v) => (v === null || v === undefined) ? '' : String(v);

    if (format === 'csv') {
      const escapeCsv = (raw) => {
        const s = stringify(raw);
        if (/^\d{10,}$/.test(s)) {
          return `="${s.replace(/"/g, '""')}"`;
        }
        if (/[",\n\r]/.test(s)) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const lines = [
        cols.join(','),
        ...contacts.map(c => cols.map(col => escapeCsv(c[col])).join(',')),
      ];
      const csv = '\uFEFF' + lines.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // XLSX path
    const rows = contacts.map(c => {
      const row = {};
      cols.forEach(col => { row[col] = stringify(c[col]); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (cell) {
          cell.t = 's';
          cell.z = '@';
          if (cell.v !== undefined && cell.v !== null) cell.v = String(cell.v);
        }
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, `${safeName}.xlsx`);
  };

  const handleExportList = (list, format = 'xlsx') => {
    setExportingListId(list.id);
    setTimeout(() => {
      if (list.isLive) {
        downloadContacts(list, leads, format);
      } else {
        const allContacts = whatsappDb.getContacts();
        const contacts = allContacts[list.id] || [];
        downloadContacts(list, contacts, format);
      }
      setExportingListId(null);
    }, 500);
  };

  const startEdit = (contact) => {
    setEditingContactId(contact.id || null);
    const values = {};
    viewingList?.columns?.forEach(col => {
      values[col] = String(contact[col] || '');
    });
    setEditValues(values);
    setAddingNew(false);
  };

  const saveEdit = () => {
    if (!viewingList || !editingContactId) return;
    setSavingContact(true);

    setTimeout(() => {
      if (viewingList.isLive) {
        updateLead(editingContactId, editValues);
        setViewContacts(prev => prev.map(c => c.id === editingContactId ? { ...c, ...editValues } : c));
      } else {
        const updatedContacts = viewContacts.map(c =>
          c.id === editingContactId ? { ...c, ...editValues } : c
        );

        const allContacts = whatsappDb.getContacts();
        allContacts[viewingList.id] = updatedContacts;
        whatsappDb.saveContacts(allContacts);

        setViewContacts(updatedContacts);
      }
      setEditingContactId(null);
      setSavingContact(false);
    }, 500);
  };

  const deleteContact = (contactId) => {
    if (!viewingList || !confirm('Delete this contact?')) return;
    try {
      if (viewingList.isLive) {
        deleteLead(contactId);
        setViewContacts(prev => prev.filter(c => c.id !== contactId));
      } else {
        const updatedContacts = viewContacts.filter(c => c.id !== contactId);

        const allContacts = whatsappDb.getContacts();
        allContacts[viewingList.id] = updatedContacts;
        whatsappDb.saveContacts(allContacts);

        setViewContacts(updatedContacts);
      }
      setLists(prev => prev.map(l => l.id === viewingList.id ? { ...l, contactCount: viewingList.isLive ? leads.length - 1 : viewContacts.length - 1 } : l));
    } catch {
      alert('Failed to delete contact');
    }
  };

  const startAddNew = () => {
    setAddingNew(true);
    setEditingContactId(null);
    const values = {};
    viewingList?.columns?.forEach(col => { values[col] = ''; });
    setNewContactValues(values);
  };

  const saveNewContact = () => {
    if (!viewingList) return;
    const hasValue = Object.values(newContactValues).some(v => v.trim());
    if (!hasValue) return;
    setSavingContact(true);

    setTimeout(() => {
      if (viewingList.isLive) {
        const created = addLead(newContactValues);
        setViewContacts(prev => [...prev, created]);
      } else {
        const newContact = { id: `c-${Date.now()}`, ...newContactValues };
        const updatedContacts = [...viewContacts, newContact];

        const allContacts = whatsappDb.getContacts();
        allContacts[viewingList.id] = updatedContacts;
        whatsappDb.saveContacts(allContacts);

        setViewContacts(updatedContacts);
      }
      setLists(prev => prev.map(l => l.id === viewingList.id ? { ...l, contactCount: viewingList.isLive ? leads.length + 1 : viewContacts.length + 1 } : l));
      setAddingNew(false);
      setNewContactValues({});
      setSavingContact(false);
    }, 500);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b' }}>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Contacts</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => {
              setCreatingManual(true);
              setManualListName('');
              setManualColumns(['name', 'phone']);
              setManualRows([{}, {}, {}]);
            }}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1',
              padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={18} /> Add Manually
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: BRAND_BLUE, color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <Upload size={18} /> {uploading ? 'Uploading...' : 'Upload CSV/Excel'}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {lists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontWeight: 500 }}>No contact lists yet</p>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Upload a CSV or Excel file to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lists.map(list => (
            <div key={list.id} style={{
              background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
              padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileSpreadsheet size={18} color={BRAND_BLUE} />
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{list.name}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                  {list.contactCount} contacts | Columns: {list.columns?.join(', ') || 'N/A'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleView(list)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#64748b' }}
                  title="View contacts"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleExportList(list, 'xlsx')}
                  disabled={exportingListId === list.id}
                  style={{
                    background: 'none', border: 'none',
                    cursor: exportingListId === list.id ? 'wait' : 'pointer',
                    padding: 6, color: '#0f172a',
                    opacity: exportingListId === list.id ? 0.5 : 1,
                  }}
                  title="Download as Excel"
                >
                  <Download size={18} />
                </button>
                {!list.isLive && (
                  <button
                    onClick={() => handleDelete(list.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#ef4444' }}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Entry Modal */}
      {creatingManual && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => setCreatingManual(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, padding: 24,
              width: '90%', maxWidth: 800, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontWeight: 600, margin: 0, color: '#0f172a' }}>Create Contact List Manually</h2>
              <button onClick={() => setCreatingManual(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 8, paddingBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>List Name</label>
                <input
                  type="text"
                  value={manualListName}
                  onChange={(e) => setManualListName(e.target.value)}
                  placeholder="e.g. VIP Customers"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Columns</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {manualColumns.map((col, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={col}
                        onChange={(e) => {
                          const newCols = [...manualColumns];
                          newCols[idx] = e.target.value;
                          setManualColumns(newCols);
                        }}
                        style={{ background: 'transparent', border: 'none', outline: 'none', width: Math.max(60, col.length * 8 + 20), fontSize: '0.85rem', fontWeight: 500 }}
                      />
                      {manualColumns.length > 1 && (
                        <button onClick={() => setManualColumns(manualColumns.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setManualColumns([...manualColumns, `col${manualColumns.length + 1}`])}
                    style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Add Column
                  </button>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Contacts Data</label>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: 40, textAlign: 'center', padding: '8px' }}>#</th>
                        {manualColumns.map((col, i) => (
                          <th key={i} style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>{col || '...'}</th>
                        ))}
                        <th style={{ width: 60 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualRows.map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ textAlign: 'center', padding: '4px', color: '#94a3b8' }}>{rIdx + 1}</td>
                          {manualColumns.map((col, cIdx) => (
                            <td key={cIdx} style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={row[col] || ''}
                                onChange={(e) => {
                                  const newRows = [...manualRows];
                                  newRows[rIdx] = { ...newRows[rIdx], [col]: e.target.value };
                                  setManualRows(newRows);
                                }}
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid transparent', backgroundColor: '#f8fafc', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </td>
                          ))}
                          <td style={{ textAlign: 'center', padding: '4px' }}>
                            <button onClick={() => setManualRows(manualRows.filter((_, i) => i !== rIdx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => setManualRows([...manualRows, {}])}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px auto', background: 'none', border: '1px dashed #cbd5e1', color: '#64748b', padding: '6px 16px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setCreatingManual(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManualList}
                disabled={savingManual}
                style={{ background: BRAND_BLUE, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: savingManual ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {savingManual ? 'Saving...' : 'Save Contact List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Contacts Modal */}
      {viewingList && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={() => { setViewingList(null); setEditingContactId(null); setAddingNew(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, padding: 24,
              width: '90%', maxWidth: 800, maxHeight: '85vh', overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontWeight: 600, margin: 0, color: '#0f172a' }}>{viewingList.name}</h2>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{viewContacts.length} contacts</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => viewingList && downloadContacts(viewingList, viewContacts, 'xlsx')}
                  disabled={viewLoading || viewContacts.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#0f172a', color: '#fff', border: 'none',
                    padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem',
                    cursor: viewContacts.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: viewContacts.length === 0 ? 0.5 : 1,
                  }}
                  title="Download as Excel (.xlsx)"
                >
                  <Download size={14} /> Excel
                </button>
                <button
                  onClick={() => viewingList && downloadContacts(viewingList, viewContacts, 'csv')}
                  disabled={viewLoading || viewContacts.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f1f5f9', color: '#475569', border: 'none',
                    padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem',
                    cursor: viewContacts.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: viewContacts.length === 0 ? 0.5 : 1,
                  }}
                  title="Download as CSV"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  onClick={startAddNew}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: BRAND_BLUE, color: '#fff', border: 'none',
                    padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Add Contact
                </button>
                <button onClick={() => { setViewingList(null); setEditingContactId(null); setAddingNew(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {viewLoading ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading contacts...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      {viewingList.columns?.map(col => (
                        <th key={col} style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>{col}</th>
                      ))}
                      <th style={{ textAlign: 'center', padding: '8px 10px', color: '#64748b', fontWeight: 600, width: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Add new contact row */}
                    {addingNew && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f0fdf4' }}>
                        {viewingList.columns?.map(col => (
                          <td key={col} style={{ padding: '4px 6px' }}>
                            <input
                              type="text"
                              value={newContactValues[col] || ''}
                              onChange={e => setNewContactValues(prev => ({ ...prev, [col]: e.target.value }))}
                              placeholder={col}
                              style={{
                                width: '100%', padding: '6px 8px', borderRadius: 6,
                                border: '1px solid #bbf7d0', fontSize: '0.82rem', outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button
                              onClick={saveNewContact}
                              disabled={savingContact}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#16a34a' }}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setAddingNew(false)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {viewContacts.slice((viewPage - 1) * viewPageSize, viewPage * viewPageSize).map((contact, i) => (
                      <tr key={contact.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {editingContactId === contact.id ? (
                          <>
                            {viewingList.columns?.map(col => (
                              <td key={col} style={{ padding: '4px 6px' }}>
                                <input
                                  type="text"
                                  value={editValues[col] || ''}
                                  onChange={e => setEditValues(prev => ({ ...prev, [col]: e.target.value }))}
                                  style={{
                                    width: '100%', padding: '6px 8px', borderRadius: 6,
                                    border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </td>
                            ))}
                            <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <button
                                  onClick={saveEdit}
                                  disabled={savingContact}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#16a34a' }}
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingContactId(null)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {viewingList.columns?.map(col => (
                              <td key={col} style={{ padding: '8px 10px', color: '#0f172a' }}>{contact[col] || '-'}</td>
                            ))}
                            <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <button
                                  onClick={() => startEdit(contact)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b' }}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => contact.id && deleteContact(contact.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ef4444' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {viewContacts.length > 0 && (() => {
                  const totalPages = Math.max(1, Math.ceil(viewContacts.length / viewPageSize));
                  const page = Math.min(viewPage, totalPages);
                  const startIdx = (page - 1) * viewPageSize;
                  const endIdx = Math.min(startIdx + viewPageSize, viewContacts.length);
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 8px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 12,
                    }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Showing {startIdx + 1}–{endIdx} of {viewContacts.length}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Per page
                          <select
                            value={viewPageSize}
                            onChange={e => { setViewPageSize(Number(e.target.value)); setViewPage(1); }}
                            style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.78rem' }}
                          >
                            {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <button
                          onClick={() => setViewPage(p => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          style={{
                            background: '#f1f5f9', border: 'none', borderRadius: 6,
                            padding: '4px 8px', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                            color: page <= 1 ? '#cbd5e1' : '#475569',
                            display: 'inline-flex', alignItems: 'center',
                          }}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span style={{ fontSize: '0.8rem', color: '#475569', minWidth: 70, textAlign: 'center' }}>
                          Page {page} / {totalPages}
                        </span>
                        <button
                          onClick={() => setViewPage(p => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                          style={{
                            background: '#f1f5f9', border: 'none', borderRadius: 6,
                            padding: '4px 8px', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                            color: page >= totalPages ? '#cbd5e1' : '#475569',
                            display: 'inline-flex', alignItems: 'center',
                          }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Panel,
  MarkerType,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { 
  Zap, MessageSquare, UserCheck, GitFork, Split, BookOpen, 
  Handshake, ZoomIn, ZoomOut, Maximize, Plus, Edit3, Trash2, 
  Copy, Save, X, Phone, ArrowLeft, Send, Check, AlertCircle 
} from 'lucide-react';

const INSTAGRAM_COLOR = '#E1306C';

// ================= CUSTOM NODE STYLES & RENDERING =================

const getNodeStyles = (type) => {
  switch (type) {
    case 'Trigger': return { bg: '#e0e7ff', color: '#4f46e5', border: '#818cf8', icon: Zap };
    case 'Message': return { bg: '#f3e8ff', color: '#9333ea', border: '#c084fc', icon: MessageSquare };
    case 'CollectInfo': return { bg: '#ffedd5', color: '#ea580c', border: '#fb923c', icon: UserCheck };
    case 'Choice': return { bg: '#ccfbf1', color: '#0d9488', border: '#2dd4bf', icon: GitFork };
    case 'Condition': return { bg: '#dcfce7', color: '#16a34a', border: '#4ade80', icon: Split };
    case 'FAQ': return { bg: '#fef9c3', color: '#ca8a04', border: '#facc15', icon: BookOpen };
    case 'CounselorHandoff': return { bg: '#fee2e2', color: '#dc2626', border: '#f87171', icon: Handshake };
    default: return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: MessageSquare };
  }
};

const CustomFlowNode = ({ data }) => {
  const styles = getNodeStyles(data.type);
  const IconComponent = styles.icon;

  const isChoice = data.type === 'Choice';
  const isCondition = data.type === 'Condition';
  const hasSingleOutput = !isChoice && !isCondition && data.type !== 'CounselorHandoff';

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: `2px solid ${styles.border}`,
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)',
      width: 280,
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Target Handle (Top) */}
      {data.id !== 'welcome' && data.id !== 'trigger_node' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ width: 10, height: 10, background: '#94a3b8', border: '2px solid white' }}
        />
      )}

      {/* Header */}
      <div style={{
        padding: '12px 14px',
        background: styles.bg,
        borderBottom: `1px solid ${styles.border}50`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: 'white',
            borderRadius: '6px',
            padding: '4px',
            color: styles.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconComponent size={15} />
          </div>
          <span style={{
            fontWeight: 700,
            fontSize: '0.8rem',
            color: styles.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {data.name || data.type}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {data.onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onEdit(data); }}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2, display: 'flex' }}
              title="Edit Node"
            >
              <Edit3 size={14} />
            </button>
          )}
          {data.onDuplicate && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onDuplicate(data); }}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2, display: 'flex' }}
              title="Duplicate Node"
            >
              <Copy size={14} />
            </button>
          )}
          {data.onDelete && data.id !== 'welcome' && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onDelete(data.id); }}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, display: 'flex' }}
              title="Delete Node"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px' }}>
        {data.type === 'Trigger' && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>KEYWORDS:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(data.triggers || []).map((t, idx) => (
                <span key={idx} style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {(data.type === 'Message' || data.type === 'FAQ' || data.type === 'CounselorHandoff') && (
          <div>
            {data.course && (
              <div style={{ 
                fontSize: '0.7rem', 
                fontWeight: 700, 
                color: '#6366f1', 
                background: '#e0e7ff', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                display: 'inline-block', 
                marginBottom: '6px' 
              }}>
                🎓 {data.course}
              </div>
            )}
            <div style={{
              fontSize: '0.85rem',
              color: '#334155',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              maxHeight: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {data.message}
            </div>
          </div>
        )}

        {data.type === 'CollectInfo' && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>COLLECT FIELDS:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: INSTAGRAM_COLOR }}>☑</span> Full Name
              </div>
              <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: INSTAGRAM_COLOR }}>☑</span> Mobile Number (10 Digit)
              </div>
            </div>
          </div>
        )}

        {isChoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#64748b',
              lineHeight: 1.3,
              marginBottom: 4,
              maxHeight: '40px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {data.message}
            </div>
            {(data.choices || []).map((c, idx) => (
              <div key={idx} style={{
                background: '#ffffff',
                border: `1.5px solid ${INSTAGRAM_COLOR}`,
                borderRadius: '18px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: INSTAGRAM_COLOR,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <span>{c.label}</span>
                {/* Specific output handle for this branch */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`choice_${idx}`}
                  style={{ top: '50%', right: -15, width: 8, height: 8, background: styles.color, border: '1px solid white' }}
                />
              </div>
            ))}
          </div>
        )}

        {isCondition && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
              CRM Condition:
              <div style={{ fontWeight: 700, color: styles.color, marginTop: 2 }}>
                {data.conditionType === 'check_crm_placement' ? 'Check Placement Info' : 'Custom Check'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <div style={{
                flex: 1, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                borderRadius: '6px', padding: '4px', fontSize: '0.7rem', fontWeight: 700,
                textAlign: 'center', position: 'relative'
              }}>
                TRUE (Found)
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id="true_branch"
                  style={{ bottom: -9, left: '50%', width: 8, height: 8, background: '#16a34a', border: '1px solid white' }}
                />
              </div>
              <div style={{
                flex: 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                borderRadius: '6px', padding: '4px', fontSize: '0.7rem', fontWeight: 700,
                textAlign: 'center', position: 'relative'
              }}>
                FALSE (Missing)
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id="false_branch"
                  style={{ bottom: -9, left: '50%', width: 8, height: 8, background: '#dc2626', border: '1px solid white' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Default Single Source Handle (Bottom) */}
      {hasSingleOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          style={{ width: 10, height: 10, background: styles.color, border: '2px solid white' }}
        />
      )}
    </div>
  );
};

const nodeTypes = {
  chatbotNode: CustomFlowNode,
};

// ================= LAYOUT ENGINE (DAGRE) =================

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  // Spacing: ranksep controls vertical space, nodesep controls horizontal space
  dagreGraph.setGraph({ rankdir: direction, nodesep: 70, ranksep: 100 });

  nodes.forEach((node) => {
    let height = 140;
    if (node.data.type === 'Choice' && node.data.choices) {
      height = 130 + (node.data.choices.length * 34);
    } else if (node.data.type === 'Condition') {
      height = 150;
    }
    dagreGraph.setNode(node.id, { width: 280, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    let height = 140;
    if (node.data.type === 'Choice' && node.data.choices) {
      height = 130 + (node.data.choices.length * 34);
    }
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 280 / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// ================= INITIAL DEFAULT FLOW SCHEMA =================

const DEFAULT_FRONTEND_FLOW = {
  startNode: "welcome",
  nodes: [
    {
      id: "welcome",
      type: "Message",
      name: "👋 Welcome",
      data: {
        message: "👋 Hello! Welcome to TechZone Academy.\n\nThank you for reaching out to us.\n\nTo assist you better, could you please share your:\n\n👤 Full Name"
      },
      nextNodeId: "collect_details"
    },
    {
      id: "collect_details",
      type: "CollectInfo",
      name: "👤 Collect Details",
      data: {
        message: "Please share your Full Name and Mobile Number."
      },
      nextNodeId: "course_selection"
    },
    {
      id: "course_selection",
      type: "Choice",
      name: "🎓 Course Selection",
      data: {
        message: "Thank you! 😊\n\nWhich course are you interested in?",
        choices: [
          { label: "Data Science", payload: "course_data_science", nextNodeId: "ds_info" },
          { label: "Data Analytics", payload: "course_data_analytics", nextNodeId: "da_info" },
          { label: "Artificial Intelligence", payload: "course_ai", nextNodeId: "ai_info" },
          { label: "Digital Marketing", payload: "course_digital_marketing", nextNodeId: "dm_info" }
        ]
      }
    },
    // Data Science Flow
    {
      id: "ds_info",
      type: "Choice",
      name: "📚 Data Science Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Data Science program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "ds_syllabus", nextNodeId: "ds_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "ds_syllabus",
      type: "FAQ",
      name: "📌 DS Syllabus",
      data: {
        course: "Data Science",
        message: "Here’s a brief overview of our Data Science program:\n\n✅ Python\n✅ SQL\n✅ Statistics\n✅ Power BI\n✅ Machine Learning\n✅ Deep Learning\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    // Data Analytics Flow
    {
      id: "da_info",
      type: "Choice",
      name: "📚 Data Analytics Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Data Analytics program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "da_syllabus", nextNodeId: "da_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "da_syllabus",
      type: "FAQ",
      name: "📌 DA Syllabus",
      data: {
        course: "Data Analytics",
        message: "Here’s a brief overview of our Data Analytics program:\n\n✅ Excel\n✅ Power BI / Tableau\n✅ SQL\n✅ Python\n✅ Statistics\n✅ Data Warehousing\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    // AI Flow
    {
      id: "ai_info",
      type: "Choice",
      name: "📚 AI Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Artificial Intelligence program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "ai_syllabus", nextNodeId: "ai_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "ai_syllabus",
      type: "FAQ",
      name: "📌 AI Syllabus",
      data: {
        course: "Artificial Intelligence",
        message: "Here’s a brief overview of our Artificial Intelligence program:\n\n✅ Python & Mathematics\n✅ Machine Learning\n✅ Deep Learning\n✅ Natural Language Processing (NLP)\n✅ Computer Vision\n✅ Generative AI (LLMs)\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    // Digital Marketing Flow
    {
      id: "dm_info",
      type: "Choice",
      name: "📚 DM Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Digital Marketing program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "dm_syllabus", nextNodeId: "dm_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "dm_syllabus",
      type: "FAQ",
      name: "📌 DM Syllabus",
      data: {
        course: "Digital Marketing",
        message: "Here’s a brief overview of our Digital Marketing program:\n\n✅ SEO (Search Engine Optimization)\n✅ SEM (Search Engine Marketing)\n✅ Social Media Marketing (SMM)\n✅ Content Marketing\n✅ Email Marketing\n✅ Web Analytics (GA4)\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "faq_fees",
      type: "FAQ",
      name: "📌 Fees Info",
      data: {
        message: "Our counselor will provide you with the latest fee structure and any ongoing offers.\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "faq_duration",
      type: "FAQ",
      name: "📌 Duration Info",
      data: {
        message: "The duration depends on the learning track you choose.\n\nOur counselor can explain the complete roadmap.\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "faq_demo",
      type: "FAQ",
      name: "📌 Demo Info",
      data: {
        message: "Great! 😊\n\nYour request for a FREE Demo Class has been received.\n\nOne of our counselors will contact you shortly.\n\n📞 For immediate assistance, call us on +91 6304872757.",
        setFields: { "demoRequested": true }
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "faq_placement",
      type: "Condition",
      name: "📌 Placement Info Check",
      data: {
        conditionType: "check_crm_placement"
      },
      trueNodeId: "course_info", 
      falseNodeId: "counselor_handoff"
    },
    {
      id: "counselor_handoff",
      type: "CounselorHandoff",
      name: "👨💼 Counselor Handoff",
      data: {
        message: "Thank you for your question. 😊\n\nOne of our counselors will connect with you shortly and provide detailed information.\n\n📞 For immediate assistance, you can also call us on +91 6304872757."
      }
    }
  ]
};

// ================= CANVAS INNER CORE =================

const serializeFlow = (nodesList, edgesList) => {
  const nodesConfig = nodesList.map(n => {
    const d = n.data;
    const dbData = {};
    if (d.type === 'Choice') {
      dbData.message = d.message || '';
      dbData.choices = (d.choices || []).map(c => ({
        label: c.label || '',
        payload: c.payload || '',
        nextNodeId: c.nextNodeId || ''
      }));
    } else if (d.type === 'Condition') {
      dbData.conditionType = d.conditionType || 'check_crm_placement';
    } else if (d.type === 'CollectInfo') {
      dbData.message = d.message || '';
      dbData.fields = [
        { field: 'name', label: 'Full Name', required: true },
        { field: 'phone', label: 'Mobile Number', required: true }
      ];
    } else {
      dbData.message = d.message || '';
      if (d.setFields) {
        dbData.setFields = d.setFields;
      }
      if (d.course) {
        dbData.course = d.course;
      }
    }

    return {
      id: n.id,
      position: n.position,
      type: d.type,
      name: d.name,
      data: dbData,
      nextNodeId: d.nextNodeId || null,
      trueNodeId: d.trueNodeId || null,
      falseNodeId: d.falseNodeId || null
    };
  });

  const edgesConfig = edgesList.map(e => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle || null,
    target: e.target,
    type: e.type || 'smoothstep',
    style: e.style || null,
    markerEnd: e.markerEnd || null
  }));

  return {
    startNode: "welcome",
    nodes: nodesConfig,
    edges: edgesConfig
  };
};

const migrateSavedFlow = (rawFlow) => {
  if (!rawFlow || !rawFlow.nodes || rawFlow.nodes.length === 0) {
    return { ...DEFAULT_FRONTEND_FLOW, _hasChanged: true };
  }

  const migratedNodes = [...rawFlow.nodes];

  const newCourseNodesList = [
    {
      id: "ds_info",
      type: "Choice",
      name: "📚 Data Science Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Data Science program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "ds_syllabus", nextNodeId: "ds_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "ds_syllabus",
      type: "FAQ",
      name: "📌 DS Syllabus",
      data: {
        course: "Data Science",
        message: "Here’s a brief overview of our Data Science program:\n\n✅ Python\n✅ SQL\n✅ Statistics\n✅ Power BI\n✅ Machine Learning\n✅ Deep Learning\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "da_info",
      type: "Choice",
      name: "📚 Data Analytics Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Data Analytics program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "da_syllabus", nextNodeId: "da_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "da_syllabus",
      type: "FAQ",
      name: "📌 DA Syllabus",
      data: {
        course: "Data Analytics",
        message: "Here’s a brief overview of our Data Analytics program:\n\n✅ Excel\n✅ Power BI / Tableau\n✅ SQL\n✅ Python\n✅ Statistics\n✅ Data Warehousing\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "ai_info",
      type: "Choice",
      name: "📚 AI Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Artificial Intelligence program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "ai_syllabus", nextNodeId: "ai_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "ai_syllabus",
      type: "FAQ",
      name: "📌 AI Syllabus",
      data: {
        course: "Artificial Intelligence",
        message: "Here’s a brief overview of our Artificial Intelligence program:\n\n✅ Python & Mathematics\n✅ Machine Learning\n✅ Deep Learning\n✅ Natural Language Processing (NLP)\n✅ Computer Vision\n✅ Generative AI (LLMs)\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    },
    {
      id: "dm_info",
      type: "Choice",
      name: "📚 DM Info",
      data: {
        message: "Excellent choice! 🎓\n\nWhat would you like to know about our Digital Marketing program?",
        choices: [
          { label: "Fees", payload: "faq_fees", nextNodeId: "faq_fees" },
          { label: "Duration", payload: "faq_duration", nextNodeId: "faq_duration" },
          { label: "Syllabus", payload: "dm_syllabus", nextNodeId: "dm_syllabus" },
          { label: "Demo Class", payload: "faq_demo", nextNodeId: "faq_demo" },
          { label: "Placement Assistance", payload: "faq_placement", nextNodeId: "faq_placement" }
        ]
      }
    },
    {
      id: "dm_syllabus",
      type: "FAQ",
      name: "📌 DM Syllabus",
      data: {
        course: "Digital Marketing",
        message: "Here’s a brief overview of our Digital Marketing program:\n\n✅ SEO (Search Engine Optimization)\n✅ SEM (Search Engine Marketing)\n✅ Social Media Marketing (SMM)\n✅ Content Marketing\n✅ Email Marketing\n✅ Web Analytics (GA4)\n\n🎓 You can also book a FREE Demo Class.\n\n📞 Or call us on +91 6304872757."
      },
      nextNodeId: "counselor_handoff"
    }
  ];

  let hasChanged = false;

  newCourseNodesList.forEach((newNode) => {
    if (!migratedNodes.some(n => n.id === newNode.id)) {
      migratedNodes.push({
        id: newNode.id,
        type: newNode.type,
        name: newNode.name,
        data: newNode.data,
        nextNodeId: newNode.nextNodeId || null
      });
      hasChanged = true;
    }
  });

  const courseSelectionIdx = migratedNodes.findIndex(n => n.id === 'course_selection');
  if (courseSelectionIdx !== -1) {
    const node = migratedNodes[courseSelectionIdx];
    const choices = node.data?.choices || [];
    
    const updatedChoices = choices.map(choice => {
      if (choice.nextNodeId === 'course_info') {
        hasChanged = true;
        if (choice.payload === 'course_data_science') {
          return { ...choice, nextNodeId: 'ds_info' };
        } else if (choice.payload === 'course_data_analytics') {
          return { ...choice, nextNodeId: 'da_info' };
        } else if (choice.payload === 'course_ai' || choice.payload === 'course_artificial_intelligence') {
          return { ...choice, nextNodeId: 'ai_info' };
        } else if (choice.payload === 'course_digital_marketing') {
          return { ...choice, nextNodeId: 'dm_info' };
        }
      }
      return choice;
    });

    migratedNodes[courseSelectionIdx] = {
      ...node,
      data: {
        ...node.data,
        choices: updatedChoices
      }
    };
  }

  const welcomeIdx = migratedNodes.findIndex(n => n.id === 'welcome');
  if (welcomeIdx !== -1) {
    const node = migratedNodes[welcomeIdx];
    if (node.data?.message && node.data.message.includes('Mobile Number')) {
      hasChanged = true;
      migratedNodes[welcomeIdx] = {
        ...node,
        data: {
          ...node.data,
          message: "👋 Hello! Welcome to TechZone Academy.\n\nThank you for reaching out to us.\n\nTo assist you better, could you please share your:\n\n👤 Full Name"
        }
      };
    }
  }

  let migratedEdges = rawFlow.edges ? [...rawFlow.edges] : [];

  return {
    ...rawFlow,
    nodes: migratedNodes,
    edges: migratedEdges,
    _hasChanged: hasChanged
  };
};

function FlowCanvas({ flowData, onSave, onClose }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeNode, setActiveNode] = useState(null);
  
  // Mobile simulator preview state
  const [chatMessages, setChatMessages] = useState([]);
  const [simState, setSimState] = useState({ currentNodeId: 'welcome', course: '' });

  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // Helper callbacks
  const handleEditNode = useCallback((nodeData) => {
    setActiveNode(nodeData);
  }, []);

  const handleDuplicateNode = useCallback((nodeData) => {
    const newId = `${nodeData.type.toLowerCase()}_${Date.now()}`;
    const newNode = {
      id: newId,
      type: 'chatbotNode',
      position: { x: nodeData.id ? (nodes.find(n => n.id === nodeData.id)?.position?.x || 100) + 50 : 100, y: nodeData.id ? (nodes.find(n => n.id === nodeData.id)?.position?.y || 100) + 50 : 100 },
      data: {
        ...nodeData,
        id: newId,
        name: `${nodeData.name} (Copy)`,
        onEdit: handleEditNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode
      }
    };
    setNodes(prev => [...prev, newNode]);
  }, [nodes, handleEditNode]);

  const handleDeleteNode = useCallback((id) => {
    if (id === 'welcome') return;
    if (window.confirm('Are you sure you want to delete this node?')) {
      setNodes(prev => prev.filter(n => n.id !== id));
      setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
      if (activeNode?.id === id) setActiveNode(null);
    }
  }, [activeNode]);

  // Load Firestore Flow Data or Initialize defaults
  useEffect(() => {
    const rawFlow = (flowData && flowData.nodes && flowData.nodes.length > 0) ? flowData : DEFAULT_FRONTEND_FLOW;
    
    // Apply migration
    const migrated = migrateSavedFlow(rawFlow);
    
    console.log(`[Instagram Chatbot Builder] Loading flow. Node count: ${migrated.nodes?.length || 0}, Edge count: ${migrated.edges?.length || 0}`);

    // 1. Generate Nodes (Flattening nested DB schema to React Flow node state)
    const flowNodes = (migrated.nodes || []).map(n => {
      const message = n.data?.message || '';
      const choices = n.data?.choices || [];
      const conditionType = n.data?.conditionType || '';
      const setFields = n.data?.setFields || null;
      const course = n.data?.course || '';

      return {
        id: n.id,
        type: 'chatbotNode',
        position: n.position || { x: 0, y: 0 },
        data: {
          id: n.id,
          type: n.type,
          name: n.name,
          message,
          choices,
          conditionType,
          setFields,
          course,
          nextNodeId: n.nextNodeId || null,
          trueNodeId: n.trueNodeId || null,
          falseNodeId: n.falseNodeId || null,
          onEdit: handleEditNode,
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode
        }
      };
    });

    // 2. Generate Edges (Prefer saved visual edges if they exist)
    let flowEdges = [];
    if (migrated.edges && Array.isArray(migrated.edges) && migrated.edges.length > 0) {
      flowEdges = migrated.edges.map(e => ({
        ...e,
        type: e.type || 'smoothstep',
        style: e.style || (e.sourceHandle?.startsWith('choice_') 
          ? { stroke: '#0d9488', strokeWidth: 2 } 
          : e.sourceHandle === 'true_branch' 
            ? { stroke: '#16a34a', strokeWidth: 2 } 
            : e.sourceHandle === 'false_branch' 
              ? { stroke: '#dc2626', strokeWidth: 2 } 
              : { stroke: '#818cf8', strokeWidth: 2 }),
        markerEnd: e.markerEnd || { 
          type: MarkerType.ArrowClosed, 
          color: e.sourceHandle?.startsWith('choice_') 
            ? '#0d9488' 
            : e.sourceHandle === 'true_branch' 
              ? '#16a34a' 
              : e.sourceHandle === 'false_branch' 
                ? '#dc2626' 
                : '#818cf8' 
        }
      }));
    } else {
      // Reconstruct dynamically from node target connections
      (migrated.nodes || []).forEach(n => {
        if (n.type === 'Choice' && n.data?.choices) {
          n.data.choices.forEach((choice, idx) => {
            if (choice.nextNodeId) {
              flowEdges.push({
                id: `e-${n.id}-${choice.nextNodeId}-${idx}`,
                source: n.id,
                sourceHandle: `choice_${idx}`,
                target: choice.nextNodeId,
                type: 'smoothstep',
                style: { stroke: '#0d9488', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#0d9488' }
              });
            }
          });
        }
        else if (n.type === 'Condition') {
          if (n.trueNodeId) {
            flowEdges.push({
              id: `e-${n.id}-${n.trueNodeId}-true`,
              source: n.id,
              sourceHandle: 'true_branch',
              target: n.trueNodeId,
              type: 'smoothstep',
              style: { stroke: '#16a34a', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#16a34a' }
            });
          }
          if (n.falseNodeId) {
            flowEdges.push({
              id: `e-${n.id}-${n.falseNodeId}-false`,
              source: n.id,
              sourceHandle: 'false_branch',
              target: n.falseNodeId,
              type: 'smoothstep',
              style: { stroke: '#dc2626', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' }
            });
          }
        }
        else if (n.nextNodeId) {
          flowEdges.push({
            id: `e-${n.id}-${n.nextNodeId}`,
            source: n.id,
            sourceHandle: 'default',
            target: n.nextNodeId,
            type: 'smoothstep',
            style: { stroke: '#818cf8', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' }
          });
        }
      });
    }

    const hasPositions = (migrated.nodes || []).some(n => n.position);
    let finalNodes = [];
    if (hasPositions) {
      finalNodes = flowNodes;
    } else {
      const { nodes: layoutedNodes } = getLayoutedElements(flowNodes, flowEdges);
      finalNodes = layoutedNodes;
    }

    setNodes(finalNodes);
    setEdges(flowEdges);

    // Initialize simulation
    const welcomeMsg = migrated.nodes?.find(n => n.id === 'welcome')?.data?.message || DEFAULT_FRONTEND_FLOW.nodes[0].data.message;
    setChatMessages([
      { sender: 'bot', text: welcomeMsg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setSimState({ currentNodeId: 'welcome', course: '' });

    setTimeout(() => {
      fitView({ padding: 0.15, duration: 800 });
    }, 150);

    // If migration actually modified nodes or configuration, auto-save to Firestore immediately
    if (migrated._hasChanged) {
      console.log('[Instagram Chatbot Builder] Automated flow migration applied. Saving to database...');
      setTimeout(() => {
        const serialized = serializeFlow(finalNodes, flowEdges);
        onSave(serialized);
      }, 500);
    }
  }, [flowData, fitView]);

  // Connect handler
  const onConnect = useCallback((params) => {
    // Add visual line
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      style: { stroke: '#818cf8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' }
    }, eds));

    // Update node data to hold the connection target
    setNodes((prevNodes) => prevNodes.map(node => {
      if (node.id === params.source) {
        const data = { ...node.data };
        if (params.sourceHandle === 'true_branch') {
          data.trueNodeId = params.target;
        } else if (params.sourceHandle === 'false_branch') {
          data.falseNodeId = params.target;
        } else if (params.sourceHandle.startsWith('choice_')) {
          const idx = parseInt(params.sourceHandle.split('_')[1], 10);
          if (data.choices && data.choices[idx]) {
            const choicesCopy = [...data.choices];
            choicesCopy[idx] = { ...choicesCopy[idx], nextNodeId: params.target };
            data.choices = choicesCopy;
          }
        } else {
          data.nextNodeId = params.target;
        }
        return { ...node, data };
      }
      return node;
    }));
  }, [setEdges, setNodes]);

  // Auto arrange button click
  const handleAutoArrange = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setTimeout(() => {
      fitView({ padding: 0.15, duration: 500 });
    }, 50);
  };

  // Add Node Button handler
  const handleAddNode = (type) => {
    const newId = `${type.toLowerCase()}_${Date.now()}`;
    const newNode = {
      id: newId,
      type: 'chatbotNode',
      position: { x: 200, y: 150 },
      data: {
        id: newId,
        type,
        name: `New ${type} Node`,
        message: type === 'Condition' ? '' : 'Type your automatic response text here...',
        onEdit: handleEditNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode
      }
    };
    if (type === 'Choice') {
      newNode.data.choices = [
        { label: 'Option 1', nextNodeId: '' },
        { label: 'Option 2', nextNodeId: '' }
      ];
    } else if (type === 'Condition') {
      newNode.data.conditionType = 'check_crm_placement';
      newNode.trueNodeId = '';
      newNode.falseNodeId = '';
    } else if (type === 'CollectInfo') {
      newNode.data.fields = [
        { field: 'name', label: 'Full Name', required: true },
        { field: 'phone', label: 'Mobile Number', required: true }
      ];
    }
    setNodes(prev => [...prev, newNode]);
    setActiveNode(newNode.data);
  };

  // Save changes from node drawer back to canvas nodes state
  const handleSaveNodeDetails = (updatedData) => {
    setNodes(prev => prev.map(n => {
      if (n.id === updatedData.id) {
        return { ...n, data: { ...n.data, ...updatedData } };
      }
      return n;
    }));
    setActiveNode(null);
  };

  // Save complete flow configuration back to database
  const handleSaveFlow = () => {
    const nodesConfig = nodes.map(n => {
      const d = n.data;
      
      // Structure nested data fields exactly as expected in the DB schema
      const dbData = {};
      if (d.type === 'Choice') {
        dbData.message = d.message || '';
        dbData.choices = (d.choices || []).map(c => ({
          label: c.label || '',
          payload: c.payload || '',
          nextNodeId: c.nextNodeId || ''
        }));
      } else if (d.type === 'Condition') {
        dbData.conditionType = d.conditionType || 'check_crm_placement';
      } else if (d.type === 'CollectInfo') {
        dbData.message = d.message || '';
        dbData.fields = [
          { field: 'name', label: 'Full Name', required: true },
          { field: 'phone', label: 'Mobile Number', required: true }
        ];
      } else {
        dbData.message = d.message || '';
        if (d.setFields) {
          dbData.setFields = d.setFields;
        }
        if (d.course) {
          dbData.course = d.course;
        }
      }

      return {
        id: n.id,
        position: n.position,
        type: d.type,
        name: d.name,
        data: dbData,
        nextNodeId: d.nextNodeId || null,
        trueNodeId: d.trueNodeId || null,
        falseNodeId: d.falseNodeId || null
      };
    });

    const edgesConfig = edges.map(e => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle || null,
      target: e.target,
      type: e.type || 'smoothstep',
      style: e.style || null,
      markerEnd: e.markerEnd || null
    }));

    console.log(`[Instagram Chatbot Builder] Saving flow. Node count: ${nodesConfig.length}, Edge count: ${edgesConfig.length}`);

    onSave({
      startNode: 'welcome',
      nodes: nodesConfig,
      edges: edgesConfig
    });
  };

  // Mobile Chat Simulator progression logic
  const handleSimSendMessage = (text) => {
    if (!text.trim()) return;

    // 1. Add user reply
    const newMsgs = [...chatMessages, {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
    setChatMessages(newMsgs);

    // Run state transitions
    setTimeout(() => {
      let nextId = simState.currentNodeId;
      let nextCourse = simState.course;
      let replyText = '';
      let outgoingQuickReplies = null;

      const currentNode = nodes.find(n => n.id === nextId)?.data;
      if (!currentNode) return;

      if (currentNode.id === 'welcome') {
        // Collect Name step
        nextId = 'collect_name';
        replyText = "👋 Hello! Welcome to TechZone Academy.\n\nThank you for reaching out to us.\n\nTo assist you better, could you please share your:\n\n👤 Full Name";
      } 
      else if (currentNode.id === 'collect_name') {
        // Check if combined message
        const phoneMatch = text.match(/(?:\+?91|0)?\s*-?\s*[6-9](?:\s*-?\s*\d){9}\b/);
        if (phoneMatch) {
          nextId = 'course_selection';
          const courseNode = nodes.find(n => n.id === nextId)?.data;
          replyText = courseNode?.message || "Which course are you interested in?";
          outgoingQuickReplies = (courseNode?.choices || []).map(c => ({
            title: c.label,
            payload: c.payload || `course_${c.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          }));
        } else {
          replyText = "Thank you! 😊\n\n📱 Now, please share your mobile number.";
          nextId = 'collect_phone';
        }
      }
      else if (currentNode.id === 'collect_phone') {
        const phoneMatch = text.match(/(?:\+?91|0)?\s*-?\s*[6-9](?:\s*-?\s*\d){9}\b/);
        if (phoneMatch) {
          nextId = 'course_selection';
          const courseNode = nodes.find(n => n.id === nextId)?.data;
          replyText = courseNode?.message || "Which course are you interested in?";
          outgoingQuickReplies = (courseNode?.choices || []).map(c => ({
            title: c.label,
            payload: c.payload || `course_${c.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          }));
        } else {
          replyText = "Please enter a valid 10-digit Indian mobile number (e.g., +91XXXXXXXXXX) to proceed.";
          nextId = 'collect_phone';
        }
      }
      else if (currentNode.id === 'collect_details') {
        const phoneMatch = text.match(/(?:\+?91|0)?\s*-?\s*[6-9](?:\s*-?\s*\d){9}\b/);
        if (phoneMatch) {
          nextId = 'course_selection';
          const courseNode = nodes.find(n => n.id === nextId)?.data;
          replyText = courseNode?.message || "Which course are you interested in?";
          outgoingQuickReplies = (courseNode?.choices || []).map(c => ({
            title: c.label,
            payload: c.payload || `course_${c.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          }));
        } else {
          replyText = "Please share a valid 10-digit mobile number (e.g. 9876543210).";
          nextId = 'collect_details';
        }
      } 
      else if (currentNode.id === 'course_selection') {
        // Match selection by text or button tap (payload/text)
        let selection = null;
        const choices = currentNode.choices || [];
        const matchedChoice = choices.find(c => c.label.toLowerCase() === text.toLowerCase() || c.payload === text);
        
        if (matchedChoice) {
          selection = matchedChoice.label;
        }

        if (!selection) {
          if (text.includes('1') || text.toLowerCase().includes('science')) selection = 'Data Science';
          else if (text.includes('2') || text.toLowerCase().includes('analytics')) selection = 'Data Analytics';
          else if (text.includes('3') || text.toLowerCase().includes('intelligence') || text.toLowerCase().includes('ai')) selection = 'Artificial Intelligence';
          else if (text.includes('4') || text.toLowerCase().includes('marketing')) selection = 'Digital Marketing';
        }

        if (selection) {
          nextCourse = selection;
          // Determine nextId from choice destination
          const selectionChoice = choices.find(c => c.label.toLowerCase() === selection.toLowerCase());
          nextId = (selectionChoice && selectionChoice.nextNodeId) ? selectionChoice.nextNodeId : 'course_info';
          
          const infoNode = nodes.find(n => n.id === nextId)?.data;
          replyText = (infoNode?.message || '').replace('{{course}}', selection);
          outgoingQuickReplies = (infoNode?.choices || []).map(c => ({
            title: c.label,
            payload: c.payload || `faq_${c.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          }));
        } else {
          replyText = "Invalid course selection. Please reply with a course name or option number (1-4).";
          outgoingQuickReplies = choices.map(c => ({
            title: c.label,
            payload: c.payload || `course_${c.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          }));
          nextId = 'course_selection';
        }
      } 
      else if (['course_info', 'ds_info', 'da_info', 'ai_info', 'dm_info'].includes(currentNode.id)) {
        const val = text.toLowerCase();
        let targetPayload = text;

        if (!targetPayload.startsWith('faq_') && !targetPayload.startsWith('ds_') && !targetPayload.startsWith('da_') && !targetPayload.startsWith('ai_') && !targetPayload.startsWith('dm_') && targetPayload !== 'ask_something_else') {
          if (val.includes('fee')) targetPayload = 'faq_fees';
          else if (val.includes('dur') || val.includes('time')) targetPayload = 'faq_duration';
          else if (val.includes('syll') || val.includes('curri')) targetPayload = 'faq_syllabus';
          else if (val.includes('demo') || val.includes('class')) targetPayload = 'faq_demo';
          else if (val.includes('place') || val.includes('job')) targetPayload = 'faq_placement';
        }

        if (targetPayload === 'ask_something_else') {
          // Resolve nextId from active course
          if (nextCourse === 'Data Science') nextId = 'ds_info';
          else if (nextCourse === 'Data Analytics') nextId = 'da_info';
          else if (nextCourse === 'Artificial Intelligence') nextId = 'ai_info';
          else if (nextCourse === 'Digital Marketing') nextId = 'dm_info';
          else nextId = 'course_info';

          const infoNode = nodes.find(n => n.id === nextId)?.data;
          replyText = (infoNode?.message || '').replace('{{course}}', nextCourse || 'Data Science');
          outgoingQuickReplies = (infoNode?.choices || []).map(c => ({
            title: c.label,
            payload: c.payload || `faq_${c.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          }));
        } else {
          const choices = currentNode.choices || [];
          const matchedChoice = choices.find(c => c.payload === targetPayload);
          
          if (matchedChoice && matchedChoice.nextNodeId) {
            nextId = matchedChoice.nextNodeId;
          } else {
            // Dynamic fallback mapping
            if (targetPayload === 'faq_fees') nextId = 'faq_fees';
            else if (targetPayload === 'faq_duration') nextId = 'faq_duration';
            else if (targetPayload.includes('syllabus')) {
              if (nextCourse === 'Data Analytics') nextId = 'da_syllabus';
              else if (nextCourse === 'Artificial Intelligence') nextId = 'ai_syllabus';
              else if (nextCourse === 'Digital Marketing') nextId = 'dm_syllabus';
              else nextId = 'ds_syllabus';
            }
            else if (targetPayload === 'faq_demo') nextId = 'faq_demo';
            else if (targetPayload === 'faq_placement') nextId = 'faq_placement';
            else nextId = 'counselor_handoff';
          }

          const targetNode = nodes.find(n => n.id === nextId)?.data;
          if (targetNode) {
            if (targetNode.id === 'faq_placement') {
              replyText = "Our placement assistance program offers resume review, mock interviews, and access to partner hiring drives.";
              if (nextCourse === 'Data Science') nextId = 'ds_info';
              else if (nextCourse === 'Data Analytics') nextId = 'da_info';
              else if (nextCourse === 'Artificial Intelligence') nextId = 'ai_info';
              else if (nextCourse === 'Digital Marketing') nextId = 'dm_info';
              else nextId = 'course_info';

              outgoingQuickReplies = [
                { title: 'Ask Something Else', payload: 'ask_something_else' }
              ];
            } else {
              replyText = targetNode.message;
              if (targetNode.id === 'counselor_handoff' || targetNode.id === 'faq_demo') {
                nextId = 'counselor_handoff';
              } else {
                if (nextCourse === 'Data Science') nextId = 'ds_info';
                else if (nextCourse === 'Data Analytics') nextId = 'da_info';
                else if (nextCourse === 'Artificial Intelligence') nextId = 'ai_info';
                else if (nextCourse === 'Digital Marketing') nextId = 'dm_info';
                else nextId = 'course_info';

                outgoingQuickReplies = [
                  { title: 'Ask Something Else', payload: 'ask_something_else' }
                ];
              }
            }
          }
        }
      } 
      else if (currentNode.id === 'counselor_handoff') {
        replyText = "Chatbot is currently paused. A human counselor will reply shortly.";
        nextId = 'counselor_handoff';
      }

      setSimState({ currentNodeId: nextId, course: nextCourse });
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: replyText,
        quickReplies: outgoingQuickReplies,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', width: '100%', position: 'relative', overflow: 'hidden', flexDirection: 'column' }}>
      {/* Top Navbar / Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 5,
        flexShrink: 0
      }}>
        {/* Left Side: Back Button & Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0',
              borderRadius: '20px', color: '#64748b', fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', background: 'white',
            borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0', padding: '4px 8px'
          }}>
            <button onClick={() => zoomIn()} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex' }}><ZoomIn size={16} /></button>
            <button onClick={() => zoomOut()} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex' }}><ZoomOut size={16} /></button>
            <div style={{ width: 1, height: 18, background: '#e2e8f0', margin: '0 4px' }} />
            <button onClick={() => fitView({ padding: 0.15, duration: 500 })} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex' }}><Maximize size={16} /></button>
            <div style={{ width: 1, height: 18, background: '#e2e8f0', margin: '0 4px' }} />
            <button 
              onClick={handleAutoArrange}
              style={{
                background: 'none', border: 'none', padding: '4px 10px',
                cursor: 'pointer', color: INSTAGRAM_COLOR, fontWeight: 700,
                fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5
              }}
            >
              Arrange
            </button>
          </div>
        </div>

        {/* Center: Node Adding Toolbar */}
        <div style={{
          display: 'flex', gap: 6, background: 'white', borderRadius: '24px',
          border: '1px solid #e2e8f0', padding: '4px 8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', alignSelf: 'center', padding: '0 6px', borderRight: '1px solid #e2e8f0', marginRight: 4 }}>+ ADD</span>
          <button onClick={() => handleAddNode('Message')} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#9333ea', fontWeight: 600, fontSize: '0.78rem' }}>Msg</button>
          <button onClick={() => handleAddNode('CollectInfo')} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#ea580c', fontWeight: 600, fontSize: '0.78rem' }}>Collect</button>
          <button onClick={() => handleAddNode('Choice')} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#0d9488', fontWeight: 600, fontSize: '0.78rem' }}>Choice</button>
          <button onClick={() => handleAddNode('Condition')} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#16a34a', fontWeight: 600, fontSize: '0.78rem' }}>Branch</button>
          <button onClick={() => handleAddNode('FAQ')} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#ca8a04', fontWeight: 600, fontSize: '0.78rem' }}>FAQ</button>
          <button onClick={() => handleAddNode('CounselorHandoff')} style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#dc2626', fontWeight: 600, fontSize: '0.78rem' }}>Handoff</button>
        </div>

        {/* Right Side: Save Button */}
        <button 
          onClick={handleSaveFlow}
          style={{
            padding: '8px 18px', background: '#22c55e', color: 'white', border: 'none',
            borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)'
          }}
        >
          <Save size={16} /> Save Flow
        </button>
      </div>

      {/* Main Canvas and Simulator split container */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {/* Visual Canvas (Left) */}
        <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setActiveNode(n.data)}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            attributionPosition="bottom-left"
            style={{ width: '100%', height: '100%' }}
            panOnScroll={true}
            zoomOnPinch={true}
          >
            <Background color="#cbd5e1" gap={20} size={1} />
          </ReactFlow>
        </div>

      {/* Slide-over Right Node Editor Panel */}
      {activeNode && (
        <div style={{
          width: 380, background: 'white', borderLeft: '1px solid #e2e8f0',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.03)', zIndex: 100, display: 'flex',
          flexDirection: 'column', height: '100%', position: 'absolute', right: 0, top: 0
        }}>
          {/* Header */}
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Edit Node: {activeNode.name || activeNode.type}
            </h3>
            <button 
              onClick={() => setActiveNode(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                Node Name
              </label>
              <input
                type="text"
                value={activeNode.name || ''}
                onChange={(e) => setActiveNode({ ...activeNode, name: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />
            </div>

            {/* Triggers (Trigger Nodes) */}
            {activeNode.type === 'Trigger' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Triggers (comma separated)
                </label>
                <input
                  type="text"
                  value={(activeNode.triggers || []).join(', ')}
                  onChange={(e) => setActiveNode({ ...activeNode, triggers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
              </div>
            )}

            {/* Message/Response Text */}
            {activeNode.type !== 'Trigger' && activeNode.type !== 'Condition' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Message Text
                </label>
                <textarea
                  rows={6}
                  value={activeNode.message || ''}
                  onChange={(e) => setActiveNode({ ...activeNode, message: e.target.value })}
                  placeholder="Type the response message details..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            )}

            {/* Fields (Collect Info) */}
            {activeNode.type === 'CollectInfo' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  Fields to Collect
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px', color: '#334155' }}>
                    <input type="checkbox" checked={true} disabled style={{ width: 16, height: 16, accentColor: INSTAGRAM_COLOR }} />
                    <span>Full Name (Required)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px', color: '#334155' }}>
                    <input type="checkbox" checked={true} disabled style={{ width: 16, height: 16, accentColor: INSTAGRAM_COLOR }} />
                    <span>Mobile Number (Required)</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: '11px', color: '#64748b' }}>
                    * Mobile validation checks for Indian numbers and formats to +91XXXXXXXXXX.
                  </div>
                </div>
              </div>
            )}

            {/* Choices configuration */}
            {activeNode.type === 'Choice' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Quick Reply Options
                  </label>
                  <button 
                    onClick={() => {
                      const c = activeNode.choices || [];
                      setActiveNode({ ...activeNode, choices: [...c, { label: `Option ${c.length + 1}`, payload: `action_${Date.now()}`, nextNodeId: '' }] });
                    }}
                    style={{ background: 'none', border: 'none', color: INSTAGRAM_COLOR, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    + Add Quick Reply
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(activeNode.choices || []).map((choice, index) => (
                    <div key={index} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Quick Reply #{index + 1}</span>
                        <button 
                          type="button"
                          onClick={() => {
                            setActiveNode({ ...activeNode, choices: activeNode.choices.filter((_, i) => i !== index) });
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 4 }}
                          title="Delete Quick Reply"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: 2 }}>Label / Button Text</label>
                        <input
                          type="text"
                          value={choice.label}
                          onChange={(e) => {
                            const c = [...activeNode.choices];
                            c[index] = { ...choice, label: e.target.value };
                            setActiveNode({ ...activeNode, choices: c });
                          }}
                          placeholder="e.g. Data Science"
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: 2 }}>Payload / Action ID</label>
                        <input
                          type="text"
                          value={choice.payload || ''}
                          onChange={(e) => {
                            const c = [...activeNode.choices];
                            c[index] = { ...choice, payload: e.target.value };
                            setActiveNode({ ...activeNode, choices: c });
                          }}
                          placeholder="e.g. course_data_science"
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: 2 }}>Next Node</label>
                        <select
                          value={choice.nextNodeId || ''}
                          onChange={(e) => {
                            const c = [...activeNode.choices];
                            c[index] = { ...choice, nextNodeId: e.target.value };
                            setActiveNode({ ...activeNode, choices: c });
                          }}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: 'white' }}
                        >
                          <option value="">-- Connect visually or select --</option>
                          {nodes.filter(n => n.id !== activeNode.id).map(n => (
                            <option key={n.id} value={n.id}>[{n.data.type}] {n.data.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {activeNode.id === 'course_selection' && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: 2, fontWeight: 700 }}>SAVE ANSWER TO</label>
                    <input
                      type="text"
                      value="course"
                      disabled
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Course Association Selector */}
            {(activeNode.type === 'FAQ' || activeNode.type === 'Message') && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Course Association
                </label>
                <select
                  value={activeNode.course || ''}
                  onChange={(e) => setActiveNode({ ...activeNode, course: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' }}
                >
                  <option value="">None / All Courses</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Data Analytics">Data Analytics</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                </select>
              </div>
            )}

            {/* Next Step single connections dropdown */}
            {activeNode.type !== 'Choice' && activeNode.type !== 'Condition' && activeNode.type !== 'CounselorHandoff' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Next Step Target
                </label>
                <select
                  value={activeNode.nextNodeId || ''}
                  onChange={(e) => setActiveNode({ ...activeNode, nextNodeId: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' }}
                >
                  <option value="">-- Connect visually or select --</option>
                  {nodes.filter(n => n.id !== activeNode.id).map(n => (
                    <option key={n.id} value={n.id}>[{n.data.type}] {n.data.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Condition Check */}
            {activeNode.type === 'Condition' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Condition Logic
                </label>
                <select
                  value={activeNode.conditionType || 'check_crm_placement'}
                  onChange={(e) => setActiveNode({ ...activeNode, conditionType: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white' }}
                >
                  <option value="check_crm_placement">Check Course Placement details exists in CRM</option>
                </select>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: 4 }}>True Path Target Node</label>
                    <select
                      value={activeNode.trueNodeId || ''}
                      onChange={(e) => setActiveNode({ ...activeNode, trueNodeId: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    >
                      <option value="">-- Connect visually or select --</option>
                      {nodes.filter(n => n.id !== activeNode.id).map(n => (
                        <option key={n.id} value={n.id}>[{n.data.type}] {n.data.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: 4 }}>False Path Target (Handoff fallback)</label>
                    <select
                      value={activeNode.falseNodeId || ''}
                      onChange={(e) => setActiveNode({ ...activeNode, falseNodeId: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    >
                      <option value="">-- Connect visually or select --</option>
                      {nodes.filter(n => n.id !== activeNode.id).map(n => (
                        <option key={n.id} value={n.id}>[{n.data.type}] {n.data.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, background: '#fafafa' }}>
            <button 
              onClick={() => setActiveNode(null)}
              style={{ flex: 1, padding: '10px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button 
              onClick={() => handleSaveNodeDetails(activeNode)}
              style={{ flex: 1, padding: '10px 16px', background: INSTAGRAM_COLOR, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              Save Node
            </button>
          </div>
        </div>
      )}

      {/* Instagram Chat Simulator Panel (Right) */}
      <div style={{
        width: 360, background: '#ffffff', borderLeft: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0',
        zIndex: 10, flexShrink: 0, height: '100%', boxSizing: 'border-box',
        overflowY: 'auto', minHeight: 0
      }}>
        {/* Phone Frame mock */}
        <div style={{
          width: 310, height: 600, background: '#000000', borderRadius: '36px',
          padding: '11px', boxSizing: 'border-box', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          {/* Inner Screen */}
          <div style={{
            width: '100%', height: '100%', background: '#ffffff',
            borderRadius: '26px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Header styled like Instagram */}
            <div style={{
              background: '#ffffff', borderBottom: '1px solid #efefef',
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{
                width: 32, height: 32,
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                borderRadius: '50%', display: 'flex', justifyContent: 'center',
                alignItems: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem'
              }}>
                T
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#262626', lineHeight: 1.2 }}>TechZone Academy</span>
                <span style={{ fontSize: '0.68rem', color: '#8e8e8e' }}>Active in Chatbot</span>
              </div>
            </div>

            {/* Chat Stream */}
            <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: '#ffffff' }}>
              {chatMessages.map((msg, index) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={index} style={{
                    alignSelf: isBot ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isBot ? 'flex-start' : 'flex-end',
                    gap: 6
                  }}>
                    <div style={{
                      background: isBot ? '#efefef' : 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                      color: isBot ? '#262626' : '#ffffff',
                      borderRadius: isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.35
                    }}>
                      {msg.text}
                    </div>

                    {/* Render Quick Reply buttons below bot message if they exist */}
                    {isBot && msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {msg.quickReplies.map((qr, qrIdx) => (
                          <button
                            key={qrIdx}
                            onClick={() => handleSimSendMessage(qr.payload || qr.title)}
                            style={{
                              background: 'white',
                              border: `1.5px solid ${INSTAGRAM_COLOR}`,
                              color: INSTAGRAM_COLOR,
                              borderRadius: '16px',
                              padding: '5px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(225, 48, 108, 0.05)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
                          >
                            {qr.title}
                          </button>
                        ))}
                      </div>
                    )}

                    <span style={{ fontSize: '0.62rem', color: '#8e8e8e', marginTop: 1, padding: '0 4px' }}>{msg.timestamp}</span>
                  </div>
                );
              })}
            </div>

            {/* Input mock bar */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #efefef', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                placeholder="Reply to simulator..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleSimSendMessage(e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{
                  flex: 1, border: '1px solid #dbdbdb', borderRadius: '18px',
                  padding: '6px 12px', fontSize: '0.8rem', outline: 'none', color: '#262626'
                }}
              />
              <button 
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling;
                  if (input.value.trim()) {
                    handleSimSendMessage(input.value);
                    input.value = '';
                  }
                }}
                style={{ background: 'none', border: 'none', color: '#0095f6', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ================= OUTER WRAPPER PROVIDING CONTEXT =================

export default function InstagramFlowBuilder(props) {
  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      flex: 1,
      background: '#f8fafc',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxSizing: 'border-box'
    }}>
      <ReactFlowProvider>
        <FlowCanvas {...props} />
      </ReactFlowProvider>
    </div>
  );
}

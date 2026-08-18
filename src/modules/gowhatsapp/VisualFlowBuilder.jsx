import React, { useState, useEffect, useCallback } from 'react';
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
import { Smartphone, RefreshCcw, ZoomIn, ZoomOut, Maximize, Plus, Edit3, Trash2 } from 'lucide-react';

const BRAND_BLUE = '#2563eb';

// ================= CUSTOM NODES =================

const getStylesByType = (type) => {
  switch(type) {
    case 'Template': return { bg: '#f3e8ff', color: '#9333ea', edge: '#9333ea' };
    case 'Buttons': return { bg: '#ccfbf1', color: '#0d9488', edge: '#10b981' };
    case 'List': return { bg: '#ffedd5', color: '#ea580c', edge: '#f97316' };
    case 'Text': return { bg: '#e0e7ff', color: '#4f46e5', edge: '#6366f1' };
    case 'Document': return { bg: '#fee2e2', color: '#e11d48', edge: '#e11d48' };
    case 'Image': return { bg: '#e0e7ff', color: '#4f46e5', edge: '#6366f1' }; // Match image
    default: return { bg: '#fef3c7', color: '#d97706', edge: '#f59e0b' };
  }
};

const CustomNode = ({ data, id }) => {
  const styles = getStylesByType(data.responseType);
  
  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '16px', 
      border: '1px solid #e2e8f0', 
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      width: 320,
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Input Handle */}
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: '#94a3b8', border: '2px solid white' }} />
      
      {/* Node Header */}
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: styles.color }} />
          <div style={{ background: styles.bg, color: styles.color, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {data.responseType}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 700, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={data.trigger}>
            "{data.trigger}"
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {data.onEdit && (
            <button onClick={(e) => { e.stopPropagation(); data.onEdit(data.originalData); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, display: 'flex' }} title="Edit">
              <Edit3 size={14} />
            </button>
          )}
          {data.onDelete && (
            <button onClick={(e) => { e.stopPropagation(); data.onDelete(data.id); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, display: 'flex' }} title="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Node Body */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
          {data.responseType === 'Template' ? `Template: ${data.preview}` : `${data.responseType} Auto Reply`}
        </div>
        
        {data.responseType === 'Document' ? (
          (() => {
            const file = data.mediaFiles?.find(f => f.name === data.preview);
            const isImg = file && file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
            return isImg ? (
              <img src={file.url} alt={file.name} style={{ width: '100%', height: 'auto', borderRadius: 8, marginTop: 8 }} />
            ) : (
              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{data.preview}</div>
            );
          })()
        ) : (
          <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.4, whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data.responseType !== 'Template' ? data.preview : 'Hello! Thanks for reaching out.'}
          </div>
        )}
      </div>

      {/* Branches / Outputs */}
      {(data.responseType === 'Buttons') && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>BRANCHES ({(data.buttons || []).length})</span>
            {data.onAddBranch && (
              <button onClick={(e) => { e.stopPropagation(); data.onAddBranch(data.originalData); }} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', padding: 2 }} title="Add Branch Option">
                <Plus size={14} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
            {(data.buttons || []).map((btn, index) => (
              <div key={index} style={{ 
                background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', 
                fontSize: '0.8rem', fontWeight: 600, color: '#475569',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                {btn}
                {/* Specific output handle for this button */}
                <Handle 
                  type="source" 
                  position={Position.Right} 
                  id={btn}
                  style={{ top: 'auto', bottom: 'auto', right: -21, width: 10, height: 10, background: styles.color, border: '2px solid white' }} 
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Output for non-branching nodes */}
      {(data.responseType !== 'Buttons') && (
        <Handle type="source" position={Position.Right} id="default" style={{ width: 10, height: 10, background: styles.color, border: '2px solid white' }} />
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// ================= LAYOUT ENGINE (DAGRE) =================

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 200 });

  nodes.forEach((node) => {
    // Estimating node dimensions based on CustomNode structure
    const height = node.data.responseType === 'Buttons' && node.data.buttons ? 140 + (node.data.buttons.length * 40) : 150;
    dagreGraph.setNode(node.id, { width: 320, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 320 / 2,
        y: nodeWithPosition.y - 150 / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// ================= INNER CANVAS COMPONENT =================

function FlowCanvas({ customReplies, mediaFiles, onEdit, onDelete, onAddRule, onUpdateReply }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeNode, setActiveNode] = useState(null);
  const [previewInput, setPreviewInput] = useState('');
  
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleAddBranch = useCallback((replyData) => {
    if (!onUpdateReply) return;
    const currentButtons = Array.isArray(replyData.buttons) ? replyData.buttons : [];
    if (currentButtons.length >= 3) {
      alert("Maximum 3 buttons allowed by WhatsApp.");
      return;
    }
    const newBtnName = `New Option ${currentButtons.length + 1}`;
    const updatedReply = {
      ...replyData,
      buttons: [...currentButtons, newBtnName]
    };
    onUpdateReply(updatedReply);
  }, [onUpdateReply]);

  // Initialize nodes and edges from customReplies
  useEffect(() => {
    if (!customReplies || customReplies.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes = customReplies.map((reply) => ({
      id: reply.id,
      type: 'custom',
      data: { 
        ...reply, 
        originalData: reply,
        onEdit, 
        onDelete,
        onAddBranch: handleAddBranch,
        mediaFiles
      },
      position: { x: 0, y: 0 }, // Handled by dagre
    }));

    const newEdges = [];

    // Auto-generate edges based on Button text matching Triggers
    customReplies.forEach(sourceReply => {
      const sourceStyles = getStylesByType(sourceReply.responseType);
      
      if (sourceReply.responseType === 'Buttons' && sourceReply.buttons) {
        sourceReply.buttons.forEach(btnText => {
          // Find any reply where the trigger matches the button text
          const targetReply = customReplies.find(r => 
            r.id !== sourceReply.id && 
            r.trigger && 
            r.trigger.toLowerCase().includes(btnText.toLowerCase())
          );
          
          if (targetReply) {
            newEdges.push({
              id: `e-${sourceReply.id}-${targetReply.id}-${btnText}`,
              source: sourceReply.id,
              sourceHandle: btnText,
              target: targetReply.id,
              type: 'smoothstep',
              animated: false,
              style: { stroke: sourceStyles.edge, strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: sourceStyles.edge },
            });
          }
        });
      }
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    // Fit view after a short delay to allow React Flow to render nodes with their real dimensions
    setTimeout(() => {
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.25, duration: 800 });
      });
    }, 250);
  }, [customReplies, onEdit, onDelete, fitView]);

  const onConnect = useCallback((params) => {
    // Visually add the edge immediately for smooth UX
    setEdges((eds) => addEdge({ 
      ...params, 
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    }, eds));

    // Update the underlying data if we have a valid branch connection
    if (params.sourceHandle && params.target && onUpdateReply) {
      const targetNode = customReplies.find(r => r.id === params.target);
      if (targetNode) {
        onUpdateReply({
          ...targetNode,
          trigger: params.sourceHandle
        });
      }
    }
  }, [setEdges, customReplies, onUpdateReply]);

  const onNodeClick = (_, node) => {
    setActiveNode(node);
  };

  const handleAutoArrange = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 500 });
    }, 50);
  };

  const simulateMessage = (text) => {
    if (!text) return;
    const targetReply = customReplies.find(r => 
      r.trigger && r.trigger.toLowerCase().includes(text.toLowerCase())
    );
    if (targetReply) {
      setActiveNode({ data: targetReply });
    }
    setPreviewInput('');
  };

  return (
    <>
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          attributionPosition="bottom-left"
        >
          <Background color="#e2e8f0" gap={24} size={2} />
          
          {/* Custom Top Toolbar Panel matching Image 2 */}
          <Panel position="top-left" style={{ margin: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Zoom Controls Pill */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '4px 8px' }}>
                <button onClick={() => zoomIn()} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex' }}><ZoomIn size={18} /></button>
                <button onClick={() => zoomOut()} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex' }}><ZoomOut size={18} /></button>
                <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
                <button onClick={() => fitView({ padding: 0.2, duration: 500 })} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex' }}><Maximize size={18} /></button>
                <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
                <button onClick={handleAutoArrange} style={{ background: 'none', border: 'none', padding: '8px 12px', cursor: 'pointer', color: BRAND_BLUE, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                  <RefreshCcw size={16} /> Auto-Arrange
                </button>
              </div>
              
              {/* Add Buttons */}
              <button onClick={onAddRule} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '24px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                <Plus size={18} /> Add Rule
              </button>
              
              <button onClick={onAddRule} style={{ padding: '10px 20px', background: '#f97316', color: 'white', border: 'none', borderRadius: '24px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)' }}>
                <Plus size={18} /> Add List Menu
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Mobile Preview Panel */}
      <div style={{ width: 400, background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', zIndex: 10, boxShadow: '-4px 0 15px rgba(0,0,0,0.03)' }}>
        <div style={{ 
          width: 320, height: 650, background: '#111827', borderRadius: 40, padding: 12, boxSizing: 'border-box',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1), inset 0 4px 10px rgba(255,255,255,0.1)'
        }}>
          <div style={{ width: '100%', height: '100%', background: '#efeae2', borderRadius: 32, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Mobile Header */}
            <div style={{ background: '#075e54', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, color: 'white' }}>
              <div style={{ width: 40, height: 40, background: '#fff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#075e54', fontWeight: 'bold' }}>
                <Smartphone size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>Chatbot Preview</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>online</div>
              </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              
              {!activeNode ? (
                <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '0 16px 16px 16px', fontSize: '0.9rem', color: '#334155', alignSelf: 'flex-start', maxWidth: '85%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  Click on any node in the canvas to preview the message here.
                </div>
              ) : (
                <>
                  {/* User Trigger Message */}
                  <div style={{ background: '#d9fdd3', padding: '12px 16px', borderRadius: '16px 0 16px 16px', fontSize: '0.9rem', color: '#334155', alignSelf: 'flex-end', maxWidth: '85%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {activeNode.data.trigger}
                  </div>

                  {/* Bot Response Message */}
                  <div style={{ background: '#fff', padding: (activeNode.data.responseType === 'Document' && activeNode.data.preview.match(/\.(jpeg|jpg|gif|png|webp)$/i)) ? '4px' : '12px 16px', borderRadius: '0 16px 16px 16px', fontSize: '0.9rem', color: '#334155', alignSelf: 'flex-start', maxWidth: '85%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {activeNode.data.responseType === 'Template' ? (
                      <div>
                        <strong>Template: {activeNode.data.preview}</strong><br/>
                        <span style={{color: '#64748b'}}>(Dynamic content would load here)</span>
                      </div>
                    ) : activeNode.data.responseType === 'Document' ? (
                      (() => {
                        const file = mediaFiles?.find(f => f.name === activeNode.data.preview);
                        const isImg = file && file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                        return isImg ? (
                          <img src={file.url} alt={file.name} style={{ width: '100%', borderRadius: '0 12px 12px 12px', display: 'block' }} />
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{activeNode.data.preview}</div>
                        );
                      })()
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{activeNode.data.preview}</div>
                    )}
                    
                    {/* Bot Buttons rendering inside chat bubble */}
                    {(activeNode.data.responseType === 'Buttons' && activeNode.data.buttons) && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {activeNode.data.buttons.map((btn, i) => (
                          <div 
                            key={i} 
                            onClick={() => simulateMessage(btn)}
                            style={{ padding: '10px', background: '#f1f5f9', color: '#0ea5e9', textAlign: 'center', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                            onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                          >
                            {btn}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Input Bar */}
            <div style={{ padding: '12px 20px', background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: 12 }}>
              <input 
                type="text"
                value={previewInput}
                onChange={(e) => setPreviewInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && simulateMessage(previewInput)}
                placeholder="Type a trigger keyword..."
                style={{ flex: 1, background: '#fff', padding: '10px 16px', borderRadius: 24, fontSize: '0.9rem', color: '#334155', border: 'none', outline: 'none' }}
              />
              <button 
                onClick={() => simulateMessage(previewInput)}
                style={{ width: 40, height: 40, background: '#00a884', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ================= WRAPPER =================

export default function VisualFlowBuilder(props) {
  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 200px)', background: '#f8fafc', borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: 24 }}>
      <ReactFlowProvider>
        <FlowCanvas {...props} />
      </ReactFlowProvider>
    </div>
  );
}

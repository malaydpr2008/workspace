'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UniversalNode } from '../nodes/UniversalNode';
import { useGraphStore } from '@/lib/workspaceStore';
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Cpu,
  MonitorPlay,
  Sliders,
  ChevronDown,
} from 'lucide-react';

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'bezier',
  animated: true,
  style: { strokeWidth: 2, stroke: '#64748b' },
};

function GraphToolbar({ onAddNode }: { onAddNode: (category: string) => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { syncStatus, syncGraph, isSyncing, lastSyncedAt } = useGraphStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSelectCategory = (cat: string) => {
    setIsMenuOpen(false);
    onAddNode(cat);
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
      {/* Add Node Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg text-xs font-semibold font-mono tracking-wide transition-all border border-indigo-400/40"
          title="Add a new node to the canvas"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Node</span>
          <ChevronDown className="w-3 h-3 opacity-80" />
        </button>

        {isMenuOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-60 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md p-1.5 text-xs text-slate-200 z-50 flex flex-col space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800">
              Select Node Type
            </div>

            <button
              onClick={() => handleSelectCategory('input')}
              className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg hover:bg-emerald-950/50 hover:text-emerald-300 text-left transition-colors border border-transparent hover:border-emerald-500/30"
            >
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-emerald-300">Input Node</div>
                <div className="text-[10px] text-slate-400">Screenplay, raw stream, or prompt input</div>
              </div>
            </button>

            <button
              onClick={() => handleSelectCategory('transform')}
              className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg hover:bg-purple-950/50 hover:text-purple-300 text-left transition-colors border border-transparent hover:border-purple-500/30"
            >
              <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <div className="font-semibold text-purple-300">Transform Node</div>
                <div className="text-[10px] text-slate-400">AI Story Copilot, Dialogue Doctor, LLM</div>
              </div>
            </button>

            <button
              onClick={() => handleSelectCategory('output')}
              className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg hover:bg-sky-950/50 hover:text-sky-300 text-left transition-colors border border-transparent hover:border-sky-500/30"
            >
              <MonitorPlay className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <div className="font-semibold text-sky-300">Output Node</div>
                <div className="text-[10px] text-slate-400">Production Storyboard & Render specs</div>
              </div>
            </button>

            <button
              onClick={() => handleSelectCategory('default')}
              className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-left transition-colors border border-transparent hover:border-slate-600"
            >
              <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-200">Universal Node</div>
                <div className="text-[10px] text-slate-400">Custom metadata & pipeline pass-through</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Canvas Viewport Zoom & Fit Controls */}
      <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-lg backdrop-blur">
        <button
          onClick={() => zoomIn()}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l border-slate-800"
          title="Fit View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Backend Sync Indicator */}
      <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 shadow-lg backdrop-blur text-xs font-mono">
        {syncStatus === 'saving' || isSyncing ? (
          <div className="flex items-center space-x-1.5 text-amber-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="text-[11px]">Saving...</span>
          </div>
        ) : syncStatus === 'saved' ? (
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Backend Synced</span>
          </div>
        ) : syncStatus === 'error' ? (
          <div className="flex items-center space-x-1.5 text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[11px]">Sync Error</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span className="text-[11px]">Ready</span>
          </div>
        )}

        <button
          onClick={() => syncGraph()}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-1"
          title={`Click to manually sync graph${lastSyncedAt ? ` (Last: ${lastSyncedAt.toLocaleTimeString()})` : ''}`}
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}

function InnerGraphCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useGraphStore();
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo(() => ({ universalNode: UniversalNode }), []);

  const handleAddNodeFromCenter = useCallback(
    (category: string) => {
      // Calculate center of screen or flow position
      const centerX = window.innerWidth ? window.innerWidth / 2 : 400;
      const centerY = window.innerHeight ? window.innerHeight / 2 : 300;
      let flowPos = { x: 300, y: 200 };
      try {
        flowPos = screenToFlowPosition({ x: centerX, y: centerY });
      } catch {
        // Fallback if not available
      }
      addNode(category, flowPos);
    },
    [addNode, screenToFlowPosition]
  );

  return (
    <div className="w-full h-full relative select-none bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.1}
        maxZoom={2.5}
        colorMode="dark"
        className="touch-none"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls
          showInteractive={false}
          className="!bg-slate-900 !border !border-slate-800 !rounded-lg !shadow-2xl overflow-hidden [&>button]:!bg-slate-900 [&>button]:!border-b [&>button]:!border-slate-800 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-800 hover:[&>button]:!text-white"
        />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-slate-900/90 !border !border-slate-800 !rounded-xl !shadow-2xl overflow-hidden"
          nodeColor={(n) => {
            const cat = n.data?.category;
            if (cat === 'input') return '#10b981';
            if (cat === 'transform') return '#a855f7';
            if (cat === 'output') return '#0ea5e9';
            return '#6366f1';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
        />
        <GraphToolbar onAddNode={handleAddNodeFromCenter} />
      </ReactFlow>
    </div>
  );
}

export const WorkspaceGraphCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <InnerGraphCanvas />
    </ReactFlowProvider>
  );
};

export default WorkspaceGraphCanvas;

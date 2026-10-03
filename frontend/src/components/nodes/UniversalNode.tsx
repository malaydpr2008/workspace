'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
  Sliders,
  FileText,
  Cpu,
  MonitorPlay,
  Copy,
  Check,
} from 'lucide-react';
import { useGraphStore, FlowNode } from '@/lib/workspaceStore';

function getCategoryConfig(category?: string) {
  switch (category) {
    case 'input':
      return {
        accentBorder: 'border-emerald-500/50 hover:border-emerald-400',
        headerBg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        pinBg: '!bg-emerald-400 !border-emerald-200',
        icon: FileText,
        label: 'INPUT',
      };
    case 'transform':
      return {
        accentBorder: 'border-purple-500/50 hover:border-purple-400',
        headerBg: 'bg-purple-950/80 border-purple-500/30 text-purple-200',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        pinBg: '!bg-purple-400 !border-purple-200',
        icon: Cpu,
        label: 'TRANSFORM',
      };
    case 'output':
      return {
        accentBorder: 'border-sky-500/50 hover:border-sky-400',
        headerBg: 'bg-sky-950/80 border-sky-500/30 text-sky-200',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        pinBg: '!bg-sky-400 !border-sky-200',
        icon: MonitorPlay,
        label: 'OUTPUT',
      };
    default:
      return {
        accentBorder: 'border-indigo-500/40 hover:border-indigo-400',
        headerBg: 'bg-slate-800/90 border-slate-700 text-indigo-200',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        pinBg: '!bg-indigo-400 !border-indigo-200',
        icon: Sliders,
        label: 'NODE',
      };
  }
}

export const UniversalNode: React.FC<NodeProps<FlowNode>> = memo(({ id, data, selected }) => {
  const { deleteNode, updateNodeData } = useGraphStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(data.title || 'Untitled Node');
  const [copied, setCopied] = useState(false);

  const category = (data.category as string) || 'default';
  const config = getCategoryConfig(category);
  const IconComponent = config.icon;
  const isCollapsed = Boolean(data.is_collapsed);

  // Fallback sockets if none configured in data
  const inputs =
    data.inputs && data.inputs.length > 0
      ? data.inputs
      : category === 'input'
      ? []
      : [{ id: 'in-default', name: 'Input', type: 'any' }];

  const outputs =
    data.outputs && data.outputs.length > 0
      ? data.outputs
      : category === 'output'
      ? []
      : [{ id: 'out-default', name: 'Output', type: 'any' }];

  const handleToggleCollapse = useCallback(() => {
    updateNodeData(id, { is_collapsed: !isCollapsed });
  }, [id, isCollapsed, updateNodeData]);

  const handleTitleSubmit = useCallback(() => {
    setIsEditingTitle(false);
    if (localTitle.trim() && localTitle !== data.title) {
      updateNodeData(id, { title: localTitle.trim() });
    }
  }, [id, localTitle, data.title, updateNodeData]);

  const handleDataChange = useCallback(
    (field: string, value: unknown) => {
      updateNodeData(id, { [field]: value });
    },
    [id, updateNodeData]
  );

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [id]);

  return (
    <div
      className={`relative min-w-[300px] max-w-[380px] rounded-xl bg-slate-900/95 border backdrop-blur-md shadow-2xl transition-all duration-150 ${
        config.accentBorder
      } ${selected ? 'ring-2 ring-cyan-400 shadow-cyan-500/20 shadow-lg' : ''}`}
    >
      {/* Header Bar */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-b cursor-grab active:cursor-grabbing select-none ${config.headerBg}`}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-60" />
          <IconComponent className="w-4 h-4 shrink-0" />

          {isEditingTitle ? (
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setLocalTitle(data.title || 'Untitled Node');
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="nodrag nopan bg-slate-950/80 border border-cyan-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full font-semibold"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingTitle(true)}
              className="text-xs font-semibold tracking-wide truncate cursor-pointer hover:underline"
              title="Double click to rename"
            >
              {data.title || 'Untitled Node'}
            </span>
          )}

          <span
            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase shrink-0 font-bold ${config.badgeBg}`}
          >
            {config.label}
          </span>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center space-x-1 shrink-0 ml-2">
          <button
            onClick={handleCopyId}
            title={copied ? 'Copied Node ID' : 'Copy Node ID'}
            className="nodrag nopan p-1 rounded hover:bg-black/30 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            onClick={handleToggleCollapse}
            title={isCollapsed ? 'Expand node body' : 'Collapse node body'}
            className="nodrag nopan p-1 rounded hover:bg-black/30 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => deleteNode(id)}
            title="Delete Node"
            className="nodrag nopan p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sockets Row (Left Inputs & Right Outputs) */}
      <div className="px-3 py-2 flex justify-between items-start gap-4 text-[11px] font-mono border-b border-slate-800/80 bg-slate-950/40">
        {/* Left Column (Inputs) */}
        <div className="flex flex-col space-y-2 flex-1">
          {inputs.map((inp) => (
            <div key={inp.id} className="relative flex items-center space-x-2">
              <Handle
                type="target"
                position={Position.Left}
                id={inp.id}
                className={`!w-3 !h-3 !-left-[18px] rounded-full border-2 !border-slate-900 transition-all hover:scale-125 hover:!border-white ${config.pinBg}`}
              />
              <span className="text-slate-300 font-medium">{inp.name}</span>
              {inp.type && <span className="text-[9px] text-slate-500">[{inp.type}]</span>}
            </div>
          ))}
          {inputs.length === 0 && <span className="text-[10px] text-slate-600 italic">No inputs</span>}
        </div>

        {/* Right Column (Outputs) */}
        <div className="flex flex-col space-y-2 items-end flex-1">
          {outputs.map((out) => (
            <div key={out.id} className="relative flex items-center space-x-2">
              {out.type && <span className="text-[9px] text-slate-500">[{out.type}]</span>}
              <span className="text-slate-300 font-medium">{out.name}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={out.id}
                className={`!w-3 !h-3 !-right-[18px] rounded-full border-2 !border-slate-900 transition-all hover:scale-125 hover:!border-white ${config.pinBg}`}
              />
            </div>
          ))}
          {outputs.length === 0 && <span className="text-[10px] text-slate-600 italic">No outputs</span>}
        </div>
      </div>

      {/* Collapsible Card Body */}
      {!isCollapsed && (
        <div className="p-3 space-y-3 text-xs text-slate-200">
          {/* Input Node Form Controls */}
          {category === 'input' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Script / Prompt Text</span>
                <span className="font-mono text-[10px] text-emerald-400">RAW STREAM</span>
              </div>
              <textarea
                value={data.text ?? ''}
                onChange={(e) => handleDataChange('text', e.target.value)}
                placeholder="EXT. NEON ROOFTOP - NIGHT..."
                rows={4}
                className="nodrag nopan nowheel w-full bg-slate-950/80 border border-slate-700/80 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none transition-colors"
              />
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-400">Format:</span>
                <select
                  value={data.format || 'Final Draft'}
                  onChange={(e) => handleDataChange('format', e.target.value)}
                  className="nodrag nopan bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Final Draft">Final Draft (Fountain)</option>
                  <option value="Standard Script">Standard Script</option>
                  <option value="Storyboard Beats">Storyboard Beats</option>
                </select>
              </div>
            </div>
          )}

          {/* Transform Node Form Controls */}
          {category === 'transform' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex justify-between">
                  <span>AI Engine / Model</span>
                  <span className="text-[10px] text-purple-400 font-mono">LLM</span>
                </label>
                <select
                  value={data.model || 'gpt-4o-cinematic'}
                  onChange={(e) => handleDataChange('model', e.target.value)}
                  className="nodrag nopan w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="gpt-4o-cinematic">GPT-4o (Cinematic Co-pilot)</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Dialogue Doctor)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Story Analyzer)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex justify-between">
                  <span>Punch-Up Tone</span>
                  <span className="text-[10px] text-purple-400 font-mono">STYLE</span>
                </label>
                <select
                  value={data.style || 'Punchier & Subtext-heavy'}
                  onChange={(e) => handleDataChange('style', e.target.value)}
                  className="nodrag nopan w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="Punchier & Subtext-heavy">Punchier & Subtext-heavy</option>
                  <option value="Cynical Noir">Cynical Noir</option>
                  <option value="Urgent & Sparse">Urgent & Sparse</option>
                  <option value="Naturalistic Mumblecore">Naturalistic Mumblecore</option>
                </select>
              </div>

              <div className="pt-1 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Creativity (Temp):</span>
                  <span className="font-mono text-purple-300 font-semibold">{data.temperature ?? 0.7}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={data.temperature ?? 0.7}
                  onChange={(e) => handleDataChange('temperature', parseFloat(e.target.value))}
                  className="nodrag nopan w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Output Node Form Controls */}
          {category === 'output' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Aspect Ratio:</span>
                <select
                  value={data.aspectRatio || '16:9 Anamorphic'}
                  onChange={(e) => handleDataChange('aspectRatio', e.target.value)}
                  className="nodrag nopan bg-slate-950/80 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="16:9 Anamorphic">16:9 Anamorphic</option>
                  <option value="2.39:1 Cinemascope">2.39:1 Cinemascope</option>
                  <option value="1.85:1 Academy">1.85:1 Academy</option>
                  <option value="9:16 Vertical">9:16 Vertical Reel</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target Resolution:</span>
                <select
                  value={data.resolution || '4K Ultra-HD'}
                  onChange={(e) => handleDataChange('resolution', e.target.value)}
                  className="nodrag nopan bg-slate-950/80 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="4K Ultra-HD">4K Ultra-HD (3840x2160)</option>
                  <option value="1080p Full-HD">1080p Full-HD (1920x1080)</option>
                  <option value="8K Master">8K Master Production</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Pipeline Status:</span>
                <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span>{data.status || 'Active & Ready'}</span>
                </span>
              </div>
            </div>
          )}

          {/* Default / Generic Node Body */}
          {category !== 'input' && category !== 'transform' && category !== 'output' && (
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400">Node Description / Notes</label>
              <textarea
                value={data.notes ?? ''}
                onChange={(e) => handleDataChange('notes', e.target.value)}
                placeholder="Universal graph node metadata..."
                rows={2}
                className="nodrag nopan nowheel w-full bg-slate-950/80 border border-slate-700/80 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
              />
            </div>
          )}
        </div>
      )}

      {/* Subtle Node Footer Bar */}
      <div className="px-3 py-1.5 bg-slate-950/70 rounded-b-xl border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>ID: {id.slice(0, 8)}...</span>
        <span>xyflow • v12</span>
      </div>
    </div>
  );
});

UniversalNode.displayName = 'UniversalNode';

'use client';

import React from 'react';
import {
  Folder,
  FolderOpen,
  Clapperboard,
  BookOpen,
  FileText,
  Film,
  Bookmark,
  MessageSquareQuote,
  Activity,
  AlignLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { NodeType } from '@/types/workspace';

interface TreeNodeItemProps {
  nodeId: string;
  level?: number;
}

const getNodeIcon = (type: NodeType, isExpanded: boolean) => {
  switch (type) {
    case 'folder':
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
      );
    case 'screenplay':
      return <Clapperboard className="w-4 h-4 text-cyan-400 shrink-0" />;
    case 'story':
      return <BookOpen className="w-4 h-4 text-violet-400 shrink-0" />;
    case 'article':
      return <FileText className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'scene':
      return <Film className="w-4 h-4 text-rose-400 shrink-0" />;
    case 'chapter':
      return <Bookmark className="w-4 h-4 text-indigo-400 shrink-0" />;
    case 'dialogue':
      return <MessageSquareQuote className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'action':
      return <Activity className="w-4 h-4 text-amber-300 shrink-0" />;
    case 'paragraph':
      return <AlignLeft className="w-4 h-4 text-slate-400 shrink-0" />;
    default:
      return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  }
};

export const TreeNodeItem: React.FC<TreeNodeItemProps> = ({ nodeId, level = 0 }) => {
  const {
    nodes,
    childrenMap,
    expandedNodeIds,
    selectedNodeId,
    toggleExpandNode,
    selectNode,
  } = useWorkspaceStore();

  const node = nodes[nodeId];
  if (!node) return null;

  const childIds = childrenMap[nodeId] || [];
  const isExpanded = expandedNodeIds.includes(nodeId);
  const isSelected = selectedNodeId === nodeId;

  // Nodes that can typically have children
  const isContainerType = ['folder', 'screenplay', 'story', 'scene', 'chapter'].includes(
    node.type
  );
  const hasLoadedChildren = childIds.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpandNode(nodeId);
  };

  const handleSelect = () => {
    selectNode(nodeId);
  };

  const displayName =
    node.title.trim() ||
    (node.content ? node.content.slice(0, 30) + '...' : `Untitled ${node.type}`);

  return (
    <div className="select-none text-sm font-medium">
      <div
        onClick={handleSelect}
        style={{ paddingLeft: `${Math.max(level * 14 + 8, 8)}px` }}
        className={`group flex items-center pr-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 relative ${
          isSelected
            ? 'bg-slate-800/90 text-white shadow-sm ring-1 ring-white/10'
            : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
        }`}
      >
        {/* Active Indicator Bar */}
        {isSelected && (
          <div className="absolute left-1 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />
        )}

        {/* Expand / Collapse toggle */}
        <button
          onClick={handleToggle}
          className={`w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700/60 transition-colors mr-1 shrink-0 ${
            !isContainerType ? 'invisible' : 'visible'
          }`}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300" />
          )}
        </button>

        {/* Icon */}
        <span className="mr-2">{getNodeIcon(node.type, isExpanded)}</span>

        {/* Label */}
        <span className="truncate flex-1 text-[13px] tracking-wide">
          {displayName}
        </span>

        {/* Sub-item count badge for containers */}
        {isContainerType && hasLoadedChildren && (
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {childIds.length}
          </span>
        )}
      </div>

      {/* Recursive Children */}
      {isExpanded && childIds.length > 0 && (
        <div className="relative mt-0.5">
          {/* Subtle guide line */}
          <div
            style={{ left: `${level * 14 + 18}px` }}
            className="absolute top-0 bottom-0 w-px bg-slate-800/80 pointer-events-none"
          />
          {childIds.map((cid) => (
            <TreeNodeItem key={cid} nodeId={cid} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

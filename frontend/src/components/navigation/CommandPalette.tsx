'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Clapperboard,
  BookOpen,
  FileText,
  Folder,
  Film,
  Bookmark,
  User,
  Sparkles,
  ArrowRight,
  Command,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface CommandItem {
  id: string;
  title: string;
  category: 'Actions' | 'Documents' | 'Scenes & Chapters' | 'Characters';
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  onSelect: () => void | Promise<void>;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    nodes,
    characters,
    createNewNode,
    selectNode,
  } = useWorkspaceStore();

  const inputRef = useRef<HTMLInputElement>(null);

  // Global keydown listener for Cmd+K and Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            setQuery('');
            setSelectedIndex(0);
          }
          return !prev;
        });
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Aggregate searchable items
  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // 1. Quick Actions
    list.push({
      id: 'action-new-screenplay',
      title: 'Create New Screenplay',
      category: 'Actions',
      subtitle: 'Spawn a feature screenplay document',
      icon: Clapperboard,
      colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      onSelect: async () => {
        const created = await createNewNode('screenplay', 'Untitled Screenplay');
        if (created) await selectNode(created.id);
      },
    });

    list.push({
      id: 'action-new-story',
      title: 'Create New Story / Novel',
      category: 'Actions',
      subtitle: 'Start a long-form prose manuscript',
      icon: BookOpen,
      colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
      onSelect: async () => {
        const created = await createNewNode('story', 'Untitled Novel');
        if (created) await selectNode(created.id);
      },
    });

    list.push({
      id: 'action-new-article',
      title: 'Create New Editorial Article',
      category: 'Actions',
      subtitle: 'Write tech spec or architecture brief',
      icon: FileText,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      onSelect: async () => {
        const created = await createNewNode('article', 'Untitled Article');
        if (created) await selectNode(created.id);
      },
    });

    // 2. Documents & Containers
    const allNodes = Object.values(nodes);
    allNodes
      .filter((n) => ['screenplay', 'story', 'article', 'folder'].includes(n.type))
      .forEach((n) => {
        let icon = FileText;
        let colorClass = 'text-slate-400 bg-slate-800 border-slate-700';

        if (n.type === 'screenplay') {
          icon = Clapperboard;
          colorClass = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
        } else if (n.type === 'story') {
          icon = BookOpen;
          colorClass = 'text-violet-400 bg-violet-500/10 border-violet-500/30';
        } else if (n.type === 'article') {
          icon = FileText;
          colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        } else if (n.type === 'folder') {
          icon = Folder;
          colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        }

        list.push({
          id: `doc-${n.id}`,
          title: n.title || `Untitled ${n.type}`,
          category: 'Documents',
          subtitle: `${n.type.toUpperCase()}`,
          icon,
          colorClass,
          onSelect: async () => {
            await selectNode(n.id);
          },
        });
      });

    // 3. Scenes & Chapters
    allNodes
      .filter((n) => n.type === 'scene' || n.type === 'chapter')
      .forEach((n) => {
        const isScene = n.type === 'scene';
        const parentNode = n.parent ? nodes[n.parent] : null;

        list.push({
          id: `sub-${n.id}`,
          title: n.title || `Untitled ${n.type}`,
          category: 'Scenes & Chapters',
          subtitle: parentNode ? `inside ${parentNode.title}` : undefined,
          icon: isScene ? Film : Bookmark,
          colorClass: isScene
            ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
            : 'text-purple-400 bg-purple-500/10 border-purple-500/30',
          onSelect: async () => {
            await selectNode(n.id);
          },
        });
      });

    // 4. Characters
    Object.values(characters).forEach((c) => {
      list.push({
        id: `char-${c.id}`,
        title: c.name,
        category: 'Characters',
        subtitle: 'Character Profile',
        icon: User,
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        onSelect: () => {
          // No-op or navigate
        },
      });
    });

    return list;
  }, [nodes, characters, createNewNode, selectNode]);

  // Filter items based on user search query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q)
    );
  }, [items, query]);

  const activeIndex =
    selectedIndex >= filteredItems.length ? 0 : selectedIndex;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? filteredItems.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredItems[activeIndex];
      if (current) {
        current.onSelect();
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans z-10 flex flex-col max-h-[75vh]">
        {/* Search Bar Input */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center space-x-3 shrink-0">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search workspace (documents, scenes, characters)..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
            <span>ESC</span>
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <p>No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === activeIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.onSelect();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-600/15 border border-cyan-500/40 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-900/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`p-1.5 rounded-lg border shrink-0 ${item.colorClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="truncate">
                      <div className="text-xs font-medium truncate flex items-center space-x-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center space-x-1 text-cyan-400 text-[11px] font-mono shrink-0 pl-2">
                      <span>Jump</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-slate-900/40 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                ↑↓
              </kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                ↵
              </kbd>
              <span>select</span>
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Command className="w-3 h-3 text-slate-600" />
            <span>Universal Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
};

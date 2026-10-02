'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, Copy, Check, FileDown, FileText, ChevronDown, Printer, Archive, MessageSquare } from 'lucide-react';

interface DocumentExportButtonProps {
  onExportPrimary: () => void;
  primaryLabel: string;
  primaryExtension: string;
  onExportPlainText?: () => void;
  onExportWithNotes?: () => void;
  onExportBible?: () => void;
  onCopyClipboard: () => Promise<boolean>;
  onPrint?: () => void;
}

export const DocumentExportButton: React.FC<DocumentExportButtonProps> = ({
  onExportPrimary,
  primaryLabel,
  primaryExtension,
  onExportPlainText,
  onExportWithNotes,
  onExportBible,
  onCopyClipboard,
  onPrint,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopy = async () => {
    const success = await onCopyClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1200);
    }
  };

  const handlePrint = () => {
    setIsOpen(false);
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-all shadow-sm"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400" />
        <span>Export</span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-1.5 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100 font-sans">
          <div className="px-2.5 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Document Compilation
          </div>

          <button
            onClick={() => {
              onExportPrimary();
              setIsOpen(false);
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
          >
            <FileDown className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="truncate">
              <div className="font-medium">{primaryLabel}</div>
              <div className="text-[10px] text-slate-400 font-mono">.{primaryExtension} file</div>
            </div>
          </button>

          {onExportPlainText && (
            <button
              onClick={() => {
                onExportPlainText();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <div className="font-medium">Plain Text (.txt)</div>
                <div className="text-[10px] text-slate-400 font-mono">Standard text file</div>
              </div>
            </button>
          )}

          {onExportWithNotes && (
            <button
              onClick={() => {
                onExportWithNotes();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <MessageSquare className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="truncate">
                <div className="font-medium">Script with Review Notes</div>
                <div className="text-[10px] text-slate-400 font-mono">Annotated marginalia export</div>
              </div>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
          >
            <Printer className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="truncate">
              <div className="font-medium">Print / Save PDF</div>
              <div className="text-[10px] text-slate-400 font-mono">Industry Standard (Courier 12pt)</div>
            </div>
          </button>

          {onExportBible && (
            <button
              onClick={() => {
                onExportBible();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <Archive className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <div className="font-medium">Export Production Bible (ZIP)</div>
                <div className="text-[10px] text-slate-400 font-mono">Script, Sides, CSVs, Manifest</div>
              </div>
            </button>
          )}

          <div className="border-t border-slate-800/80 my-1" />

          <button
            onClick={handleCopy}
            className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div className="truncate">
              <div className="font-medium">{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</div>
              <div className="text-[10px] text-slate-400">Raw compiled buffer</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

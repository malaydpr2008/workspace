'use client';

import React from 'react';
import { Tag, Sparkles, Shirt, Volume2, MapPin, Car, Palette, X } from 'lucide-react';
import { BreakdownCategory, BreakdownElement } from '@/types/workspace';

export interface CategoryConfig {
  label: string;
  badgeClass: string;
  dotColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORY_CONFIGS: Record<BreakdownCategory, CategoryConfig> = {
  PROP: {
    label: 'Prop',
    badgeClass: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40 hover:border-emerald-400',
    dotColor: 'bg-emerald-400',
    borderColor: 'border-emerald-500',
    icon: Tag,
  },
  COSTUME: {
    label: 'Costume',
    badgeClass: 'text-violet-300 bg-violet-950/60 border-violet-500/40 hover:border-violet-400',
    dotColor: 'bg-violet-400',
    borderColor: 'border-violet-500',
    icon: Shirt,
  },
  VFX: {
    label: 'VFX',
    badgeClass: 'text-cyan-300 bg-cyan-950/60 border-cyan-500/40 hover:border-cyan-400',
    dotColor: 'bg-cyan-400',
    borderColor: 'border-cyan-500',
    icon: Sparkles,
  },
  SFX: {
    label: 'SFX',
    badgeClass: 'text-amber-300 bg-amber-950/60 border-amber-500/40 hover:border-amber-400',
    dotColor: 'bg-amber-400',
    borderColor: 'border-amber-500',
    icon: Volume2,
  },
  LOCATION: {
    label: 'Location',
    badgeClass: 'text-rose-300 bg-rose-950/60 border-rose-500/40 hover:border-rose-400',
    dotColor: 'bg-rose-400',
    borderColor: 'border-rose-500',
    icon: MapPin,
  },
  VEHICLE: {
    label: 'Vehicle',
    badgeClass: 'text-blue-300 bg-blue-950/60 border-blue-500/40 hover:border-blue-400',
    dotColor: 'bg-blue-400',
    borderColor: 'border-blue-500',
    icon: Car,
  },
  MAKEUP: {
    label: 'Makeup',
    badgeClass: 'text-pink-300 bg-pink-950/60 border-pink-500/40 hover:border-pink-400',
    dotColor: 'bg-pink-400',
    borderColor: 'border-pink-500',
    icon: Palette,
  },
};

interface BreakdownBadgeProps {
  element: BreakdownElement;
  onRemove?: () => void;
  showCategoryLabel?: boolean;
}

export const BreakdownBadge: React.FC<BreakdownBadgeProps> = ({
  element,
  onRemove,
  showCategoryLabel = true,
}) => {
  const config = CATEGORY_CONFIGS[element.category] || CATEGORY_CONFIGS.PROP;
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[11px] font-mono transition-all group ${config.badgeClass}`}
      title={element.notes ? `${element.name}: ${element.notes}` : element.name}
    >
      <IconComponent className="w-3 h-3 shrink-0 opacity-80" />
      {showCategoryLabel && (
        <span className="font-semibold uppercase tracking-wider text-[9px] opacity-75 mr-0.5">
          {config.label}:
        </span>
      )}
      <span className="font-medium text-slate-100">{element.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 text-slate-400 hover:text-white rounded p-0.5 transition-colors opacity-70 group-hover:opacity-100"
          title={`Remove tag "${element.name}"`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
};

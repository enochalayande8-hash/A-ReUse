import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`app-card p-8 sm:p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#f4df9e]/70 border border-[#e8ce82] flex items-center justify-center mb-4 text-[#8b6508]">
        <Icon className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h3 className="font-serif-heading text-xl font-bold text-[#40281d] tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[#78675e] leading-relaxed max-w-sm mb-6">
        {description}
      </p>

      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2.5 rounded-xl bg-[#fbf7ed] text-[#40281d] text-xs font-bold hover:bg-white transition-all border border-[#eadfce] cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface AwarenessEmblemProps {
  className?: string;
  size?: number | string;
  src?: string;
}

/**
 * Original Awareness Global Logo Asset
 * Preserves the exact emblem asset with proportional display,
 * true transparent background, and crisp rendering.
 * Dynamically supports saved organization profile logo if configured.
 */
export const AwarenessEmblem: React.FC<AwarenessEmblemProps> = ({
  className = 'w-10 h-10',
  src,
}) => {
  const imageSource = src || '/InShot_20260917_104354103.png';

  return (
    <img
      src={imageSource}
      alt="Awareness Global Logo"
      className={`${className} aspect-square object-contain select-none shrink-0`}
      draggable={false}
      onError={(e) => {
        const target = e.currentTarget;
        if (target.src !== window.location.origin + '/awareness-logo.png') {
          target.src = '/awareness-logo.png';
        }
      }}
    />
  );
};

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showPillars?: boolean;
  className?: string;
  variant?: 'dark' | 'light';
  logoUrl?: string;
  orgName?: string;
  movementName?: string;
  slogan?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showPillars = false,
  className = '',
  variant = 'dark',
  logoUrl,
  orgName = 'Awareness Global',
  movementName = 'Movement',
  slogan = 'Stay Aware',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-13 h-13',
    xl: 'w-16 h-16',
  };

  const titleSizes = {
    sm: 'text-base font-bold',
    md: 'text-lg font-extrabold',
    lg: 'text-2xl font-black',
    xl: 'text-3xl font-black',
  };

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official Awareness Logo Emblem */}
      <AwarenessEmblem src={logoUrl} className={iconSizes[size]} />

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`tracking-tight ${titleSizes[size]} font-sans ${
              isLight ? 'text-white' : 'text-[#2C1810]'
            }`}
          >
            {orgName}
          </span>
          <span className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2C1810] text-[#D4AF37] border border-[#D4AF37]/30">
            {movementName.replace(/awareness\s*global\s*/i, '').trim() || movementName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={`text-[11px] font-medium tracking-wider uppercase ${
              isLight ? 'text-[#D7CCC8]' : 'text-[#795548]'
            }`}
          >
            {slogan}
          </span>
          {showPillars && (
            <>
              <span className="text-[#D4AF37] text-xs">•</span>
              <span
                className={`text-[11px] font-semibold ${
                  isLight ? 'text-[#BCAAA4]' : 'text-[#8D6E63]'
                }`}
              >
                Educate • Unite • Act
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

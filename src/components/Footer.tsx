import React from 'react';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Globe, Mail, Phone, MapPin, Heart } from 'lucide-react';
import { OrganizationProfile } from '../types';

interface FooterProps {
  orgProfile?: OrganizationProfile;
}

export const Footer: React.FC<FooterProps> = ({ orgProfile }) => {
  return (
    <footer className="bg-[#40281d] text-[#fffdf8] border-t border-[#eadfce]/20 mt-auto pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: Organization Branding */}
          <div className="sm:col-span-2 space-y-3">
            <BrandLogo
              variant="light"
              size="md"
              showPillars
              logoUrl={orgProfile?.logoUrl}
              orgName={orgProfile?.orgName}
              movementName={orgProfile?.movementName}
              slogan={orgProfile?.slogan}
            />

            <p className="text-xs text-[#eadfce]/80 leading-relaxed max-w-md">
              {orgProfile?.description ||
                orgProfile?.mission ||
                'Unite the world through awareness to solve global issues. Eradicating single-use plastic bag consumption through reusable bag adoption, verified behavioral proof, and collective environmental action.'}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 border border-[#e2a72e]/30 text-[#e2a72e]">
                Pillars: Educate • Unite • Act
              </span>
            </div>
          </div>

          {/* Column 2: Environmental Pillars */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e2a72e]">
              Focus Areas
            </h4>
            <ul className="space-y-1.5 text-xs text-[#eadfce]/90">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e2a72e]" />
                <span>Zero Single-Use Plastic Bags</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e2a72e]" />
                <span>Verified Reusable Alternatives</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e2a72e]" />
                <span>Admin-Verified Proof Only</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e2a72e]" />
                <span>Calculated Carbon Offset</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact & NGO Presence */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e2a72e]">
              Headquarters & Contact
            </h4>
            <div className="space-y-1.5 text-xs text-[#eadfce]/90">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#e2a72e]" />
                <span>{orgProfile?.contactEmail || 'movement@awarenessglobal.org'}</span>
              </p>
              <p className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#e2a72e]" />
                <a
                  href={orgProfile?.website || 'https://sites.google.com/view/awarenessglobal/home'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-white transition-colors truncate"
                >
                  awarenessglobal.org
                </a>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#e2a72e]" />
                <span>{orgProfile?.location || 'Global / Lagos'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#eadfce]/60">
          <p>© {new Date().getFullYear()} Awareness Global. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="text-[#eadfce]/80">Stay Aware</span>
            <span>•</span>
            <span className="text-[#e2a72e]">Official Movement Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

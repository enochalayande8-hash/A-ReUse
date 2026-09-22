import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../services/auth/AuthContext';
import {
  Home,
  Award,
  UploadCloud,
  Trophy,
  User as UserIcon,
  TrendingUp,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  KeyRound,
  CheckCircle,
} from 'lucide-react';

import { OrganizationProfile } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenOwnerSetup: () => void;
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  pendingReviewsCount?: number;
  orgProfile?: OrganizationProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenOwnerSetup,
  onOpenAuthModal,
  pendingReviewsCount = 0,
  orgProfile,
}) => {
  const { user, isAuthenticated, isTopAdmin, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'challenge', label: 'Challenge', icon: Award },
    { id: 'proof', label: 'Submit Proof', icon: UploadCloud },
    { id: 'win', label: 'Win', icon: Trophy },
    { id: 'rank', label: 'Rank', icon: TrendingUp },
    { id: 'connect', label: 'Connect', icon: MessageSquare },
  ];

  const bottomNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'challenge', label: 'Challenge', icon: Award },
    { id: 'proof', label: 'Proof', icon: UploadCloud },
    { id: 'win', label: 'Win', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#fffdf8]/90 backdrop-blur-md border-b border-[#eadfce] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div
              onClick={() => handleNavClick('home')}
              className="cursor-pointer transition-transform active:scale-98"
            >
              <BrandLogo
                size="md"
                showPillars
                logoUrl={orgProfile?.logoUrl}
                orgName={orgProfile?.orgName}
                movementName={orgProfile?.movementName}
                slogan={orgProfile?.slogan}
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#40281d] text-[#fffdf8] shadow-xs'
                        : 'text-[#5c463b] hover:text-[#40281d] hover:bg-[#40281d]/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#e2a72e]' : 'text-[#78675e]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Admin Review Link (Admins & Top Admin) */}
              {isAdmin && (
                <button
                  onClick={() => handleNavClick('admin-reviews')}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
                    currentTab === 'admin-reviews'
                      ? 'bg-[#40281d] text-[#fffdf8]'
                      : 'text-[#78675e] hover:text-[#40281d] hover:bg-[#40281d]/5'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#e2a72e]" />
                  <span>Reviews</span>
                  {pendingReviewsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#e2a72e] text-[#40281d]">
                      {pendingReviewsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Top Admin Dashboard (TOP_ADMIN only) */}
              {isTopAdmin && (
                <button
                  onClick={() => handleNavClick('top-admin')}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                    currentTab === 'top-admin'
                      ? 'bg-[#e2a72e] text-[#40281d] border-[#e2a72e] shadow-xs'
                      : 'bg-[#40281d] text-[#e2a72e] border-[#e2a72e]/40 hover:bg-[#523325]'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Top Admin</span>
                </button>
              )}
            </nav>

            {/* Right Action / Auth Controls */}
            <div className="hidden md:flex items-center gap-3">
              {!isTopAdmin && (
                <button
                  onClick={onOpenOwnerSetup}
                  title="Owner Authorization"
                  className="px-3 py-1.5 rounded-xl border border-[#eadfce] bg-white/70 hover:bg-white text-[11px] font-bold text-[#5c463b] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#e2a72e]" />
                  <span>Owner Setup</span>
                </button>
              )}

              {isAuthenticated && user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavClick('profile')}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                      currentTab === 'profile'
                        ? 'border-[#e2a72e] bg-[#fbf7ed]'
                        : 'border-[#eadfce] hover:border-[#e2a72e]/50 bg-white/80'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#40281d] text-[#e2a72e] font-bold text-xs flex items-center justify-center border border-[#e2a72e]/30">
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="text-left text-xs leading-tight">
                      <p className="font-bold text-[#40281d] truncate max-w-[110px]">{user.fullName}</p>
                      <span className="text-[10px] font-semibold text-[#78675e] uppercase">{user.role}</span>
                    </div>
                  </button>

                  <button
                    onClick={() => logout()}
                    title="Log Out"
                    className="p-2 rounded-xl text-[#78675e] hover:text-[#40281d] hover:bg-[#40281d]/5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenAuthModal('login')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#40281d] hover:bg-[#40281d]/5 transition-colors cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => onOpenAuthModal('signup')}
                    className="px-4 py-2 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] border border-[#e2a72e]/40 shadow-xs transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="lg:hidden flex items-center gap-2">
              {isAuthenticated && user && (
                <button
                  onClick={() => handleNavClick('profile')}
                  className="w-8 h-8 rounded-full bg-[#40281d] text-[#e2a72e] font-bold text-xs flex items-center justify-center border border-[#e2a72e]/30"
                >
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-[#40281d] hover:bg-[#40281d]/5 transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#eadfce] bg-[#fffdf8] px-4 pt-3 pb-6 space-y-2 shadow-lg animate-fadeIn">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-[#eadfce]">
              <button
                onClick={() => handleNavClick('rank')}
                className={`p-3 rounded-2xl text-left border flex items-center gap-2.5 transition-all ${
                  currentTab === 'rank'
                    ? 'bg-[#40281d] text-[#fffdf8] border-[#40281d]'
                    : 'bg-[#fbf7ed] border-[#eadfce] text-[#40281d]'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-[#e2a72e]" />
                <div>
                  <div className="text-xs font-bold">Rank</div>
                  <div className="text-[10px] text-[#78675e]">Global Standings</div>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('connect')}
                className={`p-3 rounded-2xl text-left border flex items-center gap-2.5 transition-all ${
                  currentTab === 'connect'
                    ? 'bg-[#40281d] text-[#fffdf8] border-[#40281d]'
                    : 'bg-[#fbf7ed] border-[#eadfce] text-[#40281d]'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#46705b]" />
                <div>
                  <div className="text-xs font-bold">Connect</div>
                  <div className="text-[10px] text-[#78675e]">Movement Community</div>
                </div>
              </button>
            </div>

            {/* Admin Links Mobile */}
            {isAdmin && (
              <button
                onClick={() => handleNavClick('admin-reviews')}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between border ${
                  currentTab === 'admin-reviews'
                    ? 'bg-[#40281d] text-[#fffdf8] border-[#40281d]'
                    : 'bg-[#fbf7ed] text-[#40281d] border-[#eadfce]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#e2a72e]" />
                  <span>Admin Reviews</span>
                </div>
                {pendingReviewsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e2a72e] text-[#40281d]">
                    {pendingReviewsCount} Pending
                  </span>
                )}
              </button>
            )}

            {isTopAdmin && (
              <button
                onClick={() => handleNavClick('top-admin')}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-between border ${
                  currentTab === 'top-admin'
                    ? 'bg-[#e2a72e] text-[#40281d] border-[#e2a72e]'
                    : 'bg-[#40281d] text-[#e2a72e] border-[#e2a72e]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Top Admin Control Panel</span>
                </div>
              </button>
            )}

            {/* Auth & Owner Mobile Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenOwnerSetup();
                }}
                className="w-full py-2.5 rounded-2xl border border-[#eadfce] bg-white text-xs font-bold text-[#5c463b] flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#e2a72e]" />
                <span>Owner Setup / Claim Top Admin</span>
              </button>

              {isAuthenticated && user ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleNavClick('profile')}
                    className="flex-1 py-2.5 rounded-2xl bg-white border border-[#eadfce] text-xs font-bold text-[#40281d] flex items-center justify-center gap-2"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Profile ({user.fullName})</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2.5 px-4 rounded-2xl bg-[#40281d]/5 text-xs font-bold text-[#78675e] flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Exit</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuthModal('login');
                    }}
                    className="py-2.5 rounded-2xl border border-[#eadfce] bg-white text-xs font-bold text-[#40281d] text-center"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuthModal('signup');
                    }}
                    className="py-2.5 rounded-2xl bg-[#40281d] text-[#fffdf8] text-xs font-bold text-center border border-[#e2a72e]/40"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Persistent Mobile Bottom Navigation Dock */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fffdf8]/95 backdrop-blur-md border-t border-[#eadfce] px-2 py-1.5 shadow-[0_-4px_24px_rgba(64,40,29,0.08)]">
        <div className="max-w-md mx-auto grid grid-cols-5 items-center">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'profile' && !isAuthenticated) {
                    onOpenAuthModal('login');
                  } else {
                    handleNavClick(item.id);
                  }
                }}
                className="flex flex-col items-center justify-center py-1 cursor-pointer transition-transform active:scale-95"
              >
                <span
                  className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-[#e2a72e] text-[#40281d] shadow-xs'
                      : 'text-[#78675e] hover:text-[#40281d]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight ${
                    isActive ? 'font-bold text-[#40281d]' : 'font-medium text-[#78675e]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

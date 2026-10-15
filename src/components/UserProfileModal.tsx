import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { getUserFromFirestore } from '../services/firebase/firestoreService';
import { api } from '../services/api';
import { getUserBadges, MovementBadge } from '../utils/badgeUtils';
import {
  X,
  User as UserIcon,
  Crown,
  ShieldCheck,
  ShoppingBag,
  Award,
  Sparkles,
  Leaf,
  Globe,
  Flame,
  Calendar,
  Lock,
  CheckCircle2,
} from 'lucide-react';

interface UserProfileModalProps {
  userId: string | null;
  initialUser?: Partial<User> | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  initialUser,
  isOpen,
  onClose,
}) => {
  const [profileUser, setProfileUser] = useState<Partial<User> | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'badges'>('stats');

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfileUser(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadProfile = async () => {
      try {
        // 1. Try Firestore direct read
        let fetched: User | null = null;
        try {
          fetched = await getUserFromFirestore(userId);
        } catch (fsErr) {
          console.warn('[UserProfileModal] Firestore fetch note:', fsErr);
        }

        // 2. Fallback to API if not found or Firestore offline
        if (!fetched) {
          try {
            const apiRes = await api.getUserProfile(userId);
            if (apiRes && apiRes.user) {
              fetched = apiRes.user as User;
            }
          } catch (apiErr) {
            console.warn('[UserProfileModal] API fetch note:', apiErr);
          }
        }

        if (isMounted) {
          if (fetched) {
            setProfileUser(fetched);
          } else if (initialUser) {
            setProfileUser(initialUser);
          } else {
            // Default placeholder
            setProfileUser({
              id: userId,
              fullName: 'Movement Member',
              role: 'REGISTERED_USER',
              verifiedPoints: 0,
              verifiedActionsCount: 0,
              verifiedBagsAvoided: 0,
              verifiedReusableBagUses: 0,
              verifiedCo2eAvoidedGramsMin: 0,
              verifiedCo2eAvoidedGramsMax: 0,
            });
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, initialUser]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !userId) return null;

  const user = profileUser || initialUser || {};
  const { earned, locked } = getUserBadges(user);
  const isTopAdmin = user.role === 'TOP_ADMIN';
  const isAdmin = user.role === 'ADMIN';

  const renderBadgeIcon = (iconType: MovementBadge['iconType'], isUnlocked: boolean) => {
    const baseClass = isUnlocked ? 'w-5 h-5 text-[#8b6508]' : 'w-5 h-5 text-[#9e8f85]';
    switch (iconType) {
      case 'sparkles':
        return <Sparkles className={baseClass} />;
      case 'award':
        return <Award className={baseClass} />;
      case 'leaf':
        return <Leaf className={baseClass} />;
      case 'shield':
        return <ShieldCheck className={baseClass} />;
      case 'crown':
        return <Crown className={baseClass} />;
      case 'bag':
        return <ShoppingBag className={baseClass} />;
      case 'earth':
        return <Globe className={baseClass} />;
      case 'flame':
        return <Flame className={baseClass} />;
      default:
        return <Award className={baseClass} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="app-card w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#eadfce] p-0 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-b from-[#fbf7ed] to-[#fffdf8] border-b border-[#eadfce]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-[#78675e] hover:text-[#40281d] hover:bg-[#eadfce]/40 transition-colors cursor-pointer"
            aria-label="Close user profile"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start sm:items-center gap-4">
            {/* Avatar / Profile Picture */}
            <div className="relative flex-shrink-0">
              {user.profileImageUrl || user.avatarUrl ? (
                <img
                  src={user.profileImageUrl || user.avatarUrl}
                  alt={user.fullName || 'User'}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#e2a72e] shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#f4df9e] text-[#40281d] font-bold text-2xl flex items-center justify-center border-2 border-[#e8ce82] shadow-xs font-serif-heading">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'M'}
                </div>
              )}

              {isTopAdmin ? (
                <div
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#40281d] border-2 border-white shadow-xs"
                  title="Top Administrator"
                >
                  <Crown className="w-3.5 h-3.5 text-[#e2a72e]" />
                </div>
              ) : isAdmin ? (
                <div
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#46705b] border-2 border-white shadow-xs"
                  title="Appointed Administrator"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                </div>
              ) : null}
            </div>

            {/* Profile Info */}
            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif-heading text-lg sm:text-xl font-bold text-[#40281d] truncate">
                  {user.fullName || 'Movement Member'}
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isTopAdmin
                      ? 'bg-[#40281d] text-[#e2a72e] border-[#40281d]'
                      : isAdmin
                      ? 'bg-[#dce8d8] text-[#365646] border-[#c4d9bf]'
                      : 'bg-[#fbf7ed] text-[#78675e] border-[#eadfce]'
                  }`}
                >
                  {isTopAdmin ? 'Top Admin' : isAdmin ? 'Admin' : 'Member'}
                </span>
              </div>

              {/* Short Bio */}
              <p className="text-xs text-[#5c463b] mt-1.5 leading-relaxed line-clamp-3">
                {user.bio ? (
                  <span>{user.bio}</span>
                ) : (
                  <span className="italic text-[#9e8f85]">No personal bio added yet.</span>
                )}
              </p>

              {user.createdAt && (
                <div className="flex items-center gap-1 mt-2 text-[11px] text-[#78675e]">
                  <Calendar className="w-3 h-3 text-[#e2a72e]" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Toggle: Stats vs Badges */}
        <div className="flex border-b border-[#eadfce] bg-[#fbf7ed]/60 px-5 pt-3">
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'stats'
                ? 'border-[#e2a72e] text-[#40281d]'
                : 'border-transparent text-[#78675e] hover:text-[#40281d]'
            }`}
          >
            Verified Impact ({user.verifiedPoints || 0} pts)
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'badges'
                ? 'border-[#e2a72e] text-[#40281d]'
                : 'border-transparent text-[#78675e] hover:text-[#40281d]'
            }`}
          >
            <span>Badges & Honors</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e2a72e]/20 text-[#8b6508]">
              {earned.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {isLoading && !profileUser ? (
            <div className="py-8 text-center text-xs text-[#78675e] animate-pulse">
              Loading member details & impact record...
            </div>
          ) : activeTab === 'stats' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 bg-[#f4df9e]/80 border border-[#e8ce82]">
                  <span className="text-[10px] font-bold text-[#694c03] uppercase tracking-wider block mb-1">
                    Verified Points
                  </span>
                  <span className="font-serif-heading text-2xl font-bold text-[#40281d]">
                    {user.verifiedPoints || 0}
                  </span>
                  <span className="text-[11px] text-[#5c463b] block mt-0.5">Official points</span>
                </div>

                <div className="rounded-2xl p-4 bg-[#dce8d8]/80 border border-[#c8dbc3]">
                  <span className="text-[10px] font-bold text-[#365646] uppercase tracking-wider block mb-1">
                    Reusable Uses
                  </span>
                  <span className="font-serif-heading text-2xl font-bold text-[#40281d]">
                    {user.verifiedReusableBagUses || 0}
                  </span>
                  <span className="text-[11px] text-[#5c463b] block mt-0.5">Shopping trips</span>
                </div>

                <div className="rounded-2xl p-4 bg-[#f3ddd2]/80 border border-[#e8cbbe]">
                  <span className="text-[10px] font-bold text-[#7e3d1b] uppercase tracking-wider block mb-1">
                    Bags Avoided
                  </span>
                  <span className="font-serif-heading text-2xl font-bold text-[#40281d]">
                    {user.verifiedBagsAvoided || 0}
                  </span>
                  <span className="text-[11px] text-[#5c463b] block mt-0.5">Plastics prevented</span>
                </div>

                <div className="rounded-2xl p-4 bg-[#e8e1ef]/80 border border-[#d6cde0]">
                  <span className="text-[10px] font-bold text-[#4d3a68] uppercase tracking-wider block mb-1">
                    CO₂e Avoided
                  </span>
                  <span className="font-serif-heading text-lg sm:text-xl font-bold text-[#40281d]">
                    {((user.verifiedCo2eAvoidedGramsMin || 0) / 1000).toFixed(1)}–
                    {((user.verifiedCo2eAvoidedGramsMax || 0) / 1000).toFixed(1)} kg
                  </span>
                  <span className="text-[11px] text-[#5c463b] block mt-0.5">Carbon offset</span>
                </div>
              </div>

              {/* Verified actions summary note */}
              <div className="p-3.5 rounded-xl bg-[#fbf7ed] border border-[#eadfce] text-xs text-[#5c463b] flex items-center justify-between">
                <span>Total Administrator-Verified Actions:</span>
                <span className="font-bold text-[#40281d] text-sm">
                  {user.verifiedActionsCount || 0}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Earned Badges */}
              <div>
                <h4 className="text-xs font-bold text-[#40281d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#46705b]" />
                  <span>Earned Movement Badges ({earned.length})</span>
                </h4>

                {earned.length === 0 ? (
                  <p className="text-xs text-[#78675e] p-3 rounded-xl bg-[#fbf7ed] border border-[#eadfce]">
                    No badges earned yet. When verified environmental actions are approved, badges unlock automatically!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {earned.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl bg-[#fffdf8] border border-[#e8ce82] shadow-2xs flex items-start gap-2.5"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#f4df9e]/80 flex items-center justify-center flex-shrink-0">
                          {renderBadgeIcon(b.iconType, true)}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-[#40281d]">{b.name}</h5>
                          <p className="text-[11px] text-[#78675e] leading-snug mt-0.5">{b.description}</p>
                          <span className="inline-block mt-1 text-[9px] font-bold text-[#694c03] bg-[#f4df9e]/50 px-1.5 py-0.2 rounded-md">
                            {b.requirement}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Locked Badges Preview */}
              {locked.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#78675e] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#9e8f85]" />
                    <span>Next Badges to Unlock ({locked.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {locked.map((b) => {
                      const prog = b.getProgress(user);
                      return (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-[#fbf7ed]/50 border border-[#eadfce]/70 flex items-start gap-2.5 opacity-80"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#eadfce]/60 flex items-center justify-center flex-shrink-0">
                            {renderBadgeIcon(b.iconType, false)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-[#5c463b]">{b.name}</h5>
                            <p className="text-[11px] text-[#78675e] leading-snug mt-0.5">{b.description}</p>
                            <div className="mt-1 flex items-center justify-between text-[9px] text-[#78675e]">
                              <span>{b.requirement}</span>
                              <span className="font-semibold">
                                {prog.current}/{prog.target} {prog.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Read-Only Notice - User cannot edit another user's profile */}
          <div className="pt-2 text-center text-[10px] text-[#9e8f85] border-t border-[#eadfce]/60">
            Read-only verified public profile • Protected movement privacy boundary
          </div>
        </div>
      </div>
    </div>
  );
};

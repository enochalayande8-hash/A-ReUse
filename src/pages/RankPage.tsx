import React, { useState } from 'react';
import { LeaderboardEntry, User } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { UserProfileModal } from '../components/UserProfileModal';
import { TrendingUp, User as UserIcon, Award, Sparkles } from 'lucide-react';

interface RankPageProps {
  leaderboard?: LeaderboardEntry[];
  onNavigateToProof: () => void;
}

export const RankPage: React.FC<RankPageProps> = ({ leaderboard = [], onNavigateToProof }) => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<{ id: string; user?: Partial<User> } | null>(null);
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  const handleOpenUserProfile = (entry: LeaderboardEntry) => {
    setSelectedUser({
      id: entry.userId,
      user: {
        id: entry.userId,
        fullName: entry.userName,
        profileImageUrl: entry.profileImageUrl,
        bio: entry.bio,
        verifiedPoints: entry.verifiedPoints,
        verifiedActionsCount: entry.verifiedActionsCount,
        verifiedBagsAvoided: entry.verifiedBagsAvoided,
      },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div className="border-b border-[#eadfce] pb-5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8b6508] mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#e2a72e]" />
          <span>Movement Standings</span>
        </div>
        <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d] tracking-tight">
          Global Impact Rankings
        </h1>
        <p className="text-xs sm:text-sm text-[#78675e] mt-1 max-w-xl leading-relaxed">
          Standings are calculated strictly from administrator-approved reusable actions. Tap any member&apos;s name to view their profile, impact stats, and earned badges!
        </p>
      </div>

      {safeLeaderboard.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No Rankings Yet"
          description="There are no users with verified points in the movement database yet. Submit photographic evidence of reusable bag use to claim the first spot on the leaderboard!"
          actionLabel="Submit Verified Action Proof"
          onAction={onNavigateToProof}
        />
      ) : (
        <div className="app-card border border-[#eadfce] overflow-hidden shadow-2xs">
          <div className="p-3 bg-[#fbf7ed]/80 border-b border-[#eadfce] text-[11px] font-semibold text-[#78675e] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#e2a72e]" />
              <span>Tap any member to view their public profile & badges</span>
            </span>
            <span>{safeLeaderboard.length} ranked {safeLeaderboard.length === 1 ? 'member' : 'members'}</span>
          </div>

          <div className="divide-y divide-[#eadfce]">
            {safeLeaderboard.map((entry) => {
              const isCurrent = user?.id === entry.userId;
              return (
                <div
                  key={entry.userId || Math.random().toString()}
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all ${
                    isCurrent ? 'bg-[#f4df9e]/30' : 'hover:bg-[#fbf7ed]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <span
                      className={`w-8 h-8 rounded-xl inline-flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        entry.position === 1
                          ? 'bg-[#e2a72e] text-[#40281d] shadow-xs'
                          : entry.position === 2
                          ? 'bg-[#eadfce] text-[#40281d]'
                          : entry.position === 3
                          ? 'bg-[#f4df9e]/70 text-[#5c463b]'
                          : 'bg-[#fbf7ed] text-[#78675e] border border-[#eadfce]'
                      }`}
                    >
                      {entry.position}
                    </span>

                    {/* Member Avatar (Tappable) */}
                    <button
                      type="button"
                      onClick={() => handleOpenUserProfile(entry)}
                      className="relative flex-shrink-0 cursor-pointer group focus:outline-none"
                      title={`View ${entry.userName}'s profile`}
                    >
                      {entry.profileImageUrl ? (
                        <img
                          src={entry.profileImageUrl}
                          alt={entry.userName}
                          className="w-10 h-10 rounded-xl object-cover border border-[#eadfce] group-hover:border-[#e2a72e] transition-colors"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#f4df9e]/70 border border-[#e8ce82] flex items-center justify-center text-xs font-bold text-[#8b6508] font-serif-heading group-hover:border-[#e2a72e] transition-colors">
                          {entry.userName ? entry.userName.charAt(0).toUpperCase() : 'M'}
                        </div>
                      )}
                    </button>

                    {/* Member Name and Stats (Tappable) */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenUserProfile(entry)}
                          className="font-bold text-sm text-[#40281d] hover:text-[#8b6508] hover:underline truncate cursor-pointer text-left transition-colors"
                          title={`View ${entry.userName}'s profile`}
                        >
                          {entry.userName || 'Movement Member'}
                        </button>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#40281d] text-[#fffdf8]">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#78675e] block truncate">
                        {entry.verifiedActionsCount || 0} actions • {entry.verifiedBagsAvoided || 0} bags saved
                      </span>
                    </div>
                  </div>

                  {/* Points Pill (Tappable) */}
                  <button
                    type="button"
                    onClick={() => handleOpenUserProfile(entry)}
                    className="text-right flex-shrink-0 cursor-pointer group"
                    title={`View ${entry.userName}'s profile`}
                  >
                    <span className="font-serif-heading font-bold text-sm sm:text-base text-[#40281d] bg-[#f4df9e]/60 group-hover:bg-[#f4df9e] px-2.5 py-1 rounded-xl border border-[#e8ce82] transition-colors">
                      {entry.verifiedPoints || 0} pts
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          isOpen={!!selectedUser}
          userId={selectedUser.id}
          initialUser={selectedUser.user}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

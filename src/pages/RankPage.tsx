import React from 'react';
import { LeaderboardEntry } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { TrendingUp } from 'lucide-react';

interface RankPageProps {
  leaderboard?: LeaderboardEntry[];
  onNavigateToProof: () => void;
}

export const RankPage: React.FC<RankPageProps> = ({ leaderboard = [], onNavigateToProof }) => {
  const { user } = useAuth();
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

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
          Standings are calculated strictly from administrator-approved reusable actions. Every point is verified environmental impact.
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
        <div className="app-card border border-[#eadfce] overflow-hidden">
          <div className="divide-y divide-[#eadfce]">
            {safeLeaderboard.map((entry) => {
              const isCurrent = user?.id === entry.userId;
              return (
                <div
                  key={entry.userId || Math.random().toString()}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    isCurrent ? 'bg-[#f4df9e]/40' : 'hover:bg-[#fbf7ed]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
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

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#40281d] truncate">
                          {entry.userName || 'Movement Member'}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#40281d] text-[#fffdf8]">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#78675e] block">
                        {entry.verifiedActionsCount || 0} actions • {entry.verifiedBagsAvoided || 0} bags saved
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-serif-heading font-bold text-sm sm:text-base text-[#40281d] bg-[#f4df9e]/60 px-2.5 py-1 rounded-xl border border-[#e8ce82]">
                      {entry.verifiedPoints || 0} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

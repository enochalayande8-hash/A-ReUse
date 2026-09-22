import React from 'react';
import { Prize } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import {
  Trophy,
  Calendar,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  PlusCircle,
  Award,
} from 'lucide-react';

interface WinPageProps {
  prizes: Prize[];
  onNavigateToProof: () => void;
  onNavigateToTopAdmin?: () => void;
}

export const WinPage: React.FC<WinPageProps> = ({
  prizes,
  onNavigateToProof,
  onNavigateToTopAdmin,
}) => {
  const { isTopAdmin } = useAuth();

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div className="border-b border-[#eadfce] pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8b6508] mb-1">
              <Trophy className="w-3.5 h-3.5 text-[#e2a72e]" />
              <span>Rewards & Recognition</span>
            </div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d] tracking-tight">
              Movement Incentives
            </h1>
            <p className="text-xs sm:text-sm text-[#78675e] mt-1 max-w-xl leading-relaxed">
              Legitimate rewards declared by Awareness Global Movement leadership for active environmental contributors.
            </p>
          </div>

          {isTopAdmin && onNavigateToTopAdmin && (
            <button
              onClick={onNavigateToTopAdmin}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#40281d] text-[#e2a72e] text-xs font-bold hover:bg-[#523325] transition-all border border-[#e2a72e]/40 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Declare Prize</span>
            </button>
          )}
        </div>
      </div>

      {prizes.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No Official Prizes Announced Yet"
          description="There are currently no active movement prize campaigns declared in the database. Rewards, recognition packages, and movement incentives are published by authorized administrators."
          actionLabel="Submit Verified Proof"
          onAction={onNavigateToProof}
          secondaryLabel={isTopAdmin ? 'Declare Prize in Top Admin Panel' : undefined}
          onSecondaryAction={isTopAdmin ? onNavigateToTopAdmin : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prizes.map((prize) => {
            const isConcluded = prize.status === 'CONCLUDED';
            return (
              <div
                key={prize.id}
                className="app-card p-5 border border-[#eadfce] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        prize.status === 'ACTIVE'
                          ? 'bg-[#dce8d8] text-[#365646] border border-[#c4d9bf]'
                          : isConcluded
                          ? 'bg-black/5 text-[#78675e]'
                          : 'bg-[#f4df9e]/70 text-[#5c463b]'
                      }`}
                    >
                      {prize.status}
                    </span>

                    <span className="font-serif-heading text-sm font-bold text-[#40281d] px-2.5 py-1 rounded-xl bg-[#f4df9e]/60 border border-[#e8ce82]">
                      {prize.value}
                    </span>
                  </div>

                  <h3 className="font-serif-heading text-lg font-bold text-[#40281d] tracking-tight mb-1.5 leading-snug">
                    {prize.title}
                  </h3>

                  <p className="text-xs text-[#5c463b] leading-relaxed mb-3">
                    {prize.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-[#78675e] pt-3 border-t border-[#eadfce]">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#40281d]">Period:</span>
                      <span>{prize.competitionPeriod || 'Ongoing movement campaign'}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#40281d]">Eligibility:</span>
                      <span>{prize.eligibility || 'Open to all verified contributors'}</span>
                    </div>

                    {prize.winnerInfo && (
                      <div className="p-2.5 rounded-xl bg-[#dce8d8] border border-[#c4d9bf] text-[#365646] mt-2">
                        <span className="font-bold block text-[10px] uppercase">Declared Winner:</span>
                        <span>{prize.winnerInfo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-[#eadfce] flex items-center justify-between">
                  <span className="text-[10px] text-[#78675e]">
                    Official Movement Incentive
                  </span>
                  <button
                    onClick={onNavigateToProof}
                    className="px-3.5 py-1.5 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all cursor-pointer active:scale-98"
                  >
                    Participate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

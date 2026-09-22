import React, { useState } from 'react';
import { Challenge } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import {
  Award,
  Calendar,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  PlusCircle,
} from 'lucide-react';

interface ChallengePageProps {
  challenges: Challenge[];
  onNavigateToProof: () => void;
  onNavigateToTopAdmin?: () => void;
}

export const ChallengePage: React.FC<ChallengePageProps> = ({
  challenges,
  onNavigateToProof,
  onNavigateToTopAdmin,
}) => {
  const { isTopAdmin } = useAuth();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    challenges.length > 0 ? challenges[0].id : null
  );

  const selectedChallenge = challenges.find((c) => c.id === selectedChallengeId) || challenges[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div className="border-b border-[#eadfce] pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8b6508] mb-1">
              <Award className="w-3.5 h-3.5 text-[#e2a72e]" />
              <span>Environmental Campaigns</span>
            </div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d] tracking-tight">
              Movement Challenges
            </h1>
            <p className="text-xs sm:text-sm text-[#78675e] mt-1 max-w-xl leading-relaxed">
              Structured collective initiatives focused on replacing single-use plastic bags. Complete the actions, submit photo evidence, and earn verified points.
            </p>
          </div>

          {isTopAdmin && onNavigateToTopAdmin && (
            <button
              onClick={onNavigateToTopAdmin}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#40281d] text-[#e2a72e] text-xs font-bold hover:bg-[#523325] transition-all border border-[#e2a72e]/40 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Manage Challenges</span>
            </button>
          )}
        </div>
      </div>

      {challenges.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No Active Challenges Yet"
          description="There are currently no active movement challenges scheduled. Challenges are created and launched by authorized administrators."
          actionLabel="Submit General Reusable Bag Proof"
          onAction={onNavigateToProof}
          secondaryLabel={isTopAdmin ? 'Create Challenge in Admin Panel' : undefined}
          onSecondaryAction={isTopAdmin ? onNavigateToTopAdmin : undefined}
        />
      ) : (
        <div className="space-y-4">
          {/* Challenge Selector List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#40281d] uppercase tracking-wider">
              Available Campaigns ({challenges.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {challenges.map((c) => {
                const isSelected = selectedChallenge?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedChallengeId(c.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#40281d] text-[#fffdf8] border-[#40281d] shadow-xs'
                        : 'bg-[#fffdf8] text-[#40281d] border-[#eadfce] hover:border-[#e2a72e]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-[#e2a72e]'
                            : c.status === 'ACTIVE'
                            ? 'bg-[#dce8d8] text-[#365646]'
                            : 'bg-black/5 text-[#78675e]'
                        }`}
                      >
                        {c.status}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#e2a72e]' : 'text-[#8b6508]'
                        }`}
                      >
                        +{c.pointsReward} Points
                      </span>
                    </div>
                    <h4 className="font-bold text-sm leading-snug line-clamp-2">{c.title}</h4>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Challenge Detail View */}
          {selectedChallenge && (
            <div className="app-card p-5 sm:p-7 border border-[#eadfce] space-y-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f4df9e]/70 text-[#5c463b] border border-[#e8ce82]">
                    Status: {selectedChallenge.status}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#78675e]">
                    <Clock className="w-3.5 h-3.5 text-[#e2a72e]" />
                    <span>Reward: +{selectedChallenge.pointsReward} Verified Points</span>
                  </div>
                </div>

                <h2 className="font-serif-heading text-xl sm:text-2xl font-bold text-[#40281d] tracking-tight">
                  {selectedChallenge.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#5c463b] mt-2.5 leading-relaxed">
                  {selectedChallenge.description}
                </p>
              </div>

              {/* Rules & Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#eadfce]">
                {/* Required Actions */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[#40281d] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-[#46705b]" />
                    <span>Required Actions</span>
                  </h4>
                  {selectedChallenge.requiredActions && selectedChallenge.requiredActions.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedChallenge.requiredActions.map((action, i) => (
                        <li key={i} className="text-xs text-[#5c463b] flex items-start gap-2 bg-[#fbf7ed] p-2.5 rounded-xl border border-[#eadfce]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#46705b] mt-1.5 flex-shrink-0" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#78675e]">Standard reusable bag verification rules apply.</p>
                  )}
                </div>

                {/* Rules & Eligibility */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[#40281d] uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#e2a72e]" />
                    <span>Eligibility & Rules</span>
                  </h4>
                  <div className="space-y-2 text-xs text-[#5c463b]">
                    <div className="bg-[#fbf7ed] p-2.5 rounded-xl border border-[#eadfce]">
                      <span className="font-bold text-[#40281d] block mb-0.5">Eligibility:</span>
                      <span>{selectedChallenge.eligibilityRequirements || 'Open to all registered movement members.'}</span>
                    </div>

                    {selectedChallenge.rules && selectedChallenge.rules.length > 0 && (
                      <ul className="space-y-1.5 pt-1">
                        {selectedChallenge.rules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-[#78675e]">
                            <span className="text-[#e2a72e]">•</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Call to action */}
              <div className="pt-4 border-t border-[#eadfce] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-[#78675e]">
                  Submissions require photo evidence showing your reusable bag in use.
                </div>
                <button
                  onClick={onNavigateToProof}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                >
                  <span>Submit Proof for this Challenge</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#e2a72e]" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

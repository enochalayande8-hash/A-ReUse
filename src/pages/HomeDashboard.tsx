import React from 'react';
import { useAuth } from '../services/auth/AuthContext';
import { Challenge } from '../types';
import { EmptyState } from '../components/EmptyState';
import {
  ShoppingBag,
  Trash2,
  CloudRain,
  Award,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Sparkles,
  CheckCircle,
  UploadCloud,
  Leaf,
  Clock,
} from 'lucide-react';

interface HomeDashboardProps {
  challenges?: Challenge[];
  onNavigate: (tab: string) => void;
  pendingSubmissionsCount?: number;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  challenges = [],
  onNavigate,
  pendingSubmissionsCount = 0,
}) => {
  const { user, isAuthenticated } = useAuth();
  const safeChallenges = Array.isArray(challenges) ? challenges : [];

  const activeChallenge = safeChallenges.find((c) => c.status === 'ACTIVE');

  const hasVerifiedActivity =
    (user?.verifiedActionsCount || 0) > 0 ||
    (user?.verifiedPoints || 0) > 0 ||
    (user?.verifiedBagsAvoided || 0) > 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* 1. Header Greeting (Warm, personal, friendly) */}
      <section className="pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4df9e]/50 border border-[#e8ce82] text-[#5c463b] text-[11px] font-bold uppercase tracking-wider mb-2.5">
          <Sparkles className="w-3 h-3 text-[#e2a72e]" />
          <span>Awareness Global • Stay Aware</span>
        </div>

        <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d] tracking-tight leading-tight">
          {isAuthenticated && user?.fullName
            ? `Welcome, ${user.fullName.split(' ')[0]} 👋`
            : 'Welcome to Awareness Global 👋'}
        </h1>

        <p className="mt-1.5 text-xs sm:text-sm text-[#78675e] leading-relaxed max-w-xl">
          A worldwide movement to eliminate single-use plastic bags. Carry reusable bags, share verified photographic proof, and build official environmental impact.
        </p>
      </section>

      {/* 2. Rank + Connect Quick-Grid (Friendly A-ReUse Style) */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('rank')}
          className="quick-card bg-[#f4df9e] hover:bg-[#eed78f] border border-[#e6cb7a] text-[#40281d] shadow-xs cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center text-[#40281d] flex-shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5 text-[#8b6508]" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight text-[#40281d] flex items-center gap-1">
              <span>Rank</span>
              <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[#5c463b] truncate mt-0.5">Global standings</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('connect')}
          className="quick-card bg-[#dce8d8] hover:bg-[#cee0c9] border border-[#c4d9bf] text-[#40281d] shadow-xs cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center text-[#40281d] flex-shrink-0 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-5 h-5 text-[#46705b]" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight text-[#40281d] flex items-center gap-1">
              <span>Connect</span>
              <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[#5c463b] truncate mt-0.5">Movement peers</p>
          </div>
        </button>
      </section>

      {/* 3. Current Challenge (Warm, inviting movement card) */}
      <section className="app-card p-5 sm:p-6 border border-[#eadfce]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#f4df9e]/80 flex items-center justify-center text-[#8b6508]">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78675e]">
              Current Challenge
            </span>
          </div>

          {activeChallenge && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#dce8d8] text-[#365646] border border-[#c4d9bf]">
              Active Now
            </span>
          )}
        </div>

        {activeChallenge ? (
          <div className="space-y-3">
            <h3 className="font-serif-heading text-lg sm:text-xl font-bold text-[#40281d] leading-snug">
              {activeChallenge.title}
            </h3>

            <p className="text-xs sm:text-sm text-[#5c463b] leading-relaxed">
              {activeChallenge.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#f4df9e]/60 border border-[#e8ce82] text-xs font-bold text-[#5c463b]">
                <Award className="w-3.5 h-3.5 text-[#8b6508]" />
                <span>+{activeChallenge.pointsReward} Verified Points</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#fbf7ed] border border-[#eadfce] text-[11px] text-[#78675e]">
                Eligible: {activeChallenge.eligibilityRequirements}
              </span>
            </div>

            <div className="pt-4 border-t border-[#eadfce] flex items-center justify-between gap-3">
              <button
                onClick={() => onNavigate('challenge')}
                className="text-xs font-bold text-[#5c463b] hover:text-[#40281d] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigate('proof')}
                className="px-4 py-2.5 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#e2a72e]" />
                <span>Submit Action Proof</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm font-bold text-[#40281d]">
              No active challenge announced right now
            </p>
            <p className="text-xs text-[#78675e] max-w-sm mx-auto">
              New community challenges are announced regularly by administrators. You can still submit photographic proof for any reusable bag trip!
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('proof')}
                className="px-4 py-2 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#e2a72e]" />
                <span>Submit Action Proof</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Verified Environmental Impact (Friendly 4-Card Soft Tone Grid) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif-heading text-lg font-bold text-[#40281d]">
              Verified Environmental Impact
            </h2>
            <p className="text-[11px] text-[#78675e]">
              Only actions approved by authorized administrators count toward official figures.
            </p>
          </div>

          {hasVerifiedActivity && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dce8d8] text-[#365646] text-[11px] font-bold border border-[#c4d9bf]">
              <CheckCircle className="w-3 h-3 text-[#46705b]" />
              <span>Verified Active</span>
            </span>
          )}
        </div>

        {hasVerifiedActivity && user ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Metric 1: Reusable Uses (Soft Leaf Green) */}
            <div className="rounded-2xl p-4 bg-[#dce8d8]/80 border border-[#c8dbc3] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-[#46705b] mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#365646]">
                  Reusable Uses
                </span>
                <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center text-[#46705b]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d]">
                  {user.verifiedReusableBagUses || 0}
                </span>
                <span className="text-[11px] text-[#5c463b] block mt-0.5">Verified bag trips</span>
              </div>
            </div>

            {/* Metric 2: Bags Avoided (Soft Warm Blush) */}
            <div className="rounded-2xl p-4 bg-[#f3ddd2]/80 border border-[#e8cbbe] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-[#a0522d] mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7e3d1b]">
                  Bags Avoided
                </span>
                <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center text-[#a0522d]">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d]">
                  {user.verifiedBagsAvoided || 0}
                </span>
                <span className="text-[11px] text-[#5c463b] block mt-0.5">Plastics prevented</span>
              </div>
            </div>

            {/* Metric 3: CO₂e Avoided (Soft Lavender Mist) */}
            <div className="rounded-2xl p-4 bg-[#e8e1ef]/80 border border-[#d6cde0] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-[#5e4b7b] mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4d3a68]">
                  CO₂e Offset
                </span>
                <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center text-[#5e4b7b]">
                  <CloudRain className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-serif-heading text-xl sm:text-2xl font-bold text-[#40281d]">
                  {(user.verifiedCo2eAvoidedGramsMin / 1000).toFixed(1)}–{(user.verifiedCo2eAvoidedGramsMax / 1000).toFixed(1)}
                </span>
                <span className="text-[11px] text-[#5c463b] block mt-0.5">Kilograms CO₂e</span>
              </div>
            </div>

            {/* Metric 4: Verified Points (Soft Warm Gold) */}
            <div className="rounded-2xl p-4 bg-[#f4df9e]/80 border border-[#e8ce82] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-[#8b6508] mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#694c03]">
                  Verified Points
                </span>
                <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center text-[#8b6508]">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d]">
                  {user.verifiedPoints || 0}
                </span>
                <span className="text-[11px] text-[#5c463b] block mt-0.5">Official points</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="app-card p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f4df9e]/60 text-[#8b6508] mx-auto flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-serif-heading text-base font-bold text-[#40281d]">
              Ready for Your First Verified Action?
            </h3>
            <p className="text-xs text-[#78675e] max-w-sm mx-auto leading-relaxed">
              Use a reusable bag on your next grocery or market trip, snap photographic evidence, and upload it for official review.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('proof')}
                className="px-4 py-2.5 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#e2a72e]" />
                <span>Submit Your First Proof</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 5. Stay Aware Educational Insight Card */}
      <section className="app-card p-4 sm:p-5 bg-gradient-to-br from-[#fffdf8] to-[#fbf7ed] border border-[#eadfce]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#dce8d8] text-[#46705b] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Leaf className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-[#40281d] uppercase tracking-wider">
              Stay Aware: Everyday Impact
            </h4>
            <p className="text-xs text-[#5c463b] mt-1 leading-relaxed">
              A single reusable shopping bag eliminates an average of 10 disposable bags per trip and prevents 150–330 grams of CO₂ emissions. Every action you log creates lasting community awareness.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

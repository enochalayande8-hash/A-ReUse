import React, { useState } from 'react';
import { useAuth } from '../services/auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Calendar,
  Award,
  ShoppingBag,
  Trash2,
  CloudRain,
  LogOut,
  Edit2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ProfilePageProps {
  onNavigateToProof: () => void;
  onNavigateToTopAdmin?: () => void;
  onNavigateToAuth: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onNavigateToProof,
  onNavigateToTopAdmin,
  onNavigateToAuth,
}) => {
  const { user, isAuthenticated, isTopAdmin, isAdmin, logout, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated || !user) {
    return (
      <div className="py-12">
        <EmptyState
          icon={UserIcon}
          title="Authentication Required"
          description="Please sign in or create an account to access your movement profile, verified environmental metrics, and participation badges."
          actionLabel="Sign In / Register"
          onAction={onNavigateToAuth}
        />
      </div>
    );
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await updateProfile(fullName.trim());
      setMsg('Profile updated successfully.');
      setIsEditing(false);
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasVerifiedActivity = (user.verifiedPoints || 0) > 0 || (user.verifiedActionsCount || 0) > 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Profile Overview Card */}
      <div className="app-card p-5 sm:p-6 border border-[#eadfce]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#f4df9e] text-[#40281d] font-bold text-xl flex items-center justify-center border border-[#e8ce82] shadow-2xs flex-shrink-0 font-serif-heading">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif-heading text-xl sm:text-2xl font-bold text-[#40281d] tracking-tight">
                  {user.fullName}
                </h1>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isTopAdmin
                      ? 'bg-[#40281d] text-[#e2a72e] border-[#40281d]'
                      : isAdmin
                      ? 'bg-[#f4df9e]/70 text-[#5c463b] border-[#e8ce82]'
                      : 'bg-[#fbf7ed] text-[#78675e] border-[#eadfce]'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <p className="text-xs text-[#78675e] mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#78675e]" />
                <span>{user.email}</span>
              </p>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-[#78675e]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#e2a72e]" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end pt-2 sm:pt-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 rounded-xl border border-[#eadfce] bg-[#fbf7ed] hover:bg-white text-xs font-bold text-[#40281d] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#78675e]" />
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>

            {isTopAdmin && onNavigateToTopAdmin && (
              <button
                onClick={onNavigateToTopAdmin}
                className="px-3.5 py-2 rounded-xl bg-[#40281d] text-[#e2a72e] text-xs font-bold hover:bg-[#523325] transition-all border border-[#e2a72e]/40 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}

            <button
              onClick={() => logout()}
              className="px-3.5 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Edit Profile Sub-form */}
        {isEditing && (
          <form onSubmit={handleUpdate} className="mt-5 pt-5 border-t border-[#eadfce] max-w-md space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#40281d]">Update Profile Name</h3>
            <div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] focus:border-[#e2a72e] focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all cursor-pointer active:scale-98"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        {msg && (
          <div className="mt-3 p-3 rounded-xl bg-[#dce8d8] border border-[#c4d9bf] text-[#365646] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#46705b]" />
            <span>{msg}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Verified Environmental Impact Record */}
      <div className="space-y-3">
        <h2 className="font-serif-heading text-lg font-bold text-[#40281d]">
          Verified Environmental Record
        </h2>

        {hasVerifiedActivity ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 bg-[#f4df9e]/80 border border-[#e8ce82]">
              <span className="text-[10px] font-bold text-[#694c03] uppercase tracking-wider block mb-1">
                Verified Points
              </span>
              <span className="font-serif-heading text-2xl font-bold text-[#40281d]">{user.verifiedPoints}</span>
              <span className="text-[11px] text-[#5c463b] block mt-0.5">Official points</span>
            </div>

            <div className="rounded-2xl p-4 bg-[#dce8d8]/80 border border-[#c8dbc3]">
              <span className="text-[10px] font-bold text-[#365646] uppercase tracking-wider block mb-1">
                Reusable Uses
              </span>
              <span className="font-serif-heading text-2xl font-bold text-[#40281d]">{user.verifiedReusableBagUses}</span>
              <span className="text-[11px] text-[#5c463b] block mt-0.5">Shopping trips</span>
            </div>

            <div className="rounded-2xl p-4 bg-[#f3ddd2]/80 border border-[#e8cbbe]">
              <span className="text-[10px] font-bold text-[#7e3d1b] uppercase tracking-wider block mb-1">
                Bags Avoided
              </span>
              <span className="font-serif-heading text-2xl font-bold text-[#40281d]">{user.verifiedBagsAvoided}</span>
              <span className="text-[11px] text-[#5c463b] block mt-0.5">Plastics prevented</span>
            </div>

            <div className="rounded-2xl p-4 bg-[#e8e1ef]/80 border border-[#d6cde0]">
              <span className="text-[10px] font-bold text-[#4d3a68] uppercase tracking-wider block mb-1">
                CO₂e Avoided
              </span>
              <span className="font-serif-heading text-xl font-bold text-[#40281d]">
                {(user.verifiedCo2eAvoidedGramsMin / 1000).toFixed(1)}–{(user.verifiedCo2eAvoidedGramsMax / 1000).toFixed(1)} kg
              </span>
              <span className="text-[11px] text-[#5c463b] block mt-0.5">Carbon offset</span>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="No Verified Actions Yet"
            description="You have not accrued verified points or environmental impact figures yet. Once an administrator approves your proof submissions, official figures will display here."
            actionLabel="Submit Action Proof"
            onAction={onNavigateToProof}
          />
        )}
      </div>

      {/* Badges / Achievements */}
      <div className="space-y-3">
        <h2 className="font-serif-heading text-lg font-bold text-[#40281d]">
          Badges & Recognition
        </h2>

        {hasVerifiedActivity ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#fffdf8] border border-[#eadfce] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f4df9e]/80 text-[#8b6508] flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-[#8b6508]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#40281d]">Inaugural Action</h4>
                <p className="text-[11px] text-[#78675e]">Verified first reusable bag proof</p>
              </div>
            </div>

            {(user.verifiedBagsAvoided || 0) >= 10 && (
              <div className="p-3.5 rounded-2xl bg-[#fffdf8] border border-[#eadfce] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#dce8d8] text-[#46705b] flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#40281d]">10+ Bags Prevented</h4>
                  <p className="text-[11px] text-[#78675e]">Direct plastic waste reduction</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="No Badges Earned Yet"
            description="Movement achievement badges are awarded automatically when authorized administrators approve your submissions."
            className="py-6"
          />
        )}
      </div>
    </div>
  );
};

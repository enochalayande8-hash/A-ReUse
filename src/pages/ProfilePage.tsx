import React, { useState, useRef } from 'react';
import { useAuth } from '../services/auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { api } from '../services/api';
import { getUserBadges, MovementBadge } from '../utils/badgeUtils';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Calendar,
  Award,
  ShoppingBag,
  LogOut,
  Edit2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Sparkles,
  Leaf,
  Globe,
  Flame,
  Crown,
  Lock,
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
  const [bio, setBio] = useState(user?.bio || '');
  const [profileImageUrl, setProfileImageUrl] = useState<string>(user?.profileImageUrl || user?.avatarUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Compress image file to lightweight DataURL
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const maxDim = 600;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(src);
          }
        };
        img.onerror = reject;
        img.src = src;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be under 10MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setError(null);

    try {
      const compressedDataUrl = await compressImage(file);

      // Attempt upload to Cloudinary via server API
      let finalPhotoUrl = compressedDataUrl;
      try {
        const uploadRes = await api.uploadProofImage(compressedDataUrl);
        if (uploadRes && uploadRes.proofImageUrl) {
          finalPhotoUrl = uploadRes.proofImageUrl;
        }
      } catch (uploadErr) {
        console.warn('[ProfilePage] Cloudinary upload endpoint unavailable, using local image data:', uploadErr);
      }

      setProfileImageUrl(finalPhotoUrl);

      // If not actively editing the text form, save the new photo immediately
      if (!isEditing) {
        await updateProfile(user.fullName, finalPhotoUrl, user.bio);
        setMsg('Profile picture updated successfully!');
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image file.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setProfileImageUrl('');
    if (!isEditing) {
      setIsLoading(true);
      try {
        await updateProfile(user.fullName, '', user.bio);
        setMsg('Profile picture removed.');
        setTimeout(() => setMsg(null), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to remove picture.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await updateProfile(fullName.trim(), profileImageUrl, bio.trim());
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
  const { earned, locked } = getUserBadges(user);

  const renderBadgeIcon = (iconType: MovementBadge['iconType']) => {
    switch (iconType) {
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-[#8b6508]" />;
      case 'award':
        return <Award className="w-5 h-5 text-[#8b6508]" />;
      case 'leaf':
        return <Leaf className="w-5 h-5 text-[#46705b]" />;
      case 'shield':
        return <ShieldCheck className="w-5 h-5 text-[#365646]" />;
      case 'crown':
        return <Crown className="w-5 h-5 text-[#8b6508]" />;
      case 'bag':
        return <ShoppingBag className="w-5 h-5 text-[#694c03]" />;
      case 'earth':
        return <Globe className="w-5 h-5 text-[#4d3a68]" />;
      case 'flame':
        return <Flame className="w-5 h-5 text-[#7e3d1b]" />;
      default:
        return <Award className="w-5 h-5 text-[#8b6508]" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Profile Overview Card */}
      <div className="app-card p-5 sm:p-6 border border-[#eadfce]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            {/* Avatar / Profile Picture with Upload Overlay */}
            <div className="relative group flex-shrink-0">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={user.fullName || 'User'}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#e2a72e] shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#f4df9e] text-[#40281d] font-bold text-2xl flex items-center justify-center border-2 border-[#e8ce82] shadow-2xs font-serif-heading">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              {/* Upload trigger button on avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute inset-0 rounded-2xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer"
                title="Change Profile Picture"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Change'}</span>
              </button>

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

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif-heading text-xl sm:text-2xl font-bold text-[#40281d] tracking-tight">
                  {user.fullName}
                </h1>
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
              <p className="text-xs text-[#5c463b] mt-1 leading-relaxed max-w-lg">
                {user.bio ? (
                  <span>{user.bio}</span>
                ) : (
                  <span className="italic text-[#9e8f85]">
                    No bio added yet. Click &quot;Edit Profile&quot; to write a short intro.
                  </span>
                )}
              </p>

              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#78675e] flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#78675e]" />
                  <span>{user.email}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#e2a72e]" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end pt-2 sm:pt-0">
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setFullName(user.fullName || '');
                setBio(user.bio || '');
                setProfileImageUrl(user.profileImageUrl || user.avatarUrl || '');
              }}
              className="px-3.5 py-2 rounded-xl border border-[#eadfce] bg-[#fbf7ed] hover:bg-white text-xs font-bold text-[#40281d] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#78675e]" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>

            {isTopAdmin && onNavigateToTopAdmin && (
              <button
                onClick={onNavigateToTopAdmin}
                className="px-3.5 py-2 rounded-xl bg-[#40281d] text-[#e2a72e] text-xs font-bold hover:bg-[#523325] transition-all border border-[#e2a72e]/40 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Top Admin</span>
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
          <form onSubmit={handleUpdate} className="mt-5 pt-5 border-t border-[#eadfce] max-w-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#40281d]">
                Edit Your Information
              </h3>
              <span className="text-[10px] text-[#78675e]">
                Only you can update your own profile
              </span>
            </div>

            {/* Profile Picture Controls */}
            <div>
              <label className="block text-[11px] font-bold text-[#40281d] uppercase mb-1">
                Profile Picture
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-3 py-1.5 rounded-xl border border-[#eadfce] bg-white hover:border-[#e2a72e] text-xs font-semibold text-[#40281d] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-[#e2a72e]" />
                  <span>{isUploadingPhoto ? 'Processing Photo...' : 'Upload New Photo'}</span>
                </button>

                {profileImageUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-[#40281d] uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] focus:border-[#e2a72e] focus:outline-hidden"
              />
            </div>

            {/* Short Bio */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-[#40281d] uppercase">
                  Short Bio (Intro & Eco Goals)
                </label>
                <span className="text-[10px] text-[#78675e]">{bio.length}/250</span>
              </div>
              <textarea
                rows={2}
                maxLength={250}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell fellow members about your green habits, neighborhood, or goals (e.g. Always keep reusable bags in my car!)."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] focus:border-[#e2a72e] focus:outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isLoading || isUploadingPhoto}
                className="px-4 py-2 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all cursor-pointer active:scale-98 shadow-xs"
              >
                {isLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#78675e] hover:text-[#40281d] cursor-pointer"
              >
                Cancel
              </button>
            </div>
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

      {/* Badges & Recognition */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-heading text-lg font-bold text-[#40281d]">
            Badges & Recognition
          </h2>
          <span className="text-xs font-semibold text-[#8b6508] bg-[#f4df9e]/50 px-2.5 py-0.5 rounded-full border border-[#e8ce82]">
            {earned.length} of {earned.length + locked.length} Earned
          </span>
        </div>

        {earned.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {earned.map((badge) => (
              <div
                key={badge.id}
                className="p-3.5 rounded-2xl bg-[#fffdf8] border border-[#e8ce82] flex items-start gap-3 shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f4df9e]/80 flex items-center justify-center flex-shrink-0">
                  {renderBadgeIcon(badge.iconType)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-[#40281d]">{badge.name}</h4>
                    <span className="text-[9px] font-bold text-[#46705b] bg-[#dce8d8] px-1.5 py-0.2 rounded-md">
                      Unlocked
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78675e] mt-0.5">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="No Badges Earned Yet"
            description="Movement achievement badges are awarded automatically when authorized administrators approve your submissions."
            className="py-6"
          />
        )}

        {/* Locked Badges Goals */}
        {locked.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#78675e] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#9e8f85]" />
              <span>Upcoming Badges to Unlock</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locked.map((badge) => {
                const prog = badge.getProgress(user);
                return (
                  <div
                    key={badge.id}
                    className="p-3.5 rounded-2xl bg-[#fbf7ed]/60 border border-[#eadfce] flex items-start gap-3 opacity-80"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#eadfce]/70 flex items-center justify-center flex-shrink-0 text-[#9e8f85]">
                      <Lock className="w-4 h-4 text-[#9e8f85]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#5c463b]">{badge.name}</h4>
                        <span className="text-[10px] font-semibold text-[#78675e]">
                          {prog.current}/{prog.target} {prog.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78675e] mt-0.5">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

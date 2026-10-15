import React, { useState, useEffect } from 'react';
import { CommunityPost, User } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { api } from '../services/api';
import {
  addCommunityPostToFirestore,
  toggleReactionInFirestore,
  togglePinInFirestore,
  deleteCommunityPostFromFirestore,
  compressImageToDataUrl,
} from '../services/firebase/firestoreService';
import { EmptyState } from '../components/EmptyState';
import { ImageModal } from '../components/ImageModal';
import { UserProfileModal } from '../components/UserProfileModal';
import {
  MessageSquare,
  Send,
  PlusCircle,
  Clock,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Tag,
  Pin,
  Image as ImageIcon,
  X,
  Crown,
  Trash2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface ConnectPageProps {
  posts?: CommunityPost[];
  onPostCreated: () => void;
  onNavigateToAuth: () => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '🌱', '👏', '🔥'] as const;

export const ConnectPage: React.FC<ConnectPageProps> = ({
  posts = [],
  onPostCreated,
  onNavigateToAuth,
}) => {
  const { user, isAuthenticated, isAdmin, isTopAdmin } = useAuth();

  // Local sorted posts state for instant optimistic updates
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>([]);

  // Modal & Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'CAMPAIGN' | 'DISCUSSION' | 'ACHIEVEMENT' | 'INITIATIVE'>('DISCUSSION');
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);

  // Interaction State
  const [modalImagePost, setModalImagePost] = useState<CommunityPost | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{ id: string; user?: Partial<User> } | null>(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<CommunityPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sort posts: Pinned posts first, then chronological descending
  const sortPosts = (rawPosts: CommunityPost[]): CommunityPost[] => {
    return [...rawPosts].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  };

  useEffect(() => {
    if (Array.isArray(posts)) {
      setLocalPosts(sortPosts(posts));
    }
  }, [posts]);

  // Handle Photo selection with automatic compression for storage sake
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsCompressing(true);

    try {
      // Compress image for storage efficiency: max 1000px, quality 0.72 JPEG
      const compressedDataUrl = await compressImageToDataUrl(file, 1000, 0.72);
      setImagePreview(compressedDataUrl);

      // Estimate compressed size in KB
      const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);
      setImageSizeKb(Math.round(approxBytes / 1024));
    } catch (cErr: any) {
      console.warn('[ConnectPage] Image compression warning:', cErr);
      setError('Unable to compress image. Please choose another image file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    setImagePreview(null);
    setImageSizeKb(null);
  };

  // Create new post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please provide both a title and discussion message.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let createdPost: CommunityPost | null = null;
      let successMessage = 'Post shared with the movement!';

      const userAvatar = user?.profileImageUrl || user?.avatarUrl;

      // 1. Try backend endpoint
      try {
        const res = await api.createCommunityPost({
          title: title.trim(),
          content: content.trim(),
          category,
          imageUrl: imagePreview || undefined,
        });

        if (res && res.post) {
          createdPost = res.post;
          if (res.message) successMessage = res.message;
          await addCommunityPostToFirestore(res.post).catch(() => {});
        }
      } catch (apiErr) {
        console.warn('[ConnectPage] Backend endpoint note, saving to Firestore:', apiErr);
      }

      // 2. Client-side Firestore persistence (ensures instant availability across environments)
      if (!createdPost && user) {
        const newPostId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const newPost: CommunityPost = {
          id: newPostId,
          userId: user.id,
          userName: user.fullName || user.email.split('@')[0],
          userRole: user.role,
          userProfileImageUrl: userAvatar,
          title: title.trim(),
          content: content.trim(),
          category,
          createdAt: new Date().toISOString(),
          likesCount: 0,
          isPinned: false,
          reactions: {},
          ...(imagePreview ? { imageUrl: imagePreview } : {}),
        };

        await addCommunityPostToFirestore(newPost);
        createdPost = newPost;
      }

      if (createdPost) {
        setLocalPosts((prev) => sortPosts([createdPost as CommunityPost, ...prev]));
      }

      setSuccessMsg(successMessage);
      setTitle('');
      setContent('');
      setImagePreview(null);
      setImageSizeKb(null);
      setShowPhotoSection(false);
      onPostCreated();

      setTimeout(() => {
        setShowCreateModal(false);
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      console.error('[ConnectPage] Publish post error:', err);
      setError(err.message || 'Failed to publish post.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle reaction (Members, Admins, and Top Admin can react)
  const handleToggleReaction = async (postId: string, emoji: string) => {
    if (!isAuthenticated || !user) {
      onNavigateToAuth();
      return;
    }

    const currentUserId = user.id;

    // Optimistic local update
    setLocalPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentReactions: Record<string, string[]> = { ...(p.reactions || {}) };
        const userList = [...(currentReactions[emoji] || [])];
        const uIndex = userList.indexOf(currentUserId);

        if (uIndex > -1) {
          userList.splice(uIndex, 1);
        } else {
          userList.push(currentUserId);
        }
        currentReactions[emoji] = userList;
        const newTotal = Object.values(currentReactions).reduce((sum, list) => sum + list.length, 0);

        return {
          ...p,
          reactions: currentReactions,
          likesCount: newTotal,
        };
      })
    );

    // Sync in Firestore & API
    try {
      await toggleReactionInFirestore(postId, emoji, currentUserId);
      api.reactToCommunityPost(postId, emoji).catch(() => {});
    } catch (err) {
      console.warn('[ConnectPage] Reaction sync note:', err);
    }
  };

  // Toggle pin status (Admins and Top Admin can pin/unpin)
  const handleTogglePin = async (postId: string, targetPinned: boolean) => {
    if (!isAdmin && !isTopAdmin) return;

    // Optimistic update
    setLocalPosts((prev) => {
      const updated = prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isPinned: targetPinned,
              pinnedAt: targetPinned ? new Date().toISOString() : undefined,
              pinnedBy: targetPinned ? (user?.fullName || user?.email || 'Admin') : undefined,
            }
          : p
      );
      return sortPosts(updated);
    });

    try {
      await togglePinInFirestore(postId, targetPinned, user);
      api.pinCommunityPost(postId, targetPinned).catch(() => {});
    } catch (err) {
      console.warn('[ConnectPage] Pin sync note:', err);
    }
  };

  // Delete message: Top Admin can delete any message; Admin can delete any message EXCEPT Top Admin messages
  const handleConfirmDelete = async () => {
    if (!deleteConfirmPost) return;

    // Strict rule check: Top Admin and admin can delete, but admin cannot delete Top Admin message
    const isPostByTopAdmin = deleteConfirmPost.userRole === 'TOP_ADMIN';
    if (!isTopAdmin && isAdmin && isPostByTopAdmin) {
      setError('Administrative restriction: Admins cannot delete messages published by Top Admin.');
      setDeleteConfirmPost(null);
      return;
    }

    setIsDeleting(true);
    setError(null);

    const targetId = deleteConfirmPost.id;
    try {
      // 1. Optimistic removal from state
      setLocalPosts((prev) => prev.filter((p) => p.id !== targetId));

      // 2. Delete from Firestore
      await deleteCommunityPostFromFirestore(targetId).catch((fsErr) => {
        console.warn('[ConnectPage] Firestore delete note:', fsErr);
      });

      // 3. Delete from Backend API
      await api.deleteCommunityPost(targetId).catch((apiErr) => {
        console.warn('[ConnectPage] API delete note:', apiErr);
      });

      setSuccessMsg('Message removed from community feed.');
      setDeleteConfirmPost(null);
      onPostCreated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete message.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#eadfce] pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#46705b] mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-[#46705b]" />
              <span>Community Connect & Discussions</span>
            </div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d] tracking-tight">
              Connect & Share
            </h1>
            <p className="text-xs sm:text-sm text-[#78675e] mt-1 max-w-xl leading-relaxed">
              Peer discussions, habit-building tips, and grassroots encouragement. Tap any member&apos;s name or photo to view their verified impact badges and stats!
            </p>
          </div>

          {isAuthenticated ? (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setError(null);
                setSuccessMsg(null);
              }}
              className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-4 h-4 text-[#e2a72e]" />
              <span>Share Discussion</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToAuth}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#fbf7ed] border border-[#eadfce] text-xs font-bold text-[#40281d] hover:bg-white cursor-pointer shadow-2xs"
            >
              Log In to Post & React
            </button>
          )}
        </div>
      </div>

      {/* Global alert feedback */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-[#dce8d8] border border-[#c4d9bf] text-xs text-[#365646] flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Post Creation Modal */}
      {showCreateModal && (
        <div className="app-card p-5 sm:p-6 border-2 border-[#e2a72e]/60 space-y-4 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#eadfce] pb-3">
            <h3 className="font-serif-heading text-base font-bold text-[#40281d] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#e2a72e]" />
              <span>Share a Post with the Movement</span>
            </h3>
            <button
              onClick={() => {
                setShowCreateModal(false);
                handleRemovePhoto();
              }}
              className="text-xs text-[#78675e] hover:text-[#40281d] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#40281d] uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tips for keeping reusable bags accessible in your car or purse"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] focus:border-[#e2a72e] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#40281d] uppercase mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] font-semibold focus:border-[#e2a72e] focus:outline-hidden"
                >
                  <option value="DISCUSSION">Discussion & Advice</option>
                  <option value="CAMPAIGN">Campaign & Tips</option>
                  <option value="ACHIEVEMENT">Milestone & Stories</option>
                  <option value="INITIATIVE">Community Initiative</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#40281d] uppercase mb-1">
                Discussion Message
              </label>
              <textarea
                rows={3}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your practical experience, ask questions, or encourage fellow members in reducing plastic bags..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] focus:border-[#e2a72e] focus:outline-hidden resize-none"
              />
            </div>

            {/* Photo Attachment Section */}
            <div className="space-y-3 pt-1">
              {!showPhotoSection && !imagePreview ? (
                <button
                  type="button"
                  onClick={() => setShowPhotoSection(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#fbf7ed] border border-[#eadfce] text-xs font-semibold text-[#5c463b] hover:bg-white hover:border-[#e2a72e] flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#e2a72e]" />
                  <span>Attach a Photo (Optional)</span>
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#eadfce] space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#40281d] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#e2a72e]" />
                      <span>Attach Photo to Discussion</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhotoSection(false);
                        handleRemovePhoto();
                      }}
                      className="text-xs text-[#78675e] hover:text-[#40281d] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="block w-full text-xs text-[#78675e] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#40281d] file:text-[#fffdf8] hover:file:bg-[#523325] file:cursor-pointer"
                  />

                  {isCompressing && (
                    <p className="text-[11px] text-[#8b6508] animate-pulse">
                      Optimizing photo for mobile speed...
                    </p>
                  )}

                  {imagePreview && (
                    <div className="relative inline-block mt-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-xl border border-[#eadfce]"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-[#40281d] text-white hover:bg-red-700 transition-colors shadow-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eadfce]">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  handleRemovePhoto();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#78675e] hover:text-[#40281d] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || isCompressing}
                className="px-4 py-2 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-[#e2a72e]" />
                <span>{isLoading ? 'Publishing...' : 'Publish to Movement'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts List or Zero-Data Empty State */}
      {localPosts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Community Discussions Yet"
          description="Be the first to share an update, tip, or question with fellow environmental movement members. Discussions help unite and educate people around single-use plastic reduction."
          actionLabel={isAuthenticated ? 'Start First Discussion' : 'Log In to Post'}
          onAction={isAuthenticated ? () => setShowCreateModal(true) : onNavigateToAuth}
        />
      ) : (
        <div className="space-y-4">
          {localPosts.map((post) => {
            const hasUserReacted = (emoji: string) =>
              Boolean(user && post.reactions?.[emoji]?.includes(user.id));

            const isPostByTopAdmin = post.userRole === 'TOP_ADMIN';
            const isAuthor = user?.id === post.userId;

            // Permission rule: Top Admin and admin can delete any message,
            // BUT admin CANNOT delete Top Admin message
            const canDelete =
              isTopAdmin ||
              (isAdmin && !isPostByTopAdmin) ||
              isAuthor;

            const isBlockedAdminFromTopAdminPost = !isTopAdmin && isAdmin && isPostByTopAdmin;

            return (
              <div
                key={post.id || Math.random().toString()}
                className={`app-card p-4 sm:p-5 border transition-all ${
                  post.isPinned
                    ? 'border-[#e2a72e] bg-[#FFFDF5] shadow-xs'
                    : 'border-[#eadfce]'
                }`}
              >
                {/* Pinned Banner */}
                {post.isPinned && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#fef9ec] border border-[#e2a72e]/50 text-[#8b6508] text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 text-[#e2a72e] fill-[#e2a72e]" />
                      <span>Pinned Announcement</span>
                      {post.pinnedBy && (
                        <span className="text-[11px] font-normal text-[#8b6508]/80 hidden sm:inline">
                          • Pinned by {post.pinnedBy}
                        </span>
                      )}
                    </div>

                    {(isAdmin || isTopAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleTogglePin(post.id, false)}
                        className="text-[11px] font-semibold text-[#8b6508] hover:text-[#523325] underline cursor-pointer"
                      >
                        Unpin
                      </button>
                    )}
                  </div>
                )}

                {/* Post Author & Header Info */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedProfileUser({
                        id: post.userId,
                        user: {
                          id: post.userId,
                          fullName: post.userName,
                          role: post.userRole,
                          profileImageUrl: post.userProfileImageUrl || post.userAvatarUrl,
                        },
                      })
                    }
                    className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
                    title={`View ${post.userName}'s profile, badges, and stats`}
                  >
                    {/* User Avatar with Image Support */}
                    {post.userProfileImageUrl || post.userAvatarUrl ? (
                      <img
                        src={post.userProfileImageUrl || post.userAvatarUrl}
                        alt={post.userName}
                        className="w-9 h-9 rounded-full object-cover border border-[#eadfce] group-hover:border-[#e2a72e] transition-colors"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#f4df9e]/70 border border-[#e8ce82] flex items-center justify-center text-xs font-bold text-[#8b6508] font-serif-heading group-hover:border-[#e2a72e] transition-colors">
                        {(post.userName || 'M').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#40281d] group-hover:text-[#8b6508] group-hover:underline transition-colors">
                          {post.userName || 'Movement Member'}
                        </span>
                        {post.userRole === 'TOP_ADMIN' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-[#D4AF37]/20 text-[#8b6508] text-[9px] font-bold border border-[#D4AF37]/40">
                            <Crown className="w-2.5 h-2.5 text-[#8b6508]" />
                            <span>Top Admin</span>
                          </span>
                        )}
                        {post.userRole === 'ADMIN' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-[#dce8d8] text-[#365646] text-[9px] font-bold border border-[#c4d9bf]">
                            <ShieldCheck className="w-2.5 h-2.5 text-[#46705b]" />
                            <span>Admin</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#78675e] block">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Recent'}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf7ed] text-[#5c463b] border border-[#eadfce]">
                      <Tag className="w-2.5 h-2.5 text-[#e2a72e]" />
                      <span>{post.category || 'General'}</span>
                    </span>

                    {/* Admin Pin action button for unpinned posts */}
                    {!post.isPinned && (isAdmin || isTopAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleTogglePin(post.id, true)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#fbf7ed] text-[#8b6508] border border-[#eadfce] hover:border-[#e2a72e] hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                        title="Pin this message to the top of feed"
                      >
                        <Pin className="w-3 h-3 text-[#e2a72e]" />
                        <span>Pin</span>
                      </button>
                    )}

                    {/* Message Deletion Action: Top Admin & Admin can delete any message, but admin cannot delete Top Admin message */}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmPost(post)}
                        className="p-1 rounded-lg text-[#78675e] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        title={
                          isTopAdmin
                            ? 'Delete message (Top Admin authority)'
                            : isAdmin
                            ? 'Delete message (Admin moderation)'
                            : 'Delete your message'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : isBlockedAdminFromTopAdminPost ? (
                      <span
                        className="p-1 text-[#b5a79f] cursor-not-allowed"
                        title="Administrators cannot delete Top Admin messages"
                      >
                        <Lock className="w-3 h-3 text-[#b5a79f]" />
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Post Content */}
                <h3 className="font-serif-heading text-base font-bold text-[#40281d] leading-snug mb-1">
                  {post.title}
                </h3>

                <p className="text-xs text-[#5c463b] leading-relaxed whitespace-pre-line mb-3">
                  {post.content}
                </p>

                {/* Attached Photo Display */}
                {post.imageUrl && (
                  <div className="mb-3">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      onClick={() => setModalImagePost(post)}
                      className="w-full max-h-72 object-cover rounded-xl border border-[#eadfce] cursor-pointer hover:opacity-95 transition-opacity"
                    />
                    <span className="text-[10px] text-[#8D6E63] mt-1 block">
                      Click photo to inspect full size
                    </span>
                  </div>
                )}

                {/* Reactable Messages Section */}
                <div className="pt-2.5 border-t border-[#eadfce]/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {REACTION_EMOJIS.map((emoji) => {
                      const count = post.reactions?.[emoji]?.length || 0;
                      const userReacted = hasUserReacted(emoji);

                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(post.id, emoji)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-105 ${
                            userReacted
                              ? 'bg-[#dce8d8] text-[#365646] border border-[#a3c99b] shadow-2xs font-bold ring-1 ring-[#46705b]/30'
                              : count > 0
                              ? 'bg-[#fbf7ed] text-[#5c463b] border border-[#eadfce] hover:bg-white'
                              : 'bg-[#fbf7ed]/60 text-[#78675e] border border-[#eadfce]/70 hover:bg-white hover:text-[#40281d]'
                          }`}
                          title={
                            userReacted
                              ? `You reacted with ${emoji} (click to remove)`
                              : isAuthenticated
                              ? `Click to react with ${emoji}`
                              : 'Log in to react'
                          }
                        >
                          <span className="text-sm">{emoji}</span>
                          {count > 0 && <span className="text-[11px] font-bold">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {post.likesCount > 0 && (
                    <span className="text-[11px] text-[#78675e] font-medium">
                      {post.likesCount} {post.likesCount === 1 ? 'reaction' : 'reactions'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setDeleteConfirmPost(null)}
        >
          <div
            className="app-card w-full max-w-md border border-[#eadfce] p-5 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-700 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-serif-heading text-base font-bold text-[#40281d]">
                  Delete Community Message
                </h3>
                <p className="text-xs text-[#78675e]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#5c463b] mb-4 bg-[#fbf7ed] p-3 rounded-xl border border-[#eadfce] leading-relaxed">
              Are you sure you want to remove &quot;{deleteConfirmPost.title}&quot; posted by{' '}
              <strong className="text-[#40281d]">{deleteConfirmPost.userName}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPost(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78675e] hover:text-[#40281d] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-bold hover:bg-red-800 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {modalImagePost && modalImagePost.imageUrl && (
        <ImageModal
          isOpen={!!modalImagePost}
          onClose={() => setModalImagePost(null)}
          imageUrl={modalImagePost.imageUrl}
          title={modalImagePost.title}
          submitterName={modalImagePost.userName}
          actionType={modalImagePost.category}
        />
      )}

      {/* User Profile Modal */}
      {selectedProfileUser && (
        <UserProfileModal
          isOpen={!!selectedProfileUser}
          userId={selectedProfileUser.id}
          initialUser={selectedProfileUser.user}
          onClose={() => setSelectedProfileUser(null)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CommunityPost } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { api } from '../services/api';
import {
  addCommunityPostToFirestore,
  toggleReactionInFirestore,
  togglePinInFirestore,
  compressImageToDataUrl,
} from '../services/firebase/firestoreService';
import { EmptyState } from '../components/EmptyState';
import { ImageModal } from '../components/ImageModal';
import {
  MessageSquare,
  Send,
  PlusCircle,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Tag,
  Pin,
  PinOff,
  Image as ImageIcon,
  X,
  Smile,
  AlertTriangle,
  ExternalLink,
  Crown,
  Share2,
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
              Peer discussions, habit-building tips, practical reusable bag advice, and grassroots encouragement. Members and admins can react to messages and share experiences!
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

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#dce8d8] border border-[#c4d9bf] text-xs text-[#365646] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

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

            {/* Photo Attachment Section with Mandatory Notice BEFORE Upload */}
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
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF8] border-2 border-[#eadfce] space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#40281d] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#e2a72e]" />
                      <span>Attach Photo to Discussion</span>
                    </span>
                    {!imagePreview && (
                      <button
                        type="button"
                        onClick={() => setShowPhotoSection(false)}
                        className="text-xs text-[#78675e] hover:text-[#40281d] cursor-pointer"
                      >
                        Cancel Photo
                      </button>
                    )}
                  </div>

                  {/* MANDATORY NOTICE DISPLAYED BEFORE ADDING PHOTO */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="block font-bold text-amber-950 uppercase tracking-wide text-[10px] mb-0.5">
                        Notice Before Attaching Photo:
                      </strong>
                      <span className="font-semibold text-amber-900">
                        Challenge points will not be awarded for uploading in the connect page.
                      </span>
                      <p className="text-[11px] text-amber-800/90 mt-1">
                        Photos shared here are for tips, peer education, and community encouragement. To earn official points and challenge credits, submit photographic proof through the <strong>Proof</strong> section.
                      </p>
                    </div>
                  </div>

                  {!imagePreview ? (
                    <div>
                      <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#eadfce] hover:border-[#e2a72e] hover:bg-white rounded-xl cursor-pointer bg-[#FFFDF5] transition-all">
                        <ImageIcon className="w-7 h-7 text-[#8D6E63] mb-1.5" />
                        <span className="text-xs font-bold text-[#40281d]">
                          {isCompressing ? 'Compressing Photo for Storage...' : 'Click to Select Photo'}
                        </span>
                        <span className="text-[10px] text-[#78675e] mt-1">
                          Photos are automatically compressed to save storage space
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          disabled={isCompressing}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Post attachment preview"
                          className="w-full max-h-52 object-cover rounded-xl border border-[#eadfce]"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-md cursor-pointer"
                          title="Remove photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#46705b] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#46705b]" />
                        <span>Compressed for storage sake ({imageSizeKb} KB)</span>
                      </div>
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
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#f4df9e]/70 border border-[#e8ce82] flex items-center justify-center text-xs font-bold text-[#8b6508]">
                      {(post.userName || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#40281d]">
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
                      <span className="text-[10px] text-[#78675e]">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Recent'}
                      </span>
                    </div>
                  </div>

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

                {/* Reactable Messages Section - Always visible buttons for Members, Admins, and Top Admin */}
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
    </div>
  );
};

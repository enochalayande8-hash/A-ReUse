import React, { useState } from 'react';
import { CommunityPost } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { api } from '../services/api';
import { addCommunityPostToFirestore } from '../services/firebase/firestoreService';
import { EmptyState } from '../components/EmptyState';
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
} from 'lucide-react';

interface ConnectPageProps {
  posts: CommunityPost[];
  onPostCreated: () => void;
  onNavigateToAuth: () => void;
}

export const ConnectPage: React.FC<ConnectPageProps> = ({
  posts,
  onPostCreated,
  onNavigateToAuth,
}) => {
  const { user, isAuthenticated } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Tips');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please provide both a title and message content.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.createCommunityPost({
        title: title.trim(),
        content: content.trim(),
        category,
      });

      if (res && res.post) {
        addCommunityPostToFirestore(res.post).catch(() => {});
      }

      setSuccessMsg('Post shared with the movement!');
      setTitle('');
      setContent('');
      onPostCreated();
      setTimeout(() => {
        setShowCreateModal(false);
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to publish post.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div className="border-b border-[#eadfce] pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#46705b] mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-[#46705b]" />
              <span>Movement Community</span>
            </div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d] tracking-tight">
              Connect & Share
            </h1>
            <p className="text-xs sm:text-sm text-[#78675e] mt-1 max-w-xl leading-relaxed">
              Real peer discussions, sustainable shopping habits, practical reusable bag advice, and grassroots environmental momentum.
            </p>
          </div>

          {isAuthenticated ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#e2a72e]" />
              <span>New Post</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToAuth}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#fbf7ed] border border-[#eadfce] text-xs font-bold text-[#40281d] hover:bg-white cursor-pointer"
            >
              Log In to Post
            </button>
          )}
        </div>
      </div>

      {/* Post Creation Modal / Inline Form */}
      {showCreateModal && (
        <div className="app-card p-5 border border-[#e2a72e]/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-heading text-base font-bold text-[#40281d]">Share with Movement</h3>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-xs text-[#78675e] hover:text-[#40281d] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#dce8d8] border border-[#c4d9bf] text-[#365646] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#46705b]" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreatePost} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#40281d] uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tips for remembering reusable bags in your vehicle"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] focus:border-[#e2a72e] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#40281d] uppercase mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] font-semibold focus:border-[#e2a72e] focus:outline-hidden"
                >
                  <option value="Tips">Practical Tips</option>
                  <option value="Success Stories">Success Stories</option>
                  <option value="Questions">Questions & Advice</option>
                  <option value="General">General Discussion</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#40281d] uppercase mb-1">Discussion Message</label>
              <textarea
                rows={3}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your practical experience, ask questions, or encourage other members..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] focus:border-[#e2a72e] focus:outline-hidden resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
              >
                <Send className="w-3.5 h-3.5 text-[#e2a72e]" />
                <span>{isLoading ? 'Publishing...' : 'Publish'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts List or Zero-Data Empty State */}
      {posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Community Discussions Yet"
          description="Be the first to share an update, tip, or question with fellow environmental movement members. Discussions help unite and educate people around single-use plastic reduction."
          actionLabel={isAuthenticated ? 'Start First Discussion' : 'Log In to Post'}
          onAction={isAuthenticated ? () => setShowCreateModal(true) : onNavigateToAuth}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="app-card p-4 sm:p-5 border border-[#eadfce] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#f4df9e]/70 border border-[#e8ce82] flex items-center justify-center text-xs font-bold text-[#8b6508]">
                    {post.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#40281d] block">{post.userName}</span>
                    <span className="text-[10px] text-[#78675e]">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf7ed] text-[#5c463b] border border-[#eadfce]">
                  <Tag className="w-3 h-3 text-[#e2a72e]" />
                  {post.category}
                </span>
              </div>

              <h3 className="font-serif-heading text-base font-bold text-[#40281d] leading-snug">{post.title}</h3>

              <p className="text-xs text-[#5c463b] leading-relaxed whitespace-pre-line">
                {post.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

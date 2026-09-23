import React, { useState, useEffect } from 'react';
import { ProofSubmission } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { api } from '../services/api';
import {
  fetchAdminSubmissionsFromFirestore,
  reviewSubmissionInFirestore,
} from '../services/firebase/firestoreService';
import { EmptyState } from '../components/EmptyState';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Filter,
  MessageSquare,
  Award,
} from 'lucide-react';

interface AdminReviewPageProps {
  onReviewCompleted: () => void;
}

export const AdminReviewPage: React.FC<AdminReviewPageProps> = ({ onReviewCompleted }) => {
  const { user, isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<ProofSubmission[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [isLoading, setIsLoading] = useState(true);

  // Reviewing modal / form state
  const [selectedSubmission, setSelectedSubmission] = useState<ProofSubmission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [customPoints, setCustomPoints] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    const filterArg = filter === 'ALL' ? undefined : filter;
    try {
      const res = await api.getAdminSubmissions(filterArg);
      if (res && res.submissions && res.submissions.length > 0) {
        setSubmissions(res.submissions);
        return;
      }
      // If backend returns empty array or is running client-side, check Firestore
      const fsSubmissions = await fetchAdminSubmissionsFromFirestore(filterArg);
      setSubmissions(fsSubmissions);
    } catch {
      // Backend unavailable (e.g. Vercel static deployment), fetch directly from Firestore
      try {
        const fsSubmissions = await fetchAdminSubmissionsFromFirestore(filterArg);
        setSubmissions(fsSubmissions);
      } catch (fsErr) {
        console.warn('Failed to fetch admin submissions from Firestore:', fsErr);
        setSubmissions([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  useEffect(() => {
    setImageLoadError(false);
  }, [selectedSubmission?.id]);

  const handleOpenReview = (sub: ProofSubmission, action: 'APPROVED' | 'REJECTED') => {
    setSelectedSubmission(sub);
    setImageLoadError(false);
    setReviewStatus(action);
    setReviewNote(action === 'APPROVED' ? 'Verified clear photographic evidence of reusable bag use.' : 'Evidence photo is unclear or missing reusable bag usage.');
    setCustomPoints(10);
    setFeedback(null);
  };

  const handleProcessReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    if (reviewStatus === 'REJECTED' && !reviewNote.trim()) {
      setFeedback({ type: 'error', text: 'Please provide a review note explaining the rejection reason.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      let reviewResultMsg = 'Review recorded successfully!';

      // 1. Try backend review endpoint
      try {
        const res = await api.reviewSubmission(selectedSubmission.id, {
          status: reviewStatus,
          reviewNote: reviewNote.trim(),
          customPoints: reviewStatus === 'APPROVED' ? customPoints : 0,
        });
        if (res && res.message) reviewResultMsg = res.message;
      } catch (apiErr) {
        // 2. Direct Firestore fallback (works on static hosting like Vercel)
        console.warn('Backend review endpoint unavailable, recording directly in Firestore:', apiErr);
        const fsRes = await reviewSubmissionInFirestore(
          selectedSubmission.id,
          {
            status: reviewStatus,
            reviewNote: reviewNote.trim(),
            customPoints: reviewStatus === 'APPROVED' ? customPoints : 0,
          },
          user
        );
        if (fsRes.message) reviewResultMsg = fsRes.message;
      }

      setFeedback({ type: 'success', text: reviewResultMsg });
      setSelectedSubmission(null);
      await fetchSubmissions();
      onReviewCompleted();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit review decision.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-12">
        <EmptyState
          icon={ShieldCheck}
          title="Administrative Access Restricted"
          description="You do not hold active ADMIN or TOP_ADMIN permissions to review member evidence. If you are the system owner, use the Owner Setup key to elevate your credentials."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C1810]/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Authorized Administrator Workspace</span>
          </div>
          <h1 className="text-3xl font-black text-[#2C1810] tracking-tight font-sans">
            Action Proof Reviews
          </h1>
          <p className="text-sm text-[#795548] mt-1 max-w-2xl">
            Examine uploaded member proof and photographic evidence. Approved submissions automatically update user metrics and movement carbon totals based on verified impact formulas.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#2C1810]/15 self-start">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === status
                  ? 'bg-[#2C1810] text-[#FDFBF7]'
                  : 'text-[#795548] hover:text-[#2C1810]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Review Dialog/Drawer if a submission is selected */}
      {selectedSubmission && (
        <div className="rounded-2xl p-6 bg-[#FDFBF7] border-2 border-[#D4AF37] shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#2C1810]/10 pb-3">
            <div>
              <span className="text-xs font-bold text-[#8D6E63] uppercase">
                Reviewing Submission #{selectedSubmission.id.substring(0, 8)}
              </span>
              <h3 className="text-base font-bold text-[#2C1810]">
                Submitter: {selectedSubmission.userName} ({selectedSubmission.userEmail})
              </h3>
            </div>
            <button
              onClick={() => setSelectedSubmission(null)}
              className="text-xs font-bold text-[#795548] hover:text-[#2C1810] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-[#2C1810] uppercase mb-1">Description Provided:</p>
              <p className="text-xs text-[#5D4037] bg-white p-3 rounded-xl border border-[#2C1810]/10 leading-relaxed">
                {selectedSubmission.description}
              </p>

              {(selectedSubmission.proofImageUrl || selectedSubmission.evidenceUrl) && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-[#2C1810] uppercase">Evidence Photo:</p>
                    {selectedSubmission.cloudinaryPublicId && (
                      <span className="text-[10px] text-[#8D6E63] font-medium flex items-center gap-1">
                        <span>Cloudinary:</span>
                        <code className="bg-black/5 px-1 py-0.5 rounded text-[9px] font-mono text-[#2C1810]">
                          {selectedSubmission.cloudinaryPublicId}
                        </code>
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl overflow-hidden border border-[#2C1810]/15 max-h-60 bg-black/5">
                    {imageLoadError ? (
                      <div className="p-6 text-center space-y-2 bg-rose-50/70 border border-rose-200 rounded-xl">
                        <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                        <p className="text-xs font-bold text-rose-800">Unable to load proof image</p>
                        <p className="text-[11px] text-rose-600 max-w-xs mx-auto">
                          The evidence image could not be loaded securely. The storage link may be expired, private, or temporarily unreachable.
                        </p>
                        {(selectedSubmission.proofImageUrl || selectedSubmission.evidenceUrl) && (
                          <a
                            href={selectedSubmission.proofImageUrl || selectedSubmission.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-rose-700 underline font-semibold mt-1 hover:text-rose-900"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Try Opening Directly</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <img
                        src={selectedSubmission.proofImageUrl || selectedSubmission.evidenceUrl}
                        alt="Submitted Proof"
                        onError={() => setImageLoadError(true)}
                        className="w-full h-60 object-cover"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleProcessReview} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                  Review Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('APPROVED')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      reviewStatus === 'APPROVED'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve Proof</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('REJECTED')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      reviewStatus === 'REJECTED'
                        ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                        : 'bg-white text-rose-800 border-rose-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Proof</span>
                  </button>
                </div>
              </div>

              {reviewStatus === 'APPROVED' && (
                <div>
                  <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                    Points to Award
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={customPoints}
                    onChange={(e) => setCustomPoints(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810] font-bold focus:ring-2 focus:ring-[#D4AF37]"
                  />
                  <p className="text-[11px] text-[#8D6E63] mt-1">
                    System default: 10 verified points per approved reusable bag action.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                  Review Note / Feedback to Submitter
                </label>
                <textarea
                  rows={3}
                  required={reviewStatus === 'REJECTED'}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewStatus === 'REJECTED'
                      ? 'Explain why this submission was rejected...'
                      : 'Optional congratulations or verification comment...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810] focus:ring-2 focus:ring-[#D4AF37] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#795548] hover:bg-[#2C1810]/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold hover:bg-[#3E2723] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Recording Decision...' : 'Commit Review Decision'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-[#8D6E63]">
          Loading submissions...
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={
            filter === 'PENDING'
              ? 'No Proof Submissions Awaiting Review'
              : `No ${filter.toLowerCase()} submissions in records`
          }
          description="When movement participants log their reusable bag actions with photo evidence, they appear in this authorized queue for review."
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-5 rounded-2xl bg-white border border-[#2C1810]/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-[#2C1810]">
                    {sub.userName || 'Movement Member'}
                  </span>
                  <span className="text-[11px] text-[#8D6E63]">({sub.userEmail})</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sub.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>

                <p className="text-xs text-[#5D4037] leading-relaxed">
                  <strong className="text-[#2C1810]">{sub.actionType.replace(/_/g, ' ')}: </strong>
                  {sub.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8D6E63] pt-1">
                  <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                  {(sub.proofImageUrl || sub.evidenceUrl) && (
                    <a
                      href={sub.proofImageUrl || sub.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#2C1810] underline hover:text-[#8D6E63]"
                    >
                      <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
                      <span>Inspect Evidence Image</span>
                    </a>
                  )}
                  {sub.cloudinaryPublicId && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Cloudinary
                    </span>
                  )}
                  {sub.pointsAwarded !== undefined && (
                    <span className="font-bold text-[#D4AF37]">
                      Points: +{sub.pointsAwarded}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {sub.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => handleOpenReview(sub, 'APPROVED')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleOpenReview(sub, 'REJECTED')}
                      className="px-3.5 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleOpenReview(sub, sub.status === 'APPROVED' ? 'APPROVED' : 'REJECTED')}
                    className="px-3 py-1.5 rounded-lg border border-[#2C1810]/20 text-xs font-medium text-[#5D4037] hover:bg-[#2C1810]/5 cursor-pointer"
                  >
                    Re-evaluate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

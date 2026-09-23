import React, { useState } from 'react';
import { ProofSubmission } from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { api } from '../services/api';
import { createSubmissionInFirestore } from '../services/firebase/firestoreService';
import { EmptyState } from '../components/EmptyState';
import { ImageModal } from '../components/ImageModal';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface ProofPageProps {
  userSubmissions?: ProofSubmission[];
  onSubmissionSuccess: () => void;
  onNavigateToAuth: () => void;
}

export const ProofPage: React.FC<ProofPageProps> = ({
  userSubmissions = [],
  onSubmissionSuccess,
  onNavigateToAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const safeSubmissions = Array.isArray(userSubmissions) ? userSubmissions : [];

  // Form State
  const [actionType, setActionType] = useState('USED_REUSABLE_BAG');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewModalSubmission, setPreviewModalSubmission] = useState<ProofSubmission | null>(null);

  // Compress image file to lightweight canvas JPEG to ensure rapid uploads and fit comfortably in Firestore
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let { width, height } = img;
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
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(src);
          }
        };
        img.onerror = () => resolve(src);
        img.src = src;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // File upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Image file size must be less than 15MB.');
      return;
    }

    try {
      const compressedDataUrl = await compressImageFile(file);
      setFilePreview(compressedDataUrl);
      setEvidenceUrl(compressedDataUrl);
      setError(null);
    } catch {
      setError('Failed to process image file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      setError('You must be logged in to submit proof.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a brief description of where and how you performed the action.');
      return;
    }

    if (!evidenceUrl.trim() && !filePreview) {
      setError('Please upload a photo or provide an evidence image URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let finalEvidenceUrl = evidenceUrl.trim();
      let uploadedProofImageUrl: string | undefined = undefined;
      let uploadedCloudinaryPublicId: string | undefined = undefined;

      // If user selected an image file (base64 data URL), try uploading securely to Cloudinary via server API
      if (filePreview && filePreview.startsWith('data:image/')) {
        try {
          const uploadRes = await api.uploadProofImage(filePreview);
          if (uploadRes && uploadRes.proofImageUrl) {
            finalEvidenceUrl = uploadRes.proofImageUrl;
            uploadedProofImageUrl = uploadRes.proofImageUrl;
            uploadedCloudinaryPublicId = uploadRes.cloudinaryPublicId;
          }
        } catch (uploadErr) {
          console.warn('[ProofPage] Cloudinary upload endpoint unavailable, storing optimized image directly:', uploadErr);
          // If server upload endpoint is not available, use the compressed image preview as evidenceUrl
          finalEvidenceUrl = filePreview;
          uploadedProofImageUrl = filePreview;
        }
      }

      let submissionRecord: ProofSubmission | null = null;
      let successMessage = 'Proof submitted successfully! It is now pending admin review.';

      // Try server API first
      try {
        const res = await api.submitProof({
          actionType,
          description: description.trim(),
          evidenceUrl: finalEvidenceUrl,
          proofImageUrl: uploadedProofImageUrl,
          cloudinaryPublicId: uploadedCloudinaryPublicId,
        });

        if (res && res.submission) {
          submissionRecord = res.submission;
          if (res.message) successMessage = res.message;
          await createSubmissionInFirestore(res.submission).catch(() => {});
        }
      } catch (apiErr) {
        console.warn('[ProofPage] Backend submit proof endpoint unavailable, saving directly to Firestore:', apiErr);
      }

      // If backend API was unavailable (e.g. Vercel deployment), save directly to Firestore
      if (!submissionRecord) {
        const newPostId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const newSubmission: ProofSubmission = {
          id: newPostId,
          userId: user.id,
          userName: user.fullName || user.email.split('@')[0],
          userEmail: user.email,
          actionType: actionType as any,
          description: description.trim(),
          evidenceUrl: finalEvidenceUrl,
          proofImageUrl: uploadedProofImageUrl,
          cloudinaryPublicId: uploadedCloudinaryPublicId,
          submittedAt: new Date().toISOString(),
          status: 'PENDING',
          pointsAwarded: 0,
          bagsAvoided: 0,
          co2eGramsMin: 0,
          co2eGramsMax: 0,
        };

        await createSubmissionInFirestore(newSubmission);
        submissionRecord = newSubmission;
      }

      setSuccessMsg(successMessage);
      setDescription('');
      setEvidenceUrl('');
      setFilePreview(null);
      onSubmissionSuccess();
    } catch (err: any) {
      console.error('[ProofPage] Submission error:', err);
      setError(err.message || 'Failed to submit proof.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#dce8d8] text-[#365646] border border-[#c4d9bf]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f4df9e]/80 text-[#694c03] border border-[#e8ce82]">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div className="border-b border-[#eadfce] pb-5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8b6508] mb-1">
          <UploadCloud className="w-3.5 h-3.5 text-[#e2a72e]" />
          <span>Verification Engine</span>
        </div>
        <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#40281d] tracking-tight">
          Submit Action Proof
        </h1>
        <p className="text-xs sm:text-sm text-[#78675e] mt-1 max-w-xl leading-relaxed">
          Awareness Global Movement maintains strict verification integrity. Submissions are reviewed by authorized administrators before points and impact figures are awarded.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Proof Submission Form */}
        <div className="lg:col-span-6 app-card p-5 sm:p-6 border border-[#eadfce]">
          <h2 className="font-serif-heading text-base sm:text-lg font-bold text-[#40281d] tracking-tight mb-4 flex items-center justify-between">
            <span>New Proof Submission</span>
            <span className="text-[11px] font-semibold text-[#78675e] uppercase">Status: Starts Pending</span>
          </h2>

          {!isAuthenticated ? (
            <div className="p-5 rounded-2xl bg-[#fbf7ed] border border-[#eadfce] text-center space-y-2.5">
              <ShieldAlert className="w-7 h-7 text-[#e2a72e] mx-auto" />
              <h3 className="font-serif-heading text-sm font-bold text-[#40281d]">Sign In Required</h3>
              <p className="text-xs text-[#78675e] max-w-xs mx-auto leading-relaxed">
                You must be logged in to an authenticated account so points and environmental credits can be awarded to your profile upon review.
              </p>
              <button
                onClick={onNavigateToAuth}
                className="px-4 py-2 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] transition-all cursor-pointer active:scale-98"
              >
                Log In to Submit Proof
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-[#dce8d8] border border-[#c4d9bf] text-[#365646] text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#46705b] flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Action Type */}
              <div>
                <label className="block text-xs font-bold text-[#40281d] uppercase tracking-wider mb-1.5">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#eadfce] text-xs font-semibold text-[#40281d] focus:border-[#e2a72e] focus:outline-hidden"
                >
                  <option value="USED_REUSABLE_BAG">Used Reusable Bag (Eliminated disposable bags)</option>
                  <option value="REFUSED_SINGLE_USE_BAG">Refused Single-Use Plastic Bag at Checkout</option>
                  <option value="OTHER_ENVIRONMENTAL_ACTION">Other Approved Environmental Plastic Reduction</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#40281d] uppercase tracking-wider mb-1.5">
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Where and how was this action performed? (e.g. Grocery trip at market with 2 tote bags, refusing 4 single-use bags)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] placeholder-[#a69888] focus:border-[#e2a72e] focus:outline-hidden resize-none"
                />
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-xs font-bold text-[#40281d] uppercase tracking-wider mb-1.5">
                  Photographic Evidence
                </label>

                {/* File Upload Box */}
                <div className="border-2 border-dashed border-[#eadfce] rounded-2xl p-4 text-center hover:border-[#e2a72e] transition-colors bg-[#fbf7ed]/60">
                  <input
                    type="file"
                    id="proof-file-input"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="proof-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <ImageIcon className="w-5 h-5 text-[#8b6508]" />
                    <span className="text-xs font-bold text-[#40281d]">
                      Click to choose photo or drag & drop
                    </span>
                    <span className="text-[11px] text-[#78675e]">
                      PNG, JPG, or WebP up to 5MB
                    </span>
                  </label>
                </div>

                {/* Evidence Image Preview */}
                {filePreview && (
                  <div className="mt-3 relative rounded-2xl overflow-hidden border border-[#eadfce] max-h-48 bg-black/5">
                    <img
                      src={filePreview}
                      alt="Proof Preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFilePreview(null);
                        setEvidenceUrl('');
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-[#40281d]/85 text-[#fffdf8] text-[10px] font-bold hover:bg-[#40281d]"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Or enter Image URL */}
                <div className="mt-2.5">
                  <span className="text-[11px] text-[#78675e] block mb-1">
                    Or provide direct photo URL:
                  </span>
                  <input
                    type="url"
                    value={evidenceUrl.startsWith('data:') ? '' : evidenceUrl}
                    onChange={(e) => {
                      setEvidenceUrl(e.target.value);
                      setFilePreview(e.target.value);
                    }}
                    placeholder="https://example.com/proof-photo.jpg"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#eadfce] text-xs text-[#40281d] placeholder-[#a69888] focus:border-[#e2a72e] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[#40281d] text-[#fffdf8] text-xs font-bold hover:bg-[#523325] disabled:opacity-50 transition-all border border-[#e2a72e]/30 shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2 active:scale-98"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#e2a72e] border-t-transparent rounded-full animate-spin" />
                    <span>Submitting for Admin Verification...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-[#e2a72e]" />
                    <span>Submit Proof for Admin Review</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-[#78675e] text-center pt-0.5">
                Notice: Submissions do NOT auto-award points. An authorized administrator reviews each piece of evidence to verify compliance.
              </p>
            </form>
          )}
        </div>

        {/* User's Proof History */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-heading text-base sm:text-lg font-bold text-[#40281d]">
              Your Submission History
            </h2>
            <span className="text-xs text-[#78675e] font-semibold">
              {safeSubmissions.length} Submissions
            </span>
          </div>

          {safeSubmissions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Proof Submissions Yet"
              description="You have not submitted any environmental action proof. When you use a reusable bag or refuse a plastic bag, submit photographic proof here to have it verified by movement administrators."
              className="py-10"
            />
          ) : (
            <div className="space-y-3">
              {safeSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl bg-[#fffdf8] border border-[#eadfce] shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif-heading text-xs font-bold text-[#40281d]">
                      {sub.actionType.replace(/_/g, ' ')}
                    </span>
                    {getStatusBadge(sub.status)}
                  </div>

                  <p className="text-xs text-[#5c463b] leading-relaxed">
                    {sub.description}
                  </p>

                  {/* Evidence thumbnail preview if available */}
                  {(sub.proofImageUrl || sub.evidenceUrl) && (
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewModalSubmission(sub)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8b6508] hover:text-[#40281d] underline cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[#e2a72e]" />
                        <span>View Submitted Evidence</span>
                      </button>
                      {sub.cloudinaryPublicId && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#dce8d8] text-[#365646] border border-[#c4d9bf]">
                          Cloudinary
                        </span>
                      )}
                    </div>
                  )}

                  {/* Review result note & points if processed */}
                  {sub.status !== 'PENDING' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-[#fbf7ed] border border-[#eadfce] text-xs space-y-1">
                      {sub.pointsAwarded !== undefined && (
                        <div className="flex items-center justify-between font-bold text-[#40281d]">
                          <span>Awarded Points:</span>
                          <span className="text-[#8b6508]">+{sub.pointsAwarded} Points</span>
                        </div>
                      )}
                      {sub.reviewNote && (
                        <div className="text-[11px] text-[#5c463b]">
                          <span className="font-semibold text-[#40281d]">Review Note: </span>
                          <span>{sub.reviewNote}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-[#78675e]">
                        Reviewed by admin on {new Date(sub.reviewedAt || '').toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-[#78675e] pt-1.5 border-t border-[#eadfce] flex justify-between">
                    <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                    <span>ID: #{sub.id.substring(0, 8)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Image Modal Lightbox Popup */}
      {previewModalSubmission && (
        <ImageModal
          isOpen={!!previewModalSubmission}
          onClose={() => setPreviewModalSubmission(null)}
          imageUrl={previewModalSubmission.proofImageUrl || previewModalSubmission.evidenceUrl || ''}
          title={`Proof Evidence - ${previewModalSubmission.actionType.replace(/_/g, ' ')}`}
          submitterName={previewModalSubmission.userName}
          submitterEmail={previewModalSubmission.userEmail}
          submittedAt={previewModalSubmission.submittedAt}
          actionType={previewModalSubmission.actionType}
          cloudinaryPublicId={previewModalSubmission.cloudinaryPublicId}
          status={previewModalSubmission.status}
        />
      )}
    </div>
  );
};

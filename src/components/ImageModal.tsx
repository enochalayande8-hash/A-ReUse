import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Download,
  ShieldCheck,
  Calendar,
  User as UserIcon,
  Tag,
} from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  submitterName?: string;
  submitterEmail?: string;
  submittedAt?: string;
  actionType?: string;
  cloudinaryPublicId?: string;
  status?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Proof Evidence Photo',
  submitterName,
  submitterEmail,
  submittedAt,
  actionType,
  cloudinaryPublicId,
  status,
}) => {
  const [zoom, setZoom] = useState(1);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setImgError(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.3, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.3, 0.5));
  const handleZoomReset = () => setZoom(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#fffdf8] rounded-2xl shadow-2xl border border-[#eadfce] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eadfce] bg-[#fffdf8]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#e2a72e]" />
            <div>
              <h3 className="text-sm font-bold text-[#40281d]">{title}</h3>
              {cloudinaryPublicId && (
                <span className="text-[10px] text-[#78675e] font-mono">
                  Asset Ref: {cloudinaryPublicId}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-[#fbf7ed] px-2 py-1 rounded-xl border border-[#eadfce]">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Zoom Out"
                className="p-1 text-[#78675e] hover:text-[#40281d] disabled:opacity-40 cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-[#40281d] px-1">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                title="Zoom In"
                className="p-1 text-[#78675e] hover:text-[#40281d] disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={handleZoomReset}
                  title="Reset Zoom"
                  className="p-1 text-[#78675e] hover:text-[#40281d] cursor-pointer ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Direct Open / Download */}
            {imageUrl && !imgError && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                download="proof-evidence.jpg"
                className="p-2 rounded-xl text-[#78675e] hover:text-[#40281d] hover:bg-[#40281d]/5 transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#78675e] hover:text-[#40281d] hover:bg-[#40281d]/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Viewer Body */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[420px] max-h-[65vh] overflow-auto bg-stone-900/95 flex items-center justify-center p-4">
          {imgError ? (
            <div className="text-center p-6 space-y-3 bg-white/10 rounded-2xl border border-white/20 text-white max-w-md">
              <p className="text-sm font-bold text-amber-300">Unable to display photographic evidence</p>
              <p className="text-xs text-stone-300">
                The image storage link is unavailable or requires authenticated access.
              </p>
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Try Direct Image URL</span>
                </a>
              )}
            </div>
          ) : (
            <div
              className="transition-transform duration-150 ease-out origin-center flex items-center justify-center"
              style={{ transform: `scale(${zoom})` }}
            >
              <img
                src={imageUrl}
                alt="Submitted Proof Evidence"
                onError={() => setImgError(true)}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xl select-none"
              />
            </div>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="px-5 py-3 border-t border-[#eadfce] bg-[#fffdf8] text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-[#5c463b]">
              {submitterName && (
                <span className="flex items-center gap-1 font-semibold text-[#40281d]">
                  <UserIcon className="w-3.5 h-3.5 text-[#e2a72e]" />
                  <span>{submitterName}</span>
                  {submitterEmail && (
                    <span className="text-[#78675e] font-normal">({submitterEmail})</span>
                  )}
                </span>
              )}

              {actionType && (
                <span className="flex items-center gap-1 text-[11px] bg-[#fbf7ed] px-2 py-0.5 rounded-md border border-[#eadfce]">
                  <Tag className="w-3 h-3 text-[#e2a72e]" />
                  <span>{actionType.replace(/_/g, ' ')}</span>
                </span>
              )}

              {submittedAt && (
                <span className="flex items-center gap-1 text-[11px] text-[#78675e]">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(submittedAt).toLocaleString()}</span>
                </span>
              )}
            </div>

            {status && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

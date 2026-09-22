import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1F140E]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${widthClasses[maxWidth]} my-8 rounded-2xl bg-[#FDFBF7] border border-[#D4AF37]/40 shadow-2xl overflow-hidden z-10`}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#2C1810]/10 flex items-center justify-between bg-gradient-to-r from-[#F7F4EE] to-[#FDFBF7]">
          <div>
            <h3 className="text-lg font-bold text-[#2C1810] tracking-tight font-sans">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#795548] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#795548] hover:text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

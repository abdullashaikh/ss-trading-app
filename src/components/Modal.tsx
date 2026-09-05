import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2 truncate pr-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Single clean vertical scroll with overscroll-contain */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

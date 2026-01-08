import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

/**
 * Reusable modal for deletion or discarding changes.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Called when user cancels or closes
 * @param {function} onConfirm - Called when user confirms action
 * @param {boolean} loading - Whether a confirmation request is pending
 * @param {string} title - Modal title
 * @param {string} description - Modal explanation text
 * @param {string} confirmText - Label for the confirm button
 * @param {string} cancelText - Label for the cancel button
 */
export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = "Delete Template?",
  description = "Are you sure you want to delete this template? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-2 text-center">
          <p className="text-sm text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>

        <DialogFooter className="sm:justify-center gap-3 pt-4">
          <button
            type="button"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

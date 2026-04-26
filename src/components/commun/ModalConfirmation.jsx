import React from "react";

export default function ModalConfirmation({
  isOpen,
  onClose,
  onConfirm,
  titre,
  message,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        role="presentation"
      />

      <div className="relative z-10 h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in-up">
          <h3 className="text-xl font-bold text-slate-900">{titre}</h3>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {message}
          </p>

          <div className="mt-8 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2.5 text-slate-700 font-semibold hover:bg-slate-200 transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 hover:shadow-lg transition-all"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";

export default function Spinner({ size = 6 }) {
  // Tailwind: size en rem via w/h.
  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full border-2 border-blue-200 border-t-blue-600`}
        style={{ width: `${size}rem`, height: `${size}rem` }}
        aria-label="Chargement"
      />
    </div>
  );
}

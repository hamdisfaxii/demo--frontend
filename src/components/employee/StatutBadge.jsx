import React from "react";

const normalize = (value) => {
  const s = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  return s.replace(/\s+/g, "_");
};

export default function StatutBadge({ statut }) {
  const raw = normalize(statut);

  let label = String(statut ?? "");
  // Normalisation de label si besoin.
  if (raw === "en_attente" || raw === "attente" || raw === "pending")
    label = "En attente";
  if (
    raw === "validee" ||
    raw === "accordee" ||
    raw === "approved" ||
    raw === "accepte"
  )
    label = "Approuvé";
  if (raw === "refusee" || raw === "refuse" || raw === "rejected")
    label = "Rejeté";
  if (raw === "annulee" || raw === "annule") label = "Annulée";

  if (raw === "en_attente" || raw === "attente" || raw === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
        ⏳ {label}
      </span>
    );
  }

  if (
    raw === "validee" ||
    raw === "accordee" ||
    raw === "approved" ||
    raw === "accepte"
  ) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
        ✓ {label}
      </span>
    );
  }

  if (raw === "refusee" || raw === "refuse" || raw === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800">
        ✕ {label}
      </span>
    );
  }

  if (raw === "annulee" || raw === "annule") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
        — {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
      {label || "inconnu"}
    </span>
  );
}

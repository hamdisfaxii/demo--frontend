import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHrStats } from "../../utils/rhApi";
import Spinner from "../../components/commun/Spinner";

export default function HrDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHrStats();
      setStats(data);
    } catch {
      setError("Impossible de charger les statistiques RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cards = [
    {
      label: "En attente",
      value: stats.pending,
      containerClass: "bg-white border-slate-200",
      badgeClass: "bg-amber-100 text-amber-800",
      valueClass: "text-slate-900",
    },
    {
      label: "Approuvées",
      value: stats.approved,
      containerClass: "bg-white border-slate-200",
      badgeClass: "bg-emerald-100 text-emerald-800",
      valueClass: "text-slate-900",
    },
    {
      label: "Rejetées",
      value: stats.rejected,
      containerClass: "bg-white border-slate-200",
      badgeClass: "bg-red-100 text-red-800",
      valueClass: "text-slate-900",
    },
    {
      label: "Total",
      value: stats.total,
      containerClass: "bg-slate-900 border-slate-900",
      badgeClass: "bg-slate-700 text-slate-100",
      valueClass: "text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-slate-900 fade-in-up">
          Tableau de bord RH
        </h1>
        <p className="mt-3 text-sm text-slate-600 fade-in-up" style={{ animationDelay: "0.05s" }}>
          Vue globale des décisions et du workflow des demandes de congé.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-0.5">⚠️</div>
              <div className="text-sm font-medium text-red-700">{error}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-8">
            <Spinner size={3} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${card.containerClass}`}
            >
              <div
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${card.badgeClass}`}
              >
                {card.label}
              </div>
              <div className={`mt-3 text-3xl font-bold ${card.valueClass}`}>
                {loading ? "..." : card.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 fade-in-up">
          <Link
            to="/rh/requests"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-blue-200 transition-all"
          >
            Ouvrir la liste des demandes
          </Link>
          <Link
            to="/rh/decisions"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-blue-200 transition-all"
          >
            Module de décision
          </Link>
          <Link
            to="/rh/calendar"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-blue-200 transition-all"
          >
            Calendrier des congés
          </Link>
          <Link
            to="/rh/configuration"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-blue-200 transition-all"
          >
            Configuration RH
          </Link>
          <Link
            to="/rh/jours-feries"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-blue-200 transition-all"
          >
            Jours fériés
          </Link>
        </div>
      </div>
    </div>
  );
}

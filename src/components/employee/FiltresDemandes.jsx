import React, { useMemo, useState } from "react";

export default function FiltresDemandes({
  years = [],
  initialAnnee,
  initialStatut = "tous",
  onSearch,
  onReset,
}) {
  const sortedYears = useMemo(() => {
    const uniq = Array.from(new Set(years));
    return uniq.sort((a, b) => Number(a) - Number(b));
  }, [years]);

  const anneeParDefaut =
    initialAnnee ??
    sortedYears[sortedYears.length - 1] ??
    new Date().getFullYear();

  const [annee, setAnnee] = useState(String(anneeParDefaut));
  const [statut, setStatut] = useState(initialStatut);

  const handleSearch = () => {
    if (typeof onSearch === "function") {
      onSearch({
        annee: annee && annee !== "tous" ? annee : undefined,
        statut,
      });
    }
  };

  const handleReset = () => {
    const defaultYear =
      sortedYears[sortedYears.length - 1] ?? new Date().getFullYear();
    setAnnee(String(defaultYear));
    setStatut("tous");
    if (typeof onReset === "function") onReset();
    if (typeof onSearch === "function") {
      onSearch({
        annee: String(defaultYear),
        statut: "tous",
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 fade-in-up">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2 w-full md:w-56">
          <label className="text-sm font-semibold text-slate-700">Année</label>
          <select
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            {sortedYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-56">
          <label className="text-sm font-semibold text-slate-700">État</label>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="tous">tous</option>
            <option value="attente">attente</option>
            <option value="validee">accordée</option>
            <option value="refusée">refusée</option>
            <option value="annulée">annulée</option>
          </select>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={handleSearch}
            className="flex-1 sm:flex-none rounded-lg bg-blue-600 px-6 py-2.5 text-white font-semibold hover:bg-blue-700 hover:shadow-md transition-all duration-200"
          >
            Rechercher
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg bg-slate-100 px-6 py-2.5 text-slate-700 font-semibold hover:bg-slate-200 transition-all duration-200"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

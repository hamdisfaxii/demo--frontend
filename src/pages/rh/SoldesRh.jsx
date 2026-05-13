import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import Spinner from "../../components/commun/Spinner";

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/**
 * Formate les nombres décimaux avec virgule française (ex: 7,5 pour 7.5)
 * Affiche les entiers sans décimales (ex: 7 au lieu de 7,00)
 */
const formatDecimalFr = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return "—";
  const n = Number(val);
  // Si c'est un entier, afficher sans décimales
  if (Math.abs(n - Math.round(n)) < 1e-6) {
    return String(Math.round(n));
  }
  // Pour les décimales, afficher avec virgule française
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
};

/** Ordre des colonnes de soldes comme maquette métier / Dolibarr. */
const SOLDES_COLUMN_ORDER = [
  { typeConge: "MALADIE", header: "Congé maladie" },
  { typeConge: "SANS_SOLDE", header: "Autre congé" },
  { typeConge: "PAYE", header: "Congés payés" },
  { typeConge: "COURTE_DUREE", header: "RTT" },
];

const PersonGlyph = ({ className = "w-4 h-4 text-slate-400" }) => (
  <svg
    className={`shrink-0 ${className}`}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
  </svg>
);

const formatUser = (u) => {
  const prenom = String(u?.prenom ?? "").trim();
  const nom = String(u?.nom ?? "").trim();
  const full = [prenom, nom].filter(Boolean).join(" ").trim();
  return full || u?.email || "Utilisateur";
};

const supervisorLabel = (user) => {
  const d = String(user?.departement ?? "").trim();
  if (d) return d;
  return "DRH";
};

const normalizeTypeKey = (t) => String(t ?? "").toUpperCase();

const findBalanceLine = (row, typeConge) => {
  const lines = Array.isArray(row?.balances) ? row.balances : [];
  const wanted = normalizeTypeKey(typeConge);
  return lines.find((l) => normalizeTypeKey(l?.typeConge) === wanted) ?? null;
};

const isMockSession = () => {
  const token = localStorage.getItem("token") || "";
  return token.startsWith("token_");
};

export default function SoldesRh() {
  const [loading, setLoading] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [data, setData] = useState({
    items: [],
    page: 0,
    size: 10,
    total: 0,
    totalPages: 0,
  });

  const [draft, setDraft] = useState(() => new Map());
  const [notesByRow, setNotesByRow] = useState(() => new Map());
  const [selectedRows, setSelectedRows] = useState(() => new Set());

  const load = useCallback(async () => {

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data: resp } = await api.get("/hr/balances", {
        params: {
          q: q.trim() || undefined,
          page,
          size,
        },
      });
      setData(resp ?? {});
      setDraft(new Map());
    } catch (e) {
      setError(
        e?.response?.data?.message ??
          e?.response?.data?.error ??
          "Impossible de charger les soldes.",
      );
      setData({ items: [], page: 0, size, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, q, size]);

  useEffect(() => {
    load();
  }, [load]);

  const items = Array.isArray(data?.items) ? data.items : [];
  const totalPages = Number.isFinite(data?.totalPages) ? data.totalPages : 0;

  const noteKeyForRow = (row) => `${row?.user?.id}:${row?.year ?? currentYear}`;

  const onChangeRemaining = (row, typeConge, value) => {
    setError("");
    setSuccess("");
    const key = `${row?.user?.id}:${row?.year}:${typeConge}`;
    // Normaliser la virgule française (7,5) en point (7.5) pour JavaScript
    const normalizedValue = value.replace(",", ".");
    const n = normalizedValue === "" ? NaN : Number(normalizedValue);
    if (normalizedValue !== "" && !Number.isFinite(n)) return;
    if (Number.isFinite(n) && n < 0) return;
    setDraft((prev) => {
      const next = new Map(prev);
      if (normalizedValue === "") next.set(key, "");
      else next.set(key, n);
      return next;
    });
  };

  const currentRemaining = (row, line, typeConge) => {
    const key = `${row?.user?.id}:${row?.year}:${typeConge}`;
    if (draft.has(key)) return draft.get(key);
    return line?.remaining ?? 0;
  };

  const buildPayloadForRow = (row) => {
    const userId = row?.user?.id;
    const year = row?.year;
    if (userId == null || year == null) return null;
    const updates = [];
    for (const col of SOLDES_COLUMN_ORDER) {
      const k = `${userId}:${year}:${col.typeConge}`;
      if (!draft.has(k)) continue;
      const v = draft.get(k);
      if (v === "" || v == null) continue;
      const remaining = Number(v);
      if (!Number.isFinite(remaining) || remaining < 0) continue;
      updates.push({ typeConge: col.typeConge, remaining });
    }
    if (updates.length === 0) return null;
    return [{ userId, year, updates }];
  };

  const clearDraftForRow = (row) => {
    const userId = row?.user?.id;
    const year = row?.year;
    if (userId == null || year == null) return;
    const prefix = `${userId}:${year}:`;
    setDraft((prev) => {
      const next = new Map(prev);
      for (const k of [...next.keys()]) {
        if (String(k).startsWith(prefix)) next.delete(k);
      }
      return next;
    });
  };

  const saveRow = async (row) => {
    const payload = buildPayloadForRow(row);
    if (payload == null) {
      setError("Aucune modification sur cette ligne à enregistrer.");
      return;
    }
    setSavingRowId(row?.user?.id ?? null);
    setError("");
    setSuccess("");
    try {
      await api.put("/hr/balances", payload);
      setSuccess("Enregistré.");
      clearDraftForRow(row);
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ??
          e?.response?.data?.error ??
          "Échec de la sauvegarde.",
      );
    } finally {
      setSavingRowId(null);
    }
  };

  const rowSelectableId = (row) => `${row?.user?.id}:${row?.year}`;
  const allSelected =
    items.length > 0 &&
    items.every((r) => selectedRows.has(rowSelectableId(r)));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(items.map((r) => rowSelectableId(r))));
  };
  const toggleRowSelected = (row) => {
    const id = rowSelectableId(row);
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const inputCls = (readonly) =>
    [
      "w-full min-w-[4.5rem] max-w-[6.5rem] rounded border px-2 py-1.5 text-sm tabular-nums text-slate-800",
      readonly
        ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
        : "border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500",
    ].join(" ");

  const theadCls =
    "bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Soldes de congés
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={load}
              disabled={loading || savingRowId != null}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded border border-slate-300 bg-white px-2 py-1.5 shadow-sm">
              <span className="text-slate-400" aria-hidden>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Rechercher…"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <select
              value={size}
              onChange={(e) => {
                setSize(clamp(Number(e.target.value), 5, 50));
                setPage(0);
              }}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={loading || page <= 0}
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={loading || page >= totalPages - 1}
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="px-3 py-2 border-b border-slate-100">
              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              {success && !error && (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {success}
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12">
                <Spinner />
              </div>
            ) : (
              <table className="min-w-[1180px] w-full border-collapse text-left">
                <thead>
                  <tr className={theadCls}>
                    <th className="w-10 px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Tout sélectionner"
                      />
                    </th>
                    <th className="px-3 py-2.5 min-w-[160px]">Collaborateur</th>
                    <th className="px-3 py-2.5 min-w-[100px]">Superviseur</th>
                    {SOLDES_COLUMN_ORDER.map((col) => (
                      <th
                        key={col.typeConge}
                        className="px-2 py-2.5 whitespace-nowrap"
                      >
                        {col.header}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 whitespace-nowrap">
                      Récupération
                    </th>
                    <th
                      className="px-3 py-2.5 min-w-[140px]"
                      title="Brouillon local — non enregistré sur le serveur"
                    >
                      Note
                    </th>
                    <th className="px-2 py-2.5 w-28 text-center"> </th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3 + SOLDES_COLUMN_ORDER.length + 3}
                        className="px-3 py-12 text-center text-sm text-slate-500"
                      >
                        Aucun résultat.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => {
                      const rid = rowSelectableId(row);
                      const saving = savingRowId === row?.user?.id;
                      return (
                        <tr
                          key={rid}
                          className="border-b border-slate-100 bg-white hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-2 py-2.5 text-center align-middle">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                              checked={selectedRows.has(rid)}
                              onChange={() => toggleRowSelected(row)}
                              aria-label={`Sélectionner ${formatUser(row?.user)}`}
                            />
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-2">
                              <PersonGlyph />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">
                                  {formatUser(row?.user)}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {row?.user?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-2">
                              <PersonGlyph />
                              <span className="text-sm text-slate-700">
                                {supervisorLabel(row?.user)}
                              </span>
                            </div>
                          </td>
                          {SOLDES_COLUMN_ORDER.map((col) => {
                            const line = findBalanceLine(row, col.typeConge);
                            const ro = Boolean(line?.readOnly) || line == null;
                            const displayVal = currentRemaining(
                              row,
                              line,
                              col.typeConge,
                            );
                            return (
                              <td
                                key={col.typeConge}
                                className="px-2 py-2 align-middle"
                              >
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    displayVal === ""
                                      ? ""
                                      : formatDecimalFr(displayVal)
                                  }
                                  disabled={ro || saving}
                                  title={line?.message || undefined}
                                  onChange={(e) =>
                                    onChangeRemaining(
                                      row,
                                      col.typeConge,
                                      e.target.value,
                                    )
                                  }
                                  className={inputCls(ro)}
                                />
                                {line?.message ? (
                                  <p className="mt-0.5 text-[10px] text-amber-600 leading-tight max-w-[7rem]">
                                    {line.message}
                                  </p>
                                ) : null}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 align-middle">
                            <input
                              type="text"
                              disabled
                              value="—"
                              readOnly
                              className={inputCls(true)}
                              title="Type non mappé dans l’application (réservé évolution)"
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <textarea
                              rows={2}
                              value={notesByRow.get(noteKeyForRow(row)) ?? ""}
                              onChange={(e) => {
                                const k = noteKeyForRow(row);
                                setNotesByRow((prev) => {
                                  const next = new Map(prev);
                                  next.set(k, e.target.value);
                                  return next;
                                });
                              }}
                              placeholder="Note…"
                              className="w-full min-w-[120px] max-w-[220px] rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y min-h-[2.25rem]"
                            />
                          </td>
                          <td className="px-2 py-2 align-middle text-center">
                            <button
                              type="button"
                              disabled={
                                saving ||
                                loading ||
                                buildPayloadForRow(row) == null
                              }
                              onClick={() => saveRow(row)}
                              className="rounded bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 whitespace-nowrap"
                            >
                              {saving ? "…" : "Enregistrer"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
            <span>
              Page{" "}
              <span className="font-semibold text-slate-700">{page + 1}</span> /{" "}
              {Math.max(1, totalPages || 1)}
            </span>
            <span>Total : {Number.isFinite(data?.total) ? data.total : 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

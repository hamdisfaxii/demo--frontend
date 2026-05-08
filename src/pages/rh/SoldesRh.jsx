import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import Spinner from "../../components/commun/Spinner";
import ModalConfirmation from "../../components/commun/ModalConfirmation";

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const labelForType = (t) => {
  const u = String(t ?? "").toUpperCase();
  if (u === "PAYE") return "Congés payés";
  if (u === "MALADIE") return "Congé maladie";
  if (u === "SANS_SOLDE") return "Sans solde";
  if (u === "COURTE_DUREE") return "RTT / Courte durée";
  return u || "—";
};

const formatUser = (u) => {
  const prenom = String(u?.prenom ?? "").trim();
  const nom = String(u?.nom ?? "").trim();
  const full = [prenom, nom].filter(Boolean).join(" ").trim();
  return full || u?.email || "Utilisateur";
};

const isMockSession = () => {
  const token = localStorage.getItem("token") || "";
  return token.startsWith("token_");
};

export default function SoldesRh() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const [data, setData] = useState({
    items: [],
    page: 0,
    size: 10,
    total: 0,
    totalPages: 0,
  });

  const [draft, setDraft] = useState(() => new Map()); // key: `${userId}:${year}:${type}` -> remaining
  const [confirm, setConfirm] = useState({ open: false });

  const hasChanges = useMemo(() => draft.size > 0, [draft.size]);

  const load = useCallback(async () => {
    if (isMockSession()) {
      setError(
        "Cette page (RH Soldes) nécessite le backend Spring Boot. En mode mock (Node.js), l’API /api/hr/balances n’existe pas.",
      );
      setData({ items: [], page: 0, size, total: 0, totalPages: 0 });
      setDraft(new Map());
      return;
    }
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
      setDraft(new Map()); // évite d’éditer des lignes qui ne sont plus à l’écran
    } catch (e) {
      setError(e?.response?.data?.error || "Impossible de charger les soldes.");
      setData({ items: [], page: 0, size, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, q, size]);

  useEffect(() => {
    load();
  }, [load]);

  const onChangeRemaining = (row, line, value) => {
    setError("");
    setSuccess("");
    const key = `${row?.user?.id}:${row?.year}:${line?.typeConge}`;
    const n = value === "" ? "" : Number(value);
    if (value !== "" && !Number.isFinite(n)) return;
    if (Number.isFinite(n) && n < 0) return;
    setDraft((prev) => {
      const next = new Map(prev);
      if (value === "") {
        next.set(key, "");
      } else {
        next.set(key, n);
      }
      return next;
    });
  };

  const currentRemaining = (row, line) => {
    const key = `${row?.user?.id}:${row?.year}:${line?.typeConge}`;
    if (draft.has(key)) return draft.get(key);
    return line?.remaining ?? 0;
  };

  const buildPayload = () => {
    const grouped = new Map(); // key: `${userId}:${year}` -> { userId, year, updates: [] }
    for (const [k, v] of draft.entries()) {
      const [userIdStr, yearStr, type] = String(k).split(":");
      const userId = Number(userIdStr);
      const year = Number(yearStr);
      if (!Number.isFinite(userId) || !Number.isFinite(year)) continue;
      if (v === "" || v == null) continue;
      const remaining = Number(v);
      if (!Number.isFinite(remaining) || remaining < 0) continue;
      const groupKey = `${userId}:${year}`;
      const g = grouped.get(groupKey) || { userId, year, updates: [] };
      g.updates.push({ typeConge: type, remaining });
      grouped.set(groupKey, g);
    }
    return Array.from(grouped.values()).filter((x) => x.updates.length > 0);
  };

  const save = async () => {
    const payload = buildPayload();
    if (payload.length === 0) {
      setConfirm({ open: false });
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/hr/balances", payload);
      setSuccess("Soldes sauvegardés avec succès.");
      setConfirm({ open: false });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Échec de la sauvegarde des soldes.");
    } finally {
      setSaving(false);
    }
  };

  const items = Array.isArray(data?.items) ? data.items : [];
  const totalPages = Number.isFinite(data?.totalPages) ? data.totalPages : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 fade-in-up">Soldes de congés</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <button
              type="button"
              onClick={load}
              disabled={loading || saving}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Rafraîchir
            </button>
            <button
              type="button"
              onClick={() => setConfirm({ open: true })}
              disabled={!hasChanges || saving || loading}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm fade-in-up">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Rechercher (nom, prénom, email)"
              className="md:col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="md:col-span-2 flex gap-2 items-center">
              <span className="text-xs text-slate-500">Taille</span>
              <select
                value={size}
                onChange={(e) => {
                  const next = clamp(Number(e.target.value), 5, 50);
                  setSize(next);
                  setPage(0);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="md:col-span-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={loading || saving || page <= 0}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={loading || saving || page >= totalPages - 1}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="mt-4">
              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <div className="py-10">
                <Spinner />
              </div>
            ) : (
              <table className="min-w-[980px] w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-3 py-2">Employé</th>
                    <th className="px-3 py-2">Pays</th>
                    <th className="px-3 py-2">Département</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Pris</th>
                    <th className="px-3 py-2">Restant (éditable)</th>
                    <th className="px-3 py-2">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">
                        Aucun résultat.
                      </td>
                    </tr>
                  ) : (
                    items.flatMap((row) => {
                      const lines = Array.isArray(row?.balances) ? row.balances : [];
                      return lines.map((line) => {
                        const ro = Boolean(line?.readOnly);
                        const remainingValue = currentRemaining(row, line);
                        return (
                          <tr key={`${row?.user?.id}-${line?.typeConge}`} className="bg-slate-50">
                            <td className="px-3 py-3 rounded-l-xl">
                              <div className="text-sm font-semibold text-slate-900">{formatUser(row?.user)}</div>
                              <div className="text-xs text-slate-500">{row?.user?.email}</div>
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-700">{String(row?.user?.pays ?? "").toUpperCase()}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{row?.user?.departement || "—"}</td>
                            <td className="px-3 py-3 text-sm font-medium text-slate-900">{labelForType(line?.typeConge)}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{Number(line?.total ?? 0).toFixed(2).replace(/\.00$/, "")}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{Number(line?.used ?? 0).toFixed(2).replace(/\.00$/, "")}</td>
                            <td className="px-3 py-3">
                              <input
                                value={remainingValue}
                                disabled={ro || saving}
                                onChange={(e) => onChangeRemaining(row, line, e.target.value)}
                                className={[
                                  "w-32 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                                  ro ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-200 bg-white focus:ring-blue-500",
                                ].join(" ")}
                              />
                            </td>
                            <td className="px-3 py-3 rounded-r-xl">
                              {line?.message ? (
                                <span className="text-xs text-slate-500">{line.message}</span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page <span className="font-semibold text-slate-700">{page + 1}</span> / {Math.max(1, totalPages || 1)}
            </div>
            <div>Total: {Number.isFinite(data?.total) ? data.total : 0}</div>
          </div>
        </div>
      </div>

      <ModalConfirmation
        isOpen={Boolean(confirm.open)}
        onClose={() => setConfirm({ open: false })}
        onConfirm={save}
        titre="Confirmer la sauvegarde"
        message="Enregistrer les modifications ?"
      />
    </div>
  );
}


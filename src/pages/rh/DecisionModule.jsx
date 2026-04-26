import React, { useCallback, useMemo, useState } from "react";
import api from "../../utils/api";
import { useAuth } from "../../context/authcontext";
import Spinner from "../../components/commun/Spinner";

const parseMockUserId = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const parts = token.split("_");
  const id = Number(parts[1]);
  return Number.isFinite(id) ? id : null;
};

const formatStatus = (raw) => {
  const normalized = String(raw ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalized.includes("ATTENTE") || normalized.includes("PENDING")) {
    return "PENDING";
  }
  if (
    normalized.includes("ACCEPTE") ||
    normalized.includes("APPROUVE") ||
    normalized.includes("APPROVED")
  ) {
    return "APPROVED";
  }
  if (normalized.includes("REFUSE") || normalized.includes("REJET") || normalized.includes("REJECTED")) {
    return "REJECTED";
  }
  return normalized || "UNKNOWN";
};

const statusBadgeClass = (status) => {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800";
  if (status === "REJECTED") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
};

export default function DecisionModule() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);

  const [filters, setFilters] = useState({
    employee: "",
    country: "",
    department: "",
    startDate: "",
    endDate: "",
  });

  const [modal, setModal] = useState({
    open: false,
    requestId: null,
    action: "APPROVE",
    comment: "",
  });

  const normalizeMockList = useCallback((rows) => {
    return (rows ?? []).map((row) => ({
      id: row.id,
      typeConge: row.typeConge,
      statut: row.statut,
      dateDebut: row.dateDebut,
      dateFin: row.dateFin,
      nombreJours: row.nombreJours,
      motif: row.raison ?? row.motif ?? "",
      commentaireRh: "",
      dateSoumission: row.dateCreation,
      employe: {
        id: row.userId,
        nom: row.employe?.fullName?.split(" ").slice(1).join(" ") ?? "",
        prenom: row.employe?.fullName?.split(" ")[0] ?? "",
        email: row.employe?.email ?? "",
        country: row.employe?.pays ?? "",
        department: row.employe?.departement ?? "",
      },
    }));
  }, []);

  const applyLocalFilters = useCallback(
    (rows) => {
      return rows.filter((row) => {
        const employee = `${row.employe?.prenom ?? ""} ${row.employe?.nom ?? ""} ${row.employe?.email ?? ""}`
          .toLowerCase()
          .trim();

        const byEmployee = !filters.employee || employee.includes(filters.employee.toLowerCase().trim());
        const byCountry =
          !filters.country ||
          String(row.employe?.country ?? "")
            .toLowerCase()
            .trim() === filters.country.toLowerCase().trim();
        const byDepartment =
          !filters.department ||
          String(row.employe?.department ?? "")
            .toLowerCase()
            .trim() === filters.department.toLowerCase().trim();
        const byStart = !filters.startDate || String(row.dateDebut ?? "") >= filters.startDate;
        const byEnd = !filters.endDate || String(row.dateFin ?? "") <= filters.endDate;
        return byEmployee && byCountry && byDepartment && byStart && byEnd;
      });
    },
    [filters],
  );

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.employee.trim()) params.employee = filters.employee.trim();
      if (filters.country.trim()) params.country = filters.country.trim();
      if (filters.department.trim()) params.department = filters.department.trim();
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const { data } = await api.get("/hr/requests/pending", { params });
      setRequests(Array.isArray(data) ? data : []);
    } catch (primaryError) {
      if (primaryError?.response?.status === 404) {
        try {
          const { data } = await api.get("/rh/demandes-en-attente");
          const normalized = normalizeMockList(data?.demandes ?? []);
          setRequests(applyLocalFilters(normalized));
          return;
        } catch (fallbackError) {
          setError("Impossible de charger les demandes en attente.");
          throw fallbackError;
        }
      }
      setError("Impossible de charger les demandes en attente.");
      throw primaryError;
    } finally {
      setLoading(false);
    }
  }, [applyLocalFilters, filters, normalizeMockList]);

  const closeModal = () =>
    setModal({ open: false, requestId: null, action: "APPROVE", comment: "" });

  const submitDecision = useCallback(async () => {
    if (!modal.requestId) return;
    setLoading(true);
    setError("");
    try {
      await api.post(`/hr/requests/${modal.requestId}/decision`, {
        action: modal.action,
        comment: modal.comment || null,
      });
    } catch (primaryError) {
      if (primaryError?.response?.status === 404) {
        const userId = parseMockUserId();
        if (!userId) {
          setError("Session invalide pour valider la demande.");
          setLoading(false);
          return;
        }
        if (modal.action === "APPROVE") {
          await api.post(`/demande/${modal.requestId}/rh-approve`, {
            userId,
            commentaire: modal.comment || "",
          });
        } else {
          await api.post(`/demande/${modal.requestId}/reject`, {
            commentaire: modal.comment || "",
          });
        }
      } else {
        setError("Échec de la mise à jour de la demande.");
        setLoading(false);
        throw primaryError;
      }
    }
    closeModal();
    await fetchPending();
    setLoading(false);
  }, [fetchPending, modal.action, modal.comment, modal.requestId]);

  const title = useMemo(() => {
    const displayName = user?.name || "Responsable RH";
    return `Décisions RH - ${displayName}`;
  }, [user?.name]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-slate-900 fade-in-up">{title}</h1>
        <p className="mt-3 text-sm text-slate-600 fade-in-up" style={{ animationDelay: "0.05s" }}>
          Gérez les demandes en attente, appliquez les décisions et synchronisez le workflow.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm fade-in-up">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              value={filters.employee}
              onChange={(e) => setFilters((prev) => ({ ...prev, employee: e.target.value }))}
              placeholder="Employé (nom/email)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={filters.country}
              onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
              placeholder="Pays (TN/MA/FR)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={filters.department}
              onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="Département"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={fetchPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 hover:shadow-lg transition-all"
              disabled={loading}
            >
              Charger les demandes PENDING
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  employee: "",
                  country: "",
                  department: "",
                  startDate: "",
                  endDate: "",
                });
                setRequests([]);
              }}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-all"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-0.5">⚠️</div>
              <div className="text-sm font-medium text-red-700">{error}</div>
            </div>
          </div>
        )}

        {loading && requests.length === 0 ? (
          <div className="mt-8">
            <Spinner size={3} />
          </div>
        ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm fade-in-up">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-900">Employé</th>
                <th className="p-4 font-semibold text-slate-900">Pays / Département</th>
                <th className="p-4 font-semibold text-slate-900">Type / Période</th>
                <th className="p-4 font-semibold text-slate-900">Motif</th>
                <th className="p-4 font-semibold text-slate-900">Statut</th>
                <th className="p-4 font-semibold text-slate-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading && requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Aucune demande en attente.
                  </td>
                </tr>
              )}
              {!loading &&
                requests.map((req) => {
                  const status = formatStatus(req.statut);
                  return (
                    <tr key={req.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">
                          {req.employe?.prenom} {req.employe?.nom}
                        </div>
                        <div className="text-xs text-slate-500">{req.employe?.email}</div>
                      </td>
                      <td className="p-4 text-slate-700">
                        {(req.employe?.country || "-") + " / " + (req.employe?.department || "-")}
                      </td>
                      <td className="p-4 text-slate-700">
                        <div>{req.typeConge}</div>
                        <div className="text-xs text-slate-500">
                          {req.dateDebut} → {req.dateFin}
                        </div>
                      </td>
                      <td className="p-4 text-slate-700">{req.motif || "-"}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 hover:shadow-lg transition-all"
                            onClick={() =>
                              setModal({
                                open: true,
                                requestId: req.id,
                                action: "APPROVE",
                                comment: "",
                              })
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 hover:shadow-lg transition-all"
                            onClick={() =>
                              setModal({
                                open: true,
                                requestId: req.id,
                                action: "REJECT",
                                comment: "",
                              })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            role="presentation"
            onClick={closeModal}
          />
          <div className="relative z-10 flex h-full items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-slate-900">
                {modal.action === "APPROVE" ? "Approve request" : "Reject request"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Ajoutez un commentaire optionnel pour traçabilité BPM et synchronisation.
              </p>
              <textarea
                value={modal.comment}
                onChange={(e) =>
                  setModal((prev) => ({ ...prev, comment: e.target.value }))
                }
                className="mt-4 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Commentaire (optionnel)"
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={submitDecision}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

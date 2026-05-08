import api from "./api";

const tokenUserId = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const parts = token.split("_");
  const id = Number(parts[1]);
  return Number.isFinite(id) ? id : null;
};

const isMockSession = () => {
  const token = localStorage.getItem("token") || "";
  return token.startsWith("token_");
};

const approveWithMockCandidates = async (id, comment) => {
  const candidates = [3, 4, tokenUserId()].filter(Boolean);
  let lastError = null;
  for (const userId of candidates) {
    try {
      const { data } = await api.post(`/demande/${id}/rh-approve`, {
        userId,
        commentaire: comment || "",
      });
      return data;
    } catch (e) {
      lastError = e;
      if (e?.response?.status !== 403) {
        throw e;
      }
    }
  }
  throw lastError;
};

export function normalizeStatus(raw) {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (s.includes("ATTENTE") || s.includes("PENDING")) return "PENDING";
  if (s.includes("APPROUV") || s.includes("ACCEPTE") || s.includes("APPROVED")) {
    return "APPROVED";
  }
  if (s.includes("REJET") || s.includes("REFUS") || s.includes("REJECTED")) {
    return "REJECTED";
  }
  return s || "UNKNOWN";
}

const mapMockToRequest = (row) => ({
  id: row.id,
  typeConge: row.typeConge,
  statut: normalizeStatus(row.statut),
  rawStatus: row.statut,
  dateDebut: row.dateDebut,
  dateFin: row.dateFin,
  nombreJours: row.nombreJours,
  nombreJoursExact: row.nombreJoursExact ?? row.joursExact ?? null,
  startHalfDay: row.startHalfDay ?? null,
  endHalfDay: row.endHalfDay ?? null,
  motif: row.raison ?? row.motif ?? "",
  commentaireRh: row.commentaireRh ?? "",
  dateSoumission: row.dateCreation ?? row.dateSoumission ?? null,
  approuvePar: row.approuvePar ?? row.approvedBy ?? null,
  employe: {
    id: row.userId ?? row.employe?.id,
    nom: row.employe?.nom ?? row.employe?.fullName?.split(" ").slice(1).join(" ") ?? "",
    prenom: row.employe?.prenom ?? row.employe?.fullName?.split(" ")[0] ?? "",
    email: row.employe?.email ?? "",
    country: row.employe?.country ?? row.employe?.pays ?? "",
    department: row.employe?.department ?? row.employe?.departement ?? "",
  },
  historique: row.historique ?? [],
});

const filterRows = (rows, filters = {}) =>
  rows.filter((r) => {
    const employeeBlob = `${r.employe?.prenom ?? ""} ${r.employe?.nom ?? ""} ${r.employe?.email ?? ""}`
      .toLowerCase()
      .trim();
    const status = normalizeStatus(r.statut);
    const byStatus =
      !filters.status ||
      filters.status === "ALL" ||
      status === String(filters.status).toUpperCase();
    const byEmployee =
      !filters.employee ||
      employeeBlob.includes(String(filters.employee).toLowerCase().trim());
    const byCountry =
      !filters.country ||
      String(r.employe?.country ?? "")
        .toUpperCase()
        .trim() === String(filters.country).toUpperCase().trim();
    const byDepartment =
      !filters.department ||
      String(r.employe?.department ?? "")
        .toLowerCase()
        .trim() === String(filters.department).toLowerCase().trim();
    const byStart = !filters.startDate || String(r.dateDebut ?? "") >= String(filters.startDate);
    const byEnd = !filters.endDate || String(r.dateFin ?? "") <= String(filters.endDate);
    return byStatus && byEmployee && byCountry && byDepartment && byStart && byEnd;
  });

/** Nombre fini ou NaN (évite de traiter "" ou null comme 0 trop tôt). */
function toFiniteNumber(v) {
  if (v == null || v === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Premier scalaire numérique exploitable dans l’ordre de priorité. */
function pickFirstFinite(...candidates) {
  for (const c of candidates) {
    const n = toFiniteNumber(c);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/**
 * Extrait EN_ATTENTE / ACCEPTE / REFUSE depuis demandesParStatut (clés enum Java,
 * éventuellement préfixées par le package, ou snake_case côté autre API).
 */
function extractCountsFromDemandesParStatut(data) {
  const raw =
    data?.demandesParStatut ??
    data?.demandes_par_statut ??
    null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { enAttente: NaN, acceptees: NaN, refusees: NaN };
  }
  let enAttente = NaN;
  let acceptees = NaN;
  let refusees = NaN;
  for (const [k, val] of Object.entries(raw)) {
    let key = String(k).trim();
    if (key.includes(".")) {
      key = key.split(".").pop() || key;
    }
    key = key
      .toUpperCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    const n = toFiniteNumber(val);
    if (!Number.isFinite(n)) continue;
    if (key === "EN_ATTENTE") enAttente = n;
    else if (key === "ACCEPTE") acceptees = n;
    else if (key === "REFUSE") refusees = n;
  }
  return { enAttente, acceptees, refusees };
}

export async function getHrStats() {
  try {
    // Spring : demandesAcceptees / demandesParStatut ; mock : statistiques + mêmes champs explicites.
    const { data } = await api.get("/rh/dashboard");
    const leg = data?.statistiques ?? {};
    const fromMap = extractCountsFromDemandesParStatut(data);

    const pending = pickFirstFinite(
      data?.pending,
      data?.demandesEnAttente,
      data?.demandes_en_attente,
      leg?.en_attente,
      fromMap.enAttente,
    );
    const approved = pickFirstFinite(
      data?.approved,
      data?.demandesAcceptees,
      data?.demandes_acceptees,
      leg?.approuvees,
      fromMap.acceptees,
    );
    const rejected = pickFirstFinite(
      data?.rejected,
      data?.demandesRefusees,
      data?.demandes_refusees,
      leg?.rejetees,
      fromMap.refusees,
    );
    const totalCandidate = toFiniteNumber(
      data?.total ?? data?.demandesTotal ?? data?.demandes_total ?? leg?.total_demandes,
    );
    const sumParts = pending + approved + rejected;
    const total = Number.isFinite(totalCandidate)
      ? Math.max(totalCandidate, sumParts)
      : sumParts;
    return {
      pending,
      approved,
      rejected,
      total,
    };
  } catch (e) {
    if (e?.response?.status !== 404) {
      throw e;
    }
    try {
      const { data } = await api.get("/rh/stats");
      const pending = Number(data?.pending ?? 0);
      const approved = Number(data?.approved ?? 0);
      const rejected = Number(data?.rejected ?? 0);
      return {
        pending,
        approved,
        rejected,
        total: Number(data?.total ?? pending + approved + rejected),
      };
    } catch {
      const { data } = await api.get("/hr/requests/stats");
      return {
        pending: Number(data?.pending ?? 0),
        approved: Number(data?.approved ?? 0),
        rejected: Number(data?.rejected ?? 0),
        total: Number(data?.total ?? 0),
      };
    }
  }
}

export async function getHrRequests(filters = {}) {
  const params = {};
  if (filters.status && filters.status !== "ALL") params.status = filters.status;
  if (filters.employee) params.employee = filters.employee;
  if (filters.country) params.country = filters.country;
  if (filters.department) params.department = filters.department;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;

  let lastError = null;
  for (const path of ["/rh/requests", "/hr/requests"]) {
    try {
      const { data } = await api.get(path, { params });
      const list = data?.requests ?? data ?? [];
      return Array.isArray(list) ? list.map(mapMockToRequest) : [];
    } catch (e) {
      lastError = e;
      if (e?.response?.status !== 404) throw e;
    }
  }

  /* Anciens backends : uniquement file d’attente — filtre statut autre qu’attente ne peut pas être honoré. */
  try {
    const pendingParams = { ...params };
    delete pendingParams.status;
    const { data } = await api.get("/hr/requests/pending", { params: pendingParams });
    const list = Array.isArray(data) ? data : [];
    const mapped = list.map(mapMockToRequest);
    return filterRows(mapped, filters);
  } catch {
    try {
      const { data } = await api.get("/rh/demandes-en-attente");
      const rows = Array.isArray(data?.demandes) ? data.demandes.map(mapMockToRequest) : [];
      return filterRows(rows, filters);
    } catch {
      if (lastError) throw lastError;
      return [];
    }
  }
}

export async function getHrRequestById(id) {
  const mockFirst = isMockSession();
  if (mockFirst) {
    const { data } = await api.get(`/demande/${id}`);
    return mapMockToRequest(data);
  }

  try {
    const { data } = await api.get(`/rh/requests/${id}`);
    return mapMockToRequest(data);
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
  }

  try {
    const { data } = await api.get(`/hr/requests/${id}`);
    return mapMockToRequest(data);
  } catch {
    const { data } = await api.get(`/demande/${id}`);
    return mapMockToRequest(data);
  }
}

export async function decideHrRequest(id, action, comment) {
  const mockFirst = isMockSession();
  if (mockFirst) {
    if (String(action).toUpperCase() === "APPROVE") {
      return approveWithMockCandidates(id, comment);
    }
    const { data } = await api.post(`/demande/${id}/reject`, {
      commentaire: comment || "",
    });
    return data;
  }

  try {
    const { data } = await api.post(`/hr/requests/${id}/decision`, { action, comment });
    return data;
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
  }

  if (String(action).toUpperCase() === "APPROVE") {
    return approveWithMockCandidates(id, comment);
  }
  const { data } = await api.post(`/demande/${id}/reject`, {
    commentaire: comment || "",
  });
  return data;
}

export async function getSuperAdmins() {
  // Mode mock (Node backend) : endpoint Spring Boot non disponible.
  if (isMockSession()) return [];
  const { data } = await api.get("/hr/admins");
  return Array.isArray(data) ? data : [];
}

export async function getCalendarEvents(filters = {}) {
  const params = {};
  if (filters.employeeId) params.employeeId = filters.employeeId;
  if (filters.department) params.department = filters.department;
  if (filters.country) params.country = filters.country;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  try {
    const { data } = await api.get("/calendar/events", { params });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getHrConfiguration() {
  const response = {
    workflowRules: [],
    countryRules: [],
    leaveTypes: [],
    integration: {},
  };

  try {
    const [workflow, country, leaveTypes, integration] = await Promise.all([
      api.get("/hr-config/workflow-rules"),
      api.get("/hr-config/country-rules"),
      api.get("/hr-config/leave-types"),
      api.get("/hr-config/integration-settings"),
    ]);
    response.workflowRules = workflow.data ?? [];
    response.countryRules = country.data ?? [];
    response.leaveTypes = leaveTypes.data ?? [];
    response.integration = integration.data ?? {};
    return response;
  } catch {
    const [workflow, country, leaveTypes, integration] = await Promise.all([
      api.get("/hr-config/workflow-rules"),
      api.get("/hr-config/country-rules"),
      api.get("/hr-config/leave-types"),
      api.get("/hr-config/integration-settings"),
    ]);
    response.workflowRules = workflow.data ?? [];
    response.countryRules = country.data ?? [];
    response.leaveTypes = leaveTypes.data ?? [];
    response.integration = integration.data ?? {};
    return response;
  }
}

export async function getExceptionalLeaves(countryCode) {
  const country = String(countryCode || "TN").toUpperCase();
  const { data } = await api.get("/hr-config/exceptional-leaves", {
    params: { country },
  });
  return Array.isArray(data) ? data : [];
}

export async function createExceptionalLeave(payload) {
  const { data } = await api.post("/hr-config/exceptional-leaves", payload);
  return data;
}

export async function updateExceptionalLeave(id, payload) {
  const { data } = await api.put(`/hr-config/exceptional-leaves/${id}`, payload);
  return data;
}

export async function getPublicHolidays(countryCode, year) {
  const { data } = await api.get("/hr-config/public-holidays", {
    params: {
      country: String(countryCode || "TN").toUpperCase(),
      year: Number(year),
    },
  });
  return Array.isArray(data) ? data : [];
}

export async function importPublicHolidays(countryCode, year) {
  // Corps JSON minimal : axios envoie par défaut Content-Type application/json ; un corps vide + ce header peut provoquer un 400 côté Spring.
  const { data } = await api.post("/hr-config/public-holidays/import", {}, {
    params: {
      country: String(countryCode || "TN").toUpperCase(),
      year: Number(year),
    },
  });
  return data;
}

/** Synchronise les jours fériés officiels (Nager + repli) pour tous les pays RH (TN, FR, MA). */
export async function importPublicHolidaysAllCountries(year) {
  const { data } = await api.post("/hr-config/public-holidays/import-all", {}, {
    params: { year: Number(year) },
  });
  return data;
}

export async function createPublicHoliday(payload) {
  const { data } = await api.post("/hr-config/public-holidays", payload);
  return data;
}

export async function applyPublicHoliday(id, applied) {
  const { data } = await api.put(`/hr-config/public-holidays/${id}/apply`, {}, {
    params: { applied: Boolean(applied) },
  });
  return data;
}

export async function deletePublicHoliday(id) {
  const { data } = await api.delete(`/hr-config/public-holidays/${id}`);
  return data;
}

export async function getWorkSchedules(countryCode, scheduleType = "NORMAL") {
  const { data } = await api.get("/hr-config/work-schedules", {
    params: {
      country: String(countryCode || "TN").toUpperCase(),
      type: scheduleType,
    },
  });
  return data ?? {};
}

export async function saveWorkSchedules(payload) {
  const { data } = await api.put("/hr-config/work-schedules", payload);
  return data;
}

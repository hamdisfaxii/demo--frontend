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

const normalizeStatus = (raw) => {
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
};

const mapMockToRequest = (row) => ({
  id: row.id,
  typeConge: row.typeConge,
  statut: normalizeStatus(row.statut),
  rawStatus: row.statut,
  dateDebut: row.dateDebut,
  dateFin: row.dateFin,
  nombreJours: row.nombreJours,
  motif: row.raison ?? row.motif ?? "",
  commentaireRh: row.commentaireRh ?? "",
  dateSoumission: row.dateCreation ?? row.dateSoumission ?? null,
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

export async function getHrStats() {
  try {
    // Compatible with both Spring backend and current mock backend.
    const { data } = await api.get("/rh/dashboard");
    const statsMap = data?.statistiques ?? data?.demandesParStatut ?? {};
    const pending = Number(
      data?.pending ??
        statsMap?.en_attente ??
        statsMap?.EN_ATTENTE ??
        0,
    );
    const approved = Number(
      data?.approved ??
        statsMap?.approuvees ??
        statsMap?.ACCEPTE ??
        0,
    );
    const rejected = Number(
      data?.rejected ??
        statsMap?.rejetees ??
        statsMap?.REFUSE ??
        0,
    );
    return {
      pending,
      approved,
      rejected,
      total: Number(data?.total ?? pending + approved + rejected),
    };
  } catch (e) {
    if (e?.response?.status !== 404) {
      throw e;
    }
    // Fallback for future backend variants.
    const { data } = await api.get("/hr/requests/stats");
    return {
      pending: Number(data?.pending ?? 0),
      approved: Number(data?.approved ?? 0),
      rejected: Number(data?.rejected ?? 0),
      total: Number(data?.total ?? 0),
    };
  }
}

export async function getHrRequests(filters = {}) {
  const mockFirst = isMockSession();

  if (mockFirst) {
    try {
      const { data } = await api.get("/rh/demandes-en-attente");
      const rows = Array.isArray(data?.demandes) ? data.demandes.map(mapMockToRequest) : [];
      return filterRows(rows, filters);
    } catch (e) {
      if (e?.response?.status !== 404) throw e;
    }
  }

  try {
    const params = {};
    if (filters.status && filters.status !== "ALL") params.status = filters.status;
    if (filters.employee) params.employee = filters.employee;
    if (filters.country) params.country = filters.country;
    if (filters.department) params.department = filters.department;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const { data } = await api.get("/rh/requests", { params });
    const list = data?.requests ?? data ?? [];
    return Array.isArray(list) ? list.map(mapMockToRequest) : [];
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
  }

  try {
    const params = {};
    if (filters.employee) params.employee = filters.employee;
    if (filters.country) params.country = filters.country;
    if (filters.department) params.department = filters.department;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const { data } = await api.get("/hr/requests/pending", { params });
    return Array.isArray(data) ? data.map(mapMockToRequest) : [];
  } catch (e) {
    const { data } = await api.get("/rh/demandes-en-attente");
    const rows = Array.isArray(data?.demandes) ? data.demandes.map(mapMockToRequest) : [];
    return filterRows(rows, filters);
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
  } catch (e) {
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

export async function getCalendarEvents(filters = {}) {
  try {
    const params = {};
    if (filters.employeeId) params.employeeId = filters.employeeId;
    if (filters.department) params.department = filters.department;
    if (filters.country) params.country = filters.country;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const { data } = await api.get("/calendar/events", { params });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    const params = {};
    if (filters.employeeId) params.employeeId = filters.employeeId;
    if (filters.department) params.department = filters.department;
    if (filters.country) params.country = filters.country;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const { data } = await api.get("/calendar/events", { params });
    return Array.isArray(data) ? data : [];
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
  const { data } = await api.post("/hr-config/public-holidays/import", null, {
    params: {
      country: String(countryCode || "TN").toUpperCase(),
      year: Number(year),
    },
  });
  return data;
}

export async function createPublicHoliday(payload) {
  const { data } = await api.post("/hr-config/public-holidays", payload);
  return data;
}

export async function applyPublicHoliday(id, applied) {
  const { data } = await api.put(`/hr-config/public-holidays/${id}/apply`, null, {
    params: { applied: Boolean(applied) },
  });
  return data;
}

export async function deletePublicHoliday(id) {
  const { data } = await api.delete(`/hr-config/public-holidays/${id}`);
  return data;
}

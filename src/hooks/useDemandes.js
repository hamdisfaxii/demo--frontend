import { useCallback, useMemo, useState } from "react";
import api from "../utils/api";

const normalizeStatut = (statut) => {
  if (!statut || statut === "tous") return undefined;
  const normalized = String(statut)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  // Harmonise quelques variantes.
  if (normalized === "en_attente") return "attente";
  if (normalized === "enattente") return "attente";
  if (normalized === "attente") return "attente";
  if (normalized === "validee") return "validee";
  if (normalized === "accordee") return "validee";
  if (normalized === "refusee") return "refusée";
  if (normalized === "refuse") return "refusée";
  if (normalized === "annulee") return "annulée";
  if (normalized === "annule") return "annulée";
  return statut;
};

const stripAccent = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/** True si la demande chevauche l’année civile (aligné backend). */
const demandeCroiseAnnee = (d, annee) => {
  if (annee == null || annee === "" || String(annee) === "tous") return true;
  const y = Number(annee);
  if (!Number.isFinite(y)) return true;
  const deb = String(d?.dateDebut ?? d?.debut ?? "").slice(0, 10);
  const fin = String(d?.dateFin ?? d?.fin ?? "").slice(0, 10);
  if (!deb || !fin) return false;
  const ys = `${y}-01-01`;
  const ye = `${y}-12-31`;
  return deb <= ye && fin >= ys;
};

/**
 * Filtre côté client pour le mock (même règles que /conge/liste côté Spring).
 */
const filtreListeDemandesLocale = (list, filters = {}) => {
  let out = Array.isArray(list) ? [...list] : [];
  const { annee, statut } = filters;
  if (annee != null && annee !== "" && String(annee) !== "tous") {
    out = out.filter((d) => demandeCroiseAnnee(d, annee));
  }
  if (!statut || statut === "tous") return out;

  const wanted = normalizeStatut(statut);
  if (!wanted) return out;

  const su = stripAccent(String(wanted)).toLowerCase().replace(/\s+/g, "_");

  return out.filter((d) => {
    const raw = stripAccent(String(d?.statut ?? d?.status ?? ""))
      .toLowerCase()
      .replace(/\s+/g, "_");
    const u = raw.toUpperCase();
    if (su === "attente") {
      return u.includes("ATTENTE") || u.includes("PENDING") || raw.includes("en_attente");
    }
    if (su === "validee") {
      return (
        u.includes("ACCEPTE") ||
        u.includes("APPROUVE") ||
        u.includes("APPROVED") ||
        raw.includes("valid") ||
        raw.includes("accord")
      );
    }
    if (su === "refusee") {
      return u.includes("REFUS") || u.includes("REJECT");
    }
    if (su === "annulee") {
      return u.includes("ANNU") || raw.includes("cancel");
    }
    return true;
  });
};

const pickId = (demande) => demande?.id ?? demande?._id ?? demande?.ID;

const mapTitreToTypeCode = (titre) => {
  const normalized = String(titre ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalized.includes("enfant")) return "ENFANT_MALADE";
  if (normalized.includes("maladie")) return "MALADIE";
  if (normalized.includes("sans solde")) return "SANS_SOLDE";
  if (normalized.includes("parent")) return "PARENTAL";
  if (normalized.includes("retard")) return "RETARD";
  if (normalized.includes("courte")) return "COURTE_DUREE";
  if (normalized.includes("permission") || normalized.includes("sortie")) {
    return "COURTE_DUREE";
  }
  return "PAYE";
};

const mapTitreToMockTypeCode = (titre) => {
  const typeCode = mapTitreToTypeCode(titre);
  if (typeCode === "MALADIE") return "CONGE_MALADIE";
  if (typeCode === "SANS_SOLDE") return "CONGE_SANS_SOLDE";
  if (typeCode === "RETARD") return "RETARD_DEMAND";
  /* Registre mock (France uniquement). */
  if (typeCode === "COURTE_DUREE") return "SORTIE_COURTE";
  if (typeCode === "PARENTAL") return "PARENTAL";
  if (typeCode === "ENFANT_MALADE") return "ENFANT_MALADE";
  return "CONGES_PAYES";
};

/** Corps POST /api/demande (mock) aligné sur les règles métier (retard, sortie 2 h, congé payé). */
function buildMockCreerDemandePayload(data, mockUid) {
  const isSortie = data?.type === "sortie";
  const isRetard = data?.type === "retard";
  if (isRetard) {
    const dateJour = data?.date ?? data?.dateDebut;
    const ha = data?.heureArrivee ?? null;
    return {
      userId: mockUid,
      typeConge: "RETARD_DEMAND",
      dateDebut: dateJour,
      dateFin: dateJour,
      nombreJours: 0,
      heureArrivee: ha,
      heureDebut: ha,
      heureFin: null,
      raison: data?.commentaire ?? data?.motif ?? "",
    };
  }
  const titre = isSortie
    ? "Permission courte durée"
    : data?.titre ?? data?.typeConge ?? "Congé payé";
  const dateDebut = isSortie
    ? data?.dateDebut ?? data?.dateSortie
    : data?.dateDebut;
  const dateFin = isSortie
    ? data?.dateFin ?? data?.dateSortie
    : data?.dateFin;
  return {
    userId: mockUid,
    typeConge: mapTitreToMockTypeCode(titre),
    dateDebut,
    dateFin,
    heureDebut: data?.heureDebut ?? null,
    heureFin: data?.heureFin ?? null,
    raison: data?.commentaire ?? data?.motif ?? "",
  };
}

const extractMockUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  // Mock token format: token_<userId>_...
  const parts = token.split("_");
  const id = Number(parts[1]);
  return Number.isFinite(id) ? id : null;
};

/** Identifiant pour le mock : token token_N_… ou objet user en localStorage. */
const resolveMockUserIdForDemande = () => {
  const fromToken = extractMockUserIdFromToken();
  if (fromToken != null && Number.isFinite(fromToken)) return fromToken;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const id = Number(u?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
};

const isMockSession = () => {
  const token = localStorage.getItem("token") || "";
  return token.startsWith("token_");
};

const normalizeMockDemande = (row) => ({
  id: row?.id,
  dateDebut: row?.dateDebut,
  dateFin: row?.dateFin,
  nombreJours: row?.nombreJours,
  typeConge: row?.typeConge,
  type: row?.typeConge,
  titre: row?.typeConge,
  motif: row?.raison ?? row?.motif ?? "",
  statut: row?.statut ?? "EN_ATTENTE",
  dateSoumission: row?.dateCreation ?? null,
});

/** Réponse enrichie `/conge/solde` mock ; fallback nombre seul ou Spring minimal. */
export function buildSoldeSummary(payload) {
  if (payload === null || payload === undefined)
    return {
      congesPayes: 0,
      permission: 0,
      maladie: 0,
      maladieQuotaReference: null,
      maladieNonDecompte: true,
      maladieMessage:
        "Congé maladie : suivi hors quota décompté dans l’application selon vos règles RH.",
      hintCongesPayes: "",
      details: [],
      soldeTotalTousTypes: null,
      autorisationsCourtesMoisMaximum: null,
      autorisationsCourtesMoisUtilisees: null,
      autorisationsCourtesMoisAcceptees: null,
      autorisationsCourtesMoisRestantes: null,
      franceRtt: null,
    };
  if (typeof payload !== "object" || Array.isArray(payload)) {
    const n = Number(payload);
    return {
      congesPayes: Number.isFinite(n) ? Math.max(0, n) : 0,
      permission: 0,
      maladie: 0,
      maladieQuotaReference: null,
      maladieNonDecompte: true,
      maladieMessage: "",
      hintCongesPayes: "",
      details: [],
      soldeTotalTousTypes: null,
      autorisationsCourtesMoisMaximum: null,
      autorisationsCourtesMoisUtilisees: null,
      autorisationsCourtesMoisAcceptees: null,
      autorisationsCourtesMoisRestantes: null,
      franceRtt: null,
    };
  }
  const data = payload;
  const pickJoursDetails = (details, typeEnum) => {
    if (!Array.isArray(details)) return null;
    const row = details.find((d) => d && String(d.typeConge) === typeEnum);
    if (!row || row.joursRestants == null || row.joursRestants === "") return null;
    const n = Number(row.joursRestants);
    return Number.isFinite(n) ? Math.max(0, n) : null;
  };
  const cp = Number(
    data.soldeCongesPayes ??
      pickJoursDetails(data.details, "PAYE") ??
      data.solde ??
      data.reste ??
      0,
  );
  const rawFrRem = data.franceRtt != null ? Number(data.franceRtt.rtt_remaining) : NaN;
  const perm = Number.isFinite(rawFrRem)
    ? Math.max(0, rawFrRem)
    : Number(
        data.soldeCourteDureeExact ??
          data.soldeCourteDuree ??
          data.soldePermission ??
          pickJoursDetails(data.details, "COURTE_DUREE") ??
          0,
      );
  let maladieNum = 0;
  if (data.soldeMaladie != null && data.soldeMaladie !== "") {
    const nMal = Number(data.soldeMaladie);
    maladieNum = Number.isFinite(nMal) ? Math.max(0, nMal) : 0;
  } else {
    const picked = pickJoursDetails(data.details, "MALADIE");
    maladieNum =
      picked != null && Number.isFinite(Number(picked)) ? Math.max(0, Number(picked)) : 0;
  }
  const malQuotaRef =
    data.maladieQuotaReference != null && data.maladieQuotaReference !== ""
      ? Number(data.maladieQuotaReference)
      : null;
  const maladieNonDecompte =
    typeof data.maladieNonDecompte === "boolean"
      ? data.maladieNonDecompte
      : Number.isFinite(malQuotaRef)
        ? malQuotaRef <= 0
        : false;
  const msgApi =
    typeof data.messageMaladie === "string" ? data.messageMaladie.trim() : "";
  const maladieMessage =
    msgApi ||
    (maladieNonDecompte
      ? "Congé maladie défini hors quota : il ne diminue pas vos congés payés."
      : "");
  const hintCongesPayes =
    typeof data.hintCongesPayes === "string"
      ? data.hintCongesPayes
      : "";

  let soldeTotalTousTypes =
    data.soldeTotalTousTypes != null ? Number(data.soldeTotalTousTypes) : null;
  if (!Number.isFinite(soldeTotalTousTypes)) soldeTotalTousTypes = null;

  const authMaxRaw = data.autorisationsCourtesMoisMaximum;
  const authMaxNum =
    authMaxRaw != null && authMaxRaw !== "" && Number.isFinite(Number(authMaxRaw))
      ? Math.max(0, Number(authMaxRaw))
      : null;
  const authUtil = Number(data.autorisationsCourtesMoisUtilisees);
  const authAcc = Number(data.autorisationsCourtesMoisAcceptees);
  const authRest = Number(data.autorisationsCourtesMoisRestantes);

  const franceRtt =
    data.franceRtt && typeof data.franceRtt === "object" && !Array.isArray(data.franceRtt)
      ? {
          total: Number(data.franceRtt.rtt_total),
          used: Number(data.franceRtt.rtt_used),
          remaining: Number(data.franceRtt.rtt_remaining),
          pending: Number(data.franceRtt.rtt_pending),
          accrualMode: data.franceRtt.rtt_accrual_mode,
          contractSuspended: Boolean(data.franceRtt.contract_suspended),
          lastUpdate: data.franceRtt.last_rtt_update,
        }
      : null;

  return {
    congesPayes: Number.isFinite(cp) ? Math.max(0, cp) : 0,
    permission: Number.isFinite(perm) ? Math.max(0, perm) : 0,
    maladie: maladieNum,
    maladieQuotaReference:
      malQuotaRef !== null && Number.isFinite(malQuotaRef) ? malQuotaRef : undefined,
    maladieNonDecompte,
    maladieMessage,
    hintCongesPayes,
    details: Array.isArray(data.details) ? data.details : [],
    soldeTotalTousTypes,
    autorisationsCourtesMoisMaximum: authMaxNum,
    autorisationsCourtesMoisUtilisees: Number.isFinite(authUtil) ? Math.max(0, authUtil) : null,
    autorisationsCourtesMoisAcceptees: Number.isFinite(authAcc) ? Math.max(0, authAcc) : null,
    autorisationsCourtesMoisRestantes: Number.isFinite(authRest) ? Math.max(0, authRest) : null,
    franceRtt,
  };
}

export default function useDemandes() {
  const [demandes, setDemandes] = useState([]);
  const [solde, setSolde] = useState(null);
  const [soldeSummary, setSoldeSummary] = useState(null);
  const [demandeDetail, setDemandeDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSolde = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/conge/solde");
      const raw = response.data;
      const summary = buildSoldeSummary(raw);
      setSoldeSummary(summary);
      setSolde(summary.congesPayes);
      return summary;
    } catch (e) {
      setSoldeSummary(null);
      setSolde(null);
      setError("Impossible de récupérer le solde.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  // filtre 
  const fetchDemandes = useCallback(async (filters = {}) => {
    setLoading(true);
    setError("");
    const mockFirst = isMockSession();
    if (mockFirst) {
      try {
        const userId = resolveMockUserIdForDemande();
        if (!userId) {
          setDemandes([]);
          return [];
        }
        const response = await api.get(`/demande/user/${userId}`);
        let list = Array.isArray(response.data?.demandes) ? response.data.demandes : [];
        list = list.map(normalizeMockDemande);
        list = filtreListeDemandesLocale(list, filters);

        setDemandes(list);
        return list;
      } catch (fallbackError) {
        setError("Impossible de récupérer la liste des demandes.");
        throw fallbackError;
      } finally {
        setLoading(false);
      }
    }

    try {
      const { annee, statut } = filters;
      const params = {};
      if (annee && annee !== "tous") params.annee = annee;

      if (statut && statut !== "tous") {
        params.statut = normalizeStatut(statut);
      }

      const response = await api.get("/conge/liste", { params });
      const list = response.data?.demandes ?? response.data?.data ?? response.data ?? [];
      const safeList = Array.isArray(list) ? list : [];
      setDemandes(safeList);
      return safeList;
    } catch (e) {
      if (e?.response?.status === 404) {
        try {
          const userId = resolveMockUserIdForDemande();
          if (!userId) {
            setDemandes([]);
            return [];
          }
          const response = await api.get(`/demande/user/${userId}`);
          let list = Array.isArray(response.data?.demandes) ? response.data.demandes : [];
          list = list.map(normalizeMockDemande);
          list = filtreListeDemandesLocale(list, filters);

          setDemandes(list);
          return list;
        } catch (fallbackError) {
          setError("Impossible de récupérer la liste des demandes.");
          throw fallbackError;
        }
      }
      setError("Impossible de récupérer la liste des demandes.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
// Récupère le détail d'une demande par son ID.
  const fetchDemandeById = useCallback(async (id) => {
    setLoading(true);
    setError("");
    const mockFirst = isMockSession();
    if (mockFirst) {
      try {
        const response = await api.get(`/demande/${id}`);
        const data = normalizeMockDemande(response.data ?? {});
        setDemandeDetail(data);
        return data;
      } catch (fallbackError) {
        setError("Impossible de récupérer le détail de la demande.");
        throw fallbackError;
      } finally {
        setLoading(false);
      }
    }

    try {
      const response = await api.get(`/conge/${id}`);
      setDemandeDetail(response.data ?? null);
      return response.data;
    } catch (e) {
      if (e?.response?.status === 404) {
        try {
          const response = await api.get(`/demande/${id}`);
          const data = normalizeMockDemande(response.data ?? {});
          setDemandeDetail(data);
          return data;
        } catch (fallbackError) {
          setError("Impossible de récupérer le détail de la demande.");
          throw fallbackError;
        }
      }
      setError("Impossible de récupérer le détail de la demande.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const creerDemande = useCallback(async (data) => {
    setLoading(true);
    setError("");
    const mockFirst = isMockSession();
    if (mockFirst) {
      try {
        const mockUid = resolveMockUserIdForDemande();
        if (mockUid == null) {
          const msg = "Session incompatible avec le mock : reconnectez-vous.";
          setError(msg);
          throw new Error(msg);
        }
        const mockPayload = buildMockCreerDemandePayload(data, mockUid);
        const fallback = await api.post("/demande", mockPayload);
        return fallback.data?.demande ?? fallback.data;
      } catch (fallbackError) {
        setError(
          fallbackError?.response?.data?.error ||
            "Impossible de créer la demande.",
        );
        throw fallbackError;
      } finally {
        setLoading(false);
      }
    }

    try {
      const isSortie = data?.type === "sortie";
      const isRetard = data?.type === "retard";
      const titre = isSortie
        ? "Sortie courte durée"
        : isRetard
          ? "J'arrive en retard"
          : data?.titre ?? data?.typeConge ?? "Congé payé";
      const commentaire = data?.commentaire ?? data?.motif ?? "";
      const dateDebut = isSortie
        ? data?.dateDebut ?? data?.dateSortie
        : isRetard
          ? data?.date ?? data?.dateDebut
          : data?.dateDebut;
      const dateFin = isSortie
        ? data?.dateFin ?? data?.dateSortie
        : isRetard
          ? data?.date ?? data?.dateDebut
          : data?.dateFin;

      const corePayload = {
        titre,
        dateDebut,
        dateFin,
        commentaire,
        heureDebut: isRetard
          ? data?.heureArrivee ?? null
          : data?.heureDebut ?? null,
        heureFin: data?.heureFin ?? null,
        startHalfDay: data?.startHalfDay ?? null,
        endHalfDay: data?.endHalfDay ?? null,
        demandeSortieCourte: Boolean(isSortie),
        approvedByAdminId: data?.approvedByAdminId ?? data?.approuveParId ?? null,
        exceptionalLeaveConfigId: data?.exceptionalLeaveConfigId ?? null,
      };

      // Primary path: Spring backend endpoint.
      const response = await api.post("/conge", corePayload);
      return response.data?.demande ?? response.data;
    } catch (e) {
      // Compatibility fallback when mock backend is running.
      if (e?.response?.status === 404) {
        const mockUidFb = resolveMockUserIdForDemande();
        if (mockUidFb == null) {
          const msg = "Session incompatible avec le mock : reconnectez-vous.";
          setError(msg);
          throw new Error(msg);
        }
        const mockPayload = buildMockCreerDemandePayload(data, mockUidFb);
        try {
          const fallback = await api.post("/demande", mockPayload);
          return fallback.data?.demande ?? fallback.data;
        } catch (fallbackError) {
          setError(
            fallbackError?.response?.data?.error ||
              "Impossible de créer la demande.",
          );
          throw fallbackError;
        }
      }
      const msg =
        e?.response?.data?.message ??
        e?.response?.data?.error ??
        (typeof e?.response?.data === "string" ? e.response.data : null);
      setError(msg || "Impossible de créer la demande.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const annulerDemande = useCallback(async (id) => {
    setLoading(true);
    setError("");
    const mockFirst = isMockSession();
    if (mockFirst) {
      try {
        const response = await api.post(`/demande/${id}/annuler`);
        return response.data;
      } catch (fallbackError) {
        setError("Impossible d'annuler la demande.");
        throw fallbackError;
      } finally {
        setLoading(false);
      }
    }

    try {
      // Le backend doit vérifier que l'annulation est autorisée.
      const response = await api.delete(`/conge/${id}`);
      return response.data;
    } catch (e) {
      if (e?.response?.status === 404) {
        try {
          const response = await api.post(`/demande/${id}/annuler`);
          return response.data;
        } catch (fallbackError) {
          setError("Impossible d'annuler la demande.");
          throw fallbackError;
        }
      }
      setError("Impossible d'annuler la demande.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const apiState = useMemo(
    () => ({
      demandes,
      solde,
      soldeSummary,
      demandeDetail,
      loading,
      error,
      fetchSolde,
      fetchDemandes,
      fetchDemandeById,
      creerDemande,
      annulerDemande,
      pickId,
    }),
    [
      demandes,
      solde,
      soldeSummary,
      demandeDetail,
      loading,
      error,
      fetchSolde,
      fetchDemandes,
      fetchDemandeById,
      creerDemande,
      annulerDemande,
    ],
  );

  return apiState;
}


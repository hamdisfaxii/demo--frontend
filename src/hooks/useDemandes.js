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
  if (typeCode === "COURTE_DUREE") return "RTT";
  if (typeCode === "PARENTAL") return "PARENTAL";
  if (typeCode === "ENFANT_MALADE") return "ENFANT_MALADE";
  return "CONGES_PAYES";
};

const extractMockUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  // Mock token format: token_<userId>_...
  const parts = token.split("_");
  const id = Number(parts[1]);
  return Number.isFinite(id) ? id : null;
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
      maladie: null,
      maladieNonDecompte: true,
      maladieMessage:
        "Congé maladie défini hors quota : il ne diminue ni vos congés payés ni vos permissions courte durée.",
      hintCongesPayes: "",
      details: [],
      soldeTotalTousTypes: null,
    };
  if (typeof payload !== "object" || Array.isArray(payload)) {
    const n = Number(payload);
    return {
      congesPayes: Number.isFinite(n) ? Math.max(0, n) : 0,
      permission: 0,
      maladie: null,
      maladieNonDecompte: true,
      maladieMessage: "",
      hintCongesPayes: "",
      details: [],
      soldeTotalTousTypes: null,
    };
  }
  const data = payload;
  const cp = Number(data.soldeCongesPayes ?? data.solde ?? data.reste ?? 0);
  const perm = Number(data.soldeCourteDuree ?? data.soldePermission ?? 0);
  let maladieNum = null;
  if (data.soldeMaladie != null && data.soldeMaladie !== "") {
    maladieNum = Number(data.soldeMaladie);
    if (!Number.isFinite(maladieNum)) maladieNum = null;
  }
  const maladieNonDecompte =
    typeof data.maladieNonDecompte === "boolean"
      ? data.maladieNonDecompte
      : maladieNum === null || maladieNum === undefined;
  const msgApi =
    typeof data.messageMaladie === "string" ? data.messageMaladie.trim() : "";
  const maladieMessage =
    msgApi ||
    (maladieNonDecompte
      ? "Congé maladie défini hors quota : il ne diminue ni vos congés payés ni vos permissions courte durée (RTT)."
      : "");
  const hintCongesPayes =
    typeof data.hintCongesPayes === "string"
      ? data.hintCongesPayes
      : "";

  let soldeTotalTousTypes =
    data.soldeTotalTousTypes != null ? Number(data.soldeTotalTousTypes) : null;
  if (!Number.isFinite(soldeTotalTousTypes)) soldeTotalTousTypes = null;

  return {
    congesPayes: Number.isFinite(cp) ? Math.max(0, cp) : 0,
    permission: Number.isFinite(perm) ? Math.max(0, perm) : 0,
    maladie: maladieNum,
    maladieNonDecompte,
    maladieMessage,
    hintCongesPayes,
    details: Array.isArray(data.details) ? data.details : [],
    soldeTotalTousTypes,
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
        const userId = extractMockUserIdFromToken();
        if (!userId) {
          setDemandes([]);
          return [];
        }
        const response = await api.get(`/demande/user/${userId}`);
        let list = Array.isArray(response.data?.demandes) ? response.data.demandes : [];
        list = list.map(normalizeMockDemande);

        if (filters?.statut && filters.statut !== "tous") {
          const wanted = normalizeStatut(filters.statut);
          if (wanted === "attente") {
            list = list.filter((d) =>
              String(d.statut ?? "")
                .toUpperCase()
                .includes("ATTENTE"),
            );
          }
        }

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
          const userId = extractMockUserIdFromToken();
          if (!userId) {
            setDemandes([]);
            return [];
          }
          const response = await api.get(`/demande/user/${userId}`);
          let list = Array.isArray(response.data?.demandes) ? response.data.demandes : [];
          list = list.map(normalizeMockDemande);

          if (filters?.statut && filters.statut !== "tous") {
            const wanted = normalizeStatut(filters.statut);
            if (wanted === "attente") {
              list = list.filter((d) =>
                String(d.statut ?? "")
                  .toUpperCase()
                  .includes("ATTENTE"),
              );
            }
          }

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
        const isSortie = data?.type === "sortie";
        const titre = isSortie
          ? "Permission courte durée"
          : data?.titre ?? data?.typeConge ?? "Congé payé";
        const dateDebut = isSortie ? data?.dateSortie : data?.dateDebut;
        const dateFin = isSortie ? data?.dateSortie : data?.dateFin;
        const mockPayload = {
          userId: extractMockUserIdFromToken(),
          typeConge: mapTitreToMockTypeCode(titre),
          dateDebut,
          dateFin,
          heureDebut: data?.heureDebut ?? null,
          heureFin: data?.heureFin ?? null,
          raison: data?.commentaire ?? data?.motif ?? "",
        };
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
      const titre = isSortie
        ? "Permission courte durée"
        : data?.titre ?? data?.typeConge ?? "Congé payé";
      const commentaire = data?.commentaire ?? data?.motif ?? "";
      const dateDebut = isSortie ? data?.dateSortie : data?.dateDebut;
      const dateFin = isSortie ? data?.dateSortie : data?.dateFin;

      const corePayload = {
        titre,
        dateDebut,
        dateFin,
        commentaire,
        heureDebut: data?.heureDebut ?? null,
        heureFin: data?.heureFin ?? null,
        typeConge: mapTitreToTypeCode(titre),
        motif: commentaire,
      };

      // Primary path: Spring backend endpoint.
      const response = await api.post("/conge", corePayload);
      return response.data?.demande ?? response.data;
    } catch (e) {
      // Compatibility fallback when mock backend is running.
      if (e?.response?.status === 404) {
        const isSortie = data?.type === "sortie";
        const titre = isSortie
          ? "Permission courte durée"
          : data?.titre ?? data?.typeConge ?? "Congé payé";
        const dateDebut = isSortie ? data?.dateSortie : data?.dateDebut;
        const dateFin = isSortie ? data?.dateSortie : data?.dateFin;
        const mockPayload = {
          userId: extractMockUserIdFromToken(),
          typeConge: mapTitreToMockTypeCode(titre),
          dateDebut,
          dateFin,
          heureDebut: data?.heureDebut ?? null,
          heureFin: data?.heureFin ?? null,
          raison: data?.commentaire ?? data?.motif ?? "",
        };
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
      setError(e?.response?.data?.error || "Impossible de créer la demande.");
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


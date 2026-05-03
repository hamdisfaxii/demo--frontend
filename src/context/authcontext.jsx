/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from "react";
import { loginAPI, getCurrentUserAPI } from "../utils/auth";
import { normalizeCountryIsoForHr } from "../utils/country";

// ============================================
// 1. Création du contexte (le panneau d'affichage)
// ============================================

const AuthContext = createContext();

// Normalise les rôles renvoyés par le backend vers des valeurs canoniques.
// Sprint 1 attend : "Employé" / "Responsable RH".
const normalizeRole = (rawRole) => {
  const role = String(rawRole ?? "")
    .trim()
    .toLowerCase();
  if (!role) return "UNKNOWN";

  // Enlève les accents pour gérer "Employé".
  const roleNoDiacritics = role.normalize("NFD").replace(/\p{Diacritic}/gu, "");

  if (
    roleNoDiacritics.includes("employee") ||
    roleNoDiacritics.includes("employe")
  ) {
    return "EMPLOYEE";
  }

  // Selon les backends, "Responsable RH" peut être codé en admin / rh / manager.
  if (
    roleNoDiacritics.includes("rh") ||
    roleNoDiacritics.includes("responsable") ||
    roleNoDiacritics.includes("responsable_rh") ||
    roleNoDiacritics.includes("responsable-rh") ||
    roleNoDiacritics.includes("manager") ||
    roleNoDiacritics.includes("admin")
  ) {
    return "RH";
  }

  // Fallback: on garde une forme canonique non vide.
  return roleNoDiacritics.toUpperCase();
};

const getHomePathForRole = (rawRole) => {
  const role = normalizeRole(rawRole);
  if (role === "EMPLOYEE") return "/employee/dashboard";
  if (role === "RH") return "/rh/dashboard";
  // Si le rôle n'est pas reconnu, on ne donne pas d'accès.
  return "/login";
};

const normalizeCountry = (rawCountry) => normalizeCountryIsoForHr(rawCountry);

// ============================================
// 2. Raccourci useAuth pour utiliser le contexte facilement
// ============================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// ============================================
// 3. Le fournisseur qui donne les infos à toute l'application
// ============================================
export const AuthProvider = ({ children }) => {
  // États : je garde en mémoire qui est connecté
  const [user, setUser] = useState(null); // null = personne n'est connecté
  const [loading, setLoading] = useState(true); // true = je suis en train de charger

  // ==========================================
  // Vérification au démarrage : est-ce que quelqu'un était déjà connecté ?
  // ==========================================
  useEffect(() => {
    const bootstrap = async () => {
      // Je vais chercher dans localStorage (la boîte de rangement du navigateur)
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      // Si j'ai un token ET des infos utilisateur, je restaure instantanément.
      let restoredUser = null;
      if (token && savedUser) {
        try {
          restoredUser = JSON.parse(savedUser);
          // Compat: on normalise si jamais le rôle n'était pas canonique.
          if (
            restoredUser?.role &&
            restoredUser.role !== normalizeRole(restoredUser.role)
          ) {
            restoredUser.role = normalizeRole(restoredUser.role);
          }
          setUser(restoredUser);
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }

      // Puis je valide le token via /auth/me pour sécuriser la session.
      if (token) {
        try {
          const response = await getCurrentUserAPI();
          const data = response.data ?? {};
          const role = data.role ?? data.user?.role;
          const email = data.email ?? data.user?.email;
          const name =
            data.name ?? data.fullName ?? data.user?.fullName ?? data.user?.name;
          const userData = {
            id: data.id ?? data.user?.id ?? restoredUser?.id,
            email: email || restoredUser?.email,
            name: name || email || restoredUser?.email,
            role: normalizeRole(role),
            rawRole: role,
            country: normalizeCountry(data.pays ?? data.country ?? data.user?.pays ?? data.user?.country),
          };
          setUser(userData);
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      }

      setLoading(false);
    };

    bootstrap();
  }, []); // Le [] vide signifie "exécute ce code une seule fois"

  // Réagit à une purge de session (ex: token expiré => 401).
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  // ==========================================
  // Fonction de connexion
  // ==========================================
  const login = async (email, password) => {
    setLoading(true); // Je commence à charger

    try {
      // J'appelle l'API de connexion (depuis auth.js)
      const response = await loginAPI(email, password);

      // Je récupère les données que le backend m'a envoyées
      const data = response.data ?? {};
      const token = data.token;
      const role = data.role ?? data.user?.role;
      const name = data.name ?? data.user?.fullName ?? data.user?.name;
      const emailFromApi = data.email ?? data.user?.email;

      // Je crée un objet utilisateur avec les infos
      const userData = {
        id: data.id ?? data.user?.id,
        email: emailFromApi || email,
        name: name || emailFromApi || email, // Si pas de nom, j'utilise l'email
        role: normalizeRole(role),
        rawRole: role,
        country: normalizeCountry(data.pays ?? data.country ?? data.user?.pays ?? data.user?.country),
      };

      // Je stocke dans localStorage (pour que ça reste après fermeture)
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));

      // Je mets à jour l'état user (React va réafficher tout ce qui utilise useAuth)
      setUser(userData);

      return response.data;
    } finally {
      // Dans tous les cas (succès ou erreur), j'arrête le chargement
      setLoading(false);
    }
  };

  // ==========================================
  // Fonction de déconnexion
  // ==========================================
  const logout = () => {
    // Je supprime le token du localStorage
    // Le localStorage est comme une petite boîte de rangement dans le navigateur
    // Le token est la preuve que l'utilisateur est connecté
    // En le supprimant, l'utilisateur n'est plus authentifié
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Je remets l'état user à null (plus personne de connecté)
    setUser(null);

    // Permet à d'autres écouteurs de réagir.
    window.dispatchEvent(new Event("auth:logout"));
  };

  // ==========================================
  // Variables utiles (calculées automatiquement)
  // ==========================================
  const isAuthenticated = Boolean(user);
  const isEmployee = user?.role === "EMPLOYEE"; // Employé
  const isRH = user?.role === "RH"; // Responsable RH

  // Compat: certains anciens écrans pourraient utiliser isAdmin.
  const isAdmin = isRH;

  const getHomePath = (roleOrRawRole) =>
    getHomePathForRole(roleOrRawRole ?? user?.role);

  const value = {
    user, // L'objet utilisateur { email, name, role }
    loading, // Vrai si on charge, faux sinon
    isAuthenticated,
    isAdmin, // Vrai si admin, faux sinon
    isEmployee, // Vrai si employé, faux sinon
    isRH, // Vrai si Responsable RH, faux sinon
    getHomePath, // Calcule la route home selon le rôle
    login, // Fonction pour se connecter
    logout, // Fonction pour se déconnecter
  };

  // Je retourne le Provider qui donne accès à toutes ces infos
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

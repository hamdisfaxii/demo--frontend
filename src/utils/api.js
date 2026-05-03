import axios from "axios";

// Je crée un livreur personnalisé (une instance axios)
const api = axios.create({
  // Le mock-backend tourne sur :8080 et expose les routes sous /api/*
  baseURL: "http://localhost:8080/api",
  timeout: 10000, // évite des timeouts silencieux trop courts
  headers: { "Content-Type": "application/json" }, // j'envoie du JSON
});

// Intercepteur : ajoute le token sauf sur la connexion (évite d’envoyer un JWT expiré avec le POST login — certains pare-feu / stacks réagissent mal).
api.interceptors.request.use((config) => {
  const path = String(config.url ?? "");
  const isLoginPost =
    path.includes("auth/login") &&
    String(config.method ?? "get").toLowerCase() === "post";
  if (!isLoginPost) {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

// 401 hors tentative de login : session invalide → purge. Un mauvais mot de passe sur /auth/login ne doit pas effacer une session ni déclencher logout global.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const url = String(error.config?.url ?? "");
      if (!url.includes("auth/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
    return Promise.reject(error);
  },
);

export default api;

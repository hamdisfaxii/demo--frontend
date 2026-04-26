import axios from "axios";

// Je crée un livreur personnalisé (une instance axios)
const api = axios.create({
  // Le mock-backend tourne sur :8080 et expose les routes sous /api/*
  baseURL: "http://localhost:8080/api",
  timeout: 10000, // évite des timeouts silencieux trop courts
  headers: { "Content-Type": "application/json" }, // j'envoie du JSON
});

// Intercepteur : ajoute le token automatiquement à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sécurité: si le backend répond 401 (token expiré / invalide),
// on purge la session côté frontend.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Permet aux composants (AuthContext) de réagir.
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  },
);

export default api;

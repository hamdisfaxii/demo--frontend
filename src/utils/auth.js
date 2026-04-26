// Ce fichier contient des fonctions, pas des composants React

import api from "./api";

// export rend la fonction utilisable dans d'autres fichiers
export const loginAPI = (email, password) => {
  // J'envoie une requête POST au backend
  return api.post("/auth/login", {
    email: String(email ?? "").trim(),
    password: password,
  });
  // si oui retourne un token jwt, sinon retourne une erreur
};

// Optionnel : pour vérifier si le token est encore valide au démarrage
export const getCurrentUserAPI = () => {
  // Compat multi-backend: on privilégie /auth/me, sinon fallback /auth/current-user
  return api.get("/auth/me").catch((err) => {
    if (err?.response?.status !== 404) throw err;
    return api.get("/auth/current-user");
  });
};

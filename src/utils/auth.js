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
  // J'envoie une requête GET au backend avec le token (ajouté automatiquement par l'intercepteur)
  return api.get("/auth/current-user");
  // Le backend vérifie le token et renvoie les infos de l'utilisateur
};

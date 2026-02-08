export const MOCK_CHANTIERS = Array.from({ length: 15 }, (_, i) => ({
  id: `ch-${i + 1}`,
  nom: `Chantier ${["A411", "B520", "Total", "Edf", "SNCF"][i % 5]} - Zone ${i + 1}`,
  client: ["TotalEnergies", "EDF", "Vinci", "Bouygues", "Appia"][i % 5],
  statut: i % 3 === 0 ? "Terminé" : "En cours",
  avancement: Math.floor(Math.random() * 100),
  visites: Math.floor(Math.random() * 500),
  materiel: ["Pelles", "Nacelles", "EPI", "Groupes électrogènes", "Compresseurs"][i % 5]
}));

export const MOCK_EQUIPE = Array.from({ length: 15 }, (_, i) => ({
  id: `u-${i + 1}`,
  nom: ["Yasar", "Messal", "Antunez", "Dubois", "Lefebvre", "Moreau"][i % 6],
  prenom: ["Ertugrul", "Farid", "Loic", "Jean", "Pierre", "Marc"][i % 6],
  role: ["Chef de chantier", "Chef d'équipe", "Opérateur", "Sécurité", "Logistique"][i % 5],
  matricule: `ALT-${2026 + i}`,
  photo: `https://ui-avatars.com/api/?name=${i}&background=random`
}));
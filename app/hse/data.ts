// =============================================================================
// REFERENTIEL QHSE & TECHNIQUE - ALTRAD.OS
// Ce fichier centralise toutes les données statiques métiers.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. BIBLIOTHÈQUE DES RISQUES (Générateur Documents / Analyse Risque / PreJob)
// -----------------------------------------------------------------------------
export const RISK_DATABASE = [
  // --- FAMILLE 1 : LOGISTIQUE & ORGANISATION (TCA) ---
  { 
    id: 'TCA-14', 
    category: 'Logistique', 
    task: "Approvisionnement / Préparation chantier", 
    risks: ["Accident de trajet", "Chute d'objet", "Choc/Coup", "Chute de plain-pied", "Incidence musculaire (Manutention)"], 
    measures: ["Respect strict du code de la route", "Véhicule utilitaire en bon état (Vérif niveaux)", "Arrimage correct du matériel", "Respect des techniques de manutention", "Port des EPI obligatoires dès l'arrivée", "Balisage immédiat de la zone de déchargement"] 
  },
  { 
    id: 'TCA-18', 
    category: 'Logistique', 
    task: "Déplacement sur chantier (Piéton/Véhicule)", 
    risks: ["Heurt par engin", "Accident de trajet", "Choc/Coup", "Chute de plain-pied", "Coactivité"], 
    measures: ["Respect des voies de circulation piétons", "Vigilance vis-à-vis de la coactivité", "Port EPI complet", "Interdiction de courir", "Vigilance sol glissant / encombré"] 
  },
  { 
    id: 'TCA-15', 
    category: 'Logistique', 
    task: "Repli et Nettoyage de chantier", 
    risks: ["Inhalation poussières", "Choc/coup", "Chute de plain-pied", "Coupure"], 
    measures: ["Port masque P2/P3 si balayage", "Maintien de l'ordre et la propreté (Au fur et à mesure)", "Tri sélectif des déchets (DIS/DIB)"] 
  },

  // --- FAMILLE 2 : TRAVAUX EN HAUTEUR (ECH) ---
  { 
    id: 'ECH-01', 
    category: 'Hauteur / Echafaudage', 
    task: "Montage / Modification / Démontage échafaudage", 
    risks: ["Chute de hauteur", "Chute d'objet", "Effondrement structure", "Pincement / Ecrasement", "Incidence musculaire"], 
    measures: ["Personnel formé et habilité (Monteur)", "Port du harnais avec enrouleur à rappel automatique et absorbeur", "Longe simple avec absorbeur", "Ceinture de maintien et longes porte-outils", "Balisage strict de la zone", "Contrôle visuel journalier"] 
  },
  { 
    id: 'TCA-09', 
    category: 'Hauteur', 
    task: "Travaux avec Nacelle (PEMP)", 
    risks: ["Chute de hauteur", "Ejection", "Heurt structure", "Renversement"], 
    measures: ["CACES PEMP valide", "Harnais attaché dans le panier (Point ancrage)", "Balisage au sol", "Vérification VGP < 6 mois"] 
  },

  // --- FAMILLE 3 : PEINTURE, TRAITEMENT & REVÊTEMENT (PRS) ---
  { 
    id: 'PRS-01', 
    category: 'Peinture', 
    task: "Malaxage Peinture (PPI / Conteneur / Air libre)", 
    risks: ["Exposition aux COV", "Projection de produits", "Contact cutané avec produits", "Incendie"], 
    measures: ["Demi-masque avec filtre A2 a minima", "Lunettes étanches", "Gants chimiques (Nitrile/Néoprène selon FDS)", "Utilisation bac de rétention"] 
  },
  { 
    id: 'PRS-09', 
    category: 'Peinture', 
    task: "Application Peinture (Airless)", 
    risks: ["Exposition aux vapeurs de peinture", "Contact cutané", "Projection haute pression (Injection)"], 
    measures: ["Masque facial intégral avec cartouches A2", "Combinaison blanche étanche", "Gants chimiques (selon FDS)", "Mise à la terre du matériel", "Films protecteurs sur visière"] 
  },
  { 
    id: 'PRS-10', 
    category: 'Peinture', 
    task: "Application Peinture (Manuelle / Retouches)", 
    risks: ["Coupure (Camouflage)", "Exposition aux vapeurs", "Contact cutané"], 
    measures: ["Gants anti-coupure (Indice 4/5) pour le camouflage", "Cutter rétractable OBLIGATOIRE", "Demi-masque A2", "Produits dans contenants fermés et identifiés"] 
  },
  { 
    id: 'PRS-06', 
    category: 'Décapage', 
    task: "Sablage / Grenaillage (Abrasif) / Lavage HP", 
    risks: ["Projection abrasif violent", "Bruit > 85dB", "Poussière (Plomb)", "Fouettement flexible"], 
    measures: ["Heaume ventilé avec adduction air", "Combinaison sablage", "Câbles de sécurité anti-fouettement", "Balisage hermétique de la zone (Zone Rouge)", "Sas de décontamination si Plomb"] 
  },

  // --- FAMILLE 4 : RISQUES SPÉCIFIQUES & SÛRETÉ (CET) ---
  { 
    id: 'CET-04', 
    category: 'Spécifique', 
    task: "Travaux en capacité confinée (Cuve, Galerie)", 
    risks: ["Anoxie (Manque O2)", "Intoxication gaz", "Explosion"], 
    measures: ["Permis de pénétrer valide", "Surveillant au trou d'homme", "Détecteur 4 gaz étalonné", "Ventilation continue", "Masque auto-sauveteur (Masque d'évacuation)"] 
  },
  { 
    id: 'CET-10', 
    category: 'Spécifique', 
    task: "Travaux en Zone ATEX", 
    risks: ["Explosion", "Incendie", "Electricité statique"], 
    measures: ["Matériel certifié ATEX", "Interdiction téléphone/allumette", "Permis de feu", "Explosimètre permanent", "Vêtements antistatiques"] 
  },
  { 
    id: 'HOT-01', 
    category: 'Points Chauds', 
    task: "Soudure / Meulage / Découpe", 
    risks: ["Incendie / Explosion", "Brûlures", "Fumées de soudage", "Rayonnements UV"], 
    measures: ["Permis de feu", "Extincteur à portée", "Écran facial/Masque soudure", "Bâche anti-feu", "Surveillance post-travail (2h)"] 
  }
];

// -----------------------------------------------------------------------------
// 2. REFERENTIEL DES EPI (Équipements de Protection Individuelle)
// -----------------------------------------------------------------------------
export const EPI_DATABASE = {
  base: [
    "Casque avec jugulaire 4 points",
    "Lunettes de circulation",
    "Vêtement de travail couvrant",
    "Chaussures de sécurité montantes (S3)"
  ],
  specifiques: [
    { nom: "Demi-masque filtre A2", categorie: "Respiratoire", usage: "Peinture manuelle, Malaxage" },
    { nom: "Masque facial intégral (A2P3)", categorie: "Respiratoire", usage: "Peinture Airless, Plomb" },
    { nom: "Masque d'évacuation / Auto-sauveteur", categorie: "Respiratoire", usage: "Espace confiné" },
    { nom: "Heaume ventilé + adduction d'air", categorie: "Respiratoire", usage: "Sablage, Grenaillage" },
    { nom: "Gants chimiques (Nitrile/Néoprène)", categorie: "Mains", usage: "Manipulation FDS dangereuse" },
    { nom: "Gants anti-coupure (Indice D / Niv 4-5)", categorie: "Mains", usage: "Camouflage, Manutention" },
    { nom: "Gants de sablage", categorie: "Mains", usage: "Sablage" },
    { nom: "Harnais de sécurité complet (Modèle NEOFEU)", categorie: "Hauteur", usage: "Nacelle, Echafaudage" },
    { nom: "Longe simple + absorbeur", categorie: "Hauteur", usage: "Déplacement structure" },
    { nom: "Enrouleur à rappel automatique", categorie: "Hauteur", usage: "Poste fixe en hauteur" },
    { nom: "Longes porte-outils", categorie: "Hauteur", usage: "Prévention chute d'objets" },
    { nom: "Combinaison étanche (Tyvek / Blanche)", categorie: "Corps", usage: "Peinture Airless, Plomb" },
    { nom: "Combinaison cuir sablage", categorie: "Corps", usage: "Sablage" },
    { nom: "Détecteur 4 Gaz", categorie: "Spécifique", usage: "ATEX, Confiné" }
  ]
};

// -----------------------------------------------------------------------------
// 3. RÈGLES DE VÉRIFICATION PÉRIODIQUE (Module VGP)
// -----------------------------------------------------------------------------
export const VGP_RULES = {
  "Levage": 6,      // Nacelles, Treuils, Palans, Elingues
  "EPI_Harnais": 12,// Harnais, Longes, Anti-chute, Lignes de vie
  "Electrique": 12, // Armoires, Coffrets, Rallonges
  "Pression": 12,   // Compresseurs, Cuves
  "Echafaudage": 3, // Vérif trimestrielle
  "Extincteur": 12, // Vérification annuelle
  "Vehicule": 12,   // Contrôle technique / Vérif interne
  "Outillage": 12   // Meuleuses, Perceuses, Malaxeurs
};

// -----------------------------------------------------------------------------
// 4. RÉFÉRENTIEL DES ÉVÈNEMENTS & NON-CONFORMITÉS (NC)
// -----------------------------------------------------------------------------
export const NC_REFERENTIAL = {
  types: [
    "NC-RAQ (Règles d’Assurance Qualité)",
    "NC-F (Fournisseur/Fourniture)",
    "NC-MOeP (Mise en Œuvre de nos Prestations)"
  ],
  impacts: [
    "CFSI (Contrefait / Frauduleux / Suspicion d’irrégularité)",
    "Sûreté (AIP/AIS)",
    "Santé - Sécurité",
    "Environnement",
    "Conformité Produit-Prestation",
    "Délai",
    "Financier",
    "Matériels"
  ],
  cotations: [
    "NC Niveau 1 (Mineur)",
    "NC Niveau 2 (Majeur)",
    "NC Critique"
  ]
};

// Critères d'évaluation de fin de prestation (REX)
export const EVALUATION_CRITERIA = {
  surete: ["ESS (Évènement Significatif Sûreté)", "EIS (Évènement Important Sûreté)", "CFSI", "NQM (Non Qualité de Maintenance)"],
  securite: ["AT AA (Accident du Travail Avec Arrêt)", "AT SA (Accident du Travail Sans Arrêt)", "Presque-Accident / Near Miss", "Soins Bénins"],
  radioprotection: ["ESR (Évènement Significatif Radiopro)", "EIR (Évènement Important Radiopro)"],
  environnement: ["ESE (Évènement Significatif Environnement)", "EIE (Évènement Important Environnement)", "Incident Matériel / Fuite"]
};

// -----------------------------------------------------------------------------
// 5. THÈMES CAUSERIES & SENSIBILISATIONS (Module Sécurité)
// -----------------------------------------------------------------------------
export const CAUSERIE_THEMES = [
  "Règles d'or ALTRAD",
  "Maîtrise des risques",
  "Travaux en hauteur & Chutes",
  "Ligne de danger & Balisage",
  "Gestion des véhicules et du trafic (Coactivité)",
  "Levage & Manutention",
  "Travail à chaud (Points chauds)",
  "Equipements de travail & Vérification",
  "Risque Routier & Trajets",
  "Manutention & TMS",
  "Addictions (Alcool / Drogue)",
  "Risque Chimique & Étiquetage",
  "Outillage à main (Cutter sécurisé)",
  "Bruit & Protection auditive",
  "Accueil & Nouveaux embauchés",
  "Ordre, Rangement & Propreté",
  "Espaces Confinés",
  "Droit de retrait & Stop work"
];

// -----------------------------------------------------------------------------
// 6. CHECKLIST ACCUEIL DÉMARRAGE CHANTIER (Sensibilisation)
// -----------------------------------------------------------------------------
export const INDUCTION_CHECKLIST = {
  organisation_qualite: [
    "Organigramme / Répartition des tâches",
    "Travaux à réaliser / limites de la prestation",
    "Consignes de mise en œuvre",
    "Matériel / Matériaux / Produits à utiliser",
    "Contrôles à réaliser / Critères d’acceptation",
    "Documents à renseigner / Traçabilité"
  ],
   surete: [
    "Présentation des IPSN / AIP / AIS",
    "Présentation des risques Sûreté",
    "Risque particulier (AAR, FME, Incendie)"
  ],
  securite_environnement: [
    "Commentaires des PPSPS / PdP / PHSE / PDR",
    "Consignes en cas d’évènements HSE",
    "Consignes sécurité générale et spécif. au site",
    "Travaux, risques et mesures de prévention",
    "Equipements de protections (EPI)"
  ]
};

// -----------------------------------------------------------------------------
// 7. RÉFÉRENTIEL VISITES TERRAIN (Q3SRE / VMT / OST)
// -----------------------------------------------------------------------------
export const Q3SRE_REFERENTIAL = {
  lignes_defense: [
    "Technique (Matériel, EPC, EPI, Conformité échafaudage)",
    "Humaine (Compétence, Vigilance, Comportement, Postures)",
    "Organisationnelle (Procédures, Permis de feu/pénétrer, PPSPS)"
  ],
  themes_observation: [
    "Réaction face au risque",
    "Positions et Ergonomie (TMS)",
    "Port des EPI (Base + Spécifiques)",
    "Outillage et Equipement (VGP à jour)",
    "Ordre et Propreté de la zone de travail",
    "Stockage des produits chimiques (Rétention)",
    "Respect des procédures consignation"
  ]
};
// =============================================================================
// REFERENTIEL HSE & TECHNIQUE - ALTRAD.OS
// Ce fichier centralise toutes les données statiques métiers.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. BIBLIOTHÈQUE DES RISQUES (Générateur Documents)
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
    measures: ["Respect des voies de circulation piétons", "Vigilance vis-à-vis de la coactivité", "Port EPI complet (Casque/Chaussures/Gilet)", "Interdiction de courir", "Vigilance sol glissant / encombré"] 
  },
  { 
    id: 'TCA-17', 
    category: 'Logistique', 
    task: "Chargement / Déchargement manuel", 
    risks: ["Choc/Coup", "Troubles Musculo-Squelettiques (TMS)", "Ecrasement pieds/mains", "Pollution accidentelle"], 
    measures: ["Prise de connaissance du protocole site", "Règle des 3 points d'appuis (montée véhicule)", "Utilisation outils aide manutention (diable, transpal)", "Kit anti-pollution à portée de main", "Gants protection mécanique (EN 388 4542)"] 
  },
  { 
    id: 'TCA-15', 
    category: 'Logistique', 
    task: "Repli et Nettoyage de chantier", 
    risks: ["Inhalation poussières", "Choc/coup", "Chute de plain-pied", "Incidence musculaire", "Coupure"], 
    measures: ["Port masque P2/P3 si balayage", "Matériel maintenu en bon état", "Maintien de l'ordre et la propreté (Au fur et à mesure)", "Tri sélectif des déchets (DIS/DIB)", "Adopter les bons gestes et postures"] 
  },

  // --- FAMILLE 2 : TRAVAUX EN HAUTEUR (ECH) ---
  { 
    id: 'ECH-01', 
    category: 'Hauteur', 
    task: "Montage / Modification échafaudage", 
    risks: ["Chute de hauteur", "Chute d'objet", "Effondrement structure", "Coincement"], 
    measures: ["Personnel formé et habilité (Monteur)", "Port du harnais avec double longe (Point ancrage haut)", "Balisage strict de la zone de montage", "Vérification stabilité du sol d'assise", "Cales de répartition sous pieds", "Contrôle visuel journalier"] 
  },
  { 
    id: 'ECH-02', 
    category: 'Hauteur', 
    task: "Démontage échafaudage", 
    risks: ["Chute de hauteur", "Chute d'objet sur tiers", "Coincement membres", "Lumbago"], 
    measures: ["Zone interdite balisée physiquement", "Descente matériel à la poulie ou chaîne humaine", "Ordre et propreté permanent des plateaux", "Harnais attaché en permanence"] 
  },
  { 
    id: 'TCA-09', 
    category: 'Hauteur', 
    task: "Travaux avec Nacelle (PEMP)", 
    risks: ["Chute de hauteur", "Ejection", "Heurt structure", "Renversement", "Electrocution"], 
    measures: ["CACES PEMP valide et Autorisation conduite", "Harnais attaché dans le panier (Point ancrage)", "Balisage au sol (Zone évolution)", "Vérification VGP < 6 mois", "Présence surveillant au sol"] 
  },
  { 
    id: 'TCA-12', 
    category: 'Hauteur', 
    task: "Travaux à l'échelle / Escabeau", 
    risks: ["Chute de hauteur", "Déséquilibre"], 
    measures: ["Travail ponctuel et court uniquement", "Toujours 3 points d'appui", "Maintien de l'échelle par un tiers", "Echelle attachée en tête si possible", "Interdit comme poste de travail permanent"] 
  },

  // --- FAMILLE 3 : PEINTURE & TRAITEMENT (PRS) ---
  { 
    id: 'PRS-06', 
    category: 'Peinture', 
    task: "Sablage / Grenaillage (Abrasif)", 
    risks: ["Projection abrasif violent", "Bruit > 85dB", "Poussière importante", "Fouettement flexible"], 
    measures: ["Heaume ventilé avec adduction air", "Combinaison sablage cuir/épaisse", "Câbles de sécurité anti-fouettement", "Dispositif Homme mort fonctionnel", "Balisage hermétique de la zone"] 
  },
  { 
    id: 'PRS-09', 
    category: 'Peinture', 
    task: "Application Peinture (Pistolet/Airless)", 
    risks: ["Risque Chimique (Inhalation/Contact)", "Incendie / Explosion", "Projection haute pression (Injection)"], 
    measures: ["Masque cartouche A2P3", "Combinaison chimique étanche", "Extincteur à proximité immédiate", "Mise à la terre du matériel (Pompe)", "Consultation FDS obligatoire"] 
  },
  { 
    id: 'PRS-08', 
    category: 'Peinture', 
    task: "Mélange / Préparation Peinture", 
    risks: ["Emanations COV", "Eclaboussure yeux/peau", "Renversement produit"], 
    measures: ["Local ventilé ou extérieur", "Utilisation bac de rétention", "Lunettes étanches + Gants néoprène/nitrile", "Kit lavage oculaire à proximité immédiate"] 
  },

  // --- FAMILLE 4 : RISQUES SPÉCIFIQUES (CET) ---
  { 
    id: 'CET-04', 
    category: 'Spécifique', 
    task: "Travaux en capacité confinée (Cuve, Galerie)", 
    risks: ["Anoxie (Manque O2)", "Intoxication gaz", "Explosion", "Difficulté évacuation"], 
    measures: ["Permis de pénétrer valide", "Surveillant obligatoire au trou d'homme", "Détecteur 4 gaz étalonné", "Ventilation mécanique continue", "Masque auto-sauveteur au ceinturon"] 
  },
  { 
    id: 'CET-10', 
    category: 'Spécifique', 
    task: "Travaux en Zone ATEX", 
    risks: ["Explosion", "Incendie", "Electricité statique"], 
    measures: ["Matériel certifié ATEX", "Interdiction téléphone/allumette", "Permis de feu", "Explosimètre permanent", "Vêtements antistatiques et coton"] 
  },
  { 
    id: 'TCA-23', 
    category: 'Spécifique', 
    task: "Utilisation outils coupants (Cutter)", 
    risks: ["Coupure grave", "Hémorragie"], 
    measures: ["Utilisation Cutter à lame rétractable OBLIGATOIRE", "Gants niveau 5", "Interdiction coupe vers soi", "Couteau de sécurité si possible"] 
  }
];

// -----------------------------------------------------------------------------
// 2. RÈGLES DE VÉRIFICATION PÉRIODIQUE (Module VGP)
// -----------------------------------------------------------------------------
// Sert à calculer automatiquement si une VGP est périmée ou non.
// Periodicite en mois.
export const VGP_RULES = {
  "Levage": 6,      // Nacelles, Treuils, Palans, Elingues (6 mois)
  "EPI_Harnais": 12, // Harnais, Longes, Anti-chute (12 mois)
  "Electrique": 12, // Armoires, Coffrets (12 mois)
  "Pression": 12,   // Compresseurs, Cuves (12 à 40 mois selon type, on met 12 par sécurité)
  "Echafaudage": 3,  // Vérif trimestrielle recommandée (ou avant mise en service)
  "Extincteur": 12, // Vérification annuelle
  "Vehicule": 12    // Contrôle technique / Vérif interne
};

// Liste déroulante pour le formulaire d'ajout matériel
export const EQUIPMENT_TYPES = [
  { label: "Nacelle (PEMP)", category: "Levage" },
  { label: "Harnais de sécurité", category: "EPI_Harnais" },
  { label: "Longe / Anti-chute", category: "EPI_Harnais" },
  { label: "Compresseur", category: "Pression" },
  { label: "Echafaudage Roulant", category: "Echafaudage" },
  { label: "Extincteur", category: "Extincteur" },
  { label: "Coffret Électrique", category: "Electrique" },
  { label: "Véhicule Utilitaire", category: "Vehicule" }
];

// -----------------------------------------------------------------------------
// 3. RÉFÉRENTIEL Q3SRE (Visites Terrain)
// -----------------------------------------------------------------------------
export const Q3SRE_REFERENTIAL = {
  lignes_defense: [
    "Technique (Matériel, EPC, EPI)",
    "Humaine (Compétence, Vigilance, Comportement)",
    "Organisationnelle (Procédures, Planning, Permis)"
  ],
  points_controle: [
    "Port des EPI obligatoires",
    "Balisage de la zone",
    "Conformité de l'échafaudage",
    "Permis de feu / Pénétrer présents",
    "État du matériel électroportatif",
    "Propreté de la zone de travail",
    "Stockage des produits chimiques (Rétention)",
    "Présence extincteur valide"
  ]
};

// -----------------------------------------------------------------------------
// 4. CATÉGORIES D'OBSERVATION (Module OST)
// -----------------------------------------------------------------------------
export const OST_THEMES = [
  "Réaction face au risque",
  "Positions et Ergonomie",
  "Port des EPI",
  "Outillage et Equipement",
  "Procédures et Organisation",
  "Ordre et Propreté"
];

// -----------------------------------------------------------------------------
// 5. THÈMES CAUSERIES (Module Sécurité)
// -----------------------------------------------------------------------------
export const CAUSERIE_THEMES = [
  "Travaux en hauteur & Chutes",
  "Risque Routier & Trajets",
  "Manutention & TMS",
  "Addictions (Alcool / Drogue)",
  "Risque Chimique & Étiquetage",
  "Outillage à main (Cutter...)",
  "Bruit & Protection auditive",
  "Accueil & Nouveaux embauchés",
  "Rangement & Propreté",
  "Coactivité & Balisage"
];

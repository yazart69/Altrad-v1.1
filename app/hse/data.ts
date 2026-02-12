// BASE DE DONNÉES DES RISQUES & MESURES (BIBLIOTHÈQUE TECHNIQUE)
// Ce fichier centralise tout le savoir-faire HSE pour alléger le composant principal.

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
    id: 'TCA-21', 
    category: 'Logistique', 
    task: "Conduite & Circulation routière", 
    risks: ["Accident routier grave", "Incendie véhicule", "Déversement substance dangereuse"], 
    measures: ["Véhicule contrôlé périodiquement", "Arrimage sécurisé des charges", "Interdiction téléphone au volant", "Extincteur ABC valide dans véhicule", "Trousse de secours présente"] 
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
    id: 'TCA-05', 
    category: 'Hauteur', 
    task: "Travaux sur échafaudage fixe (Utilisation)", 
    risks: ["Chute de hauteur", "Chute d'objet", "Encombrement", "Glissade"], 
    measures: ["Trappes d'accès fermées hors passage", "Plinthes et garde-corps en place", "Respect des charges admissibles (Classe)", "Aucun stockage excessif sur planchers"] 
  },
  { 
    id: 'TCA-06', 
    category: 'Hauteur', 
    task: "Travaux sur échafaudage roulant", 
    risks: ["Renversement", "Chute de hauteur", "Heurt"], 
    measures: ["Roues bloquées avant montée", "Stabilisateurs sortis et réglés", "Interdiction de déplacer avec personnel dessus", "Sol plan, stable et dégagé"] 
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

  // --- FAMILLE 3 : ISOLATION & CALORIFUGE (ISO) ---
  { 
    id: 'ISO-02', 
    category: 'Isolation', 
    task: "Dépose calorifuge (Décalorifugeage)", 
    risks: ["Coupure", "Poussière (Fibres)", "Chute de plain-pied", "Contact produit ancien"], 
    measures: ["Gants anti-coupure niveau 5", "Masque P3 obligatoire", "Combinaison jetable type 5/6", "Humidification des matériaux", "Conditionnement immédiat des déchets"] 
  },
  { 
    id: 'ISO-03', 
    category: 'Isolation', 
    task: "Pose isolant / Tôle de protection", 
    risks: ["Coupure tôle (très fréquent)", "Projection particules", "TMS (Vissage)", "Bruit"], 
    measures: ["Gants manutention lourde", "Lunettes protection latérale", "Outils de coupe adaptés (Cisailles)", "Etabli de découpe stable", "Protections auditives"] 
  },
  { 
    id: 'ISO-05', 
    category: 'Isolation', 
    task: "Pose plots / Aiguilles (Soudure par point)", 
    risks: ["Brûlure", "Risque électrique", "Départ de feu", "Fumées de soudage"], 
    measures: ["Permis de feu obligatoire", "Extincteur à portée de main", "EPI soudeur (Tablier, Gants cuir)", "Bâches ignifugées si coactivité", "Ventilation de la zone"] 
  },

  // --- FAMILLE 4 : PEINTURE & TRAITEMENT (PRS) ---
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

  // --- FAMILLE 5 : RISQUES SPÉCIFIQUES (CET) ---
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
    id: 'CET-09', 
    category: 'Spécifique', 
    task: "Travaux à proximité de l'eau", 
    risks: ["Noyade", "Chute à l'eau", "Hypothermie"], 
    measures: ["Port du Gilet de sauvetage", "Bouée couronne avec ligne de jet", "Travail en binôme obligatoire", "Balisage des berges"] 
  },
  { 
    id: 'TCA-23', 
    category: 'Spécifique', 
    task: "Utilisation outils coupants (Cutter)", 
    risks: ["Coupure grave", "Hémorragie"], 
    measures: ["Utilisation Cutter à lame rétractable OBLIGATOIRE", "Gants niveau 5", "Interdiction coupe vers soi", "Couteau de sécurité si possible"] 
  }
];

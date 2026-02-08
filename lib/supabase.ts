import { createClient } from '@supabase/supabase-js';

// Vérifier que les variables d'environnement sont définies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  );
}

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Types pour la base de données
export interface User {
  id: string;
  nom: string;
  prenom?: string;
  email: string;
  role: 'chef_chantier' | 'ouvrier' | 'admin' | 'interim';
  created_at: string;
}

export interface Chantier {
  id: string;
  nom: string;
  adresse?: string;
  statut: 'en_cours' | 'termine' | 'planifie';
  chef_id: string;
  tasks?: Task[];
  notes?: string;
  photos?: Photo[];
  documents?: Document[];
  created_at: string;
}

export interface Task {
  id: string;
  label: string;
  done: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Photo {
  id: string;
  url: string;
  description?: string;
  uploaded_at: string;
}

export interface Document {
  name: string;
  type: 'SECURITE' | 'PLAN' | 'AUTRE';
  date: string;
  url?: string;
}

export interface StockChantier {
  id: string;
  chantier_id: string;
  label: string;
  quantite_actuelle: number;
  unite: string;
  seuil_alerte: number;
  created_at: string;
}

export interface BesoinUrgent {
  id: string;
  chantier_id: string;
  article: string;
  auteur: string;
  statut: 'A commander' | 'Commande' | 'Livre';
  created_at: string;
}

export interface Briefing {
  id: string;
  chantier_id: string;
  chef_id: string;
  date: string;
  donnees: {
    port_epi: boolean;
    analyse_risques: boolean;
    balisage_ok: boolean;
    points_critiques: string;
  };
  presents: string[];
  created_at: string;
}

export interface Presence {
  id: string;
  user_id: string;
  user_nom: string;
  chantier_id: string;
  date: string;
  heure_arrivee: string;
  heure_depart?: string;
  created_at: string;
}

// Fonctions utilitaires pour les requêtes courantes

/**
 * Récupère tous les chantiers actifs
 */
export async function getActiveChantiers() {
  const { data, error } = await supabase
    .from('chantiers')
    .select('*')
    .eq('statut', 'en_cours')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur lors de la récupération des chantiers:', error);
    return [];
  }

  return data as Chantier[];
}

/**
 * Récupère le stock d'un chantier spécifique
 */
export async function getStockChantier(chantierId: string) {
  const { data, error } = await supabase
    .from('stock_chantier')
    .select('*')
    .eq('chantier_id', chantierId);

  if (error) {
    console.error('Erreur lors de la récupération du stock:', error);
    return [];
  }

  return data as StockChantier[];
}

/**
 * Met à jour la quantité d'un article en stock
 */
export async function updateStockQuantity(itemId: string, newQuantity: number) {
  const { data, error } = await supabase
    .from('stock_chantier')
    .update({ quantite_actuelle: newQuantity })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour du stock:', error);
    return null;
  }

  return data;
}

/**
 * Crée une nouvelle demande de besoin urgent
 */
export async function createBesoinUrgent(
  chantierId: string,
  article: string,
  auteur: string
) {
  const { data, error } = await supabase
    .from('besoins_urgents')
    .insert([
      {
        chantier_id: chantierId,
        article,
        auteur,
        statut: 'A commander',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la création du besoin urgent:', error);
    return null;
  }

  return data;
}

/**
 * Enregistre un briefing de sécurité
 */
export async function saveBriefing(
  chantierId: string,
  chefId: string,
  donnees: Briefing['donnees'],
  presents: string[]
) {
  const { data, error } = await supabase
    .from('briefings')
    .insert([
      {
        chantier_id: chantierId,
        chef_id: chefId,
        date: new Date().toISOString(),
        donnees,
        presents,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de l\'enregistrement du briefing:', error);
    return null;
  }

  return data;
}

/**
 * Récupère les présences d'un chantier pour une date donnée
 */
export async function getPresencesChantier(chantierId: string, date: string) {
  const { data, error } = await supabase
    .from('presences')
    .select('*')
    .eq('chantier_id', chantierId)
    .eq('date', date);

  if (error) {
    console.error('Erreur lors de la récupération des présences:', error);
    return [];
  }

  return data as Presence[];
}

// Export par défaut du client
export default supabase;
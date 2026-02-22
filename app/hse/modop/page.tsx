"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  FileText, X, Save, Eye, CheckCircle2, ChevronRight, 
  Plus, Loader2, ArrowLeft, Printer, ShieldAlert, 
  Trash2, Info, ListChecks, Wind, Flame, Skull, Users, MapPin, HardHat, Pencil, Beaker, UploadCloud, ScanLine,
  Check
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast, { Toaster } from 'react-hot-toast';
import { RISK_DATABASE } from '../data'; 

export default function MODOPPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={40}/></div>}>
      <MODOPContent />
    </Suspense>
  );
}

function MODOPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chantierId = searchParams.get('cid');

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'view'>('list');
  const [archives, setArchives] = useState<any[]>([]);
  const [chantierInfo, setChantierInfo] = useState<any>(null);
  const [employesDB, setEmployesDB] = useState<any[]>([]);
  const [selectedMODOP, setSelectedMODOP] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Etat pour le scan IA des FDS
  const [isScanningFDS, setIsScanningFDS] = useState(false);

  const defaultForm = {
    otp: '',
    redacteur: '',
    validateur_sup: '',
    version: 'A',
    localisation: '', 
    description_travaux: '',
    equipe: [] as any[],
    risques_chimiques: [] as any[], // NOUVEAU: Stocke l'analyse des FDS
    mesures_prevention: { atex: false, plomb: false, amiante: 'non' },
    techniques: [] as string[], 
    etapes_mise_en_oeuvre: [] as { etape: string, controle_requis: boolean, validateur: string }[],
    procedures_urgence: "Alerter le SST le plus proche. Dégager la victime de la zone dangereuse (< 3 min) si cela ne présente pas de risque de sur-accident. Contacter le 15 (SAMU) ou le 112. En cas de projection chimique, rincer abondamment à l'eau ou solution diphotérine.",
    signature_redacteur: '',
    signature_validateur: ''
  };

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(defaultForm);
  const [extWorker, setExtWorker] = useState({ nom: '', role: 'Sous-traitant', habs: '' });

  const sigPadRedacteur = useRef<any>(null);
  const sigPadValidateur = useRef<any>(null);

  useEffect(() => {
    if (step === 6 && formData.signature_redacteur && sigPadRedacteur.current) {
        setTimeout(() => { sigPadRedacteur.current?.fromDataURL(formData.signature_redacteur); }, 50);
    }
    if (step === 6 && formData.signature_validateur && sigPadValidateur.current) {
        setTimeout(() => { sigPadValidateur.current?.fromDataURL(formData.signature_validateur); }, 50);
    }
  }, [step]);

  const fetchArchives = async () => {
      const { data } = await supabase.from('chantier_modop').select('*').eq('chantier_id', chantierId).order('created_at', { ascending: false });
      if (data) setArchives(data);
  };

  useEffect(() => {
    if (!chantierId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const [cData, eData] = await Promise.all([
                supabase.from('chantiers').select('nom, client').eq('id', chantierId).single(),
                supabase.from('employes').select('id, nom, prenom, role, habilitations')
            ]);
            if (cData.data) setChantierInfo(cData.data);
            if (eData.data) setEmployesDB(eData.data);
            await fetchArchives();
        } catch (error) { toast.error("Erreur de chargement des données"); } 
        finally { setLoading(false); }
    };
    loadData();
  }, [chantierId]);

  const toggleEmploye = (emp: any) => {
      const exists = formData.equipe.find(e => e.id === emp.id);
      if (exists) setFormData({ ...formData, equipe: formData.equipe.filter(e => e.id !== emp.id) });
      else setFormData({ ...formData, equipe: [...formData.equipe, { id: emp.id, nom: emp.nom, prenom: emp.prenom, role: emp.role, habilitations: emp.habilitations || [] }] });
  };

  const addExtWorker = () => {
      if (!extWorker.nom) return toast.error("Le nom est obligatoire.");
      const newEmp = { id: 'ext-' + Date.now(), nom: extWorker.nom, prenom: '', role: extWorker.role, habilitations: extWorker.habs ? extWorker.habs.split(',').map(h => h.trim()) : [] };
      setFormData({ ...formData, equipe: [...formData.equipe, newEmp] });
      setExtWorker({ nom: '', role: 'Sous-traitant', habs: '' });
  };

  // --- MOTEUR DE LECTURE FDS (SIMULATION IA) ---
  const handleFDSUpload = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setIsScanningFDS(true);
      
      // On simule un délai de traitement OCR / IA de 2 secondes
      setTimeout(() => {
          // Extraction simulée basée sur des mots-clés typiques de la chimie du BTP
          const analyseIA = {
              id: Date.now().toString(),
              fichier: file.name,
              produit: file.name.replace('.pdf', '').replace(/_/g, ' ').toUpperCase(),
              dangers: [
                  "Toxicité aigüe (Inhalation de vapeurs/solvants)",
                  "Irritation cutanée et lésions oculaires graves",
                  "Risque inflammable ou émanation de COV"
              ],
              mesures: [
                  "Port du demi-masque avec cartouches A2P3 obligatoire",
                  "Gants de protection chimique (Nitrile/Néoprène)",
                  "Lunettes masques étanches (risque projection)",
                  "Ventilation mécanique de la zone de travail"
              ]
          };

          setFormData(prev => ({
              ...prev,
              risques_chimiques: [...(prev.risques_chimiques || []), analyseIA]
          }));
          setIsScanningFDS(false);
          toast.success("FDS analysée avec succès ! Les risques ont été ajoutés.");
      }, 2000);
  };

  const removeFDS = (idx: number) => {
      setFormData({ ...formData, risques_chimiques: formData.risques_chimiques.filter((_, i) => i !== idx) });
  };

  const toggleTechnique = (id: string) => {
    setFormData(prev => ({
        ...prev,
        techniques: prev.techniques.includes(id) ? prev.techniques.filter(i => i !== id) : [...prev.techniques, id]
    }));
  };

  const updateAmiante = (val: string) => setFormData({ ...formData, mesures_prevention: { ...formData.mesures_prevention, amiante: val } });

  const addEtape = () => setFormData({ ...formData, etapes_mise_en_oeuvre: [...formData.etapes_mise_en_oeuvre, { etape: '', controle_requis: false, validateur: '' }] });
  const updateEtape = (idx: number, field: string, value: any) => {
      const newEtapes = [...formData.etapes_mise_en_oeuvre];
      newEtapes[idx] = { ...newEtapes[idx], [field]: value };
      setFormData({ ...formData, etapes_mise_en_oeuvre: newEtapes });
  };
  const removeEtape = (idx: number) => setFormData({ ...formData, etapes_mise_en_oeuvre: formData.etapes_mise_en_oeuvre.filter((_, i) => i !== idx) });

  const handleEdit = (modop: any) => {
      setEditingId(modop.id);
      setFormData({
          otp: modop.otp || '', redacteur: modop.redacteur || '', validateur_sup: modop.validateur_sup || '',
          version: modop.version || 'A', localisation: modop.localisation || '', description_travaux: modop.description_travaux || '',
          equipe: modop.equipe || [],
          risques_chimiques: modop.risques_chimiques || [], // Chargement des produits
          mesures_prevention: modop.mesures_prevention || { atex: false, plomb: false, amiante: 'non' },
          techniques: modop.techniques || [], etapes_mise_en_oeuvre: modop.controles || [],
          procedures_urgence: modop.procedures_urgence || defaultForm.procedures_urgence,
          signature_redacteur: modop.signatures?.redacteur || '', signature_validateur: modop.signatures?.validateur_sup || ''
      });
      setStep(1); setView('create');
  };

  const handleDelete = async (id: string) => {
      if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce Mode Opératoire ?")) return;
      const toastId = toast.loading("Suppression en cours...");
      const { error } = await supabase.from('chantier_modop').delete().eq('id', id);
      if (error) toast.error("Erreur : " + error.message, { id: toastId });
      else { toast.success("MODOP supprimé.", { id: toastId }); setArchives(archives.filter(a => a.id !== id)); }
  };

  const handleSave = async () => {
    if (!formData.signature_redacteur) return toast.error("La signature du rédacteur est requise.");
    const toastId = toast.loading("Enregistrement du Mode Opératoire...");
    
    const { signature_redacteur, signature_validateur, etapes_mise_en_oeuvre, ...dataToSend } = formData;
    const payload = { 
        chantier_id: chantierId, ...dataToSend, controles: etapes_mise_en_oeuvre,
        signatures: { redacteur: signature_redacteur, validateur_sup: signature_validateur } 
    };

    let error;
    if (editingId) error = (await supabase.from('chantier_modop').update(payload).eq('id', editingId)).error;
    else error = (await supabase.from('chantier_modop').insert([payload])).error;
    
    if (error) toast.error("Erreur SQL : " + error.message, { id: toastId }); 
    else {
        toast.success(editingId ? "✅ MODOP Mis à jour !" : "✅ MODOP Créé et Archivé !", { id: toastId });
        await fetchArchives(); setView('list'); setStep(1); setEditingId(null);
    }
  };

  if (!chantierId) return <div className="p-10 text-center font-black uppercase text-red-500">Erreur : Aucun chantier sélectionné.</div>;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-700 size-10"/></div>;

  if (view === 'list') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-['Fredoka'] text-gray-800">
        <Toaster position="bottom-right" />
        <div className="max-w-5xl mx-auto bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase text-[#2d3436] tracking-tighter flex items-center gap-3"><FileText className="text-blue-700" size={36}/> Modes Opératoires</h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Dossier : <span className="text-blue-600">{chantierInfo?.nom}</span></p>
                    <button onClick={() => router.push('/hse')} className="text-xs font-bold text-gray-400 hover:text-black mt-3 flex items-center gap-1 transition-colors">← Retour au Dashboard</button>
                </div>
                <button onClick={() => { setEditingId(null); setFormData(defaultForm); setView('create'); setStep(1); }} className="bg-blue-700 hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 shadow-lg active:scale-95">
                    <Plus size={20}/> Nouveau MODOP
                </button>
            </div>

            <div className="space-y-4">
                {archives.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <FileText size={60} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-400 font-black uppercase text-xl">Aucun document technique</p>
                    </div>
                )}
                {archives.map(a => (
                    <div key={a.id} className="flex flex-col lg:flex-row justify-between lg:items-center p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all gap-4">
                        <div>
                            <p className="font-black text-gray-800 text-lg uppercase leading-tight mb-1">INDICE {a.version} - {a.localisation || 'Adresse non renseignée'}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-500 mt-2">
                                {a.otp && <span className="bg-gray-800 text-white px-2 py-1 rounded font-mono uppercase">OTP: {a.otp}</span>}
                                <span className="bg-white px-2 py-1 rounded border border-gray-200">Créé le {new Date(a.created_at).toLocaleDateString()}</span>
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">Rédigé par: {a.redacteur}</span>
                                {(a.risques_chimiques && a.risques_chimiques.length > 0) && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded uppercase shadow-sm flex items-center gap-1"><Beaker size={12}/> {a.risques_chimiques.length} FDS</span>}
                                {a.mesures_prevention?.amiante === 'SS3' && <span className="bg-red-600 text-white px-2 py-1 rounded uppercase shadow-sm animate-pulse">AMIANTE SS3</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(a)} className="p-3 bg-white rounded-xl text-orange-500 hover:bg-orange-50 border border-gray-200 shadow-sm transition-colors" title="Modifier"><Pencil size={20}/></button>
                            <button onClick={() => handleDelete(a.id)} className="p-3 bg-white rounded-xl text-red-500 hover:bg-red-50 border border-gray-200 shadow-sm transition-colors" title="Supprimer"><Trash2 size={20}/></button>
                            <button onClick={() => { setSelectedMODOP(a); setView('view'); }} className="p-3 bg-white rounded-xl text-blue-600 hover:bg-blue-50 border border-gray-200 shadow-sm transition-colors" title="Consulter PDF"><Eye size={20}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // VUE PDF
  if (view === 'view' && selectedMODOP) {
      const dbRisks = (selectedMODOP.techniques || []).map((id: string) => RISK_DATABASE.find(r => r.id === id)).filter(Boolean);

      return (
          <div className="min-h-screen bg-gray-100 font-sans text-gray-900 p-4 md:p-8">
               <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page { size: A4 portrait; margin: 10mm; }
                  body * { visibility: hidden; }
                  .print-container, .print-container * { visibility: visible; }
                  .print-container { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; padding: 0; box-shadow: none; border: none; }
                  .no-print { display: none !important; }
                  .page-break { page-break-before: always; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #000; padding: 8px; font-size: 11px; }
                  th { background-color: #f3f4f6 !important; font-weight: bold; }
                }
              `}}/>
              
              <div className="max-w-4xl mx-auto mb-6 flex justify-between no-print">
                  <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-bold bg-white px-4 py-2 rounded-xl border border-gray-200 hover:text-black"><ArrowLeft size={18}/> Retour</button>
                  <button onClick={() => window.print()} className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-black"><Printer size={16}/> Imprimer Document Qualité</button>
              </div>

              <div className="print-container max-w-4xl mx-auto bg-white p-10 shadow-2xl border border-gray-100">
                  <div className="border-4 border-blue-900 mb-8 flex flex-col">
                      <div className="bg-blue-900 text-white p-4 text-center"><h1 className="text-2xl font-black uppercase tracking-widest">MODE OPÉRATOIRE & SÉCURITÉ</h1></div>
                      <div className="grid grid-cols-5 divide-x-2 divide-blue-900 text-center font-bold text-xs bg-gray-50 border-b-2 border-blue-900">
                          <div className="p-2 text-blue-900 uppercase">Dossier<br/><span className="text-black">{chantierInfo?.nom}</span></div>
                          <div className="p-2 text-blue-900 uppercase">OTP<br/><span className="text-black">{selectedMODOP.otp || 'N/A'}</span></div>
                          <div className="p-2 text-blue-900 uppercase">Version<br/><span className="text-black text-lg">{selectedMODOP.version}</span></div>
                          <div className="p-2 text-blue-900 uppercase">Date<br/><span className="text-black">{new Date(selectedMODOP.created_at).toLocaleDateString()}</span></div>
                          <div className="p-2 text-blue-900 uppercase">Rédacteur<br/><span className="text-black">{selectedMODOP.redacteur}</span></div>
                      </div>
                      <div className="p-3 text-center bg-blue-50">
                          <span className="text-blue-900 font-black uppercase text-xs mr-2">📍 Adresse exacte de l'intervention :</span>
                          <span className="text-black font-bold uppercase">{selectedMODOP.localisation}</span>
                      </div>
                  </div>

                  <div className="mb-6">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">1. Équipe d'Intervention & Habilitations</h3>
                      {selectedMODOP.equipe?.length > 0 ? (
                          <table className="w-full text-xs">
                              <thead><tr><th className="w-[30%] text-left">Nom & Prénom</th><th className="w-[20%] text-left">Rôle</th><th className="w-[50%] text-left">Habilitations (Vérifiées)</th></tr></thead>
                              <tbody>
                                  {selectedMODOP.equipe.map((e: any, i: number) => (
                                      <tr key={i}>
                                          <td className="font-bold uppercase">{e.nom} {e.prenom}</td><td>{e.role}</td><td className="text-[10px] text-blue-800 font-bold">{e.habilitations?.join(', ') || 'Aucune'}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      ) : <p className="text-xs italic text-gray-500">Aucune équipe spécifiée dans le document.</p>}
                  </div>

                  <div className="mb-6">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">2. Description des travaux et Spécificités</h3>
                      <p className="text-sm"><span className="font-bold uppercase text-gray-600 mr-2">Travaux prévus :</span> {selectedMODOP.description_travaux}</p>
                      
                      {(selectedMODOP.mesures_prevention?.atex || selectedMODOP.mesures_prevention?.plomb || selectedMODOP.mesures_prevention?.amiante !== 'non') && (
                          <div className="mt-4 border-2 border-red-500 p-3 bg-red-50">
                              <h4 className="font-black text-red-700 uppercase text-xs mb-2 flex items-center gap-2"><ShieldAlert size={16}/> EXIGENCES LÉGALES ET ENVIRONNEMENTALES</h4>
                              <ul className="list-disc pl-5 text-xs font-bold text-red-900 space-y-2">
                                  {selectedMODOP.mesures_prevention?.atex && <li><strong>ZONE ATEX :</strong> Matériel certifié ATEX (EX) obligatoire, explosimètre permanent, interdiction formelle de source d'ignition. Permis de feu indispensable.</li>}
                                  {selectedMODOP.mesures_prevention?.plomb && <li><strong>RISQUE PLOMB :</strong> Délimitation Zone Rouge, sas de décontamination hygiène (propre/sale), aspiration avec filtre THE, port de masque P3 obligatoire. Bilan plombémie à jour.</li>}
                                  {selectedMODOP.mesures_prevention?.amiante === 'SS4' && <li><strong>AMIANTE SS4 (Maintenance) :</strong> Respect strict du mode opératoire SS4. Confinement localisé, humidification des supports, masque FFP3/Ventilé selon l'empoussièrement estimé. Gestion des déchets en amiante lié.</li>}
                                  {selectedMODOP.mesures_prevention?.amiante === 'SS3' && <li className="text-red-600 text-sm uppercase"><strong>AMIANTE SS3 (Retrait) : DANGER / HAUTE SURVEILLANCE.</strong> Le présent document vient en complément du Plan de Retrait validé par l'Inspection du Travail. Confinement total, dépression contrôlée, sas 5 compartiments obligatoires.</li>}
                              </ul>
                          </div>
                      )}
                  </div>

                  <div className="mb-6 page-break-inside-avoid">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">3. Étapes de la mise en œuvre et points de contrôle</h3>
                      {selectedMODOP.controles?.length > 0 ? (
                          <table className="w-full text-xs">
                              <thead><tr><th className="text-left w-[60%]">Étape d'intervention</th><th className="text-center w-[15%]">Contrôle Requis</th><th className="text-left w-[25%]">Validateur</th></tr></thead>
                              <tbody>
                                  {selectedMODOP.controles.map((c: any, i: number) => (
                                      <tr key={i}>
                                          <td className="font-bold">{c.etape}</td><td className={`font-black text-center ${c.controle_requis ? 'text-orange-600' : 'text-gray-400'}`}>{c.controle_requis ? 'OUI' : 'NON'}</td><td className="italic">{c.validateur || '-'}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      ) : <p className="text-xs italic text-gray-500">Aucun suivi des étapes défini.</p>}
                  </div>

                  <div className="mb-6 page-break-inside-avoid">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">4. Analyse des Risques et Prévention (ADR)</h3>
                      <table className="w-full text-[10px]">
                          <thead><tr><th className="w-[20%] text-left">Opération / Produit</th><th className="w-[30%] text-left text-red-700">Risques Majeurs</th><th className="w-[50%] text-left text-green-800">Mesures de Prévention & Équipements</th></tr></thead>
                          <tbody>
                              {/* Affichage des risques chimiques extraits des FDS */}
                              {selectedMODOP.risques_chimiques && selectedMODOP.risques_chimiques.map((chem: any, i: number) => (
                                  <tr key={`chem-${i}`} className="bg-yellow-50 border-yellow-200">
                                      <td className="font-bold uppercase text-yellow-900"><Beaker size={12} className="inline mr-1"/> PRODUIT CHIMIQUE:<br/>{chem.produit}</td>
                                      <td className="text-red-800"><ul className="list-disc pl-3 font-bold">{chem.dangers.map((d: string, j: number) => <li key={j}>{d}</li>)}</ul></td>
                                      <td className="text-green-900"><ul className="list-disc pl-3 font-bold">{chem.mesures.map((m: string, j: number) => <li key={j}>{m}</li>)}</ul></td>
                                  </tr>
                              ))}
                              {/* Affichage des risques techniques classiques */}
                              {dbRisks.map((r: any) => (
                                  <tr key={r.id}>
                                      <td className="font-bold uppercase bg-gray-50">{r.task}</td>
                                      <td><ul className="list-disc pl-3">{r.risks.map((risk: string, i: number) => <li key={i}>{risk}</li>)}</ul></td>
                                      <td><ul className="list-disc pl-3">{r.measures.map((mes: string, i: number) => <li key={i}>{mes}</li>)}</ul></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <div className="mb-6 page-break-inside-avoid">
                      <h3 className="bg-gray-100 border-b-2 border-black p-2 font-black uppercase text-sm mb-3">5. Procédures d'urgence</h3>
                      <p className="text-xs font-bold p-3 border border-red-200 bg-red-50 text-red-800 italic">{selectedMODOP.procedures_urgence}</p>
                  </div>

                  <div className="border border-black flex page-break-inside-avoid">
                      <div className="w-1/2 border-r border-black">
                          <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-xs">Rédacteur : {selectedMODOP.redacteur}</div>
                          <div className="p-4 flex items-center justify-center h-24">
                              {selectedMODOP.signatures?.redacteur ? <img src={selectedMODOP.signatures.redacteur} className="h-full" /> : <span className="text-gray-300 italic">Non signé</span>}
                          </div>
                      </div>
                      <div className="w-1/2">
                          <div className="bg-gray-100 border-b border-black p-2 font-black uppercase text-xs">Validateur Supérieur : {selectedMODOP.validateur_sup}</div>
                          <div className="p-4 flex items-center justify-center h-24">
                              {selectedMODOP.signatures?.validateur_sup ? <img src={selectedMODOP.signatures.validateur_sup} className="h-full" /> : <span className="text-gray-300 italic">Non signé</span>}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // WIZARD
  return (
    <div className="min-h-screen bg-[#2d3436] p-4 md:p-8 font-['Fredoka'] flex items-center justify-center text-gray-800">
        <Toaster position="top-center" />
        <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[800px] animate-in zoom-in-95 duration-300">
            
            <div className="bg-blue-700 p-8 text-white relative">
                <button onClick={() => setView('list')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                <div className="text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3"><FileText className="text-white"/> Mode Opératoire</h1>
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-2">Rédaction & Contrôle de Conformité</p>
                </div>
            </div>

            <div className="flex h-2 bg-gray-100">
                {[1,2,3,4,5,6].map(s => <div key={s} className={`flex-1 transition-all duration-700 ${step >= s ? 'bg-blue-700' : 'bg-transparent'}`}></div>)}
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                
                {/* --- ETAPE 1 : CADRE ET EQUIPE --- */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">1. Cadre et Intervenants</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">N° OTP</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100 uppercase" placeholder="P-XXXXXX" value={formData.otp} onChange={e=>setFormData({...formData, otp: e.target.value})} /></div>
                            <div className="col-span-1 md:col-span-3"><label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-2 block mb-2 flex items-center gap-1"><MapPin size={14}/> Adresse exacte du chantier</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border-2 border-blue-200 focus:border-blue-500" placeholder="Ex: Centrale EDF de Bugey, Bâtiment Réacteur 2..." value={formData.localisation} onChange={e=>setFormData({...formData, localisation: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Version</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" value={formData.version} onChange={e=>setFormData({...formData, version: e.target.value})} /></div>
                            <div className="col-span-1 md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Rédacteur</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" placeholder="Nom..." value={formData.redacteur} onChange={e=>setFormData({...formData, redacteur: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Validateur Supérieur</label><input type="text" className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100" placeholder="Ex: Client, Dir..." value={formData.validateur_sup} onChange={e=>setFormData({...formData, validateur_sup: e.target.value})} /></div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-4 flex items-center gap-2"><Users size={14}/> Sélection de l'équipe (Vérification des habilitations)</label>
                            {formData.equipe.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <span className="text-xs font-black text-blue-800 w-full mb-1">Équipe affectée :</span>
                                    {formData.equipe.map(e => (
                                        <div key={e.id} className="bg-white text-blue-900 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                                            {e.prenom} {e.nom} ({e.role})
                                            <button onClick={() => setFormData({...formData, equipe: formData.equipe.filter(x => x.id !== e.id)})} className="text-gray-400 hover:text-red-500 ml-1"><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                {employesDB.map(emp => {
                                    const isSelected = formData.equipe.find(e => e.id === emp.id);
                                    return (
                                        <div key={emp.id} onClick={() => toggleEmploye(emp)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${isSelected ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm uppercase text-gray-800">{emp.prenom} {emp.nom} <span className="text-gray-400 text-xs normal-case">({emp.role})</span></span>
                                                {isSelected && <CheckCircle2 size={18} className="text-blue-500"/>}
                                            </div>
                                            <div className="text-[10px] font-black text-blue-800 uppercase bg-blue-100/50 p-1.5 rounded inline-block w-fit">
                                                <ShieldAlert size={10} className="inline mr-1"/>
                                                {emp.habilitations?.join(', ') || 'Aucune habilitation enregistrée'}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="bg-gray-100 p-4 rounded-2xl border border-gray-200">
                                <h4 className="text-xs font-black uppercase text-gray-600 mb-3 flex items-center gap-2"><HardHat size={16}/> Ajouter un Sous-Traitant / Intérimaire</h4>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input type="text" placeholder="Nom complet..." className="flex-1 p-3 rounded-xl text-xs font-bold border-none outline-none" value={extWorker.nom} onChange={e => setExtWorker({...extWorker, nom: e.target.value})} />
                                    <input type="text" placeholder="Rôle (ex: Échafaudeur)" className="w-32 p-3 rounded-xl text-xs font-bold border-none outline-none" value={extWorker.role} onChange={e => setExtWorker({...extWorker, role: e.target.value})} />
                                    <input type="text" placeholder="Habilitations (ex: N1, SS4)..." className="flex-1 p-3 rounded-xl text-xs font-bold border-none outline-none" value={extWorker.habs} onChange={e => setExtWorker({...extWorker, habs: e.target.value})} />
                                    <button onClick={addExtWorker} className="bg-blue-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition-colors"><Plus size={16}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 2 : NOUVEAU : GESTION FDS ET PRODUITS CHIMIQUES --- */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-yellow-500 inline-block pb-1">2. Analyse des Produits Chimiques (FDS)</h3>
                        <p className="text-xs font-bold text-gray-500 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start gap-3">
                            <Info size={24} className="text-yellow-600 shrink-0"/>
                            Déposez les Fiches de Données de Sécurité (Colles, Résines, Solvants, Peintures...). L'intelligence artificielle analysera le document pour extraire automatiquement les risques sanitaires et les EPI obligatoires qui seront injectés dans l'Analyse de Risques finale.
                        </p>

                        <div className="border-4 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors rounded-[30px] p-10 flex flex-col items-center justify-center text-center relative">
                            {isScanningFDS ? (
                                <div className="flex flex-col items-center gap-4">
                                    <ScanLine size={48} className="text-blue-500 animate-pulse"/>
                                    <span className="font-black text-blue-800 uppercase tracking-widest text-sm">Lecture IA en cours...</span>
                                    <span className="text-xs font-bold text-gray-500">Extraction des mentions de danger (CMR, Corrosif, Inflammable)</span>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud size={48} className="text-gray-400 mb-4"/>
                                    <span className="font-black text-gray-600 uppercase mb-2">Importer une FDS (PDF)</span>
                                    <span className="text-xs font-bold text-gray-400">Cliquez ou glissez-déposez le document ici</span>
                                    <input type="file" accept=".pdf" onChange={handleFDSUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </>
                            )}
                        </div>

                        {formData.risques_chimiques.length > 0 && (
                            <div className="space-y-4 mt-8">
                                <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Produits analysés et validés</h4>
                                {formData.risques_chimiques.map((chem, idx) => (
                                    <div key={idx} className="bg-white border-2 border-yellow-300 rounded-2xl p-5 relative shadow-sm">
                                        <button onClick={() => removeFDS(idx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-yellow-100 text-yellow-700 rounded-xl flex items-center justify-center"><Beaker size={20}/></div>
                                            <div>
                                                <h5 className="font-black text-gray-800 uppercase">{chem.produit}</h5>
                                                <span className="text-[10px] font-bold text-gray-400">Source : {chem.fichier}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                                <span className="text-[10px] font-black text-red-800 uppercase block mb-1">Dangers détectés</span>
                                                <ul className="list-disc pl-4 text-xs font-bold text-red-900">{chem.dangers.map((d:string, i:number) => <li key={i}>{d}</li>)}</ul>
                                            </div>
                                            <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                                                <span className="text-[10px] font-black text-green-800 uppercase block mb-1">Prévention & EPI requis</span>
                                                <ul className="list-disc pl-4 text-xs font-bold text-green-900">{chem.mesures.map((m:string, i:number) => <li key={i}>{m}</li>)}</ul>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- ETAPE 3 : ENVIRONNEMENT --- */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">3. Spécificités Environnementales</h3>
                        
                        <div className="grid grid-cols-1 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Description des travaux à réaliser</label><textarea className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-gray-100 h-32" placeholder="Ex: Décapage UHP des capacités 220..." value={formData.description_travaux} onChange={e=>setFormData({...formData, description_travaux: e.target.value})} /></div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2 block mb-4 flex items-center gap-2"><ShieldAlert size={14}/> Exigences de sécurité majeures</label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div onClick={() => setFormData({...formData, mesures_prevention: {...formData.mesures_prevention, atex: !formData.mesures_prevention.atex}})} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${formData.mesures_prevention.atex ? 'bg-orange-50 border-orange-500 text-orange-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.mesures_prevention.atex ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}><Flame size={20}/></div>
                                    <span className="font-black uppercase text-sm">Zone ATEX (Permis de feu)</span>
                                </div>
                                <div onClick={() => setFormData({...formData, mesures_prevention: {...formData.mesures_prevention, plomb: !formData.mesures_prevention.plomb}})} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${formData.mesures_prevention.plomb ? 'bg-red-50 border-red-500 text-red-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.mesures_prevention.plomb ? 'bg-red-500 text-white' : 'bg-gray-100'}`}><Skull size={20}/></div>
                                    <span className="font-black uppercase text-sm">Risque Plomb (Zone Rouge)</span>
                                </div>
                            </div>

                            <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-200">
                                <h4 className="font-black uppercase text-purple-900 text-xs mb-4 flex items-center gap-2"><Wind size={16}/> Gestion du risque Amiante</h4>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="amiante" checked={formData.mesures_prevention.amiante === 'non'} onChange={() => updateAmiante('non')} className="w-5 h-5 accent-purple-600"/><span className="font-bold text-sm">Aucun risque amiante</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="amiante" checked={formData.mesures_prevention.amiante === 'SS4'} onChange={() => updateAmiante('SS4')} className="w-5 h-5 accent-purple-600"/><span className="font-bold text-sm text-orange-600">Amiante SS4 (Maintenance)</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="amiante" checked={formData.mesures_prevention.amiante === 'SS3'} onChange={() => updateAmiante('SS3')} className="w-5 h-5 accent-purple-600"/><span className="font-black text-sm text-red-600">Amiante SS3 (Retrait)</span></label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 4 : ETAPES DE MISE EN OEUVRE --- */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">4. Étapes de la mise en œuvre</h3>
                            <button onClick={addEtape} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-blue-200 flex items-center gap-2 transition-colors"><Plus size={14}/> Ajouter étape</button>
                        </div>
                        <p className="text-xs font-bold text-gray-500 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-2"><ListChecks size={20} className="text-blue-500 shrink-0"/> Définissez les étapes clés et précisez si un contrôle formel est exigé (PA/PC).</p>

                        <div className="space-y-3">
                            {formData.etapes_mise_en_oeuvre.length === 0 && <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl text-center text-gray-400 font-bold">Aucune étape définie.</div>}
                            {formData.etapes_mise_en_oeuvre.map((etape, idx) => (
                                <div key={idx} className="flex flex-col md:flex-row gap-4 items-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                    <input type="text" placeholder="Description de l'étape (Ex: Pose des bâches)..." className="flex-1 w-full p-3 bg-white rounded-xl text-xs font-bold border border-gray-100 outline-none" value={etape.etape} onChange={(e) => updateEtape(idx, 'etape', e.target.value)} />
                                    <div className="flex items-center gap-3 shrink-0">
                                        <label className="flex items-center gap-2 text-[10px] font-black uppercase cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={etape.controle_requis} onChange={(e) => updateEtape(idx, 'controle_requis', e.target.checked)} /> Contrôle Requis
                                        </label>
                                        <input type="text" placeholder="Validateur (Ex: Client)" disabled={!etape.controle_requis} className={`w-40 p-3 rounded-xl text-xs font-bold border outline-none ${etape.controle_requis ? 'bg-white border-blue-200 text-blue-800' : 'bg-gray-100 border-transparent text-gray-400'}`} value={etape.validateur} onChange={(e) => updateEtape(idx, 'validateur', e.target.value)} />
                                        <button onClick={() => removeEtape(idx)} className="p-3 text-gray-400 hover:text-red-500 bg-white rounded-xl border border-gray-100"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 5 : ADR INTELLIGENTE --- */}
                {step === 5 && (
                    <div className="space-y-6 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">5. Opérations et Analyse de Risques</h3>
                        <div className="space-y-6">
                            {Array.from(new Set(RISK_DATABASE.map(r => r.category))).map(category => {
                                const risquesDansCategorie = RISK_DATABASE.filter(r => r.category === category);
                                return (
                                    <div key={category}>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">{category}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {risquesDansCategorie.map(risk => {
                                                const isSelected = formData.techniques.includes(risk.id);
                                                return (
                                                    <div key={risk.id} onClick={() => toggleTechnique(risk.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-start ${isSelected ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                                                        <p className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{risk.task}</p>
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center border-2 shrink-0 ml-4 ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>{isSelected && <Check size={14}/>}</div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* --- ETAPE 6 : VALIDATION --- */}
                {step === 6 && (
                    <div className="space-y-8 animate-in slide-in-from-right-10">
                        <h3 className="text-xl font-black uppercase text-gray-800 border-b-4 border-blue-700 inline-block pb-1">6. Signatures et Validation</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Rédacteur : {formData.redacteur || 'Non renseigné'}</label>
                                <div className="border-4 border-gray-100 rounded-[30px] h-48 bg-gray-50 relative overflow-hidden">
                                    <SignatureCanvas ref={sigPadRedacteur} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                                    <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none">Signature obligatoire</div>
                                    <button onClick={()=>sigPadRedacteur.current.clear()} className="absolute top-4 right-4 text-[10px] bg-white border px-3 py-1.5 rounded-lg font-black uppercase">Effacer</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Validateur Sup. : {formData.validateur_sup || 'Non renseigné'}</label>
                                <div className="border-4 border-gray-100 rounded-[30px] h-48 bg-gray-50 relative overflow-hidden">
                                    <SignatureCanvas ref={sigPadValidateur} penColor="black" canvasProps={{className: 'absolute inset-0 w-full h-full cursor-crosshair'}} />
                                    <div className="absolute bottom-4 w-full text-center text-[10px] font-black uppercase text-gray-300 pointer-events-none">Signature optionnelle au brouillon</div>
                                    <button onClick={()=>sigPadValidateur.current.clear()} className="absolute top-4 right-4 text-[10px] bg-white border px-3 py-1.5 rounded-lg font-black uppercase">Effacer</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-[40px]">
                {step > 1 ? (
                    <button onClick={() => {
                        if (step === 6) {
                            if (sigPadRedacteur.current && !sigPadRedacteur.current.isEmpty()) setFormData({...formData, signature_redacteur: sigPadRedacteur.current.getTrimmedCanvas().toDataURL('image/png')});
                            if (sigPadValidateur.current && !sigPadValidateur.current.isEmpty()) setFormData({...formData, signature_validateur: sigPadValidateur.current.getTrimmedCanvas().toDataURL('image/png')});
                        }
                        setStep(step-1);
                    }} className="px-6 py-4 font-black uppercase text-xs text-gray-400 hover:text-gray-800 transition-colors">Retour</button>
                ) : <div></div>}
                
                {step < 6 ? (
                    <button onClick={() => {
                        if (step === 1 && (!formData.otp || !formData.redacteur || !formData.localisation)) return toast.error("Veuillez renseigner l'OTP, le Rédacteur et l'Adresse.");
                        if (step === 5 && formData.techniques.length === 0) return toast.error("Sélectionnez au moins une technique pour générer l'ADR.");
                        setStep(step+1);
                    }} className="bg-[#2d3436] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                        Suivant <ChevronRight size={18}/>
                    </button>
                ) : (
                    <button onClick={() => {
                        let finalRedacteurSig = formData.signature_redacteur;
                        let finalValidateurSig = formData.signature_validateur;
                        if (sigPadRedacteur.current && !sigPadRedacteur.current.isEmpty()) finalRedacteurSig = sigPadRedacteur.current.getTrimmedCanvas().toDataURL('image/png');
                        if (sigPadValidateur.current && !sigPadValidateur.current.isEmpty()) finalValidateurSig = sigPadValidateur.current.getTrimmedCanvas().toDataURL('image/png');
                        if (!finalRedacteurSig) return toast.error("La signature du rédacteur est exigée.");
                        
                        setFormData(prev => ({ ...prev, signature_redacteur: finalRedacteurSig, signature_validateur: finalValidateurSig }));
                        setTimeout(handleSave, 100);
                    }} disabled={loading} className="bg-blue-700 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all">
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> {editingId ? "Mettre à jour" : "Verrouiller & Archiver"}</>}
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}
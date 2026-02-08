{/* ... à l'intérieur du map des chantiers ... */}
<Link href={`/chantier/${chantier.id}`} key={i} className="...">
  <div className="flex justify-between items-center mb-2">
    <span className="font-bold text-[18px]">{chantier.nom}</span>
    <span className="text-[12px] font-black opacity-60">{Math.round((chantier.heures_consommees / chantier.heures_budget) * 100)}%</span>
  </div>

  {/* BARRE D'AVANCEMENT AVEC CODE COULEUR */}
  <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden mb-1">
    <div 
      className={`h-full transition-all duration-500 ${
        (chantier.heures_consommees / chantier.heures_budget) > 0.9 ? 'bg-red-500' : 
        (chantier.heures_consommees / chantier.heures_budget) > 0.7 ? 'bg-orange-400' : 'bg-green-400'
      }`}
      style={{ width: `${Math.min(100, (chantier.heures_consommees / chantier.heures_budget) * 100)}%` }}
    ></div>
  </div>
  <p className="text-[10px] opacity-70 italic font-medium">📍 {chantier.adresse}</p>
</Link>

"use client";

import React from 'react';
import { ShoppingCart, Truck, MessageSquareWarning } from 'lucide-react';

export default function MiddleTiles() {
  const tiles = [
    {
      label: "Commandes",
      sub: "Matériel en attente",
      count: 3,
      icon: ShoppingCart,
      color: "#ffffff", // Icône blanche pour ressortir sur le fond coloré
      bgColor: "#b8e994" // Vert Clair
    },
    {
      label: "Locations",
      sub: "Suivi Équipements",
      count: 1,
      icon: Truck,
      color: "#ffffff",
      bgColor: "#74b9ff" // Bleu Clair
    },
    {
      label: "Notes Chantier",
      sub: "Incidents signalés",
      count: 5,
      icon: MessageSquareWarning,
      color: "#ffffff",
      bgColor: "#fd79a8" // Rose
    }
  ];

  return (
    <>
      {tiles.map((tile, i) => (
        <div 
          key={i} 
          className="col-span-4 rounded-[25px] relative shadow-sm flex flex-col p-[25px] h-full transition-all hover:shadow-md cursor-pointer overflow-visible border-none"
          style={{ backgroundColor: tile.bgColor }}
        >
          {/* TEXTE BLANC (pour contraster avec les fonds colorés) */}
          <div className="flex flex-col z-10">
            <span className="text-white font-[800] text-[18px] uppercase leading-none shadow-sm">
              {tile.label}
            </span>
            <span className="text-white/80 font-[700] text-[11px] uppercase tracking-wider mt-1">
              {tile.sub}
            </span>
          </div>

          {/* NOTIFICATION */}
          {tile.count > 0 && (
            <div 
              style={{ 
                position: 'absolute',
                top: '15px', 
                right: '15px',
                width: '40px',
                height: '40px',
                backgroundColor: '#ff3b30', // Rouge vif pour l'alerte
                border: '3px solid white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                zIndex: 20
              }}
            >
              <span className="text-white text-[18px] font-[900]">
                {tile.count}
              </span>
            </div>
          )}

          {/* ICONE */}
          <div className="mt-auto flex justify-end">
            <div 
              className="w-12 h-12 rounded-[18px] flex items-center justify-center shadow-sm bg-white/20"
            >
              <tile.icon size={24} strokeWidth={2.5} color={tile.color} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
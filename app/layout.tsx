import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Link from "next/link"; // Nécessaire pour la nav mobile
import { Home, Users, HardHat, ClipboardList, Menu } from "lucide-react"; // Icônes pour le mobile

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "Altrad Dashboard",
  description: "Gestion de chantier v2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${fredoka.variable} font-sans antialiased bg-[#f0f3f4] overflow-hidden`}>
        
        {/* MISE EN PAGE GLOBALE : FLEXBOX */}
        <div className="flex h-screen w-full flex-col md:flex-row">
          
          {/* 1. MENU LATÉRAL (Visible uniquement sur PC/Tablette) */}
          <aside className="hidden md:block shrink-0 h-full w-64 border-r border-gray-200 bg-white">
             <Sidebar />
          </aside>

          {/* 2. CONTENU PRINCIPAL */}
          <main className="flex-1 h-full overflow-hidden relative flex flex-col">
            {/* Header Mobile (Optionnel, pour le titre) */}
            <div className="md:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-center shrink-0">
                <h1 className="text-lg font-black uppercase text-gray-800">Altrad <span className="text-blue-500">Board</span></h1>
            </div>

            {/* Zone de contenu scrollable */}
            <div className="flex-1 w-full overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24 md:pb-6">
              {children}
            </div>
          </main>

          {/* 3. TAB BAR MOBILE (Visible uniquement sur Mobile, fixée en bas) */}
          <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-white border-t border-gray-200 flex justify-around items-center z-50 pb-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Link href="/" className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Home size={24} />
              <span className="text-[10px] font-bold uppercase">Accueil</span>
            </Link>
            <Link href="/chantiers" className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <HardHat size={24} />
              <span className="text-[10px] font-bold uppercase">Chantiers</span>
            </Link>
            <Link href="/equipe" className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <Users size={24} />
              <span className="text-[10px] font-bold uppercase">Équipe</span>
            </Link>
            <Link href="/hse" className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <ClipboardList size={24} />
              <span className="text-[10px] font-bold uppercase">HSE</span>
            </Link>
          </nav>

        </div>

      </body>
    </html>
  );
}

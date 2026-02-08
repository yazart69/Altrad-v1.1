import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // On importe le menu

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
        <div className="flex h-screen w-full">
          
          {/* 1. MENU LATÉRAL (Visible partout) */}
          <aside className="hidden md:block shrink-0 h-full">
             <Sidebar />
          </aside>

          {/* 2. CONTENU PRINCIPAL (Change selon la page) */}
          <main className="flex-1 h-full overflow-hidden relative">
            {/* On ajoute un scroll interne pour le contenu */}
            <div className="h-full w-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {children}
            </div>
          </main>

        </div>

      </body>
    </html>
  );
}

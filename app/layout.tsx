import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

// Configuration de la police Fredoka
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // On charge toutes les épaisseurs utiles
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "Altrad Dashboard",
  description: "Dashboard de gestion de chantier",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      {/* On applique la classe de la police sur le body entier */}
      <body className={`${fredoka.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

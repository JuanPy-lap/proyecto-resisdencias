import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; // IMPORTANTE: export default, sin llaves {}

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "NGR Taller", template: "%s · NGR Taller" },
  description: "Expediente digital de tractocamiones: fotografías, inventario de ingreso, etiquetas QR y mapa del taller.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Navbar />
        {/* pb-24 deja espacio para la barra inferior en celular */}
        <main className="pb-24 md:pb-10">{children}</main>
      </body>
    </html>
  );
}

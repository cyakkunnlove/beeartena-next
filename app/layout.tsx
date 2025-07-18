import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/auth/AuthContext";
import PageTransition from "@/components/layout/PageTransition";

export const metadata: Metadata = {
  title: "BEE ART ENA - 理容師による安心のタトゥーメイクサロン",
  description: "理容師が行う1日1名限定のプレミアムタトゥーメイク。半年以内リタッチ11,000円の安心プラン。眉・頭皮の悩みを解決します。",
  keywords: "タトゥーメイク,眉,アートメイク,恵那,岐阜,理容師,BEE ART ENA",
  openGraph: {
    title: "BEE ART ENA - 理容師による安心のタトゥーメイクサロン",
    description: "理容師が行う1日1名限定のプレミアムタトゥーメイク",
    images: ["/images/topimageafter.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-grow">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
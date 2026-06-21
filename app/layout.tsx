import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { UserProvider } from "@/context/UserContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "일본어 퀴즈",
  description: "일본어 단어 학습 퀴즈",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geist.className} min-h-screen pb-20 md:pb-0`}>
        <UserProvider>
          <Navigation />
          <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}

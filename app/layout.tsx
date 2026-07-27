import type { Metadata } from "next";
import "./globals.css";

import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

import { ExpenseProvider } from "@/context/ExpenseContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { WalletProvider } from "@/context/WalletContext";
import { ProcessingProvider } from "@/context/ProcessingContext";
import { SWRProvider } from "@/app/components/SWRProvider";
import PwaRegistry from "@/app/components/PwaRegistry";
import RoomActivationRunner from "@/app/components/RoomActivationRunner";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kharche",
  description: "Manage your multi-currency expenses with style.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-inter">
        <PwaRegistry />
        <SWRProvider>
          <NotificationProvider>
            <RoomActivationRunner />
            <ProcessingProvider>
              <WalletProvider>
                <ExpenseProvider>{children}</ExpenseProvider>
              </WalletProvider>
            </ProcessingProvider>
          </NotificationProvider>
        </SWRProvider>
      </body>
    </html>
  );
}

import { Inter } from 'next/font/google';
import { SonnerProvider } from "@/components/sonner-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Time Tracker",
  description: "Track your time and earnings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background`}>
        {children}
        <SonnerProvider />
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import { getServerSession } from "next-auth";
import AppSessionProvider from "@/components/providers/AppSessionProvider";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cortex Council",
  description:
    "Assemble a faculty of machine minds and watch them debate in real time.",
  applicationName: "Cortex Council",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} min-h-screen bg-[#05101d] text-white antialiased`}
      >
        <AppSessionProvider session={session}>{children}</AppSessionProvider>
      </body>
    </html>
  );
}

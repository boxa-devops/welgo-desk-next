// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import MaintenancePage from "@/components/MaintenancePage";

export const metadata: Metadata = {
  title: "Welgo Desk",
  description: "AI-powered travel agency desk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE === "true";

  if (isMaintenanceMode) {
    return (
      <html lang="ru">
        <body>
          <MaintenancePage />
        </body>
      </html>
    );
  }

  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

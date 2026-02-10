"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="green"
      themes={["green", "light"]}
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}

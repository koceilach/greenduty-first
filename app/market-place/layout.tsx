"use client";

import React from "react";
import { MarketplaceAuthProvider } from "@/components/marketplace-auth-provider";

export default function MarketPlaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketplaceAuthProvider>
      <div className="gd-mp">{children}</div>
    </MarketplaceAuthProvider>
  );
}

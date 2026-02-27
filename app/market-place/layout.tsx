"use client";

import React from "react";
import { MarketplaceAuthProvider } from "@/components/marketplace-auth-provider";
import { MarketplaceAutoTranslate } from "@/components/marketplace-auto-translate";

export default function MarketPlaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketplaceAuthProvider>
      <div className="gd-mp" data-gd-marketplace-root="1">
        {children}
      </div>
      <MarketplaceAutoTranslate />
    </MarketplaceAuthProvider>
  );
}

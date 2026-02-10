"use client";

import React from "react";
import { MarketplaceAuthProvider } from "@/components/marketplace-auth-provider";

export default function MarketPlaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketplaceAuthProvider>{children}</MarketplaceAuthProvider>;
}

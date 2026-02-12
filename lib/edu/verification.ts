type VerificationResult = {
  status: "verified" | "needs_review" | "rejected"
  notes: string
}

export const verifyEduContentStub = (payload: { title: string; body?: string | null }) => {
  const combined = `${payload.title} ${payload.body ?? ""}`.toLowerCase()
  if (combined.includes("pesticide") && combined.includes("drink")) {
    return { status: "rejected", notes: "Unsafe advice detected." } as VerificationResult
  }
  if (combined.includes("cure") && combined.includes("climate")) {
    return { status: "needs_review", notes: "Requires expert review for claims." } as VerificationResult
  }
  return { status: "verified", notes: "No risks detected by AI." } as VerificationResult
}

export type VerificationType = "student" | "researcher"

export type VerificationRequest = {
  id: string
  userId: string
  type: VerificationType
  status: "pending" | "approved" | "rejected"
}

export async function submitVerificationStub(request: Omit<VerificationRequest, "id" | "status">) {
  return {
    ...request,
    id: `verify_${Date.now()}`,
    status: "pending",
  } as VerificationRequest
}

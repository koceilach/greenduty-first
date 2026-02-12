export type AccountRole =
  | "basic_account"
  | "pro_account"
  | "impact_account"
  | "academic_verified_account"
  | "admin"

export const planRoles: AccountRole[] = [
  "basic_account",
  "pro_account",
  "impact_account",
  "academic_verified_account",
]

export function isPaidRole(role: AccountRole | null | undefined) {
  return role === "pro_account" || role === "impact_account" || role === "academic_verified_account"
}

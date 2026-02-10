export type BillingInterval = "monthly" | "yearly"
export type CurrencyCode = "DZD" | "EUR" | "USD"

export type PaymentProvider =
  | "stripe"
  | "paypal"
  | "eccp_ccp"
  | "baridimob"
  | "edahabia"

export type PaymentIntent = {
  id: string
  provider: PaymentProvider
  amount: number
  currency: CurrencyCode
  status: "pending" | "succeeded" | "failed"
}

export async function createPaymentIntentStub(params: {
  provider: PaymentProvider
  amount: number
  currency: CurrencyCode
}) {
  const { provider, amount, currency } = params
  return {
    id: `stub_${provider}_${Date.now()}`,
    provider,
    amount,
    currency,
    status: "pending",
  } satisfies PaymentIntent
}

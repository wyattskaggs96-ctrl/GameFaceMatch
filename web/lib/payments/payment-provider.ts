import type { CheckoutRequest, CheckoutResult, PaymentStatus, ReceiptReference, RefundStatus, WebhookEvent } from "@/types/domain";

export interface PaymentProvider {
  readonly providerID: string;
  readonly displayName: string;
  readonly isLiveConfigured: boolean;
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutResult>;
  getPaymentStatus(receipt: ReceiptReference): Promise<PaymentStatus>;
  getRefundStatus(receipt: ReceiptReference): Promise<RefundStatus>;
  parseWebhookEvent(payload: unknown): Promise<WebhookEvent>;
}

export const PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE = "Payment is not connected yet.";

export function createUnavailablePaymentProvider(): PaymentProvider {
  return {
    providerID: "provider-unselected",
    displayName: "Provider not selected",
    isLiveConfigured: false,
    async createCheckoutSession() {
      return {
        status: "providerUnavailable",
        message: PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE
      };
    },
    async getPaymentStatus() {
      return "providerUnavailable";
    },
    async getRefundStatus() {
      return "unavailable";
    },
    async parseWebhookEvent() {
      throw new Error("Payment webhooks are unavailable until a provider is selected and configured.");
    }
  };
}

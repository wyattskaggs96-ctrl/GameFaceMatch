import type { CheckoutRequest, CheckoutResult, PaymentStatus, ReceiptReference, RefundStatus, WebhookEvent } from "@/types/domain";
import type { PricingOption } from "./pricing";

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
export const PURCHASE_RESTORATION_UNAVAILABLE_MESSAGE = "Purchase restoration is not connected yet.";

export interface SafePaymentAdapter {
  readonly provider: PaymentProvider;
  startCheckout(option: PricingOption, request: CheckoutRequest): Promise<CheckoutResult>;
  restorePurchase(receipt: ReceiptReference): Promise<CheckoutResult>;
}

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

export function createSafePaymentAdapter(provider: PaymentProvider = createUnavailablePaymentProvider()): SafePaymentAdapter {
  return {
    provider,
    async startCheckout(option, request) {
      if (!provider.isLiveConfigured) {
        return {
          status: "providerUnavailable",
          message: `${PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE} ${option.unavailableReason}`
        };
      }
      if (!option.checkoutEnabled) {
        return {
          status: "providerUnavailable",
          message: "Checkout is disabled for this offer until provider setup and production gates are complete."
        };
      }
      return provider.createCheckoutSession(request);
    },
    async restorePurchase(receipt) {
      if (!provider.isLiveConfigured) {
        return {
          status: "providerUnavailable",
          message: PURCHASE_RESTORATION_UNAVAILABLE_MESSAGE
        };
      }
      const paymentStatus = await provider.getPaymentStatus(receipt);
      return {
        status: paymentStatus,
        providerReference: receipt.id,
        message:
          paymentStatus === "paid"
            ? "Purchase restoration succeeded through the configured payment provider."
            : "Purchase restoration did not produce an active entitlement."
      };
    }
  };
}

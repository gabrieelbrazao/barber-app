/**
 * The Stripe SDK reaches into react-native internals, which breaks the web
 * bundle at build time. Web has no deposits, so it gets inert stand-ins.
 */
export function StripeProvider({ children }: { children: React.ReactElement }) {
  return children;
}

export function useStripe() {
  return {
    initPaymentSheet: async () => ({ error: { message: 'Pagamento indisponível na web.' } }),
    presentPaymentSheet: async () => ({ error: { message: 'Pagamento indisponível na web.' } }),
  };
}

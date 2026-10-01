import { Redirect } from "expo-router";

// legalfinder://payment-result closes the Pesapal checkout (lib/payments.ts then reads the real
// status from the database), and +native-intent stops the router acting on it while the app is
// running. The router only lands here on a cold start — Android killed the app while the checkout
// was open — so show Payments, where that payment's status is.
export default function PaymentResult() {
  return <Redirect href="/payments" />;
}

import { Redirect } from "expo-router";

// Same as sso-callback: legalfinder://payment-result closes the Pesapal sheet (lib/payments.ts
// then reads the real status from the database); if the router sees it, go to Payments.
export default function PaymentResult() {
  return <Redirect href="/payments" />;
}

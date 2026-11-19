/**
 * Twin of src/lib/kyc/provider.ts — noop until a NIRA/liveness vendor is wired.
 */
export type KycProviderResult = {
  status: "skipped" | "passed" | "failed";
  vendorRef?: string;
  detail?: string;
};

export interface KycProvider {
  verifyIdentity(input: {
    userId: string;
    nationalId: string;
    selfiePath: string;
    idDocPath: string;
  }): Promise<KycProviderResult>;
}

export const noopKycProvider: KycProvider = {
  async verifyIdentity() {
    return { status: "skipped" };
  },
};

export function getKycProvider(): KycProvider {
  return noopKycProvider;
}

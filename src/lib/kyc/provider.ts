/**
 * Narrow hook for a future NIRA / liveness vendor. Today every call returns `skipped` so
 * in-house admin review remains the only gate. Swap `noopKycProvider` for a real
 * implementation (and env keys) without changing the application schema.
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

/** Active provider — replace when a vendor is wired. */
export function getKycProvider(): KycProvider {
  return noopKycProvider;
}

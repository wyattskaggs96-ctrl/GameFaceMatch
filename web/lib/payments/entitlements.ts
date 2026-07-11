import type { CustomerAccess, Entitlement, EntitlementAccess } from "@/types/domain";

export interface EntitlementService {
  getDefaultAccess(): CustomerAccess;
  hasAccess(access: CustomerAccess, entitlement: EntitlementAccess): boolean;
  grantEntitlement(access: CustomerAccess, entitlement: EntitlementAccess): CustomerAccess;
  revokeEntitlement(access: CustomerAccess, entitlement: EntitlementAccess): CustomerAccess;
}

export const ENTITLEMENTS: Record<EntitlementAccess, Entitlement> = {
  basicFreeMatch: {
    id: "basicFreeMatch",
    label: "Basic free match",
    description: "Access to the local capture and catalog-unavailable MVP flow without an account.",
    includedByDefault: true
  },
  topThreeResults: {
    id: "topThreeResults",
    label: "Top-three results",
    description: "Future access to verified top-three recommendations after a production catalog exists.",
    includedByDefault: false
  },
  detailedBuildGuide: {
    id: "detailedBuildGuide",
    label: "Detailed build guide",
    description: "Future access to verified step-by-step game instructions.",
    includedByDefault: false
  },
  screenshotRefinement: {
    id: "screenshotRefinement",
    label: "Screenshot refinement",
    description: "Future access to refinement once real comparison logic and verified catalog data exist.",
    includedByDefault: false
  },
  savedProfiles: {
    id: "savedProfiles",
    label: "Saved profiles",
    description: "Future access to optional saved derived profiles without raw face media by default.",
    includedByDefault: false
  },
  multiGameAccess: {
    id: "multiGameAccess",
    label: "Multi-game access",
    description: "Future access to additional verified sports-game adapters.",
    includedByDefault: false
  }
};

export function createLocalEntitlementService(): EntitlementService {
  return {
    getDefaultAccess() {
      return {
        status: "freeAccess",
        entitlementIDs: Object.values(ENTITLEMENTS)
          .filter((entitlement) => entitlement.includedByDefault)
          .map((entitlement) => entitlement.id),
        receiptReferences: []
      };
    },
    hasAccess(access, entitlement) {
      return access.entitlementIDs.includes(entitlement);
    },
    grantEntitlement(access, entitlement) {
      return access.entitlementIDs.includes(entitlement)
        ? access
        : { ...access, status: "entitled", entitlementIDs: [...access.entitlementIDs, entitlement] };
    },
    revokeEntitlement(access, entitlement) {
      return { ...access, entitlementIDs: access.entitlementIDs.filter((id) => id !== entitlement) };
    }
  };
}

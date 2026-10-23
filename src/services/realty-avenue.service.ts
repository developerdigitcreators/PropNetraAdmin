import { axiosClient } from "@/lib/axios-client";

export type RealtyAvenueBranding = {
  companyName: string;
  logoUrl: string | null;
};

function asBranding(raw: unknown): RealtyAvenueBranding {
  const outer = (raw ?? {}) as Record<string, unknown>;
  const body = (
    outer.data && typeof outer.data === "object" ? outer.data : outer
  ) as Record<string, unknown>;
  const logo = typeof body.logoUrl === "string" ? body.logoUrl.trim() : "";
  return {
    companyName: String(body.companyName || "Realty Avenue"),
    logoUrl: logo || null,
  };
}

export const realtyAvenueService = {
  get: async (): Promise<RealtyAvenueBranding> => {
    const response = await axiosClient.get("/admin/settings/realty-avenue");
    return asBranding(response.data);
  },

  setLogo: async (logoUrl: string | null): Promise<RealtyAvenueBranding> => {
    const response = await axiosClient.put("/admin/settings/realty-avenue", {
      logoUrl,
    });
    return asBranding(response.data);
  },
};

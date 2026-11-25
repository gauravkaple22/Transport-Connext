import { cache } from "react";
import { isSignedInAdmin } from "./admin";
import { isSignedInCompany } from "./company";
import { isSignedInDriver } from "./driver";
import type { AccountRole } from "./account-roles";

export const signedInAccountRole = cache(async (): Promise<AccountRole | null> => {
  if (await isSignedInCompany()) return "company";
  if (await isSignedInDriver()) return "driver";
  if (await isSignedInAdmin()) return "admin";
  return null;
});

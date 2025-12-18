export type AppRole =
  | "admin"
  | "dealflow_manager"
  | "dealflow_analyst"
  | "ic_member"
  | "ic_chair"
  | "investor"
  | "founder";

export const INTERNAL_ROLES: AppRole[] = ["admin","dealflow_manager","dealflow_analyst","ic_member","ic_chair"];

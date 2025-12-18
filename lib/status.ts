export type DealStatus =
  | "draft"
  | "submitted"
  | "screening_in_progress"
  | "screening_approved"
  | "screening_rejected"
  | "ic_in_review"
  | "ic_rejected"
  | "published"
  | "archived";

export const INVESTOR_VISIBLE: DealStatus[] = ["published"];

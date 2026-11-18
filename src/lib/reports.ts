export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "violence", label: "Violence or threats" },
  { value: "sexual", label: "Sexual or nudity" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportStatus = "open" | "resolved" | "dismissed";
export type ReportType = "post" | "user";

export interface ReportDoc {
  _id?: string;
  type: ReportType;
  targetId: string;
  targetUserId?: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  time: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

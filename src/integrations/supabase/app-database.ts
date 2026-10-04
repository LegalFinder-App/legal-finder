import type { Database as BaseDatabase, Json } from "./types";

export type CaseOutcome = "won" | "lost" | "settled" | "dismissed" | "withdrawn" | "other";
export type CaseDeadlineType = "filing" | "statute_of_limitations" | "hearing" | "other";
export type CaseDeadlineStatus = "upcoming" | "completed" | "missed";
export type LawyerLicenseStatus = "active" | "expiring" | "expired" | "unknown";

type CaseDeadlineRow = {
  id: string;
  case_id: string;
  title: string;
  deadline_type: CaseDeadlineType;
  due_date: string;
  status: CaseDeadlineStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type LawyerCpdRecordRow = {
  id: string;
  lawyer_id: string;
  title: string;
  hours: number;
  completed_on: string;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  table_name: string;
  action: string;
  record_id: string | null;
  before_data: Json | null;
  after_data: Json | null;
  metadata: Json | null;
  created_at: string;
};

export type PayoutStatus = "not_applicable" | "pending" | "processing" | "completed" | "failed";

type PaymentRow = {
  id: string;
  appointment_id: string | null;
  client_id: string;
  lawyer_id: string | null;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  pesapal_order_tracking_id: string | null;
  pesapal_merchant_reference: string | null;
  payout_status: PayoutStatus;
  flutterwave_transfer_id: string | null;
  flutterwave_transfer_reference: string | null;
  payout_failure_reason: string | null;
  paid_out_at: string | null;
  created_at: string;
  updated_at: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  device_name: string | null;
  platform: string;
  enabled: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

// Native app (Expo) push tokens — 20260930120000_mobile_push_notifications.sql.
type DevicePushTokenRow = {
  id: string;
  user_id: string;
  token: string;
  platform: "ios" | "android";
  device_name: string | null;
  created_at: string;
  updated_at: string;
};

// Reporting and blocking — 20261004120000_reports_and_blocks.sql. excerpt, reported_user_id, status
// and the handled_* fields are set by the database, whatever the reporter sends.
export type ReportTargetType = "message" | "review" | "user";
export type ReportReason = "harassment" | "spam" | "offensive" | "fraud" | "other";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type ContentReportRow = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reported_user_id: string | null;
  reason: ReportReason;
  details: string | null;
  excerpt: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
};
type UserBlockRow = { blocker_id: string; blocked_id: string; created_at: string };

export type AppDatabase = Omit<BaseDatabase, "public"> & {
  public: Omit<BaseDatabase["public"], "Tables"> & {
    Tables: Omit<BaseDatabase["public"]["Tables"], "cases" | "lawyers"> & {
      cases: Omit<BaseDatabase["public"]["Tables"]["cases"], "Row" | "Insert" | "Update"> & {
        Row: BaseDatabase["public"]["Tables"]["cases"]["Row"] & { outcome: CaseOutcome | null };
        Insert: BaseDatabase["public"]["Tables"]["cases"]["Insert"] & {
          outcome?: CaseOutcome | null;
        };
        Update: BaseDatabase["public"]["Tables"]["cases"]["Update"] & {
          outcome?: CaseOutcome | null;
        };
      };
      lawyers: Omit<BaseDatabase["public"]["Tables"]["lawyers"], "Row" | "Insert" | "Update"> & {
        Row: BaseDatabase["public"]["Tables"]["lawyers"]["Row"] & {
          bar_license_expires_at: string | null;
          license_status: LawyerLicenseStatus;
        };
        Insert: BaseDatabase["public"]["Tables"]["lawyers"]["Insert"] & {
          bar_license_expires_at?: string | null;
          license_status?: LawyerLicenseStatus;
        };
        Update: BaseDatabase["public"]["Tables"]["lawyers"]["Update"] & {
          bar_license_expires_at?: string | null;
          license_status?: LawyerLicenseStatus;
        };
      };
      case_deadlines: {
        Row: CaseDeadlineRow;
        Insert: {
          id?: string;
          case_id: string;
          title: string;
          deadline_type?: CaseDeadlineType;
          due_date: string;
          status?: CaseDeadlineStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          title?: string;
          deadline_type?: CaseDeadlineType;
          due_date?: string;
          status?: CaseDeadlineStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lawyer_cpd_records: {
        Row: LawyerCpdRecordRow;
        Insert: {
          id?: string;
          lawyer_id: string;
          title: string;
          hours: number;
          completed_on: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lawyer_id?: string;
          title?: string;
          hours?: number;
          completed_on?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          actor_role?: string | null;
          table_name: string;
          action: string;
          record_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          actor_role?: string | null;
          table_name?: string;
          action?: string;
          record_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: PaymentRow;
        Insert: {
          id?: string;
          appointment_id?: string | null;
          client_id: string;
          lawyer_id?: string | null;
          amount: number;
          currency?: string;
          status?: string;
          description?: string | null;
          pesapal_order_tracking_id?: string | null;
          pesapal_merchant_reference?: string | null;
          payout_status?: PayoutStatus;
          flutterwave_transfer_id?: string | null;
          flutterwave_transfer_reference?: string | null;
          payout_failure_reason?: string | null;
          paid_out_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string | null;
          client_id?: string;
          lawyer_id?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          description?: string | null;
          pesapal_order_tracking_id?: string | null;
          pesapal_merchant_reference?: string | null;
          payout_status?: PayoutStatus;
          flutterwave_transfer_id?: string | null;
          flutterwave_transfer_reference?: string | null;
          payout_failure_reason?: string | null;
          paid_out_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_secret: string;
          device_name?: string | null;
          platform?: string;
          enabled?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth_secret?: string;
          device_name?: string | null;
          platform?: string;
          enabled?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_reports: {
        Row: ContentReportRow;
        Insert: {
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: ReportReason;
          details?: string | null;
        };
        Update: {
          status?: ReportStatus;
          resolution_note?: string | null;
          handled_by?: string | null;
          handled_at?: string | null;
        };
        Relationships: [];
      };
      user_blocks: {
        Row: UserBlockRow;
        Insert: { blocker_id: string; blocked_id: string; created_at?: string };
        Update: Partial<UserBlockRow>;
        Relationships: [];
      };
      device_push_tokens: {
        Row: DevicePushTokenRow;
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: "ios" | "android";
          device_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: "ios" | "android";
          device_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
  };
};

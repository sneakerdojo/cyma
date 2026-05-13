CREATE TABLE "profile_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target_profile_id" uuid,
	"target_hash" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profile_consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"granted" boolean NOT NULL,
	"channel" text NOT NULL,
	"consent_text_hash" text NOT NULL,
	"transcript_snippet" text,
	"ip_or_caller_id_hash" text,
	"granted_at" timestamp with time zone DEFAULT now(),
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"source" text NOT NULL,
	"confidence" text DEFAULT '1.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"value_hash" text NOT NULL,
	"value" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone DEFAULT now(),
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"display_name" text,
	"summary" text,
	"preferred_channel" text,
	"identity_confidence" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone DEFAULT now(),
	"summary_updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profile_consent" ADD CONSTRAINT "profile_consent_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_facts" ADD CONSTRAINT "profile_facts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_identifiers" ADD CONSTRAINT "profile_identifiers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_audit_tenant_action_idx" ON "profile_audit_log" USING btree ("tenant_id","action","created_at");--> statement-breakpoint
CREATE INDEX "profile_consent_profile_idx" ON "profile_consent" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_facts_profile_id_category_idx" ON "profile_facts" USING btree ("profile_id","category");--> statement-breakpoint
CREATE INDEX "profile_facts_tenant_expires_idx" ON "profile_facts" USING btree ("tenant_id","expires_at");--> statement-breakpoint
CREATE INDEX "profile_identifiers_lookup_idx" ON "profile_identifiers" USING btree ("tenant_id","kind","value_hash");--> statement-breakpoint
CREATE INDEX "profile_identifiers_profile_id_idx" ON "profile_identifiers" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profiles_tenant_id_last_seen_at_idx" ON "profiles" USING btree ("tenant_id","last_seen_at");
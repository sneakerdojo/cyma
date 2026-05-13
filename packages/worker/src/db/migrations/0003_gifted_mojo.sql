CREATE TABLE IF NOT EXISTS "ab_test_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"test_name" text NOT NULL,
	"variant" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emails_sent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_email" text NOT NULL,
	"email_type" text NOT NULL,
	"session_id" text,
	"booking_id" uuid,
	"sent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_session_test_idx" ON "ab_test_assignments" USING btree ("session_id","test_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_sent_contact_email_type_idx" ON "emails_sent" USING btree ("contact_email","email_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emails_sent_booking_id_idx" ON "emails_sent" USING btree ("booking_id");
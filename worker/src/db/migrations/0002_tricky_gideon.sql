CREATE TABLE IF NOT EXISTS "conversation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"step_id" text,
	"action" text NOT NULL,
	"value" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_events_session_id_idx" ON "conversation_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_events_action_idx" ON "conversation_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_events_created_at_idx" ON "conversation_events" USING btree ("created_at");
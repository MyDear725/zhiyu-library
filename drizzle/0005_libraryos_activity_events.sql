CREATE TABLE `activity_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer REFERENCES users(id) ON DELETE CASCADE,
  `event_type` text NOT NULL,
  `entity_type` text,
  `entity_id` text,
  `metadata_json` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_events_user_created` ON `activity_events` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_activity_events_type_created` ON `activity_events` (`event_type`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_activity_events_entity` ON `activity_events` (`entity_type`,`entity_id`);

CREATE TABLE `study_intents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`booking_date` text NOT NULL,
	`time_slot` text NOT NULL,
	`purpose` text NOT NULL,
	`topic` text,
	`recommended_floor` text NOT NULL,
	`recommended_zone` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_study_intents_user_slot` ON `study_intents` (`user_id`,`booking_date`,`time_slot`);--> statement-breakpoint
CREATE INDEX `idx_study_intents_matching` ON `study_intents` (`booking_date`,`time_slot`,`purpose`,`topic`);
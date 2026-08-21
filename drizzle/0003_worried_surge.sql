CREATE TABLE `community_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`room` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_community_messages_room_id` ON `community_messages` (`room`,`id`);--> statement-breakpoint
CREATE TABLE `community_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`items_json` text NOT NULL,
	`total_cents` integer NOT NULL,
	`delivery_floor` text NOT NULL,
	`delivery_seat` text NOT NULL,
	`status` text DEFAULT 'preparing' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_community_orders_user_created` ON `community_orders` (`user_id`,`created_at`);
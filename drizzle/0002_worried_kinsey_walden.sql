ALTER TABLE `appointments` ADD `cancellation_token` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `reminder_sent_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `appointments_cancellation_token_unique` ON `appointments` (`cancellation_token`);
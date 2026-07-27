CREATE TABLE `appointment_slots` (
	`appointment_date` text NOT NULL,
	`slot_time` text NOT NULL,
	`appointment_reference` text NOT NULL,
	PRIMARY KEY(`appointment_date`, `slot_time`)
);
--> statement-breakpoint
CREATE INDEX `appointment_slots_reference_idx` ON `appointment_slots` (`appointment_reference`);
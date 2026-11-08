CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`record` text,
	`before` text,
	`after` text,
	`time` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `records_kind` ON `records` (`kind`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`responder` text PRIMARY KEY NOT NULL,
	`task` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_task_unique` ON `reservations` (`task`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`expires` integer NOT NULL
);

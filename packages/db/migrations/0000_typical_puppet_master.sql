CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_stats` (
	`site_id` text NOT NULL,
	`date` text NOT NULL,
	`pageviews` integer DEFAULT 0 NOT NULL,
	`visitors` integer DEFAULT 0 NOT NULL,
	`top_pages` text DEFAULT '[]' NOT NULL,
	`top_referrers` text DEFAULT '[]' NOT NULL,
	`top_countries` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_stats_site_date_unq` ON `daily_stats` (`site_id`,`date`);--> statement-breakpoint
CREATE TABLE `digest_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`email` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `digest_sub_site_email_unq` ON `digest_subscriptions` (`site_id`,`email`);--> statement-breakpoint
CREATE INDEX `digest_sub_site_idx` ON `digest_subscriptions` (`site_id`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`account_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_domain_unq` ON `sites` (`domain`);--> statement-breakpoint
CREATE INDEX `sites_account_idx` ON `sites` (`account_id`);
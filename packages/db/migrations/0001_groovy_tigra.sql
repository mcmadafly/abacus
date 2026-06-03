ALTER TABLE `accounts` ADD `plan` text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `subscription_status` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `stripe_subscription_id` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `current_period_end` integer;
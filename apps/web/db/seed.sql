-- Offline demo data for local dashboard work.
-- Fills the last 30 days of `daily_stats` for EVERY site already in D1, so after
-- you create a site in the UI you can run `bun run db:seed` and see charts even
-- without a live Analytics Engine connection. Safe to run repeatedly.
--
-- Note: the per-cell counts use independent random() calls, so the breakdown
-- totals won't sum exactly to `pageviews` — fine for demo visuals.

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT OR IGNORE INTO daily_stats
  (site_id, date, pageviews, visitors, top_pages, top_referrers, top_countries)
SELECT
  s.id,
  date('now', '-' || days.n || ' days'),
  (80 + (abs(random()) % 480)),
  (50 + (abs(random()) % 300)),
  json('[{"name":"/","count":420},{"name":"/pricing","count":210},{"name":"/docs","count":120},{"name":"/blog/launch","count":80}]'),
  json('[{"name":"Direct","count":300},{"name":"google.com","count":210},{"name":"x.com","count":95},{"name":"news.ycombinator.com","count":60}]'),
  json('[{"name":"US","count":350},{"name":"GB","count":120},{"name":"DE","count":80},{"name":"CA","count":60}]')
FROM sites s
CROSS JOIN days;

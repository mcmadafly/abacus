-- The "live demo" site: Abacus tracking its own marketing site.
-- New users are shown this dashboard before adding their own domain. The
-- marketing pages carry the embed snippet with data-domain="abacuslytics.com", so
-- real visits flow into Analytics Engine; the rows below give the dashboard a
-- populated 30-day history (and act as the offline/D1 fallback locally).
-- Idempotent — safe to run repeatedly.

INSERT OR IGNORE INTO accounts (id, email) VALUES ('demo_account', 'demo@abacuslytics.com');
INSERT OR IGNORE INTO sites (id, domain, account_id) VALUES ('demo', 'abacuslytics.com', 'demo_account');

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT OR IGNORE INTO daily_stats
  (site_id, date, pageviews, visitors, top_pages, top_referrers, top_countries)
SELECT
  'demo',
  date('now', '-' || days.n || ' days'),
  (900 + (abs(random()) % 700)),
  (560 + (abs(random()) % 420)),
  json('[{"name":"/","count":3820},{"name":"/pricing","count":1240},{"name":"/docs","count":910},{"name":"/blog/privacy-first","count":760},{"name":"/sign-up","count":530}]'),
  json('[{"name":"Google","count":4210},{"name":"Direct","count":2840},{"name":"github.com","count":1420},{"name":"x.com","count":980},{"name":"news.ycombinator.com","count":610}]'),
  json('[{"name":"US","count":5200},{"name":"GB","count":1800},{"name":"DE","count":1200},{"name":"CA","count":1000},{"name":"FR","count":740}]')
FROM days;

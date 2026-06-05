Google Analytics is the default. It's free, it's everywhere, and for years it was the obvious thing to paste into your `<head>`. But "free" has a price, and the migration to GA4 made a lot of people stop and ask what they're actually getting. This is an honest look at how Abacus compares — including where Google still wins.

### Why Google Analytics is free

Google doesn't sell you analytics; it sells advertising. GA exists to make the ad business smarter, and the data it gathers about your visitors flows into that larger machine. That's not a conspiracy — it's the business model. If you're comfortable with it, GA's depth is genuinely impressive. If you're not, no amount of configuration fully opts you out.

### The things people actually struggle with

- **GA4 is hard.** The move from Universal Analytics to an event-based model left a lot of people staring at reports they no longer recognized. Simple questions — "how many people visited this page?" — now take real effort.
- **Cookie banners.** Because GA collects personal data and uses cookies, you generally need consent. That means a banner, and banners mean a large chunk of visitors who decline — so your numbers are incomplete anyway.
- **Sampling and thresholds.** On busy or small sites alike, GA may sample data or hide rows to protect identity, so the numbers you see aren't always the whole story.
- **Legal grey areas.** Several European regulators have questioned whether sending EU visitor data to Google is lawful at all. That uncertainty is a cost even if you never get a letter.

### What Abacus does differently

Abacus measures the same fundamentals — pageviews, unique visitors, top pages, sources, countries, devices — without cookies and without collecting personal data. There's no banner to show, nothing sampled, and nothing sent to an ad network. And every morning it emails you a clean, readable summary, so you don't have to log in to know how yesterday went.

|  | Abacus | Google Analytics 4 |
| --- | --- | --- |
| Cookies | None | Yes |
| Consent banner needed | Generally no | Generally yes |
| Personal data collected | None | Yes |
| Data used for ads | Never | Yes |
| Script size | Under 1 KB | ~50 KB+ |
| Learning curve | Minutes | Steep |
| Daily email report | Built in | No |
| Open source | Yes (AGPL) | No |
| Price | Free, then from $9/mo | Free |

### When Google Analytics is still the right call

We'd rather you pick the right tool than just pick us. Stick with GA if you need deep funnel and e-commerce attribution wired into Google Ads, multi-touch conversion modeling, or you're running a large analytics team that already lives in BigQuery. GA's ceiling is higher because its scope is enormous.

### When Abacus is the better fit

Choose Abacus if you want to know how your site is doing in ten seconds, you'd like to skip the cookie banner, you care about your visitors' privacy, and you'd rather read a short daily email than learn a reporting language. For most blogs, SaaS marketing sites, docs, and small businesses, that's the whole job — and a 1 KB script does it without following anyone around the web.

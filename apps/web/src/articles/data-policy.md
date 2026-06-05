### Design principle: anonymous by construction

Abacus is built so that we _can't_ identify your visitors, not just that we promise not to. There are no cookies, no device fingerprints stored, and no raw IP addresses kept. Anonymity isn't a setting you turn on — it's the only way the system works. The tracker is open source, so you can verify every claim below: [read the code](https://github.com/mcmadafly/abacus).

### What the tracker sends

The Abacus script is a few hundred bytes. On each pageview it sends a single request containing:

| Field | Example | Why |
| --- | --- | --- |
| Domain | `yourdomain.com` | Routes the event to your site |
| Path | `/pricing` | Top-pages report |
| Referrer | `google.com` | Traffic-sources report |
| Screen width | `1280` | Device-type breakdown |

The script reads no cookies, writes no cookies, and uses no local storage on the visitor's device. It hooks the History API so single-page-app route changes are counted, and nothing else.

### What the server derives

From the incoming request, our edge worker derives a few more fields and then discards the raw inputs:

- **Country** — from Cloudflare's edge geolocation. We keep the country; we never store the IP.
- **Browser / OS / device** — parsed from the User-Agent string, which is then discarded.
- **Visitor hash** — a salted, one-way hash used only to deduplicate unique visitors.

#### How the visitor hash works

To count "unique visitors" without identifying anyone, we compute `hash(daily_salt + ip + user_agent + domain)`. Three properties make this safe:

- It's a **one-way** cryptographic hash — you can't recover the IP or User-Agent from it.
- The **salt rotates every day**, so the same visitor produces a different hash tomorrow. We can count uniques within a day, but not follow anyone over time.
- It includes your **domain**, so the same person on two different Abacus sites never collides into a cross-site profile.

### Where data lives

Raw events are written to Cloudflare's Analytics Engine and rolled up nightly into daily aggregates (pageviews, visitors, top pages, sources, countries) stored in a Cloudflare D1 database. Your dashboard and daily email read from those aggregates. Everything runs on Cloudflare's network.

### Retention

- **Raw events** are short-lived and used only to build the daily rollup.
- **Daily aggregates** are retained for the life of your account so your trends stay intact.
- Deleting a site or your account removes the associated aggregates.

### Data ownership and export

Your stats belong to you. You can view them in the dashboard, receive them by email, and request an export at any time. Because Abacus is [open source](https://github.com/mcmadafly/abacus) (AGPL-3.0), you can also self-host the entire stack and keep every byte on your own infrastructure.

### Questions

For anything not covered here, email [hello@abacuslytics.com](mailto:hello@abacuslytics.com). See also our [Privacy Policy](/privacy).

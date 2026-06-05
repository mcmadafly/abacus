### The short version

- We do **not** use cookies or any other persistent identifier on the sites you measure.
- We do **not** collect or store personal data about your visitors.
- We do **not** sell, rent, or share data with advertisers — ever.
- We do **not** track your visitors across sites or build profiles of them.
- Your analytics data is yours. We only use it to show you your dashboard and email your reports.

### Who this covers

This policy applies to two groups of people: the **account holders** who sign up for Abacus, and the **visitors** to the websites those account holders measure. We treat both with care, but we collect very different things from each.

### What we collect from your website's visitors

When someone visits a site running the Abacus script, we record an anonymous, aggregate-only pageview. For each pageview we may process:

- The page URL (path and query string, minus anything that looks like a token)
- The referring URL or source
- The browser, operating system, and device type (derived from the User-Agent)
- The country, derived from the IP address at request time
- The screen size bucket

We do **not** store IP addresses, and we do **not** set cookies or use local storage on your visitors' devices. To count unique visitors without identifying anyone, we compute a one-way salted hash from the IP address, User-Agent, and your site's domain. The salt **rotates every day**, so the hash cannot be reversed, linked across days, or used to follow a person from one site to another. Because we never store personal data and never set a cookie, sites using Abacus generally do not need a cookie consent banner — though you should confirm your own obligations.

### What we collect from account holders

When you sign up for an Abacus account, we store:

- Your email address and authentication details (handled by our auth provider, Clerk)
- The domains you've registered and your dashboard settings
- Billing details, if you're on a paid plan (handled by our payment processor, Stripe — we never see your full card number)

### How we use it

- To render your analytics dashboard
- To email you the daily report you signed up for (and the occasional important account email)
- To bill you correctly if you're on a paid plan
- To keep the service secure and working

You can unsubscribe from the daily report at any time from the dashboard or the link in any email.

### Sub-processors

We rely on a small set of vendors to run Abacus. They only ever see the minimum needed to do their job:

| Vendor | Purpose |
| --- | --- |
| Cloudflare | Hosting, edge compute, and analytics storage |
| Clerk | Account sign-in and authentication |
| Stripe | Subscription billing (paid plans only) |
| Resend | Sending your report and account emails |

### Your rights

You can access, export, or delete your account data at any time. Deleting your account removes your sites and aggregate stats. Visitor data is anonymous and aggregate by design, so there is no personal record to request or erase — there is nothing tied to an individual to begin with.

### Questions

Email us at [hello@abacuslytics.com](mailto:hello@abacuslytics.com) and a real person will reply. For the technical specifics of what we measure and how, see the [Data Policy](/data-policy).

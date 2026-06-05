Every developer has had the thought: _analytics is just counting requests — I'll log pageviews to a table and write a query._ It's true, and for a weekend it's even fun. The trouble is that the weekend version is the easy 20%. Here's the 80% that shows up later, and how to decide whether it's worth your time.

### The seductive first version

A homegrown analytics setup usually starts like this: a tiny endpoint that inserts a row per request, a `pageviews` table, and a couple of `GROUP BY` queries. It works immediately, costs nothing, and you own every byte. If your needs never grow past "how many hits did this page get," you may genuinely be done — and that's a legitimate choice.

### What you discover in month two

- **Unique visitors are hard.** Counting _people_ instead of _requests_ means deduplication. Do it with a cookie and you've just signed yourself up for a consent banner. Do it privately and you're now designing a salted, rotating hash scheme — and getting it wrong leaks data.
- **Bots are everywhere.** A surprising fraction of raw traffic is crawlers and scanners. Without filtering, your "growth" is mostly robots.
- **Parsing is endless.** User-Agent strings, referrer normalization (so `google.com` and `www.google.com/` are one source), UTM handling, country lookup from IP — each is a small project.
- **Raw rows don't scale.** One row per pageview is fine until it isn't. Then you need rollups, retention policies, and indexes, or your queries crawl and your bill climbs.
- **Privacy is a feature you have to build.** "Don't store the IP" sounds simple but touches your whole pipeline, and it's exactly the part that gets you in trouble if it's wrong.
- **Then someone wants a dashboard.** And charts. And a weekly email. Now you're building a product, not a query.

### The real cost isn't the code — it's the upkeep

The first version takes a weekend. The maintained version takes a slice of your attention forever: the schema migration when you add a metric, the 2 a.m. page when the ingest endpoint falls over, the afternoon lost to "why don't these two numbers match." None of it ships your actual product. That ongoing tax is the thing the build-it-yourself estimate always forgets.

|  | Abacus | Roll your own |
| --- | --- | --- |
| Time to first chart | Minutes | A weekend, then ongoing |
| Unique-visitor counting | Solved (rotating hash) | You design it |
| Bot filtering | Built in | You maintain it |
| Cookie/consent risk | Avoided by design | Easy to get wrong |
| Dashboard & email | Included | Another project |
| Who fixes it at 2 a.m. | Us | You |
| Ownership of the code | Open source (AGPL) | Total |

### When rolling your own is the right move

Sometimes it genuinely is. Build it yourself if analytics _is_ your product, if you have data-residency or schema requirements no vendor meets, or if your needs are so narrow that a single query truly covers them and always will. In those cases the control is worth the maintenance.

### The middle path

Here's the thing people miss: with Abacus you don't have to choose between "someone else's black box" and "build everything." Abacus is [open source](https://github.com/mcmadafly/abacus) under AGPL-3.0. You can self-host the entire stack, read exactly how the hashing and rollups work, and modify it — all the ownership of a homegrown system, none of the blank-page cost. Or use our hosted version, skip the upkeep entirely, and get the daily email for the price of a coffee.

Counting pageviews is easy. Running analytics is not. The question isn't whether you _could_ build it — you obviously could. It's whether maintaining it forever is the best use of the time you'd rather spend on the thing you're actually trying to grow.

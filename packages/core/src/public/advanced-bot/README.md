# Advanced Bot interface preview

Run `python3 -m http.server 8000` in this folder and open the local address in a browser.

This is a **simulation**, not a Deriv connection: market data, payouts, account balance and trades are simulated. It does not authenticate to Deriv or place real orders. Historical hit rates are not predictions or a guarantee of profit, and payouts are illustrative.

## Demo staking and stop rules
- Flat: use the entered base stake.
- Martingale: multiply the base stake for each loss, up to the configured number of increases; after a loss at the maximum step or a win, return to base. Loss streak remains independent of the step counter.
- Stakelist: advance after a loss; reset to the first item after a win or a loss at the last item.
- Auto-stake: use the chosen percentage of the currently available simulated balance, rounded to cents. The calculated stake must be at least 0.35 USD and no greater than the available balance.
- Stop limits: 0 disables each limit. P&L and consecutive-loss limits are assessed after settlement. The trade-count limit prevents additional entries and allows the last simulated contract to settle. Stopping manually cancels the simulated pending trade and returns its stake. Session Reset clears session statistics and progression, but does not restore the simulated account balance.

Stop thresholds may be exceeded by a settled loss. Martingale can cause stakes and losses to escalate quickly. A real exchange's limits, payouts, market feed, execution, authentication, and account behavior would need separate integration and testing.

## Scanner selections
Choose contract types and optional comma-separated barrier/digit lists, plus the simulated markets to include. Empty digit fields scan all valid choices. Changing filters during AI execution pauses new entries, permits any existing simulated contract to settle, and rescans before applying a selected signal. The ranking is an observed historical hit rate only; it does not incorporate live quoted payouts or establish a statistical or profitable edge.

## Screen sizes
The three independently scrollable, resizable panels remain side by side on all screen sizes. On a phone the desktop layout is scaled to fit; landscape orientation offers more readable controls, and pinch-to-zoom can help. Use the Phone preview button on desktop to try an interactive portrait or landscape phone-sized session. That preview is a separate simulation and is reset when closed. The app uses simulated data and orders at all screen sizes.

## Adding the visual preview to an existing site
For projects with a `public` directory, copy this folder into `public/advanced-bot/` and link to `/advanced-bot/index.html`. For a static site, place the folder in the deployed site's public root and use the equivalent path. This adds only the isolated visual/demo page. It does not integrate the existing OAuth session or trade on Deriv. Do not label the simulation as live. A real integration needs to be adapted to the site's framework, OAuth/session architecture, Deriv API version and account controls, and should be tested on a Deriv demo account first.

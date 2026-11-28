# Publishing Unicorn Trail on Google Play

Unicorn Trail is a Progressive Web App (PWA). Google Play accepts it as a **Trusted Web Activity (TWA)**:
a tiny Android app that opens your website full‑screen, with no browser bar, offline support and a normal
Play Store listing. Everything in this repo is already prepared for that.

> I can't create the Play account, sign the app or press "Publish" for you — those need your Google account,
> the one‑time US$25 developer fee and a private signing key that only you should hold.

## What is already done
| Item | Where |
|---|---|
| Installable, offline PWA (service worker, manifest, maskable icons) | `sw.js`, `trail.webmanifest`, `images/icons/trail-*.png` |
| Privacy policy page (required, children‑friendly: no data collected) | `privacy.html` → https://lokakids.lokaai.in/privacy.html |
| No third‑party requests (fonts are self‑hosted) | `fonts/`, `css/fonts.css` |
| Android packaging config for Bubblewrap | `twa/twa-manifest.json` |
| Digital Asset Links file (needs your fingerprint) | `.well-known/assetlinks.json` |
| Hi‑res icon 512×512 | `store/icon-512.png` |
| Feature graphic 1024×500 | `store/feature-graphic-1024x500.png` |
| Store text (title, descriptions, forms answers) | `store/listing.md` |

## Steps

### 1. Put the latest version online
Commit and push to `main`, wait ~2 minutes, then open https://lokakids.lokaai.in/unicorn-trail.html on your phone.
Check it installs ("Install app" / "Add to Home screen") and still opens with airplane mode on.

### 2. Fill in the privacy policy contact
Edit `privacy.html`, replace `[add your contact email here]` with an email you are happy to show publicly.

### 3. Build the Android App Bundle (.aab)
Easiest: **PWABuilder**
1. Go to https://www.pwabuilder.com and enter `https://lokakids.lokaai.in/unicorn-trail.html`.
2. Click **Package for stores → Android → Google Play**.
3. Package ID: `in.lokaai.lokakids.unicorntrail` (or your own — it can never change after publishing).
4. Choose **Create new signing key**, download the zip, and **back up the keystore and its passwords** safely.
   You will get an `.aab` file to upload and a file with the signing‑key fingerprint.

Alternative (command line): `npm i -g @bubblewrap/cli`, then `bubblewrap init --manifest=https://lokakids.lokaai.in/trail.webmanifest`
(or reuse `twa/twa-manifest.json`) and `bubblewrap build`.

### 4. Create the Play Console app
1. https://play.google.com/console → create a developer account (US$25 once).
2. **Create app**: name *Unicorn Trail*, language English, **Game**, **Free**.
3. Upload the `.aab` to a **Closed testing** track first.
   > Newly created *personal* developer accounts must currently run a closed test with at least 12 testers for
   > 14 days before they can publish to production. Organisation accounts are not affected. Check the Play
   > Console for the latest rule.

### 5. Remove the browser bar (Digital Asset Links)
1. Play Console → **Test and release → Setup → App signing** → copy the **SHA‑256 certificate fingerprint**
   of the *App signing key*.
2. Paste it into `.well-known/assetlinks.json` (replace `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256_FINGERPRINT`),
   commit and push. If you also want to test the PWABuilder/upload key, add that fingerprint too.
3. Check https://lokakids.lokaai.in/.well-known/assetlinks.json opens, then verify with Google's
   Statement List Generator and Tester.

### 6. Store listing
Use the text in `store/listing.md`. Upload:
* App icon: `store/icon-512.png`
* Feature graphic: `store/feature-graphic-1024x500.png`
* Phone screenshots (at least 2, ideally 6–8, 9:16, e.g. 1080×1920): take them from the live game on a phone
  or ask Claude to capture them from the live site.

### 7. Policy forms (all answers are in `store/listing.md`)
* **Privacy policy URL:** https://lokakids.lokaai.in/privacy.html
* **Content rating:** IARC questionnaire → Everyone / PEGI 3
* **Data safety:** no data collected, no data shared
* **Target audience:** include children (e.g. 5–8 and 9–12) → app joins *Designed for Families*; it contains no ads,
  no sign‑in and no purchases, which these programs require
* **Ads:** No · **App access:** all features available without login · **Government/news/health/finance app:** No

### 8. Release
Closed test → fix anything testers report → **Promote to production**. Updates later: push new code to the
website (players get it automatically, no new upload needed) — only upload a new `.aab` for changes to the
Android wrapper itself (icon, name, package settings). Bump `VERSION` in `sw.js` when you want devices to refresh at once.

## Checklist before every release
- [ ] Opens and plays offline
- [ ] Music, effects, vibration and pad toggles work in Settings
- [ ] All 3 worlds playable, Reset progress works
- [ ] Back button in the Android app moves back through screens (menu → map → pause) and doesn't crash
- [ ] Lighthouse (Chrome DevTools) PWA audit passes

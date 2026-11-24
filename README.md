# Crystanva — Made for you

Order site for handmade resin keychains, bookmarks and pens.
Built with React + Vite + Framer Motion. Orders are sent to your Telegram.

## Run it on your computer
```
npm install
npm run dev
```
Open http://localhost:5173.
Until Telegram is set up, orders are only printed in the terminal ("demo mode").

## Edit prices, colours, glitters, reviews
Everything is in `src/data.js`:
- `PRICE`: price of one piece
- `inStock: false`: shows that colour, glitter or shape as sold out
- `reviews`: the "Happy customers" section (placeholders for now; replace them with real ones)

## Get orders and reviews on Telegram (about 2 minutes)
1. In Telegram, message **@BotFather**, send `/newbot`, pick a name and a username ending in `bot`. Copy the **token** it gives you.
2. Copy `.env.example` to `.env` and paste the token after `TELEGRAM_BOT_TOKEN=`.
3. Open your new bot in Telegram and send it "hi".
4. Run `npm run telegram`. It finds your chat ID, saves it to `.env`, and sends you a test message.
5. Restart `npm run dev`.

## Reviews (approved from Telegram)
Customers post a review from the "Happy customers" section. It arrives in your Telegram with
**✅ Approve** and **❌ Reject** buttons. Approve puts it on the site for everyone within about a minute;
you can later tap **🗑 Remove from site**. Approved reviews are stored in the Vercel Blob store
`crystanva-reviews` (connected to the project). Nothing is published until you approve it.

## Put it online (free, Vercel)
1. Push this folder to GitHub.
2. On vercel.com, choose **Add New → Project** and import the repo (it detects Vite on its own).
3. In **Settings → Environment Variables**, add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, then redeploy.

`api/order.js` runs on Vercel's server, so your bot token is never visible in the website.

## Card & review pictures (pre-rendered for speed)
The collection cards and review thumbnails are real 3D renders saved as small images in `public/renders/`,
so the home page doesn't have to run several 3D scenes at once. If you change a card's sample
(colour/glitter in `src/data.js`) or add reviews, regenerate them:

1. `npm run dev`
2. Open http://localhost:5173/#render and wait until it says **done** (about 3 seconds per image).
3. Reload the site. Anything without an image falls back to a lighter drawing automatically.

## SEO
- Page title, description, share preview (WhatsApp/Instagram/X) and icons are in `index.html`;
  the share image is `public/og-image.jpg`.
- Structured data (store + products with prices) and `sitemap.xml` are generated at build time from `src/data.js`,
  so prices in Google stay in sync automatically.
- To appear in Google faster: add the site in **Google Search Console** (search.google.com/search-console),
  verify it, and submit `https://crystanva.vercel.app/sitemap.xml`.

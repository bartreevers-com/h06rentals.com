/**
 * Captures the screenshots used by the role walkthrough documents.
 * Usage: node scripts/capture-guide-shots.js <outputDir>
 * Requires a running local server on :3006 with demo data, and Chrome.
 */
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer-core");

const BASE = "http://localhost:3006";
const OUT = process.argv[2] || path.join(__dirname, "..", ".guide-shots");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const ACCOUNTS = {
  owner: { id: "owner", pw: "h06admin" },
  admin: { id: "+2348011110003", pw: "adminpass123" },
  sales: { id: "+2348011110001", pw: "salespass123" },
  driver: { id: "+2348011110002", pw: "driverpass123" },
  hr: { id: "+2348030000001", pw: "hrpassword1" },
};

async function login(page, role) {
  // clear any prior session (sign-out button hides behind the hamburger on mobile)
  const client = await page.target().createCDPSession();
  await client.send("Network.clearBrowserCookies");
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.waitForSelector("#identifier");
  // clear any text preserved by client-side navigation before typing
  for (const sel of ["#identifier", "#password"]) {
    await page.click(sel, { clickCount: 3 });
    await page.keyboard.press("Backspace");
  }
  await page.type("#identifier", ACCOUNTS[role].id);
  await page.type("#password", ACCOUNTS[role].pw);
  // server actions redirect via the client router — wait for the login form to vanish
  await page.click("button.btn-primary");
  try {
    await page.waitForFunction(() => !document.querySelector("#password"), { timeout: 20000 });
  } catch (err) {
    await page.screenshot({ path: path.join(OUT, `debug-${role}.png`) });
    const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.error(`[login:${role}] form did not clear. Page says:\n${text}`);
    throw err;
  }
  await new Promise((r) => setTimeout(r, 400));
}

async function shot(page, name, opts = {}) {
  await new Promise((r) => setTimeout(r, 700)); // let reveals settle
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: opts.fullPage ?? false });
  console.log("✓", name);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });
  // the once-per-session splash would swallow the first click
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem("h06_splash_seen", "1"); } catch {}
  });

  // ── logged out ──
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await shot(page, "login");

  // ── owner ──
  await login(page, "owner");
  await page.goto(`${BASE}/admin/bookings`, { waitUntil: "domcontentloaded" });
  await shot(page, "owner-bookings");
  // expand the demo booking card
  const ref = fs.existsSync("/private/tmp/claude-501/-Users-apple-allnewh06/abf83a05-a0fb-472a-9bf3-81552dc8e042/scratchpad/demo_ref.txt")
    ? fs.readFileSync("/private/tmp/claude-501/-Users-apple-allnewh06/abf83a05-a0fb-472a-9bf3-81552dc8e042/scratchpad/demo_ref.txt", "utf8").trim()
    : null;
  await page.evaluate((r) => {
    const details = [...document.querySelectorAll("details")];
    const el = r ? details.find((d) => d.textContent.includes(r)) : details[0];
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: "start" });
      window.scrollBy(0, -80);
    }
  }, ref);
  await shot(page, "owner-booking-card");
  await page.goto(`${BASE}/admin/bookings/new`, { waitUntil: "domcontentloaded" });
  await shot(page, "phone-in-form", { fullPage: true });
  await page.goto(`${BASE}/admin/fleet`, { waitUntil: "domcontentloaded" });
  await shot(page, "owner-fleet");
  await page.goto(`${BASE}/admin/addons`, { waitUntil: "domcontentloaded" });
  await shot(page, "owner-addons");
  await page.goto(`${BASE}/admin/enquiries`, { waitUntil: "domcontentloaded" });
  await shot(page, "owner-enquiries");
  await page.goto(`${BASE}/admin/team`, { waitUntil: "domcontentloaded" });
  await shot(page, "owner-team");
  await page.goto(`${BASE}/admin/performance`, { waitUntil: "domcontentloaded" });
  await shot(page, "owner-performance");

  // ── admin ──
  await login(page, "admin");
  await page.goto(`${BASE}/admin/bookings`, { waitUntil: "domcontentloaded" });
  await shot(page, "admin-bookings");
  await page.goto(`${BASE}/admin/fleet`, { waitUntil: "domcontentloaded" });
  await shot(page, "admin-fleet");

  // ── sales ──
  await login(page, "sales");
  await page.goto(`${BASE}/admin/bookings`, { waitUntil: "domcontentloaded" });
  await shot(page, "sales-bookings");
  await page.evaluate((r) => {
    const details = [...document.querySelectorAll("details")];
    const el = r ? details.find((d) => d.textContent.includes(r)) : details[0];
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: "start" });
      window.scrollBy(0, -80);
    }
  }, ref);
  await shot(page, "sales-booking-card");
  await page.goto(`${BASE}/admin/enquiries`, { waitUntil: "domcontentloaded" });
  await shot(page, "sales-enquiries");

  // ── HR ──
  await login(page, "hr");
  await page.goto(`${BASE}/admin/performance`, { waitUntil: "domcontentloaded" });
  await shot(page, "hr-performance");
  // expand a scored person's entry section
  await page.evaluate(() => {
    const details = [...document.querySelectorAll("details")];
    const el = details.find((d) => d.textContent.includes("Musa Maintenance"));
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: "start" });
      window.scrollBy(0, -80);
    }
  });
  await shot(page, "hr-score-entry");
  await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((x) => x.textContent.includes("Recognition"));
    if (h) {
      h.scrollIntoView({ block: "start" });
      window.scrollBy(0, -80);
    }
  });
  await shot(page, "hr-awards");

  // ── driver (mobile viewport, like their phone) ──
  await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });
  await login(page, "driver");
  await page.goto(`${BASE}/admin/trips`, { waitUntil: "domcontentloaded" });
  await shot(page, "driver-trips", { fullPage: true });

  // ── the customer's booking page (context for sales/admin) ──
  if (ref) {
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/booking/${ref}`, { waitUntil: "domcontentloaded" });
    await shot(page, "customer-booking");
  }

  await browser.close();
  console.log("done →", OUT);
})();

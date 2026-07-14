/**
 * Generates "H06 Team Walkthrough.docx" (the team-facing guide to the
 * platform). Run with: NODE_PATH=$(npm root -g) node scripts/make-walkthrough.js
 * Requires the global `docx` package.
 */
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat,
  TabStopType, TabStopPosition, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak,
} = require("docx");

const EMERALD = "1E5C45";
const EMERALD_BRIGHT = "2E8B6A";
const CHARCOAL = "1A211D";
const BRONZE = "A87E4A";
const MUTED = "6B746E";
const PANEL = "EDF4F0";
const CONTENT_W = 9360;

const body = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 160, line: 300 },
    ...opts.para,
    children: [new TextRun({ text, size: 22, color: CHARCOAL, font: "Arial", ...opts })],
  });

const rich = (runs, opts = {}) =>
  new Paragraph({
    spacing: { after: 160, line: 300 },
    ...opts,
    children: runs.map((r) => new TextRun({ size: 22, color: CHARCOAL, font: "Arial", ...r })),
  });

const bullet = (runs) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 100, line: 280 },
    children: (Array.isArray(runs) ? runs : [{ text: runs }]).map(
      (r) => new TextRun({ size: 22, color: CHARCOAL, font: "Arial", ...r }),
    ),
  });

const step = (text) =>
  new Paragraph({
    numbering: { reference: "steps", level: 0 },
    spacing: { after: 100, line: 280 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: CHARCOAL })],
  });

const h1 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const h2 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });

const border = { style: BorderStyle.SINGLE, size: 1, color: "D8DEDA" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function tableOf(headerCells, rows, widths) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headerCells.map(
          (t, i) =>
            new TableCell({
              borders,
              width: { size: widths[i], type: WidthType.DXA },
              shading: { fill: EMERALD, type: ShadingType.CLEAR },
              margins: cellMargins,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: t, bold: true, size: 21, color: "FFFFFF", font: "Arial" })],
                }),
              ],
            }),
        ),
      }),
      ...rows.map(
        (cells, r) =>
          new TableRow({
            children: cells.map(
              (t, i) =>
                new TableCell({
                  borders,
                  width: { size: widths[i], type: WidthType.DXA },
                  shading: { fill: r % 2 ? PANEL : "FFFFFF", type: ShadingType.CLEAR },
                  margins: cellMargins,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: t, size: 21, color: CHARCOAL, font: "Arial", bold: i === 0 }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });
}

const divider = () =>
  new Paragraph({
    spacing: { before: 60, after: 220 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: EMERALD_BRIGHT, space: 1 } },
    children: [],
  });

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: CHARCOAL } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 34, bold: true, font: "Georgia", color: EMERALD },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Georgia", color: CHARCOAL },
        paragraph: { spacing: { before: 260, after: 140 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 620, hanging: 320 } } },
        }],
      },
      {
        reference: "steps",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 620, hanging: 320 } } },
        }],
      },
    ],
  },
  sections: [
    // ── COVER ────────────────────────────────────────────────
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({ spacing: { before: 2600 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "png",
              data: fs.readFileSync(`${__dirname}/../public/brand/mark-emerald.png`),
              transformation: { width: 130, height: 130 },
              altText: { title: "H06 mark", description: "H06 emerald brand mark", name: "h06-mark" },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 500, after: 120 },
          children: [new TextRun({ text: "The H06 Platform", font: "Georgia", size: 64, bold: true, color: CHARCOAL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 90 },
          children: [new TextRun({ text: "A walkthrough for the team", font: "Georgia", size: 30, color: EMERALD })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 700 },
          children: [new TextRun({ text: "H06 RENTALS  ·  LAGOS  ·  JULY 2026", size: 18, color: MUTED, font: "Arial" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 90 },
          children: [new TextRun({ text: "h06-platform.vercel.app", size: 18, color: BRONZE, font: "Arial" })],
        }),
      ],
    },

    // ── BODY ─────────────────────────────────────────────────
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D8DEDA", space: 4 } },
              children: [
                new TextRun({ text: "H06 RENTALS", bold: true, size: 17, color: EMERALD, font: "Arial" }),
                new TextRun({ text: "\tTeam Walkthrough", size: 17, color: MUTED, font: "Arial" }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              children: [
                new TextRun({ text: "Private & confidential. For the H06 team.", size: 16, color: MUTED, font: "Arial" }),
                new TextRun({ children: ["\tPage ", PageNumber.CURRENT], size: 16, color: MUTED, font: "Arial" }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ── Welcome ──
        h1("Hello, team"),
        body("This is your tour of the new H06 platform. It covers the website our customers see and the back office where we run the whole operation. I have written it the way I would explain it if we were sitting together with a laptop open, so read it once from start to finish, then keep it somewhere handy."),
        body("Two links to save right now:"),
        bullet([{ text: "The website: ", bold: true }, { text: "h06-platform.vercel.app", color: EMERALD_BRIGHT }, { text: ". This is what customers see. It will move to www.h06rentals.com when we switch the domain over." }]),
        bullet([{ text: "The back office: ", bold: true }, { text: "h06-platform.vercel.app/admin", color: EMERALD_BRIGHT }, { text: ". One sign-in page for all of us. What you see inside depends on your role." }]),
        body("You each have your own login: your phone number and a password we give you privately. If you ever forget your password, do not sit there guessing. Just ask, and we will reset it in seconds."),
        divider(),

        // ── The new mark ──
        h1("Our new mark, and why we changed it"),
        body("Before we tour the platform, look at the symbol on the cover of this document for a moment. That is our new mark, and it now carries the whole brand. The old text logo served us well enough, but it said nothing about who we are. Any rental company could have worn it. This one could only be ours, and I want everyone on the team to understand it well enough to explain it to a curious customer."),
        body("The concept is simple. The mark is two identical blades in perfect point symmetry, set on a 45 degree rising axis. Every part of that sentence earns its place:"),
        bullet([{ text: "Two blades", bold: true }, { text: " are the chauffeur and the passenger. A service built on two people moving as one. You can also read them as departure and arrival: the same form, mirrored, at both ends of a journey." }]),
        bullet([{ text: "Sharp leading edge, rounded trailing edge", bold: true }, { text: " means precision up front and comfort behind. Speed without aggression. That is the whole H06 promise in one shape." }]),
        bullet([{ text: "The negative channel between the blades", bold: true }, { text: " is the journey itself. Implied, never drawn. No road, no route line, just the space the brand moves through." }]),
        bullet([{ text: "The 45 degree rise", bold: true }, { text: " gives it forward momentum, and the point symmetry gives it balance, control and discretion." }]),
        body("And if you look closely, you will find a hidden H. That is intentional. The two blades and the channel between them quietly assemble an italic H for H06 without ever typing a letter. That hidden letter is what makes the mark truly ours. Nobody else can claim it."),
        body("Why does this suit us better? Because it behaves the way we do. It is quiet until you pay attention, and then it rewards you. It works as polished emerald glass on the website, as brushed bronze in the VIP wing, as silver in the chauffeur division, and as a tiny icon on a phone screen, all without losing itself. It took a long time to get here because the brief I set myself was a mark so classic we would never have to change it again. This is that mark. Treat it with care: never stretch it, never recolour it outside the three metals, and never place text over it."),
        divider(),

        // ── The website in five minutes ──
        h1("The website, in five minutes"),
        body("Think of the site as a private showroom with an express lane. A customer lands on a dark, quiet page with our G-Wagon sketch driving across it. From there they can wander through the fleet, peek into the VIP wing, meet our waving chauffeur, or go straight to booking. Every page nudges them toward one of two doors: “Build my trip” or “WhatsApp concierge.”"),
        h2("The journey a customer takes"),
        step("They pick a trip type: airport pickup, 12-hour, 24-hour, multi-day, interstate, chauffeur-only, wedding, corporate, VIP, or a custom request."),
        step("They fill in the details: pickup, destination, date, time, passengers, luggage. The pickup and destination boxes suggest Lagos locations as they type."),
        step("They choose a car (we recommend the best fit first) and any add-ons, like meet and greet, VIP airport protocol, a spy police upgrade, or a security escort."),
        step("They watch the exact price update in a live quote panel, leave their contact details, and choose how to pay."),
        body("Prices come straight from our rate card, the same numbers you see in the back office. When something genuinely needs a human decision, say an escort, an exotic, or a wedding convoy, the site is honest about it. It says “Estimated quote. Final confirmation by H06 concierge” and never pretends an uncertain price is final."),
        h2("The important pages"),
        tableOf(
          ["Page", "What it does"],
          [
            ["Home", "The showroom entrance. Animated sketch hero, trip-type shortcuts, the instant-booking fleet, and dedicated bands for the VIP wing and chauffeur hire."],
            ["The Fleet", "Our five instant-booking cars with transparent rates and a compare table. Hover a card and the wheels roll."],
            ["VIP Wing", "The exotics: LX600, G-Wagon, Range Rover, Rolls-Royce, Urus, armoured, buses. Bronze treatment, concierge-priced, enquiry-first."],
            ["Chauffeur", "“Our driver. Your vehicle.” A hand-drawn chauffeur greets visitors with a smile and a wave. Flat rates, driver vetting, and everything in silver, the chauffeur division's accent."],
            ["Build my trip", "The four-step booking wizard with the live quote."],
            ["Corporate", "Our pitch and a request form for corporate accounts."],
            ["Contact", "All the ways to reach us, plus a message form that lands in your Enquiries tab."],
          ],
          [2200, 7160],
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ── Money ──
        h1("How the money moves"),
        body("Payments are live and real, and every naira moves through Paystack. Cards, bank transfers, USSD, mobile money: they all happen inside our secure checkout, never outside the platform. Nobody should ever be sharing account numbers on WhatsApp."),
        body("At checkout the customer picks one of three options:"),
        tableOf(
          ["Option", "What it means for us"],
          [
            ["Pay in full", "The whole quote, paid now. The booking arrives as “Awaiting confirmation” with the money already in."],
            ["50% deposit", "Half now, balance before the trip. The booking card shows exactly what is outstanding."],
            ["Confirm first, pay later", "No money yet. The moment we confirm (or set a concierge price), the client is emailed a secure payment link automatically. Treat these as warm leads and respond fast."],
          ],
          [2600, 6760],
        ),
        body("The customer also hears from us by email at every step without anyone lifting a finger: when the booking is made, when a concierge price is set (with the payment link), when we confirm, if we cancel, when a payment succeeds, and when one fails (with a retry link). Every person who books joins our email list automatically, whether or not their payment went through."),
        body("Every successful payment is verified twice: once when the customer returns from checkout, and again through a private message Paystack sends our server. You never need to screenshot-check anything. If the booking card says paid, it is paid."),
        rich([
          { text: "One rule worth repeating: " },
          { text: "we never ask customers to read card numbers over the phone or WhatsApp.", bold: true },
          { text: " Send them their booking link and let them pay on the site." },
        ]),
        divider(),

        // ── Back office intro + roles ──
        h1("The back office"),
        rich([
          { text: "Everyone signs in at " },
          { text: "h06-platform.vercel.app/admin", color: EMERALD_BRIGHT },
          { text: " with their phone number and password. It is the same door for all of us, with different rooms behind it:" },
        ]),
        tableOf(
          ["Role", "What you can see and do"],
          [
            ["Owner", "Everything, plus the Team tab. Only the owner can add staff, change roles, reset passwords, deactivate accounts, or permanently delete records."],
            ["Admin", "Everything the owner sees except Team and Performance: bookings, fleet, rates, add-ons, enquiries."],
            ["Sales", "Bookings and Enquiries. This is the concierge cockpit."],
            ["Driver", "My Trips only. Your own assigned jobs, nothing else."],
            ["HR", "The Performance tab only. Nobody else sees it except the owner."],
            ["Staff", "No sign-in at all. This role exists so HR can track people who never touch the portal."],
          ],
          [1800, 7560],
        ),
        body("Sessions last 12 hours, then you sign in again. If an account is deactivated, its login stops working immediately."),

        h2("Bookings, where you will live"),
        body("Every reservation lands here the moment a customer submits it, newest first, with a running total of money collected at the top. Click any booking to open the full picture: customer details, the trip, add-ons, the quote line by line, what has been paid and what is still outstanding."),
        body("Someone calls in instead of booking online? Use the “New phone-in booking” button. You enter the trip and the client's details, and from that moment they are treated exactly like a web customer: booking email, payment link, receipts, the lot. The one field that really matters is their email address, because that is where everything goes."),
        body("For concierge-priced trips (the VIP wing, weddings, custom requests), the booking card shows a “Concierge pricing” box. Type the final price, click the button, and two things happen at once: the quote becomes official, and the client is emailed a secure payment link. No chasing, no manual maths."),
        body("A normal day looks like this:"),
        step("A booking arrives. Open it and read the whole card, especially the payment line and any customer notes."),
        step("Tap “WhatsApp” on the card. It opens a chat with the customer with a greeting already written. Confirm their trip warmly and answer questions."),
        step("Assign a driver from the dropdown on the card. The trip appears on that driver's phone instantly."),
        step("Click “Mark confirmed.” The customer's booking page turns celebratory and shows Confirmed."),
        step("After the trip, the driver marks it complete from their side, or you can from yours. Add an internal note if anything is worth remembering."),
        h2("What the statuses mean"),
        tableOf(
          ["Status", "Translation"],
          [
            ["Awaiting payment", "They started checkout but have not paid. If it lingers, a gentle WhatsApp nudge works wonders."],
            ["Awaiting confirmation", "Paid (or chose pay-later) and waiting for us to say yes. Respond quickly. This is the moment trust is built."],
            ["Confirmed", "We have committed. The car and driver are theirs."],
            ["Completed", "Trip done. It stays in the history."],
            ["Cancelled", "Called off. The card stays for the record."],
          ],
          [2800, 6560],
        ),
        new Paragraph({ children: [new PageBreak()] }),

        h2("Fleet & Rates (owner and admin)"),
        body("This tab is the source of truth for what customers can book and at what price. Two things you will actually use:"),
        bullet([{ text: "Availability toggle. ", bold: true }, { text: "A car goes for servicing or gets block-booked? Mark it unavailable and it stops being bookable on the site that second. Flip it back when it returns." }]),
        bullet([{ text: "Rates. ", bold: true }, { text: "Every price on the site comes from here: airport, 12-hour, 24-hour, multi-day, interstate. Change a number, click update, and the whole site uses it immediately. No developer needed." }]),
        body("Please treat rate changes with respect. They are live the moment you save. If you are experimenting, tell the owner first."),

        h2("Add-ons (owner and admin)"),
        body("Meet and greet, VIP airport protocol, the spy police upgrade, security escort and the rest live here. You can change a price, or untick “active” to hide an add-on from the booking flow. Leave the price blank to make it a custom-quote item, and the customer will see that it needs concierge confirmation."),

        h2("Enquiries (sales, admin, owner)"),
        body("Three kinds of messages land here: VIP requests (someone wants the Rolls or the G-Wagon), corporate account requests, and contact-form messages. Each card has a WhatsApp reply button. Work them like bookings. Reply fast, mark “responded” once you have engaged, and “closed” when it is done."),

        h2("Team (owner only)"),
        body("Adding someone takes thirty seconds: name, phone number (that becomes their login), role, and a starting password of at least 8 characters. Share passwords privately, never in a group chat. From the same tab you can reset a password or deactivate someone who is leaving. Deactivation is instant, and reversible if you need it to be."),

        h2("Performance and recognition (owner and HR only)"),
        body("This is HR's home, and it is deliberately private: only the owner and HR can open it. It turns our staff job descriptions into weekly numbers everyone can trust."),
        body("How it works, in one breath: HR gives each person KPIs (there are ready-made templates for every role in the company, from General Manager to Professional Driver), each with a target and a weight from 1 to 5. Through the week, HR records what actually happened: daily duties get a number per day, weekly duties get one number. The platform turns that into a weighted weekly score with a visual bar for every person, plus the change from last week."),
        body("The fairness rules are printed right on the page. A KPI can never score above 100%, so heroic volume on one duty cannot buy back a missed one. An unscored KPI is treated as missing data, not a zero. And a week only counts toward awards when HR has scored at least 60% of a person's KPIs."),
        body("Staff of the Month, Quarter and Year come straight out of these numbers: the average of eligible weekly scores across the period, with ties broken by scoring coverage. Nothing is hand-picked, and the full history downloads as a spreadsheet from the same page. If HR keeps the scores honest weekly, the awards defend themselves."),

        h2("My Trips, the driver's view"),
        body("Drivers sign in on the same page and see only their assigned jobs: pickup point, destination, date and time, passenger name and count, luggage, flight number, and any notes. Two buttons run their day. “Start trip” when the customer is on board, and “Complete trip” on arrival, which updates the office automatically. There are also call and WhatsApp buttons for reaching the customer directly."),
        body("Drivers: if a trip is missing from your list, it has not been assigned to you yet. Call the office rather than improvising."),
        divider(),

        // ── Housekeeping ──
        h1("Situations you will meet (and what to do)"),
        tableOf(
          ["When this happens…", "…do this"],
          [
            ["A payment fails", "Nothing is lost. The customer is emailed a retry link automatically, and their booking page has a pay button. A WhatsApp nudge helps too."],
            ["Customer asks to pay by transfer", "Point them to their payment link. Paystack checkout includes bank transfer and USSD. We never collect payments outside the platform."],
            ["Customer wants to change dates", "Check the calendar, agree the change on WhatsApp, and add an internal note on the booking. Confirm only what we can honour."],
            ["A VIP enquiry about an exotic", "Never quote a fixed price from memory. These are concierge-priced. Agree it with the owner, set it on the booking, and the payment link sends itself."],
            ["A car needs to disappear from the site", "Fleet & Rates, mark it unavailable. Do it before servicing, not after someone books it."],
            ["Someone forgets their password", "The owner resets it in Team. No password is ever sent in a group chat."],
            ["A customer asks for a receipt", "Their booking page is the receipt. It shows the quote, what is paid, and the reference. Send them their booking link."],
          ],
          [3400, 5960],
        ),
        h2("Good to know"),
        bullet("Booking references look like H06-00042. Quote them in every conversation so nobody mixes up customers."),
        bullet("Records never disappear by accident: cancelling keeps the history, and only the owner can permanently delete a booking or enquiry. If something needs deleting, that conversation goes through the owner."),
        bullet("Owners and admins can download everything as spreadsheets: bookings, payments, enquiries and the email list, straight from the buttons at the top of each tab. HR downloads the performance report the same way."),
        bullet("Email confirmations are currently being logged rather than sent while we connect the email service. WhatsApp is our confirmation channel, and honestly, that is where the relationship lives anyway."),
        bullet("The site is fully open to Google and Meta, so pages will appear in search, and links shared on WhatsApp or Instagram show proper photo previews. Share vehicle pages freely. Each one previews with its own car."),
        bullet("A little colour language worth knowing: green is the core fleet, bronze means VIP, and silver is chauffeur hire. Once you know it, you can read any page at a glance."),
        bullet([{ text: "Instagram is part of the funnel: ", bold: true }, { text: "@h06rentals" }, { text: " is linked on the home page, on every booking confirmation, and in the footer. When customers ask where to see the cars, point them there. And follow it yourself." }]),
        bullet("The fleet photos are placeholders until our studio shoot; the sketches are the brand. Do not promise customers a specific plate number or colour from the photos."),
        divider(),

        h1("Quick reference"),
        tableOf(
          ["Thing", "Where"],
          [
            ["The website", "h06-platform.vercel.app"],
            ["Back office (all roles)", "h06-platform.vercel.app/admin"],
            ["Business WhatsApp / phone", "+234 913 999 9533"],
            ["Business email", "hello@h06rentals.com"],
            ["Showroom", "1 Gbangbala Street, Ikate, Lekki, Lagos"],
            ["Instagram", "instagram.com/h06rentals (@h06rentals)"],
          ],
          [3400, 5960],
        ),
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        rich([
          { text: "That is the tour. The platform does the paperwork so you can do what we are actually selling: " },
          { text: "calm, effortless movement", bold: true, color: EMERALD },
          { text: ". If anything in here does not match what you see on screen, tell me and we will fix the doc or the platform, whichever one is wrong." },
        ]),
        rich([{ text: "Bart", font: "Georgia", size: 26, color: CHARCOAL }], { spacing: { before: 200 } }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("/Users/apple/allnewh06/H06 Team Walkthrough.docx", buffer);
  console.log("written");
});

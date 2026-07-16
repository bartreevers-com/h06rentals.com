/**
 * Generates five role-specific walkthrough documents with screenshots:
 * Owner, Admin, Sales, Driver, HR. Each is branded, detailed, and embeds
 * real captures from .guide-shots/.
 *
 * Usage: NODE_PATH=$(npm root -g) node scripts/make-role-guides.js
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, TabStopType, TabStopPosition,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
} = require("docx");

const SHOTS = path.join(__dirname, "..", ".guide-shots");
const OUT_DIR = path.join(__dirname, "..", "..");

// ── palette ────────────────────────────────────────────────────
const EMERALD = "1E5C45";
const EMERALD_BRIGHT = "2E8B6A";
const CHARCOAL = "1A211D";
const BRONZE = "A87E4A";
const SILVER = "6E7B77";
const MUTED = "6B746E";
const PANEL = "EDF4F0";
const CONTENT_W = 9360;

const ACCENTS = {
  owner: EMERALD,
  admin: EMERALD_BRIGHT,
  sales: "2F6E4E",
  driver: "3A7D5C",
  hr: "5A6B64",
};

// ── content-node helpers ───────────────────────────────────────
const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 150, line: 300 },
    children: [new TextRun({ text, size: 22, color: CHARCOAL, font: "Arial", ...opts })],
  });

const RICH = (runs, para = {}) =>
  new Paragraph({
    spacing: { after: 150, line: 300 },
    ...para,
    children: runs.map((r) => new TextRun({ size: 22, color: CHARCOAL, font: "Arial", ...r })),
  });

const BULLET = (runs) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 90, line: 285 },
    children: (Array.isArray(runs) ? runs : [{ text: runs }]).map(
      (r) => new TextRun({ size: 22, color: CHARCOAL, font: "Arial", ...r }),
    ),
  });

const STEP = (runs) =>
  new Paragraph({
    numbering: { reference: "steps", level: 0 },
    spacing: { after: 110, line: 290 },
    children: (Array.isArray(runs) ? runs : [{ text: runs }]).map(
      (r) => new TextRun({ size: 22, color: CHARCOAL, font: "Arial", ...r }),
    ),
  });

const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });

const DIVIDER = () =>
  new Paragraph({
    spacing: { before: 40, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: EMERALD_BRIGHT, space: 1 } },
    children: [],
  });

// callout box (single-cell shaded table)
const CALLOUT = (title, text, tone = EMERALD) =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { fill: PANEL, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: PANEL },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: PANEL },
              right: { style: BorderStyle.SINGLE, size: 1, color: PANEL },
              left: { style: BorderStyle.SINGLE, size: 24, color: tone },
            },
            margins: { top: 120, bottom: 120, left: 200, right: 160 },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: title, bold: true, size: 21, color: tone, font: "Arial" })],
              }),
              new Paragraph({
                children: [new TextRun({ text, size: 21, color: CHARCOAL, font: "Arial" })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "D8DEDA" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

const TABLE = (headers, rows, widths, accent = EMERALD) =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (t, i) =>
            new TableCell({
              borders: cellBorders,
              width: { size: widths[i], type: WidthType.DXA },
              shading: { fill: accent, type: ShadingType.CLEAR },
              margins: { top: 90, bottom: 90, left: 130, right: 130 },
              children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })],
            }),
        ),
      }),
      ...rows.map(
        (cells, r) =>
          new TableRow({
            children: cells.map(
              (t, i) =>
                new TableCell({
                  borders: cellBorders,
                  width: { size: widths[i], type: WidthType.DXA },
                  shading: { fill: r % 2 ? PANEL : "FFFFFF", type: ShadingType.CLEAR },
                  margins: { top: 90, bottom: 90, left: 130, right: 130 },
                  children: [new Paragraph({ children: [new TextRun({ text: t, size: 20, color: CHARCOAL, font: "Arial", bold: i === 0 })] })],
                }),
            ),
          }),
      ),
    ],
  });

// screenshot with a caption; maxW in px (content width ≈ 624px)
function SHOT(file, caption, maxW = 600) {
  const full = path.join(SHOTS, file);
  const dim = require("child_process").execSync(
    `node -e "const {execSync}=require('child_process');const b=require('fs').readFileSync('${full}');` +
      `let w,h;if(b[0]===0x89){w=b.readUInt32BE(16);h=b.readUInt32BE(20);}console.log(w+' '+h)"`,
  ).toString().trim().split(" ").map(Number);
  const [w, h] = dim;
  const width = Math.min(maxW, w / 2);
  const height = Math.round((h / w) * width);
  return [
    new Paragraph({
      spacing: { before: 80, after: 40 },
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          type: "png",
          data: fs.readFileSync(full),
          transformation: { width, height },
          altText: { title: caption, description: caption, name: file },
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: caption, italics: true, size: 18, color: MUTED, font: "Arial" })],
    }),
  ];
}

// ── document assembly ──────────────────────────────────────────
function buildDoc({ role, title, subtitle, accent, children }) {
  return new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22, color: CHARCOAL } } },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: "Georgia", color: accent },
          paragraph: { spacing: { before: 340, after: 180 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 25, bold: true, font: "Georgia", color: CHARCOAL },
          paragraph: { spacing: { before: 240, after: 130 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
        { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: [
          new Paragraph({ spacing: { before: 2400 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: "png",
                data: fs.readFileSync(path.join(__dirname, "..", "public", "brand", "mark-emerald.png")),
                transformation: { width: 120, height: 120 },
                altText: { title: "H06", description: "H06 mark", name: "mark" },
              }),
            ],
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 460, after: 60 }, children: [new TextRun({ text: title, font: "Georgia", size: 58, bold: true, color: CHARCOAL })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: subtitle, font: "Georgia", size: 28, color: accent })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 640 }, children: [new TextRun({ text: "H06 RENTALS  ·  LAGOS  ·  STAFF HANDBOOK", size: 17, color: MUTED, font: "Arial" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: "h06-platform.vercel.app/admin", size: 17, color: BRONZE, font: "Arial" })] }),
        ],
      },
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D8DEDA", space: 4 } },
                children: [
                  new TextRun({ text: "H06 RENTALS", bold: true, size: 16, color: accent, font: "Arial" }),
                  new TextRun({ text: `\t${subtitle}`, size: 16, color: MUTED, font: "Arial" }),
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
                  new TextRun({ text: "Private & confidential. For the H06 team.", size: 15, color: MUTED, font: "Arial" }),
                  new TextRun({ children: ["\tPage ", PageNumber.CURRENT], size: 15, color: MUTED, font: "Arial" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

// shared opening: how to sign in
const signInSection = (roleWord, landingText) => [
  H1("Signing in"),
  P("Everyone on the team uses the same door. Open a browser and go to:"),
  RICH([{ text: "h06-platform.vercel.app/admin", color: EMERALD_BRIGHT, bold: true }]),
  P("The first time, it is worth saving that page to your phone's home screen so it is one tap away."),
  ...SHOT("login.png", "The staff sign-in page. The same page for every role.", 560),
  P(`Sign in with your phone number and the password you were given privately. ${landingText}`),
  CALLOUT("If your password ever stops working", "Do not keep guessing. Message the owner and they will reset it in seconds. Never share a password in a group chat."),
];

// ════════════════════════════════════════════════════════════════
// OWNER
// ════════════════════════════════════════════════════════════════
const ownerDoc = buildDoc({
  role: "owner", title: "The Owner's Guide", subtitle: "Owner Handbook", accent: ACCENTS.owner,
  children: [
    H1("This is your master key"),
    P("You see everything in the back office, and a few things nobody else does: the Team tab, the Performance tab, and the ability to permanently delete records. This guide walks every screen you own. Read it once, then keep it close."),
    P("The colour language runs through the whole platform, so it is worth learning first: green is the core fleet, bronze is the VIP wing, silver is chauffeur hire, and clear glass is the back office you are about to enter."),
    DIVIDER(),

    ...signInSection("owner", "As the owner you sign in with the word “owner” as your phone number, and your owner password. This login can never be locked out, because it lives in the platform's settings rather than the staff list."),
    DIVIDER(),

    H1("Bookings: where the money lives"),
    P("Every reservation lands here the moment a customer books, newest first, with the total collected shown at the top. This is the busiest screen on the platform."),
    ...SHOT("owner-bookings.png", "The Bookings tab. Newest first, with money collected at the top and export buttons on the right."),
    H2("Opening a booking"),
    P("Click any booking to unfold the full picture: the customer, the trip, the add-ons, the quote line by line, what has been paid and what is still outstanding, and every action you can take."),
    ...SHOT("owner-booking-card.png", "An open booking card. Assign a driver, WhatsApp the customer, confirm, complete, or (owner only) delete."),
    P("A normal booking moves through your hands like this:"),
    STEP("Read the whole card, especially the payment line and any note the customer left."),
    STEP([{ text: "Tap " }, { text: "WhatsApp", bold: true }, { text: " to open a chat with a greeting already written. Confirm their trip warmly." }]),
    STEP([{ text: "Choose a driver from the " }, { text: "Assign", bold: true }, { text: " dropdown. The trip appears on that driver's phone instantly." }]),
    STEP([{ text: "Click " }, { text: "Mark confirmed", bold: true }, { text: ". The customer's own booking page turns celebratory and shows Confirmed." }]),
    STEP("After the trip, the driver marks it complete, or you can. Add an internal note if anything is worth remembering."),
    H2("What the statuses mean"),
    TABLE(
      ["Status", "What it means"],
      [
        ["Awaiting payment", "Started checkout but has not paid. A gentle WhatsApp nudge works wonders."],
        ["Awaiting confirmation", "Paid, or chose pay-later, and waiting for your yes. Respond fast."],
        ["Confirmed", "You have committed. The car and driver are theirs."],
        ["Completed", "The trip is done and kept in the history."],
        ["Cancelled", "Called off, but the record stays."],
      ],
      [2600, 6760], ACCENTS.owner,
    ),
    new Paragraph({ children: [new PageBreak()] }),

    H2("Booking for someone who called in"),
    P("Not everyone books online. When someone phones, use the “+ New phone-in booking” button at the top of the Bookings tab. You fill in the trip and their details, and from that second they are treated exactly like a web customer."),
    ...SHOT("phone-in-form.png", "The phone-in booking form. The email address is the field that matters most, because that is where their confirmation and payment link go.", 520),
    CALLOUT("The email address is everything", "It is where the client's booking confirmation, payment link and receipts are sent. Double-check it before you submit."),

    H2("Setting a price on a VIP or custom trip"),
    P("VIP-wing cars, weddings and custom requests do not have a fixed price. When one of these comes in, its card shows a “Concierge pricing” box. Type the agreed figure, click the button, and two things happen at once: the quote becomes official, and the client is immediately emailed a secure payment link. No chasing, no manual maths."),
    DIVIDER(),

    H1("Fleet & Rates"),
    P("This tab is the single source of truth for what customers can book and at what price. Everything the website shows comes from here."),
    ...SHOT("owner-fleet.png", "Fleet & Rates. Toggle a car's availability, edit its taglines, and set every price on its rate card."),
    BULLET([{ text: "Availability. ", bold: true }, { text: "A car goes for servicing? Mark it unavailable and it stops being bookable that second. Flip it back when it returns." }]),
    BULLET([{ text: "Rates. ", bold: true }, { text: "Airport, 12-hour, 24-hour, multi-day, interstate. Change a number, save, and the whole site uses it immediately." }]),
    CALLOUT("Rate changes are live instantly", "The moment you save, every new quote uses the new number. If you are experimenting, do it deliberately."),

    H1("Add-ons"),
    P("Meet and greet, VIP airport protocol, the spy police upgrade, security escort and the rest live here. Change a price, or untick “active” to hide an add-on from the booking flow. Leave a price blank to make it a concierge-quoted item."),
    ...SHOT("owner-addons.png", "The Add-ons tab. Price them, switch them on or off, or mark them concierge-quoted."),

    H1("Enquiries"),
    P("VIP requests, corporate-account requests and contact-form messages all land here. Each has a WhatsApp reply button. Work them like bookings: reply fast, mark responded, then closed."),
    ...SHOT("owner-enquiries.png", "The Enquiries tab. VIP, corporate and contact messages, each with a WhatsApp reply."),
    new Paragraph({ children: [new PageBreak()] }),

    H1("Team: adding and managing people"),
    P("This tab is yours alone. Nobody else can see it. Adding someone takes thirty seconds: their name, phone number (that becomes their login), a role, and a starting password of at least eight characters."),
    ...SHOT("owner-team.png", "The Team tab. Add staff, choose their role, reset passwords, or deactivate someone."),
    H2("The six roles"),
    TABLE(
      ["Role", "What they can do"],
      [
        ["Owner", "Everything, including this Team tab, Performance, and deleting records."],
        ["Admin", "Everything except Team and Performance."],
        ["Sales", "Bookings and Enquiries only."],
        ["Driver", "Their own assigned trips only."],
        ["HR", "The Performance tab only."],
        ["Staff", "No sign-in at all. Exists so HR can track people who never use the portal."],
      ],
      [1700, 7660], ACCENTS.owner,
    ),
    P("You can reset anyone's password or deactivate someone who is leaving. Deactivation is instant and reversible."),
    DIVIDER(),

    H1("Performance"),
    P("You and HR are the only people who can open this tab. It turns the staff job descriptions into weekly numbers. HR runs it day to day (there is a dedicated HR guide), but you have the full view whenever you want it, including staff of the month, quarter and year."),
    ...SHOT("owner-performance.png", "The Performance dashboard. Weekly scores as bars, with the fairness rules printed underneath."),
    DIVIDER(),

    H1("Downloads and deletion"),
    BULLET([{ text: "Exports. ", bold: true }, { text: "The buttons at the top of Bookings download bookings, payments and the email list as spreadsheets. Enquiries and Performance export the same way." }]),
    BULLET([{ text: "Deletion is yours alone. ", bold: true }, { text: "Cancelling a booking keeps its history. Permanently deleting it is an owner-only power, tucked behind a confirmation on the booking card. Prefer Cancel unless a record truly must vanish." }]),
    DIVIDER(),

    H1("Your golden rules"),
    BULLET("We never take card numbers over the phone or WhatsApp. Every payment runs through Paystack, inside the platform."),
    BULLET("Rate and availability changes are live the moment you save."),
    BULLET("Passwords are shared privately, never in a group chat."),
    BULLET("Cancel keeps history. Delete is forever, and only yours."),
    P("The platform does the paperwork so you can do what we actually sell: calm, effortless movement."),
  ],
});

// ════════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════════
const adminDoc = buildDoc({
  role: "admin", title: "The Admin's Guide", subtitle: "Admin Handbook", accent: ACCENTS.admin,
  children: [
    H1("What you run"),
    P("As an admin you run the day-to-day operation: bookings, the fleet and its prices, add-ons, and enquiries. You can do everything the owner can except two things, which stay with the owner: managing the team, and the Performance tab. You also cannot permanently delete records; you cancel them instead, which is safer anyway."),
    P("Colour language, so the screens read at a glance: green is the core fleet, bronze is VIP, silver is chauffeur hire."),
    DIVIDER(),

    ...signInSection("admin", "You sign in with your phone number and password, and land straight on the Bookings tab."),
    DIVIDER(),

    H1("Bookings"),
    P("Every reservation lands here the moment a customer books, newest first, with the total collected at the top."),
    ...SHOT("admin-bookings.png", "The Bookings tab, with export buttons and the phone-in booking button on the right."),
    H2("Working a booking"),
    P("Click a booking to open the full picture, then work it top to bottom:"),
    ...SHOT("owner-booking-card.png", "An open booking card: assign a driver, WhatsApp the customer, confirm, or complete."),
    STEP("Read the whole card, especially the payment line and any customer note."),
    STEP([{ text: "Tap " }, { text: "WhatsApp", bold: true }, { text: " to reply with a greeting already written." }]),
    STEP([{ text: "Assign a driver from the dropdown. It reaches their phone instantly." }]),
    STEP([{ text: "Click " }, { text: "Mark confirmed", bold: true }, { text: " once the trip is locked in." }]),
    H2("The statuses"),
    TABLE(
      ["Status", "Meaning"],
      [
        ["Awaiting payment", "Started checkout, not paid. Nudge on WhatsApp."],
        ["Awaiting confirmation", "Paid or pay-later, waiting for your yes."],
        ["Confirmed", "Committed. Car and driver assigned."],
        ["Completed", "Trip done, kept in history."],
        ["Cancelled", "Called off, record retained."],
      ],
      [2600, 6760], ACCENTS.admin,
    ),
    new Paragraph({ children: [new PageBreak()] }),

    H2("Phone-in bookings"),
    P("When someone calls instead of booking online, use “+ New phone-in booking.” Enter the trip and their details and they become a normal customer, receiving the same emails and payment link."),
    ...SHOT("phone-in-form.png", "The phone-in form. Their email address is where every notification goes, so get it right.", 520),

    H2("Concierge pricing"),
    P("VIP, wedding and custom bookings arrive without a fixed price. Their card shows a “Concierge pricing” box. Agree the figure with the owner, type it in, and the client is emailed a secure payment link automatically."),
    CALLOUT("Never quote exotics from memory", "VIP-wing prices are set per engagement. Agree the number with the owner, set it on the booking, and let the link send itself."),
    DIVIDER(),

    H1("Fleet & Rates"),
    P("The source of truth for what can be booked and at what price."),
    ...SHOT("admin-fleet.png", "Fleet & Rates. Availability toggles and every price the site quotes."),
    BULLET([{ text: "Availability. ", bold: true }, { text: "Mark a car unavailable before it goes for servicing, not after someone books it." }]),
    BULLET([{ text: "Rates. ", bold: true }, { text: "Every price the site shows lives here. Save, and it is live immediately." }]),
    CALLOUT("Live the moment you save", "If you are experimenting with a price, tell the owner first."),

    H1("Add-ons"),
    P("Meet and greet, VIP protocol, spy police upgrade and the rest. Change a price, switch one off, or leave a price blank to make it concierge-quoted."),
    ...SHOT("owner-addons.png", "The Add-ons tab."),

    H1("Enquiries"),
    P("VIP, corporate and contact-form messages, each with a WhatsApp reply. Reply fast, mark responded, then closed."),
    ...SHOT("owner-enquiries.png", "The Enquiries tab."),
    DIVIDER(),

    H1("Downloads"),
    P("The buttons at the top of Bookings and Enquiries download bookings, payments, the email list and enquiries as spreadsheets, any time."),

    H1("Your golden rules"),
    BULLET("Every payment runs through Paystack, inside the platform. We never take card numbers by phone or WhatsApp."),
    BULLET("Rate and availability changes are live instantly."),
    BULLET("To remove a booking, cancel it. Permanent deletion is the owner's job."),
    BULLET("Never quote VIP prices from memory; agree them with the owner."),
  ],
});

// ════════════════════════════════════════════════════════════════
// SALES
// ════════════════════════════════════════════════════════════════
const salesDoc = buildDoc({
  role: "sales", title: "The Sales Guide", subtitle: "Sales & Concierge Handbook", accent: ACCENTS.sales,
  children: [
    H1("You are the concierge"),
    P("Your workspace is deliberately focused: two tabs, Bookings and Enquiries. This is the cockpit where our customers become confirmed trips. Speed and warmth are the whole job. A booking answered in minutes feels like a different company from one answered in hours."),
    DIVIDER(),

    ...signInSection("sales", "You sign in with your phone number and password, and land on the Bookings tab."),
    DIVIDER(),

    H1("Bookings"),
    P("Every reservation appears here the moment a customer books, newest first."),
    ...SHOT("sales-bookings.png", "The Bookings tab as sales sees it. You can create phone-in bookings too."),
    H2("Working a booking, start to finish"),
    P("Click any booking to open the full picture, then move through it:"),
    ...SHOT("sales-booking-card.png", "An open booking card. WhatsApp the customer, assign a driver, and confirm."),
    STEP("Read the card fully. Note the payment line, the flight number, and anything the customer wrote."),
    STEP([{ text: "Tap " }, { text: "WhatsApp", bold: true }, { text: ". A message opens with a greeting already written and their trip details filled in. Nothing to retype." }]),
    STEP([{ text: "Assign a driver from the dropdown once you know who is taking it. It reaches their phone at once." }]),
    STEP([{ text: "Click " }, { text: "Mark confirmed", bold: true }, { text: ". The customer's own page updates to Confirmed and they can see it is handled." }]),
    STEP("After the trip you can mark it completed, or the driver will from their side."),
    CALLOUT("Respond fast to “awaiting confirmation”", "That status means someone has paid, or asked us to confirm before paying. It is the exact moment trust is won or lost. Reply quickly and warmly."),
    new Paragraph({ children: [new PageBreak()] }),

    H2("Booking for a caller"),
    P("When someone phones instead of booking online, use “+ New phone-in booking.” Enter the trip and their details, and they immediately receive the same booking email and secure payment link a web customer gets. The email address is the one field you must get exactly right, because everything is sent there."),

    H2("What the customer sees"),
    P("It helps to know the page your customer is looking at while you talk to them. Every booking has its own page showing the trip, the price, what is paid, and a secure pay button. When you confirm, it becomes celebratory."),
    ...SHOT("customer-booking.png", "The customer's own booking page. Their receipt, their status, and their secure Paystack pay button."),
    CALLOUT("All payment is inside the platform", "If a customer wants to pay by transfer, point them to their payment link. Paystack checkout already includes bank transfer and USSD. We never collect money outside the platform, and never take card numbers by phone."),
    DIVIDER(),

    H1("Enquiries"),
    P("Three kinds of message reach you here: VIP requests (someone wants the Rolls or the G-Wagon), corporate-account requests, and contact-form messages. Each card has a WhatsApp reply button."),
    ...SHOT("sales-enquiries.png", "The Enquiries tab. Reply on WhatsApp, then mark responded and closed."),
    STEP("Open the enquiry and read what they want."),
    STEP([{ text: "Tap " }, { text: "WhatsApp reply", bold: true }, { text: " and engage warmly." }]),
    STEP([{ text: "Mark it " }, { text: "responded", bold: true }, { text: " once you have replied, and " }, { text: "closed", bold: true }, { text: " when it is done." }]),
    CALLOUT("VIP prices come from the owner", "Never quote a fixed price for an exotic from memory. Gather the details, pass them to the owner or admin, and they set the price. The client is then emailed a payment link automatically."),
    DIVIDER(),

    H1("Your golden rules"),
    BULLET("Speed is the service. Answer new bookings and enquiries fast."),
    BULLET("Every payment is inside Paystack. Never take card numbers by phone or WhatsApp."),
    BULLET("Quote booking references (like H06-00042) in every conversation."),
    BULLET("Send curious customers to our Instagram, @h06rentals, to see the fleet."),
  ],
});

// ════════════════════════════════════════════════════════════════
// DRIVER
// ════════════════════════════════════════════════════════════════
const driverDoc = buildDoc({
  role: "driver", title: "The Driver's Guide", subtitle: "Driver Handbook", accent: ACCENTS.driver,
  children: [
    H1("Everything runs from your phone"),
    P("Your workspace is one screen, built for your phone: My Trips. It shows only the trips assigned to you, with everything you need for each one, and two buttons that run your day. You will not see other drivers' trips, prices, or any office screens. Just your work, clearly."),
    DIVIDER(),

    ...signInSection("driver", "You sign in with your phone number and password, and land straight on My Trips. Save the page to your home screen so it opens in one tap."),
    DIVIDER(),

    H1("My Trips"),
    P("This is your whole workspace. Each assigned trip is a card with the pickup, the destination, the passenger, their luggage, the flight number, and any notes the office added."),
    ...SHOT("driver-trips.png", "My Trips on a phone. One card per assigned trip, with Call, WhatsApp, and Start trip.", 300),
    H2("Reading a trip card"),
    P("From top to bottom, a card tells you:"),
    BULLET([{ text: "The reference and time. ", bold: true }, { text: "Quote the reference (like H06-00002) if you call the office about this trip." }]),
    BULLET([{ text: "Pickup and destination. ", bold: true }, { text: "Where to be, and where you are taking them." }]),
    BULLET([{ text: "Passenger, bags, flight. ", bold: true }, { text: "Who you are collecting, how much luggage, and the flight to watch if it is an airport run." }]),
    BULLET([{ text: "Notes. ", bold: true }, { text: "Anything special the office wants you to know, like “client prefers a quiet ride.”" }]),
    new Paragraph({ children: [new PageBreak()] }),

    H1("Running a trip"),
    P("Two buttons run your day. Use them at the right moments and the office always knows where things stand, without you having to call."),
    STEP([{ text: "Reach the customer if you need to. " }, { text: "Call", bold: true }, { text: " and " }, { text: "WhatsApp", bold: true }, { text: " buttons on the card dial or message them directly. Use them if you are outside and cannot find them, or if you are held up." }]),
    STEP([{ text: "Tap " }, { text: "Start trip", bold: true }, { text: " when the customer is on board and you are moving. The office sees the trip is underway." }]),
    STEP([{ text: "Tap " }, { text: "Complete trip", bold: true }, { text: " when they arrive. The trip is marked done automatically and moves out of your active list." }]),
    CALLOUT("If a trip is not on your list", "It has not been assigned to you yet. Call the office rather than improvising. Never start a trip that is not on your screen."),
    DIVIDER(),

    H1("The H06 standard on every trip"),
    P("The platform handles the paperwork. You deliver the thing customers actually pay for: a calm, safe, professional ride. A few reminders that never change:"),
    BULLET("Be early. Adhere strictly to the pickup time on the card."),
    BULLET("Inspect the vehicle before and after every trip, and report any issue straight away."),
    BULLET("Keep the car clean, fuelled and presentable."),
    BULLET("Help with luggage, dress professionally, and let the ride be quiet unless the client opens conversation."),
    BULLET("Tell the office promptly about any delay, incident or change, using the Call or WhatsApp buttons."),
    DIVIDER(),

    H1("Your golden rules"),
    BULLET("Only drive trips that appear on your screen."),
    BULLET("Start trip when they board. Complete trip when they arrive."),
    BULLET("Early is on time. On time is late."),
    BULLET("Any problem, tell the office at once."),
  ],
});

// ════════════════════════════════════════════════════════════════
// HR
// ════════════════════════════════════════════════════════════════
const hrDoc = buildDoc({
  role: "hr", title: "The HR Guide", subtitle: "Human Resources Handbook", accent: ACCENTS.hr,
  children: [
    H1("A fair system, run by you"),
    P("You have one tab, Performance, and only you and the owner can open it. It turns our staff job descriptions into weekly numbers that everyone can trust. You set the KPIs, you record what actually happened each week, and the platform does the arithmetic. Because the maths is the same for everyone and the rules are printed on the page, the results defend themselves."),
    P("This guide walks the whole cycle: setting KPIs, recording a week, reading the dashboard, and how the awards are decided."),
    DIVIDER(),

    ...signInSection("hr", "You sign in with your phone number and password, and land straight on the Performance tab."),
    DIVIDER(),

    H1("The week at a glance"),
    P("The top of the page ranks everyone by this week's score, as bars. It is the picture you will screenshot for management each week."),
    ...SHOT("hr-performance.png", "The weekly dashboard. Green bars are eligible scores; grey bars are weeks with too little data to count."),
    H2("How to read it"),
    BULLET([{ text: "The bar and percentage. ", bold: true }, { text: "A weighted average of how much of each KPI the person completed this week." }]),
    BULLET([{ text: "Green versus grey. ", bold: true }, { text: "A green bar is an eligible week. A grey bar means you have scored less than 60% of that person's KPIs, so the week will not count toward awards. It is a gentle reminder to finish scoring." }]),
    BULLET([{ text: "The arrow. ", bold: true }, { text: "How this week compares to last week, up or down." }]),
    BULLET([{ text: "“% scored.” ", bold: true }, { text: "How much of the person's scorecard you have filled in. Aim to get everyone above 60%." }]),
    CALLOUT("Why some bars are grey", "In the example above, Musa is green at 100% because most of his KPIs are scored, while Sade is grey at 79% because under 60% of hers are filled in yet. Finish her scores and the bar turns green and starts counting."),
    new Paragraph({ children: [new PageBreak()] }),

    H1("Setting someone's KPIs"),
    P("Below the dashboard, each person has an expandable section. Open it to score them, and to manage their KPIs."),
    ...SHOT("hr-score-entry.png", "A person's scoring section: their KPIs, the daily and weekly boxes, and the template and custom-KPI tools."),
    H2("The fastest way: a job-description template"),
    P("Every role from the staff job descriptions has a ready-made set of KPIs. In a person's section, pick their role from the template dropdown and click Apply. Their KPIs appear instantly, each with a sensible target and weight. This is the recommended starting point for everyone."),
    STEP("Open the person's section."),
    STEP([{ text: "Choose their role in the " }, { text: "Apply a job-description template", bold: true }, { text: " dropdown." }]),
    STEP([{ text: "Click " }, { text: "Apply", bold: true }, { text: ". Their KPIs are ready to score." }]),
    H2("Adding a custom KPI"),
    P("Need something specific? Use the custom-KPI row. Give it a title, choose daily or weekly, set a target (how many times it should happen in the period), and a weight from 1 to 5 (how much it matters). Weight is how you say “this duty counts more than that one.”"),
    H2("Archiving and deleting"),
    P("If a duty no longer applies, Archive the KPI to stop it counting while keeping its history. Deleting a KPI outright, which also removes its past scores, is reserved for the owner."),
    new Paragraph({ children: [new PageBreak()] }),

    H1("Recording a week"),
    P("This is your weekly rhythm. For each KPI, fill in what actually happened:"),
    BULLET([{ text: "Daily KPIs. ", bold: true }, { text: "There is a small box for each working day, Monday to Saturday. Enter the number achieved that day. Leave a day blank if there is genuinely nothing to record; blank means “no data,” not zero." }]),
    BULLET([{ text: "Weekly KPIs. ", bold: true }, { text: "One box for the whole week. Enter the number achieved." }]),
    BULLET([{ text: "A note. ", bold: true }, { text: "Optional, but useful. “Thursday missed, generator fault” turns a number into a story management can trust." }]),
    P("Click Save on that KPI and the dashboard updates immediately. Do this once a week for everyone and the whole system stays honest."),
    CALLOUT("Pick the week with the arrows", "Use Previous and Next at the top to move between weeks. You can catch up on a past week, or get ahead. The current week is always labelled."),
    DIVIDER(),

    H1("How the score is calculated"),
    P("The rules are printed on the page so nobody has to take them on faith. In plain words:"),
    BULLET([{ text: "Each KPI is capped at 100%. ", bold: true }, { text: "Doing a duty five times when the target was two still counts as 100%, so heroic effort on one thing cannot paper over a missed one." }]),
    BULLET([{ text: "Unscored is not zero. ", bold: true }, { text: "A KPI you have not scored is treated as missing data and left out of the average, rather than dragging someone down." }]),
    BULLET([{ text: "The weekly score is weighted. ", bold: true }, { text: "Higher-weight duties pull the average more, exactly as you set them." }]),
    BULLET([{ text: "Coverage gates the week. ", bold: true }, { text: "A week only counts toward awards if you scored at least 60% of the person's KPIs." }]),
    DIVIDER(),

    H1("Staff of the Month, Quarter and Year"),
    P("At the bottom of the page, the awards are worked out straight from your numbers. Nothing is hand-picked."),
    ...SHOT("hr-awards.png", "The recognition panel. Month, quarter and year, each averaging only the eligible weeks."),
    BULLET([{ text: "How the winner is chosen. ", bold: true }, { text: "The average of a person's eligible weekly scores across the period. Ties break on who has the most complete scoring." }]),
    BULLET([{ text: "Who qualifies. ", bold: true }, { text: "Someone needs eligible weeks covering at least 60% of the period. Until then the panel says nobody qualifies yet, which simply means keep scoring." }]),
    CALLOUT("The awards defend themselves", "Because every number, who recorded it and when, is in the exported spreadsheet, any result can be explained. Keep the weekly scores honest and the recognition is beyond dispute."),
    DIVIDER(),

    H1("Downloading the report"),
    P("The “Download performance CSV” button at the top gives you the complete history as a spreadsheet: every KPI, every score, the completion percentage, the note, and who recorded it. It is the evidence behind every bar and every award."),

    H1("Your weekly rhythm, in short"),
    STEP("Once a week, open each person's section and record what happened."),
    STEP("Get everyone above 60% scored so their week counts."),
    STEP("Screenshot the week-at-a-glance for management."),
    STEP("At month, quarter and year end, the awards are already calculated. Download the CSV if anyone wants the detail."),
  ],
});

// ── write them all ─────────────────────────────────────────────
const docs = [
  ["H06 Guide - Owner.docx", ownerDoc],
  ["H06 Guide - Admin.docx", adminDoc],
  ["H06 Guide - Sales.docx", salesDoc],
  ["H06 Guide - Driver.docx", driverDoc],
  ["H06 Guide - HR.docx", hrDoc],
];

(async () => {
  for (const [name, doc] of docs) {
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(OUT_DIR, name), buffer);
    console.log("written:", name);
  }
})();

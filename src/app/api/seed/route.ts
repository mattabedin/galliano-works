import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const secret = req.headers.get("x-seed-secret");
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.subcontractor.count();
  if (existing > 0) {
    return NextResponse.json({ message: "Already seeded", count: existing });
  }

  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.payHistory.deleteMany();
  await prisma.lineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subcontractor.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: { id: "user-admin", email: "admin@galliano.co", name: "Jolene Galliano", role: "admin" },
  });

  await Promise.all([
    prisma.subcontractor.create({ data: { id: "s1", name: "Marcus Delgado",  trade: "Roofing",    rate: 0.55, color: "#e85a4f", initials: "MD" } }),
    prisma.subcontractor.create({ data: { id: "s2", name: "Priya Shah",      trade: "Electrical", rate: 0.50, color: "#6b8cbf", initials: "PS" } }),
    prisma.subcontractor.create({ data: { id: "s3", name: "Dwayne Okafor",   trade: "HVAC",       rate: 0.52, color: "#4a8a6e", initials: "DO" } }),
    prisma.subcontractor.create({ data: { id: "s4", name: "Elena Koslov",    trade: "Plumbing",   rate: 0.48, color: "#b58a3d", initials: "EK" } }),
    prisma.subcontractor.create({ data: { id: "s5", name: "Tomás Iglesias",  trade: "Carpentry",  rate: 0.50, color: "#7b5ea7", initials: "TI" } }),
    prisma.subcontractor.create({ data: { id: "s6", name: "Rachel Chen",     trade: "Drywall",    rate: 0.45, color: "#3d7a8a", initials: "RC" } }),
  ]);

  await prisma.invoice.create({
    data: {
      id: "inv-1024", number: "INV-1024", client: "Brookside Estates HOA",
      address: "4410 Willow Creek Dr, Austin TX", issued: "2026-04-15", due: "2026-05-15", source: "FreshBooks",
      lines: { create: [
        { id: "l1",  desc: "Replace damaged asphalt shingles, NE elevation", invoice: 2800, laborPct: 0.55, subId: "s1", status: "approved",    expenses: 380, note: "Completed 4/18, photos attached" },
        { id: "l2",  desc: "Gutter realignment + seal",                      invoice: 640,  laborPct: 0.55, subId: "s1", status: "submitted",   expenses: 60  },
        { id: "l3",  desc: "Replace 3 damaged facia boards",                 invoice: 520,  laborPct: 0.50, subId: "s5", status: "in_progress", expenses: 95  },
        { id: "l4",  desc: "Attic ventilation inspection",                   invoice: 180,  laborPct: 0.50, subId: "s3", status: "assigned",    expenses: 0   },
      ]},
    },
  });

  await prisma.invoice.create({
    data: {
      id: "inv-1025", number: "INV-1025", client: "Mesquite Commons LLC",
      address: "2200 S. Lamar, Austin TX", issued: "2026-04-17", due: "2026-05-17", source: "FreshBooks",
      lines: { create: [
        { id: "l5",  desc: "HVAC condenser replacement (5-ton)",  invoice: 3200, laborPct: 0.45, subId: "s3", status: "approved",    expenses: 1650, note: "Carrier unit installed" },
        { id: "l6",  desc: "Thermostat retrofit — 4 units",       invoice: 760,  laborPct: 0.55, subId: "s3", status: "approved",    expenses: 220  },
        { id: "l7",  desc: "Panel upgrade 100A → 200A",           invoice: 2100, laborPct: 0.48, subId: "s2", status: "submitted",   expenses: 540, note: "Inspection scheduled 4/24" },
        { id: "l8",  desc: "Replace kitchen GFCI circuits",       invoice: 480,  laborPct: 0.55, subId: "s2", status: "in_progress", expenses: 85   },
      ]},
    },
  });

  await prisma.invoice.create({
    data: {
      id: "inv-1026", number: "INV-1026", client: "Parkview Medical Group",
      address: "810 Research Blvd, Austin TX", issued: "2026-04-20", due: "2026-05-20", source: "CSV Import",
      lines: { create: [
        { id: "l9",  desc: "Break room plumbing rough-in",               invoice: 1450, laborPct: 0.50, subId: "s4", status: "in_progress", expenses: 310 },
        { id: "l10", desc: "ADA bathroom fixture install",               invoice: 980,  laborPct: 0.50, subId: "s4", status: "assigned",    expenses: 0   },
        { id: "l11", desc: "Drywall patch + prime — exam rooms 3,4,5",  invoice: 720,  laborPct: 0.50, subId: "s6", status: "assigned",    expenses: 0   },
        { id: "l12", desc: "Custom reception counter build",             invoice: 2250, laborPct: 0.55, subId: "s5", status: "assigned",    expenses: 0   },
        { id: "l13", desc: "Lighting — waiting area (8 fixtures)",       invoice: 1100, laborPct: 0.50, subId: null, status: "unassigned",  expenses: 0   },
      ]},
    },
  });

  await prisma.invoice.create({
    data: {
      id: "inv-1027", number: "INV-1027", client: "Greenfield Residential",
      address: "17 unit new build — Cedar Park", issued: "2026-04-21", due: "2026-05-21", source: "FreshBooks",
      lines: { create: [
        { id: "l14", desc: "Unit 3A: full electrical rough", invoice: 3800, laborPct: 0.50, subId: null, status: "unassigned", expenses: 0 },
        { id: "l15", desc: "Unit 3A: HVAC rough-in",         invoice: 2900, laborPct: 0.50, subId: null, status: "unassigned", expenses: 0 },
        { id: "l16", desc: "Unit 3A: plumbing rough-in",     invoice: 2400, laborPct: 0.50, subId: null, status: "unassigned", expenses: 0 },
        { id: "l17", desc: "Unit 3B: full electrical rough", invoice: 3800, laborPct: 0.50, subId: null, status: "unassigned", expenses: 0 },
      ]},
    },
  });

  await prisma.payHistory.createMany({
    data: [
      { subId: "s1", week: "Apr 6–12",     amount: 1840, items: 6 },
      { subId: "s1", week: "Mar 30–Apr 5", amount: 2110, items: 7 },
      { subId: "s2", week: "Apr 6–12",     amount: 1220, items: 4 },
      { subId: "s3", week: "Apr 6–12",     amount: 2340, items: 8 },
      { subId: "s4", week: "Apr 6–12",     amount: 975,  items: 3 },
      { subId: "s5", week: "Apr 6–12",     amount: 1560, items: 5 },
      { subId: "s6", week: "Apr 6–12",     amount: 820,  items: 2 },
    ],
  });

  return NextResponse.json({ ok: true, message: "Database seeded successfully" });
}

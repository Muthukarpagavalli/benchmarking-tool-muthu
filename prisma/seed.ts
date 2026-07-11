import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Same 10-criterion weighted scoring framework applied to every category,
// mirroring the structure of the uploaded spreadsheet template. Weights
// are fractions summing to 1.0 (the original template's example weights
// summed to 1.1, which we've corrected here).
const STANDARD_CRITERIA = [
  { name: "Core functionality & feature coverage", weight: 0.18, description: "Breadth and depth of features relevant to this category" },
  { name: "Ease of use / UX", weight: 0.10, description: "Learning curve, interface design, user adoption ease" },
  { name: "AI capabilities", weight: 0.15, description: "Quality and usefulness of AI-powered features" },
  { name: "Integrations & API", weight: 0.10, description: "Ability to connect with existing tech stack" },
  { name: "Security & compliance", weight: 0.12, description: "Certifications (SOC2, ISO), data residency, access controls" },
  { name: "Scalability", weight: 0.08, description: "Ability to handle growing volume/users/complexity" },
  { name: "Customization/configurability", weight: 0.07, description: "Ability to tailor workflows to org needs" },
  { name: "Customer support & onboarding", weight: 0.07, description: "Quality of implementation help and ongoing support" },
  { name: "Pricing / value for money", weight: 0.10, description: "Cost relative to features and ROI" },
  { name: "Market presence & reviews", weight: 0.03, description: "Reputation, analyst recognition, user reviews (e.g. G2)" },
];

type Cell = { status: "yes" | "no" | "partial" | "unknown"; notes?: string };

// Example "what does our own firm actually use" data, so the benchmark
// reports have something real to compare peer sightings against. Adjust
// these to match your firm's actual stack.
const OUR_FIRM_STATUS: Record<string, string> = {
  "DocuSign CLM": "adopted",
  iManage: "adopted",
  CoCounsel: "evaluating",
  Clio: "adopted",
  Westlaw: "adopted",
};

const categories = [
  {
    slug: "clm",
    name: "CLM",
    description: "Contract lifecycle management: Intake, negotiation, creation, approval, execution and storage.",
    tools: ["Ironclad", "Juro", "Icertis", "Agiloft", "DocuSign CLM"],
    capabilities: [
      {
        name: "Request intake",
        cells: {
          Agiloft: { status: "yes", notes: "Dynamic forms adapt live to answers — strongest of the five" },
          Ironclad: { status: "yes", notes: "Guided intake forms + automated third-party paper intake" },
          "DocuSign CLM": { status: "yes", notes: "100+ pre-built workflow steps, drag-and-drop" },
          Juro: { status: "partial", notes: "Smart intake forms, CRM/ATS-triggered" },
          Icertis: { status: "partial", notes: "Role-based guided workflows, enterprise-scale" },
        },
      },
      {
        name: "Drafting & templates",
        cells: {
          Ironclad: { status: "yes", notes: "Template library, native Word and Google Docs sync" },
          "DocuSign CLM": { status: "yes", notes: "Dynamic templates auto-populated from CRM/ERP" },
          Juro: { status: "yes", notes: "Browser-native editor, AI Draft assistant" },
          Icertis: { status: "partial", notes: "Draft inside Word or Salesforce, clause playbooks" },
          Agiloft: { status: "partial", notes: "Templates and clause library, lighter Word integration" },
        },
      },
      {
        name: "AI-assisted redlining",
        cells: {
          Ironclad: { status: "yes", notes: "Jurist AI — deeply integrated, strong reviewer sentiment" },
          Icertis: { status: "yes", notes: "Copilot on Azure OpenAI, negotiation intelligence" },
          Juro: { status: "yes", notes: "AI Review plus AI Extract for third-party paper" },
          "DocuSign CLM": { status: "partial", notes: "Iris AI flags non-compliant clauses" },
          Agiloft: { status: "no", notes: "AI clause detection, noted as less mature by reviewers" },
        },
      },
      {
        name: "Approval workflow",
        cells: {
          Agiloft: { status: "yes", notes: "No-code workflow engine — Agiloft's core differentiator" },
          Ironclad: { status: "yes", notes: "Drag-and-drop Workflow Designer, conditional routing" },
          "DocuSign CLM": { status: "yes", notes: "Drag-and-drop editor, 100+ pre-configured steps" },
          Icertis: { status: "partial", notes: "Highly configurable, usually needs an implementation partner" },
          Juro: { status: "partial", notes: "Solid approval control, less of a visual builder" },
        },
      },
      {
        name: "E-signature",
        cells: {
          "DocuSign CLM": { status: "yes", notes: "Native — this is DocuSign's own core product" },
          Juro: { status: "yes", notes: "Native, built-in, eIDAS/ESIGN compliant" },
          Ironclad: { status: "yes", notes: "Native Ironclad Signature, added later as an add-on" },
          Icertis: { status: "no", notes: "Integrates with e-sign tools, no native product" },
          Agiloft: { status: "no", notes: "Integrates with DocuSign or Adobe Sign, no native e-sign" },
        },
      },
      {
        name: "Obligation & renewal tracking",
        cells: {
          Icertis: { status: "yes", notes: "Core enterprise strength — AI-driven renewal intelligence" },
          Agiloft: { status: "yes", notes: "AI Obligation Management module, compliance-heavy focus" },
          Ironclad: { status: "yes", notes: "Obligations Dashboard plus AI Renewals Dashboard" },
          "DocuSign CLM": { status: "partial", notes: "Milestone and renewal tracking" },
          Juro: { status: "no", notes: "Renewal reminders, lighter-weight than the others" },
        },
      },
    ],
  },
  {
    slug: "dms",
    name: "DMS",
    description: "Document and email management: storage, version control, ethical walls, and AI-assisted retrieval.",
    tools: ["iManage", "NetDocuments", "SharePoint"],
    capabilities: [
      {
        name: "Storage and search",
        cells: {
          iManage: { status: "yes", notes: "Market-leading, matter-centric repository at enterprise scale" },
          NetDocuments: { status: "yes", notes: "Cloud-native, new context graph maps relationships across matters" },
          SharePoint: { status: "partial", notes: "Needs metadata/governance discipline to become truly matter-centric" },
        },
      },
      {
        name: "Version control",
        cells: {
          iManage: { status: "yes", notes: "Locks documents read-only when checked out; indexes 20+ versions" },
          NetDocuments: { status: "yes", notes: "Full version history, cloud-native co-authoring" },
          SharePoint: { status: "yes", notes: "Native, unlimited version history when configured" },
        },
      },
      {
        name: "Access control & ethical walls",
        cells: {
          iManage: { status: "yes", notes: "\"Need to Know\" security as standard" },
          SharePoint: { status: "yes", notes: "Purview Information Barriers, requires deliberate architecture" },
          NetDocuments: { status: "yes", notes: "Enforces existing permissions automatically for AI features too" },
        },
      },
      {
        name: "Email filing",
        cells: {
          iManage: { status: "yes", notes: "AI-automated email filing to reduce manual work" },
          NetDocuments: { status: "yes", notes: "Send & File, automatic filing by client, matter, or topic" },
          SharePoint: { status: "partial", notes: "Native capture is limited; usually needs Outlook add-ins" },
        },
      },
      {
        name: "AI document assistant",
        cells: {
          NetDocuments: { status: "yes", notes: "ndMAX Smart Answers, cited conversational Q&A" },
          iManage: { status: "yes", notes: "Ask iManage summarizes and extracts clauses" },
          SharePoint: { status: "partial", notes: "Microsoft Copilot is capable but not legal-specific" },
        },
      },
    ],
  },
  {
    slug: "genai",
    name: "GenAI",
    description: "Generative AI platforms for legal research, drafting, contract review, and due diligence.",
    tools: ["Harvey", "CoCounsel", "Spellbook", "Legora"],
    capabilities: [
      {
        name: "Contract review & redlining",
        cells: {
          Spellbook: { status: "yes", notes: "Word-native, benchmarks against 2,300+ contract types" },
          Legora: { status: "partial", notes: "Collaborative AI workspace, strong European/Nordic traction" },
          Harvey: { status: "partial", notes: "Capable but broader-scope, not contract-specialized" },
          CoCounsel: { status: "partial", notes: "Contract analysis is one part of a wider research platform" },
        },
      },
      {
        name: "Legal research",
        cells: {
          CoCounsel: { status: "yes", notes: "Native Westlaw and Practical Law grounding" },
          Harvey: { status: "yes", notes: "Knowledge product with 160+ added data sources" },
          Legora: { status: "partial", notes: "Solid research support, less deep than Westlaw-grounded tools" },
          Spellbook: { status: "no", notes: "Ask feature only answers questions about the open document" },
        },
      },
      {
        name: "Drafting assistance",
        cells: {
          Spellbook: { status: "yes", notes: "Purpose-built for drafting directly inside Word" },
          Harvey: { status: "yes", notes: "Harvey for Word gives context-aware inline edits" },
          CoCounsel: { status: "partial", notes: "Brief Builder agent for complex briefs and motions" },
          Legora: { status: "partial", notes: "Collaborative drafting workspace" },
        },
      },
      {
        name: "Due diligence / bulk review",
        cells: {
          Harvey: { status: "yes", notes: "Vault handles up to 100,000 documents per project" },
          Legora: { status: "partial", notes: "Capable, less proven at Harvey Vault's scale" },
          CoCounsel: { status: "partial", notes: "Less specialized for high-volume diligence work" },
          Spellbook: { status: "no", notes: "Associate agent handles multi-document review, narrower scope" },
        },
      },
      {
        name: "Litigation support",
        cells: {
          CoCounsel: { status: "yes", notes: "Deposition prep, litigation strategy memos" },
          Harvey: { status: "partial", notes: "Litigation workflows supported across Assistant and Agents" },
          Legora: { status: "partial", notes: "General capability, not litigation-specialized" },
          Spellbook: { status: "no", notes: "Explicitly optimized for transactional work" },
        },
      },
    ],
  },
  {
    slug: "ediscovery",
    name: "E-Discovery",
    description: "Identify, collect, review, and produce digital evidence defensibly.",
    tools: ["Relativity", "Everlaw", "DISCO", "Logikcull (Reveal)"],
    capabilities: [
      {
        name: "Processing & ingestion speed",
        cells: {
          Everlaw: { status: "yes", notes: "Up to 1 million documents per hour ingestion" },
          DISCO: { status: "yes", notes: "Fast processing, deeply integrated with AI review" },
          Relativity: { status: "partial", notes: "Powerful but users note slower processing scores vs. rivals" },
          "Logikcull (Reveal)": { status: "partial", notes: "Fine under 100GB, self-service" },
        },
      },
      {
        name: "AI-assisted review / predictive coding",
        cells: {
          DISCO: { status: "yes", notes: "Cecilia AI is agentic, reduces reviewer hours 50%+" },
          Everlaw: { status: "yes", notes: "EverlawAI, Deep Dive tested on 10M+ document datasets" },
          Relativity: { status: "yes", notes: "aiR module, court-approved TAR since 2012" },
          "Logikcull (Reveal)": { status: "partial", notes: "Lacks the advanced AI depth of the top three" },
        },
      },
      {
        name: "Ease of use / onboarding",
        cells: {
          "Logikcull (Reveal)": { status: "yes", notes: "Simplest, designed for attorney self-service" },
          Everlaw: { status: "yes", notes: "Shortest retraining curve (1-2 weeks), most learned same-day" },
          DISCO: { status: "yes", notes: "9.3 G2 ease-of-use score, built by trial lawyers" },
          Relativity: { status: "no", notes: "Steeper learning curve, usually needs trained administrators" },
        },
      },
      {
        name: "Pricing transparency",
        cells: {
          "Logikcull (Reveal)": { status: "yes", notes: "Most transparent, starts around $250/month" },
          DISCO: { status: "yes", notes: "All-inclusive, competitive per-GB/user pricing" },
          Everlaw: { status: "partial", notes: "Clearer than Relativity but still enterprise-level" },
          Relativity: { status: "no", notes: "Opaque, sales-quote only, $50K-500K+ typical" },
        },
      },
      {
        name: "Analytics & visualization",
        cells: {
          Everlaw: { status: "yes", notes: "Storybuilder turns discovery into a narrative view" },
          Relativity: { status: "yes", notes: "Concept clustering, communication analysis via Brainspace" },
          DISCO: { status: "yes", notes: "Strong review analytics built into the workflow" },
          "Logikcull (Reveal)": { status: "partial", notes: "Basic analytics, not a core strength" },
        },
      },
    ],
  },
  {
    slug: "legal-research",
    name: "Legal Research",
    description: "Case law, statutes, and secondary sources, increasingly AI-assisted.",
    tools: ["Westlaw", "Lexis+ (Protege)", "vLex (Vincent AI)"],
    capabilities: [
      {
        name: "US case law depth",
        cells: {
          Westlaw: { status: "yes", notes: "Deepest US case law database, KeyCite, gold standard" },
          "Lexis+ (Protege)": { status: "yes", notes: "Matches Westlaw breadth, adds Shepard's Citations" },
          "vLex (Vincent AI)": { status: "partial", notes: "Can't compete with Westlaw on pure US depth" },
        },
      },
      {
        name: "AI research assistant",
        cells: {
          "Lexis+ (Protege)": { status: "yes", notes: "Lowest hallucination rate of the big two (~17%, Stanford study)" },
          "vLex (Vincent AI)": { status: "yes", notes: "Natively built AI, handles your own document uploads too" },
          Westlaw: { status: "partial", notes: "CoCounsel is strong but ~33% hallucination rate in the same study" },
        },
      },
      {
        name: "International / multi-jurisdiction coverage",
        cells: {
          "vLex (Vincent AI)": { status: "yes", notes: "100+ countries — no other platform comes close" },
          "Lexis+ (Protege)": { status: "partial", notes: "Decent but not vLex-level for cross-border work" },
          Westlaw: { status: "no", notes: "More siloed outside the Thomson Reuters ecosystem" },
        },
      },
      {
        name: "Citation validation",
        cells: {
          Westlaw: { status: "yes", notes: "KeyCite — decades of refinement" },
          "Lexis+ (Protege)": { status: "yes", notes: "Shepard's Citator, \"At Risk\" alerts" },
          "vLex (Vincent AI)": { status: "partial", notes: "Less established citator depth than the incumbents" },
        },
      },
      {
        name: "Pricing transparency",
        cells: {
          "vLex (Vincent AI)": { status: "yes", notes: "Published pricing, $69-150/user/month, only one with a free tier" },
          Westlaw: { status: "no", notes: "Quote-based, often $100-400+/user/month" },
          "Lexis+ (Protege)": { status: "no", notes: "Quote-only, depends on practice group and usage" },
        },
      },
    ],
  },
  {
    slug: "practice-management",
    name: "Practice Management",
    description: "Case/matter management, billing, intake, and firm operations.",
    tools: ["Clio", "MyCase", "PracticePanther", "Filevine"],
    capabilities: [
      {
        name: "Case / matter management",
        cells: {
          Clio: { status: "yes", notes: "Most mature, industry standard, 150,000+ users, 250+ integrations" },
          MyCase: { status: "yes", notes: "Simple, strong fit for solo and mid-market firms" },
          PracticePanther: { status: "yes", notes: "Automation-focused, good for mid-size firms" },
          Filevine: { status: "yes", notes: "Deep customization, best for high-volume litigation/personal injury" },
        },
      },
      {
        name: "Billing & trust accounting",
        cells: {
          Clio: { status: "yes", notes: "Strong, mature billing workflows" },
          MyCase: { status: "yes", notes: "Integrated invoicing built in" },
          PracticePanther: { status: "yes", notes: "Native PantherPayments, transparent transaction fees" },
          Filevine: { status: "no", notes: "No native payment processor, needs a third-party add-on" },
        },
      },
      {
        name: "Client portal & communication",
        cells: {
          Clio: { status: "yes", notes: "Full-featured client communication tools" },
          MyCase: { status: "yes", notes: "Built specifically around client communication and engagement" },
          PracticePanther: { status: "yes", notes: "Secure client messaging included" },
          Filevine: { status: "partial", notes: "2-way texting is strong, but document handling is noted as incomplete" },
        },
      },
      {
        name: "Integrations ecosystem",
        cells: {
          Clio: { status: "yes", notes: "250+ integrations — the widest of any platform here" },
          MyCase: { status: "partial", notes: "Fewer integrations (QuickBooks, Dropbox, Outlook, Gmail)" },
          PracticePanther: { status: "partial", notes: "Narrower ecosystem, focused on native billing/e-sign instead" },
          Filevine: { status: "partial", notes: "Available but adds cost and complexity" },
        },
      },
      {
        name: "Mobile app quality",
        cells: {
          PracticePanther: { status: "yes", notes: "Fully-featured iOS/Android app mirrors the desktop experience" },
          Clio: { status: "yes", notes: "Strong, frequently cited as a top mobile experience" },
          MyCase: { status: "partial", notes: "Solid but less noted than Clio or PracticePanther" },
          Filevine: { status: "no", notes: "Lacks a fully-featured mobile app" },
        },
      },
    ],
  },
];

async function main() {
  await prisma.peerAdoption.deleteMany();
  await prisma.peerFirm.deleteMany();
  await prisma.newsEntry.deleteMany();
  await prisma.toolScore.deleteMany();
  await prisma.scoringCriterion.deleteMany();
  await prisma.toolCapability.deleteMany();
  await prisma.capability.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.category.deleteMany();

  for (const cat of categories) {
    const category = await prisma.category.create({
      data: { slug: cat.slug, name: cat.name, description: cat.description },
    });

    const toolRecords: Record<string, { id: string }> = {};
    for (const toolName of cat.tools) {
      const tool = await prisma.tool.create({
        data: {
          categoryId: category.id,
          name: toolName,
          ourFirmStatus: OUR_FIRM_STATUS[toolName] ?? "unknown",
        },
      });
      toolRecords[toolName] = tool;
    }

    for (let i = 0; i < cat.capabilities.length; i++) {
      const capDef = cat.capabilities[i];
      const capability = await prisma.capability.create({
        data: { categoryId: category.id, name: capDef.name, order: i },
      });
      for (const [toolName, cell] of Object.entries(capDef.cells as Record<string, Cell>)) {
        if (!toolRecords[toolName]) continue;
        await prisma.toolCapability.create({
          data: {
            toolId: toolRecords[toolName].id,
            capabilityId: capability.id,
            status: cell.status,
            notes: cell.notes ?? null,
          },
        });
      }
    }

    for (let i = 0; i < STANDARD_CRITERIA.length; i++) {
      const c = STANDARD_CRITERIA[i];
      await prisma.scoringCriterion.create({
        data: { categoryId: category.id, name: c.name, weight: c.weight, description: c.description, order: i },
      });
    }

    const frameworkId = randomUUID();
    const now = new Date();
    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO ScoringFramework (id, categoryId, name, createdAt, updatedAt)
        VALUES (${frameworkId}, ${category.id}, ${cat.name} + ' Internal Benchmark', ${now}, ${now})
      `,
      ...cat.tools.map((toolName, index) =>
        prisma.$executeRaw`
          INSERT INTO ScoringFrameworkTool (id, frameworkId, name, sortOrder)
          VALUES (${randomUUID()}, ${frameworkId}, ${toolName}, ${index})
        `
      ),
      ...STANDARD_CRITERIA.map((criterion, index) =>
        prisma.$executeRaw`
          INSERT INTO ScoringFrameworkCriterion (id, frameworkId, name, description, weight, sortOrder)
          VALUES (${randomUUID()}, ${frameworkId}, ${criterion.name}, ${criterion.description}, ${criterion.weight}, ${index})
        `
      ),
    ]);
  }

  // A couple of example news log entries so the log isn't empty on first load.
  const clm = await prisma.category.findUnique({ where: { slug: "clm" } });
  const ironclad = await prisma.tool.findFirst({ where: { name: "Ironclad" } });
  if (clm && ironclad) {
    await prisma.newsEntry.create({
      data: {
        categoryId: clm.id,
        toolId: ironclad.id,
        date: new Date(),
        updateType: "AI Feature",
        summary: "Example entry — delete me. Launched an AI clause-risk assistant in beta.",
        sourceUrl: "https://example.com/news",
        impact: "Watch",
        loggedBy: "Example",
      },
    });
  }

  // Example peer firm benchmarking entries for Component 2.
  const peerFirm = await prisma.peerFirm.create({ data: { name: "Example Peer Firm LLP" } });
  const genai = await prisma.category.findUnique({ where: { slug: "genai" } });
  const harvey = await prisma.tool.findFirst({ where: { name: "Harvey" } });
  if (genai && harvey) {
    await prisma.peerAdoption.create({
      data: {
        peerFirmId: peerFirm.id,
        categoryId: genai.id,
        toolId: harvey.id,
        dateLogged: new Date(),
        sourceNote: "Example entry — delete me. Mentioned in a legal press article about their AI rollout.",
        sourceUrl: "https://example.com/press",
      },
    });
  }

  console.log("Seeded 6 categories with real vendor research, scoring frameworks, and example log entries");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

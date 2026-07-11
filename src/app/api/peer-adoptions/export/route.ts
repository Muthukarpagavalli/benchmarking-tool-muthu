import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 24;

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, limit: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > limit && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function textOps(lines: string[], x: number, y: number, size = 9, font: 1 | 2 = 1, color: [number, number, number] = [0.1, 0.1, 0.1]) {
  const ops: string[] = [`BT /F${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg`];
  let currentY = y;
  for (const line of lines) {
    ops.push(`1 0 0 1 ${x} ${currentY} Tm (${escapePdfText(line)}) Tj`);
    currentY -= size + 2;
  }
  ops.push("ET");
  return ops.join("\n");
}

function rectOps(x: number, y: number, w: number, h: number, fill: [number, number, number], stroke?: [number, number, number]) {
  const ops = [`q ${fill[0]} ${fill[1]} ${fill[2]} rg ${x} ${y} ${w} ${h} re f`];
  if (stroke) ops.push(`q ${stroke[0]} ${stroke[1]} ${stroke[2]} RG 1 w ${x} ${y} ${w} ${h} re S Q`);
  ops.push("Q");
  return ops.join("\n");
}

function buildPdf(page: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 6 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    `<< /Length ${page.length} >>\nstream\n${page}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

export async function GET(req: NextRequest) {
  const where: Record<string, unknown> = {};
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const firmId = req.nextUrl.searchParams.get("firmId");
  const toolId = req.nextUrl.searchParams.get("toolId");
  const vendor = req.nextUrl.searchParams.get("vendor");
  const industry = req.nextUrl.searchParams.get("industry");
  const dateFrom = req.nextUrl.searchParams.get("dateFrom");
  const dateTo = req.nextUrl.searchParams.get("dateTo");
  if (categoryId) where.categoryId = categoryId;
  if (firmId) where.peerFirmId = firmId;
  if (toolId) where.toolId = toolId;
  if (vendor) where.tool = { name: vendor };
  if (industry) where.category = { name: industry };
  if (dateFrom || dateTo) {
    where.dateLogged = {};
    if (dateFrom) (where.dateLogged as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.dateLogged as Record<string, unknown>).lte = new Date(dateTo);
  }

  const adoptions = await prisma.peerAdoption.findMany({
    where,
    include: { peerFirm: true, category: true, tool: true },
    orderBy: { dateLogged: "desc" },
  });
  const reportTitle = categoryId ? `Where We Stand - ${adoptions[0]?.category.name ?? "Peer Benchmarking"}` : "Peer Benchmarking Report";
  const rows = adoptions.slice(0, 12);
  const moreCount = Math.max(adoptions.length - rows.length, 0);
  const rowText = rows
    .map((a) => {
      const date = new Date(a.dateLogged).toLocaleDateString();
      return `${date} | ${a.peerFirm.name} | ${a.category.name} | ${a.tool?.name ?? "-"} | ${a.sourceNote}`;
    })
    .join("\n");

  const page = [
    rectOps(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.99, 0.99, 0.98]),
    rectOps(0, PAGE_HEIGHT - 60, PAGE_WIDTH, 60, [0.25, 0.39, 0.30]),
    textOps(["Peer benchmarking export"], MARGIN, PAGE_HEIGHT - 22, 10.5, 2, [0.92, 0.96, 0.92]),
    textOps([reportTitle], MARGIN, PAGE_HEIGHT - 40, 18, 2, [1, 1, 1]),
    textOps([`Presentation-ready export | ${new Date().toLocaleDateString()}`], PAGE_WIDTH - 210, PAGE_HEIGHT - 22, 9, 1, [0.93, 0.96, 0.93]),
    rectOps(MARGIN, 408, PAGE_WIDTH - MARGIN * 2, 110, [1, 1, 1], [0.84, 0.89, 0.84]),
    textOps(["Report summary"], MARGIN + 10, 494, 12, 2, [0.15, 0.28, 0.19]),
    textOps(
      [
        `Entries included: ${adoptions.length}`,
        `Filters: ${[
          categoryId ? "category" : null,
          firmId ? "firm" : null,
          toolId ? "tool" : null,
          vendor ? "vendor" : null,
          industry ? "industry" : null,
          dateFrom || dateTo ? "date range" : null,
        ]
          .filter(Boolean)
          .join(", ") || "none"}`,
        moreCount ? `Additional rows not shown on this page: ${moreCount}` : "All matched rows shown on this page",
      ],
      MARGIN + 10,
      478,
      9
    ),
    rectOps(MARGIN, 40, PAGE_WIDTH - MARGIN * 2, 350, [0.975, 0.988, 0.975], [0.84, 0.89, 0.84]),
    textOps(["Date | Firm | Category | Tool | Source note"], MARGIN + 10, 374, 9.2, 2, [0.15, 0.28, 0.19]),
    textOps(wrapText(rowText || "No adoptions found.", 105), MARGIN + 10, 358, 8.2),
  ].join("\n");

  return new Response(buildPdf(page), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reportTitle.replace(/[^a-z0-9]+/gi, "_")}.pdf"`,
    },
  });
}

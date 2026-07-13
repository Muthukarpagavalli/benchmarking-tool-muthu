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

function tableBox(
  title: string,
  headers: string[],
  rows: string[][],
  x: number,
  y: number,
  w: number,
  colWidths: number[]
) {
  const titleH = 24;
  const headerH = 18;
  const rowH = rows.length ? 18 : 16;
  const h = 34 + titleH + headerH + rowH * Math.max(rows.length, 1);
  const top = y + h;
  let output = rectOps(x, y, w, h, [1, 1, 1], [0.84, 0.89, 0.84]);
  output += `\n${rectOps(x, top - titleH, w, titleH, [0.25, 0.39, 0.30], [0.25, 0.39, 0.30])}`;
  output += `\n${textOps([title], x + 10, top - 9, 11, 2, [1, 1, 1])}`;
  output += `\n${rectOps(x + 1, top - titleH - headerH, w - 2, headerH, [0.975, 0.988, 0.975], [0.88, 0.92, 0.88])}`;
  let cursorX = x;
  headers.forEach((header, index) => {
    output += `\n${textOps([header], cursorX + 10, top - titleH - 6, 9.2, 2, [0.15, 0.28, 0.19])}`;
    cursorX += colWidths[index] ?? 0;
  });
  const rowStartY = top - titleH - headerH - 10;
  if (rows.length === 0) {
    output += `\n${textOps(["No entries found."], x + 10, rowStartY - 2, 8.4)}`;
    return output;
  }
  rows.forEach((row, rowIndex) => {
    const rowTop = rowStartY - rowIndex * rowH;
    output += `\n${rectOps(x + 1, rowTop - rowH + 1, w - 2, rowH, [1, 1, 1], [0.89, 0.93, 0.89])}`;
    let cellX = x;
    headers.forEach((_, index) => {
      output += `\n${textOps([row[index] ?? ""], cellX + 10, rowTop - 8, 8.2)}`;
      cellX += colWidths[index] ?? 0;
    });
  });
  return output;
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
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const toolId = req.nextUrl.searchParams.get("toolId");
  const featureType = req.nextUrl.searchParams.get("featureType");
  const dateFrom = req.nextUrl.searchParams.get("dateFrom");
  const dateTo = req.nextUrl.searchParams.get("dateTo");
  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (toolId) where.toolId = toolId;
  if (featureType) where.updateType = featureType;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
  }

  const entries = await prisma.newsEntry.findMany({
    where,
    include: { category: true, tool: true },
    orderBy: { date: "desc" },
  });

  const title = "News and Update log";
  const rows = entries.slice(0, 12);

  const page = [
    rectOps(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.99, 0.99, 0.98]),
    rectOps(0, PAGE_HEIGHT - 60, PAGE_WIDTH, 60, [0.25, 0.39, 0.30]),
    textOps([title], MARGIN, PAGE_HEIGHT - 33, 18, 2, [1, 1, 1]),
    tableBox(
      "News log",
      ["Date", "Category", "Tool", "Type", "Summary", "Impact"],
      rows.length
        ? rows.map((entry) => {
            const date = new Date(entry.date).toLocaleDateString();
            const tool = entry.tool?.name ?? "-";
            return [date, entry.category.name, tool, entry.updateType, entry.summary, entry.impact];
          })
        : [],
      MARGIN,
      315,
      PAGE_WIDTH - MARGIN * 2,
      [78, 130, 90, 72, 252, 120]
    ),
  ].join("\n");

  return new Response(buildPdf(page), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${title.replace(/[^a-z0-9]+/gi, "_")}.pdf"`,
    },
  });
}

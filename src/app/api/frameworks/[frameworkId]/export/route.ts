import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 28;

type PdfPage = string;

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

function textOps(lines: string[], x: number, y: number, size = 10, font: 1 | 2 = 1, color: [number, number, number] = [0.1, 0.1, 0.1]) {
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

function topBar(text: string, x: number, y: number, w: number, h: number) {
  return [
    rectOps(x, y, w, h, [0.25, 0.39, 0.30], [0.21, 0.33, 0.25]),
    textOps([text], x + 12, y + h - 16, 12, 2, [1, 1, 1]),
  ].join("\n");
}

function panel(
  title: string,
  lines: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  bodyLimit: number,
  bodySize = 9
) {
  return [
    rectOps(x, y, w, h, [1, 1, 1], [0.84, 0.89, 0.84]),
    topBar(title, x, y + h - 24, w, 24),
    textOps(lines.flatMap((line) => wrapText(line, bodyLimit)), x + 12, y + h - 40, bodySize, 1, [0.18, 0.21, 0.18]),
  ].join("\n");
}

function buildPdf(pages: PdfPage[]) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  pages.forEach((page, index) => {
    const pageObjNum = 5 + index * 2;
    const contentObjNum = pageObjNum + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
      `<< /Length ${page.length} >>\nstream\n${page}\nendstream`
    );
  });

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

function safePdfName(text: string) {
  return text.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "framework_report";
}

function section(
  title: string,
  lines: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  bodyLimit: number,
  bodySize = 8.7
) {
  return [
    rectOps(x, y, w, h, [0.975, 0.988, 0.975], [0.84, 0.89, 0.84]),
    textOps([title], x + 10, y + h - 18, 12, 2, [0.15, 0.28, 0.19]),
    textOps(lines.flatMap((line) => wrapText(line, bodyLimit)), x + 10, y + h - 35, bodySize),
  ].join("\n");
}

function tableSection(
  title: string,
  headers: string[],
  rows: string[][],
  x: number,
  y: number,
  w: number,
  colWidths: number[],
  headingFill: [number, number, number],
  headingText: [number, number, number],
  headerSize = 9.2,
  bodySize = 8.6
) {
  const headerH = 20;
  const rowH = rows.length ? 20 : 16;
  const titleH = title.trim() ? 24 : 0;
  const h = 16 + titleH + headerH + rows.length * rowH;
  const top = y + h;
  let output = rectOps(x, y, w, h, [1, 1, 1], [0.84, 0.89, 0.84]);
  if (title.trim()) {
    output += `\n${rectOps(x, top - 24, w, 24, headingFill, headingFill)}`;
    output += `\n${textOps([title], x + 12, top - 9, 11.5, 2, headingText)}`;
  }

  let cursorX = x;
  const headerY = title.trim() ? top - 40 : top - 18;
  output += `\n${rectOps(x + 1, headerY - 14, w - 2, headerH, [0.978, 0.985, 0.977], [0.88, 0.92, 0.88])}`;
  for (let i = 0; i < headers.length; i++) {
    output += `\n${textOps([headers[i]], cursorX + 10, headerY - 2, headerSize, 2, [0.15, 0.28, 0.19])}`;
    cursorX += colWidths[i] ?? 0;
  }

  const startY = headerY - 18;
  rows.forEach((row, rowIndex) => {
    const rowTop = startY - rowIndex * rowH;
    output += `\n${rectOps(x + 1, rowTop - rowH + 1, w - 2, rowH, [1, 1, 1], [0.89, 0.93, 0.89])}`;
    let cellX = x;
    for (let col = 0; col < headers.length; col++) {
      const cellText = row[col] ?? "";
      output += `\n${textOps(wrapText(cellText, Math.max(12, Math.floor((colWidths[col] ?? 100) / 6.8))), cellX + 10, rowTop - 8, bodySize)}`;
      cellX += colWidths[col] ?? 0;
    }
  });

  return output;
}

function sectionTitle(title: string, x: number, y: number, w: number) {
  return [
    rectOps(x, y, w, 24, [0.25, 0.39, 0.30], [0.21, 0.33, 0.25]),
    textOps([title], x + 10, y + 15, 12, 2, [1, 1, 1]),
  ].join("\n");
}

function pageHeader(displayName: string, dateLabel: string) {
  const headerHeight = 64;
  const topY = PAGE_HEIGHT - headerHeight;
  return [
    rectOps(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.99, 0.99, 0.98]),
    rectOps(0, topY, PAGE_WIDTH, headerHeight, [0.25, 0.39, 0.30]),
    textOps([`Scoring framework report for ${displayName}`], MARGIN, PAGE_HEIGHT - 24, 10.5, 2, [0.92, 0.96, 0.92]),
    textOps(["CLM Evaluation"], MARGIN, PAGE_HEIGHT - 43, 20, 2, [1, 1, 1]),
    textOps([`Client presentation export | ${dateLabel}`], PAGE_WIDTH - 184, PAGE_HEIGHT - 24, 9, 1, [0.93, 0.96, 0.93]),
  ].join("\n");
}

function chunkRows(rows: string[][], maxRows: number) {
  const chunks: string[][][] = [];
  for (let i = 0; i < rows.length; i += maxRows) {
    chunks.push(rows.slice(i, i + maxRows));
  }
  return chunks.length ? chunks : [[]];
}

export async function GET(_req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const framework = await prisma.scoringFramework.findUnique({
    where: { id: params.frameworkId },
    include: {
      category: true,
      tools: { orderBy: { sortOrder: "asc" } },
      criteria: { orderBy: { sortOrder: "asc" } },
      scores: true,
      stackItems: { orderBy: { sortOrder: "asc" } },
      gapItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!framework) return new Response("Framework not found", { status: 404 });

  const displayName = framework.clientName?.trim() || framework.name;
  const scoreMap = new Map(framework.scores.map((score) => [`${score.toolId}:${score.criterionId}`, score.score]));
  const totals = framework.tools
    .map((tool) => {
      let total = 0;
      for (const criterion of framework.criteria) {
        const score = scoreMap.get(`${tool.id}:${criterion.id}`);
        if (score !== null && score !== undefined) total += score * criterion.weight;
      }
      return { tool: tool.name, total };
    })
    .sort((a, b) => b.total - a.total);
  const topVendor = totals[0]?.tool ?? "N/A";
  const topGaps = framework.criteria
    .map((criterion) => {
      const values = framework.tools
        .map((tool) => scoreMap.get(`${tool.id}:${criterion.id}`))
        .filter((v): v is number => typeof v === "number");
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { criterion, avg };
    })
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4);

  const dateLabel = new Date().toLocaleDateString();
  const currentStackLines = framework.stackItems.length ? framework.stackItems.slice(0, 4).map((item) => item.name) : ["No current stack items captured yet."];
  const gapItemLines = framework.gapItems.length ? framework.gapItems.map((item) => item.title) : ["No gap items captured yet."];
  const headerHeight = 58;
  const overviewH = 86;
  const topY = PAGE_HEIGHT - headerHeight;
  const overviewY = PAGE_HEIGHT - headerHeight - overviewH - 12;
  const stackY = 300;
  const leftW = 382;
  const gap = 12;
  const rightW = PAGE_WIDTH - MARGIN * 2 - leftW - gap;

  const firstPage = [
    pageHeader(displayName, dateLabel),
    panel(
      "Framework overview",
      [
        `Framework: ${framework.name}`,
        `Client name: ${framework.clientName?.trim() || "N/A"}`,
        `Top recommendation: ${topVendor}`,
      ],
      MARGIN,
      overviewY,
      PAGE_WIDTH - MARGIN * 2,
      overviewH,
      58,
      9.3
    ),
    panel("Current stack", currentStackLines, MARGIN, stackY, leftW, 118, 38, 9),
    panel("Gap items", gapItemLines, MARGIN + leftW + gap, stackY, rightW, 118, 38, 9),
  ].join("\n");

  const scoreRows = topGaps.length ? topGaps.map((row) => [row.criterion.name, `${row.avg.toFixed(1)} / 5`]) : [["No major score gaps detected.", ""]];
  const vendorRows = totals.length ? totals.slice(0, 5).map((row, index) => [String(index + 1), row.tool, row.total.toFixed(2)]) : [["", "No vendors entered yet.", ""]];

  const scoreChunks = chunkRows(scoreRows, 12);
  const vendorChunks = chunkRows(vendorRows, 14);

  const pages: string[] = [firstPage];
  scoreChunks.forEach((chunk, index) => {
    pages.push(
      [
        pageHeader(displayName, dateLabel),
        tableSection(
          `Score snapshot${scoreChunks.length > 1 ? ` (${index + 1}/${scoreChunks.length})` : ""}`,
          ["Capability", "Avg score"],
          chunk,
          MARGIN,
          214,
          PAGE_WIDTH - MARGIN * 2,
          [PAGE_WIDTH - MARGIN * 2 - 220, 220],
          [0.25, 0.39, 0.30],
          [1, 1, 1]
        ),
      ].join("\n")
    );
  });

  vendorChunks.forEach((chunk, index) => {
    const isLast = index === vendorChunks.length - 1;
    pages.push(
      [
        pageHeader(displayName, dateLabel),
        tableSection(
          `Vendor ranking${vendorChunks.length > 1 ? ` (${index + 1}/${vendorChunks.length})` : ""}`,
          ["Rank", "Vendor", "Score"],
          chunk,
          MARGIN,
          isLast ? 148 : 206,
          PAGE_WIDTH - MARGIN * 2,
          [60, 430, 140],
          [0.25, 0.39, 0.30],
          [1, 1, 1]
        ),
        ...(isLast
          ? [
              rectOps(MARGIN, 18, PAGE_WIDTH - MARGIN * 2, 60, [0.25, 0.39, 0.30], [0.21, 0.33, 0.25]),
              textOps([`Recommendation summary`], MARGIN + 12, 62, 11.2, 2, [1, 1, 1]),
              textOps([`${topVendor} is the strongest fit for the current framework.`], MARGIN + 12, 46, 9.8, 1, [0.95, 0.98, 0.95]),
            ]
          : []),
      ].join("\n")
    );
  });

  return new Response(buildPdf(pages), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safePdfName(displayName)}.pdf"`,
    },
  });
}

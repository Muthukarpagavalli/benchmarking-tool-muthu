import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_HEIGHT = 30;

type Page = string;

type CriterionRow = {
  id: string;
  name: string;
  weight: number;
  sortOrder: number;
};

type VendorRow = {
  id: string;
  name: string;
  sortOrder: number;
};

type ScoreMap = Map<string, number | null>;

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, limit: number) {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [""];
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

function rectOps(x: number, y: number, w: number, h: number, fill: [number, number, number], stroke?: [number, number, number]) {
  const ops = [`q ${fill[0]} ${fill[1]} ${fill[2]} rg ${x} ${y} ${w} ${h} re f`];
  if (stroke) ops.push(`q ${stroke[0]} ${stroke[1]} ${stroke[2]} RG 0.7 w ${x} ${y} ${w} ${h} re S Q`);
  ops.push("Q");
  return ops.join("\n");
}

function textOps(
  lines: string[],
  x: number,
  yTop: number,
  options: { size?: number; font?: 1 | 2; color?: [number, number, number]; lineGap?: number } = {}
) {
  const size = options.size ?? 10;
  const font = options.font ?? 1;
  const color = options.color ?? [0.12, 0.16, 0.13];
  const lineGap = options.lineGap ?? size + 3;
  const startY = yTop - size;
  const ops: string[] = [`BT /F${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg`];
  lines.forEach((line, index) => {
    ops.push(`1 0 0 1 ${x} ${startY - index * lineGap} Tm (${escapePdfText(line)}) Tj`);
  });
  ops.push("ET");
  return ops.join("\n");
}

function buildPdf(pages: Page[]) {
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

function pageHeader(clientName: string, pageNumber: number, totalPages: number) {
  return [
    rectOps(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.99, 0.99, 0.985]),
    rectOps(0, PAGE_HEIGHT - 72, PAGE_WIDTH, 72, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
    textOps([`CLM Evaluation Report for ${clientName}`], MARGIN, PAGE_HEIGHT - 24, { size: 18, font: 2, color: [1, 1, 1] }),
    textOps([`Page ${pageNumber}`], PAGE_WIDTH - MARGIN - 40, PAGE_HEIGHT - 24, { size: 9, color: [0.93, 0.96, 0.93] }),
    rectOps(0, 0, PAGE_WIDTH, FOOTER_HEIGHT, [0.985, 0.988, 0.982], [0.88, 0.91, 0.88]),
    textOps([`Page ${pageNumber} of ${totalPages}`], PAGE_WIDTH - MARGIN - 84, 18, { size: 8.2, color: [0.26, 0.33, 0.27] }),
  ].join("\n");
}

function footer(clientName: string, frameworkName: string) {
  return [
    textOps([clientName], MARGIN, 18, { size: 8.2, color: [0.26, 0.33, 0.27] }),
    textOps([frameworkName], PAGE_WIDTH / 2 - 70, 18, { size: 8.2, color: [0.26, 0.33, 0.27] }),
  ].join("\n");
}

function card(x: number, y: number, w: number, h: number, title: string, lines: string[]) {
  return [
    rectOps(x, y, w, h, [1, 1, 1], [0.84, 0.89, 0.84]),
    rectOps(x, y + h - 24, w, 24, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
    textOps([title], x + 10, y + h - 9, { size: 11.2, font: 2, color: [1, 1, 1] }),
    textOps(lines.flatMap((line) => wrapText(line, Math.floor(w / 5.6))), x + 10, y + h - 38, { size: 8.9, color: [0.16, 0.19, 0.17] }),
  ].join("\n");
}

function box(title: string, lines: string[], x: number, yTop: number, w: number, minHeight = 90) {
  const wrapped = lines.flatMap((line) => wrapText(line, Math.floor(w / 5.8)));
  const height = Math.max(minHeight, wrapped.length * 13 + 48);
  return [
    rectOps(x, yTop - height, w, height, [1, 1, 1], [0.84, 0.89, 0.84]),
    rectOps(x, yTop - 24, w, 24, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
    textOps([title], x + 10, yTop - 9, { size: 11, font: 2, color: [1, 1, 1] }),
    textOps(wrapped, x + 10, yTop - 38, { size: 9.2, lineGap: 12, color: [0.16, 0.19, 0.17] }),
  ].join("\n");
}

function paragraph(text: string, x: number, yTop: number, w: number, size = 9.2) {
  const lines = wrapText(text, Math.floor(w / 5.8));
  return textOps(lines, x, yTop, { size, lineGap: size + 3, color: [0.16, 0.19, 0.17] });
}

function tablePage(
  title: string,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  clientName: string,
  pageNumber: number,
  totalPages: number
) {
  const headerTop = PAGE_HEIGHT - 108;
  const tableX = MARGIN;
  const tableW = CONTENT_WIDTH;
  const headerH = 22;
  const rowMinH = 24;
  const wrappedRows = rows.map((row) => row.map((cell, index) => wrapText(cell, Math.max(10, Math.floor((colWidths[index] ?? 80) / 5.7)))));
  const rowHeights = wrappedRows.map((row) => Math.max(rowMinH, Math.max(...row.map((cell) => cell.length)) * 10 + 6));
  const totalHeight = headerH + rowHeights.reduce((sum, h) => sum + h, 0);
  const bodyTop = headerTop - 34;
  const bodyBottom = bodyTop - totalHeight;
  if (bodyBottom < FOOTER_HEIGHT + 14) throw new Error("Table too tall for page");

  let output = `${pageHeader(clientName, pageNumber, totalPages)}\n${textOps([title], MARGIN, headerTop, { size: 14, font: 2, color: [0.15, 0.28, 0.19] })}`;
  output += `\n${rectOps(tableX, bodyBottom, tableW, totalHeight, [1, 1, 1], [0.84, 0.89, 0.84])}`;
  output += `\n${rectOps(tableX, bodyTop - headerH, tableW, headerH, [0.25, 0.39, 0.30], [0.88, 0.92, 0.88])}`;

  let cursorX = tableX;
  headers.forEach((headerText, index) => {
    output += `\n${textOps([headerText], cursorX + 8, bodyTop - 7, { size: 8.7, font: 2, color: [1, 1, 1] })}`;
    cursorX += colWidths[index] ?? 0;
  });

  let rowTop = bodyTop - headerH;
  wrappedRows.forEach((row, rowIndex) => {
    const rowH = rowHeights[rowIndex];
    const rowBottom = rowTop - rowH;
    const fill: [number, number, number] = rowIndex % 2 === 0 ? [0.997, 0.999, 0.996] : [0.986, 0.992, 0.986];
    output += `\n${rectOps(tableX, rowBottom, tableW, rowH, fill, [0.89, 0.93, 0.89])}`;
    let cellX = tableX;
    row.forEach((lines, cellIndex) => {
      const width = colWidths[cellIndex] ?? 80;
      if (cellIndex > 0) output += `\n${rectOps(cellX, rowBottom, 0.7, rowH, [0.93, 0.95, 0.93])}`;
      output += `\n${textOps(lines, cellX + 7, rowTop - 6, { size: 8.4, color: [0.12, 0.13, 0.12] })}`;
      cellX += width;
    });
    rowTop = rowBottom;
  });

  output += `\n${footer(clientName, "")}`;
  return output;
}

function highestAndLowest(criteria: CriterionRow[], scoresByCriterion: ScoreMap, vendorId: string) {
  const scored = criteria.map((criterion) => ({
    criterion,
    score: scoresByCriterion.get(`${vendorId}:${criterion.id}`),
  }));
  const filtered = scored.filter((item): item is { criterion: CriterionRow; score: number } => typeof item.score === "number");
  return {
    highest: [...filtered].sort((a, b) => b.score - a.score).slice(0, 2),
    lowest: [...filtered].sort((a, b) => a.score - b.score).slice(0, 2),
  };
}

function buildNarrative(vendorName: string, highest: Array<{ criterion: CriterionRow; score: number }>, lowest: Array<{ criterion: CriterionRow; score: number }>) {
  const highText = highest.length ? highest.map((item) => item.criterion.name.toLowerCase()).join(" and ") : "the evaluated requirements";
  const lowText = lowest.length ? lowest.map((item) => item.criterion.name.toLowerCase()).join(" and ") : "the identified gaps";
  return `${vendorName} performed strongest in ${highText} while showing comparatively weaker performance in ${lowText}.`;
}

function scoreLabel(totalPercent: number) {
  if (totalPercent >= 85) return "Strong Fit";
  if (totalPercent >= 75) return "Good Fit";
  if (totalPercent >= 60) return "Consider";
  return "Low Fit";
}

function recommendationSummary(totalPercent: number) {
  if (totalPercent >= 85) return "recommended for further consideration";
  if (totalPercent >= 75) return "a credible option for shortlist review";
  if (totalPercent >= 60) return "worth considering with targeted remediation";
  return "not the leading fit based on the workshop scoring";
}

function avgScore(values: Array<number | null | undefined>) {
  const clean = values.filter((v): v is number => typeof v === "number");
  if (!clean.length) return 0;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function matrixPages(criteria: CriterionRow[], vendors: VendorRow[], scoreMap: ScoreMap, clientName: string, startPage: number, totalPages: number) {
  const pages: Page[] = [];
  const criterionChunks: CriterionRow[][] = [];
  for (let i = 0; i < criteria.length; i += 18) criterionChunks.push(criteria.slice(i, i + 18));
  const vendorChunks: VendorRow[][] = [];
  for (let i = 0; i < vendors.length; i += 3) vendorChunks.push(vendors.slice(i, i + 3));
  if (criterionChunks.length === 0) criterionChunks.push([]);
  if (vendorChunks.length === 0) vendorChunks.push([]);

  let pageNumber = startPage;
  for (const cChunk of criterionChunks) {
    for (const vChunk of vendorChunks) {
      const headers = ["Criteria", "Weight", ...vChunk.map((v) => v.name)];
      const colWidths = [180, 56, ...vChunk.map(() => 120)];
      const rows = cChunk.map((criterion) => {
        const scores = vChunk.map((vendor) => {
          const score = scoreMap.get(`${vendor.id}:${criterion.id}`);
          return typeof score === "number" ? score.toFixed(1) : "-";
        });
        return [criterion.name, `${Math.round(criterion.weight * 100)}%`, ...scores];
      });
      pages.push(
        [
          textOps(["Scoring Matrix"], MARGIN, PAGE_HEIGHT - 108, { size: 14, font: 2, color: [0.15, 0.28, 0.19] }),
          tablePage("", headers, rows, colWidths, clientName, pageNumber, totalPages),
        ].join("\n")
      );
      pageNumber += 1;
    }
  }
  return pages;
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

  const clientName = framework.clientName?.trim() || framework.name;
  const criteria: CriterionRow[] = [...framework.criteria].sort((a, b) => a.sortOrder - b.sortOrder);
  const vendors: VendorRow[] = [...framework.tools].sort((a, b) => a.sortOrder - b.sortOrder);
  const scoreMap: ScoreMap = new Map(framework.scores.map((score) => [`${score.toolId}:${score.criterionId}`, score.score]));
  const stackLines = framework.stackItems.length
    ? framework.stackItems.map((item) => `${item.role ?? "General"}: ${item.name}${item.notes ? ` - ${item.notes}` : ""}`)
    : ["No current stack items recorded."];
  const gapLines = framework.gapItems.length
    ? framework.gapItems.map((item) => `${item.title}${item.notes ? ` - ${item.notes}` : ""}`)
    : ["No gap items recorded."];

  const vendorStats = vendors.map((vendor) => {
    const weightedTotal = criteria.reduce((sum, criterion) => {
      const score = scoreMap.get(`${vendor.id}:${criterion.id}`);
      return sum + (typeof score === "number" ? score * criterion.weight : 0);
    }, 0);
    const percentage = (weightedTotal / 5) * 100;
    const scores = criteria.map((criterion) => scoreMap.get(`${vendor.id}:${criterion.id}`));
    return {
      vendor,
      weightedTotal,
      percentage,
      average: avgScore(scores),
      recommendation: scoreLabel(percentage),
      fitText: recommendationSummary(percentage),
    };
  });
  const ranked = [...vendorStats].sort((a, b) => b.weightedTotal - a.weightedTotal);
  const winner = ranked[0];
  const matrixCount = Math.max(1, Math.ceil(criteria.length / 18)) * Math.max(1, Math.ceil(vendors.length / 3));
  const totalPages = 1 + 1 + matrixCount + 1;

  const pages: Page[] = [];

  const page1Summary = winner
    ? `This workshop evaluated ${vendors.length} CLM vendors against the client's business requirements using weighted scoring agreed during the evaluation session. Based on the workshop results, ${winner.vendor.name} achieved the highest overall score and is recommended for further consideration.`
    : "This workshop evaluated the vendor landscape against the client's business requirements using weighted scoring agreed during the evaluation session.";

  pages.push(
    [
      pageHeader(clientName, 1, totalPages),
      textOps([`Client Name: ${clientName}`], MARGIN, PAGE_HEIGHT - 112, { size: 10.4, color: [0.18, 0.22, 0.19] }),
      textOps([`Date: ${new Date().toLocaleDateString()}`], MARGIN, PAGE_HEIGHT - 130, { size: 10.4, color: [0.18, 0.22, 0.19] }),
      rectOps(MARGIN, PAGE_HEIGHT - 186, CONTENT_WIDTH, 36, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
      textOps([`Overall Recommendation: ${winner ? `${winner.vendor.name} is the recommended vendor for the next stage of evaluation.` : "No recommendation could be generated."}`], MARGIN + 12, PAGE_HEIGHT - 162, {
        size: 10.8,
        font: 2,
        color: [1, 1, 1],
      }),
      card(
        MARGIN,
        PAGE_HEIGHT - 322,
        (CONTENT_WIDTH - 12) / 2,
        128,
        "Current Technology Stack",
        stackLines
      ),
      card(
        MARGIN + (CONTENT_WIDTH - 12) / 2 + 12,
        PAGE_HEIGHT - 322,
        (CONTENT_WIDTH - 12) / 2,
        128,
        "Gap Analysis",
        gapLines
      ),
      box("Executive Summary", [page1Summary], MARGIN, PAGE_HEIGHT - 410, CONTENT_WIDTH, 102),
      footer(clientName, framework.name),
    ].join("\n")
  );

  const rankingRows = ranked.map((entry, index) => [String(index + 1), entry.vendor.name, entry.weightedTotal.toFixed(1), entry.recommendation]);
  pages.push(
    tablePage(
      "Vendor Ranking",
      ["Rank", "Vendor", "Weighted Score", "Recommendation"],
      rankingRows,
      [44, 190, 98, 132],
      clientName,
      2,
      totalPages
    )
  );

  pages.push(...matrixPages(criteria, vendors, scoreMap, clientName, 3, totalPages));

  const recommendation = winner ?? ranked[0];
  const summaryReason = recommendation
    ? `${recommendation.vendor.name} scored highest overall and offers the strongest combination of weighted fit, workshop performance and practical alignment to the current stack.`
    : "No recommendation could be produced because the framework contains no scored vendors.";
  pages.push(
    [
      pageHeader(clientName, totalPages, totalPages),
      textOps(["Recommended Vendor"], MARGIN, PAGE_HEIGHT - 110, { size: 14, font: 2, color: [0.15, 0.28, 0.19] }),
      box(
        "Consultant Recommendation",
        [`Recommended Vendor Name: ${recommendation?.vendor.name ?? "N/A"}`, `Reasoning: ${summaryReason}`],
        MARGIN,
        PAGE_HEIGHT - 144,
        CONTENT_WIDTH,
        120
      ),
      footer(clientName, framework.name),
    ].join("\n")
  );

  return new Response(buildPdf(pages), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safePdfName(clientName)}.pdf"`,
    },
  });
}

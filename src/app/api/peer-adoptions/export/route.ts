import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 24;
const HEADER_HEIGHT = 72;
const TABLE_TOP = 104;
const TABLE_BOTTOM = 24;
const ROW_PADDING_X = 8;
const ROW_PADDING_Y = 6;
const LINE_HEIGHT = 10;

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number) {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
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

function textBlock(
  lines: string[],
  x: number,
  yTop: number,
  options: { size?: number; font?: 1 | 2; color?: [number, number, number]; align?: "left" | "center"; width?: number } = {}
) {
  const size = options.size ?? 8.4;
  const font = options.font ?? 1;
  const color = options.color ?? [0.08, 0.12, 0.09];
  const align = options.align ?? "left";
  const width = options.width ?? 0;
  const lineGap = size + 2;
  const startY = yTop - size;

  const ops: string[] = [`BT /F${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg`];
  lines.forEach((line, index) => {
    let textX = x;
    if (align === "center" && width > 0) {
      textX = x + width / 2 - Math.max(8, line.length * size * 0.18) / 2;
    }
    ops.push(`1 0 0 1 ${textX} ${startY - index * lineGap} Tm (${escapePdfText(line)}) Tj`);
  });
  ops.push("ET");
  return ops.join("\n");
}

function formatReportDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function tablePage(title: string, subtitle: string, rows: string[][], pageLabel: string) {
  const tableX = MARGIN;
  const tableW = PAGE_WIDTH - MARGIN * 2;
  const colWidths = [86, 130, 110, 200, 236];
  const headers = ["Date", "Firm", "Category", "Tool", "Source note"];
  const headerH = 24;
  const rowMinH = 28;
  const rowGap = 0;
  const tableTop = PAGE_HEIGHT - HEADER_HEIGHT - 20;

  const wrappedRows = rows.map((row) =>
    row.map((cell, index) => {
      const maxChars = Math.max(10, Math.floor((colWidths[index] ?? 80) / 5.4));
      return wrapText(cell, maxChars);
    })
  );
  const rowHeights = wrappedRows.map((row) => {
    const maxLines = Math.max(...row.map((cell) => cell.length));
    return Math.max(rowMinH, maxLines * LINE_HEIGHT + ROW_PADDING_Y * 2);
  });

  const bodyHeight = rowHeights.reduce((sum, h) => sum + h + rowGap, 0);
  const totalHeight = headerH + bodyHeight;
  const headerBottomY = tableTop - headerH;
  const tableBottom = tableTop - totalHeight;

  let output = rectOps(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.99, 0.99, 0.98]);
  output += `\n${rectOps(0, PAGE_HEIGHT - HEADER_HEIGHT, PAGE_WIDTH, HEADER_HEIGHT, [0.25, 0.39, 0.30], [0.25, 0.39, 0.30])}`;
  output += `\n${textBlock([title], MARGIN, PAGE_HEIGHT - 28, { size: 18, font: 2, color: [1, 1, 1] })}`;
  output += `\n${textBlock([subtitle], MARGIN, PAGE_HEIGHT - 46, {
    size: 9.4,
    color: [0.93, 0.96, 0.93],
  })}`;
  output += `\n${textBlock(pageLabel.split(" | "), PAGE_WIDTH - MARGIN - 170, PAGE_HEIGHT - 28, {
    size: 8,
    color: [0.93, 0.96, 0.93],
    width: 170,
    align: "center",
  })}`;

  output += `\n${rectOps(tableX, tableBottom, tableW, totalHeight, [1, 1, 1], [0.84, 0.89, 0.84])}`;
  let cursorX = tableX;
  headers.forEach((header, index) => {
    const width = colWidths[index] ?? 80;
    output += `\n${rectOps(cursorX, headerBottomY, width, headerH, [0.25, 0.39, 0.30], [0.88, 0.92, 0.88])}`;
    output += `\n${textBlock([header], cursorX, headerBottomY + (headerH + 9) / 2, {
      size: 9,
      font: 2,
      color: [1, 1, 1],
      width,
      align: "center",
    })}`;
    cursorX += width;
  });

  const bodyStart = headerBottomY;
  if (rows.length === 0) {
    output += `\n${textBlock(["No entries found."], tableX + 12, bodyStart - 10, { size: 8.5 })}`;
    return output;
  }

  let currentTop = bodyStart;
  wrappedRows.forEach((row, rowIndex) => {
    const rowH = rowHeights[rowIndex];
    const rowBottom = currentTop - rowH;
    const fill: [number, number, number] = rowIndex % 2 === 0 ? [0.997, 0.999, 0.996] : [0.985, 0.992, 0.985];
    output += `\n${rectOps(tableX, rowBottom, tableW, rowH, fill, [0.89, 0.93, 0.89])}`;

    let cellX = tableX;
    row.forEach((lines, cellIndex) => {
      const width = colWidths[cellIndex] ?? 80;
      if (cellIndex > 0) {
        output += `\n${rectOps(cellX, rowBottom, 0.7, rowH, [0.93, 0.95, 0.93])}`;
      }
      output += `\n${textBlock(lines, cellX + ROW_PADDING_X, currentTop - ROW_PADDING_Y, {
        size: 8.5,
        color: [0.1, 0.1, 0.1],
        width: width - ROW_PADDING_X * 2,
        align: "left",
      })}`;
      cellX += width;
    });
    currentTop = rowBottom - rowGap;
  });

  return output;
}

function buildPdf(pages: string[]) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  pages.forEach((page, index) => {
    const pageObjNum = 5 + index * 2;
    const contentObjNum = pageObjNum + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
      `<< /Length ${page.length} >>\nstream\n${page}\nendstream`
    );
  });
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

function pageCapacity(rows: string[][]) {
  const colWidths = [86, 130, 110, 200, 236];
  const availableHeight = PAGE_HEIGHT - HEADER_HEIGHT - 20 - TABLE_BOTTOM - 24;
  let used = 0;
  let count = 0;

  for (const row of rows) {
    const wrapped = row.map((cell, index) => wrapText(cell, Math.max(10, Math.floor((colWidths[index] ?? 80) / 5.4))));
    const rowH = Math.max(28, Math.max(...wrapped.map((cell) => cell.length)) * LINE_HEIGHT + ROW_PADDING_Y * 2);
    if (used + rowH > availableHeight) break;
    used += rowH;
    count += 1;
  }

  return Math.max(count, 1);
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

  const reportTitle = categoryId
    ? `Where We Stand - ${adoptions[0]?.category?.name ?? adoptions[0]?.categoryName ?? "Peer Benchmarking"}`
    : "Peer Benchmarking Report";
  const rows = adoptions.map((a) => [
    formatReportDate(a.dateLogged),
    a.peerFirm.name,
    a.category?.name ?? a.categoryName ?? "-",
    a.tool?.name ?? "-",
    a.sourceNote,
  ]);

  const pages: string[] = [];
  const exportedOn = formatReportDate(new Date());
  if (rows.length === 0) {
    pages.push(tablePage(reportTitle, "Presentation-ready export", [], `Exported ${exportedOn} | Page 1 of 1`));
  } else {
    let index = 0;
    let pageNumber = 1;
    const totalPagesEstimate = Math.max(1, Math.ceil(rows.length / Math.max(1, pageCapacity(rows))));
    while (index < rows.length) {
      const take = pageCapacity(rows.slice(index));
      const chunk = rows.slice(index, index + take);
      pages.push(
        tablePage(reportTitle, "Presentation-ready export", chunk, `Exported ${exportedOn} | Page ${pageNumber} of ${totalPagesEstimate}`)
      );
      index += take;
      pageNumber += 1;
    }
  }

  return new Response(buildPdf(pages), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reportTitle.replace(/[^a-z0-9]+/gi, "_")}.pdf"`,
    },
  });
}

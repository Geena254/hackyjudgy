import type { PDFDocument, PDFFont, PDFImage, PDFPage, RGB } from "pdf-lib";
import type { CriterionRow } from "@/lib/hackathon";
import type { RankedStanding } from "@/lib/results";
import { band, fmt, type JudgePanelRow } from "@/lib/team-report";

/**
 * One team's results report as a PDF, built in the organiser's browser from the
 * same figures as the printable team report, in the Power Learn Project email
 * style: maroon frame, centred logo, maroon headings.
 */
export type ResultsPdfInput = {
  eventName: string;
  standing: RankedStanding;
  /** Teams in the hackathon, for "3 of 12". */
  total: number;
  rubric: CriterionRow[];
  panel: JudgePanelRow[];
  showRank: boolean;
  /** PNG bytes of the logo. */
  logo?: ArrayBuffer;
  date?: Date;
};

// A4 in points.
const W = 595.28;
const H = 841.89;
const FRAME = 22;
const MARGIN = 52;
const TOP = H - MARGIN;
const BOTTOM = MARGIN + 14;
const CONTENT = W - MARGIN * 2;

export async function buildResultsPdf(input: ResultsPdfInput): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const maroon = rgb(0.545, 0.082, 0.22);
  const blush = rgb(0.984, 0.945, 0.957);
  const ink = rgb(0.1, 0.1, 0.1);
  const grey = rgb(0.42, 0.42, 0.45);
  const rule = rgb(0.87, 0.87, 0.88);

  const doc: PDFDocument = await PDFDocument.create();
  const st = input.standing;
  const s = st.submission;
  doc.setTitle(`${s.title} - ${input.eventName} results`);
  doc.setAuthor("Power Learn Project");
  doc.setCreator("GavelLab");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | undefined;
  if (input.logo) {
    try {
      logo = await doc.embedPng(input.logo);
    } catch {
      logo = undefined;
    }
  }

  // The standard fonts only cover Western European characters: keep accents,
  // turn anything else into a plain equivalent or "?" so drawing never throws.
  const charset = new Set(regular.getCharacterSet());
  const clean = (text: string) =>
    Array.from(text.replace(/\t/g, "  ").replace(/\r/g, ""))
      .map((ch) => {
        if (ch === "\n" || charset.has(ch.codePointAt(0)!)) return ch;
        const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
        if (base && Array.from(base).every((c) => charset.has(c.codePointAt(0)!))) return base;
        return ch.codePointAt(0)! > 0xffff ? "" : "?";
      })
      .join("");

  /** Lines of `text` that fit in `width`, breaking words that are too long on their own. */
  function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
          line = next;
          continue;
        }
        if (line) out.push(line);
        line = "";
        let rest = word;
        while (font.widthOfTextAtSize(rest, size) > width) {
          let cut = rest.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
          out.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
      out.push(line);
    }
    return out;
  }

  let page!: PDFPage;
  let y = TOP;

  function frame(p: PDFPage) {
    p.drawRectangle({
      x: FRAME,
      y: FRAME,
      width: W - FRAME * 2,
      height: H - FRAME * 2,
      borderColor: maroon,
      borderWidth: 1.5,
    });
  }

  function newPage(continued: boolean) {
    page = doc.addPage([W, H]);
    frame(page);
    y = TOP;
    if (continued) {
      const label = clean(`${s.title} - ${input.eventName}`);
      text(label, MARGIN, y - 8, regular, 8, grey);
      y -= 24;
    }
  }

  /** Start a new page unless `h` more points fit on this one. */
  function need(h: number) {
    if (y - h < BOTTOM) newPage(true);
  }

  function text(str: string, x: number, baseline: number, font: PDFFont, size: number, color: RGB) {
    page.drawText(clean(str), { x, y: baseline, font, size, color });
  }

  function centred(str: string, font: PDFFont, size: number, color: RGB, gap = 4) {
    for (const line of wrap(str, font, size, CONTENT)) {
      need(size + gap);
      const w = font.widthOfTextAtSize(line, size);
      text(line, (W - w) / 2, y - size, font, size, color);
      y -= size + gap;
    }
  }

  /** Lines of text at `x`, `width` wide, moving down the page. */
  function paragraph(
    str: string,
    font: PDFFont,
    size: number,
    color: RGB,
    x = MARGIN,
    width = CONTENT,
  ) {
    for (const line of wrap(str, font, size, width)) {
      need(size + 4);
      text(line, x, y - size, font, size, color);
      y -= size + 4;
    }
  }

  function heading(str: string) {
    need(40);
    y -= 18;
    text(str.toUpperCase(), MARGIN, y - 10, bold, 10, maroon);
    y -= 18;
  }

  function hr(color = rule, thickness = 0.75) {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: W - MARGIN, y },
      thickness,
      color,
    });
  }

  type Col = { title: string; width: number; align?: "left" | "right" };

  /** Draws a table row: each cell is wrapped lines in one font; returns nothing, moves y down. */
  function row(
    cols: Col[],
    cells: { lines: string[]; font: PDFFont; size: number; color: RGB }[][],
    { line = true, pad = 5 }: { line?: boolean; pad?: number } = {},
  ) {
    const heights = cells.map((stack) =>
      stack.reduce((h, part) => h + part.lines.length * (part.size + 3), 0),
    );
    const h = Math.max(...heights) + pad * 2;
    need(h);
    let x = MARGIN;
    cols.forEach((col, i) => {
      let cy = y - pad;
      for (const part of cells[i]!) {
        for (const ln of part.lines) {
          const w = part.font.widthOfTextAtSize(ln, part.size);
          const tx = col.align === "right" ? x + col.width - w - 4 : x + 4;
          text(ln, tx, cy - part.size, part.font, part.size, part.color);
          cy -= part.size + 3;
        }
      }
      x += col.width;
    });
    y -= h;
    if (line) hr();
  }

  const cell = (str: string, col: Col, font = regular, size = 9, color = ink) => [
    { lines: wrap(str, font, size, col.width - 8), font, size, color },
  ];

  /* ------------------------------- header -------------------------------- */

  newPage(false);
  if (logo) {
    const lh = 58;
    const lw = (logo.width / logo.height) * lh;
    page.drawImage(logo, { x: (W - lw) / 2, y: y - lh, width: lw, height: lh });
    y -= lh + 22;
  }
  centred(`${input.eventName} results`, bold, 19, maroon, 6);
  y -= 2;
  const date = (input.date ?? new Date()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  centred(`Judging report · ${date}`, regular, 10, grey);
  y -= 14;
  hr();
  y -= 18;

  /* ------------------------------- project ------------------------------- */

  paragraph(s.title, bold, 16, ink);
  if (s.team_name) paragraph(s.team_name, regular, 11, grey);
  if (s.description) {
    y -= 4;
    paragraph(s.description, regular, 8.5, grey);
  }
  y -= 14;

  /* ------------------------------- summary ------------------------------- */

  const boxes: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Overall score", value: `${fmt(st.weightedTotal)} / 100`, highlight: true },
    input.showRank
      ? {
          label: "Final position",
          value:
            st.rank === null ? " - " : `${st.rank} of ${input.total}${st.tied ? " (tied)" : ""}`,
        }
      : {
          label: "Rating",
          value: band(st.weightedTotal === null ? null : st.weightedTotal / 20, 5),
        },
    { label: "Judges", value: `${st.judgeCount}` },
  ];
  const gap = 10;
  const bw = (CONTENT - gap * 2) / 3;
  const bh = 50;
  need(bh);
  boxes.forEach((b, i) => {
    const x = MARGIN + i * (bw + gap);
    page.drawRectangle({
      x,
      y: y - bh,
      width: bw,
      height: bh,
      color: b.highlight ? blush : undefined,
      borderColor: b.highlight ? maroon : rule,
      borderWidth: 1,
    });
    text(b.label.toUpperCase(), x + 10, y - 17, regular, 7.5, grey);
    text(b.value, x + 10, y - 38, bold, 15, b.highlight ? maroon : ink);
  });
  y -= bh + 6;

  /* ------------------------- score by criterion -------------------------- */

  heading("Score by criterion");
  const cCols: Col[] = [
    { title: "Criterion", width: CONTENT - 50 - 70 - 70 - 80 },
    { title: "Weight", width: 50, align: "right" },
    { title: "Average", width: 70, align: "right" },
    { title: "Rating", width: 70 },
    { title: "Points", width: 80, align: "right" },
  ];
  row(
    cCols,
    cCols.map((c) => cell(c.title.toUpperCase(), c, bold, 7.5, grey)),
    { pad: 4 },
  );
  for (const c of input.rubric) {
    const b = st.breakdown.find((x) => x.criterion.id === c.id);
    const max = c.max_score || 5;
    const desc = c.description?.split("\n")[0]?.trim();
    row(cCols, [
      [
        { lines: wrap(c.name, bold, 9, cCols[0]!.width - 8), font: bold, size: 9, color: ink },
        ...(desc
          ? [
              {
                lines: wrap(desc, regular, 7.5, cCols[0]!.width - 8),
                font: regular,
                size: 7.5,
                color: grey,
              },
            ]
          : []),
      ],
      cell(`${c.weight}`, cCols[1]!),
      cell(`${fmt(b?.average, 2)} / ${max}`, cCols[2]!),
      cell(band(b?.average ?? null, max), cCols[3]!),
      cell(`${fmt(b?.points)} / ${fmt(b?.maxPoints)}`, cCols[4]!),
    ]);
  }
  const overallCols: Col[] = [
    { title: "", width: CONTENT - 80 },
    { title: "", width: 80, align: "right" },
  ];
  row(
    overallCols,
    [
      cell("Overall", overallCols[0]!, bold, 9.5),
      cell(`${fmt(st.weightedTotal)} / 100`, overallCols[1]!, bold, 9.5, maroon),
    ],
    { line: false },
  );

  /* -------------------------- each judge's scores ------------------------- */

  if (input.panel.length > 0) {
    heading("Each judge's scores");
    const judgeW = 80;
    const totalW = 50;
    const each = (CONTENT - judgeW - totalW) / Math.max(1, input.rubric.length);
    const size = input.rubric.length > 6 ? 7 : 8;
    const jCols: Col[] = [
      { title: "Judge", width: judgeW },
      ...input.rubric.map((c) => ({ title: c.name, width: each, align: "right" as const })),
      { title: "Total", width: totalW, align: "right" },
    ];
    row(
      jCols,
      jCols.map((c) => cell(c.title, c, bold, size - 0.5, grey)),
      { pad: 4 },
    );
    for (const p of input.panel) {
      row(jCols, [
        cell(p.label, jCols[0]!, bold, size + 1),
        ...input.rubric.map((c, i) =>
          cell(
            p.values[c.id] === undefined ? " - " : `${p.values[c.id]}`,
            jCols[i + 1]!,
            regular,
            size + 1,
          ),
        ),
        cell(p.percent === null ? " - " : `${p.percent}`, jCols[jCols.length - 1]!, bold, size + 1),
      ]);
    }
  }

  /* ------------------------------- feedback ------------------------------ */

  heading("Feedback from the judges");
  const withFeedback = input.panel.filter((p) => p.feedback);
  if (withFeedback.length === 0) {
    paragraph("No written feedback was recorded for this team.", regular, 9.5, grey);
  }
  for (const p of withFeedback) {
    const lines = wrap(p.feedback, regular, 9.5, CONTENT - 16);
    // Keep the judge's label with at least the first lines of their feedback.
    need(16 + Math.min(3, lines.length) * 13.5);
    text(p.label.toUpperCase(), MARGIN + 12, y - 8, bold, 7.5, grey);
    y -= 16;
    for (const ln of lines) {
      need(13.5);
      page.drawRectangle({ x: MARGIN, y: y - 13.5, width: 2.5, height: 13.5, color: maroon });
      text(ln, MARGIN + 12, y - 10, regular, 9.5, ink);
      y -= 13.5;
    }
    y -= 12;
  }

  /* -------------------------------- notes -------------------------------- */

  need(40);
  y -= 6;
  hr();
  y -= 6;
  paragraph(
    "Every judge scores each criterion. Points = (average ÷ maximum score) × weight, and the overall score is out of 100. Private judge notes are never included.",
    regular,
    7.5,
    grey,
  );

  // Page numbers and sign-off on every page.
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const footer = clean(`Power Learn Project · ${input.eventName}`);
    p.drawText(footer, { x: MARGIN, y: FRAME + 14, size: 7.5, font: regular, color: grey });
    const num = `Page ${i + 1} of ${pages.length}`;
    p.drawText(num, {
      x: W - MARGIN - regular.widthOfTextAtSize(num, 7.5),
      y: FRAME + 14,
      size: 7.5,
      font: regular,
      color: grey,
    });
  });

  return doc.save();
}

// A compact, dependency-free PDF writer for server-side report exports.
// It intentionally sticks to Helvetica and ASCII-safe text for maximum reader compatibility.
function escapePdf(value: string) { return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "?"); }
export function makeReportPdf(title: string, lines: string[]): Uint8Array {
  const wrapped = lines.flatMap((line) => line.match(/.{1,88}(?:\s|$)|.{1,88}/g) ?? [line]);
  const pages: string[][] = []; for (let index = 0; index < wrapped.length || index === 0; index += 42) pages.push(wrapped.slice(index, index + 42));
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [" + pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ") + `] /Count ${pages.length} >>`];
  pages.forEach((page, index) => { const content = [`BT /F1 18 Tf 48 752 Td (${escapePdf(index === 0 ? title : `${title} (continued)` )}) Tj /F1 10 Tf 0 -28 Td`, ...page.map((line) => `(${escapePdf(line)}) Tj 0 -15 Td`), "ET"].join("\n"); const pageId = 3 + index * 2; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${pageId + 1} 0 R >> >> /Contents ${pageId + 2} 0 R >>`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`); });
  let output = "%PDF-1.4\n"; const offsets = [0]; objects.forEach((object, index) => { offsets.push(output.length); output += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const start = output.length; output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new TextEncoder().encode(output);
}

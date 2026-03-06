import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

type ColumnDef = { header: string; key: string; width?: number };

function getValue(row: any, key: string): string {
  const val = row[key];
  if (val === null || val === undefined) return "-";
  return String(val);
}

export function downloadPDF(title: string, columns: ColumnDef[], data: any[], filename: string) {
  const doc = new jsPDF({ orientation: data[0] && Object.keys(data[0]).length > 5 ? "landscape" : "portrait" });
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, 14, 28);

  const tableData = data.map(row => columns.map(col => getValue(row, col.key)));

  autoTable(doc, {
    startY: 34,
    head: [columns.map(c => c.header)],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [22, 52, 102], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 244, 248] },
  });

  doc.save(`${filename}.pdf`);
}

export function downloadExcel(title: string, columns: ColumnDef[], data: any[], filename: string) {
  const wsData = [columns.map(c => c.header)];
  data.forEach(row => {
    wsData.push(columns.map(col => getValue(row, col.key)));
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const colWidths = columns.map(c => ({ wch: c.width || 18 }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function downloadWord(title: string, columns: ColumnDef[], data: any[], filename: string) {
  const headerCells = columns.map(col =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: col.header, bold: true, size: 18, color: "FFFFFF" })] })],
      shading: { fill: "163466" },
      width: { size: col.width || 2000, type: WidthType.DXA },
    })
  );

  const rows = data.map(row =>
    new TableRow({
      children: columns.map(col =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: getValue(row, col.key), size: 18 })] })],
          width: { size: col.width || 2000, type: WidthType.DXA },
        })
      ),
    })
  );

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 28 })], heading: HeadingLevel.HEADING_1, spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: `Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, size: 18, italics: true })], spacing: { after: 300 } }),
        new Table({ rows: [new TableRow({ children: headerCells }), ...rows] }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

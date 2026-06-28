import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, LevelFormat } from 'docx';

interface CVAnalysis {
  name?: string;
  summary?: string;
  sections: { title: string; bullets: string[] }[];
  improved_bullets: { original: string; improved: string }[];
}

export async function buildExportDocx(originalText: string, analysis: CVAnalysis): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: analysis.name || 'Your Name', bold: true, size: 44, font: 'Arial' })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1a56db', space: 1 } },
      spacing: { before: 40, after: 200 },
    })
  );

  // Improved sections
  for (const section of analysis.sections) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [new TextRun({ text: section.title.toUpperCase(), bold: true, size: 24, color: '1a56db', font: 'Arial' })],
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '1a56db', space: 1 } },
        spacing: { before: 0, after: 120 },
      })
    );

    for (const bullet of section.bullets) {
      // Check if we have an improved version
      const improved = analysis.improved_bullets?.find(
        (b) => bullet.toLowerCase().includes(b.original?.toLowerCase()?.slice(0, 20))
      );
      const text = improved ? improved.improved : bullet;

      children.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text, size: 20, font: 'Arial' })],
        })
      );
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 280 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

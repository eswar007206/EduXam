import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import type { GeneratedQuestion } from "@/services/syllabusQBService";

interface ExportGeneratedQuestionsParams {
  questions: GeneratedQuestion[];
  subjectName: string;
}

function getDateLabel() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function groupBySection(questions: GeneratedQuestion[]) {
  return {
    A: questions.filter((q) => q.section === "A"),
    B: questions.filter((q) => q.section === "B"),
    C: questions.filter((q) => q.section === "C"),
  };
}

export async function exportGeneratedQuestionsToWord({
  questions,
  subjectName,
}: ExportGeneratedQuestionsParams) {
  const grouped = groupBySection(questions);
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("EduXam Generated Question Bank")],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Subject: ${subjectName}`, bold: true }),
        new TextRun({ text: " | " }),
        new TextRun({ text: `Generated: ${getDateLabel()}` }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  const sections: Array<{ key: "A" | "B" | "C"; title: string }> = [
    { key: "A", title: "Section A — MCQ (1 mark each)" },
    { key: "B", title: "Section B — Theory (4 marks each)" },
    { key: "C", title: "Section C — Analytical (6 marks each)" },
  ];

  for (const section of sections) {
    const rows = grouped[section.key];
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(section.title)],
      })
    );

    if (rows.length === 0) {
      children.push(new Paragraph("No questions generated."));
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    rows.forEach((question, idx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${idx + 1}. ${question.text}`,
              bold: true,
            }),
          ],
        })
      );

      if (question.type === "mcq" && question.options) {
        const optionKeys = ["A", "B", "C", "D"] as const;
        for (const key of optionKeys) {
          const value = question.options[key] ?? "";
          const isCorrect = key === question.answer;
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `    ${key}. ${value}`,
                  bold: isCorrect,
                }),
                ...(isCorrect ? [new TextRun({ text: "  (Correct)", italics: true })] : []),
              ],
            })
          );
        }
      }

      children.push(new Paragraph({ text: "" }));
    });
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${subjectName.replace(/\s+/g, "_")}_Generated_QB.docx`;
  saveAs(blob, fileName);
}

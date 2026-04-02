import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import type { ExamSection } from "@/features/exam/types";
import type { EvaluationResult, QuestionEvaluation } from "@/services/evaluationService";

export interface ExportData {
  examSections: ExamSection[];
  answers: Record<string, string>;
  mcqAnswers: Record<string, string>;
  timeElapsed: number;
  totalMarks: number;
  answeredQuestions: number;
  totalQuestions: number;
  subjectName?: string;
  studentName?: string;
  evaluationResult?: EvaluationResult;
  includeEvaluation?: boolean;
}

// Format time from seconds to readable format
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} minutes ${secs} seconds`;
}

// Get current date formatted
function getCurrentDate(): string {
  const date = new Date();
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Helper to get evaluation for a specific question
function getQuestionEvaluation(
  questionId: string,
  evaluationResult?: EvaluationResult
): QuestionEvaluation | undefined {
  if (!evaluationResult) return undefined;
  return evaluationResult.questionEvaluations.find(e => e.questionId === questionId);
}

// ============== HTML → docx converter ==============

interface StyleContext {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
}

// Convert base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Map MIME sub-type to docx image type
function mimeToDocxType(mime: string): "jpg" | "png" | "gif" | "bmp" {
  const m = mime.toLowerCase();
  if (m === "jpeg" || m === "jpg") return "jpg";
  if (m === "gif") return "gif";
  if (m === "bmp") return "bmp";
  return "png"; // default: png (also used for webp/svg fallback)
}

// Create an ImageRun from a base64 data URL
function createImageRunFromDataUrl(src: string, imgEl?: HTMLElement): ImageRun | null {
  try {
    // Parse data URL without regex for the large base64 part
    if (!src.startsWith("data:image/")) return null;
    const base64Marker = ";base64,";
    const markerIdx = src.indexOf(base64Marker);
    if (markerIdx === -1) return null;

    const mimeSubType = src.substring(11, markerIdx); // after "data:image/"
    const base64Data = src.substring(markerIdx + base64Marker.length);
    if (!base64Data) return null;

    const imageData = base64ToUint8Array(base64Data);
    const docxType = mimeToDocxType(mimeSubType);

    // Try to get dimensions from element attributes or style
    let w = 300;
    let h = 200;
    if (imgEl) {
      const attrW = parseInt(imgEl.getAttribute("width") || "0", 10);
      const attrH = parseInt(imgEl.getAttribute("height") || "0", 10);
      if (attrW && attrH) {
        w = attrW;
        h = attrH;
      } else {
        // Try style attribute
        const style = imgEl.getAttribute("style") || "";
        const styleW = style.match(/width:\s*(\d+)/);
        const styleH = style.match(/height:\s*(\d+)/);
        if (styleW) w = parseInt(styleW[1], 10);
        if (styleH) h = parseInt(styleH[1], 10);
      }
    }

    // Scale to fit page
    const MAX_WIDTH = 480;
    const MAX_HEIGHT = 600;
    if (w > MAX_WIDTH) {
      h = Math.round(h * (MAX_WIDTH / w));
      w = MAX_WIDTH;
    }
    if (h > MAX_HEIGHT) {
      w = Math.round(w * (MAX_HEIGHT / h));
      h = MAX_HEIGHT;
    }

    return new ImageRun({
      data: imageData,
      transformation: { width: w, height: h },
      type: docxType,
    });
  } catch (e) {
    console.error("Failed to create ImageRun:", e);
    return null;
  }
}

// Recursively process a DOM node into TextRun/ImageRun array
function processNode(
  node: Node,
  style: StyleContext
): (TextRun | ImageRun)[] {
  const runs: (TextRun | ImageRun)[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (text) {
      runs.push(
        new TextRun({
          text,
          bold: style.bold,
          italics: style.italics,
          underline: style.underline ? {} : undefined,
          size: style.fontSize || 24,
          color: style.color || "1F2937",
        })
      );
    }
    return runs;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return runs;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Handle <img> elements
  if (tag === "img") {
    const src = el.getAttribute("src") || "";
    const imgRun = createImageRunFromDataUrl(src, el);
    if (imgRun) {
      runs.push(imgRun);
    } else {
      // Fallback: show placeholder text
      runs.push(
        new TextRun({
          text: "[Image]",
          italics: true,
          size: style.fontSize || 24,
          color: "9CA3AF",
        })
      );
    }
    return runs;
  }

  // Handle <br>
  if (tag === "br") {
    runs.push(new TextRun({ break: 1 }));
    return runs;
  }

  // Build inherited style for this element's children
  const childStyle: StyleContext = { ...style };

  if (tag === "strong" || tag === "b") childStyle.bold = true;
  if (tag === "em" || tag === "i") childStyle.italics = true;
  if (tag === "u") childStyle.underline = true;
  if (tag === "h1") { childStyle.bold = true; childStyle.fontSize = 36; }
  if (tag === "h2") { childStyle.bold = true; childStyle.fontSize = 32; }
  if (tag === "h3") { childStyle.bold = true; childStyle.fontSize = 28; }

  // Process all child nodes
  for (const child of Array.from(el.childNodes)) {
    runs.push(...processNode(child, childStyle));
  }

  return runs;
}

// Convert an HTML string into an array of docx Paragraphs preserving formatting and images
function htmlToDocxElements(html: string): Paragraph[] {
  if (!html) return [];

  const temp = document.createElement("div");
  temp.innerHTML = html;

  const paragraphs: Paragraph[] = [];
  const defaultStyle: StyleContext = { fontSize: 24, color: "1F2937" };

  // Walk top-level children. Each block element becomes a Paragraph;
  // inline content is gathered into a single Paragraph.
  function flushInlineRuns(runs: (TextRun | ImageRun)[]) {
    if (runs.length === 0) return;
    // Split runs into separate paragraphs for each ImageRun (images need their own paragraph)
    let currentRuns: (TextRun | ImageRun)[] = [];
    for (const run of runs) {
      if (run instanceof ImageRun) {
        // Flush any accumulated text runs first
        if (currentRuns.length > 0) {
          paragraphs.push(
            new Paragraph({
              children: currentRuns,
              spacing: { after: 80 },
              indent: { left: convertInchesToTwip(0.5) },
            })
          );
          currentRuns = [];
        }
        // Image gets its own paragraph
        paragraphs.push(
          new Paragraph({
            children: [run],
            spacing: { after: 120 },
            indent: { left: convertInchesToTwip(0.5) },
          })
        );
      } else {
        currentRuns.push(run);
      }
    }
    if (currentRuns.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: currentRuns,
          spacing: { after: 80 },
          indent: { left: convertInchesToTwip(0.5) },
        })
      );
    }
  }

  function processBlockNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim();
      if (text) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text, size: 24, color: "1F2937" }),
            ],
            spacing: { after: 80 },
            indent: { left: convertInchesToTwip(0.5) },
          })
        );
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Block-level elements → each becomes its own Paragraph
    if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"].includes(tag)) {
      const style: StyleContext = { ...defaultStyle };
      if (tag === "h1") { style.bold = true; style.fontSize = 36; }
      if (tag === "h2") { style.bold = true; style.fontSize = 32; }
      if (tag === "h3") { style.bold = true; style.fontSize = 28; }
      if (tag === "blockquote") { style.italics = true; style.color = "6B7280"; }

      const childRuns: (TextRun | ImageRun)[] = [];
      for (const child of Array.from(el.childNodes)) {
        childRuns.push(...processNode(child, style));
      }
      flushInlineRuns(childRuns);
      return;
    }

    // Lists
    if (tag === "ul" || tag === "ol") {
      const listItems = el.querySelectorAll(":scope > li");
      listItems.forEach((li, idx) => {
        const bullet = tag === "ul" ? "• " : `${idx + 1}. `;
        const liRuns: (TextRun | ImageRun)[] = [
          new TextRun({ text: bullet, bold: true, size: 24, color: "1F2937" }),
        ];
        for (const child of Array.from(li.childNodes)) {
          liRuns.push(...processNode(child, defaultStyle));
        }
        flushInlineRuns(liRuns);
      });
      return;
    }

    // Tables: convert to simple text representation
    if (tag === "table") {
      const trs = el.querySelectorAll("tr");
      trs.forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll("td, th").forEach((cell) => {
          cells.push((cell.textContent || "").trim());
        });
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cells.join("  |  "),
                size: 24,
                color: "1F2937",
              }),
            ],
            spacing: { after: 60 },
            indent: { left: convertInchesToTwip(0.5) },
          })
        );
      });
      return;
    }

    // <img> at top level
    if (tag === "img") {
      const runs = processNode(el, defaultStyle);
      flushInlineRuns(runs);
      return;
    }

    // Fallback: treat as inline content
    const inlineRuns: (TextRun | ImageRun)[] = [];
    for (const child of Array.from(el.childNodes)) {
      inlineRuns.push(...processNode(child, defaultStyle));
    }
    flushInlineRuns(inlineRuns);
  }

  // Process each top-level child node
  for (const child of Array.from(temp.childNodes)) {
    processBlockNode(child);
  }

  // If nothing was produced, add a simple text paragraph
  if (paragraphs.length === 0) {
    const plainText = temp.textContent || temp.innerText || "";
    if (plainText.trim()) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: plainText.trim(), size: 24, color: "1F2937" }),
          ],
          spacing: { after: 80 },
          indent: { left: convertInchesToTwip(0.5) },
        })
      );
    }
  }

  return paragraphs;
}

export async function generateExamWordBlob(data: ExportData): Promise<Blob> {
  const {
    examSections,
    answers,
    mcqAnswers,
    timeElapsed,
    totalMarks,
    answeredQuestions,
    totalQuestions,
    subjectName = "Subject",
    evaluationResult,
    includeEvaluation = false,
  } = data;

  // Create document sections
  const children: Paragraph[] = [];

  // ============== HEADER / TITLE PAGE ==============
  
  // EduXam Logo/Brand Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "📚 EduXam",
          bold: true,
          size: 56, // 28pt
          color: "6366F1", // Primary purple color
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Your Ultimate Exam Practice Platform",
          italics: true,
          size: 24, // 12pt
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Decorative Line
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          color: "6366F1",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "EXAM PRACTICE ATTEMPT",
          bold: true,
          size: 48, // 24pt
          color: "1F2937",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Subject Name
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: subjectName,
          bold: true,
          size: 36, // 18pt
          color: "6366F1",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Decorative Line
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          color: "6366F1",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // ============== EXAM SUMMARY ==============
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "📊 EXAM SUMMARY",
          bold: true,
          size: 32, // 16pt
          color: "1F2937",
        }),
      ],
      spacing: { before: 400, after: 300 },
    })
  );

  // Summary details
  const summaryItems: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Date", value: getCurrentDate() },
    { label: "Total Questions", value: `${totalQuestions}` },
    { label: "Questions Answered", value: `${answeredQuestions}` },
    { label: "Questions Unanswered", value: `${totalQuestions - answeredQuestions}` },
    { label: "Total Marks", value: `${totalMarks}` },
    { label: "Time Spent", value: formatTime(timeElapsed) },
  ];

  // Add evaluation results if available
  if (includeEvaluation && evaluationResult) {
    summaryItems.push(
      { label: "Marks Obtained", value: `${evaluationResult.totalMarksObtained} / ${evaluationResult.totalMaxMarks}`, highlight: true },
      { label: "Percentage", value: `${evaluationResult.percentage.toFixed(1)}%`, highlight: true },
      { label: "Grade", value: evaluationResult.grade, highlight: true },
      { label: "Evaluation Mode", value: evaluationResult.evaluationStrictness.charAt(0).toUpperCase() + evaluationResult.evaluationStrictness.slice(1) }
    );
  }

  summaryItems.forEach((item) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${item.label}: `,
            bold: true,
            size: 24, // 12pt
            color: "374151",
          }),
          new TextRun({
            text: item.value,
            size: 24, // 12pt
            color: item.highlight ? "16A34A" : "6B7280",
            bold: item.highlight,
          }),
        ],
        spacing: { after: 100 },
        indent: { left: convertInchesToTwip(0.5) },
      })
    );
  });

  // Section-wise breakdown
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "",
        }),
      ],
      spacing: { after: 300 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "📈 SECTION BREAKDOWN",
          bold: true,
          size: 28, // 14pt
          color: "1F2937",
        }),
      ],
      spacing: { before: 200, after: 200 },
    })
  );

  examSections.forEach((section) => {
    const sectionAnswered = section.questions.filter(
      (q) => answers[q.id] || mcqAnswers[q.id]
    ).length;
    const sectionTotal = section.questions.length;
    const sectionMarks = section.questions.length * section.marksPerQuestion;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${section.icon} ${section.name}`,
            bold: true,
            size: 24,
            color: "4B5563",
          }),
          new TextRun({
            text: ` — ${sectionAnswered}/${sectionTotal} answered (${sectionMarks} marks)`,
            size: 22,
            color: "6B7280",
          }),
        ],
        spacing: { after: 100 },
        indent: { left: convertInchesToTwip(0.5) },
      })
    );
  });

  // Page break before questions
  children.push(
    new Paragraph({
      children: [],
      pageBreakBefore: true,
    })
  );

  // ============== QUESTIONS AND ANSWERS ==============

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "📝 QUESTIONS AND ANSWERS",
          bold: true,
          size: 40, // 20pt
          color: "1F2937",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Process each section
  examSections.forEach((section, sectionIndex) => {
    // Section Header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${section.icon} ${section.name}`,
            bold: true,
            size: 36, // 18pt
            color: "6366F1",
          }),
        ],
        spacing: { before: 400, after: 100 },
        border: {
          bottom: {
            color: "6366F1",
            size: 6,
            style: BorderStyle.SINGLE,
            space: 1,
          },
        },
      })
    );

    // Section Description
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.description,
            italics: true,
            size: 22, // 11pt
            color: "6B7280",
          }),
          new TextRun({
            text: ` (${section.marksPerQuestion} marks each)`,
            size: 22,
            color: "9CA3AF",
          }),
        ],
        spacing: { after: 300 },
      })
    );

    // Questions in this section
    section.questions.forEach((question, qIndex) => {
      // Question Number and Text (RED, 16pt)
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Q${qIndex + 1}. `,
              bold: true,
              size: 32, // 16pt
              color: "DC2626", // Red color
            }),
            new TextRun({
              text: question.text,
              bold: true,
              size: 32, // 16pt
              color: "DC2626", // Red color
            }),
            new TextRun({
              text: ` [${question.marks} ${question.marks === 1 ? "mark" : "marks"}]`,
              size: 24, // 12pt
              color: "EF4444", // Lighter red
              italics: true,
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );

      // Answer section
      if (question.type === "mcq" && question.options) {
        // MCQ Answer — show user's choice and correct answer
        const selectedOption = mcqAnswers[question.id];
        const isAnswerCorrect =
          !!question.correctOption && question.correctOption === selectedOption;

        // Show all options with markers for selected + correct
        question.options.forEach((option, optIndex) => {
          const isSelected = option.id === selectedOption;
          const isCorrect = option.id === question.correctOption;
          const optionLetter = String.fromCharCode(65 + optIndex);

          // Determine color: green = correct, red = wrong selection, grey = neutral
          let optColor = "4B5563"; // default grey
          if (isCorrect) optColor = "16A34A"; // correct answer is always green
          else if (isSelected) optColor = "EF4444"; // wrong selection in red

          const suffixes: TextRun[] = [];
          if (isSelected && isCorrect) {
            suffixes.push(
              new TextRun({ text: " ✓ Your answer", bold: true, size: 22, color: "16A34A" })
            );
          } else if (isSelected && !isCorrect) {
            suffixes.push(
              new TextRun({ text: " ✗ Your answer", bold: true, size: 22, color: "EF4444" })
            );
          } else if (isCorrect) {
            suffixes.push(
              new TextRun({ text: " ✓ Correct answer", bold: true, size: 22, color: "16A34A" })
            );
          }

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${optionLetter}. `,
                  bold: isSelected || isCorrect,
                  size: 24,
                  color: optColor,
                }),
                new TextRun({
                  text: option.text,
                  bold: isSelected || isCorrect,
                  size: 24,
                  color: optColor,
                }),
                ...suffixes,
              ],
              spacing: { after: 50 },
              indent: { left: convertInchesToTwip(0.5) },
            })
          );
        });

        if (!selectedOption) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "❌ Not Answered",
                  italics: true,
                  size: 24,
                  color: "EF4444",
                }),
              ],
              spacing: { after: 100 },
              indent: { left: convertInchesToTwip(0.5) },
            })
          );
        } else if (isAnswerCorrect) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "✅ Correct!",
                  bold: true,
                  size: 22,
                  color: "16A34A",
                }),
              ],
              spacing: { after: 100 },
              indent: { left: convertInchesToTwip(0.5) },
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "❌ Incorrect",
                  bold: true,
                  size: 22,
                  color: "EF4444",
                }),
              ],
              spacing: { after: 100 },
              indent: { left: convertInchesToTwip(0.5) },
            })
          );
        }
      } else if (question.type === "code") {
        // Code Answer — show language and code in monospace
        const codeAnswer = answers[question.id] || "";

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Language: ${(question as { language?: string }).language || "python"}`,
                bold: true,
                size: 22,
                color: "7C3AED",
              }),
            ],
            spacing: { after: 100 },
            indent: { left: convertInchesToTwip(0.3) },
          })
        );

        if (codeAnswer.trim()) {
          const lines = codeAnswer.split("\n");
          for (const line of lines) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line || " ",
                    font: "Courier New",
                    size: 20,
                    color: "1F2937",
                  }),
                ],
                spacing: { after: 20 },
                indent: { left: convertInchesToTwip(0.5) },
              })
            );
          }
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "--- No code submitted ---",
                  italics: true,
                  size: 24,
                  color: "EF4444",
                }),
              ],
              spacing: { after: 200 },
              indent: { left: convertInchesToTwip(0.5) },
            })
          );
        }
      } else {
        // Text Answer — convert HTML to formatted docx elements
        const answerHtml = answers[question.id] || "";

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Answer: ",
                bold: true,
                size: 24, // 12pt
                color: "374151",
              }),
            ],
            spacing: { after: 50 },
            indent: { left: convertInchesToTwip(0.3) },
          })
        );

        if (answerHtml.trim()) {
          const answerParagraphs = htmlToDocxElements(answerHtml);
          children.push(...answerParagraphs);
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "❌ Not Answered",
                  italics: true,
                  size: 24,
                  color: "EF4444",
                }),
              ],
              spacing: { after: 200 },
              indent: { left: convertInchesToTwip(0.5) },
            })
          );
        }
      }

      // Add evaluation results if available
      if (includeEvaluation && evaluationResult) {
        const questionEval = getQuestionEvaluation(question.id, evaluationResult);
        if (questionEval) {
          // Color based on marks ratio: green ≥50%, orange >0%, red = 0
          const marksColor =
            questionEval.marksAwarded >= questionEval.maxMarks * 0.5
              ? "16A34A"
              : questionEval.marksAwarded > 0
              ? "D97706"
              : "EF4444";
          const marksIcon =
            questionEval.marksAwarded >= questionEval.maxMarks * 0.5
              ? " ✓"
              : questionEval.marksAwarded > 0
              ? " ~"
              : " ✗";
          // Marks box
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "📝 Evaluation: ",
                  bold: true,
                  size: 22,
                  color: "6366F1",
                }),
                new TextRun({
                  text: `${questionEval.marksAwarded}/${questionEval.maxMarks} marks`,
                  bold: true,
                  size: 22,
                  color: marksColor,
                }),
                new TextRun({
                  text: marksIcon,
                  bold: true,
                  size: 22,
                  color: marksColor,
                }),
              ],
              spacing: { before: 150, after: 50 },
              indent: { left: convertInchesToTwip(0.3) },
            })
          );

          // Feedback
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Feedback: ",
                  bold: true,
                  size: 20,
                  color: "6B7280",
                }),
                new TextRun({
                  text: questionEval.feedback,
                  italics: true,
                  size: 20,
                  color: "6B7280",
                }),
              ],
              spacing: { after: 100 },
              indent: { left: convertInchesToTwip(0.3) },
            })
          );
        }
      }

      // Divider between questions
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "─".repeat(60),
              color: "E5E7EB",
              size: 16,
            }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
    });

    // Add page break after each section (except the last one)
    if (sectionIndex < examSections.length - 1) {
      children.push(
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        })
      );
    }
  });

  // ============== FOOTER / BRANDING ==============
  
  children.push(
    new Paragraph({
      children: [],
      spacing: { before: 600 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          color: "6366F1",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "This exam was written on ",
          size: 22,
          color: "6B7280",
        }),
        new TextRun({
          text: "EduXam",
          bold: true,
          size: 24,
          color: "6366F1",
        }),
        new TextRun({
          text: " - Your Ultimate Exam Practice Platform",
          size: 22,
          color: "6B7280",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "🌟 Practice. Learn. Excel. 🌟",
          bold: true,
          size: 24,
          color: "6366F1",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Visit us at: ",
          size: 20,
          color: "9CA3AF",
        }),
        new TextRun({
          text: "www.eduexam.com",
          size: 20,
          color: "6366F1",
          underline: {},
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "© 2026 EduXam. All rights reserved.",
          size: 18,
          color: "9CA3AF",
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  // Create the document
  const doc = new Document({
    creator: "EduXam",
    title: `Exam Attempt - ${subjectName}`,
    description: "Exam practice attempt exported from EduXam",
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "📚 EduXam | ",
                    size: 18,
                    color: "6366F1",
                  }),
                  new TextRun({
                    text: subjectName,
                    size: 18,
                    color: "9CA3AF",
                    italics: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Page ",
                    size: 18,
                    color: "9CA3AF",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: "6366F1",
                  }),
                  new TextRun({
                    text: " of ",
                    size: 18,
                    color: "9CA3AF",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: "6366F1",
                  }),
                  new TextRun({
                    text: " | Generated by EduXam",
                    size: 18,
                    color: "9CA3AF",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: children,
      },
    ],
  });

  // Generate the document blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

export async function exportExamToWord(data: ExportData): Promise<void> {
  const blob = await generateExamWordBlob(data);
  const subjectName = data.subjectName || "Subject";
  const fileName = `EduXam_${subjectName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`;
  saveAs(blob, fileName);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

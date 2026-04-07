import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_API_BASE_URL = 'https://api.eduxam.in';
const DEFAULT_TARGET_TOTAL_ATTEMPTS = 100;

function readEnvFile(envPath) {
  const envText = fs.readFileSync(envPath, 'utf8');
  const values = {};
  for (const line of envText.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    values[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return values;
}

function parseArgs(argv) {
  const options = {
    email: process.env.SEED_STUDENT_EMAIL ?? '',
    password: process.env.SEED_STUDENT_PASSWORD ?? '',
    targetTotalAttempts:
      Number(process.env.SEED_TARGET_TOTAL_ATTEMPTS ?? DEFAULT_TARGET_TOTAL_ATTEMPTS) ||
      DEFAULT_TARGET_TOTAL_ATTEMPTS,
    apiBaseUrl: process.env.SEED_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    batchTag: process.env.SEED_BATCH_TAG ?? `analytics-seed-${new Date().toISOString()}`,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--email') options.email = argv[i + 1] ?? options.email;
    if (arg === '--password') options.password = argv[i + 1] ?? options.password;
    if (arg === '--target-total-attempts') {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        options.targetTotalAttempts = value;
      }
    }
    if (arg === '--api-base-url') options.apiBaseUrl = argv[i + 1] ?? options.apiBaseUrl;
    if (arg === '--batch-tag') options.batchTag = argv[i + 1] ?? options.batchTag;
  }

  if (!options.email || !options.password) {
    throw new Error(
      'Missing student credentials. Pass --email/--password or set SEED_STUDENT_EMAIL and SEED_STUDENT_PASSWORD.'
    );
  }

  return options;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(value) {
  return value.split('').reduce((acc, char) => ((acc * 31) ^ char.charCodeAt(0)) >>> 0, 2166136261);
}

function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(items, count, rng) {
  return shuffle(items, rng).slice(0, Math.min(count, items.length));
}

function choice(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function titleCaseGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'E';
}

function sentenceCase(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function wordsFromQuestion(questionText) {
  return questionText
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 4);
}

function buildDescriptiveAnswer(question, performanceBand, rng) {
  const keywords = wordsFromQuestion(question.text);
  const topic = keywords.length ? keywords.join(', ') : 'the topic';

  if (performanceBand === 'strong') {
    return sentenceCase(
      `This answer explains ${topic} clearly, defines the main concept, adds a relevant example, and connects the result back to the core principle.`
    );
  }

  if (performanceBand === 'medium') {
    return sentenceCase(
      `This answer covers the basic idea of ${topic} and includes one useful point, but it misses some detail and precision in the explanation.`
    );
  }

  if (performanceBand === 'weak') {
    return sentenceCase(
      `I know this question is about ${topic}, but the explanation is partial and misses important supporting detail.`
    );
  }

  return rng() > 0.5 ? '' : 'Not sure.';
}

function buildQuestionSections(subject, questionPool, rng) {
  const mcqPool = questionPool
    .filter((question) => question.type === 'mcq' && question.options && Object.keys(question.options).length > 0)
    .map((question) => ({
      id: question.id,
      text: question.text,
      type: 'mcq',
      marks: 1,
      options: Object.entries(question.options).map(([id, text]) => ({ id, text })),
      correctOption: question.answer,
    }));

  const descriptivePool = questionPool
    .filter((question) => question.type !== 'mcq')
    .map((question) => ({
      id: question.id,
      text: question.text,
      type: 'descriptive',
      marks: question.marks,
      correctOption: null,
    }));

  const theoryCandidates = descriptivePool.filter((question) => question.marks === 3 || question.marks === 4);
  const analyticalCandidates = descriptivePool.filter((question) => question.marks === 5 || question.marks === 6);

  const selectedMcq = sample(mcqPool, 10, rng).map((question) => ({ ...question, marks: 1 }));

  let selectedTheory = sample(theoryCandidates, 4, rng).map((question) => ({ ...question, marks: 4 }));
  let selectedAnalytical = sample(analyticalCandidates, 4, rng).map((question) => ({ ...question, marks: 6 }));

  const usedIds = new Set([
    ...selectedMcq.map((question) => question.id),
    ...selectedTheory.map((question) => question.id),
    ...selectedAnalytical.map((question) => question.id),
  ]);

  if (selectedTheory.length < 4) {
    const fallbackTheory = descriptivePool
      .filter((question) => !usedIds.has(question.id))
      .slice(0, 4 - selectedTheory.length)
      .map((question) => ({ ...question, marks: 4 }));
    selectedTheory = [...selectedTheory, ...fallbackTheory];
    fallbackTheory.forEach((question) => usedIds.add(question.id));
  }

  if (selectedAnalytical.length < 4) {
    const fallbackAnalytical = descriptivePool
      .filter((question) => !usedIds.has(question.id))
      .slice(0, 4 - selectedAnalytical.length)
      .map((question) => ({ ...question, marks: 6 }));
    selectedAnalytical = [...selectedAnalytical, ...fallbackAnalytical];
  }

  const sections = [];
  if (selectedMcq.length > 0) {
    sections.push({
      id: 'section-1',
      name: 'Section A - MCQ',
      description: 'Multiple Choice Questions - Choose the correct answer',
      icon: 'Target',
      color: 'bg-black',
      marksPerQuestion: 1,
      questions: selectedMcq,
    });
  }

  if (selectedTheory.length > 0) {
    sections.push({
      id: 'section-2',
      name: 'Section B - Theory',
      description: 'Theory questions - answer in detail',
      icon: 'FileText',
      color: 'bg-black',
      marksPerQuestion: 4,
      questions: selectedTheory,
    });
  }

  if (selectedAnalytical.length > 0) {
    sections.push({
      id: 'section-3',
      name: 'Section C - Analytical',
      description: 'Analytical questions - provide comprehensive answers',
      icon: 'BookOpen',
      color: 'bg-black',
      marksPerQuestion: 6,
      questions: selectedAnalytical,
    });
  }

  return sections;
}

function buildScorePlan(questions, desiredTotal, rng) {
  const plan = {};
  let runningTotal = 0;

  for (const question of questions) {
    const ratio = question.marks === 1 ? rng() : 0.35 + rng() * 0.65;
    const candidate = clamp(Math.round(ratio * question.marks), 0, question.marks);
    plan[question.id] = candidate;
    runningTotal += candidate;
  }

  const sorted = [...questions].sort((left, right) => right.marks - left.marks);
  let guard = 0;
  while (runningTotal !== desiredTotal && guard < 10_000) {
    guard += 1;
    if (runningTotal < desiredTotal) {
      const question = sorted.find((item) => plan[item.id] < item.marks);
      if (!question) break;
      plan[question.id] += 1;
      runningTotal += 1;
    } else {
      const question = [...sorted].reverse().find((item) => plan[item.id] > 0);
      if (!question) break;
      plan[question.id] -= 1;
      runningTotal -= 1;
    }
  }

  return plan;
}

function performanceBandFromRatio(ratio) {
  if (ratio >= 0.8) return 'strong';
  if (ratio >= 0.45) return 'medium';
  if (ratio > 0) return 'weak';
  return 'blank';
}

function buildAttemptRows({
  student,
  subject,
  questionPool,
  subjectAttemptIndex,
  subjectAttemptCount,
  globalAttemptIndex,
  batchTag,
  rng,
}) {
  const sections = buildQuestionSections(subject, questionPool, rng);
  const questions = sections.flatMap((section) =>
    section.questions.map((question) => ({ ...question, sectionId: section.id, sectionName: section.name }))
  );
  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);

  const baseProgress = subjectAttemptCount > 1 ? subjectAttemptIndex / (subjectAttemptCount - 1) : 1;
  const baseline = 0.42 + (globalAttemptIndex % 5) * 0.03 + (subject.exam_type === 'main' ? 0.02 : 0);
  const growth = 0.25 + (subject.slug.length % 4) * 0.04;
  const noisyPercentage = baseline + baseProgress * growth + (rng() - 0.5) * 0.14;
  const normalizedPercentage = clamp(noisyPercentage, 0.28, 0.94);
  const isPending = subjectAttemptIndex === subjectAttemptCount - 1;

  const desiredMarks = clamp(Math.round(totalMarks * normalizedPercentage), 8, totalMarks - 1);
  const scorePlan = buildScorePlan(questions, desiredMarks, rng);

  const durationBase =
    subject.exam_type === 'main'
      ? 3400 + subjectAttemptIndex * 18 + rng() * 900
      : 2100 + subjectAttemptIndex * 14 + rng() * 700;
  const totalDurationSeconds = Math.round(durationBase);
  const activeRatio = clamp(0.7 + rng() * 0.2 - (isPending ? 0.08 : 0), 0.55, 0.94);
  const activeDurationSeconds = Math.round(totalDurationSeconds * activeRatio);
  const idleDurationSeconds = Math.max(0, totalDurationSeconds - activeDurationSeconds);
  const focusLossCount = Math.floor(rng() * (isPending ? 4 : 3));
  const fullscreenExitCount = rng() > 0.93 ? 1 : 0;
  const copyEventCount = rng() > 0.9 ? 1 : 0;
  const pasteEventCount = copyEventCount && rng() > 0.35 ? 1 : 0;

  const examSubmittedAt = new Date(
    Date.now() -
      ((subjectAttemptCount - subjectAttemptIndex) * 36 + (globalAttemptIndex % 3) * 2 + rng()) *
        24 *
        60 *
        60 *
        1000
  );
  const examStartedAt = new Date(examSubmittedAt.getTime() - totalDurationSeconds * 1000);

  const answers = {};
  const mcqAnswers = {};
  const questionMarks = {};
  const questionAnalytics = [];
  const timelineEvents = [];
  const questionEvaluations = [];

  let runningAtMs = 0;
  let totalCharacters = 0;
  let totalWords = 0;
  let totalBackspaces = 0;
  let reviewToggleCount = 0;
  let answerChangeCount = 0;
  let navigatorJumpCount = 0;

  const weightedTimes = questions.map((question) => {
    const base =
      question.marks === 1
        ? 1.0 + rng() * 0.8
        : question.marks === 4
        ? 3.5 + rng() * 1.6
        : 5.2 + rng() * 2.2;
    return { questionId: question.id, weight: base };
  });
  const weightTotal = weightedTimes.reduce((sum, item) => sum + item.weight, 0);
  const timeMap = new Map(
    weightedTimes.map((item) => [
      item.questionId,
      Math.max(35, Math.round((item.weight / weightTotal) * totalDurationSeconds)),
    ])
  );

  let assignedSeconds = [...timeMap.values()].reduce((sum, value) => sum + value, 0);
  while (assignedSeconds !== totalDurationSeconds) {
    const direction = assignedSeconds < totalDurationSeconds ? 1 : -1;
    const targetQuestion = questions[Math.floor(rng() * questions.length)];
    const nextValue = (timeMap.get(targetQuestion.id) ?? 0) + direction;
    if (nextValue >= 20) {
      timeMap.set(targetQuestion.id, nextValue);
      assignedSeconds += direction;
    }
  }

  let globalQuestionIndex = 0;
  const sectionAnalytics = sections.map((section) => ({
    section_id: section.id,
    section_name: section.name,
    question_count: section.questions.length,
    total_marks: section.questions.reduce((sum, question) => sum + question.marks, 0),
    active_time_ms: 0,
    idle_time_ms: 0,
    visit_count: 0,
  }));
  const sectionAnalyticsMap = new Map(sectionAnalytics.map((section) => [section.section_id, section]));

  for (const question of questions) {
    globalQuestionIndex += 1;

    const marksAwarded = isPending ? null : scorePlan[question.id];
    const ratio = marksAwarded === null ? Math.max(0, normalizedPercentage - 0.08) : marksAwarded / question.marks;
    const band = performanceBandFromRatio(ratio);
    const visits = 1 + Math.floor(rng() * 3) + (band === 'weak' ? 1 : 0);
    const revisitCount = Math.max(0, visits - 1);
    const markForReviewCount = rng() > 0.78 ? 1 : 0;
    const finalStatus =
      band === 'blank'
        ? rng() > 0.55
          ? 'skipped'
          : 'unattempted'
        : markForReviewCount > 0 && rng() > 0.55
        ? 'marked'
        : 'answered';

    const totalSeconds = timeMap.get(question.id) ?? 60;
    const activeSeconds = Math.max(15, Math.round(totalSeconds * (0.7 + rng() * 0.22)));
    const idleSeconds = Math.max(0, totalSeconds - activeSeconds);

    const answerChangeEvents =
      question.marks === 1
        ? 1 + Math.floor(rng() * 2)
        : band === 'strong'
        ? 2 + Math.floor(rng() * 3)
        : 1 + Math.floor(rng() * 3);
    const backspaceCount = question.marks === 1 ? Math.floor(rng() * 2) : 3 + Math.floor(rng() * 14);

    let answerValue = '';
    let finalMcqOption = null;
    let finalAnswerLength = 0;
    let charactersTyped = 0;
    let wordsTyped = 0;

    if (question.type === 'mcq') {
      const optionIds = question.options.map((option) => option.id);
      const incorrectOptions = optionIds.filter((optionId) => optionId !== question.correctOption);
      if (finalStatus !== 'unattempted' && finalStatus !== 'skipped') {
        finalMcqOption =
          marksAwarded && question.correctOption
            ? question.correctOption
            : incorrectOptions.length
            ? choice(incorrectOptions, rng)
            : optionIds[0] ?? null;
        answerValue = finalMcqOption ?? '';
        mcqAnswers[question.id] = answerValue;
        finalAnswerLength = answerValue.length;
      }
    } else {
      answerValue =
        finalStatus === 'unattempted' || finalStatus === 'skipped'
          ? ''
          : buildDescriptiveAnswer(question, band, rng);
      if (answerValue) {
        answers[question.id] = answerValue;
      }
      finalAnswerLength = answerValue.length;
      charactersTyped = Math.max(answerValue.length, Math.round(answerValue.length * (1.08 + rng() * 0.2)));
      wordsTyped = answerValue ? answerValue.trim().split(/\s+/).length : 0;
    }

    if (!isPending) {
      questionMarks[question.id] = marksAwarded;
      questionEvaluations.push({
        questionId: question.id,
        questionText: question.text,
        studentAnswer: question.type === 'mcq' ? answerValue || '[No option selected]' : answerValue || '[No answer provided]',
        maxMarks: question.marks,
        marksAwarded,
        feedback:
          band === 'strong'
            ? 'Strong attempt with solid coverage of the key point.'
            : band === 'medium'
            ? 'Good base answer, but it needs sharper detail for full marks.'
            : band === 'weak'
            ? 'Partial understanding is visible, but important detail is missing.'
            : 'No usable answer was captured for this question.',
        isCorrect: marksAwarded === question.marks,
      });
    }

    reviewToggleCount += markForReviewCount;
    answerChangeCount += answerChangeEvents;
    navigatorJumpCount += revisitCount;
    totalCharacters += charactersTyped;
    totalWords += wordsTyped;
    totalBackspaces += backspaceCount;

    const firstSeenAt = new Date(examStartedAt.getTime() + runningAtMs).toISOString();
    const answerAtMs = runningAtMs + Math.max(8_000, Math.round(totalSeconds * 500));
    const lastInteractionAt = new Date(examStartedAt.getTime() + (runningAtMs + totalSeconds * 1000)).toISOString();

    questionAnalytics.push({
      question_id: question.id,
      question_label: `Q${globalQuestionIndex}`,
      question_text: question.text,
      question_type: question.type,
      section_id: question.sectionId,
      section_name: question.sectionName,
      max_marks: question.marks,
      visits,
      revisit_count: revisitCount,
      navigator_entry_count: visits,
      active_time_ms: activeSeconds * 1000,
      idle_time_ms: idleSeconds * 1000,
      answer_change_count: answerChangeEvents,
      mark_for_review_count: markForReviewCount,
      paste_count: question.type === 'mcq' ? 0 : (pasteEventCount && rng() > 0.7 ? 1 : 0),
      copy_count: question.type === 'mcq' ? 0 : (copyEventCount && rng() > 0.65 ? 1 : 0),
      characters_typed: charactersTyped,
      words_typed: wordsTyped,
      backspace_count: backspaceCount,
      first_seen_at: firstSeenAt,
      first_answered_at: finalStatus === 'unattempted' || finalStatus === 'skipped' ? null : new Date(examStartedAt.getTime() + answerAtMs).toISOString(),
      last_answered_at: finalStatus === 'unattempted' || finalStatus === 'skipped' ? null : lastInteractionAt,
      last_interaction_at: lastInteractionAt,
      final_status: finalStatus,
      final_answer_length: finalAnswerLength,
      final_mcq_option: finalMcqOption,
    });

    const sectionBucket = sectionAnalyticsMap.get(question.sectionId);
    if (sectionBucket) {
      sectionBucket.active_time_ms += activeSeconds * 1000;
      sectionBucket.idle_time_ms += idleSeconds * 1000;
      sectionBucket.visit_count += visits;
    }

    timelineEvents.push({
      at_ms: runningAtMs,
      type: 'question_enter',
      question_id: question.id,
      section_id: question.sectionId,
      detail: revisitCount > 0 ? 'resume' : 'start',
      value: globalQuestionIndex,
    });

    if (finalStatus !== 'unattempted' && finalStatus !== 'skipped') {
      timelineEvents.push({
        at_ms: answerAtMs,
        type: question.type === 'mcq' ? 'mcq_change' : 'answer_change',
        question_id: question.id,
        section_id: question.sectionId,
        detail: question.type === 'mcq' ? finalMcqOption : null,
        value: finalAnswerLength,
      });
    }

    if (markForReviewCount > 0) {
      timelineEvents.push({
        at_ms: answerAtMs + 4_000,
        type: 'mark_review',
        question_id: question.id,
        section_id: question.sectionId,
      });
    }

    runningAtMs += totalSeconds * 1000;
  }

  const totalMarksObtained = isPending
    ? null
    : Object.values(questionMarks).reduce((sum, value) => sum + value, 0);
  const percentage = totalMarksObtained === null ? null : round((totalMarksObtained / totalMarks) * 100, 1);

  const typingActiveMs = Math.max(60_000, Math.round(activeDurationSeconds * 1000 * 0.6));
  const typingMinutes = typingActiveMs / 60_000;
  const averageWpm = totalWords > 0 ? round(totalWords / typingMinutes, 1) : null;
  const averageCpm = totalCharacters > 0 ? round(totalCharacters / typingMinutes, 1) : null;
  const peakWpm = averageWpm ? round(averageWpm * (1.15 + rng() * 0.28), 1) : null;

  const evaluationData =
    totalMarksObtained === null
      ? null
      : {
          totalMarksObtained,
          totalMaxMarks: totalMarks,
          percentage,
          grade: titleCaseGrade(percentage),
          overallFeedback:
            percentage >= 80
              ? 'Consistently strong attempt with clear command over the topic.'
              : percentage >= 60
              ? 'Good attempt overall, with room to tighten precision and depth.'
              : percentage >= 40
              ? 'Foundational understanding is visible, but important gaps remain.'
              : 'The attempt needs much stronger accuracy, structure, and completeness.',
          questionEvaluations,
          evaluationStrictness: 'moderate',
          metadata: {
            seeded: true,
            seedBatchTag: batchTag,
          },
        };

  const submissionId = crypto.randomUUID();
  const submissionRow = {
    id: submissionId,
    student_id: student.id,
    teacher_id: subject.created_by ?? null,
    subject_id: subject.id,
    subject_name: subject.name,
    exam_type: subject.exam_type,
    exam_sections: sections,
    answers,
    mcq_answers: mcqAnswers,
    total_marks: totalMarks,
    time_elapsed: totalDurationSeconds,
    question_marks: totalMarksObtained === null ? {} : questionMarks,
    total_marks_obtained: totalMarksObtained,
    status: totalMarksObtained === null ? 'pending' : 'evaluated',
    evaluation_type: totalMarksObtained === null ? 'teacher' : 'ai',
    evaluation_data: evaluationData,
    feedback: evaluationData?.overallFeedback ?? null,
    evaluated_at: totalMarksObtained === null ? null : examSubmittedAt.toISOString(),
    submitted_due_to_violations: false,
    created_at: examSubmittedAt.toISOString(),
  };

  const analyticsRow = {
    submission_id: submissionId,
    student_id: student.id,
    teacher_id: subject.created_by ?? null,
    subject_id: subject.id,
    subject_name: subject.name,
    exam_type: subject.exam_type,
    analytics_version: 1,
    exam_started_at: examStartedAt.toISOString(),
    exam_submitted_at: examSubmittedAt.toISOString(),
    total_duration_seconds: totalDurationSeconds,
    active_duration_seconds: activeDurationSeconds,
    idle_duration_seconds: idleDurationSeconds,
    focus_loss_count: focusLossCount,
    fullscreen_exit_count: fullscreenExitCount,
    navigator_jump_count: navigatorJumpCount,
    answer_change_count: answerChangeCount,
    review_toggle_count: reviewToggleCount,
    copy_event_count: copyEventCount,
    paste_event_count: pasteEventCount,
    total_characters_typed: totalCharacters,
    total_words_typed: totalWords,
    total_backspace_count: totalBackspaces,
    typing_speed_wpm: averageWpm,
    typing_speed_cpm: averageCpm,
    peak_wpm: peakWpm,
    question_analytics: questionAnalytics,
    section_analytics: sectionAnalytics,
    timeline_events: timelineEvents.slice(0, 90),
    summary: {
      seeded: true,
      seed_batch_tag: batchTag,
      answered_questions: questionAnalytics.filter((question) => question.final_status === 'answered').length,
      marked_questions: questionAnalytics.filter((question) => question.final_status === 'marked').length,
      skipped_questions: questionAnalytics.filter((question) => question.final_status === 'skipped').length,
      unattempted_questions: questionAnalytics.filter((question) => question.final_status === 'unattempted').length,
      percentage,
      active_ratio: round((activeDurationSeconds / Math.max(totalDurationSeconds, 1)) * 100, 1),
    },
    created_at: examSubmittedAt.toISOString(),
    updated_at: examSubmittedAt.toISOString(),
  };

  const testResultRow =
    totalMarksObtained === null
      ? null
      : {
          id: crypto.randomUUID(),
          student_id: student.id,
          subject_id: subject.id,
          marks_obtained: totalMarksObtained,
          total_marks: totalMarks,
          created_at: examSubmittedAt.toISOString(),
        };

  return {
    submissionRow,
    analyticsRow,
    testResultRow,
  };
}

async function apiRequest({ baseUrl, path: requestPath, method = 'GET', headers = {}, body }) {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${requestPath}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = readEnvFile(path.resolve('.env'));
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY in .env.');
  }

  const auth = await apiRequest({
    baseUrl: options.apiBaseUrl,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: {
      email: options.email,
      password: options.password,
    },
  });

  const baseHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${auth.access_token}`,
    'Content-Type': 'application/json',
  };

  const student = (
    await apiRequest({
      baseUrl: options.apiBaseUrl,
      path: `/rest/v1/profiles?id=eq.${auth.user.id}&select=id,username,email,role,university_id,university_member_role`,
      headers: baseHeaders,
    })
  )[0];

  const existingSubmissions = await apiRequest({
    baseUrl: options.apiBaseUrl,
    path: `/rest/v1/submissions?student_id=eq.${student.id}&select=id,subject_id,status,created_at`,
    headers: baseHeaders,
  });

  const existingAttemptCount = existingSubmissions.length;
  const attemptsToCreate = Math.max(0, options.targetTotalAttempts - existingAttemptCount);
  if (attemptsToCreate === 0) {
    console.log(
      JSON.stringify(
        {
          message: 'No new attempts needed.',
          student,
          existingAttemptCount,
          targetTotalAttempts: options.targetTotalAttempts,
        },
        null,
        2
      )
    );
    return;
  }

  const subjects = await apiRequest({
    baseUrl: options.apiBaseUrl,
    path: '/rest/v1/subjects?select=id,slug,name,exam_type,created_by,university_id&order=created_at.asc',
    headers: baseHeaders,
  });

  const subjectPools = [];
  for (const subject of subjects) {
    const questionPool = await apiRequest({
      baseUrl: options.apiBaseUrl,
      path: `/rest/v1/questions?select=*&subject_id=eq.${subject.id}&order=created_at.asc`,
      headers: baseHeaders,
    });
    if (Array.isArray(questionPool) && questionPool.length >= 18) {
      subjectPools.push({ ...subject, questionPool });
    }
  }

  if (subjectPools.length === 0) {
    throw new Error('No subjects with enough questions were found for this student.');
  }

  const distribution = subjectPools.map((subject, index) => ({
    ...subject,
    count: Math.floor(attemptsToCreate / subjectPools.length) + (index < attemptsToCreate % subjectPools.length ? 1 : 0),
  }));

  const attempts = [];
  let globalAttemptIndex = 0;
  for (const subject of distribution) {
    const seedBase = hashSeed(`${student.id}:${subject.id}:${options.batchTag}`);
    const rng = mulberry32(seedBase);
    for (let subjectAttemptIndex = 0; subjectAttemptIndex < subject.count; subjectAttemptIndex += 1) {
      attempts.push(
        buildAttemptRows({
          student,
          subject,
          questionPool: subject.questionPool,
          subjectAttemptIndex,
          subjectAttemptCount: subject.count,
          globalAttemptIndex,
          batchTag: options.batchTag,
          rng,
        })
      );
      globalAttemptIndex += 1;
    }
  }

  attempts.sort(
    (left, right) => new Date(left.submissionRow.created_at).getTime() - new Date(right.submissionRow.created_at).getTime()
  );

  let insertedSubmissions = 0;
  let insertedAnalytics = 0;
  let insertedTestResults = 0;

  for (const [index, attempt] of attempts.entries()) {
    await apiRequest({
      baseUrl: options.apiBaseUrl,
      path: '/rest/v1/submissions',
      method: 'POST',
      headers: {
        ...baseHeaders,
        Prefer: 'return=minimal',
      },
      body: attempt.submissionRow,
    });
    insertedSubmissions += 1;

    await apiRequest({
      baseUrl: options.apiBaseUrl,
      path: '/rest/v1/submission_analytics',
      method: 'POST',
      headers: {
        ...baseHeaders,
        Prefer: 'return=minimal',
      },
      body: attempt.analyticsRow,
    });
    insertedAnalytics += 1;

    if (attempt.testResultRow) {
      await apiRequest({
        baseUrl: options.apiBaseUrl,
        path: '/rest/v1/test_results',
        method: 'POST',
        headers: {
          ...baseHeaders,
          Prefer: 'return=minimal',
        },
        body: attempt.testResultRow,
      });
      insertedTestResults += 1;
    }

    if ((index + 1) % 10 === 0 || index === attempts.length - 1) {
      console.log(
        JSON.stringify(
          {
            progress: `${index + 1}/${attempts.length}`,
            insertedSubmissions,
            insertedAnalytics,
            insertedTestResults,
          },
          null,
          2
        )
      );
    }
  }

  const finalSubmissions = await apiRequest({
    baseUrl: options.apiBaseUrl,
    path: `/rest/v1/submissions?student_id=eq.${student.id}&select=id,subject_id,status,created_at`,
    headers: baseHeaders,
  });
  const finalAnalytics = await apiRequest({
    baseUrl: options.apiBaseUrl,
    path: `/rest/v1/submission_analytics?student_id=eq.${student.id}&select=submission_id,subject_id,created_at`,
    headers: baseHeaders,
  });
  const finalTestResults = await apiRequest({
    baseUrl: options.apiBaseUrl,
    path: `/rest/v1/test_results?student_id=eq.${student.id}&select=id,subject_id,created_at`,
    headers: baseHeaders,
  });

  console.log(
    JSON.stringify(
      {
        student,
        batchTag: options.batchTag,
        existingAttemptCount,
        createdAttemptCount: attempts.length,
        insertedSubmissions,
        insertedAnalytics,
        insertedTestResults,
        totalSubmissions: finalSubmissions.length,
        totalAnalyticsRows: finalAnalytics.length,
        totalTestResults: finalTestResults.length,
        subjectBreakdown: distribution.map((subject) => ({
          subjectId: subject.id,
          subjectName: subject.name,
          examType: subject.exam_type,
          createdAttempts: subject.count,
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        message: error.message,
        payload: error.payload ?? null,
        stack: error.stack,
      },
      null,
      2
    )
  );
  process.exit(1);
});

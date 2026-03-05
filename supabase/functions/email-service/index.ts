import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "EduXam <support@eduxam.in>";

// 96×96 logo inlined as base64 so it renders in every email client via CID attachment
const LOGO_BASE64 =
  "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";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string; headers?: Record<string, string> }[]
) {
  // Always include the logo as an inline CID attachment so email clients render it
  const logoAttachment = {
    filename: "eduxam-logo.png",
    content: LOGO_BASE64,
    headers: {
      "Content-ID": "eduxam-logo",
    },
  };
  const allAttachments = [logoAttachment, ...(attachments ?? [])];

  const payload: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
    attachments: allAttachments,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend error: ${res.status} ${errBody}`);
  }
  return await res.json();
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpEmailTemplate(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <div style="background:#1e3a8a;padding:32px 24px;text-align:center;">
      <img src="cid:eduxam-logo" alt="EduXam" width="48" height="48" style="display:block;border-radius:12px;margin:0 auto 12px;" />
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">EduXam</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Parent Email Verification</p>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6;">
        A student on EduXam has requested to link your email for exam notifications. Use the code below to verify:
      </p>
      <div style="background:#f0f4ff;border:2px solid #1e3a8a;border-radius:12px;padding:20px;margin:0 auto 24px;display:inline-block;">
        <span style="font-size:36px;font-weight:800;color:#1e3a8a;letter-spacing:8px;font-family:monospace;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;margin:0;">This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">EduXam - Online Exam Practice Platform | eduxam.in</p>
    </div>
  </div>
</body>
</html>`;
}

function notificationEmailTemplate(params: {
  studentName: string;
  subjectName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  evaluationType: string;
  attemptNumber?: number;
}): string {
  const {
    studentName,
    subjectName,
    score,
    totalMarks,
    percentage,
    grade,
    evaluationType,
    attemptNumber,
  } = params;

  const evalLabel = evaluationType === "ai" ? "AI Evaluated" : "Teacher Evaluated";
  const gradeColor =
    grade === "A+" || grade === "A"
      ? "#10b981"
      : grade === "B+" || grade === "B"
        ? "#3b82f6"
        : grade === "C"
          ? "#eab308"
          : "#ef4444";

  const attemptLine = attemptNumber
    ? `<p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Attempt #${attemptNumber} for this subject</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <div style="background:#1e3a8a;padding:32px 24px;text-align:center;">
      <img src="cid:eduxam-logo" alt="EduXam" width="48" height="48" style="display:block;border-radius:12px;margin:0 auto 12px;" />
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">EduXam</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Exam Result Notification</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:15px;margin:0 0 8px;line-height:1.6;">
        Dear Parent,
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6;">
        Your child <strong>${studentName}</strong> has completed the <strong>${subjectName}</strong> exam on EduXam. Here are the results:
      </p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Subject</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;">${subjectName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Score</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${score} / ${totalMarks}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Percentage</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${percentage.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Grade</td>
            <td style="padding:8px 0;font-size:18px;font-weight:800;text-align:right;border-top:1px solid #e5e7eb;color:${gradeColor};">${grade}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Evaluation</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${evalLabel}</td>
          </tr>
        </table>
      </div>
      ${attemptLine}
      <p style="color:#6b7280;font-size:13px;margin:16px 0 0;line-height:1.5;">
        The detailed exam report with questions, answers, and feedback is attached as a Word document.
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">EduXam - Online Exam Practice Platform | eduxam.in</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Action Handlers ────────────────────────────────

async function handleSendOtp(body: Record<string, unknown>) {
  const { studentId, parentEmail } = body as {
    studentId: string;
    parentEmail: string;
  };

  if (!studentId || !parentEmail) {
    return jsonResponse(
      { success: false, message: "Missing studentId or parentEmail" },
      400
    );
  }

  // Delete old OTPs for this student
  await supabaseAdmin
    .from("parent_email_otps")
    .delete()
    .eq("student_id", studentId);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertError } = await supabaseAdmin
    .from("parent_email_otps")
    .insert({
      student_id: studentId,
      email: parentEmail,
      otp,
      expires_at: expiresAt,
    });

  if (insertError) {
    return jsonResponse(
      { success: false, message: "Failed to store OTP" },
      500
    );
  }

  try {
    await sendEmail(
      parentEmail,
      "EduXam - Parent Email Verification Code",
      otpEmailTemplate(otp)
    );
  } catch (err) {
    return jsonResponse(
      { success: false, message: `Failed to send email: ${(err as Error).message}` },
      500
    );
  }

  return jsonResponse({
    success: true,
    message: "OTP sent successfully",
  });
}

async function handleVerifyOtp(body: Record<string, unknown>) {
  const { studentId, parentEmail, otp } = body as {
    studentId: string;
    parentEmail: string;
    otp: string;
  };

  if (!studentId || !parentEmail || !otp) {
    return jsonResponse(
      { success: false, message: "Missing required fields", verified: false },
      400
    );
  }

  const { data: otpRecord, error: otpError } = await supabaseAdmin
    .from("parent_email_otps")
    .select("*")
    .eq("student_id", studentId)
    .eq("email", parentEmail)
    .eq("otp", otp)
    .single();

  if (otpError || !otpRecord) {
    return jsonResponse({
      success: false,
      message: "Invalid OTP",
      verified: false,
    });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    return jsonResponse({
      success: false,
      message: "OTP has expired. Please request a new one.",
      verified: false,
    });
  }

  // Update profile with verified parent email
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      parent_email: parentEmail,
      parent_email_verified: true,
    })
    .eq("id", studentId);

  if (updateError) {
    return jsonResponse(
      { success: false, message: "Failed to update profile", verified: false },
      500
    );
  }

  // Clean up OTPs
  await supabaseAdmin
    .from("parent_email_otps")
    .delete()
    .eq("student_id", studentId);

  return jsonResponse({
    success: true,
    message: "Parent email verified successfully",
    verified: true,
  });
}

async function handleSendNotification(body: Record<string, unknown>) {
  const {
    studentId,
    studentName,
    subjectName,
    score,
    totalMarks,
    percentage,
    grade,
    evaluationType,
    attemptNumber,
    wordDocBase64,
  } = body as {
    studentId: string;
    studentName: string;
    subjectName: string;
    score: number;
    totalMarks: number;
    percentage: number;
    grade: string;
    evaluationType: "ai" | "teacher";
    attemptNumber?: number;
    wordDocBase64?: string;
  };

  if (!studentId) {
    return jsonResponse(
      { success: false, message: "Missing studentId" },
      400
    );
  }

  // Fetch student profile to get parent email
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("parent_email, parent_email_verified")
    .eq("id", studentId)
    .single();

  if (profileError || !profile) {
    return jsonResponse(
      { success: false, message: "Student profile not found" },
      404
    );
  }

  if (!profile.parent_email_verified || !profile.parent_email) {
    return jsonResponse({
      success: false,
      message: "Parent email not verified",
    });
  }

  // Count attempts for this subject
  let attempts = attemptNumber;
  if (!attempts) {
    const { count } = await supabaseAdmin
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("subject_name", subjectName);
    attempts = count ?? 1;
  }

  const evalLabel = evaluationType === "ai" ? "AI Evaluation" : "Teacher Evaluation";
  const subject = `${studentName}'s ${subjectName} Exam Result - ${score}/${totalMarks} (${percentage.toFixed(1)}%) | ${evalLabel}`;

  const html = notificationEmailTemplate({
    studentName,
    subjectName,
    score,
    totalMarks,
    percentage,
    grade,
    evaluationType,
    attemptNumber: attempts,
  });

  const attachments: { filename: string; content: string }[] = [];
  if (wordDocBase64) {
    attachments.push({
      filename: `EduXam_${subjectName.replace(/\s+/g, "_")}_${studentName.replace(/\s+/g, "_")}.docx`,
      content: wordDocBase64,
    });
  }

  try {
    await sendEmail(profile.parent_email, subject, html, attachments);
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        message: `Failed to send notification: ${(err as Error).message}`,
      },
      500
    );
  }

  return jsonResponse({
    success: true,
    message: "Parent notification sent successfully",
  });
}

// ─── Main Server ────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "send-otp":
        return await handleSendOtp(body);
      case "verify-otp":
        return await handleVerifyOtp(body);
      case "send-notification":
        return await handleSendNotification(body);
      default:
        return jsonResponse(
          { success: false, message: `Unknown action: ${action}` },
          400
        );
    }
  } catch (err) {
    return jsonResponse(
      { success: false, message: (err as Error).message },
      500
    );
  }
});

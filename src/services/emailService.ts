import { supabase } from "@/lib/supabase";

const FUNCTION_NAME = "email-service";

interface SendOtpResponse {
  success: boolean;
  message: string;
}

interface VerifyOtpResponse {
  success: boolean;
  message: string;
  verified: boolean;
}

interface SendNotificationResponse {
  success: boolean;
  message: string;
}

export async function sendParentEmailOtp(
  studentId: string,
  parentEmail: string
): Promise<SendOtpResponse> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: "send-otp",
      studentId,
      parentEmail,
    },
  });

  if (error) throw new Error(error.message);
  return data as SendOtpResponse;
}

export async function verifyParentEmailOtp(
  studentId: string,
  parentEmail: string,
  otp: string
): Promise<VerifyOtpResponse> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: "verify-otp",
      studentId,
      parentEmail,
      otp,
    },
  });

  if (error) throw new Error(error.message);
  return data as VerifyOtpResponse;
}

export async function sendParentNotification(params: {
  studentId: string;
  studentName: string;
  subjectName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  attemptNumber?: number;
  evaluationType: "ai" | "teacher" | "ai_teacher";
  wordDocBase64?: string;
}): Promise<SendNotificationResponse> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: "send-notification",
      ...params,
    },
  });

  if (error) throw new Error(error.message);
  return data as SendNotificationResponse;
}

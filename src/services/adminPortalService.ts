import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";
import type {
  DepartmentRow,
  ManagedAccountStatus,
  MainExamScheduleSlotRow,
  OrganizationFeatureSettings,
  OrganizationType,
  ProfileRow,
  SubjectRow,
  SubjectExamChangeRequestRow,
  SubmissionRow,
  UserRole,
  UniversityEmailDomainRow,
  UniversityManagedAccountRow,
  UniversityPrivateProfileRow,
  UniversityRow,
} from "@/lib/database.types";
import { normalizeOrganizationFeatures } from "@/lib/organizationFeatures";

export interface UniversityWithMeta extends UniversityRow {
  domains: UniversityEmailDomainRow[];
  managedAccountCount: number;
  activeProfileCount: number;
  adminAccountCount: number;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface DeveloperDashboardSnapshot {
  universities: number;
  universityAdmins: number;
  universitiesWithAdmin: number;
}

export interface DeveloperUniversityShell extends UniversityRow {
  adminAccountCount: number;
  domains: UniversityEmailDomainRow[];
}

export interface UniversityAdminDashboardSnapshot {
  departments: number;
  managedAccounts: number;
  pendingRequests: number;
  activeSlots: number;
  mainExamSubjects: number;
}

export interface AdminAnalyticsSnapshot {
  universities: number;
  managedAccounts: number;
  pendingRequests: number;
  activeSlots: number;
  submissions: number;
  mainExamSubjects: number;
}

export interface AdminSubmissionWithDetails extends SubmissionRow {
  student_username?: string;
  student_email?: string;
  teacher_username?: string;
  teacher_email?: string;
}

export interface ExamChangeRequestWithDetails extends SubjectExamChangeRequestRow {
  subject_name?: string;
  subject_slug?: string;
  teacher_username?: string;
  teacher_email?: string;
  university_name?: string;
}

const PROVISIONABLE_PORTAL_ROLES = ["teacher", "recruiter"] as const;

export type ProvisionablePortalRole = (typeof PROVISIONABLE_PORTAL_ROLES)[number];

type ProvisionableAuthRole = Extract<UserRole, "teacher" | "recruiter" | "admin" | "developer">;
type UniversityPrivateField = "website" | "contact_email" | "contact_phone" | "address" | "notes";

const UNIVERSITY_PRIVATE_FIELDS: UniversityPrivateField[] = [
  "website",
  "contact_email",
  "contact_phone",
  "address",
  "notes",
];

export interface ProvisionedPortalAccount {
  id: UniversityManagedAccountRow["id"];
  email: UniversityManagedAccountRow["email"];
  username: UniversityManagedAccountRow["username"];
  role: ProvisionablePortalRole;
  university_id: UniversityManagedAccountRow["university_id"];
  department_label: UniversityManagedAccountRow["department_label"];
  company_name: UniversityManagedAccountRow["company_name"];
  provisioning_status: UniversityManagedAccountRow["provisioning_status"];
  linked_profile_id: UniversityManagedAccountRow["linked_profile_id"];
  created_at: UniversityManagedAccountRow["created_at"];
}

export interface ProvisionedAdminAccount {
  id: UniversityManagedAccountRow["id"];
  email: UniversityManagedAccountRow["email"];
  username: UniversityManagedAccountRow["username"];
  role: Extract<UserRole, "admin">;
  university_id: UniversityManagedAccountRow["university_id"];
  provisioning_status: UniversityManagedAccountRow["provisioning_status"];
  linked_profile_id: UniversityManagedAccountRow["linked_profile_id"];
  created_at: UniversityManagedAccountRow["created_at"];
}

export interface ProvisionPortalAccountInput {
  university_id: string | null;
  email: string;
  username?: string | null;
  role: ProvisionablePortalRole;
  company_name?: string | null;
  department_label?: string | null;
  created_by?: string | null;
}

export interface ProvisionPortalAccountResult {
  account: ProvisionedPortalAccount;
  generatedPassword: string;
}

export interface ProvisionUniversityAdminInput {
  university_id: string;
  email: string;
  username?: string | null;
  created_by?: string | null;
}

export interface ProvisionUniversityAdminResult {
  account: ProvisionedAdminAccount;
  generatedPassword: string;
}

export interface UniversityStudentAccount {
  id: ProfileRow["id"];
  email: ProfileRow["email"];
  username: ProfileRow["username"];
  roll_number: ProfileRow["roll_number"];
  semester_label: ProfileRow["semester_label"];
  department_label: ProfileRow["department_label"];
  created_at: ProfileRow["created_at"];
}

interface AuthSignupResponse {
  user?: { id?: string | null } | null;
  code?: string;
  msg?: string;
  message?: string;
  error_description?: string;
}

function isProvisionablePortalRole(role: UserRole): role is ProvisionablePortalRole {
  return PROVISIONABLE_PORTAL_ROLES.includes(role as ProvisionablePortalRole);
}

function randomIndex(max: number): number {
  if (max <= 0) return 0;

  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function generateProvisionedPassword(length: number = 14): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*-_";
  const all = `${uppercase}${lowercase}${digits}${symbols}`;
  const passwordChars = [
    uppercase[randomIndex(uppercase.length)],
    lowercase[randomIndex(lowercase.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];

  while (passwordChars.length < length) {
    passwordChars.push(all[randomIndex(all.length)]);
  }

  for (let index = passwordChars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [passwordChars[index], passwordChars[swapIndex]] = [passwordChars[swapIndex], passwordChars[index]];
  }

  return passwordChars.join("");
}

function getAuthSignupErrorMessage(payload: AuthSignupResponse): string {
  return (
    payload.msg ||
    payload.message ||
    payload.error_description ||
    "Unable to create the login right now."
  );
}

function normalizeProvisionedUsername(email: string, username?: string | null): string {
  const trimmedUsername = username?.trim();
  if (trimmedUsername) {
    return trimmedUsername;
  }

  return email.split("@")[0] || "eduxam-user";
}

function mapManagedAccountToProvisionedPortalAccount(
  account: UniversityManagedAccountRow
): ProvisionedPortalAccount {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    role: account.role as ProvisionablePortalRole,
    university_id: account.university_id,
    department_label: account.department_label,
    company_name: account.company_name,
    provisioning_status: account.provisioning_status,
    linked_profile_id: account.linked_profile_id,
    created_at: account.created_at,
  };
}

function mapManagedAccountToProvisionedAdminAccount(
  account: UniversityManagedAccountRow
): ProvisionedAdminAccount {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    role: "admin",
    university_id: account.university_id,
    provisioning_status: account.provisioning_status,
    linked_profile_id: account.linked_profile_id,
    created_at: account.created_at,
  };
}

async function createPortalAuthUser(data: {
  email: string;
  password: string;
  username: string;
  role: ProvisionableAuthRole;
}): Promise<string> {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      data: {
        username: data.username,
        role: data.role,
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as AuthSignupResponse;

  if (!response.ok) {
    throw new Error(getAuthSignupErrorMessage(payload));
  }

  const userId = payload.user?.id;
  if (!userId) {
    throw new Error("Supabase did not return the created user.");
  }

  return userId;
}

function isProvisionedProfileSyncError(error: { message?: string } | null): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("provisioned auth profile could not be found");
}

async function provisionManagedAccountWithRetry(args: {
  p_profile_id: string;
  p_university_id: string | null;
  p_email: string;
  p_username: string;
  p_role: "teacher" | "recruiter" | "admin";
  p_department_label: string | null;
  p_company_name: string | null;
  p_created_by: string | null;
}): Promise<UniversityManagedAccountRow> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase.rpc("provision_platform_account", args);

    if (!error) {
      return data as UniversityManagedAccountRow;
    }

    if (!isProvisionedProfileSyncError(error) || attempt === 7) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("The login was created, but the profile is still syncing. Please refresh and try again in a moment.");
}

function normalizeUniversityDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@+/, "");
}

async function getUniversityPrivateProfileMap(
  universityIds: string[]
): Promise<Map<string, UniversityPrivateProfileRow>> {
  if (universityIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("university_private_profiles")
    .select("*")
    .in("university_id", universityIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as UniversityPrivateProfileRow[]).map((row) => [row.university_id, row])
  );
}

export async function getUniversitiesWithMeta(universityIds?: string[]): Promise<UniversityWithMeta[]> {
  let query = supabase
    .from("universities")
    .select("*")
    .order("name");

  if (universityIds?.length) {
    query = query.in("id", universityIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  const universities = (data ?? []) as UniversityRow[];
  const privateProfiles = await getUniversityPrivateProfileMap(universities.map((university) => university.id));

  return Promise.all(
    universities.map(async (university) => {
      const privateProfile = privateProfiles.get(university.id);
      const [
        { data: domains },
        { count: managedAccountCount },
        { count: activeProfileCount },
        { count: adminAccountCount },
      ] = await Promise.all([
        supabase
          .from("university_email_domains")
          .select("*")
          .eq("university_id", university.id)
          .order("is_primary", { ascending: false })
          .order("domain", { ascending: true }),
        supabase
          .from("university_managed_accounts")
          .select("*", { count: "exact", head: true })
          .eq("university_id", university.id),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("university_id", university.id),
        supabase
          .from("university_managed_accounts")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin")
          .eq("university_id", university.id),
      ]);

      return {
        ...university,
        organization_features: normalizeOrganizationFeatures(university.organization_features),
        domains: (domains ?? []) as UniversityEmailDomainRow[],
        managedAccountCount: managedAccountCount ?? 0,
        activeProfileCount: activeProfileCount ?? 0,
        adminAccountCount: adminAccountCount ?? 0,
        website: privateProfile?.website ?? null,
        contact_email: privateProfile?.contact_email ?? null,
        contact_phone: privateProfile?.contact_phone ?? null,
        address: privateProfile?.address ?? null,
        notes: privateProfile?.notes ?? null,
      };
    })
  );
}

export async function getUniversityById(universityId: string): Promise<UniversityWithMeta | null> {
  const [university] = await getUniversitiesWithMeta([universityId]);
  return university ?? null;
}

export async function getDeveloperUniversityShells(): Promise<DeveloperUniversityShell[]> {
  const [{ data: universities, error }, adminAccounts, { data: domains, error: domainsError }] = await Promise.all([
    supabase
      .from("universities")
      .select("id, name, slug, short_name, organization_type, organization_features, created_by, created_at")
      .order("name"),
    getProvisionedAdminAccounts(),
    supabase
      .from("university_email_domains")
      .select("*")
      .order("domain", { ascending: true }),
  ]);

  if (error) {
    throw error;
  }

  if (domainsError) {
    throw domainsError;
  }

  const adminCounts = adminAccounts.reduce<Record<string, number>>((accumulator, account) => {
    if (account.university_id) {
      accumulator[account.university_id] = (accumulator[account.university_id] ?? 0) + 1;
    }
    return accumulator;
  }, {});

  const domainsByUniversity = ((domains ?? []) as UniversityEmailDomainRow[]).reduce<Record<string, UniversityEmailDomainRow[]>>(
    (accumulator, domain) => {
      accumulator[domain.university_id] = [...(accumulator[domain.university_id] ?? []), domain];
      return accumulator;
    },
    {}
  );

  return ((universities ?? []) as UniversityRow[]).map((university) => ({
    ...university,
    organization_features: normalizeOrganizationFeatures(university.organization_features),
    adminAccountCount: adminCounts[university.id] ?? 0,
    domains: domainsByUniversity[university.id] ?? [],
  }));
}

export async function createUniversity(data: {
  name: string;
  slug: string;
  short_name?: string | null;
  organization_type?: OrganizationType;
  organization_features?: OrganizationFeatureSettings;
  created_by?: string | null;
}): Promise<UniversityRow> {
  const { data: row, error } = await supabase
    .from("universities")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as UniversityRow;
}

export async function updateUniversity(
  id: string,
  updates: Partial<Pick<UniversityRow, "name" | "slug" | "short_name" | "organization_type" | "organization_features">> &
    Partial<Pick<UniversityPrivateProfileRow, UniversityPrivateField>> & {
      updated_by?: string | null;
    }
): Promise<UniversityRow> {
  const shellUpdates: Partial<Pick<UniversityRow, "name" | "slug" | "short_name" | "organization_type" | "organization_features">> = {};
  const privateUpdates: Partial<Pick<UniversityPrivateProfileRow, UniversityPrivateField>> = {};

  if (Object.prototype.hasOwnProperty.call(updates, "name")) {
    shellUpdates.name = updates.name;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "slug")) {
    shellUpdates.slug = updates.slug;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "short_name")) {
    shellUpdates.short_name = updates.short_name;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "organization_type")) {
    shellUpdates.organization_type = updates.organization_type;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "organization_features")) {
    shellUpdates.organization_features = normalizeOrganizationFeatures(updates.organization_features);
  }

  for (const field of UNIVERSITY_PRIVATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      privateUpdates[field] = updates[field];
    }
  }

  let universityRow: UniversityRow | null = null;

  if (Object.keys(shellUpdates).length > 0) {
    const { data, error } = await supabase
      .from("universities")
      .update(shellUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    universityRow = data as UniversityRow;
  }

  if (Object.keys(privateUpdates).length > 0) {
    const { error } = await supabase
      .from("university_private_profiles")
      .upsert(
        {
          university_id: id,
          ...privateUpdates,
          updated_by: updates.updated_by ?? null,
        },
        { onConflict: "university_id" }
      );

    if (error) throw error;
  }

  if (universityRow) {
    return universityRow;
  }

  const { data, error } = await supabase
    .from("universities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as UniversityRow;
}

export async function createUniversityDomain(data: {
  university_id: string;
  domain: string;
  is_primary?: boolean;
}): Promise<UniversityEmailDomainRow> {
  const normalizedDomain = normalizeUniversityDomain(data.domain);
  const { data: row, error } = await supabase
    .from("university_email_domains")
    .insert({
      ...data,
      domain: normalizedDomain,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: backfillError } = await supabase.rpc("backfill_university_profiles_for_domain", {
    p_university_id: data.university_id,
    p_domain: normalizedDomain,
  });

  if (backfillError) throw backfillError;
  return row as UniversityEmailDomainRow;
}

export async function deleteUniversityDomain(id: string): Promise<void> {
  const { error } = await supabase
    .from("university_email_domains")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getUniversityDepartments(universityId: string): Promise<DepartmentRow[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("university_id", universityId)
    .order("name");

  if (error) throw error;
  return (data ?? []) as DepartmentRow[];
}

export async function createUniversityDepartment(data: {
  university_id: string;
  name: string;
  slug: string;
  created_by: string;
}): Promise<DepartmentRow> {
  const { data: row, error } = await supabase
    .from("departments")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as DepartmentRow;
}

export async function getManagedAccounts(
  universityId?: string,
  role?: UniversityManagedAccountRow["role"]
): Promise<UniversityManagedAccountRow[]> {
  let query = supabase
    .from("university_managed_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (universityId) {
    query = query.eq("university_id", universityId);
  }

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as UniversityManagedAccountRow[];
}

export async function getProvisionedPortalAccounts(universityId?: string): Promise<ProvisionedPortalAccount[]> {
  let query = supabase
    .from("university_managed_accounts")
    .select("id, email, username, role, university_id, department_label, company_name, provisioning_status, linked_profile_id, created_at")
    .in("role", [...PROVISIONABLE_PORTAL_ROLES])
    .order("created_at", { ascending: false });

  if (universityId) {
    query = query.eq("university_id", universityId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as UniversityManagedAccountRow[]).map(mapManagedAccountToProvisionedPortalAccount);
}

export async function getProvisionedAdminAccounts(universityId?: string): Promise<ProvisionedAdminAccount[]> {
  let query = supabase
    .from("university_managed_accounts")
    .select("id, email, username, role, university_id, provisioning_status, linked_profile_id, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (universityId) {
    query = query.eq("university_id", universityId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as UniversityManagedAccountRow[]).map(mapManagedAccountToProvisionedAdminAccount);
}

export async function provisionPortalAccount(
  data: ProvisionPortalAccountInput
): Promise<ProvisionPortalAccountResult> {
  if (!isProvisionablePortalRole(data.role)) {
    throw new Error("Only teacher and recruiter accounts can be provisioned here.");
  }

  const email = data.email.trim().toLowerCase();
  const username = normalizeProvisionedUsername(email, data.username);
  const departmentLabel = data.department_label?.trim() || null;
  const companyName = data.company_name?.trim() || null;

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!data.university_id) {
    throw new Error("A university is required for institution-managed accounts.");
  }

  if (data.role === "teacher" && !departmentLabel) {
    throw new Error("Department is required for teacher accounts.");
  }

  if (data.role === "recruiter" && !companyName) {
    throw new Error("Company name is required for recruiter accounts.");
  }

  const generatedPassword = generateProvisionedPassword();
  const userId = await createPortalAuthUser({
    email,
    password: generatedPassword,
    username,
    role: data.role,
  });

  const managedAccount = await provisionManagedAccountWithRetry({
    p_profile_id: userId,
    p_university_id: data.university_id,
    p_email: email,
    p_username: username,
    p_role: data.role,
    p_department_label: departmentLabel,
    p_company_name: companyName,
    p_created_by: data.created_by ?? null,
  });

  return {
    account: mapManagedAccountToProvisionedPortalAccount(managedAccount),
    generatedPassword,
  };
}

export async function provisionUniversityAdminAccount(
  data: ProvisionUniversityAdminInput
): Promise<ProvisionUniversityAdminResult> {
  const email = data.email.trim().toLowerCase();
  const username = normalizeProvisionedUsername(email, data.username);

  if (!email) {
    throw new Error("Admin email is required.");
  }

  if (!data.university_id) {
    throw new Error("A university must be selected for the admin account.");
  }

  const generatedPassword = generateProvisionedPassword();
  const userId = await createPortalAuthUser({
    email,
    password: generatedPassword,
    username,
    role: "admin",
  });

  const managedAccount = await provisionManagedAccountWithRetry({
    p_profile_id: userId,
    p_university_id: data.university_id,
    p_email: email,
    p_username: username,
    p_role: "admin",
    p_department_label: null,
    p_company_name: null,
    p_created_by: data.created_by ?? null,
  });

  return {
    account: mapManagedAccountToProvisionedAdminAccount(managedAccount),
    generatedPassword,
  };
}

export async function createManagedAccount(data: {
  university_id: string | null;
  email: string;
  username?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  role: UniversityManagedAccountRow["role"];
  roll_number?: string | null;
  semester_label?: string | null;
  department_label?: string | null;
  provisioning_status?: UniversityManagedAccountRow["provisioning_status"];
  created_by?: string | null;
}): Promise<UniversityManagedAccountRow> {
  const { data: row, error } = await supabase
    .from("university_managed_accounts")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as UniversityManagedAccountRow;
}

export async function updateManagedAccount(
  id: string,
  updates: Partial<
    Pick<
      UniversityManagedAccountRow,
      | "email"
      | "username"
      | "full_name"
      | "company_name"
      | "role"
      | "roll_number"
      | "semester_label"
      | "department_label"
      | "provisioning_status"
      | "linked_profile_id"
    >
  >
): Promise<UniversityManagedAccountRow> {
  const { data, error } = await supabase
    .from("university_managed_accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UniversityManagedAccountRow;
}

export async function updatePlatformAccount(data: {
  managed_account_id: string;
  username?: string | null;
  university_id?: string | null;
  department_label?: string | null;
  company_name?: string | null;
  provisioning_status?: ManagedAccountStatus | null;
}): Promise<UniversityManagedAccountRow> {
  const { data: row, error } = await supabase.rpc("update_platform_account", {
    p_managed_account_id: data.managed_account_id,
    p_username: data.username ?? null,
    p_university_id: data.university_id ?? null,
    p_department_label: data.department_label ?? null,
    p_company_name: data.company_name ?? null,
    p_provisioning_status: data.provisioning_status ?? null,
  });

  if (error) {
    throw error;
  }

  return row as UniversityManagedAccountRow;
}

export async function getUniversityStudentAccounts(universityId: string): Promise<UniversityStudentAccount[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username, roll_number, semester_label, department_label, created_at")
    .eq("role", "student")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as UniversityStudentAccount[];
}

export async function updateUniversityStudentAccount(
  id: string,
  updates: Partial<Pick<UniversityStudentAccount, "username" | "roll_number" | "semester_label" | "department_label">>
): Promise<UniversityStudentAccount> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .eq("role", "student")
    .select("id, email, username, roll_number, semester_label, department_label, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as UniversityStudentAccount;
}

export async function getDeveloperDashboardSnapshot(): Promise<DeveloperDashboardSnapshot> {
  const [{ count: universities }, adminAccounts] = await Promise.all([
    supabase.from("universities").select("*", { count: "exact", head: true }),
    getProvisionedAdminAccounts(),
  ]);

  const universitiesWithAdmin = new Set(
    adminAccounts.map((account) => account.university_id).filter(Boolean)
  ).size;

  return {
    universities: universities ?? 0,
    universityAdmins: adminAccounts.length,
    universitiesWithAdmin,
  };
}

export async function getUniversityAdminDashboard(universityId: string): Promise<UniversityAdminDashboardSnapshot> {
  const [
    { count: departments },
    { count: managedAccounts },
    { count: pendingRequests },
    { count: activeSlots },
    { count: mainExamSubjects },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("*", { count: "exact", head: true })
      .eq("university_id", universityId),
    supabase
      .from("university_managed_accounts")
      .select("*", { count: "exact", head: true })
      .in("role", [...PROVISIONABLE_PORTAL_ROLES])
      .eq("university_id", universityId),
    supabase
      .from("subject_exam_change_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("university_id", universityId),
    supabase
      .from("main_exam_schedule_slots")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("university_id", universityId),
    supabase
      .from("subjects")
      .select("*", { count: "exact", head: true })
      .eq("university_id", universityId)
      .eq("exam_type", "main")
      .eq("exam_type_status", "active"),
  ]);

  return {
    departments: departments ?? 0,
    managedAccounts: managedAccounts ?? 0,
    pendingRequests: pendingRequests ?? 0,
    activeSlots: activeSlots ?? 0,
    mainExamSubjects: mainExamSubjects ?? 0,
  };
}

export async function getAdminAnalytics(universityId?: string): Promise<AdminAnalyticsSnapshot> {
  if (!universityId) {
    const [
      { count: universities },
      { count: managedAccounts },
      { count: pendingRequests },
      { count: activeSlots },
      { count: submissions },
      { count: mainExamSubjects },
    ] = await Promise.all([
      supabase.from("universities").select("*", { count: "exact", head: true }),
      supabase.from("university_managed_accounts").select("*", { count: "exact", head: true }),
      supabase
        .from("subject_exam_change_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("main_exam_schedule_slots")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("submissions").select("*", { count: "exact", head: true }),
      supabase
        .from("subjects")
        .select("*", { count: "exact", head: true })
        .eq("exam_type", "main")
        .eq("exam_type_status", "active"),
    ]);

    return {
      universities: universities ?? 0,
      managedAccounts: managedAccounts ?? 0,
      pendingRequests: pendingRequests ?? 0,
      activeSlots: activeSlots ?? 0,
      submissions: submissions ?? 0,
      mainExamSubjects: mainExamSubjects ?? 0,
    };
  }

  const scoped = await getUniversityAdminDashboard(universityId);
  return {
    universities: 1,
    managedAccounts: scoped.managedAccounts,
    pendingRequests: scoped.pendingRequests,
    activeSlots: scoped.activeSlots,
    submissions: 0,
    mainExamSubjects: scoped.mainExamSubjects,
  };
}

export async function getAdminExamChangeRequests(universityId?: string): Promise<ExamChangeRequestWithDetails[]> {
  let query = supabase
    .from("subject_exam_change_requests")
    .select(
      "*, subjects(name, slug), teacher:profiles!subject_exam_change_requests_teacher_id_fkey(username, email), universities(name)"
    )
    .order("created_at", { ascending: false });

  if (universityId) {
    query = query.eq("university_id", universityId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return ((data ?? []) as Array<
    SubjectExamChangeRequestRow & {
      subjects?: { name?: string; slug?: string } | null;
      teacher?: { username?: string; email?: string } | null;
      universities?: { name?: string } | null;
    }
  >).map((row) => ({
    ...row,
    subject_name: row.subjects?.name,
    subject_slug: row.subjects?.slug,
    teacher_username: row.teacher?.username,
    teacher_email: row.teacher?.email,
    university_name: row.universities?.name,
  }));
}

export async function getAdminSubmissions(limit: number = 50, universityId?: string): Promise<AdminSubmissionWithDetails[]> {
  let subjectIds: string[] | null = null;

  if (universityId) {
    const { data: subjectRows, error: subjectError } = await supabase
      .from("subjects")
      .select("id")
      .eq("university_id", universityId);

    if (subjectError) throw subjectError;
    subjectIds = (subjectRows ?? []).map((row) => row.id);

    if (subjectIds.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from("submissions")
    .select(
      "*, student:profiles!submissions_student_id_fkey(username, email), teacher:profiles!submissions_teacher_id_fkey(username, email)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (subjectIds) {
    query = query.in("subject_id", subjectIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  return ((data ?? []) as Array<
    SubmissionRow & {
      student?: { username?: string; email?: string } | null;
      teacher?: { username?: string; email?: string } | null;
    }
  >).map((row) => ({
    ...row,
    student_username: row.student?.username,
    student_email: row.student?.email,
    teacher_username: row.teacher?.username,
    teacher_email: row.teacher?.email,
  }));
}

export async function getSubjectScheduleSlots(subjectId: string): Promise<MainExamScheduleSlotRow[]> {
  const { data, error } = await supabase
    .from("main_exam_schedule_slots")
    .select("*")
    .eq("subject_id", subjectId)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MainExamScheduleSlotRow[];
}

export async function getActiveMainSubjects(universityId?: string): Promise<SubjectRow[]> {
  let query = supabase
    .from("subjects")
    .select("*")
    .eq("exam_type", "main")
    .eq("exam_type_status", "active")
    .order("name", { ascending: true });

  if (universityId) {
    query = query.eq("university_id", universityId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as SubjectRow[];
}

export async function createSubjectScheduleSlot(data: {
  subject_id: string;
  university_id?: string | null;
  created_by: string;
  change_request_id?: string | null;
  slot_name: string;
  start_time: string;
  end_time: string;
  allowed_email_start?: string | null;
  allowed_email_end?: string | null;
  max_students?: number | null;
  is_active?: boolean;
}): Promise<MainExamScheduleSlotRow> {
  const { data: row, error } = await supabase
    .from("main_exam_schedule_slots")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as MainExamScheduleSlotRow;
}

export async function updateSubjectScheduleSlot(
  id: string,
  updates: Partial<
    Pick<
      MainExamScheduleSlotRow,
      | "slot_name"
      | "start_time"
      | "end_time"
      | "allowed_email_start"
      | "allowed_email_end"
      | "max_students"
      | "is_active"
    >
  >
): Promise<MainExamScheduleSlotRow> {
  const { data, error } = await supabase
    .from("main_exam_schedule_slots")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MainExamScheduleSlotRow;
}

export async function deleteSubjectScheduleSlot(id: string): Promise<void> {
  const { error } = await supabase
    .from("main_exam_schedule_slots")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

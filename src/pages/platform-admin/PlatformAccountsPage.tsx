import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  KeyRound,
  Loader2,
  PencilLine,
  Plus,
  Save,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  getDeveloperUniversityShells,
  getProvisionedAdminAccounts,
  getProvisionedPortalAccounts,
  getUniversityById,
  getUniversityStudentAccounts,
  provisionPortalAccount,
  provisionUniversityAdminAccount,
  updatePlatformAccount,
  updateUniversityStudentAccount,
  type DeveloperUniversityShell,
  type ProvisionablePortalRole,
  type ProvisionedAdminAccount,
  type ProvisionedPortalAccount,
  type UniversityStudentAccount,
  type UniversityWithMeta,
} from "@/services/adminPortalService";
import type { ManagedAccountStatus } from "@/lib/database.types";
import { useAuth } from "@/context/AuthContext";

type GeneratedCredentialsState = {
  email: string;
  password: string;
  username: string;
  role: "teacher" | "recruiter" | "admin";
};

type ManagedAccountEditState = {
  id: string;
  role: "teacher" | "recruiter" | "admin";
  username: string;
  university_id: string;
  department_label: string;
  company_name: string;
};

type StudentEditState = {
  id: string;
  username: string;
  roll_number: string;
  semester_label: string;
  department_label: string;
};

function getStatusBadgeClass(status: ManagedAccountStatus) {
  switch (status) {
    case "disabled":
      return "bg-red-50 text-red-700 border border-red-100";
    case "active":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    default:
      return "bg-amber-50 text-amber-700 border border-amber-100";
  }
}

export default function PlatformAccountsPage() {
  const { profile } = useAuth();
  const isDeveloper = profile?.role === "developer";
  const [universities, setUniversities] = useState<DeveloperUniversityShell[]>([]);
  const [currentUniversity, setCurrentUniversity] = useState<UniversityWithMeta | null>(null);
  const [accounts, setAccounts] = useState<ProvisionedPortalAccount[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<ProvisionedAdminAccount[]>([]);
  const [students, setStudents] = useState<UniversityStudentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingManagedAccount, setSavingManagedAccount] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentialsState | null>(null);
  const [editingManagedAccount, setEditingManagedAccount] = useState<ManagedAccountEditState | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentEditState | null>(null);
  const [staffForm, setStaffForm] = useState({
    email: "",
    username: "",
    company_name: "",
    role: "teacher" as ProvisionablePortalRole,
    department_label: "",
  });
  const [developerForm, setDeveloperForm] = useState({
    university_id: "",
    email: "",
    username: "",
  });

  const load = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      setErrorMessage("");

      if (isDeveloper) {
        const [universityRows, adminRows] = await Promise.all([
          getDeveloperUniversityShells(),
          getProvisionedAdminAccounts(),
        ]);

        setUniversities(universityRows);
        setAdminAccounts(adminRows);
        setStudents([]);
        setCurrentUniversity(null);
        setAccounts([]);
        if (universityRows[0]) {
          setDeveloperForm((prev) => ({
            ...prev,
            university_id: prev.university_id || universityRows[0].id,
          }));
        }
        return;
      }

      if (!profile.university_id) {
        setErrorMessage("This admin account is not linked to an organization yet.");
        setCurrentUniversity(null);
        setAccounts([]);
        setStudents([]);
        return;
      }

      const [university, accountRows, studentRows] = await Promise.all([
        getUniversityById(profile.university_id),
        getProvisionedPortalAccounts(profile.university_id),
        getUniversityStudentAccounts(profile.university_id),
      ]);

      setCurrentUniversity(university);
      setAccounts(accountRows);
      setStudents(studentRows);
      setUniversities([]);
      setAdminAccounts([]);
    } catch (error) {
      console.error("Failed to load account provisioning view:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load the account provisioning view right now."
      );
    } finally {
      setLoading(false);
    }
  }, [isDeveloper, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const isRecruiterRole = staffForm.role === "recruiter";

  const canCreateStaffAccount = useMemo(
    () =>
      Boolean(
        profile &&
          profile.university_id &&
          staffForm.email.trim() &&
          (!isRecruiterRole ? staffForm.department_label.trim() : staffForm.company_name.trim())
      ),
    [isRecruiterRole, profile, staffForm.company_name, staffForm.department_label, staffForm.email]
  );

  const canCreateAdminAccount = useMemo(
    () => Boolean(profile && developerForm.university_id && developerForm.email.trim()),
    [developerForm.email, developerForm.university_id, profile]
  );

  const handleCreateAccount = async () => {
    if (!profile) return;

    setSubmitting(true);
    setErrorMessage("");
    setGeneratedCredentials(null);

    try {
      if (isDeveloper) {
        const result = await provisionUniversityAdminAccount({
          university_id: developerForm.university_id,
          email: developerForm.email.trim().toLowerCase(),
          username: developerForm.username.trim() || null,
          created_by: profile.id,
        });

        setGeneratedCredentials({
          email: result.account.email,
          password: result.generatedPassword,
          username: result.account.username || result.account.email.split("@")[0] || "eduxam-user",
          role: "admin",
        });
        setDeveloperForm((prev) => ({
          ...prev,
          email: "",
          username: "",
        }));
      } else {
        if (!profile.university_id) {
          throw new Error("This admin account is not linked to an organization yet.");
        }

        const result = await provisionPortalAccount({
          university_id: profile.university_id,
          email: staffForm.email.trim().toLowerCase(),
          username: staffForm.username.trim() || null,
          company_name: isRecruiterRole ? staffForm.company_name.trim() || null : null,
          role: staffForm.role,
          department_label: isRecruiterRole ? null : staffForm.department_label.trim() || null,
          created_by: profile.id,
        });

        setGeneratedCredentials({
          email: result.account.email,
          password: result.generatedPassword,
          username: result.account.username || result.account.email.split("@")[0] || "eduxam-user",
          role: result.account.role,
        });
        setStaffForm((prev) => ({
          ...prev,
          email: "",
          username: "",
          company_name: "",
          department_label: "",
        }));
      }

      await load();
    } catch (error) {
      console.error("Failed to create provisioned account:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create the account right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startManagedAccountEdit = (account: ProvisionedAdminAccount | ProvisionedPortalAccount) => {
    setEditingManagedAccount({
      id: account.id,
      role: account.role,
      username: account.username || "",
      university_id: account.university_id || "",
      department_label: "department_label" in account ? account.department_label || "" : "",
      company_name: "company_name" in account ? account.company_name || "" : "",
    });
  };

  const handleSaveManagedAccount = async () => {
    if (!editingManagedAccount) return;

    setSavingManagedAccount(true);
    setErrorMessage("");

    try {
      await updatePlatformAccount({
        managed_account_id: editingManagedAccount.id,
        username: editingManagedAccount.username.trim() || null,
        university_id: isDeveloper ? editingManagedAccount.university_id || null : null,
        department_label:
          editingManagedAccount.role === "teacher"
            ? editingManagedAccount.department_label.trim() || null
            : null,
        company_name:
          editingManagedAccount.role === "recruiter"
            ? editingManagedAccount.company_name.trim() || null
            : null,
      });

      setEditingManagedAccount(null);
      await load();
    } catch (error) {
      console.error("Failed to update managed account:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save the account right now."
      );
    } finally {
      setSavingManagedAccount(false);
    }
  };

  const handleSetManagedAccountStatus = async (
    account: ProvisionedAdminAccount | ProvisionedPortalAccount,
    status: ManagedAccountStatus
  ) => {
    setSavingManagedAccount(true);
    setErrorMessage("");

    try {
      await updatePlatformAccount({
        managed_account_id: account.id,
        provisioning_status: status,
      });
      await load();
    } catch (error) {
      console.error("Failed to update account status:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update the account status right now."
      );
    } finally {
      setSavingManagedAccount(false);
    }
  };

  const startStudentEdit = (student: UniversityStudentAccount) => {
    setEditingStudent({
      id: student.id,
      username: student.username,
      roll_number: student.roll_number || "",
      semester_label: student.semester_label || "",
      department_label: student.department_label || "",
    });
  };

  const handleSaveStudent = async () => {
    if (!editingStudent) return;

    setSavingStudent(true);
    setErrorMessage("");

    try {
      await updateUniversityStudentAccount(editingStudent.id, {
        username: editingStudent.username.trim() || undefined,
        roll_number: editingStudent.roll_number.trim() || null,
        semester_label: editingStudent.semester_label.trim() || null,
        department_label: editingStudent.department_label.trim() || null,
      });

      setEditingStudent(null);
      await load();
    } catch (error) {
      console.error("Failed to update student account:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save the student right now."
      );
    } finally {
      setSavingStudent(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading account workspace...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#071952]">
          {isDeveloper ? "Organization Admin Access" : "Organization Accounts"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isDeveloper
            ? "Create and manage the organization admin logins you hand off to each partner."
            : "Add staff logins here, then manage the students who join through the official email domains assigned by the developer."}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#071952]">
              {isDeveloper ? "Provision Organization Admin Login" : "Provision New Staff Login"}
            </h2>
            <p className="text-sm text-gray-500">
              {isDeveloper
                ? "Create the real organization admin account here, then hand the credentials to the official contact."
                : "Create teacher and recruiter logins for your organization. Students join on their own after the developer assigns your official email domains."}
            </p>
          </div>
        </div>

        {isDeveloper ? (
          <div className="grid gap-4 md:grid-cols-3">
            <select
              value={developerForm.university_id}
              onChange={(event) => setDeveloperForm((prev) => ({ ...prev, university_id: event.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
            >
              <option value="">Select organization</option>
              {universities.map((university) => (
                <option key={university.id} value={university.id}>
                  {university.name}
                </option>
              ))}
            </select>

            <input
              value={developerForm.email}
              onChange={(event) => setDeveloperForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="official admin email"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
            />

            <input
              value={developerForm.username}
              onChange={(event) => setDeveloperForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="Username (optional)"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
            />
          </div>
        ) : (
          <>
            {currentUniversity && (
              <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                Managing staff and students for <span className="font-semibold">{currentUniversity.name}</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={staffForm.role}
                onChange={(event) =>
                  setStaffForm((prev) => ({
                    ...prev,
                    role: event.target.value as ProvisionablePortalRole,
                    company_name: event.target.value === "recruiter" ? prev.company_name : "",
                    department_label: event.target.value === "teacher" ? prev.department_label : "",
                  }))
                }
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              >
                <option value="teacher">Teacher</option>
                <option value="recruiter">Recruiter</option>
              </select>

              <input
                value={staffForm.email}
                onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder={isRecruiterRole ? "recruiter work email" : "teacher email"}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />

              <input
                value={staffForm.username}
                onChange={(event) => setStaffForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Username (optional)"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />

              {isRecruiterRole ? (
                <input
                  value={staffForm.company_name}
                  onChange={(event) => setStaffForm((prev) => ({ ...prev, company_name: event.target.value }))}
                  placeholder="Company name"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
              ) : (
                <input
                  value={staffForm.department_label}
                  onChange={(event) => setStaffForm((prev) => ({ ...prev, department_label: event.target.value }))}
                  placeholder="Department"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
              )}
            </div>
          </>
        )}

        {generatedCredentials && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <KeyRound className="w-4 h-4" />
              Credentials Generated
            </div>
            <p className="mt-1 text-sm text-emerald-700">
              Share these credentials securely. The password is shown only once right after account creation.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-white/80 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Role</p>
                <p className="mt-1 text-sm font-medium text-[#071952] capitalize">{generatedCredentials.role}</p>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Email</p>
                <p className="mt-1 text-sm font-medium text-[#071952] break-all">{generatedCredentials.email}</p>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Username</p>
                <p className="mt-1 text-sm font-medium text-[#071952]">{generatedCredentials.username}</p>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Password</p>
                <p className="mt-1 text-sm font-medium text-[#071952] break-all">{generatedCredentials.password}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleCreateAccount}
          disabled={isDeveloper ? !canCreateAdminAccount || submitting : !canCreateStaffAccount || submitting}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isDeveloper ? "Create Admin Login" : "Create Login"}
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#071952]">
              {isDeveloper ? "Organization Admin Accounts" : "Teacher & Recruiter Accounts"}
            </h2>
            <p className="text-sm text-gray-500">
              {isDeveloper
                ? "Developers can manage only organization admin access here, without opening private organization details."
                : "Organization admins can manage only their own teacher and recruiter accounts here."}
            </p>
          </div>
        </div>

        {isDeveloper ? (
          adminAccounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No organization admin accounts have been provisioned yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Organization</th>
                    <th className="py-3 pr-4 font-medium">Username</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Created</th>
                    <th className="py-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAccounts.map((account) => {
                    const university = universities.find((item) => item.id === account.university_id);
                    return (
                      <tr key={account.id} className="border-b border-gray-100 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-[#071952] break-all">{account.email}</p>
                        </td>
                        <td className="py-3 pr-4">{university?.name || "Organization not assigned"}</td>
                        <td className="py-3 pr-4">{account.username || "-"}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(account.provisioning_status)}`}>
                            {account.provisioning_status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{new Date(account.created_at).toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => startManagedAccountEdit(account)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#071952]"
                            >
                              <PencilLine className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleSetManagedAccountStatus(
                                  account,
                                  account.provisioning_status === "disabled" ? "active" : "disabled"
                                )
                              }
                              disabled={savingManagedAccount}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#071952] disabled:opacity-50"
                            >
                              {account.provisioning_status === "disabled" ? "Enable" : "Disable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
            No teacher or recruiter accounts have been provisioned yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Organization</th>
                  <th className="py-3 pr-4 font-medium">Username</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const organizationLabel =
                    account.role === "recruiter"
                      ? account.company_name || "Recruiter company not set"
                      : account.department_label || "Department not set";

                  return (
                    <tr key={account.id} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[#071952] break-all">{account.email}</p>
                      </td>
                      <td className="py-3 pr-4 capitalize">{account.role}</td>
                      <td className="py-3 pr-4">{organizationLabel}</td>
                      <td className="py-3 pr-4">{account.username || "-"}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(account.provisioning_status)}`}>
                          {account.provisioning_status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{new Date(account.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => startManagedAccountEdit(account)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#071952]"
                          >
                            <PencilLine className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleSetManagedAccountStatus(
                                account,
                                account.provisioning_status === "disabled" ? "active" : "disabled"
                              )
                            }
                            disabled={savingManagedAccount}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#071952] disabled:opacity-50"
                          >
                            {account.provisioning_status === "disabled" ? "Enable" : "Disable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editingManagedAccount && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#071952]">Edit Managed Account</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {editingManagedAccount.role === "admin"
                    ? "Developers can manage which organization this admin belongs to and whether the login is active."
                    : "Update the live staff account details for this organization."}
                </p>
              </div>
              <button
                onClick={() => setEditingManagedAccount(null)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {editingManagedAccount.role === "admin" && (
                <select
                  value={editingManagedAccount.university_id}
                  onChange={(event) =>
                    setEditingManagedAccount((prev) =>
                      prev ? { ...prev, university_id: event.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                >
                  <option value="">Select organization</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              )}

              <input
                value={editingManagedAccount.username}
                onChange={(event) =>
                  setEditingManagedAccount((prev) =>
                    prev ? { ...prev, username: event.target.value } : prev
                  )
                }
                placeholder="Username"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />

              {editingManagedAccount.role === "teacher" && (
                <input
                  value={editingManagedAccount.department_label}
                  onChange={(event) =>
                    setEditingManagedAccount((prev) =>
                      prev ? { ...prev, department_label: event.target.value } : prev
                    )
                  }
                  placeholder="Department"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
              )}

              {editingManagedAccount.role === "recruiter" && (
                <input
                  value={editingManagedAccount.company_name}
                  onChange={(event) =>
                    setEditingManagedAccount((prev) =>
                      prev ? { ...prev, company_name: event.target.value } : prev
                    )
                  }
                  placeholder="Company name"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleSaveManagedAccount}
                disabled={savingManagedAccount}
                className="inline-flex items-center gap-2 rounded-xl bg-[#071952] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingManagedAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
              <button
                onClick={() => setEditingManagedAccount(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#071952]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {!isDeveloper && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#071952]">Organization Students</h2>
              <p className="text-sm text-gray-500">
                Students appear here automatically after they sign up using one of the official organization email domains assigned by the developer.
              </p>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No students have been linked to this organization yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Username</th>
                    <th className="py-3 pr-4 font-medium">Roll Number</th>
                    <th className="py-3 pr-4 font-medium">Semester</th>
                    <th className="py-3 pr-4 font-medium">Department</th>
                    <th className="py-3 pr-4 font-medium">Joined</th>
                    <th className="py-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[#071952] break-all">{student.email}</p>
                      </td>
                      <td className="py-3 pr-4">{student.username}</td>
                      <td className="py-3 pr-4">{student.roll_number || "-"}</td>
                      <td className="py-3 pr-4">{student.semester_label || "-"}</td>
                      <td className="py-3 pr-4">{student.department_label || "-"}</td>
                      <td className="py-3 pr-4 text-gray-500">{new Date(student.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => startStudentEdit(student)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#071952]"
                        >
                          <PencilLine className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editingStudent && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-[#071952]">Edit Student Profile</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Organization admins can keep the student record aligned after domain-based signup.
                  </p>
                </div>
                <button
                  onClick={() => setEditingStudent(null)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={editingStudent.username}
                  onChange={(event) =>
                    setEditingStudent((prev) =>
                      prev ? { ...prev, username: event.target.value } : prev
                    )
                  }
                  placeholder="Username"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
                <input
                  value={editingStudent.roll_number}
                  onChange={(event) =>
                    setEditingStudent((prev) =>
                      prev ? { ...prev, roll_number: event.target.value } : prev
                    )
                  }
                  placeholder="Roll number"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
                <input
                  value={editingStudent.semester_label}
                  onChange={(event) =>
                    setEditingStudent((prev) =>
                      prev ? { ...prev, semester_label: event.target.value } : prev
                    )
                  }
                  placeholder="Semester"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
                <input
                  value={editingStudent.department_label}
                  onChange={(event) =>
                    setEditingStudent((prev) =>
                      prev ? { ...prev, department_label: event.target.value } : prev
                    )
                  }
                  placeholder="Department"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={handleSaveStudent}
                  disabled={savingStudent}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#071952] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Student
                </button>
                <button
                  onClick={() => setEditingStudent(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#071952]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {!isDeveloper && currentUniversity && (
        <section className="rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-50 to-sky-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-sky-100 flex items-center justify-center text-sky-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#071952]">Student Domain Flow</h2>
              <p className="text-sm text-gray-600 mt-1">
                The developer team assigns the official organization email domains. Once those domains are mapped, students who sign up with them are linked into <span className="font-semibold">{currentUniversity.name}</span> automatically and become manageable from this page.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Plus, ToggleLeft, ToggleRight, Trash2, Loader2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getRecruiterJobs, toggleJobActive, deleteJobPosting } from "@/services/jobService";
import type { JobPostingRow } from "@/lib/database.types";
import { toast } from "sonner";

export default function JobPostingsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPostingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await getRecruiterJobs(profile.id);
      setJobs(data);
    } catch {
      toast.error("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleToggle = async (job: JobPostingRow) => {
    try {
      await toggleJobActive(job.id, !job.is_active);
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, is_active: !j.is_active } : j))
      );
      toast.success(job.is_active ? "Job deactivated" : "Job activated");
    } catch {
      toast.error("Failed to toggle job status.");
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("Delete this job posting? This cannot be undone.")) return;
    try {
      await deleteJobPosting(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job deleted.");
    } catch {
      toast.error("Failed to delete job.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#071952]">My Job Postings</h1>
          <p className="text-sm text-gray-500 mt-1">{jobs.length} job{jobs.length !== 1 ? "s" : ""} posted</p>
        </div>
        <button
          onClick={() => navigate("/recruiter/jobs/new")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#071952] text-white font-medium text-sm rounded-xl hover:bg-[#071952]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post New Job
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#071952]" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No jobs posted yet.</p>
          <button
            onClick={() => navigate("/recruiter/jobs/new")}
            className="mt-4 text-sm text-[#071952] font-medium hover:underline"
          >
            Post your first job
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border-2 border-gray-100 p-5 hover:border-[#071952]/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-[#071952] truncate">{job.title}</h3>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        job.is_active
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {job.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{job.company_name}</span>
                    {job.location && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>
                      </>
                    )}
                    <span className="text-gray-300">·</span>
                    <span className="capitalize">{job.job_type}</span>
                  </p>
                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {job.required_skills.map((skill, si) => (
                        <span
                          key={si}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#071952]/5 text-[#071952]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => navigate(`/recruiter/jobs/${job.id}`)}
                    className="p-2 rounded-lg text-gray-400 hover:text-[#071952] hover:bg-[#071952]/5 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(job)}
                    className="p-2 rounded-lg text-gray-400 hover:text-[#071952] hover:bg-[#071952]/5 transition-colors"
                    title={job.is_active ? "Deactivate" : "Activate"}
                  >
                    {job.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

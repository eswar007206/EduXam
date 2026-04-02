import type { UserProfile } from '@/context/AuthContext';

export interface ProfileSection {
  key: string;
  label: string;
  weight: number;
  completed: boolean;
}

export function calculateProfileCompletion(profile: UserProfile): {
  percentage: number;
  sections: ProfileSection[];
} {
  const sections: ProfileSection[] = [
    {
      key: 'basic',
      label: 'Basic Information',
      weight: 15,
      completed: !!(
        profile.avatar_url &&
        profile.headline &&
        (profile.bio || profile.about_me) &&
        profile.phone &&
        (profile.location || profile.current_city) &&
        profile.date_of_birth &&
        profile.gender
      ),
    },
    {
      key: 'academic',
      label: 'Academic Info',
      weight: 15,
      completed: !!(
        profile.college_name &&
        profile.college_year &&
        profile.degree_pursuing &&
        profile.branch &&
        profile.cgpa != null &&
        profile.tenth_percentage != null &&
        profile.twelfth_percentage != null
      ),
    },
    {
      key: 'skills',
      label: 'Skills',
      weight: 15,
      completed: profile.skills.length >= 3,
    },
    {
      key: 'experience',
      label: 'Experience',
      weight: 10,
      completed: profile.experience.length >= 1,
    },
    {
      key: 'education',
      label: 'Education',
      weight: 10,
      completed: profile.education.length >= 1,
    },
    {
      key: 'certifications',
      label: 'Certifications',
      weight: 10,
      completed: profile.certifications.length >= 1,
    },
    {
      key: 'projects',
      label: 'Projects',
      weight: 10,
      completed: profile.projects.length >= 1,
    },
    {
      key: 'links',
      label: 'Social Links',
      weight: 10,
      completed: !!(
        profile.linkedin_url || profile.github_url || profile.portfolio_url
      ),
    },
    {
      key: 'interests',
      label: 'Interests & Languages',
      weight: 5,
      completed: profile.interests.length >= 1 || profile.languages.length >= 1,
    },
  ];

  const percentage = sections.reduce(
    (sum, s) => sum + (s.completed ? s.weight : 0),
    0
  );

  return { percentage, sections };
}

/**
 * Calculate completion from raw form values (for live preview in edit page).
 */
export function calculateFormCompletion(data: {
  avatar_url: string | null;
  headline: string;
  bio: string;
  about_me: string;
  phone: string;
  location: string;
  current_city: string;
  date_of_birth: string;
  gender: string;
  college_name: string;
  college_year: string;
  degree_pursuing: string;
  branch: string;
  cgpa: string;
  tenth_percentage: string;
  twelfth_percentage: string;
  skills: string[];
  experience: unknown[];
  education: unknown[];
  certifications: unknown[];
  projects: unknown[];
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  interests: string[];
  languages: string[];
}): { percentage: number; sections: ProfileSection[] } {
  const sections: ProfileSection[] = [
    {
      key: 'basic',
      label: 'Basic Information',
      weight: 15,
      completed: !!(
        data.avatar_url &&
        data.headline.trim() &&
        (data.bio.trim() || data.about_me.trim()) &&
        data.phone.trim() &&
        (data.location.trim() || data.current_city.trim()) &&
        data.date_of_birth &&
        data.gender
      ),
    },
    {
      key: 'academic',
      label: 'Academic Info',
      weight: 15,
      completed: !!(
        data.college_name.trim() &&
        data.college_year &&
        data.degree_pursuing.trim() &&
        data.branch.trim() &&
        data.cgpa &&
        data.tenth_percentage &&
        data.twelfth_percentage
      ),
    },
    {
      key: 'skills',
      label: 'Skills',
      weight: 15,
      completed: data.skills.length >= 3,
    },
    {
      key: 'experience',
      label: 'Experience',
      weight: 10,
      completed: data.experience.length >= 1,
    },
    {
      key: 'education',
      label: 'Education',
      weight: 10,
      completed: data.education.length >= 1,
    },
    {
      key: 'certifications',
      label: 'Certifications',
      weight: 10,
      completed: data.certifications.length >= 1,
    },
    {
      key: 'projects',
      label: 'Projects',
      weight: 10,
      completed: data.projects.length >= 1,
    },
    {
      key: 'links',
      label: 'Social Links',
      weight: 10,
      completed: !!(
        data.linkedin_url.trim() || data.github_url.trim() || data.portfolio_url.trim()
      ),
    },
    {
      key: 'interests',
      label: 'Interests & Languages',
      weight: 5,
      completed: data.interests.length >= 1 || data.languages.length >= 1,
    },
  ];

  const percentage = sections.reduce(
    (sum, s) => sum + (s.completed ? s.weight : 0),
    0
  );

  return { percentage, sections };
}

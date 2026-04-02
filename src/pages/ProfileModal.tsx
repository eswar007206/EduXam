import { useState, useEffect, useRef } from "react";
import { X, Mail, Linkedin, Instagram, Phone, BookOpen } from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  institution: string;
  description: string;
  email: string;
  phone: string;
  rollNo: string;
  image: string;
  instagram: string;
  linkedin: string;
  skills?: string[];
  modalImage?: string;
}

interface ProfileModalProps {
  member: TeamMember;
  onClose: () => void;
}

export const ProfileModal = ({ member, onClose }: ProfileModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    scrollPositionRef.current = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${scrollPositionRef.current}px`;

    const timer = window.setTimeout(() => setIsEntering(true), 10);

    return () => {
      window.clearTimeout(timer);
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-700 ease-out z-40 ${
          isClosing ? "opacity-0" : isEntering ? "opacity-60" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      />

      <div
        className={`fixed inset-0 flex items-center justify-center p-4 z-50 transition-all duration-700 ease-out ${
          isClosing ? "scale-95 opacity-0" : isEntering ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={handleBackdropClick}
      >
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/30 backdrop-blur-xl scrollbar-hide transition-all duration-700 ease-out"
          onClick={(event) => event.stopPropagation()}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          <div className="relative h-80 sm:h-96 md:h-[28rem] overflow-hidden rounded-t-3xl bg-slate-800">
            <img
              src={member.modalImage || member.image}
              alt={member.name}
              className={`w-full h-full object-cover ${member.name === "Rido Nanu" ? "object-center" : "object-top"}`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900" />
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm border border-slate-700/50"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-6 md:px-8 py-8 md:py-10 space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold text-white">{member.name}</h2>
              <div className="flex flex-col gap-2">
                <p className="text-lg md:text-xl font-semibold text-slate-300">{member.role}</p>
                <p className="text-sm md:text-base text-slate-400">{member.institution}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">About</h3>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">{member.description}</p>
            </div>

            {member.skills && member.skills.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {member.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 text-sm rounded-full transition-colors duration-300 border border-slate-600/30"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-slate-700/30">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Contact</h3>
              <div className="space-y-2">
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/10 hover:bg-slate-700/20 transition-colors duration-300 text-slate-300 hover:text-white group"
                >
                  <Mail className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                  <span className="text-sm md:text-base break-all">{member.email}</span>
                </a>

                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/10 hover:bg-slate-700/20 transition-colors duration-300 text-slate-300 hover:text-white group"
                >
                  <Phone className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                  <span className="text-sm md:text-base">{member.phone}</span>
                </a>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/10 text-slate-300">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <span className="text-sm md:text-base">Roll No: {member.rollNo}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-700/30">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Follow</h3>
              <div className="flex gap-3">
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg bg-slate-700/20 hover:bg-slate-700/40 text-slate-300 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 border border-slate-600/30 hover:border-slate-500/50"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>

                <a
                  href={member.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg bg-slate-700/20 hover:bg-slate-700/40 text-slate-300 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 border border-slate-600/30 hover:border-slate-500/50"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>

                <a
                  href={`mailto:${member.email}`}
                  className="p-3 rounded-lg bg-slate-700/20 hover:bg-slate-700/40 text-slate-300 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 border border-slate-600/30 hover-border-slate-500/50"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

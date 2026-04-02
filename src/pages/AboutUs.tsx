import { useState, useCallback, memo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import eswarImg from "@/assets/img1.jpg";
import eswarModalImg from "@/assets/img11.jpg";
import rudrikImg from "@/assets/img3.jpg";
import anasImg from "@/assets/img5.jpg";
import ramImg from "@/assets/img22.jpg";
import ridoImg from "@/assets/img50.jpeg";
import { ProfileModal } from "@/pages/ProfileModal";

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

const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Eswar N",
    role: "Lead Developer",
    institution: "Garden City University",
    description: "Hi, I'm Eswar, a B.Tech student at Garden City University, Bangalore, studying Robotic Engineering. I have a huge interest in coding and technology, always looking to learn and build new things. I enjoy working on projects related to AI, automation, and software development, and I'm passionate about solving real-world problems through tech.",
    email: "nalamalaeswar@gmail.com",
    phone: "6303392391",
    rollNo: "24BTRE111",
    image: eswarImg,
    modalImage: eswarModalImg,
    instagram: "https://www.instagram.com/eswar_sonu?igsh=MWNyM2UzeHc2b2J4ZQ==",
    linkedin: "https://www.linkedin.com/in/eswar-n-86b862311/",
    skills: ["React", "NDatabase Design", "Python", "AI/ML", "Backend Development"]
  },
  {
    id: 2,
    name: "Mohammed Anas Gaima",
    role: "Junior Developer",
    institution: "Garden City University",
    description: "Hi, I'm Mohammed Anas Gaima, a B.Tech student at Garden City University, Bangalore, specializing in Robotic Engineering. I have a deep passion for coding and technology, always eager to learn, explore, and build innovative solutions.",
    email: "mohammedanasgaima123@gmail.com",
    phone: "9663373275",
    rollNo: "24BTRE139",
    image: anasImg,
    instagram: "https://www.instagram.com/anas_gaima?igsh=MWE2MGkwemx3ZWw0Zg%3D%3D&utm_source=qr",
    linkedin: "https://www.linkedin.com/in/mohammed-anas-gaima-aa0ab9339?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app",
    skills: ["Python", "NLP", "Chatbot", "Backend"]
  },
  {
    id: 3,
    name: "Rudrik Hemanshu Joshi",
    role: "Marketing and Testing",
    institution: "Garden City University",
    description: "I am Rudrik Hemanshu Joshi, a B.Tech student navigating the cutting-edge landscape of Robotic Engineering. My canvas is code, my passion, the seamless fusion of technology and ingenuity. At Garden City University, Bangalore, I don't just study robotics. My mind thrives on the intricate dance of AI and the boundless potential of software development.",
    email: "rudrik28novjoshi@gmail.com",
    phone: "9663105086",
    rollNo: "24BTRE119",
    image: rudrikImg,
    instagram: "https://www.instagram.com/rudrikhemanshujoshi?igsh=MWJqazgyd2x4MnBzcQ==",
    linkedin: "https://www.linkedin.com/in/rudrik-hemanshu-joshi-0a592b261?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
    skills: ["Testing", "QA", "Logic Design", "Marketing", "Strategic Planning"]
  },
  {
    id: 4,
    name: "Gajendra Singh Patel",
    role: "Mathematical logics and Designer",
    institution: "Garden City University",
    description: "Hello! I'm Gajendra Singh Patel, a B.Tech student at Garden City University, Bangalore, specializing in Robotic Engineering. I'm passionate about crafting intuitive and visually appealing digital experiences that blend design and technology. With a strong interest in UI/UX design, front-end development, and human-centered innovation, I focus on building interfaces that are both functional and beautiful.",
    email: "gajendrasinghpatel002@gmail.com",
    phone: "7879272561",
    rollNo: "24BTRE118",
    image: ramImg,
    instagram: "https://www.instagram.com/ram.x.20?igsh=MWljeHJod3pwMmRpcw==",
    linkedin: "https://www.linkedin.com/in/ram-patel-097106334?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
    skills: ["UI/UX Design", "Figma", "Frontend", "React", "CSS"]
  },
  {
    id: 5,
    name: "Rido Nanu",
    role: "UI/UX Design & Frontend",
    institution: "Garden City University",
    description: "I am a B.Tech student at Garden City University, currently pursuing Robotics Engineering. I am passionate about full-stack web development and application development, with a growing interest in Artificial Intelligence and Machine Learning. I enjoy building modern, user-focused digital experiences and continuously learning new technologies to improve my development skills and solve real-world problems through code.",
    email: "ridonanu5105@gmail.com",
    phone: "6009934538",
    rollNo: "24BTRE141",
    image: ridoImg,
    instagram: "https://instagram.com",
    linkedin: "https://www.linkedin.com/in/rido-nanu-960617360?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
    skills: ["React", "JavaScript", "HTML & CSS", "Front-End Web Development", "Full-Stack Development"]
  },
];

const TeamCarousel = memo(function TeamCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasInitialized(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = useCallback(() => {
    if (isAnimating) return;
    setCurrentIndex((prev) => (prev + 1) % teamMembers.length);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  const handlePrev = useCallback(() => {
    if (isAnimating) return;
    setCurrentIndex((prev) => (prev - 1 + teamMembers.length) % teamMembers.length);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  // Keyboard arrow navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedMember) return; // don't navigate while modal is open
      if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev, selectedMember]);

  const handleCarouselItemClick = useCallback((index: number) => {
    if (isAnimating || index === currentIndex) return;
    setCurrentIndex(index);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, currentIndex]);

  const getItemPosition = (index: number) => {
    const distance = (index - currentIndex + teamMembers.length) % teamMembers.length;
    if (distance === 0) return "center";
    if (distance === 1 || distance === teamMembers.length - 1) return "side";
    return "back";
  };

  return (
    <div className="relative w-full min-h-screen bg-black font-sans flex flex-col overflow-hidden">
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -30px) scale(1.05); }
          50% { transform: translate(60px, 0) scale(1); }
          75% { transform: translate(30px, 30px) scale(1.05); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-40px, 40px) scale(0.95); }
          50% { transform: translate(-60px, 0) scale(1); }
          75% { transform: translate(-40px, -40px) scale(0.95); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; filter: blur(60px); }
          50% { opacity: 0.6; filter: blur(40px); }
        }
        @keyframes light-burst {
          0% { opacity: 0; transform: scale(0.8); filter: brightness(1.5) blur(20px); }
          50% { opacity: 1; filter: brightness(1.2) blur(10px); }
          100% { opacity: 0; transform: scale(1.3); filter: brightness(1) blur(0px); }
        }
        @keyframes glow-in {
          0% { box-shadow: 0 0 0 0 rgba(30, 58, 138, 0.8), 0 0 0 0 rgba(30, 58, 138, 0.6); }
          50% { box-shadow: 0 0 40px 20px rgba(30, 58, 138, 0.4), 0 0 60px 30px rgba(30, 58, 138, 0.2); }
          100% { box-shadow: 0 0 0 0 rgba(30, 58, 138, 0), 0 0 0 0 rgba(30, 58, 138, 0); }
        }
        .animate-light-burst { animation: light-burst 0.6s ease-out; }
        .animate-glow-in { animation: glow-in 0.8s ease-out; }
        @keyframes text-blink {
          0%, 100% { color: rgba(30, 58, 138, 1); text-shadow: 0 0 10px rgba(30, 58, 138, 0.6), 0 0 20px rgba(30, 58, 138, 0.4), 0 0 40px rgba(30, 58, 138, 0.2); }
          50% { color: rgba(30, 58, 138, 0.3); text-shadow: none; }
        }
        .animate-text-blink { animation: text-blink 2s ease-in-out infinite; }
      `}</style>

      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 rounded-full opacity-30 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(30, 58, 138, 0.4) 0%, transparent 70%)",
            top: "-100px", right: "-100px",
            animation: "float-slow 8s ease-in-out infinite"
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full opacity-25 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(30, 58, 138, 0.3) 0%, transparent 70%)",
            bottom: "-80px", left: "-120px",
            animation: "float-medium 10s ease-in-out infinite"
          }}
        />
        <div
          className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(30, 58, 138, 0.2) 0%, transparent 70%)",
            top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            animation: "glow-pulse 4s ease-in-out infinite"
          }}
        />
      </div>

      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 pt-6 px-6 md:px-10"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-900 text-white font-semibold text-sm rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#1e3a8a]/30 hover:-translate-y-0.5 active:translate-y-0 border border-white/10 hover:border-black/50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </motion.div>

      {/* Header Section */}
      <div className="relative z-10 pt-6 md:pt-8 px-4 md:px-8 flex-shrink-0">
        <div className="max-w-6xl mx-auto text-center mb-2">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 drop-shadow-lg"
          >
            Meet Our Team
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-black max-w-2xl mx-auto px-4 py-2 rounded-full bg-white backdrop-blur-sm animate-text-blink"
          >
            Passionate innovators building the future of education technology
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="h-1 w-24 bg-black mx-auto mt-4 rounded-full"
          />
        </div>
      </div>

      {/* Main Carousel Container */}
      <div className="relative w-full flex flex-col items-center justify-center px-4 py-8 md:py-10 flex-shrink-0 flex-1">

        {/* Left Navigation */}
        <button
          onClick={handlePrev}
          disabled={isAnimating}
          className="absolute left-4 md:left-8 z-30 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 backdrop-blur-sm border border-black/30 group"
          aria-label="Previous member"
        >
          <ChevronLeft className="w-6 h-6 group-hover:translate-x-[-2px] transition-transform" />
        </button>

        {/* Circular Carousel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex items-center justify-center"
        >
          <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
            {teamMembers.map((member, index) => {
              const position = getItemPosition(index);
              let transform = "";
              let opacity = 0;
              let scale = 0.6;
              let zIndex = 0;
              let pointerEvents = "pointer-events-none";

              if (position === "center") {
                transform = "translate(0, 0)";
                opacity = 1;
                scale = 1.2;
                zIndex = 20;
                pointerEvents = "cursor-pointer";
              } else if (position === "side") {
                const isRight = (index - currentIndex + teamMembers.length) % teamMembers.length === 1;
                transform = isRight ? "translate(280px, 0)" : "translate(-280px, 0)";
                opacity = 0.5;
                scale = 0.85;
                zIndex = 10;
                pointerEvents = "cursor-pointer";
              } else {
                transform = "translate(0, 0)";
                opacity = 0.3;
                scale = 0.7;
                zIndex = 5;
              }

              return (
                <div
                  key={member.id}
                  onClick={() => {
                    if (position === "center") setSelectedMember(member);
                    else handleCarouselItemClick(index);
                  }}
                  className={`absolute transition-all duration-500 ease-out ${pointerEvents}`}
                  style={{ transform: `${transform} scale(${scale})`, opacity, zIndex }}
                >
                  {/* Profile Card */}
                  <div className={`relative w-60 h-72 md:w-72 md:h-80 rounded-3xl overflow-hidden group ${position === "center" && hasInitialized && isAnimating ? "animate-glow-in" : ""}`}>
                    {position === "center" && hasInitialized && isAnimating && (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a]/40 via-[#1e3a8a]/20 to-transparent rounded-3xl animate-light-burst" />
                    )}

                    {/* Image */}
                    <div className="absolute inset-0">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-70" />
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
                      <div />
                      <div>
                        <h3 className="text-lg md:text-2xl font-bold text-white mb-1 drop-shadow-lg">
                          {member.name}
                        </h3>
                        <p className="text-xs md:text-sm text-white font-medium drop-shadow-lg">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    {/* Center Focus Indicator */}
                    {position === "center" && (
                      <div className="absolute inset-0 border-2 border-black/40 rounded-3xl animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Right Navigation */}
        <button
          onClick={handleNext}
          disabled={isAnimating}
          className="absolute right-4 md:right-8 z-30 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 backdrop-blur-sm border border-black/30 group"
          aria-label="Next member"
        >
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative z-30 flex justify-center pt-6 md:pt-8"
        >
          <div className="flex gap-2 items-center">
            {teamMembers.map((_, index) => (
              <button
                key={index}
                onClick={() => handleCarouselItemClick(index)}
                className={`transition-all duration-500 ${
                  index === currentIndex
                    ? "w-6 h-1.5 bg-black rounded-full"
                    : "w-1.5 h-1.5 bg-black/30 hover:bg-black/60 rounded-full"
                }`}
                aria-label={`Go to member ${index + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="relative z-10 py-8 md:py-10 px-4 md:px-8 border-t border-black/20 backdrop-blur-sm flex-shrink-0 w-full"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">
            <div className="text-center md:text-left">
              <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-sm text-black mb-1 tracking-wide font-extrabold"><img src="/eduxam-logo.png" alt="EduXam" className="w-5 h-5 rounded object-contain" />EduXam</p>
              <p className="text-base text-white/70 font-medium">Building the future of education management</p>
            </div>

            <div className="flex gap-12 md:gap-16">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">5</p>
                <p className="text-sm text-white/60 mt-1">Core Team</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="text-center">
                <p className="text-3xl font-bold text-white">&#8734;</p>
                <p className="text-sm text-white/60 mt-1">Innovation</p>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-black mb-1 uppercase tracking-wide font-extrabold">Garden City University</p>
              <p className="text-base text-white/70 font-medium">Robotic Engineering</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20 flex items-center justify-center gap-3 text-sm text-white/50">
            <span>Click on center profile to view details</span>
            <span className="inline-block animate-pulse text-white">&bull;</span>
            <span>Use arrows or keyboard to navigate</span>
          </div>
        </div>
      </motion.div>

      {/* Profile Modal */}
      {selectedMember && (
        <ProfileModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
});

export default TeamCarousel;

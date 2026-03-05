import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, CheckCircle2, Sparkles, Bold, Italic, Underline, Image, Sigma, Calculator, Microscope, Briefcase, Code2, Globe, Brain, FileText, Zap, Lightbulb, Target, ClipboardList, HelpCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import HeroBg from "@/assets/vecteezy_abstract-boxes-background-modern-technology-with-square_8171873.jpg";

export default function HomePage() {
  const { isAuthenticated, profile } = useAuth();
  const isTeacher = isAuthenticated && profile?.role === "teacher";
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate stroke offset for 60s timer (r=70 -> circ≈440)
  const circumference = 440;
  const strokeDashoffset = circumference - (timeLeft / 60) * circumference;

  return (
    <div className="h-screen w-full bg-background text-foreground selection:bg-primary/20 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
      {/* Global Background Image */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={HeroBg}
          alt="Background"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      <div className="relative z-50">
        <Navbar />

        {/* Hero Section */}
        <section className="relative min-h-[75vh] flex items-center pt-20 pb-20 lg:pt-0 lg:pb-32 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              {/* Left Content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-left"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-primary/20 text-primary text-sm font-semibold mb-8 shadow-md shadow-primary/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  {isTeacher ? "Teacher Portal" : "New: AI-Powered Analysis"}
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-foreground leading-[1.1]">
                  {isTeacher ? (
                    <>Manage Your <br /><span className="text-primary">Exams</span></>
                  ) : (
                    <>Master Your <br /><span className="text-primary">Exams</span></>
                  )}
                </h1>

                <p className="text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
                  {isTeacher
                    ? "Create subjects, add questions across multiple categories, review student submissions, and evaluate their performance — all from one dashboard."
                    : "Experience a realistic exam environment. Practice with curated questions, timed sessions, and comprehensive tools to boost your confidence."}
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link
                    to={isTeacher ? "/admin/dashboard" : isAuthenticated ? "/exam-practice" : "/login"}
                    className="group relative px-8 py-4 bg-[#1e3a8a] text-white rounded-2xl font-bold text-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#1e3a8a]/50 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100 border border-[#1e3a8a] hover:border-black hover:shadow-[0_0_25px_rgba(0,0,0,0.3)] flex items-center gap-3"
                  >
                    {isTeacher ? "Go to Teacher Portal" : isAuthenticated ? "Start Practicing" : "Login to Start"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>


              </motion.div>

              {/* Right Visual - User Provided Floating Cards */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:block h-[680px] w-full"
              >
                {/* Visual Content Container */}
                <div className="relative w-full h-full">

                  {/* Card 1: AI Quiz Generator (Back/Top-Right) */}
                  <div className="absolute top-20 right-14 z-10 -rotate-6 origin-top-right pointer-events-none scale-95">
                    <div className="animate-bob-1">
                      <div className="w-[22rem] bg-card p-6 rounded-3xl shadow-2xl border border-border/50 animate-glow pointer-events-auto">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                              <Brain size={24} />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-foreground tracking-tight">AI Quiz Generator</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="relative flex h-2.5 w-2.5 bg-emerald-100 rounded-full items-center justify-center">
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm text-muted-foreground font-medium">Active Now</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground mb-6">
                          <div className="flex items-center gap-1.5">
                            <FileText size={14} />
                            <span>Uploaded PDF</span>
                          </div>
                          <div className="w-px h-3 bg-border"></div>
                          <div className="flex items-center gap-1.5">
                            <Lightbulb size={14} />
                            <span>Adaptive</span>
                          </div>
                          <div className="w-px h-3 bg-border"></div>
                          <div className="flex items-center gap-1.5">
                            <Zap size={14} />
                            <span>Auto</span>
                          </div>
                        </div>

                        <div className="space-y-3 mb-8">
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="text-muted-foreground">Generating from notes...</span>
                            <span className="text-primary">72%</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent w-[72%] rounded-full relative" />
                          </div>
                        </div>

                        <div className="space-y-4 mb-8">
                          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                            <CheckCircle2 size={18} className="text-muted-foreground/50" />
                            <span>Analyzing Notes</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                            <CheckCircle2 size={18} className="text-muted-foreground/50" />
                            <span>Extracting Topics</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
                            <span className="relative flex h-2.5 w-2.5 rounded-full bg-primary ml-1 mr-1"></span>
                            <span>Generating Questions</span>
                          </div>
                        </div>

                        <div className="pt-5 border-t border-border flex justify-between items-center text-xs font-semibold text-muted-foreground">
                          <span>12 questions generated</span>
                          <div className="w-1 h-1 rounded-full bg-muted-foreground/50"></div>
                          <span>3 modules detected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Performance (Front/Bottom-Left) */}
                  <div className="absolute bottom-12 left-0 z-20 scale-95 origin-bottom-left pointer-events-none">
                    <div className="animate-bob-2">
                      <div className="w-[22rem] bg-card p-6 rounded-3xl shadow-2xl border border-border/50 animate-glow pointer-events-auto">
                        <div className="flex items-start gap-4 mb-8">
                          <div className="w-12 h-12 rounded-2xl bg-card border-2 border-border flex items-center justify-center text-foreground shadow-sm">
                            <Target size={24} strokeWidth={1.5} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground tracking-tight">Performance</h3>
                            <p className="text-sm text-muted-foreground font-medium">This Week</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-end mb-8 relative z-10">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Accuracy</p>
                            <p className="text-2xl font-bold text-foreground">84%</p>
                          </div>
                          <div className="h-8 w-px bg-border"></div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Improvement</p>
                            <p className="text-2xl font-bold text-primary">+12%</p>
                          </div>
                          <div className="h-8 w-px bg-border"></div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Time Spent</p>
                            <p className="text-2xl font-bold text-foreground">5h 40m</p>
                          </div>
                        </div>

                        <div className="relative h-24 flex items-end justify-between px-4 mb-6">
                          {/* Chart representation */}
                          {/* Mon */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-8 bg-secondary opacity-40 rounded-t-lg"></div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Mon</span>
                          </div>
                          {/* Tue */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-12 bg-secondary opacity-80 rounded-t-lg"></div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Tue</span>
                          </div>
                          {/* Wed */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-6 bg-secondary opacity-40 rounded-t-lg"></div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Wed</span>
                          </div>
                          {/* Thu */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 bg-secondary opacity-70 rounded-t-lg"></div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Thu</span>
                          </div>
                          {/* Fri */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-16 bg-secondary rounded-t-lg shadow-lg shadow-secondary/20"></div>
                            <span className="text-[10px] uppercase font-bold text-foreground">Fri</span>
                          </div>
                        </div>

                        <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-center gap-3">
                          <Sparkles size={16} className="text-primary" />
                          <p className="text-sm text-muted-foreground font-medium">
                            <span className="font-bold text-foreground">AI Insight:</span> Strong in Algebra
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div >
          </div >
        </section >

        <main className="container mx-auto px-4 pt-12 pb-24 relative z-10">
          {/* Features Bento Grid */}
          <div className="mb-24">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                <Sparkles size={14} />
                <span>Powerful Features</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground tracking-tight">
                {isTeacher ? "How EduXam Works for Teachers" : "Why Choose EduXam?"}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-xl">
                {isTeacher
                  ? "Everything you need to create exams, manage your question bank, and evaluate student performance."
                  : "Everything you need to simulate the real exam experience and boost your performance."}
              </p>
            </div>

            {isTeacher ? (
              /* ─── Teacher Features Grid ─── */
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {[
                  {
                    icon: BookOpen,
                    title: "Create Subjects",
                    description: "Organize your question bank by creating subjects under your department. Each subject gets its own dedicated space.",
                    color: "from-blue-500/5 to-indigo-500/5",
                    borderColor: "border-blue-500/10 hover:border-blue-500/20",
                    iconBg: "bg-blue-100 text-blue-600",
                  },
                  {
                    icon: HelpCircle,
                    title: "Add Questions",
                    description: "Add MCQ, short answer, medium, and long answer questions. Set marks per question and correct answers for MCQs.",
                    color: "from-emerald-500/5 to-teal-500/5",
                    borderColor: "border-emerald-500/10 hover:border-emerald-500/20",
                    iconBg: "bg-emerald-100 text-emerald-600",
                  },
                  {
                    icon: ClipboardList,
                    title: "Review Submissions",
                    description: "Students send their exams for your review. See their answers in a clean, read-only interface with all sections.",
                    color: "from-amber-500/5 to-orange-500/5",
                    borderColor: "border-amber-500/10 hover:border-amber-500/20",
                    iconBg: "bg-amber-100 text-amber-600",
                  },
                  {
                    icon: Target,
                    title: "Evaluate & Grade",
                    description: "Assign marks question by question, add overall feedback, and submit evaluations. Students see results instantly.",
                    color: "from-blue-500/5 to-blue-500/5",
                    borderColor: "border-blue-500/10 hover:border-blue-500/20",
                    iconBg: "bg-blue-100 text-blue-600",
                  },
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
                    className={`p-8 rounded-[2rem] bg-gradient-to-br ${feature.color} border ${feature.borderColor} transition-all group relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -mr-16 -mt-16" />
                    <div className="relative z-10">
                      <div className={`w-12 h-12 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-5`}>
                        <feature.icon size={22} />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* ─── Student Features Bento Grid (original) ─── */
              <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {/* Large Card: Library - Animated Subject Shelf */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
                className="md:col-span-2 p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-primary/5 border border-primary/10 hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col md:flex-row gap-10 items-center"
              >
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />

                <div className="flex-1 relative z-10 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold mb-4">
                    <BookOpen size={12} />
                    <span>Always Updated</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-foreground">Diverse Subject Library</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    A comprehensive question bank covering every major stream. From complex engineering problems to medical case studies.
                  </p>
                  <div className="flex items-center gap-4 text-sm font-semibold text-primary/80">
                    <div className="flex -space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs">A</div>
                      <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs">B</div>
                      <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs">C</div>
                    </div>
                    <span>1,000+ Questions Added</span>
                  </div>
                </div>

                {/* Visual: Subject Grid */}
                <div className="relative z-10 w-full md:w-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Calculator, label: 'Engineering', color: 'bg-blue-100 text-blue-600' },
                      { icon: Microscope, label: 'Medical', color: 'bg-emerald-100 text-emerald-600' },
                      { icon: Briefcase, label: 'Commerce', color: 'bg-amber-100 text-amber-600' },
                      { icon: Globe, label: 'Arts', color: 'bg-rose-100 text-rose-600' },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm flex flex-col items-center gap-2 w-32 group-hover:scale-105 transition-transform duration-300">
                        <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                          <item.icon size={20} />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Tall Card: Timer - Intense Focus */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
                className="p-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-all group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_70%)]" />

                <div className="relative z-10 flex flex-col items-center justify-center py-8">
                  {/* Circular Progress */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="none" className="text-emerald-100" />
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="text-emerald-500 shadow-emerald-500/50 drop-shadow-md transition-all duration-1000 ease-linear" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-mono font-bold text-foreground">
                        00:{timeLeft.toString().padStart(2, '0')}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Left</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 text-center">
                  <h3 className="text-2xl font-bold mb-2 text-foreground">Real Pressure</h3>
                  <p className="text-muted-foreground">
                    Timed sessions with auto-save to build exam stamina.
                  </p>
                </div>
              </motion.div>

              {/* Wide Card: Editor - Pro Interface */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
                className="md:col-span-3 p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-500/5 via-blue-500/5 to-blue-500/5 border border-blue-500/10 hover:border-blue-500/20 transition-all group relative overflow-hidden"
              >
                <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                  <div className="text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold mb-4">
                      <Sparkles size={12} />
                      <span>Advanced Tools</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-foreground">Professional Editor</h3>
                    <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                      Don't just type. format, calculate, and illustrate. Our editor supports full scientific notation and rich text formatting found in real competitive exams.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {['Formula Support', 'Image Upload', 'Table Formatting'].map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 border border-blue-100 text-sm font-semibold text-blue-900 shadow-sm">
                          <CheckCircle2 size={16} className="text-blue-600" />
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Editor Mockup */}
                  <div className="relative group-hover:-translate-y-2 transition-transform duration-500">
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-2xl shadow-blue-500/10 overflow-hidden">
                      {/* Header */}
                      <div className="h-10 border-b border-slate-100 bg-slate-50/50 flex items-center px-4 justify-between">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-slate-300" />
                          <div className="w-3 h-3 rounded-full bg-slate-300" />
                        </div>
                        <div className="text-[10px] font-medium text-slate-400">Exam_Answer_Sheet.tex</div>
                        <div />
                      </div>
                      {/* Toolbar */}
                      <div className="h-10 border-b border-slate-100 bg-white flex items-center px-4 gap-4">
                        <div className="flex gap-2 text-slate-500">
                          <Bold size={14} /> <Italic size={14} /> <Underline size={14} />
                        </div>
                        <div className="h-3 w-px bg-slate-200" />
                        <div className="flex gap-2 text-blue-600">
                          <Sigma size={14} /> <Image size={14} /> <Code2 size={14} />
                        </div>
                      </div>
                      {/* Body */}
                      <div className="p-6 h-48 bg-slate-50/30">
                        <div className="font-serif text-slate-600 leading-relaxed">
                          The quadratic formula is a fundamental equation in algebra:
                        </div>
                        <div className="mt-4 p-4 rounded-xl bg-[#1e3a8a] text-white font-mono text-sm shadow-lg shadow-[#1e3a8a]/20 text-center animate-pulse">
                          {'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'}
                        </div>
                        <div className="mt-4 font-serif text-slate-400 text-sm">
                          Type to continue explanation... <span className="inline-block w-0.5 h-4 bg-[#1e3a8a] animate-blink align-middle" />
                        </div>
                      </div>
                    </div>

                    {/* Floating Elements */}
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#1e3a8a] rounded-2xl shadow-xl flex items-center justify-center text-white rotate-12 group-hover:rotate-6 transition-transform">
                      <Sigma size={40} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            )}
          </div>
        </main>

        {/* Final CTA Section */}
        <div className="mb-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative p-8 md:p-12 text-center"
          >
            {/* Animated Background Glows */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-b from-blue-200/30 to-transparent rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none opacity-40" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-t from-indigo-200/30 to-transparent rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none opacity-40" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100/50 text-xs font-bold text-blue-600 mb-6 shadow-sm"
              >
                <Sparkles size={14} className="text-blue-500 fill-blue-500/20" />
                <span>Early Access Available</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-3xl md:text-5xl font-black mb-6 tracking-tight leading-tight text-slate-900"
              >
                {isTeacher ? (
                  <>Ready to manage your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">classroom?</span></>
                ) : (
                  <>Ready to test your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">full potential?</span></>
                )}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-lg text-slate-500 mb-8 leading-relaxed font-medium"
              >
                {isTeacher
                  ? "Head to your Teacher Portal to create subjects, add questions, and review student submissions."
                  : "Start practicing with AI-powered tools designed to help you prepare effectively for your exams."}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex items-center justify-center"
              >
                <Link
                  to={isTeacher ? "/admin/dashboard" : isAuthenticated ? "/exam-practice" : "/login"}
                  className="px-10 py-4 bg-[#1e3a8a] text-white rounded-xl font-bold text-base hover:shadow-lg hover:shadow-[#1e3a8a]/50 hover:scale-105 hover:-translate-y-1 active:scale-100 active:translate-y-0 transition-all duration-300 border border-[#1e3a8a] hover:border-black hover:shadow-[0_0_25px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2 group"
                >
                  {isTeacher ? "Go to Teacher Portal" : isAuthenticated ? "Start Practicing" : "Start for Free"}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-secondary/30 backdrop-blur-sm relative z-10">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>&copy; {new Date().getFullYear()} EduXam. All rights reserved.</span>
              <span className="hidden sm:inline">·</span>
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Users size={14} />
                Meet the Team
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

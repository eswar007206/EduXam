import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "@/shared/ui/alert-dialog";
import { BookOpen, Clock, Award, Zap } from "lucide-react";

interface StartExamModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStart: () => void;
    onCancel: () => void;
    totalMarks: number;
}

export function StartExamModal({
    open,
    onOpenChange,
    onStart,
    onCancel,
    totalMarks,
}: StartExamModalProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-lg" onOverlayClick={onCancel}>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl flex items-center gap-2">
                        <BookOpen className="text-[#1e3a8a]" />
                        Ready to Start Your Exam?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#1e3a8a]/10 border border-[#1e3a8a]/20">
                                <Clock className="text-[#1e3a8a]" size={24} />
                                <div>
                                    <p className="font-medium text-foreground">Duration: 90 minutes</p>
                                    <p className="text-sm text-muted-foreground">Auto-save every minute</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-[#1e3a8a] text-center">
                                    <p className="text-3xl font-bold text-white">12</p>
                                    <p className="text-xs text-white/70 mt-1">MCQs (1 mark each)</p>
                                </div>
                                <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-[#1e3a8a] text-center">
                                    <p className="text-3xl font-bold text-white">2</p>
                                    <p className="text-xs text-white/70 mt-1">Short (3 marks each)</p>
                                </div>
                                <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-[#1e3a8a] text-center">
                                    <p className="text-3xl font-bold text-white">3</p>
                                    <p className="text-xs text-white/70 mt-1">Medium (4 marks each)</p>
                                </div>
                                <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-[#1e3a8a] text-center">
                                    <p className="text-3xl font-bold text-white">4</p>
                                    <p className="text-xs text-white/70 mt-1">Long (5 marks each)</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-[#1e3a8a]/10 border-2 border-[#1e3a8a]">
                                <p className="font-medium text-foreground flex items-center gap-2">
                                    <Award className="text-[#1e3a8a]" size={20} />
                                    <span className="text-[#1e3a8a] font-semibold">Total Marks: {totalMarks}</span>
                                </p>
                            </div>

                            <div className="text-sm space-y-2 text-muted-foreground bg-[#1e3a8a]/5 p-4 rounded-lg">
                                <p className="font-semibold text-foreground flex items-center gap-2">
                                    <span className="text-lg">💡</span> Tips:
                                </p>
                                <ul className="space-y-1.5 pl-6">
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#1e3a8a] mt-0.5">•</span>
                                        <span>Start with MCQs to warm up</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#1e3a8a] mt-0.5">•</span>
                                        <span>Mark difficult questions for review</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#1e3a8a] mt-0.5">•</span>
                                        <span>Your progress is auto-saved</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-2">
                    <AlertDialogCancel
                        onClick={onCancel}
                        className="bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white hover:scale-105 hover:shadow-lg transition-all duration-300 ease-out font-medium"
                    >
                        Choose Different Subject
                    </AlertDialogCancel>
                    <button
                        onClick={onStart}
                        className="bg-[#1e3a8a] px-4 py-2 rounded-md hover:bg-[#1e3a8a]/90 text-white hover:scale-105 hover:shadow-xl hover:shadow-[#1e3a8a]/50 transition-all duration-300 ease-out group font-medium inline-flex items-center justify-center"
                    >
                        <Zap size={18} className="mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                        Start Exam
                    </button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

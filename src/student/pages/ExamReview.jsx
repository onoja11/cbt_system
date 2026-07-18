import React, { useMemo } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Award, BarChart3, HelpCircle, FileText } from 'lucide-react';
import SafeMathText from '../../shared/SafeMathText'; 

export default function ExamReview({ student, assessment, questions, answers, timeSpentSeconds, onExit }) {
  
  // 🛰️ MASTER METRIC COMPILATION PIPELINE
  const stats = useMemo(() => {
    let correctCount = 0;
    let totalPointsAwarded = 0;
    let totalPointsPossible = 0;

    const reviewList = questions.map((q) => {
      const studentAnswer = answers[q.id];
      const points = parseFloat(q.points_weight || q.pointsWeight || 2);
      totalPointsPossible += points;

      let isCorrect = false;
      const cleanType = String(q.type || '').trim().toLowerCase();

      if (cleanType === 'theory') {
        isCorrect = null; 
      } else {
        const correctIndex = q.options?.findIndex(opt => opt.isCorrect || opt.is_correct);
        isCorrect = studentAnswer === correctIndex;
      }

      if (isCorrect === true) {
        correctCount += 1;
        totalPointsAwarded += points;
      }

      return {
        ...q,
        studentAnswer,
        isCorrect,
        cleanType
      };
    });

    const percent = totalPointsPossible > 0 ? Math.round((totalPointsAwarded / totalPointsPossible) * 100) : 0;

    return {
      reviewList,
      correctCount,
      totalPointsAwarded,
      totalPointsPossible,
      percentage: percent,
    };
  }, [questions, answers]);

  // 🎯 TIME spent Formatter Guard
  const formatSpentTime = (seconds) => {
    if (!seconds || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 🎯 MATCHES LARAVEL DB SCHEMA BOUNDS DYNAMICALLY 
  const allowedMinutes = useMemo(() => {
    if (!assessment) return "30";
    return assessment.duration_minutes || assessment.duration || "30";
  }, [assessment]);

  return (
    <div className="min-h-screen bg-[#FAF9FA] text-[#2A1A63] font-sans flex flex-col justify-between w-full overflow-x-hidden select-text">
      
      {/* 🏛️ HEADER CONTROLS VAULT */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-5 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-4xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <button 
              onClick={onExit} 
              className="p-1.5 border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] mr-1 cursor-pointer transition-all active:scale-[0.97]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">Review Workspace</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] font-mono uppercase tracking-wider mt-0.5">
                {assessment?.subject || "Subject Course Paper"} • Performance Breakdown
              </p>
            </div>
          </div>
          <button 
            onClick={onExit} 
            className="px-4 py-2 bg-[#2A1A63] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all font-mono cursor-pointer"
          >
            Exit Workspace
          </button>
        </div>
      </header>

      {/* 📈 PERFORMANCE DASHBOARD JUMBOTRON */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        <div className="bg-white border border-[#9A87A9]/30 rounded-2xl p-6 md:p-8 shadow-xs text-left space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#FAF9FA]">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-950">Student Scoring Profile</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* SCORE CARD BLOCK */}
            <div className="bg-[#FAF9FA] border border-[#9A87A9]/20 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider block">Aggregate Score</span>
              <span className={`text-3xl font-black block ${stats.percentage >= 50 ? 'text-emerald-600' : 'text-[#C62927]'}`}>
                {stats.percentage}%
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 block">
                {stats.totalPointsAwarded} / {stats.totalPointsPossible} Marks
              </span>
            </div>

            {/* ACCURACY BLOCK */}
            <div className="bg-[#FAF9FA] border border-[#9A87A9]/20 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider block font-sans">Objective Accuracy</span>
              <span className="text-3xl font-black text-slate-950 block">
                {stats.correctCount} / {questions.filter(q => String(q.type || '').trim().toLowerCase() !== 'theory').length}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 block">Correct Choices</span>
            </div>

            {/* TIMER METRIC BLOCK */}
            <div className="bg-[#FAF9FA] border border-[#9A87A9]/20 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider block">Duration Logged</span>
              <span className="text-3xl font-black text-[#2A1A63] block">
                {formatSpentTime(timeSpentSeconds)}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 block">
                {/* 🎯 CORRRECTED PARAMETER PIPELINE EXTENSION */}
                Of {allowedMinutes} Minutes Allowed
              </span>
            </div>

          </div>
        </div>

        {/* 📋 ITEMIZED DETAILED LEDGER CARD INDEX */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <BarChart3 className="w-4 h-4 text-[#9A87A9]" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-950">Detailed Response Review</h4>
          </div>

          <div className="space-y-4 text-left">
            {stats.reviewList.map((q, idx) => {
              const isTheory = q.cleanType === 'theory';
              const correctOptIndex = q.options?.findIndex(opt => opt.isCorrect || opt.is_correct);
              const studentChoiceIndex = q.studentAnswer;

              return (
                <div 
                  key={q.id || idx} 
                  className={`p-5 bg-white border rounded-2xl shadow-3xs space-y-4 relative ${
                    isTheory 
                      ? 'border-[#9A87A9]/20' 
                      : q.isCorrect 
                        ? 'border-emerald-500/30 ring-1 ring-emerald-500/5' 
                        : 'border-rose-500/30 ring-1 ring-rose-500/5'
                  }`}
                >
                  
                  {/* CARD SUMMARY STRIP */}
                  <div className="flex justify-between items-center border-b border-[#FAF9FA] pb-2 font-mono text-[9px] font-black text-[#9A87A9] uppercase">
                    <span>Question Paper Slot {idx + 1} &bull; {q.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#FAF9FA] px-2 py-0.5 rounded border text-slate-950 font-black">
                        {q.points_weight || 2} Marks Weight
                      </span>
                      
                      {/* VERIFICATION BADGES */}
                      {!isTheory && (
                        q.isCorrect ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Correct
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-[#C62927] border border-rose-200 px-2.5 py-0.5 rounded-md font-black flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Incorrect
                          </span>
                        )
                      )}

                      {isTheory && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-md font-black">
                          🕒 Subjective Review Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* MATHEMATICAL PROSE DECODER */}
                  <div className="text-xs font-bold text-slate-950 leading-relaxed font-sans select-text">
                    <SafeMathText text={q.text} />
                  </div>

                  {/* MULTIPLE CHOICE GRID */}
                  {!isTheory && q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 gap-2.5">
                      {q.options.map((opt, oIdx) => {
                        const isThisCorrect = oIdx === correctOptIndex;
                        const isThisStudentChoice = oIdx === studentChoiceIndex;

                        let styleClasses = "bg-[#FAF9FA] border border-slate-100 text-slate-600";
                        if (isThisCorrect) {
                          styleClasses = "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold";
                        } else if (isThisStudentChoice && !isThisCorrect) {
                          styleClasses = "bg-rose-50 border-rose-300 text-rose-900 font-bold line-through";
                        }

                        return (
                          <div 
                            key={oIdx} 
                            className={`px-4 py-3 border rounded-xl text-xs flex justify-between items-center transition-all ${styleClasses}`}
                          >
                            <span className="font-sans">
                              {String.fromCharCode(65 + oIdx)}) <SafeMathText text={opt.text || opt} />
                            </span>
                            
                            <span className="font-mono text-[9px] font-black uppercase tracking-wider shrink-0 ml-2">
                              {isThisCorrect && isThisStudentChoice && "✓ Your Correct Choice"}
                              {isThisCorrect && !isThisStudentChoice && "✓ Correct Target Option"}
                              {!isThisCorrect && isThisStudentChoice && "✗ Your Incorrect Choice"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* THEORY ANSWER DISPLAY / RUBRIC MATRIX ADVISORY */}
                  {isTheory && (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-left space-y-1.5">
                        <span className="text-[9px] font-mono font-black text-[#9A87A9] uppercase block tracking-wider">✍️ Your Submitted Script:</span>
                        <p className="text-xs font-sans text-slate-800 leading-relaxed whitespace-pre-wrap select-text bg-white p-3 rounded-lg border border-slate-100">
                          {studentChoiceIndex ? studentChoiceIndex : <span className="italic text-slate-400 font-mono">No answer response written.</span>}
                        </p>
                      </div>

                      {q.rubric && (
                        <div className="p-3.5 bg-[#2A1A63]/5 border border-[#2A1A63]/10 rounded-xl text-left space-y-1.5">
                          <span className="text-[9px] font-mono font-black text-[#2A1A63] uppercase block tracking-wider">💡 Grading Key Rubric Guideline:</span>
                          <div className="text-[11px] font-sans text-slate-700 leading-relaxed uppercase">
                            <SafeMathText text={q.rubric} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </main>

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-4 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Schools Corporate Intranet CBT Registry © 2026
      </footer>

    </div>
  );
}
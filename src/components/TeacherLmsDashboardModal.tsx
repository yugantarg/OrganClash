import React, { useState } from 'react';
import { TelemetryLog, PlayerVitals, Currencies } from '../types';
import { CURRICULAR_QUIZ_QUESTIONS } from '../data/organData';
import {
  X,
  GraduationCap,
  Activity,
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Award,
  TrendingUp,
  Brain,
  Download,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface TeacherLmsDashboardModalProps {
  logs: TelemetryLog[];
  vitals: PlayerVitals;
  currencies: Currencies;
  studentName: string;
  totalNecrosisEvents: number;
  onClose: () => void;
}

export const TeacherLmsDashboardModal: React.FC<TeacherLmsDashboardModalProps> = ({
  logs,
  vitals,
  currencies,
  studentName,
  totalNecrosisEvents,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'DIAGNOSTICS' | 'QUIZ' | 'SCORM_EXPORT'>('TELEMETRY');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const calculateScore = () => {
    let correct = 0;
    CURRICULAR_QUIZ_QUESTIONS.forEach((q) => {
      if (quizAnswers[q.id] === q.correctIndex) correct++;
    });
    return correct;
  };

  const handleSelectQuizAnswer = (qId: string, optIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
    soundEffects.playUpgradeComplete();
  };

  // Export SCORM/xAPI Telemetry JSON
  const handleExportScorm = () => {
    const scormData = {
      scorm_version: '2004 4th Edition / xAPI',
      actor: {
        name: studentName,
        mbox: 'mailto:student.cadet@school.edu',
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/completed',
        display: { 'en-US': 'completed physiological homeostasis session' },
      },
      object: {
        id: 'http://anatoclash.edu/curriculum/11-organ-systems',
        definition: {
          name: { 'en-US': 'AnatoClash: Macro-Anatomical Base Strategy' },
          description: { 'en-US': 'Human Physiology & Homeostasis Simulation' },
        },
      },
      result: {
        score: {
          scaled: vitals.homeostasisScore / 100,
          raw: vitals.homeostasisScore,
          min: 0,
          max: 100,
        },
        success: vitals.homeostasisScore >= 70,
        completion: true,
        response: `Toxicity Events: ${totalNecrosisEvents}, Final BUN: ${vitals.toxicityBun} mg/dL, SpO2: ${vitals.spO2}%`,
      },
      telemetryEvents: logs,
    };

    const blob = new Blob([JSON.stringify(scormData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anatoclash_telemetry_${studentName.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-game text-slate-900 tracking-tight">Learning Logbook & Quests</h3>
                <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs">
                  Telemetry & Science Assessment
                </span>
              </div>
              <p className="text-xs text-slate-500 font-game">
                Real-time tracking of biological balancing competencies and curriculum mastery.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center space-x-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('TELEMETRY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-game transition cursor-pointer ${
              activeTab === 'TELEMETRY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Telemetry Feed ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-game transition cursor-pointer ${
              activeTab === 'DIAGNOSTICS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('QUIZ')}
            className={`px-3 py-1.5 rounded-xl text-xs font-game transition cursor-pointer ${
              activeTab === 'QUIZ'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Curricular Quiz
          </button>
          <button
            onClick={() => setActiveTab('SCORM_EXPORT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-game transition cursor-pointer ${
              activeTab === 'SCORM_EXPORT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Export Log
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'TELEMETRY' && (
            <div className="space-y-4">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Homeostasis Score</div>
                  <div className="text-lg font-bold font-mono text-emerald-600">{vitals.homeostasisScore}%</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Metabolic Waste Level</div>
                  <div className={`text-lg font-bold font-mono ${vitals.toxicityBun > 60 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {vitals.toxicityBun}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Damage Events</div>
                  <div className={`text-lg font-bold font-mono ${totalNecrosisEvents > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {totalNecrosisEvents} Incidents
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Oxygen Saturation</div>
                  <div className="text-lg font-bold font-mono text-cyan-600">{vitals.spO2}%</div>
                </div>
              </div>

              {/* Event Logs Stream */}
              <div className="space-y-2">
                <div className="text-xs font-game text-slate-600 font-bold uppercase">Chronological Telemetry Stream</div>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between text-xs font-mono shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600 font-bold">[{log.eventType}]</span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-700">{log.details}</p>
                      </div>
                      <div className="text-right whitespace-nowrap pl-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
                          Score Impact: {log.scoreImpact > 0 ? `+${log.scoreImpact}` : log.scoreImpact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'DIAGNOSTICS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
                <h4 className="text-sm font-bold font-game text-slate-900 flex items-center space-x-2">
                  <AlertOctagon className="w-4 h-4 text-blue-600" />
                  <span>Automated Curricular Misconception Detector</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-600 leading-relaxed font-game">
                  {vitals.toxicityBun > 50 ? (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                      <div className="font-bold text-rose-800">⚠️ Kidney Waste Warning</div>
                      <p>
                        The body base produced lots of energy, but needs additional Kidney cleaning power to clear metabolic waste.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="font-bold text-emerald-800">✓ Healthy Kidney Balance</div>
                      <p>Great job! The Kidneys are actively filtering and keeping the system clean and balanced.</p>
                    </div>
                  )}

                  {vitals.spO2 < 90 && (
                    <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 space-y-1">
                      <div className="font-bold text-cyan-800">⚠️ Low Oxygen Warning</div>
                      <p>Your organs need more fresh air! Upgrade the Lungs or connect more blood vessels to deliver oxygen.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'QUIZ' && (
            <div className="space-y-4 font-game">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold font-game text-slate-900">Anatomy & Physiology Checkpoint Quiz</h4>
                  <p className="text-xs text-slate-500 font-game">
                    Assess mechanistic understanding of the body systems.
                  </p>
                </div>
                {quizSubmitted && (
                  <div className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-xs font-bold">
                    Score: {calculateScore()} / {CURRICULAR_QUIZ_QUESTIONS.length} (
                    {Math.round((calculateScore() / CURRICULAR_QUIZ_QUESTIONS.length) * 100)}%)
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {CURRICULAR_QUIZ_QUESTIONS.map((q, idx) => {
                  const selected = quizAnswers[q.id];
                  const isCorrect = selected === q.correctIndex;

                  return (
                    <div key={q.id} className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {idx + 1}. {q.question}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {q.curriculumTopic}
                        </span>
                      </div>

                      {q.clinicalScenario && (
                        <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-[11px] text-amber-900 font-game">
                          Scenario: {q.clinicalScenario}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = selected === optIdx;
                          let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:border-slate-400';

                          if (quizSubmitted) {
                            if (optIdx === q.correctIndex) {
                              btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold';
                            } else if (isOptionSelected) {
                              btnStyle = 'bg-rose-50 border-rose-500 text-rose-800';
                            }
                          } else if (isOptionSelected) {
                            btnStyle = 'bg-blue-50 border-blue-500 text-blue-800 font-bold';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleSelectQuizAnswer(q.id, optIdx)}
                              className={`p-2.5 rounded-lg border text-left text-xs font-game transition cursor-pointer ${btnStyle}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-game">
                          <span className="text-emerald-700 font-bold">Explanation: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!quizSubmitted && (
                <button
                  onClick={handleSubmitQuiz}
                  className="w-full py-2.5 rounded-xl game-btn-primary font-game text-xs cursor-pointer shadow-xs"
                >
                  SUBMIT ASSESSMENT
                </button>
              )}
            </div>
          )}

          {activeTab === 'SCORM_EXPORT' && (
            <div className="space-y-4 font-game">
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
                <h4 className="text-sm font-bold font-game text-slate-900">Learning Data Export</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-game">
                  Export complete student session telemetry logs, balance scores, and quiz results in standard JSON format.
                </p>

                <button
                  onClick={handleExportScorm}
                  className="px-4 py-2.5 rounded-xl game-btn-primary text-xs flex items-center space-x-2 transition cursor-pointer shadow-xs font-game"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT TELEMETRY DATA (.JSON)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

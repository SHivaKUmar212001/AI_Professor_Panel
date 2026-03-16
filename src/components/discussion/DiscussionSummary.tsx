"use client";

import { DiscussionSummary as SummaryType } from "@/lib/types";
import { motion } from "framer-motion";

interface DiscussionSummaryProps {
  summary: SummaryType;
}

export default function DiscussionSummaryPanel({
  summary,
}: DiscussionSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-cyan-500/20 rounded-xl p-6 bg-cyan-500/[0.03] space-y-6"
    >
      <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
        <span>📋</span> Discussion Analysis
      </h3>

      {/* Core Theses */}
      {summary.coreTheses && summary.coreTheses.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
            Core Thesis of Each Participant
          </h4>
          <div className="space-y-2">
            {summary.coreTheses.map((t, i) => (
              <div key={i} className="text-sm text-white/80">
                <span className="font-semibold text-white/90">
                  {t.agentName}:
                </span>{" "}
                {t.thesis}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {summary.keyInsights && summary.keyInsights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
            Key Insights
          </h4>
          <ul className="space-y-1.5">
            {summary.keyInsights.map((insight, i) => (
              <li key={i} className="text-sm text-white/80 flex gap-2">
                <span className="text-cyan-500 shrink-0">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strongest Disagreements */}
      {summary.strongestDisagreements &&
        summary.strongestDisagreements.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
              Strongest Disagreements
            </h4>
            <ul className="space-y-1.5">
              {summary.strongestDisagreements.map((d, i) => (
                <li key={i} className="text-sm text-white/80 flex gap-2">
                  <span className="text-red-400 shrink-0">⚡</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Unexpected Connections */}
      {summary.unexpectedConnections &&
        summary.unexpectedConnections.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
              Unexpected Connections
            </h4>
            <ul className="space-y-1.5">
              {summary.unexpectedConnections.map((c, i) => (
                <li key={i} className="text-sm text-white/80 flex gap-2">
                  <span className="text-purple-400 shrink-0">🔗</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Unresolved Questions */}
      {summary.unresolvedQuestions &&
        summary.unresolvedQuestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
              Unresolved Questions
            </h4>
            <ul className="space-y-1.5">
              {summary.unresolvedQuestions.map((q, i) => (
                <li key={i} className="text-sm text-white/80 flex gap-2">
                  <span className="text-amber-400 shrink-0">?</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Verdict */}
      {summary.verdict && (
        <div className="border-t border-cyan-500/20 pt-4">
          <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
            Verdict
          </h4>
          <p className="text-sm text-white/90 italic leading-relaxed">
            {summary.verdict}
          </p>
        </div>
      )}
    </motion.div>
  );
}

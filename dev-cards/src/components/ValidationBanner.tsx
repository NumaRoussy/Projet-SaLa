import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ValidationIssue } from '../types';

interface ValidationBannerProps {
  issues: ValidationIssue[];
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({ issues }) => {
  if (issues.length === 0) return null;

  return (
    <div
      role="status"
      className="rounded-lg bg-[#b5892e]/15 border border-[#b5892e]/50 px-3 py-2.5 text-xs text-[#f6d58e]"
    >
      <div className="flex items-center gap-1.5 font-semibold text-[#f3c669]">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {issues.length === 1
            ? '1 point d’attention détecté (non bloquant)'
            : `${issues.length} points d’attention détectés (non bloquant)`}
        </span>
      </div>
      <ul className="mt-1.5 space-y-1 pl-5 list-disc text-[#f5dfb0]">
        {issues.map((issue) => (
          <li key={issue.code}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
};

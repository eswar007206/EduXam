import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { SKILL_SUGGESTIONS } from '@/data/skillSuggestions';

interface SkillAutocompleteProps {
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
  placeholder?: string;
}

export default function SkillAutocomplete({
  skills,
  onSkillsChange,
  placeholder = 'e.g. React, Python, Machine Learning...',
}: SkillAutocompleteProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = input.trim()
    ? SKILL_SUGGESTIONS.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) &&
          !skills.includes(s)
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onSkillsChange([...skills, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
    setSelectedIdx(0);
  };

  const removeSkill = (idx: number) => {
    onSkillsChange(skills.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0 && showSuggestions) {
        addSkill(filtered[selectedIdx]);
      } else if (input.trim()) {
        addSkill(input);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setShowSuggestions(true);
          setSelectedIdx(0);
        }}
        onFocus={() => input.trim() && setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#071952] focus:ring-0 outline-none text-sm transition-colors"
        placeholder={placeholder}
      />

      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((suggestion, idx) => (
            <button
              key={suggestion}
              type="button"
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                idx === selectedIdx
                  ? 'bg-[#071952]/10 text-[#071952] font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onMouseEnter={() => setSelectedIdx(idx)}
              onClick={() => addSkill(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {skills.map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#071952]/10 text-[#071952] text-sm font-medium rounded-full"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(idx)}
                className="ml-0.5 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

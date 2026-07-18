import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function SafeMathText({ text }) {
  const containerRef = useRef(null);

  // Fallback check to support both camelCase and snake_case properties coming from the API
  const resolvedText = typeof text === 'object' 
    ? (text.question_text || text.questionText || text.text || '') 
    : (text || '');

  useEffect(() => {
    if (!containerRef.current || !resolvedText) return;

    try {
      // 1. Clean up backslashes and carriage returns safely
      let parsedText = resolvedText
        .replace(/\\\\/g, '\\')
        .replace(/\\r|\\n/g, ' ')
        .trim();

      // 2. Scan for dollar signs and compile formula strings inline using KaTeX
      const compiledHTML = parsedText.replace(/\$([^\$]+)\$/g, (match, formula) => {
        try {
          return katex.renderToString(formula.trim(), {
            throwOnError: false,
            displayMode: false
          });
        } catch (e) {
          return match;
        }
      });

      containerRef.current.innerHTML = compiledHTML;
    } catch (err) {
      console.error("KaTeX inline compilation bypass failure:", err);
      containerRef.current.textContent = resolvedText;
    }
  }, [resolvedText]);

  if (!resolvedText) return null;

  return (
    <span 
      ref={containerRef} 
      className="font-sans leading-relaxed text-slate-950 select-text"
    >
      {resolvedText}
    </span>
  );
}
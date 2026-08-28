/**
 * Standard Nigerian Academic Grading Scale Helper
 * @param {number} score - The student's obtained score
 * @param {number} maxScore - The maximum obtainable score (defaults to 100)
 * @returns {string} Letter grade ('A', 'B', 'C', 'D', 'E', 'F')
 */
export const calculateNigerianGrade = (score, maxScore = 100) => {
  if (maxScore <= 0 || score === null || score === undefined) return 'F';
  const percentage = (parseFloat(score) / parseFloat(maxScore)) * 100;

  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 45) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
};

/**
 * Returns CSS styling classes for badge rendering based on the grade letter.
 */
export const getGradeBadgeStyle = (grade) => {
  switch (grade) {
    case 'A': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'B': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'C': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case 'D': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'E': return 'text-amber-700 bg-amber-50 border-amber-200';
    default: return 'text-[#C62927] bg-rose-50 border-rose-200 font-black';
  }
};
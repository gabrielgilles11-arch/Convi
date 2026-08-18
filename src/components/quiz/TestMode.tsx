import { useMemo, useState } from "react";
import { buildOptions, type QuizItem } from "../../lib/quizTypes";
import { recordAnswer, recordCategoryScore, loadProgress } from "../../lib/progress";

interface Props {
  items: QuizItem[];
  categoryFilter: string; // "all" or a category id — used only for best-score bucketing
}

function pickRandom(items: QuizItem[]): QuizItem {
  return items[Math.floor(Math.random() * items.length)];
}

export default function TestMode({ items, categoryFilter }: Props) {
  const [question, setQuestion] = useState<QuizItem | null>(() => (items.length ? pickRandom(items) : null));
  const [options, setOptions] = useState<string[]>(() => (question ? buildOptions(question, items) : []));
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(() => loadProgress().streak);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Reset the session whenever the filtered item set changes (e.g. category switch)
  const itemsKey = useMemo(() => items.map((i) => i.id).join(","), [items]);
  const [lastKey, setLastKey] = useState(itemsKey);
  if (itemsKey !== lastKey) {
    setLastKey(itemsKey);
    const q = items.length ? pickRandom(items) : null;
    setQuestion(q);
    setOptions(q ? buildOptions(q, items) : []);
    setSelected(null);
    setCorrectCount(0);
    setTotalCount(0);
  }

  if (!question) {
    return <p>No questions in this category yet.</p>;
  }

  function choose(option: string) {
    if (selected) return; // already answered this question
    setSelected(option);

    const isCorrect = option === question!.correctAnswer;
    const progress = recordAnswer(isCorrect);
    setStreak(progress.streak);

    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    const newTotal = totalCount + 1;
    setCorrectCount(newCorrect);
    setTotalCount(newTotal);

    if (categoryFilter !== "all") {
      recordCategoryScore(categoryFilter, Math.round((newCorrect / newTotal) * 100));
    }
  }

  function nextQuestion() {
    const q = pickRandom(items);
    setQuestion(q);
    setOptions(buildOptions(q, items));
    setSelected(null);
  }

  const sessionScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="test-mode">
      <div className="stats">
        <span>Streak: {streak}</span>
        <span>
          Score: {correctCount}/{totalCount} ({sessionScore}%)
        </span>
      </div>

      <p className="category-tag">{question.categoryTitle}</p>
      <p className="quiz-prompt">{question.prompt}</p>
      <p className="quiz-front">
        {question.front}
        {question.frontTranslation && <span className="en"> — {question.frontTranslation}</span>}
      </p>

      <div className="options">
        {options.map((option) => {
          const isCorrectOption = option === question.correctAnswer;
          const isSelected = option === selected;
          let className = "option";
          if (selected) {
            if (isCorrectOption) className += " correct";
            else if (isSelected) className += " incorrect";
          }
          return (
            <button key={option} type="button" className={className} onClick={() => choose(option)} disabled={!!selected}>
              {option}
            </button>
          );
        })}
      </div>

      {selected && (
        <button type="button" className="next-question" onClick={nextQuestion}>
          Next question &rarr;
        </button>
      )}
    </div>
  );
}

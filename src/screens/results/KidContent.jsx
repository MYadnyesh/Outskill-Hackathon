import { useState } from 'react';
import { Lightbulb, Star, Brain, CheckCircle, XCircle } from '@phosphor-icons/react';
import { Card, Pill, Button } from '../../design-system/components/index.js';
import styles from './KidContent.module.css';

// Answers are one-shot: once a question is answered it locks (tracked in
// this component's own local state, not global), and reports up whether the
// pick was correct so the parent can compute the score Pill.
function QuizQuestion({ question, index, onAnswered }) {
  const [selected, setSelected] = useState(null);

  const answer = (optionIndex) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    onAnswered(index, optionIndex === question.correctIndex);
  };

  return (
    <div className={styles.quizQuestion}>
      <div className={styles.quizPrompt}>
        {index + 1}. {question.question}
      </div>
      <div className={styles.quizOptions}>
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          const isChosen = i === selected;
          const revealCorrect = selected !== null && isCorrect && !isChosen;
          return (
            <Button
              key={i}
              variant="secondary"
              className={[
                styles.quizOption,
                isChosen && isCorrect ? styles.optionCorrect : '',
                isChosen && !isCorrect ? styles.optionWrong : '',
                revealCorrect ? styles.optionReveal : '',
              ]
                .filter(Boolean)
                .join(' ')}
              // aria-disabled, not disabled: the `disabled` attribute picks up
              // base.css's global 45% disabled opacity, which would wash out
              // the check / X / dashed-reveal feedback this quiz exists to
              // show, and would drop answered options out of the tab order.
              // answer() already refuses a second pick.
              aria-disabled={selected !== null}
              onClick={() => answer(i)}
              icon={
                isChosen && isCorrect ? (
                  <CheckCircle size={18} weight="fill" className={styles.correctIcon} />
                ) : isChosen && !isCorrect ? (
                  <XCircle size={18} weight="regular" className={styles.wrongIcon} />
                ) : null
              }
              iconPosition="right"
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function KidContent({ kid }) {
  const [answers, setAnswers] = useState({});

  const registerAnswer = (i, correct) => setAnswers((prev) => ({ ...prev, [i]: correct }));
  const answeredCount = Object.keys(answers).length;
  const allAnswered = kid.quiz.length > 0 && answeredCount === kid.quiz.length;
  const correctCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className={styles.section}>
      <div>
        <div className={styles.kicker}>EXPLAIN IT TO A KID</div>
        <h2 className={styles.headline}>Let&apos;s make this super easy</h2>
        <p className={styles.subhead}>Written for 5-7 year-olds, with grown-ups reading along.</p>
      </div>

      <Card elevation={1}>
        <div className={styles.cardHeading}>
          <Lightbulb size={20} weight="fill" className={styles.headingIcon} />
          Simple explanation
        </div>
        <p className={styles.body}>{kid.simpleExplanation}</p>
      </Card>

      <Card elevation={1}>
        <div className={styles.cardHeading}>A Little Story</div>
        <div className={styles.storyBody}>
          {kid.story.map((paragraph, i) => (
            <p key={i} className={styles.body}>
              {paragraph}
            </p>
          ))}
        </div>
      </Card>

      <div className={styles.section}>
        <div className={styles.cardHeading}>
          <Star size={20} weight="fill" className={styles.headingIcon} />
          Fun facts
        </div>
        <div className={styles.factsGrid}>
          {kid.funFacts.map((fact, i) => (
            <div className={styles.factCard} key={i}>
              {fact}
            </div>
          ))}
        </div>
      </div>

      <Card elevation={1}>
        <div className={styles.quizHeader}>
          <div className={styles.cardHeading}>
            <Brain size={20} weight="fill" className={styles.headingIcon} />
            Mini quiz
          </div>
          {allAnswered ? (
            <Pill variant="accent">
              {correctCount} / {kid.quiz.length} correct
            </Pill>
          ) : null}
        </div>
        <div className={styles.quizList}>
          {kid.quiz.map((q, i) => (
            <QuizQuestion key={i} question={q} index={i} onAnswered={registerAnswer} />
          ))}
        </div>
      </Card>
    </div>
  );
}

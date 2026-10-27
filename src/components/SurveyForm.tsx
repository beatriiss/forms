"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_QUESTIONS,
  FORM_DESCRIPTION,
  FORM_TITLE,
  GEN_OPTIONS,
  MILLENNIAL_NOTICE,
  OTHER_PREFIX,
  optionLabel,
  questionTitle,
  SECTIONS,
  type Answers,
  type Generation,
  type Question,
  type Section,
} from "@/lib/questions";
import { submitSurvey } from "@/app/actions";

type Screen =
  | { kind: "intro" }
  | { kind: "millennial" }
  | { kind: "section"; section: Section }
  | { kind: "done" };

const SENTINEL = "__other__";
const REQUIRED_MSG = "Esta pergunta é obrigatória.";

const cardClass =
  "bg-white border border-zinc-200 rounded-xl shadow-sm";
const headerCardClass = `${cardClass} overflow-hidden border-t-8 border-t-violet-600 p-5 sm:p-8`;
const optionLabelClass = "flex items-start gap-3 text-sm py-1.5 cursor-pointer";
const choiceInputClass = "mt-0.5 size-4 shrink-0 accent-violet-600";
const otherInputClass =
  "flex-1 min-w-0 border-b border-zinc-300 bg-transparent px-1 py-1 text-sm outline-none focus:border-violet-600";

function isAnswerEmpty(answer: string | string[] | undefined): boolean {
  if (answer === undefined) return true;
  if (typeof answer === "string") return answer.trim() === "";
  return answer.length === 0;
}

function withoutKey(prev: Record<string, string>, key: string) {
  if (!prev[key]) return prev;
  const next = { ...prev };
  delete next[key];
  return next;
}

export default function SurveyForm() {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const allowLeaveRef = useRef(false);
  const guardPushedRef = useRef(false);

  const screens = useMemo<Screen[]>(() => {
    const list: Screen[] = [{ kind: "intro" }];
    if (generation === "Y") list.push({ kind: "millennial" });
    for (const section of SECTIONS) list.push({ kind: "section", section });
    list.push({ kind: "done" });
    return list;
  }, [generation]);

  const currentScreen = screens[stepIndex] ?? screens[screens.length - 1];
  const isLastSection = stepIndex === screens.length - 2;
  const progress = Math.min(100, ((stepIndex + 1) / (screens.length - 1)) * 100);

  const started = generation !== null || stepIndex > 0;
  const guardActive = started && status !== "done";
  const sectionsRemaining =
    currentScreen.kind === "section"
      ? screens.slice(stepIndex).filter((s) => s.kind === "section").length
      : SECTIONS.length;

  useEffect(() => {
    if (!guardActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [guardActive]);

  // Botão "voltar" do navegador/celular: mantém uma entrada extra no histórico e
  // abre o modal de confirmação em vez de sair da página.
  useEffect(() => {
    if (!guardActive) return;

    if (!guardPushedRef.current) {
      window.history.pushState({ surveyGuard: true }, "");
      guardPushedRef.current = true;
    }

    const handlePopState = () => {
      if (allowLeaveRef.current) return;
      window.history.pushState({ surveyGuard: true }, "");
      setShowLeaveModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [guardActive]);

  useEffect(() => {
    if (!showLeaveModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLeaveModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLeaveModal]);

  function leaveAnyway() {
    allowLeaveRef.current = true;
    setShowLeaveModal(false);
    window.history.go(-2);
  }

  function goToStep(index: number) {
    setStepIndex(Math.max(0, Math.min(screens.length - 1, index)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      document
        .querySelector('[data-error="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function clearError(id: string) {
    setErrors((prev) => withoutKey(prev, id));
  }

  function handleNext() {
    setSubmitError(null);

    if (currentScreen.kind === "intro" && !generation) {
      setErrors({ intro: REQUIRED_MSG });
      scrollToFirstError();
      return;
    }

    if (currentScreen.kind === "section") {
      const newErrors: Record<string, string> = {};

      for (const q of currentScreen.section.questions) {
        const answer = answers[q.id];
        if (q.required && isAnswerEmpty(answer)) {
          newErrors[q.id] = REQUIRED_MSG;
          continue;
        }

        const hasOther =
          q.allowOther &&
          (q.type === "radio"
            ? answer === SENTINEL
            : Array.isArray(answer) && answer.includes(SENTINEL));

        if (hasOther && (otherText[q.id]?.trim() ?? "") === "") {
          newErrors[q.id] = "Descreva a opção “Outro”.";
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        scrollToFirstError();
        return;
      }

      if (isLastSection) {
        setErrors({});
        void handleSubmit();
        return;
      }
    }

    setErrors({});
    goToStep(stepIndex + 1);
  }

  function handleBack() {
    if (stepIndex > 0) {
      setErrors({});
      setSubmitError(null);
      goToStep(stepIndex - 1);
    }
  }

  async function handleSubmit() {
    if (status === "sending" || generation === null) return;
    setStatus("sending");
    setSubmitError(null);

    const otherValue = (id: string) => `${OTHER_PREFIX}${(otherText[id] ?? "").trim()}`;
    const finalAnswers: Answers = {};
    for (const q of ALL_QUESTIONS) {
      const ans = answers[q.id];
      if (q.type === "checkbox") {
        const arr = Array.isArray(ans) ? ans : [];
        finalAnswers[q.id] = arr.map((item) => (item === SENTINEL ? otherValue(q.id) : item));
      } else {
        const val = typeof ans === "string" ? ans : "";
        finalAnswers[q.id] = val === SENTINEL ? otherValue(q.id) : val;
      }
    }

    const result = await submitSurvey(generation, finalAnswers);

    if (result.ok) {
      setStatus("done");
      goToStep(screens.length - 1);
    } else {
      setStatus("idle");
      setSubmitError(result.error);
    }
  }

  function updateAnswer(q: Question, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    clearError(q.id);
  }

  function handleCheckboxChange(q: Question, value: string, checked: boolean) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
      const next = checked
        ? current.includes(value)
          ? current
          : [...current, value]
        : current.filter((v) => v !== value);
      return { ...prev, [q.id]: next };
    });
    clearError(q.id);
  }

  function handleOtherTextChange(q: Question, value: string) {
    setOtherText((prev) => ({ ...prev, [q.id]: value }));
    if (q.type === "radio") {
      updateAnswer(q, SENTINEL);
    } else {
      handleCheckboxChange(q, SENTINEL, true);
    }
  }

  function renderOther(q: Question, selected: boolean, input: React.ReactNode) {
    return (
      <div className="flex items-center gap-3">
        <label className={optionLabelClass}>
          {input}
          <span>Outro:</span>
        </label>
        <input
          type="text"
          value={selected ? (otherText[q.id] ?? "") : ""}
          onChange={(e) => handleOtherTextChange(q, e.target.value)}
          maxLength={200}
          className={otherInputClass}
          aria-label={`Outro: ${questionTitle(q, generation)}`}
        />
      </div>
    );
  }

  function renderQuestion(q: Question) {
    const answer = answers[q.id];
    const questionError = errors[q.id];
    const selectedList = Array.isArray(answer) ? answer : [];

    return (
      <div
        key={q.id}
        data-error={questionError ? "true" : undefined}
        className={`${cardClass} p-5 sm:p-6 ${questionError ? "border-red-400" : ""}`}
      >
        <fieldset aria-invalid={questionError ? true : undefined}>
          <legend className="block text-base font-medium mb-4">
            {questionTitle(q, generation)} {q.required && <span className="text-red-500">*</span>}
          </legend>

          {q.type === "text" && (
            <input
              type="text"
              name={q.id}
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) => updateAnswer(q, e.target.value)}
              maxLength={200}
              placeholder="Sua resposta"
              aria-label={questionTitle(q, generation)}
              aria-invalid={questionError ? true : undefined}
              className="w-full sm:w-2/3 border-b border-zinc-300 bg-transparent px-1 py-2 text-sm outline-none focus:border-violet-600"
            />
          )}

          {q.type === "radio" && (
            <div className="space-y-1">
              {q.options?.map((opt) => (
                <label key={opt} className={optionLabelClass}>
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answer === opt}
                    onChange={() => updateAnswer(q, opt)}
                    className={choiceInputClass}
                  />
                  <span>{optionLabel(q, opt, generation)}</span>
                </label>
              ))}
              {q.allowOther &&
                renderOther(
                  q,
                  answer === SENTINEL,
                  <input
                    type="radio"
                    name={q.id}
                    value={SENTINEL}
                    checked={answer === SENTINEL}
                    onChange={() => updateAnswer(q, SENTINEL)}
                    className={choiceInputClass}
                  />,
                )}
              {!q.required && typeof answer === "string" && answer !== "" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => updateAnswer(q, "")}
                    className="text-sm text-violet-700 hover:underline"
                  >
                    Limpar seleção
                  </button>
                </div>
              )}
            </div>
          )}

          {q.type === "checkbox" && (
            <div className="space-y-1">
              {q.options?.map((opt) => (
                <label key={opt} className={optionLabelClass}>
                  <input
                    type="checkbox"
                    name={q.id}
                    value={opt}
                    checked={selectedList.includes(opt)}
                    onChange={(e) => handleCheckboxChange(q, opt, e.target.checked)}
                    className={choiceInputClass}
                  />
                  <span>{optionLabel(q, opt, generation)}</span>
                </label>
              ))}
              {q.allowOther &&
                renderOther(
                  q,
                  selectedList.includes(SENTINEL),
                  <input
                    type="checkbox"
                    name={q.id}
                    value={SENTINEL}
                    checked={selectedList.includes(SENTINEL)}
                    onChange={(e) => handleCheckboxChange(q, SENTINEL, e.target.checked)}
                    className={choiceInputClass}
                  />,
                )}
            </div>
          )}

          {questionError && (
            <p className="mt-3 text-sm text-red-600">{questionError}</p>
          )}
        </fieldset>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-zinc-900 flex flex-col">
      <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10 flex-1">
        {currentScreen.kind !== "done" && (
          <div className="mb-4">
            <div
              className="h-2 bg-violet-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-zinc-500 mt-1 text-right">
              Etapa {stepIndex + 1} de {screens.length - 1}
            </p>
          </div>
        )}

        {currentScreen.kind === "intro" && (
          <div className="space-y-4">
            <div className={headerCardClass}>
              <h1 className="text-2xl sm:text-3xl font-bold mb-4">{FORM_TITLE}</h1>
                <p className="text-sm text-zinc-700 mb-3">
                  {FORM_DESCRIPTION[0]}
                </p>
                <p className="text-sm text-zinc-700 mb-3 font-bold">
                  {FORM_DESCRIPTION[1]}
                </p>
             
              <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                ⏱️ Leva cerca de 3 minutos. Responda até o final e clique em <strong>Enviar</strong> —
                respostas incompletas não são salvas.
              </p>
              <p className="text-sm text-red-600 mt-4">
                * Indica uma pergunta obrigatória
              </p>
            </div>
            <div
              data-error={errors.intro ? "true" : undefined}
              className={`${cardClass} p-5 sm:p-6 ${errors.intro ? "border-red-400" : ""}`}
            >
              <fieldset aria-invalid={errors.intro ? true : undefined}>
                <legend className="block text-base font-medium mb-4">
                  Em qual período você nasceu? <span className="text-red-500">*</span>
                </legend>
                <div className="space-y-1">
                  {GEN_OPTIONS.map((opt) => (
                    <label key={opt.value} className={optionLabelClass}>
                      <input
                        type="radio"
                        name="generation"
                        value={opt.value}
                        checked={generation === opt.value}
                        onChange={() => {
                          setGeneration(opt.value);
                          setErrors({});
                        }}
                        className={choiceInputClass}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                {errors.intro && (
                  <p className="mt-3 text-sm text-red-600">{errors.intro}</p>
                )}
              </fieldset>
            </div>
          </div>
        )}

        {currentScreen.kind === "millennial" && (
          <div className={headerCardClass}>
            <h2 className="text-xl sm:text-2xl font-semibold mb-3">{MILLENNIAL_NOTICE.title}</h2>
            <p className="text-base font-bold text-zinc-700">{MILLENNIAL_NOTICE.text}</p>
          </div>
        )}

        {currentScreen.kind === "section" && (
          <div className="space-y-4">
            <div className={headerCardClass}>
              <h2 className="text-xl sm:text-2xl font-semibold">{currentScreen.section.title}</h2>
              {generation === "Y" && (
                <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800">
                  Lembrete: responda pensando em quando você tinha entre 18 e 20 e poucos anos.
                </p>
              )}
            </div>
            {currentScreen.section.questions.map((q) => renderQuestion(q))}
          </div>
        )}

        {currentScreen.kind === "done" && (
          <div className={`${headerCardClass} text-center`}>
            <h2 className="text-2xl font-bold mb-2">Obrigado por participar!</h2>
            <p className="text-sm text-zinc-700">
              Suas respostas foram registradas com sucesso.
            </p>
          </div>
        )}

        {currentScreen.kind !== "done" && (
          <>
            {submitError && (
              <div
                role="alert"
                className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"
              >
                {submitError}
              </div>
            )}
            {isLastSection && (
              <p className="mt-6 text-sm text-zinc-600 text-center">
                Última etapa! Clique em Enviar para registrar suas respostas.
              </p>
            )}
            <div className="mt-6 flex items-center justify-between gap-3">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={status === "sending"}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-violet-700 border border-violet-200 bg-white hover:bg-violet-50 disabled:opacity-50"
                >
                  Voltar
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={status === "sending"}
                className="px-6 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
              >
                {isLastSection ? (status === "sending" ? "Enviando..." : "Enviar") : "Próxima"}
              </button>
            </div>
          </>
        )}
      </div>

      <footer className="py-4 text-center text-xs text-zinc-500">
        Pesquisa acadêmica · respostas anônimas
      </footer>

      {showLeaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="leave-modal-title" className="text-lg font-semibold mb-2">
              Sair sem terminar?
            </h2>
            <p className="text-sm text-zinc-700 mb-2">
              Suas respostas ainda não foram enviadas e serão perdidas se você sair agora. Falta pouco!
            </p>
            <p className="text-sm font-medium text-violet-700 mb-5">
              {sectionsRemaining === 1 ? "Falta 1 seção." : `Faltam ${sectionsRemaining} seções.`}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={leaveAnyway}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Sair mesmo assim
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                autoFocus
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
              >
                Continuar respondendo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

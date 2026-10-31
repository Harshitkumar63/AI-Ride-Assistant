import { useEffect, useState } from "react";
import { CheckSquare, Bot, Sparkles } from "lucide-react";
import AIChatAssistant from "./AIChatAssistant";
import "./RideAssistant.css";

const STORAGE_KEY = "mototribeAssistantChecks";

const assistantOptions = [
  {
    id: "route",
    number: "01",
    title: "ROUTE ASSIST",
    shortTitle: "Route",
    description:
      "Get quick guidance for planning and managing your riding route.",
    tips: [
      "Check the route before starting your ride.",
      "Identify fuel and rest stops in advance.",
      "Keep an alternate route available for unexpected road conditions.",
      "Share your planned route with a trusted contact.",
    ],
  },
  {
    id: "fuel",
    number: "02",
    title: "FUEL CHECK",
    shortTitle: "Fuel",
    description:
      "Plan your fuel stops before starting your journey.",
    tips: [
      "Refuel before entering long remote sections.",
      "Identify fuel stations along your route.",
      "Monitor your motorcycle's average mileage.",
      "Keep enough fuel reserve for unexpected detours.",
    ],
  },
  {
    id: "service",
    number: "03",
    title: "SERVICE HELP",
    shortTitle: "Service",
    description:
      "Prepare your motorcycle before and during your journey.",
    tips: [
      "Check tyre pressure before departure.",
      "Inspect the chain condition and lubrication.",
      "Check engine oil and coolant levels.",
      "Identify nearby motorcycle service centres.",
    ],
  },
  {
    id: "safety",
    number: "04",
    title: "SAFETY CHECK",
    shortTitle: "Safety",
    description:
      "Follow these essential safety checks before riding.",
    tips: [
      "Wear a certified helmet and protective gear.",
      "Carry your driving licence and vehicle documents.",
      "Keep emergency contacts accessible.",
      "Avoid riding when excessively tired.",
    ],
  },
];

function loadChecklist() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function RideAssistant() {
  const [activeView, setActiveView] = useState("checklist"); // "checklist" | "copilot"
  const [aiTopicPrompt, setAiTopicPrompt] = useState(null);
  const [activeOption, setActiveOption] = useState("route");

  const [completedChecks, setCompletedChecks] =
    useState(loadChecklist);

  const [assistantMode, setAssistantMode] = useState("READY");

  // Save checklist progress.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(completedChecks)
      );
    } catch {
      // Storage may be unavailable in some browsers.
    }
  }, [completedChecks]);

  const selectedOption =
    assistantOptions.find(
      (option) => option.id === activeOption
    ) || assistantOptions[0];

  const getCheckId = (index) =>
    `${activeOption}-${index}`;

  // Complete or uncomplete an action.
  const toggleCheck = (index) => {
    const checkId = getCheckId(index);

    setCompletedChecks((previous) =>
      previous.includes(checkId)
        ? previous.filter((item) => item !== checkId)
        : [...previous, checkId]
    );
  };

  const completedCount = selectedOption.tips.filter(
    (_, index) =>
      completedChecks.includes(getCheckId(index))
  ).length;

  const progress = Math.round(
    (completedCount / selectedOption.tips.length) * 100
  );

  // Reset only the selected category.
  const resetChecklist = () => {
    setCompletedChecks((previous) =>
      previous.filter(
        (item) => !item.startsWith(`${activeOption}-`)
      )
    );
  };

  return (
    <section
      className="mt-ride-assistant"
      id="ride-assistant"
    >
      <div className="mt-ride-container">

        {/* Header */}

        <header className="mt-ride-header">
          <div className="mt-ride-heading">
            <span className="mt-ride-eyebrow">
              MOTOTRIBE / RIDE ASSISTANT
            </span>

            <h2>
              Your ride.
              <br />
              Your co-pilot.
            </h2>

            <p>
              Practical guidance for every stage of your
              journey — from preparation to the road ahead.
            </p>
          </div>

          <div className="mt-ride-status">
            <span>ASSISTANT STATUS</span>

            <button
              type="button"
              className="mt-ride-status-button"
              onClick={() =>
                setAssistantMode((current) =>
                  current === "READY" ? "ACTIVE" : "READY"
                )
              }
              aria-pressed={assistantMode === "ACTIVE"}
            >
              <span className="mt-ride-status-dot" />
              {assistantMode}
            </button>
          </div>
        </header>

        {/* View Mode Switcher */}
        <div className="mt-ride-view-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "checklist"}
            className={`mt-ride-view-tab ${activeView === "checklist" ? "active" : ""}`}
            onClick={() => setActiveView("checklist")}
          >
            <CheckSquare size={14} />
            <span>PRE-RIDE CHECKLIST</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === "copilot"}
            className={`mt-ride-view-tab ${activeView === "copilot" ? "active" : ""}`}
            onClick={() => {
              setActiveView("copilot");
              setAiTopicPrompt(null);
            }}
          >
            <Bot size={14} />
            <span>AI RIDE CO-PILOT</span>
            <span className="mt-ride-ai-badge">LIVE AI</span>
          </button>
        </div>

        {activeView === "copilot" ? (
          <AIChatAssistant initialTopic={aiTopicPrompt} />
        ) : (
          <>
            {/* Navigation */}

            <nav
              className="mt-ride-navigation"
              aria-label="Ride assistant categories"
            >
          {assistantOptions.map((option) => (
            <button
              type="button"
              key={option.id}
              className={`mt-ride-nav-item ${
                activeOption === option.id ? "active" : ""
              }`}
              onClick={() => setActiveOption(option.id)}
              aria-pressed={activeOption === option.id}
            >
              <span className="mt-ride-nav-number">
                {option.number}
              </span>

              <span className="mt-ride-nav-title">
                {option.shortTitle}
              </span>

              <span className="mt-ride-nav-arrow">
                ›
              </span>
            </button>
          ))}
        </nav>

        {/* Main panel */}

        <div className="mt-ride-main">

          {/* Left panel */}

          <aside className="mt-ride-intro">
            <span className="mt-ride-label">
              ACTIVE ASSISTANCE / {selectedOption.number}
            </span>

            <div className="mt-ride-number">
              {selectedOption.number}
            </div>

            <h3>{selectedOption.title}</h3>

            <p className="mt-ride-description">
              {selectedOption.description}
            </p>

            <div className="mt-ride-progress">
              <div className="mt-ride-progress-heading">
                <span>CHECKLIST PROGRESS</span>

                <strong>
                  {completedCount}/{selectedOption.tips.length}
                </strong>
              </div>

              <div
                className="mt-ride-progress-track"
                role="progressbar"
                aria-label="Checklist progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div
                  className="mt-ride-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <span className="mt-ride-progress-text">
                {progress}% COMPLETE
              </span>
            </div>

            <button
              type="button"
              className="mt-ride-reset"
              onClick={resetChecklist}
              disabled={completedCount === 0}
            >
              RESET CHECKLIST
            </button>
          </aside>

          {/* Right panel */}

          <div className="mt-ride-checklist">
            <div className="mt-ride-checklist-heading">
              <span>RECOMMENDED ACTIONS</span>

              <strong>
                {String(selectedOption.tips.length).padStart(2, "0")}
              </strong>
            </div>

            <div className="mt-ride-actions">
              {selectedOption.tips.map((tip, index) => {
                const checkId = getCheckId(index);

                const isComplete =
                  completedChecks.includes(checkId);

                return (
                  <button
                    key={checkId}
                    type="button"
                    className={`mt-ride-action ${
                      isComplete ? "completed" : ""
                    }`}
                    onClick={() => toggleCheck(index)}
                    aria-pressed={isComplete}
                  >
                    <span className="mt-ride-action-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span
                      className="mt-ride-checkbox"
                      aria-hidden="true"
                    >
                      {isComplete ? "✓" : ""}
                    </span>

                    <span className="mt-ride-action-text">
                      {tip}
                    </span>

                    <span
                      role="button"
                      tabIndex={0}
                      className="mt-ride-ask-ai-btn"
                      title="Ask AI Copilot for advice on this"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAiTopicPrompt(tip);
                        setActiveView("copilot");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          setAiTopicPrompt(tip);
                          setActiveView("copilot");
                        }
                      }}
                    >
                      <Sparkles size={10} />
                      <span>Ask AI</span>
                    </span>

                    <span
                      className="mt-ride-action-arrow"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </>
        )}

        {/* Quick assistance */}

        <section className="mt-ride-quick">
          <div className="mt-ride-quick-heading">
            <span>QUICK ASSISTANCE</span>

            <h3>
              Before you
              <br />
              ride.
            </h3>
          </div>

          <div className="mt-ride-quick-grid">
            <article className="mt-ride-quick-card">
              <span>01</span>
              <h4>DOCUMENTS</h4>
              <p>
                Keep your licence, registration and insurance
                documents accessible.
              </p>
            </article>

            <article className="mt-ride-quick-card">
              <span>02</span>
              <h4>RIDING GEAR</h4>
              <p>
                Prepare your helmet, gloves, jacket and
                protective equipment.
              </p>
            </article>

            <article className="mt-ride-quick-card">
              <span>03</span>
              <h4>MOTORCYCLE</h4>
              <p>
                Inspect tyres, brakes, lights, chain and
                essential fluid levels.
              </p>
            </article>

            <article className="mt-ride-quick-card">
              <span>04</span>
              <h4>EMERGENCY CONTACT</h4>
              <p>
                Share your planned route and expected arrival
                with someone you trust.
              </p>
            </article>
          </div>
        </section>

        {/* Footer */}

        <footer className="mt-ride-footer">
          <span>MOTOTRIBE RIDE ASSISTANT</span>
          <p>Ride prepared. Ride aware. Ride together.</p>
        </footer>

      </div>
    </section>
  );
}
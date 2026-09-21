import React, { useState, useRef, useEffect } from "react";
import {
  askProfessorAI,
  getActiveGeminiApiKey,
  setActiveGeminiApiKey,
  getActiveGeminiModel,
  type ProfessorMessage,
} from "../services/professorAi";
import {
  Bot,
  Send,
  Trash2,
  Key,
  FileCode,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

// Suggested questions verified against feature/integration-final codebase
const SUGGESTED_QUESTIONS = [
  {
    category: "Rendimiento 60 FPS",
    question:
      "¿Cómo se desacopló la simulación a 60 FPS de React para evitar re-renders innecesarios?",
  },
  {
    category: "Rondas y Jefe Bonklord",
    question:
      "¿Cómo funciona la progresión de rondas infinitas y el escalado del jefe Bonklord cada 10 rondas?",
  },
  {
    category: "Escudos y Recuperación",
    question:
      "¿Cómo opera el sistema de absorción por escudo y los consumibles de recuperación?",
  },
  {
    category: "Audio Procedural",
    question:
      "¿Cómo se generaron los efectos de sonido usando la Web Audio API sin librerías externas?",
  },
  {
    category: "Integración n8n",
    question:
      "¿Cómo se envían los datos de la partida al webhook de n8n y cómo se clasifican las partidas?",
  },
  {
    category: "Física y Límite de Arena",
    question:
      "¿Cómo se resolvió la vibración de la cámara y la restricción circular de la arena sin muros físicos pesados?",
  },
];

const INITIAL_MESSAGES: ProfessorMessage[] = [
  {
    id: "welcome-msg",
    role: "assistant",
    content:
      "### 🎓 Respuesta corta para el profesor\n" +
      "Bienvenido al módulo de consulta técnica de BONKAGEDDON. Este asistente analiza en tiempo real el código fuente real del repositorio (React 19, Three.js, R3F, Rapier, Zustand, Web Audio API, n8n y JSON Server) para fundamentar cada respuesta con citas exactas de archivos y líneas.\n\n" +
      "### 🛠️ Explicación técnica\n" +
      "El motor local utiliza `import.meta.glob` de Vite para indexar y segmentar los archivos del proyecto con rangos de líneas. Cada pregunta evalúa la relevancia léxica y semántica del repositorio y suministra el contexto verificado a Google Gemini para contrastar hechos del código frente a teoría general.",
    timestamp: 0,
  },
];

export const ProfessorAI: React.FC = () => {
  const [messages, setMessages] = useState<ProfessorMessage[]>(INITIAL_MESSAGES);
  const messageIdCounter = useRef(1);

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // API Key State & Management
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => Boolean(getActiveGeminiApiKey()));
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState("");
  const activeModel = getActiveGeminiModel();

  // Expanded sources state map: messageId -> boolean
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const currentKey = getActiveGeminiApiKey();
    if (!currentKey) {
      setIsKeyModalOpen(true);
      return;
    }

    const userCount = messageIdCounter.current++;
    const userMessage: ProfessorMessage = {
      id: `user-${userCount}`,
      role: "user",
      content: text,
      timestamp: userCount,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await askProfessorAI(text, messages);

      const assistantCount = messageIdCounter.current++;
      const assistantMessage: ProfessorMessage = {
        id: `assistant-${assistantCount}`,
        role: "assistant",
        content: response.content,
        timestamp: assistantCount,
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al conectar con el asistente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES);
    setErrorMessage(null);
  };

  const handleSaveCustomKey = () => {
    setActiveGeminiApiKey(customKeyInput);
    setHasApiKey(Boolean(getActiveGeminiApiKey()));
    setIsKeyModalOpen(false);
    setCustomKeyInput("");
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const renderFormattedMarkdown = (content: string) => {
    // Split lines and render simple structured markdown elements
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        const title = line.replace("### ", "");
        const isExecutive = title.includes("Respuesta corta");
        return (
          <h3
            key={idx}
            style={{
              fontSize: "1.2rem",
              marginTop: idx === 0 ? 0 : "1.25rem",
              marginBottom: "0.5rem",
              color: isExecutive ? "var(--accent-energy)" : "var(--accent-warm)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {title}
          </h3>
        );
      }

      if (line.startsWith("⚠️")) {
        return (
          <div
            key={idx}
            className="glass-panel"
            style={{
              background: "rgba(255, 107, 53, 0.12)",
              border: "1px solid rgba(255, 107, 53, 0.35)",
              padding: "0.6rem 0.9rem",
              margin: "0.5rem 0",
              color: "var(--accent-orange)",
              fontSize: "0.9rem",
              borderRadius: "6px",
            }}
          >
            {line}
          </div>
        );
      }

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} style={{ marginLeft: "1.25rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
            {line.slice(2)}
          </li>
        );
      }

      if (line.trim() === "") {
        return <div key={idx} style={{ height: "0.5rem" }} />;
      }

      return (
        <p key={idx} style={{ marginBottom: "0.5rem", color: "var(--text-primary)", fontSize: "0.95rem" }}>
          {line}
        </p>
      );
    });
  };

  return (
    <main className="container" style={{ padding: "2rem 1.5rem 4rem" }}>
      {/* Page Header */}
      <header
        className="glass-panel"
        style={{
          padding: "1.5rem 2rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "12px",
              background: "rgba(35, 213, 255, 0.12)",
              border: "1px solid rgba(35, 213, 255, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bot size={28} color="var(--accent-energy)" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.8rem", color: "var(--text-primary)" }}>Profesor IA</h1>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
              Asistente de consulta técnica sobre la arquitectura y código de BONKAGEDDON
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* API Key Status Badge */}
          <button
            type="button"
            className="btn btn-outline"
            style={{
              fontSize: "0.8rem",
              padding: "0.45rem 0.85rem",
              borderColor: hasApiKey ? "rgba(74, 222, 128, 0.4)" : "rgba(255, 107, 53, 0.4)",
              color: hasApiKey ? "var(--accent-xp)" : "var(--accent-orange)",
            }}
            onClick={() => setIsKeyModalOpen(true)}
            title="Configurar clave de API de Gemini"
          >
            <Key size={14} />
            {hasApiKey ? "Gemini Conectado" : "Configurar API Key"}
          </button>

          {/* Clear History Button */}
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
            onClick={handleClearHistory}
            title="Reiniciar conversación"
          >
            <Trash2 size={14} />
            Limpiar conversación
          </button>
        </div>
      </header>

      {/* Suggested Questions Carousel / Grid */}
      <section style={{ marginBottom: "1.5rem" }} aria-label="Preguntas Frecuentes para el Profesor">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Sparkles size={16} color="var(--accent-warm)" />
          <span
            style={{
              fontSize: "0.82rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--accent-warm)",
              fontWeight: 700,
            }}
          >
            Preguntas sugeridas de evaluación
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {SUGGESTED_QUESTIONS.map((item, index) => (
            <button
              key={index}
              type="button"
              className="glass-panel"
              onClick={() => handleSend(item.question)}
              disabled={isLoading}
              style={{
                padding: "0.85rem 1rem",
                textAlign: "left",
                cursor: isLoading ? "not-allowed" : "pointer",
                background: "rgba(23, 29, 43, 0.65)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                transition: "all 0.15s ease",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = "var(--accent-energy)";
                  e.currentTarget.style.background = "rgba(35, 213, 255, 0.08)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.background = "rgba(23, 29, 43, 0.65)";
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "0.72rem",
                  color: "var(--accent-energy)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: "0.25rem",
                }}
              >
                {item.category}
              </span>
              <span style={{ fontSize: "0.86rem", color: "var(--text-primary)", lineHeight: 1.4 }}>
                {item.question}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Chat Feed */}
      <section
        className="glass-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "440px",
          padding: "1.5rem",
          marginBottom: "1.25rem",
          background: "rgba(15, 20, 32, 0.82)",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const sourcesOpen = Boolean(expandedSources[msg.id]);

            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                  width: "100%",
                }}
              >
                {/* Message Bubble */}
                <div
                  className="glass-panel"
                  style={{
                    maxWidth: "85%",
                    padding: "1.25rem 1.4rem",
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: isUser
                      ? "linear-gradient(135deg, rgba(35, 213, 255, 0.18), rgba(15, 20, 32, 0.95))"
                      : "rgba(23, 29, 43, 0.92)",
                    border: isUser
                      ? "1px solid rgba(35, 213, 255, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: isUser
                      ? "0 4px 20px rgba(35, 213, 255, 0.12)"
                      : "0 4px 20px rgba(0, 0, 0, 0.25)",
                  }}
                >
                  {/* Sender Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.6rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: isUser ? "var(--accent-energy)" : "var(--accent-warm)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {isUser ? (
                      <>
                        <span>Profesor / Evaluador</span>
                      </>
                    ) : (
                      <>
                        <Bot size={14} />
                        <span>Profesor IA — {activeModel}</span>
                      </>
                    )}
                  </div>

                  {/* Message Content */}
                  <div>{renderFormattedMarkdown(msg.content)}</div>

                  {/* Expandable "Archivos consultados" */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSources(msg.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--accent-energy)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <FileCode size={14} />
                        <span>
                          {sourcesOpen ? "Ocultar" : "Ver"} archivos consultados ({msg.sources.length}{" "}
                          fragmentos)
                        </span>
                        {sourcesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {sourcesOpen && (
                        <div
                          style={{
                            marginTop: "0.75rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                          }}
                        >
                          {msg.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              style={{
                                background: "rgba(8, 11, 18, 0.75)",
                                border: "1px solid rgba(35, 213, 255, 0.2)",
                                borderRadius: "6px",
                                padding: "0.6rem 0.8rem",
                                fontSize: "0.8rem",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "0.3rem",
                                  color: "var(--accent-energy)",
                                }}
                              >
                                <span>{src.filePath}</span>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                  Líneas {src.startLine}–{src.endLine}
                                </span>
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  color: "var(--text-secondary)",
                                  fontSize: "0.75rem",
                                  whiteSpace: "pre-wrap",
                                  overflowX: "auto",
                                  maxHeight: "120px",
                                }}
                              >
                                {src.preview}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 0" }}>
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
              <span style={{ fontSize: "0.88rem", color: "var(--accent-energy)" }}>
                Indexando contexto del código y consultando a Gemini...
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              className="glass-panel"
              style={{
                padding: "1rem 1.25rem",
                background: "rgba(255, 59, 92, 0.12)",
                border: "1px solid rgba(255, 59, 92, 0.4)",
                color: "var(--accent-danger)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.9rem",
              }}
            >
              <AlertTriangle size={18} />
              <div style={{ flex: 1 }}>{errorMessage}</div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                onClick={() => setErrorMessage(null)}
              >
                Cerrar
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </section>

      {/* Query Input Section */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="glass-panel"
        style={{
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "rgba(23, 29, 43, 0.9)",
          border: "1px solid rgba(35, 213, 255, 0.3)",
          boxShadow: "0 0 25px rgba(35, 213, 255, 0.15)",
        }}
      >
        <textarea
          ref={inputRef}
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Formula una pregunta técnica sobre BONKAGEDDON (Enter para enviar)..."
          rows={2}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "0.95rem",
            fontFamily: "var(--font-display)",
            resize: "none",
          }}
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !inputQuery.trim()}
          style={{
            padding: "0.75rem 1.25rem",
            opacity: isLoading || !inputQuery.trim() ? 0.6 : 1,
            cursor: isLoading || !inputQuery.trim() ? "not-allowed" : "pointer",
          }}
        >
          <Send size={16} />
          Enviar
        </button>
      </form>

      {/* Key Configuration Modal */}
      {isKeyModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 7, 12, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: "1.5rem",
          }}
          role="dialog"
          aria-label="Configuración de Google Gemini API Key"
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: "540px",
              width: "100%",
              padding: "2rem",
              border: "1px solid rgba(35, 213, 255, 0.35)",
              boxShadow: "0 0 45px rgba(35, 213, 255, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <Key size={24} color="var(--accent-energy)" />
              <h2 style={{ fontSize: "1.4rem", color: "var(--text-primary)" }}>
                Configuración de Gemini API Key
              </h2>
            </div>

            {/* Security Notice per requirements */}
            <div
              className="glass-panel"
              style={{
                background: "rgba(255, 176, 32, 0.1)",
                border: "1px solid rgba(255, 176, 32, 0.3)",
                padding: "0.85rem",
                borderRadius: "8px",
                marginBottom: "1.25rem",
                display: "flex",
                gap: "0.6rem",
                alignItems: "flex-start",
              }}
            >
              <ShieldAlert size={18} color="var(--accent-warm)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                <strong>Aviso de seguridad:</strong> En aplicaciones frontend cliente (SPA con Vite), las
                variables <code>VITE_*</code> y las claves ingresadas en el navegador se ejecutan en el cliente
                y quedan expuestas en DevTools/red. Para demostraciones académicas, se recomienda configurar{" "}
                <code>.env.local</code> (ignorado por Git) o ingresar una clave temporal para la sesión.
              </p>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="gemini-api-key-input"
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.4rem",
                  fontWeight: 600,
                }}
              >
                Clave de API de Gemini (Google AI Studio)
              </label>
              <input
                id="gemini-api-key-input"
                type="password"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(15, 20, 32, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "6px",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-mono)",
                  outline: "none",
                }}
              />
              <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Modelo activo: <code>{activeModel}</code>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsKeyModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCustomKey}
              >
                Guardar Clave
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

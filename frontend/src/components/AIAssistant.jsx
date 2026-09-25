import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import { askAssistant, fetchProjects, fetchTeams } from '../api/client'

// Simulated "thinking" pause before the (heuristic) answer — mimics a real
// LLM round-trip until the backend AI endpoint ships (see askAssistant).
const THINKING_DELAY_MS = 600
// Short pause so the confirmation reply lands before the panel closes and
// the user is handed off to /projects with the parsed prefill.
const HANDOFF_DELAY_MS = 700

const GREETING = {
  role: 'assistant',
  text: 'Hi! I\'m the NeuroForge assistant.\n\nTry "Create a project called Apollo for team Product Engineering, due in 3 weeks" — or ask "Which sprints are at risk?" / "How many active projects do we have?"',
}

/**
 * Floating AI Assistant: an ember round button pinned bottom-right toggles a
 * slide-up chat panel (dark forge theme). Answers come from the askAssistant()
 * heuristic in client.js — this component only caches the projects/teams
 * context it needs, renders the conversation, and hands CREATE_PROJECT
 * prefills off to /projects via router state.
 */
export default function AIAssistant() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  // Fetched once on mount — askAssistant reads this instead of refetching.
  const [context, setContext] = useState({ projects: [], teams: [] })

  const listRef = useRef(null)
  const inputRef = useRef(null)

  // Cache projects & teams once — the context askAssistant answers from.
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchProjects().catch(() => []), fetchTeams().catch(() => [])]).then(
      ([projects, teams]) => {
        if (!cancelled) setContext({ projects: projects || [], teams: teams || [] })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Keep the newest message in view.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, thinking, open])

  // Focus the composer when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function handleSend(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text || thinking) return

    setInput('')
    setMessages((current) => [...current, { role: 'user', text }])
    setThinking(true)

    // Simulated thinking pause — swap for a real backend round-trip later.
    await new Promise((resolve) => setTimeout(resolve, THINKING_DELAY_MS))

    let answer
    try {
      answer = await askAssistant(text, context)
    } catch {
      answer = { type: 'ANSWER', reply: 'Something went wrong on my side — try again in a moment.' }
    }

    setMessages((current) => [...current, { role: 'assistant', text: answer.reply }])
    setThinking(false)

    if (answer.type === 'CREATE_PROJECT') {
      // Let the confirmation land, then close and hand off with the prefill.
      setTimeout(() => {
        setOpen(false)
        navigate('/projects', { state: { aiPrefill: answer.prefill } })
      }, HANDOFF_DELAY_MS)
    }
  }

  return (
    <>
      {/* Slide-up chat panel — kept mounted so the conversation survives toggling */}
      <section
        aria-label="NeuroForge Assistant"
        aria-hidden={!open}
        inert={!open}
        className={`fixed bottom-24 right-4 z-50 flex h-[26rem] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-forge-700 bg-forge-900 shadow-2xl shadow-black/50 transition-all duration-200 sm:right-6 ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-2.5 border-b border-forge-700/70 px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ember-500/15 text-ember-400">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold text-forge-text">NeuroForge Assistant</h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-forge-faint">
              Heuristic · runs locally
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-forge-muted transition hover:bg-forge-800 hover:text-forge-text"
          >
            ✕
          </button>
        </header>

        {/* Messages — user right, assistant left */}
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-br-md border border-ember-500/25 bg-ember-500/15 text-forge-text'
                    : 'rounded-bl-md border border-forge-700/70 bg-forge-850 text-forge-muted'
                }`}
              >
                {message.text}
              </p>
            </div>
          ))}

          {/* Typing indicator — three pulsing dots */}
          {thinking ? (
            <div className="flex justify-start">
              <div
                role="status"
                aria-label="Assistant is thinking"
                className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-forge-700/70 bg-forge-850 px-4 py-3"
              >
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-400"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="flex shrink-0 items-center gap-2 border-t border-forge-700/70 p-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask me anything…"
            aria-label="Message the assistant"
            className="nf-input flex-1 py-2"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send message"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ember-500 text-forge-950 transition hover:bg-ember-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </section>

      {/* Floating trigger — fixed bottom-right, clear of the sidebar */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Close NeuroForge Assistant' : 'Open NeuroForge Assistant'}
        title="NeuroForge Assistant"
        className="fixed bottom-6 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-ember-500 text-forge-950 shadow-lg shadow-ember-500/30 transition hover:scale-105 hover:bg-ember-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/60 sm:right-6"
      >
        <Sparkles className="h-6 w-6" aria-hidden />
      </button>
    </>
  )
}

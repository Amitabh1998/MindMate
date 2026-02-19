// client/src/components/ChatAssistant.tsx
import { chatAssistantStream, getChatHistory, type ChatMsg } from "../lib/api";

type Props = { className?: string };

const INTRO_MSG: ChatMsg = {
  role: "assistant",
  content:
    "Hi, I’m here with you. How are you feeling? You can tell me anything—short and simple is perfect.",
};

export default function ChatAssistant({ className = "" }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const assistantIndexRef = useRef<number>(-1);

  // Load history (or intro) on mount
  useEffect(() => {
    let alive = true;
    getChatHistory()
      .then(({ messages }) => {
        if (!alive) return;
        setMessages(Array.isArray(messages) && messages.length ? messages : [INTRO_MSG]);
      })
      .catch(() => setMessages([INTRO_MSG]));
    return () => {
      alive = false;
    };
  }, []);

  // Auto-scroll to last message
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    // Append user + placeholder assistant; keep index in a ref
    setMessages((prev) => {
      const next: ChatMsg[] = [
        ...prev,
        { role: "user" as const, content: text },
        { role: "assistant" as const, content: "" },
      ];
      assistantIndexRef.current = next.length - 1;
      return next;
    });

    try {
      // Use existing history + the new user message for context
      const history: ChatMsg[] = [...messages, { role: "user" as const, content: text }];
      await chatAssistantStream(history, (token) => {
        // Append streamed tokens WITHOUT trimming so spaces/newlines are preserved
        setMessages((cur) => {
          const idx = assistantIndexRef.current;
          if (idx < 0 || idx >= cur.length) return cur;
          if (cur[idx].role !== "assistant") return cur;
          const updated = [...cur];
          updated[idx] = { role: "assistant", content: updated[idx].content + token };
          return updated;
        });
      });
      // Pair is persisted server-side; no extra call required
    } catch {
      // Fallback message on error
      setMessages((cur) => {
        const idx = assistantIndexRef.current;
        if (idx < 0 || idx >= cur.length) return cur;
        const updated = [...cur];
        updated[idx] = {
          role: "assistant",
          content:
            "I couldn’t reach the assistant just now. Let’s try a 4–4 breath together: inhale 4, exhale 4, for 5 rounds.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([
      {
        role: "assistant",
        content:
          "Resetting our chat. What’s on your mind? I’m here to support you with gentle, practical suggestions.",
      },
    ]);
    assistantIndexRef.current = -1;
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-base font-semibold">AI Assistant</h3>
        <button onClick={reset} className="text-xs text-indigo-700 hover:underline">
          Reset
        </button>
      </div>

      <div ref={scrollerRef} className="h-72 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={[
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap",
                m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800",
              ].join(" ")}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-slate-500">Assistant is typing…</div>}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          Send
        </button>
      </div>

      <p className="px-4 pb-3 text-[11px] leading-5 text-slate-500">
        This assistant is not a substitute for professional help. If you’re in crisis, call your local emergency number
        or a helpline in your region.
      </p>
    </div>
  );
}

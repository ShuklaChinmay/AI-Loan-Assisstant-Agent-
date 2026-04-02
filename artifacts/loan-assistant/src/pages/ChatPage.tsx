import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSendChatMessage, useGetChatHistory, getGetChatHistoryQueryKey, useResetChat } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

type AgentType = "master" | "sales" | "verification" | "underwriting" | "sanction" | "locking";

const agentColors: Record<AgentType, string> = {
  master: "bg-primary/20 text-primary border-primary/30",
  sales: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  verification: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
  underwriting: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400",
  sanction: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400",
  locking: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400",
};

const agentLabels: Record<AgentType, string> = {
  master: "Master Agent",
  sales: "Sales Agent",
  verification: "Verification Agent",
  underwriting: "Underwriting Agent",
  sanction: "Sanction Agent",
  locking: "Locking Agent",
};

interface ChatMessageUI {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentType?: AgentType;
  options?: string[];
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ChatPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const sendMessage = useSendChatMessage();
  const resetChat = useResetChat();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      handleSend("hello");
    }
  }, [sessionId]);

  const handleSend = (msg?: string) => {
    const text = (msg ?? input).trim();
    if (!text) return;
    if (!msg) setInput("");

    const userMsg: ChatMessageUI = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    if (!msg) {
      setMessages(prev => [...prev, userMsg]);
    }

    sendMessage.mutate(
      { data: { message: text, sessionId } },
      {
        onSuccess: (res) => {
          if (!msg) {
          }
          const assistantMsg: ChatMessageUI = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: res.response,
            agentType: res.agentType as AgentType,
            options: res.options ?? undefined,
          };
          setMessages(prev => {
            const withUser = msg ? prev : prev;
            return [...withUser, assistantMsg];
          });
        },
      }
    );
  };

  const handleOptionClick = (option: string) => {
    const userMsg: ChatMessageUI = {
      id: Date.now().toString(),
      role: "user",
      content: option,
    };
    setMessages(prev => [...prev, userMsg]);
    handleSend(option);
  };

  const handleReset = () => {
    resetChat.mutate(undefined as unknown as void);
    setMessages([]);
    const newId = generateSessionId();
    setSessionId(newId);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot size={18} className="text-primary" />
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">AI Loan Assistant</div>
            <div className="text-xs text-muted-foreground">Multi-agent guided loan application</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} disabled={resetChat.isPending} data-testid="button-reset-chat">
          <RefreshCw size={14} className="mr-1.5" />
          New Session
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted border border-border"
              )}>
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} className="text-primary" />}
              </div>
              <div className={cn("space-y-1.5 max-w-[75%]", msg.role === "user" ? "items-end" : "items-start")} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.agentType && (
                  <Badge className={cn("text-[10px] px-2 py-0.5 border", agentColors[msg.agentType] ?? agentColors.master)}>
                    {agentLabels[msg.agentType]}
                  </Badge>
                )}
                <div className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border text-card-foreground rounded-tl-sm"
                )}>
                  {msg.content}
                </div>
                {msg.options && msg.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleOptionClick(option)}
                        className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                        data-testid={`button-option-${option.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted border border-border flex-shrink-0 flex items-center justify-center">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">Agent is responding...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-background px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            className="flex-1"
            disabled={sendMessage.isPending}
            data-testid="input-chat-message"
          />
          <Button
            onClick={() => handleSend()}
            disabled={sendMessage.isPending || !input.trim()}
            size="default"
            data-testid="button-send"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

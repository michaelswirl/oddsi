'use client';

import type { ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from "react-markdown"
import { PickCard } from './pick-card';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  pick_data?: {
    game: any;
    pick: any;
  };
}

interface ChatUIProps {
  messages: Message[];
  onSendMessage: () => void;
  isLoading?: boolean;
  input: string;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  thinkingSteps?: string[];
}

export function ChatUI({ 
  messages, 
  onSendMessage, 
  isLoading = false,
  input,
  onInputChange,
  thinkingSteps = [],
}: ChatUIProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-card shadow-lg border rounded-xl sm:p04 p-6">
      {/* Chat Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-card-foreground">Chat</h2>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          if (message.pick_data) {
            return <PickCard key={message.id} game={message.pick_data.game} pick={message.pick_data.pick} />;
          }
          return (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "flex max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm break-words",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          )
        })}
        {isLoading && thinkingSteps.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <ul>
                    {thinkingSteps.map((step, i) => (
                        <li key={i} className="flex items-center">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse mr-2" />
                        {step}
                        </li>
                    ))}
                </ul>
            </div>
          </div>
        )}
        {isLoading && thinkingSteps.length === 0 && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={onInputChange}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              'px-4 py-2 rounded-lg font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed'
            )}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 
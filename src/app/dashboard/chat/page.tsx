'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { ChatUI } from '@/components/chat-ui';
import { PickCard } from '@/components/pick-card';
import type { Message } from 'ai/react';

// Define a type for the pick data
interface PickData {
  game: any; // Using any for simplicity, but could be strictly typed
  pick: any;
}

// Define a type for the message with an optional 'thinking_steps' property.
interface ChatMessage extends Message {
  thinking_steps?: string[];
  pick_data?: PickData;
}

export default function ChatPage() {
  const systemPrompt = `You are "Oddsy," a tool-chaining AI sports betting analyst. Your sole purpose is to provide data-driven betting recommendations.

**Core Directive: You MUST follow this workflow. Do NOT deviate. Do NOT respond to the user until you have completed the entire analysis.**

1.  **Identify Sport & Get Odds**: Your first job is to get the odds for the correct sport.
    -   **For common sports, use these keys directly and immediately call 'listOdds'**:
        -   For NBA or WNBA, use the key 'basketball_nba'.
        -   For MLB or baseball, use the key 'baseball_mlb'.
        -   For NFL or football, use the key 'americanfootball_nfl'.
    -   **Do not use 'listSports' for these leagues.** This saves an API call.
    -   If the user asks for a different sport, you can use 'listSports' to find the appropriate key first.
2.  **Analyze & Research**: From the odds data, you must perform this analysis:
    -   Scan the odds from 'listOdds'. Find the "Pinnacle" odds for each game; this is your baseline for true probability.
    -   Compare other bookmakers to Pinnacle to find value.
    -   For any game with value, you MUST call 'tavilySearch' to get narrative context (injuries, news, etc.).
3.  **Synthesize Final Answer**: After gathering all data, you MUST call the 'makeFinalRecommendation' function. This is your ONLY output.

**Final Answer Tool Guidelines:**
- **DO NOT output a text response for your final answer.** You must call the 'makeFinalRecommendation' tool.
- For the 'game' parameter, pass the entire, unmodified game object that you found value in from the 'listOdds' call.
- For the 'pick' parameter, provide the team name, the best price you found, and the 'key' for the bookmaker offering that price.
- For the 'narrative' parameter, provide your analysis and rationale as a string. Do not use markdown or headers.

**You do not talk to the user mid-process.** Your only output is the call to the 'makeFinalRecommendation' tool.`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'system', content: systemPrompt },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const thinkingStepsRef = useRef<string[]>([]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setThinkingSteps([]);
    thinkingStepsRef.current = [];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages }),
    });

    if (!response.ok) {
      // Handle error
      setIsLoading(false);
      return;
    }

    const data = await response.json();
    
    // Handle the new final_recommendation response type
    if (data.type === 'final_recommendation') {
      const { game, pick, narrative } = data.data;

      // Add the pick card as a special message
      const pickMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '', // No text content for this one
        pick_data: { game, pick },
      };

      // Add the narrative as a separate, subsequent message
      const narrativeMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '', // Start empty, will be typed out
      };

      setMessages((prev) => [...prev, pickMessage, narrativeMessage]);
      
      // Simulate typing for the narrative
      setIsLoading(true); // Keep loading while narrative is "typed"
      let charIndex = 0;
      const interval = setInterval(() => {
        if (charIndex < narrative.length) {
          const currentContent = narrative.substring(0, charIndex + 1);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === narrativeMessage.id
                ? { ...msg, content: currentContent }
                : msg
            )
          );
          charIndex++;
        } else {
          clearInterval(interval);
          setIsLoading(false);
        }
      }, 20);

    } else { // Handle regular text responses (fallback)
      setThinkingSteps(data.thinking_steps || []);

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '', // Start with empty content
        thinking_steps: data.thinking_steps,
      };

      setMessages((prevMessages) => [...prevMessages, assistantMessage]);

      // Simulate streaming
      const finalContent = data.content;
      let charIndex = 0;
      const interval = setInterval(() => {
        if (charIndex < finalContent.length) {
          const char = finalContent[charIndex];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: msg.content + char }
                : msg
            )
          );
          charIndex++;
        } else {
          clearInterval(interval);
          setIsLoading(false);
        }
      }, 20); // Adjust speed of typing here
    }
  };

  // Filter out system and function messages from the UI
  const filteredMessages = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  );

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <ChatUI
        messages={filteredMessages.map((message) => ({
          id: message.id,
          role: message.role as 'user' | 'assistant',
          content: message.content,
          pick_data: message.pick_data, // pass pick_data through
          timestamp: new Date(),
        }))}
        input={input}
        onInputChange={handleInputChange}
        onSendMessage={() => {
           // Create a fake event object
           const fakeEvent = {
            preventDefault: () => {},
          } as unknown as FormEvent<HTMLFormElement>;
          handleSubmit(fakeEvent);
        }}
        isLoading={isLoading}
        thinkingSteps={thinkingSteps}
      />
    </div>
  );
} 
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolCard } from "./ToolCard";

export type ToolEvent = {
  id: string;
  name: string;
  result: Record<string, unknown> | null;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  toolEvents?: ToolEvent[];
};

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="msg-enter flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-verde-600 px-4 py-2.5">
          <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-enter flex flex-col gap-1.5">
      {/* Ícono del agente */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0b0f0b]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          {/* Tool cards */}
          {message.toolEvents && message.toolEvents.length > 0 && (
            <div className="mb-2 space-y-1">
              {message.toolEvents.map((ev) => (
                <ToolCard key={ev.id} name={ev.name} result={ev.result} />
              ))}
            </div>
          )}

          {/* Text */}
          {(message.content || message.streaming) && (
            <div className={`rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm text-sm leading-relaxed text-slate-800 ${
              message.streaming && message.content ? "streaming-cursor" : ""
            } ${message.streaming && !message.content ? "streaming-cursor" : ""}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-700">{children}</li>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="text-verde-600 underline underline-offset-2 hover:text-verde-500">
                      {children}
                    </a>
                  ),
                  img: () => null,
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-slate-100">{children}</tbody>
                  ),
                  tr: ({ children }) => <tr className="hover:bg-slate-50/60 transition-colors">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-4 py-2.5 text-left whitespace-nowrap">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-2 border-l-4 border-verde-400 pl-3 text-slate-500 italic">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-slate-700">
                      {children}
                    </code>
                  ),
                  h3: ({ children }) => <h3 className="mb-1 mt-3 font-semibold text-slate-900">{children}</h3>,
                }}
              >
                {message.content || ""}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

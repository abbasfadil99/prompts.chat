"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Param {
  name: string;
  in: "query" | "body" | "path";
  type: string;
  required?: boolean;
  description: string;
}

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  auth?: boolean;
  params?: Param[];
  body?: Param[];
  responseExample?: string;
}

interface Group {
  title: string;
  endpoints: Endpoint[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  POST: "bg-green-500/15 text-green-600 border-green-500/30",
  PUT: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  PATCH: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  DELETE: "bg-red-500/15 text-red-600 border-red-500/30",
};

const GROUPS: Group[] = [
  {
    title: "Prompts",
    endpoints: [
      {
        method: "GET",
        path: "/api/prompts",
        summary: "List public prompts with pagination and filters",
        params: [
          { name: "page", in: "query", type: "number", description: "Page number (default: 1)" },
          { name: "limit", in: "query", type: "number", description: "Results per page (max 50)" },
          { name: "categoryId", in: "query", type: "string", description: "Filter by category ID" },
          { name: "type", in: "query", type: "string", description: "TEXT | IMAGE | VIDEO | AUDIO | SKILL | TASTE" },
          { name: "q", in: "query", type: "string", description: "Full-text search query" },
        ],
        responseExample: `{
  "prompts": [{ "id": "...", "title": "...", "slug": "..." }],
  "total": 1234,
  "page": 1,
  "pages": 25
}`,
      },
      {
        method: "POST",
        path: "/api/prompts",
        summary: "Create a new prompt",
        auth: true,
        body: [
          { name: "title", in: "body", type: "string", required: true, description: "Prompt title (max 200)" },
          { name: "content", in: "body", type: "string", required: true, description: "Prompt body" },
          { name: "type", in: "body", type: "string", required: true, description: "TEXT | IMAGE | VIDEO | AUDIO | SKILL | TASTE" },
          { name: "isPrivate", in: "body", type: "boolean", required: true, description: "Visibility" },
          { name: "categoryId", in: "body", type: "string", description: "Category ID" },
          { name: "tagIds", in: "body", type: "string[]", required: true, description: "Array of tag IDs" },
          { name: "description", in: "body", type: "string", description: "Short description (max 500)" },
        ],
      },
      {
        method: "GET",
        path: "/api/prompts/[id]",
        summary: "Get a prompt by ID",
        params: [
          { name: "id", in: "path", type: "string", required: true, description: "Prompt ID" },
        ],
      },
      {
        method: "PATCH",
        path: "/api/prompts/[id]",
        summary: "Update a prompt (owner only)",
        auth: true,
        params: [{ name: "id", in: "path", type: "string", required: true, description: "Prompt ID" }],
      },
      {
        method: "DELETE",
        path: "/api/prompts/[id]",
        summary: "Delete a prompt (owner or admin)",
        auth: true,
        params: [{ name: "id", in: "path", type: "string", required: true, description: "Prompt ID" }],
      },
      {
        method: "GET",
        path: "/api/prompts/search",
        summary: "Search prompts by title, description or content",
        params: [
          { name: "q", in: "query", type: "string", required: true, description: "Search term (min 2 chars)" },
          { name: "limit", in: "query", type: "number", description: "Max results (default 10, max 50)" },
          { name: "searchIn", in: "query", type: "string", description: '"title" (default) or "all" to search content too' },
          { name: "ownerOnly", in: "query", type: "boolean", description: "Restrict to your own prompts" },
        ],
        responseExample: `{ "prompts": [{ "id": "...", "title": "...", "slug": "..." }] }`,
      },
    ],
  },
  {
    title: "Users",
    endpoints: [
      {
        method: "GET",
        path: "/api/users/[username]/follow",
        summary: "Get follow status and counts for a user",
        params: [{ name: "username", in: "path", type: "string", required: true, description: "Target username" }],
        responseExample: `{ "followersCount": 42, "followingCount": 12, "isFollowing": false }`,
      },
      {
        method: "POST",
        path: "/api/users/[username]/follow",
        summary: "Follow a user",
        auth: true,
        params: [{ name: "username", in: "path", type: "string", required: true, description: "Target username" }],
        responseExample: `{ "following": true }`,
      },
      {
        method: "DELETE",
        path: "/api/users/[username]/follow",
        summary: "Unfollow a user",
        auth: true,
        params: [{ name: "username", in: "path", type: "string", required: true, description: "Target username" }],
        responseExample: `{ "following": false }`,
      },
    ],
  },
  {
    title: "Categories & Tags",
    endpoints: [
      {
        method: "GET",
        path: "/api/categories",
        summary: "List all categories with prompt counts",
        responseExample: `[{ "id": "...", "name": "Writing", "slug": "writing", "promptCount": 120 }]`,
      },
    ],
  },
  {
    title: "Authentication",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/forgot-password",
        summary: "Send a password reset email",
        body: [{ name: "email", in: "body", type: "string", required: true, description: "Account email address" }],
        responseExample: `{ "message": "If an account with that email exists, a reset link has been sent." }`,
      },
      {
        method: "POST",
        path: "/api/auth/reset-password",
        summary: "Reset password with a valid token",
        body: [
          { name: "token", in: "body", type: "string", required: true, description: "Token from the reset email" },
          { name: "password", in: "body", type: "string", required: true, description: "New password (min 8 chars)" },
        ],
        responseExample: `{ "message": "Password updated successfully." }`,
      },
    ],
  },
  {
    title: "Notifications (SSE)",
    endpoints: [
      {
        method: "GET",
        path: "/api/notifications/stream",
        summary: "Server-Sent Events stream for real-time notifications",
        auth: true,
        responseExample: `// event: message
data: {
  "type": "update",
  "pendingChangeRequests": 2,
  "unreadComments": 5,
  "commentNotifications": [...]
}`,
      },
      {
        method: "GET",
        path: "/api/user/notifications",
        summary: "Fetch current unread notifications (REST fallback)",
        auth: true,
      },
      {
        method: "POST",
        path: "/api/user/notifications",
        summary: "Mark notifications as read",
        auth: true,
        body: [{ name: "notificationIds", in: "body", type: "string[]", description: "IDs to mark read; omit to mark all" }],
      },
    ],
  },
  {
    title: "Analytics",
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/analytics",
        summary: "30-day platform analytics (admin only)",
        auth: true,
        responseExample: `{
  "dailyData": [{ "day": "2026-05-01", "prompts": 12, "users": 3 }],
  "topCategories": [{ "name": "Writing", "count": 420 }],
  "promptTypeBreakdown": [{ "type": "TEXT", "count": 5000 }],
  "totals": { "votes": 18420, "views": 204000 }
}`,
      },
    ],
  },
];

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const allParams = [...(ep.params ?? []), ...(ep.body ?? [])];

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className={cn("shrink-0 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border", METHOD_COLORS[ep.method])}>
          {ep.method}
        </span>
        <code className="font-mono text-sm text-foreground flex-1">{ep.path}</code>
        {ep.auth && (
          <span className="text-[10px] text-muted-foreground border rounded px-1 py-0.5 shrink-0">auth</span>
        )}
        <svg
          className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
          <p className="text-sm text-muted-foreground">{ep.summary}</p>

          {allParams.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Parameters</p>
              <div className="space-y-1.5">
                {allParams.map((p) => (
                  <div key={p.name} className="flex flex-wrap items-start gap-2 text-sm">
                    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">{p.name}</code>
                    <Badge variant="outline" className="text-[10px] py-0 shrink-0">{p.in}</Badge>
                    <Badge variant="outline" className="text-[10px] py-0 font-mono shrink-0">{p.type}</Badge>
                    {p.required && <Badge variant="destructive" className="text-[10px] py-0 shrink-0">required</Badge>}
                    <span className="text-muted-foreground text-xs">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ep.responseExample && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">Response</p>
              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                {ep.responseExample}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiReference() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">REST API Reference</h2>
        <p className="text-sm text-muted-foreground">
          Base URL: <code className="font-mono bg-muted px-1 rounded">{typeof window !== "undefined" ? window.location.origin : "https://prompts.chat"}</code>.
          Authenticated endpoints require a valid session cookie or API key via{" "}
          <code className="font-mono bg-muted px-1 rounded">Authorization: Bearer &lt;api-key&gt;</code>.
        </p>
      </div>
      {GROUPS.map((g) => (
        <section key={g.title}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{g.title}</h3>
          <div className="space-y-2">
            {g.endpoints.map((ep) => (
              <EndpointCard key={ep.method + ep.path} ep={ep} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

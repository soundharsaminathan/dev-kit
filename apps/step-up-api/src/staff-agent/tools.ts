import type { GroqToolDefinition } from "./groq.client";

export const STAFF_AGENT_TOOLS: GroqToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_people",
      description:
        "Search studio students and leads by name or phone. Call this before mutating an existing person.",
      parameters: {
        type: "object",
        properties: {
          q: {
            type: "string",
            description: "Name or phone substring to search",
          },
        },
        required: ["q"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_trial_slots",
      description: "List upcoming trial session slots for the studio.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_batches",
      description: "List active batches in the studio (id and name).",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Optional batch name filter",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description:
        "Create a new lead (trial caller contact). For voice turns, confirm the phone digits with the staff user before calling.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          ageRange: {
            type: "string",
            enum: [
              "UNDER_10",
              "TEN_TO_TWENTY",
              "TWENTY_TO_FORTY",
              "FORTY_PLUS",
            ],
          },
          sessionId: {
            type: "string",
            description: "Optional trial session id from list_trial_slots",
          },
        },
        required: ["name", "phone", "ageRange"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_student",
      description:
        "Create a full student with login credentials. Does not enroll into a paid plan.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          gender: { type: "string", enum: ["FEMALE", "MALE"] },
          phone: { type: "string" },
          ageRange: {
            type: "string",
            enum: [
              "UNDER_10",
              "TEN_TO_TWENTY",
              "TWENTY_TO_FORTY",
              "FORTY_PLUS",
            ],
          },
        },
        required: ["name", "email", "gender", "ageRange"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_remark",
      description: "Add a CRM remark/comment on a lead or student.",
      parameters: {
        type: "object",
        properties: {
          studentId: { type: "string" },
          body: { type: "string", maxLength: 2000 },
        },
        required: ["studentId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_trial",
      description: "Book a PENDING trial session for a student/lead.",
      parameters: {
        type: "object",
        properties: {
          studentId: { type: "string" },
          sessionId: { type: "string" },
        },
        required: ["studentId", "sessionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "switch_trial",
      description: "Move an existing trial booking to a different session.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string" },
          sessionId: { type: "string" },
        },
        required: ["bookingId", "sessionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_trial",
      description:
        "Mark a trial booking as CONFIRMED (staff called and confirmed).",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string" },
        },
        required: ["bookingId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_active",
      description:
        "Archive (active=false) or unarchive (active=true) a lead/student. Requires confirm=true after staff confirmation.",
      parameters: {
        type: "object",
        properties: {
          studentId: { type: "string" },
          active: { type: "boolean" },
          confirm: {
            type: "boolean",
            description: "Must be true after the staff user confirms",
          },
        },
        required: ["studentId", "active", "confirm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "switch_batch",
      description:
        "Move an enrolled student from one batch to another. Requires confirm=true. Uses the student's current ACTIVE enrollment as the source batch when fromBatchId is omitted.",
      parameters: {
        type: "object",
        properties: {
          studentId: { type: "string" },
          toBatchId: { type: "string" },
          fromBatchId: { type: "string" },
          endNote: { type: "string" },
          confirm: {
            type: "boolean",
            description: "Must be true after the staff user confirms",
          },
        },
        required: ["studentId", "toBatchId", "confirm"],
      },
    },
  },
];

export const STAFF_AGENT_SYSTEM_PROMPT = `You are the Step Up studio CRM assistant for OWNER/STAFF.
You help staff create leads and students, add remarks, book/switch/confirm trials, archive leads, and switch batches.

Rules:
- Use tools for all lookups and mutations. Never invent student IDs, session IDs, booking IDs, or batch IDs.
- Search people before acting on an existing person. If multiple matches, ask which one.
- For voice turns, read back phone digits and get confirmation before create_lead.
- Archive (set_active) and switch_batch require an explicit staff confirmation turn, then call with confirm=true.
- Do not enroll students into paid plans or pick subscriptions.
- Be concise and professional. After a successful mutation, summarize what changed.
- If a tool returns an error, explain it clearly and do not retry endlessly.`;

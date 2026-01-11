/* eslint-disable testing-library/no-node-access */
import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ChatInbox from "../ChatInbox";
import axiosClient from "../api/chatInboxApi";

jest.setTimeout(20000);

jest.mock("../hooks/useInboxSignalR", () => ({
  __esModule: true,
  default: () => ({ connection: null, isConnected: false }),
}));

jest.mock("../api/chatInboxApi", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  },
}));

function findAncestorClass(element, className) {
  let current = element;
  while (current && current !== document.body) {
    if (typeof current.className === "string" && current.className.includes(className)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

describe("ChatInbox smoke (feature-folder refactor wiring)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("businessId", "biz-1");
    localStorage.setItem("userId", "user-1");
    localStorage.setItem("userName", "Test User");
    localStorage.setItem("email", "test@example.com");

    Element.prototype.scrollIntoView = jest.fn();
  });

  it("renders, loads thread, keeps inbound/outbound alignment, and supports core actions", async () => {
    const nowIso = "2025-01-01T00:00:00.000Z";

    const conversations = [
      {
        id: "conv-1",
        contactId: "contact-1",
        contactName: "Alice",
        contactPhone: "+111",
        lastMessagePreview: "hi",
        lastMessageAt: nowIso,
        unreadCount: 0,
        status: "Open",
        numberId: "wa-1",
        numberLabel: "+91 98765 43210",
        within24h: true,
        assignedToUserId: null,
        assignedToUserName: null,
        isAssignedToMe: false,
        sourceType: "WhatsApp",
        sourceName: "WhatsApp",
        mode: "Live",
        firstSeenAt: nowIso,
        lastInboundAt: nowIso,
        lastOutboundAt: nowIso,
      },
      {
        id: "conv-2",
        contactId: "contact-2",
        contactName: "Bob",
        contactPhone: "+222",
        lastMessagePreview: "yo",
        lastMessageAt: nowIso,
        unreadCount: 2,
        status: "Open",
        numberId: "wa-1",
        numberLabel: "+91 98765 43210",
        within24h: true,
        assignedToUserId: null,
        assignedToUserName: null,
        isAssignedToMe: false,
        sourceType: "WhatsApp",
        sourceName: "WhatsApp",
        mode: "Live",
        firstSeenAt: nowIso,
        lastInboundAt: nowIso,
        lastOutboundAt: nowIso,
      },
    ];

    const messagesByPhone = {
      "+111": [],
      "+222": [
        {
          id: "m-in-1",
          isInbound: true,
          text: "Inbound hello",
          sentAtUtc: nowIso,
          status: "delivered",
        },
        {
          id: "m-out-1",
          isInbound: false,
          text: "Outbound hi",
          sentAtUtc: nowIso,
          status: "sent",
        },
      ],
    };

    const contactSummaryById = {
      "contact-1": {
        tags: [],
        recentNotes: [],
        nextReminder: null,
        recentTimeline: [],
      },
      "contact-2": {
        tags: [{ id: "t-1", name: "VIP", colorHex: "#EEF2FF" }],
        recentNotes: [],
        nextReminder: null,
        recentTimeline: [],
      },
    };

    axiosClient.get.mockImplementation(async (url, config) => {
      if (url === "/chat-inbox/conversations") return { data: conversations };

      if (url === "/chat-inbox/agents") {
        return {
          data: [
            { userId: "user-1", name: "Test User", email: "test@example.com", roleName: "Agent" },
            { userId: "user-2", name: "Agent Two", email: "agent2@example.com", roleName: "Agent" },
          ],
        };
      }

      if (url === "/chat-inbox/messages") {
        const phone = config?.params?.contactPhone;
        return { data: messagesByPhone[phone] ?? [] };
      }

      if (url.startsWith("/crm/contact-summary/")) {
        const contactId = url.split("/").pop();
        return { data: contactSummaryById[contactId] ?? null };
      }

      if (url === "/tags/get-tags") return { data: [{ id: "t-2", name: "NewTag" }] };

      throw new Error(`Unexpected GET ${url}`);
    });

    axiosClient.post.mockImplementation(async (url, payload) => {
      if (url === "/chat-inbox/mark-read") {
        for (const conv of conversations) {
          if (conv.contactId === payload.contactId) conv.unreadCount = 0;
        }
        return { data: {} };
      }

      if (url === "/chat-inbox/send-message") {
        return {
          data: {
            id: "m-out-sent",
            isInbound: false,
            text: payload.text,
            sentAtUtc: nowIso,
            status: "sent",
            errorMessage: null,
          },
        };
      }

      if (url === "/chat-inbox/assign") {
        for (const conv of conversations) {
          if (conv.contactId === payload.contactId) {
            conv.assignedToUserId = payload.userId;
            conv.assignedToUserName = payload.userId === "user-1" ? "Test User" : "Agent Two";
            conv.isAssignedToMe = payload.userId === "user-1";
          }
        }
        return { data: {} };
      }
      if (url === "/chat-inbox/unassign") {
        for (const conv of conversations) {
          if (conv.contactId === payload.contactId) {
            conv.assignedToUserId = null;
            conv.assignedToUserName = null;
            conv.isAssignedToMe = false;
          }
        }
        return { data: {} };
      }

      if (url === "/notes") {
        contactSummaryById[payload.contactId].recentNotes = [
          {
            id: "note-1",
            content: payload.content,
            createdAt: nowIso,
            createdByName: "Test User",
          },
        ];
        return { data: {} };
      }

      if (url === "/reminders") {
        contactSummaryById[payload.contactId].nextReminder = {
          id: "rem-1",
          title: payload.title,
          description: payload.description,
          dueAt: payload.dueAt,
          status: payload.status,
        };
        return { data: {} };
      }

      if (url === "/contacts/bulk-assign-tag") {
        const contactId = payload.contactIds?.[0];
        contactSummaryById[contactId].tags = [
          ...(contactSummaryById[contactId].tags ?? []),
          { id: payload.tagId, name: "NewTag", colorHex: "#EEF2FF" },
        ];
        return { data: {} };
      }

      if (url === "/contacts/bulk-unassign-tag") {
        const contactId = payload.contactIds?.[0];
        contactSummaryById[contactId].tags = (contactSummaryById[contactId].tags ?? []).filter(
          t => t.id !== payload.tagId
        );
        return { data: {} };
      }

      throw new Error(`Unexpected POST ${url}`);
    });

    axiosClient.put.mockImplementation(async (url, payload) => {
      if (url === "/notes/note-1") {
        contactSummaryById[payload.contactId].recentNotes = [
          {
            id: "note-1",
            content: payload.content,
            createdAt: nowIso,
            createdByName: "Test User",
          },
        ];
        return { data: {} };
      }

      if (url === "/reminders/rem-1") {
        contactSummaryById[payload.contactId].nextReminder = {
          id: "rem-1",
          title: payload.title,
          description: payload.description,
          dueAt: payload.dueAt,
          status: payload.status,
        };
        return { data: {} };
      }

      throw new Error(`Unexpected PUT ${url}`);
    });

    axiosClient.delete.mockImplementation(async url => {
      if (url === "/notes/note-1") {
        contactSummaryById["contact-2"].recentNotes = [];
        return { data: {} };
      }

      if (url === "/reminders/rem-1") {
        contactSummaryById["contact-2"].nextReminder = null;
        return { data: {} };
      }

      throw new Error(`Unexpected DELETE ${url}`);
    });

    axiosClient.request.mockImplementation(async config => {
      if (config?.url === "/contacts/bulk-unassign-tag" && config?.method === "DELETE") {
        const contactId = config?.data?.contactIds?.[0];
        const tagId = config?.data?.tagId;
        contactSummaryById[contactId].tags = (contactSummaryById[contactId].tags ?? []).filter(
          t => t.id !== tagId
        );
        return { data: {} };
      }
      throw new Error(`Unexpected REQUEST ${config?.method} ${config?.url}`);
    });

    render(
      <MemoryRouter>
        <ChatInbox />
      </MemoryRouter>
    );

    // conversation list renders
    await screen.findByText("Chat Inbox");
    await waitFor(() =>
      expect(axiosClient.get).toHaveBeenCalledWith(
        "/chat-inbox/conversations",
        expect.anything()
      )
    );
    const aliceButton = await screen.findByRole("button", { name: /Alice/ });
    const bobButton = await screen.findByRole("button", { name: /Bob/ });
    expect(aliceButton).toBeTruthy();

    // selecting a conversation loads thread
    expect(within(bobButton).getByText("2")).toBeTruthy();
    fireEvent.click(bobButton);

    await screen.findByText("Inbound hello");
    await screen.findByText("Outbound hi");

    // inbound left / outbound right is correct
    const inboundEl = screen.getByText("Inbound hello");
    const outboundEl = screen.getByText("Outbound hi");
    expect(findAncestorClass(inboundEl, "justify-start")).toBeTruthy();
    expect(findAncestorClass(outboundEl, "justify-end")).toBeTruthy();

    // mark-read sets unreadCount to 0 in UI when opening a thread
    await waitFor(() => {
      const bobButton2 = screen.getByRole("button", { name: /Bob/ });
      expect(within(bobButton2).queryByText("2")).toBeNull();
    });
    expect(axiosClient.post).toHaveBeenCalledWith(
      "/chat-inbox/mark-read",
      expect.objectContaining({
        businessId: "biz-1",
        contactId: "contact-2",
        lastReadAtUtc: expect.any(String),
      })
    );

    // composer basics (enabled + accepts input)
    const replyBox = screen.getByPlaceholderText(/Type a reply/);
    await userEvent.clear(replyBox);
    await userEvent.type(replyBox, "Hello there");
    expect(replyBox).toHaveValue("Hello there");
    expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled();

    // assignment assign/unassign works (if UI shows it)
    const assigneeButton = screen.getByRole("button", { name: "Assignee" });
    expect(within(assigneeButton).getByText(/Unassigned/i)).toBeTruthy();
    fireEvent.click(assigneeButton);
    fireEvent.click(screen.getByRole("button", { name: "Assign to me" }));
    await waitFor(() =>
      expect(within(screen.getByRole("button", { name: "Assignee" })).getByText(/You/i)).toBeTruthy()
    );

    fireEvent.click(screen.getByRole("button", { name: "Assignee" }));
    fireEvent.click(screen.getByRole("button", { name: "Unassign" }));
    await waitFor(() =>
      expect(within(screen.getByRole("button", { name: "Assignee" })).getByText(/Unassigned/i)).toBeTruthy()
    );

    // tag remove works (if visible)
    await screen.findByText("VIP");
    fireEvent.click(screen.getByTitle("Remove tag"));
    await waitFor(() => expect(screen.queryByText("VIP")).toBeNull());

    // tag add works (if visible)
    fireEvent.click(screen.getByRole("button", { name: "+ Tag" }));
    await screen.findByText("Add tag to this contact");
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    await screen.findByText("NewTag");

    // notes add/update/delete works (if visible)
    fireEvent.click(screen.getByRole("button", { name: "+ Add note" }));
    const noteBox = screen.getByPlaceholderText(/Type an internal note/);
    fireEvent.change(noteBox, { target: { value: "My note" } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    await screen.findByText("My note");

    fireEvent.click(screen.getByTitle("Edit note"));
    const editNoteBox = screen.getByDisplayValue("My note");
    fireEvent.change(editNoteBox, { target: { value: "My note updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("My note updated");

    fireEvent.click(screen.getByTitle("Delete note"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("My note updated")).toBeNull());

    // reminders add/update/delete works (if visible)
    fireEvent.click(screen.getByRole("button", { name: "+ Add reminder" }));
    fireEvent.change(screen.getByPlaceholderText("Reminder title"), { target: { value: "Call back" } });
    const dueInput = document.querySelector('input[type=\"datetime-local\"]');
    fireEvent.change(dueInput, { target: { value: "2025-01-01T10:00" } });
    fireEvent.change(screen.getByPlaceholderText(/Optional description/), { target: { value: "desc" } });
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }));
    await screen.findByText("Call back");

    fireEvent.click(screen.getByTitle("Edit reminder"));
    fireEvent.change(screen.getByDisplayValue("Call back"), { target: { value: "Call back updated" } });
    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    fireEvent.click(saveButtons[0]);
    await screen.findByText("Call back updated");

    fireEvent.click(screen.getByTitle("Delete reminder"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("No upcoming reminder for this contact.");
  });
});

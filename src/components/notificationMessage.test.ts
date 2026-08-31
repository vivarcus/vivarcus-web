import { describe, expect, it } from "vitest";
import type { NotificationItem } from "../api/types";
import {
  notificationBodyText,
  notificationPlainText,
  resolveInAppHref,
  splitTaskInlineLink,
} from "./notificationMessage";

describe("notificationBodyText", () => {
  it("prefers body over subject", () => {
    const item: NotificationItem = {
      id: "1",
      subject: "Notification: Sandbox Build Complete",
      body: "Your sandbox build demo has completed successfully.",
      read: false,
      dismissed: false,
      created_at: "2026-08-31T00:00:00Z",
    };
    expect(notificationBodyText(item)).toBe(item.body);
  });

  it("falls back to subject when body is empty", () => {
    const item: NotificationItem = {
      id: "1",
      subject: "Task: Study Plan",
      body: "",
      read: false,
      dismissed: false,
      created_at: "2026-08-31T00:00:00Z",
    };
    expect(notificationBodyText(item)).toBe("Task: Study Plan");
  });
});

describe("notificationPlainText", () => {
  it("strips html for collapse length checks", () => {
    const html =
      'Your sandbox build demo has completed successfully. Open <a href="/admin/deployment/sandbox_vaults">Sandbox Vaults</a>.';
    expect(notificationPlainText(html)).toBe(
      "Your sandbox build demo has completed successfully. Open Sandbox Vaults.",
    );
  });
});

describe("splitTaskInlineLink", () => {
  it("extracts record id link label when message ends with colon", () => {
    expect(
      splitTaskInlineLink("You have been assigned the task:", "/objects/user_task__v/records/abc123"),
    ).toEqual({
      message: "You have been assigned the task",
      linkLabel: "abc123",
    });
  });
});

describe("resolveInAppHref", () => {
  it("normalizes absolute urls to in-app paths", () => {
    expect(resolveInAppHref("https://vault.example.com/admin/operations/job_status")).toBe(
      "/admin/operations/job_status",
    );
  });

  it("keeps relative vault paths", () => {
    expect(resolveInAppHref("/admin/deployment/sandbox_vaults")).toBe(
      "/admin/deployment/sandbox_vaults",
    );
  });
});

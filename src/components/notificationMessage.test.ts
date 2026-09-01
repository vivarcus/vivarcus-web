import { describe, expect, it } from "vitest";
import type { NotificationItem } from "../api/types";
import {
  embedRecordLink,
  formatNotificationDayHeading,
  formatNotificationTime,
  notificationBodyText,
  notificationContainsHtml,
  notificationHeading,
  notificationNeedsCollapse,
  notificationPlainText,
  prepareNotificationHtml,
  resolveInAppHref,
} from "./notificationMessage";

describe("notificationHeading", () => {
  it("returns subject when it differs from body", () => {
    const item: NotificationItem = {
      id: "1",
      subject: "Notification: Task Reminder",
      body: "You have been assigned the task: Site visit",
      read: false,
      dismissed: false,
      created_at: "2026-08-31T00:00:00Z",
    };
    expect(notificationHeading(item)).toBe("Notification: Task Reminder");
  });

  it("omits heading when body is empty so the row can show subject as body", () => {
    const item: NotificationItem = {
      id: "1",
      subject: "Task: Study Plan",
      body: "",
      read: false,
      dismissed: false,
      created_at: "2026-08-31T00:00:00Z",
    };
    expect(notificationHeading(item)).toBeUndefined();
  });
});

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

describe("notificationContainsHtml", () => {
  it("detects raw and entity-escaped anchor tags", () => {
    expect(notificationContainsHtml('Open <a href="/admin">Sandbox Vaults</a>.')).toBe(true);
    expect(
      notificationContainsHtml('Open &lt;a href="/admin"&gt;Sandbox Vaults&lt;/a&gt;.'),
    ).toBe(true);
    expect(notificationContainsHtml("3 successes and 2 failures")).toBe(false);
  });
});

describe("prepareNotificationHtml", () => {
  it("sanitizes raw html links", () => {
    const html =
      'Your sandbox build demo has completed successfully. Open <a href="/admin/deployment/sandbox_vaults">Sandbox Vaults</a>.';
    expect(prepareNotificationHtml(html)).toContain('<a href="/admin/deployment/sandbox_vaults">');
  });

  it("decodes entity-escaped html before sanitizing", () => {
    const html =
      'Open &lt;a href="/admin/deployment/sandbox_vaults"&gt;Sandbox Vaults&lt;/a&gt;.';
    expect(prepareNotificationHtml(html)).toContain('<a href="/admin/deployment/sandbox_vaults">');
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

describe("embedRecordLink", () => {
  it("wraps a trailing record name as an html link", () => {
    expect(
      embedRecordLink(
        "You have been assigned the task: Site visit follow-up",
        "/objects/user_task__v/records/abc123",
      ),
    ).toBe(
      'You have been assigned the task: <a href="/objects/user_task__v/records/abc123">Site visit follow-up</a>',
    );
  });

  it("wraps a trailing name after a fullwidth colon", () => {
    expect(
      embedRecordLink(
        "已为您分配了任务：站点随访",
        "/objects/user_task__v/records/abc123",
      ),
    ).toBe(
      '已为您分配了任务： <a href="/objects/user_task__v/records/abc123">站点随访</a>',
    );
  });

  it("appends the record id when the message ends with a colon", () => {
    expect(
      embedRecordLink("You have been assigned the task:", "/objects/user_task__v/records/abc123"),
    ).toBe('You have been assigned the task: <a href="/objects/user_task__v/records/abc123">abc123</a>');
  });

  it("leaves existing html links unchanged", () => {
    const html = 'Open <a href="/admin/deployment/sandbox_vaults">Sandbox Vaults</a>.';
    expect(embedRecordLink(html, "/admin/deployment/sandbox_vaults")).toBe(html);
  });
});

describe("notificationNeedsCollapse", () => {
  it("collapses multi-block html", () => {
    expect(
      notificationNeedsCollapse(
        "<p>Your Outbound Package exported.</p><br/><ul><li>Start</li><li>Duration</li></ul>",
      ),
    ).toBe(true);
  });

  it("keeps short plain text expanded", () => {
    expect(notificationNeedsCollapse("You have been assigned the task: Site visit")).toBe(false);
  });
});

describe("formatNotificationTime", () => {
  it("uses relative time within a day and a date after that", () => {
    const now = Date.parse("2026-08-31T12:00:00Z");
    expect(formatNotificationTime("2026-08-31T00:00:00Z", now)).toContain("ago");
    expect(formatNotificationTime("2026-08-14T00:00:00Z", now)).toBe("14 Aug 2026");
  });
});

describe("formatNotificationDayHeading", () => {
  it("uppercases the calendar day", () => {
    expect(formatNotificationDayHeading("2026-08-31T00:00:00Z")).toBe("31 AUG 2026");
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

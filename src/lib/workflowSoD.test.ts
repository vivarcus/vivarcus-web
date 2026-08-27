import { describe, expect, it } from "vitest";
import { HttpError } from "../api/client";
import { parseSoDExhausted } from "./workflowSoD";

class FakeHttpError extends HttpError {}

describe("parseSoDExhausted", () => {
  it("reads structured exhausted payload", () => {
    const err = new FakeHttpError(400, "missing users", {
      error: "workflow participant group has no eligible users after segregation of duties: approvers__c",
      code: "exhausted",
      message: "workflow participant group has no eligible users after segregation of duties: approvers__c",
      participant_group: "approvers__c",
      workflow_instance_id: "11111111-1111-1111-1111-111111111111",
    });
    const got = parseSoDExhausted(err);
    expect(got).toEqual({
      code: "exhausted",
      message: "workflow participant group has no eligible users after segregation of duties: approvers__c",
      participantGroup: "approvers__c",
      workflowInstanceId: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("ignores other SoD codes", () => {
    const err = new FakeHttpError(400, "one task", {
      error: "workflow_segregation_of_duties",
      code: "one_task",
      message: "Users cannot be assigned more than one task",
    });
    expect(parseSoDExhausted(err)).toBeNull();
  });
});

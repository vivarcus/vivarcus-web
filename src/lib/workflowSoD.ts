import { HttpError } from "../api/client";

export type SoDExhaustedError = {
  code: "exhausted";
  message: string;
  participantGroup: string;
  workflowInstanceId: string;
};

export function parseSoDExhausted(err: unknown): SoDExhaustedError | null {
  if (!(err instanceof HttpError) || !err.body) {
    return null;
  }
  const body = err.body;
  const code = (body.code ?? "").trim();
  if (code !== "exhausted") {
    return null;
  }
  const participantGroup = body.participant_group?.trim() ?? "";
  const workflowInstanceId = body.workflow_instance_id?.trim() ?? "";
  if (!participantGroup || !workflowInstanceId) {
    return null;
  }
  const message =
    body.message?.trim() ||
    err.message ||
    "workflow participant group has no eligible users after segregation of duties";
  return {
    code: "exhausted",
    message,
    participantGroup,
    workflowInstanceId,
  };
}

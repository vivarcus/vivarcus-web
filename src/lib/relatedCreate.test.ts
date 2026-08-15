import { describe, expect, it } from "vitest";
import {
  parseSectionContextVaultId,
  resolveRelatedSectionVaultId,
} from "./relatedCreate";

const sampleToken =
  "eyJhY3Rvcl9pZCI6ImNlM2NhOWY5LTRiZDctNDI3MS1iMTQzLTY5NWM4MmY1MDQwMyIsInZhdWx0X2lkIjoiZWJjZjYwNGEtNmQxZS00MTBmLTk0MTYtMWVhMmRhMmY3YjQ3IiwicGFyZW50X29iamVjdF9uYW1lIjoicGVyc29uX19zeXMiLCJwYXJlbnRfcmVjb3JkX2lkIjoiMFo1MDAwMDAwMDAwMDA5IiwibGF5b3V0X2NvbXBvbmVudF9pZCI6ImIzNTBiYjU3LTE4Y2MtNGZiMC1hMTQ5LWY2NzZlYzhhM2ZhNSIsImxheW91dF9lbGVtZW50X2lkIjoiMzQxYzM3MDQtMDkzMC00YzFjLWEzM2UtMGYzNzUwOGQ1ZjNjIiwicmVsYXRpb25zaGlwX3JlZiI6ImNvbnRhY3RfaW5mb3JtYXRpb25fX2NsaW5yIiwidGFyZ2V0X29iamVjdF9uYW1lIjoiY29udGFjdF9pbmZvcm1hdGlvbl9fY2xpbiIsImxpbmtfZmllbGRfYXBpX25hbWUiOiJwZXJzb25fX2NsaW4iLCJjb2x1bW5fZmllbGRzIjpbIm5hbWVfX3YiXSwicHJldmVudF9yZWNvcmRfY3JlYXRlIjpmYWxzZSwibW9kYWxfY3JlYXRlX3JlY29yZCI6ZmFsc2UsInF1ZXJ5X2hhc2giOiI5N2Q4ZTAzYjNhMTg0YzQyMjJiYjYxNzVkODQ3MjdkZTYwYjY5MzViM2YyMWU2MjI0M2I0MTM5OTcyZjY3YWU1Iiwic2NoZW1hX2ZpbmdlcnByaW50Ijoic2hhMjU2OjQ2NjdiMGVmZmJhMTg0ZTUzMTA5Yjg3NzkyMzE0ZWIzNzFiZGNhYjMwNDIxYjUxYWE0ZWNjZjcxNTZmYTQ0ZSIsInVpX2ZpbmdlcnByaW50IjoicmVhZHkifQ.signature";

describe("parseSectionContextVaultId", () => {
  it("extracts vault_id from a related section token payload", () => {
    expect(parseSectionContextVaultId(sampleToken)).toBe(
      "ebcf604a-6d1e-410f-9416-1ea2da2f7b47",
    );
  });

  it("returns null for malformed tokens", () => {
    expect(parseSectionContextVaultId("")).toBeNull();
    expect(parseSectionContextVaultId("not-a-token")).toBeNull();
  });
});

describe("resolveRelatedSectionVaultId", () => {
  it("prefers the token vault over the session vault", () => {
    expect(
      resolveRelatedSectionVaultId(
        sampleToken,
        "6ffc114d-f517-4345-95d0-882f9925c451",
      ),
    ).toBe("ebcf604a-6d1e-410f-9416-1ea2da2f7b47");
  });

  it("falls back to the session vault when token parsing fails", () => {
    expect(resolveRelatedSectionVaultId("bad", "session-vault-id")).toBe(
      "session-vault-id",
    );
  });
});

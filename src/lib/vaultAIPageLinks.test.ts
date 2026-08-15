import { describe, expect, it } from "vitest";
import { micromark } from "micromark";
import {
  attachNearbyDiffHighlightQueries,
  encodeVaultAIPageMarkdownQueries,
  linkifyVaultAIPageRefs,
  parseVaultAIPageHref,
  pickHighlightQueryFromSnippets,
  prepareVaultAIAssistantMarkdown,
  VAULT_AI_PAGE_HREF_PREFIX,
} from "./vaultAIPageLinks";

describe("parseVaultAIPageHref", () => {
  it("parses vault-ai page hashes", () => {
    expect(parseVaultAIPageHref(`${VAULT_AI_PAGE_HREF_PREFIX}3`)).toEqual({ page: 3 });
    expect(parseVaultAIPageHref(`${VAULT_AI_PAGE_HREF_PREFIX}3?q=NVC-301`)).toEqual({
      page: 3,
      query: "NVC-301",
    });
    expect(parseVaultAIPageHref("#other")).toBeNull();
    expect(parseVaultAIPageHref("")).toBeNull();
  });

  it("keeps unescaped multi-word highlight queries", () => {
    expect(parseVaultAIPageHref(`${VAULT_AI_PAGE_HREF_PREFIX}2?q=Informed Consent Process 1`)).toEqual({
      page: 2,
      query: "Informed Consent Process 1",
    });
    expect(
      parseVaultAIPageHref(
        `${VAULT_AI_PAGE_HREF_PREFIX}2?q=${encodeURIComponent("Informed Consent Process 1")}`,
      ),
    ).toEqual({
      page: 2,
      query: "Informed Consent Process 1",
    });
  });
});

describe("linkifyVaultAIPageRefs", () => {
  it("linkifies English and Chinese page citations without inventing queries", () => {
    expect(linkifyVaultAIPageRefs("See page 2 and p.3")).toBe(
      `See [page 2](${VAULT_AI_PAGE_HREF_PREFIX}2) and [p.3](${VAULT_AI_PAGE_HREF_PREFIX}3)`,
    );
    expect(linkifyVaultAIPageRefs("见第 4 页")).toBe(
      `见[第 4 页](${VAULT_AI_PAGE_HREF_PREFIX}4)`,
    );
    expect(linkifyVaultAIPageRefs("见页面 2")).toBe(
      `见[页面 2](${VAULT_AI_PAGE_HREF_PREFIX}2)`,
    );
  });

  it("does not attach nearby quote text as highlight query", () => {
    const src =
      'Eligibility (page 2): A new key inclusion criterion has been added: "预期生存期不少于 12 周".';
    const got = linkifyVaultAIPageRefs(src);
    expect(got).toBe(
      `Eligibility ([page 2](${VAULT_AI_PAGE_HREF_PREFIX}2)): A new key inclusion criterion has been added: "预期生存期不少于 12 周".`,
    );
  });

  it("does not rewrite existing markdown links or code", () => {
    const src = "Already [page 2](https://x) and `page 9`";
    expect(linkifyVaultAIPageRefs(src)).toBe(src);
  });

  it("preserves existing vault-ai highlight queries", () => {
    const src = `See [page 2](${VAULT_AI_PAGE_HREF_PREFIX}2?q=${encodeURIComponent("预期生存期不少于")})`;
    expect(linkifyVaultAIPageRefs(src)).toBe(src);
  });

  it("handles Previous/Current style anchors", () => {
    expect(linkifyVaultAIPageRefs("Previous p.2 → Current p.2")).toBe(
      `Previous [p.2](${VAULT_AI_PAGE_HREF_PREFIX}2) → Current [p.2](${VAULT_AI_PAGE_HREF_PREFIX}2)`,
    );
  });
});

describe("attachNearbyDiffHighlightQueries", () => {
  it("attaches Current-side differing phrase from nearby quotes", () => {
    const src = [
      `标题（Current Version [页面 2](${VAULT_AI_PAGE_HREF_PREFIX}2)）`,
      "Previous: `3.2 Informed Consent Process`",
      "Current: `3.2 Informed Consent Process 1`",
    ].join("\n");
    const got = attachNearbyDiffHighlightQueries(src);
    expect(got).toContain(`${VAULT_AI_PAGE_HREF_PREFIX}2?q=`);
    expect(decodeURIComponent(got)).toContain("Process 1");
  });

  it("supports Chinese colon and curly quotes", () => {
    const src = [
      `变更（[page 3](${VAULT_AI_PAGE_HREF_PREFIX}3)）`,
      "Previous： “subject to completion of the action items listed above”",
      "Current： “subject to completion of the action”",
    ].join("\n");
    const got = attachNearbyDiffHighlightQueries(src);
    expect(got).toContain(`${VAULT_AI_PAGE_HREF_PREFIX}3?q=`);
    expect(decodeURIComponent(got)).toMatch(/action/i);
  });

  it("does not override solid existing highlight queries", () => {
    const src = [
      `See [page 2](${VAULT_AI_PAGE_HREF_PREFIX}2?q=${encodeURIComponent("keep this solid phrase")})`,
      "Previous: `aaa old`",
      "Current: `bbb different`",
    ].join("\n");
    expect(attachNearbyDiffHighlightQueries(src)).toBe(src);
  });

  it("upgrades a truncated first-word query from nearby quotes", () => {
    const src = [
      `标题（[page 2](${VAULT_AI_PAGE_HREF_PREFIX}2?q=Informed)）`,
      "Previous: 3.2 Informed Consent Process",
      "Current: 3.2 Informed Consent Process 1",
    ].join("\n");
    const got = attachNearbyDiffHighlightQueries(src);
    expect(decodeURIComponent(got)).toContain("Process 1");
  });

  it("does not replace an unrelated short query with quotes from another bullet", () => {
    const src = [
      `1. PI change ([page 1](${VAULT_AI_PAGE_HREF_PREFIX}1?q=Li+Mu))`,
      "Previous: `Principal Investigator: Dr. Zhang Ming`",
      "Current: `Principal Investigator: Dr. Li Mu`",
      `2. Action items ([page 3](${VAULT_AI_PAGE_HREF_PREFIX}3?q=certification))`,
      "Current新增表头 # 列",
    ].join("\n");
    const got = attachNearbyDiffHighlightQueries(src);
    expect(got).toContain(`${VAULT_AI_PAGE_HREF_PREFIX}3?q=certification`);
    expect(got).not.toMatch(/vault-ai-page-3\?q=Principal/);
    // Page 1 may still upgrade Li Mu → full Current phrase (substring).
    expect(decodeURIComponent(got)).toContain("Li Mu");
  });
});

describe("pickHighlightQueryFromSnippets", () => {
  it("returns empty for identical snippets", () => {
    expect(pickHighlightQueryFromSnippets("same", "same")).toBe("");
  });

  it("collapses extract-noise spaces around hyphens", () => {
    expect(pickHighlightQueryFromSnippets("_____________", "2026-07- 28")).toBe("2026-07-28");
  });
});

describe("encodeVaultAIPageMarkdownQueries", () => {
  it("percent-encodes unescaped spaces so CommonMark renders a link", () => {
    const phrase = "前版行动项（受试者 009）";
    const raw = `位置： [page 2](${VAULT_AI_PAGE_HREF_PREFIX}2?q=${phrase})`;
    expect(micromark(raw)).not.toContain("<a href=");

    const got = encodeVaultAIPageMarkdownQueries(raw);
    expect(got).toBe(
      `位置： [page 2](${VAULT_AI_PAGE_HREF_PREFIX}2?q=${encodeURIComponent(phrase)})`,
    );
    expect(micromark(got)).toContain(`href="${VAULT_AI_PAGE_HREF_PREFIX}2?q=`);
    expect(parseVaultAIPageHref(`${VAULT_AI_PAGE_HREF_PREFIX}2?q=${encodeURIComponent(phrase)}`)).toEqual({
      page: 2,
      query: phrase,
    });
  });

  it("is idempotent for already-encoded queries", () => {
    const phrase = "Informed Consent Process 1";
    const src = `See [page 2](${VAULT_AI_PAGE_HREF_PREFIX}2?q=${encodeURIComponent(phrase)})`;
    expect(encodeVaultAIPageMarkdownQueries(src)).toBe(src);
  });
});

describe("prepareVaultAIAssistantMarkdown", () => {
  it("linkifies 页面 N and attaches nearby diff query", () => {
    const src = [
      "变更（Current Version 页面 2）",
      "Previous: `subject to completion of the action items listed above.`",
      "Current: `subject to completion of the action .`",
    ].join("\n");
    const got = prepareVaultAIAssistantMarkdown(src);
    expect(got).toContain(`[页面 2](${VAULT_AI_PAGE_HREF_PREFIX}2?q=`);
    expect(decodeURIComponent(got)).toMatch(/action/i);
  });

  it("encodes model-emitted Chinese highlight queries with spaces", () => {
    const phrase = "前版行动项（受试者 009）";
    const src = `位置： [page 2](${VAULT_AI_PAGE_HREF_PREFIX}2?q=${phrase})`;
    const got = prepareVaultAIAssistantMarkdown(src);
    expect(got).toContain(encodeURIComponent(phrase));
    expect(micromark(got)).toContain("<a href=");
  });
});

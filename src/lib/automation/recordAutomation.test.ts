import { beforeEach, describe, expect, it } from "vitest";
import { clickAction } from "./clickAction";
import { fillRecord, getFieldValue, listFormFields } from "./fillRecord";
import { login } from "./login";
import { saveRecord } from "./saveRecord";

describe("fillRecord", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="field-grid__item field-grid__item--edit" data-field-api-name="study_number__v">
        <dt>Study Number</dt>
        <dd><input /></dd>
      </div>
      <div class="field-grid__item field-grid__item--edit" data-field-api-name="start_date__v">
        <dt>Start Date</dt>
        <dd>
          <div class="date-field-input">
            <input />
          </div>
        </dd>
      </div>
      <div class="field-grid__item field-grid__item--edit" data-field-api-name="active__v">
        <dt>Active</dt>
        <dd><input type="checkbox" /></dd>
      </div>
    `;
  });

  it("fills text, date, and checkbox fields", async () => {
    const result = await fillRecord({
      study_number__v: "CCB-2401-PSO-201",
      start_date__v: "2026-03-02",
      active__v: "true",
    });
    expect(result.ok).toBe(true);
    expect(result.filled).toEqual(["study_number__v", "start_date__v", "active__v"]);
    expect(getFieldValue("study_number__v")).toBe("CCB-2401-PSO-201");
    expect(getFieldValue("start_date__v")).toBe("2026-03-02");
    expect(getFieldValue("active__v")).toBe("true");
  });

  it("reports missing fields", async () => {
    const result = await fillRecord({ missing__v: "x" });
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.reason).toMatch(/not found/);
  });

  it("lists form fields", () => {
    expect(listFormFields().map((f) => f.fieldApiName)).toEqual([
      "study_number__v",
      "start_date__v",
      "active__v",
    ]);
  });
});

describe("saveRecord", () => {
  it("clicks the primary save button", async () => {
    let clicked = false;
    document.body.innerHTML = `
      <div class="page-header__actions">
        <button type="submit" class="ant-btn ant-btn-primary">Save</button>
      </div>
    `;
    document.querySelector("button")!.addEventListener("click", () => {
      clicked = true;
    });
    await expect(saveRecord()).resolves.toEqual({ ok: true });
    expect(clicked).toBe(true);
  });

  it("returns the error banner after save", async () => {
    document.body.innerHTML = `
      <div class="page-header__actions">
        <button type="submit" class="ant-btn ant-btn-primary">Save</button>
      </div>
    `;
    document.querySelector("button")!.addEventListener("click", () => {
      const alert = document.createElement("div");
      alert.setAttribute("role", "alert");
      alert.className = "ant-alert-error";
      alert.textContent = "Name is required";
      document.body.append(alert);
    });
    const result = await saveRecord();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Name is required");
  });
});

describe("clickAction", () => {
  it("clicks a visible action button", async () => {
    let clicked = false;
    document.body.innerHTML = `<button type="button">Plan Study</button>`;
    document.querySelector("button")!.addEventListener("click", () => {
      clicked = true;
    });
    await expect(clickAction("Plan Study")).resolves.toEqual({ ok: true });
    expect(clicked).toBe(true);
  });

  it("opens All actions then clicks the menu item", async () => {
    let clicked = false;
    document.body.innerHTML = `
      <button type="button" class="record-toolbar__overflow" aria-label="All actions">⋯</button>
    `;
    document.querySelector("button")!.addEventListener("click", () => {
      const item = document.createElement("div");
      item.setAttribute("role", "menuitem");
      item.textContent = "Ready to Enroll";
      item.addEventListener("click", () => {
        clicked = true;
      });
      document.body.append(item);
    });
    await expect(clickAction("Ready to Enroll")).resolves.toEqual({ ok: true });
    expect(clicked).toBe(true);
  });
});

describe("login", () => {
  it("fills the two-step login form", async () => {
    document.body.innerHTML = `
      <form>
        <input name="username" autocomplete="username" />
        <button type="submit">Continue</button>
      </form>
    `;
    const form = document.querySelector("form")!;
    form.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName !== "BUTTON") {
        return;
      }
      if (!document.querySelector('input[type="password"]')) {
        const password = document.createElement("input");
        password.type = "password";
        password.autocomplete = "current-password";
        form.append(password);
      }
    });
    // submitButton().click() does not bubble as a form click in jsdom — listen on the button.
    document.querySelector("button")!.addEventListener("click", () => {
      if (!document.querySelector('input[type="password"]')) {
        const password = document.createElement("input");
        password.type = "password";
        password.autocomplete = "current-password";
        form.append(password);
      }
    });

    const result = await login({ username: "etmf@chengchuanbio.com", password: "secret" });
    expect(result.ok).toBe(true);
    expect((document.querySelector('input[name="username"]') as HTMLInputElement).value).toBe(
      "etmf@chengchuanbio.com",
    );
    expect((document.querySelector('input[type="password"]') as HTMLInputElement).value).toBe("secret");
  });
});

import { describe, it, expect, vi } from "vitest";
import { createRoot, createSignal, createEffect, createMemo } from "../";

function withReactiveContext(fn: Function) {
  let error: unknown;

  createRoot((dispose) => {
    try {
      fn();
    } catch (err) {
      error = err;
    } finally {
      return dispose;
    }
  })?.();

  if (error) {
    throw error;
  }
}

describe("reactivity", () => {
  it("triggers an effect when a signal changes", () => {
    withReactiveContext(() => {
      const items: string[] = [];

      const [firstName, setFirstName] = createSignal("John");

      createEffect(() => items.push(firstName()));

      setFirstName("Hank");

      expect(items).toEqual(["John", "Hank"]);
    });
  });

  it("does not trigger an effect when the signal did not change", () => {
    withReactiveContext(() => {
      const items: string[] = [];

      const [firstName, setFirstName] = createSignal("John");

      createEffect(() => items.push(firstName()));

      setFirstName("John");

      expect(items).toEqual(["John"]);
    });
  });

  it("memoizes a computed value", () => {
    withReactiveContext(() => {
      const items: string[] = [];

      const [firstName, setFirstName] = createSignal("John");
      const [lastName, setLastName] = createSignal("Doe");

      const fullName = createMemo(() => `${firstName()} ${lastName()}`);

      createEffect(() => items.push(fullName()));

      expect(items).toEqual(["John Doe"]);

      setFirstName("Hank");
      expect(items).toEqual(["John Doe", "Hank Doe"]);
      setLastName("Williams");
      expect(items).toEqual(["John Doe", "Hank Doe", "Hank Williams"]);
    });
  });

  it("bla", () => {
    withReactiveContext(() => {
      const items: string[] = [];

      const [firstName, setFirstName] = createSignal("John");
      const [lastName, setLastName] = createSignal("Doe");
      const [showFullName, setShowFullName] = createSignal(true);

      const fullName = createMemo(() => `${firstName()} ${lastName()}`);

      const greeting = createMemo(() => {
        if (showFullName()) {
          return `Hi, ${fullName()}!`;
        }

        return `Hi ${firstName()}!`;
      });

      createEffect(() => items.push(greeting()));

      expect(items).toEqual(["Hi, John Doe!"]);

      setShowFullName(false);
      expect(items).toEqual(["Hi, John Doe!", "Hi John!"]);

      setLastName("Williams");
      // The effect is not triggered because the current greeting is not
      // 'interested' in the fullName change (only the first name currently).
      expect(items).toEqual(["Hi, John Doe!", "Hi John!"]);

      setShowFullName(true);
      expect(items).toEqual([
        "Hi, John Doe!",
        "Hi John!",
        "Hi, John Williams!",
      ]);
    });
  });
});

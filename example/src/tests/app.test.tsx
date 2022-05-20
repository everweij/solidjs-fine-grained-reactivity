import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/dom";
import { render } from "fluid";
import { App } from "../";

let dispose: () => void;
const mountApp = () => {
  dispose = render(() => <App />, document.body);
};

const cleanup = () => {
  dispose();
};

const getInput = () =>
  screen.getByPlaceholderText("What needs to be done?") as HTMLInputElement;

const getTotalTodos = () => document.querySelectorAll("ul > li").length;

function insertTodo(text: string) {
  const input = getInput();
  fireEvent.input(input, {
    target: { value: text },
  });

  fireEvent.keyDown(input, { key: "Enter" });
}

describe("Example todo-app", () => {
  beforeEach(mountApp);
  afterEach(cleanup);

  it("mounts the app correctly", () => {
    screen.getByText("Todos");
    screen.findByPlaceholderText("What needs to be done?");

    expect(screen.queryByTestId("toggle-all-btn")).toBeNull();
  });

  it("allows you to add a todo", async () => {
    insertTodo("Buy milk");

    // check that the value is now in the list
    screen.getByText("Buy milk");

    expect(getTotalTodos()).toBe(1);

    // it should clear the input after adding a todo
    expect(getInput().value).toBe("");

    // toggle button should now be visible
    screen.getByTestId("toggle-all-btn");
  });

  it("allows you to mark a todo-item as being done", () => {
    insertTodo("Buy milk");

    // make sure the todo is not yet marked as completed
    const checkbox = screen.getByTestId("todo-checkbox") as HTMLInputElement;
    screen.getByText("1 item left");
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    // should now be marked as completed
    expect(checkbox.checked).toBe(true);
    screen.getByText("0 items left");
  });

  it("allows you to delete a todo-item", () => {
    insertTodo("Buy milk");

    fireEvent.click(screen.getByTestId("remove-btn"));

    expect(screen.queryByText("Buy milk")).toBeNull();
  });

  it("allows you to toggle all todo-items and clear all completed items", () => {
    insertTodo("Buy milk");
    insertTodo("Buy eggs");

    screen.getByText("2 items left");

    fireEvent.click(screen.getByTestId("toggle-all-btn"));

    screen.getByText("0 items left");

    fireEvent.click(screen.getByText("Clear completed"));

    expect(getTotalTodos()).toBe(0);

    // toggle button should not be visible, just like we restarted the app
    expect(screen.queryByTestId("toggle-all-btn")).toBeNull();
  });

  it("allows you to filter items", () => {
    insertTodo("Buy milk");
    insertTodo("Buy eggs");

    const [firstCheckbox] = screen.getAllByTestId(
      "todo-checkbox"
    ) as HTMLInputElement[];
    fireEvent.click(firstCheckbox);

    fireEvent.click(screen.getByText("completed"));
    expect(getTotalTodos()).toBe(1);
    screen.getByText("Buy milk");

    fireEvent.click(screen.getByText("active"));
    expect(getTotalTodos()).toBe(1);
    screen.getByText("Buy eggs");
  });
});

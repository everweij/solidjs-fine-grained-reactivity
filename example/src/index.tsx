// Inspired by: https://todomvc.com/examples/react/

import "../../shared/reset.css";
import "../../shared/todo.css";
import { createMemo, For, render, createStore } from "fluid";
import { Top } from "./top";
import { Bottom } from "./bottom";
import { TodoItem } from "./todo-item";

function shortId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type Filter = "all" | "completed" | "active";

function useTodos() {
  const [state, setState] = createStore<{ todos: Todo[]; filter: Filter }>({
    todos: [],
    filter: "all",
  });

  function changeFilter(filter: Filter) {
    setState({ filter });
  }

  function addTodo(title: string) {
    setState({
      todos: [...state.todos, { id: shortId(), title, completed: false }],
    });
  }

  function toggleTodo(id: string) {
    setState(
      "todos",
      (todo: Todo) => todo.id === id,
      (todo: Todo) => ({ completed: !todo.completed })
    );
  }

  function toggleAllTodos() {
    const hasAllCompleted = state.todos.every((todo) => todo.completed);
    setState("todos", { completed: !hasAllCompleted });
  }

  function removeTodo(id: string) {
    setState({ todos: state.todos.filter((todo) => todo.id !== id) });
  }

  function removeCompletedTodos() {
    setState({ todos: state.todos.filter((todo) => !todo.completed) });
  }

  const numberOfCompletedTodos = createMemo(
    () => state.todos.filter((todo) => todo.completed).length
  );

  const numberOfActiveTodos = createMemo(
    () => state.todos.filter((todo) => !todo.completed).length
  );

  const numberOfTodos = createMemo(() => state.todos.length);

  const isAllCompleted = createMemo(() => numberOfActiveTodos() === 0);

  const todos = createMemo(() => {
    switch (state.filter) {
      case "all":
        return state.todos;
      case "active":
        return state.todos.filter((todo) => !todo.completed);
      case "completed":
        return state.todos.filter((todo) => todo.completed);
    }
  }, "todos");

  return {
    todos,
    addTodo,
    removeTodo,
    toggleTodo,
    toggleAllTodos,
    removeCompletedTodos,
    numberOfTodos,
    isAllCompleted,
    numberOfCompletedTodos,
    numberOfActiveTodos,
    changeFilter,
    filter: () => state.filter,
  };
}

function App() {
  const {
    todos,
    isAllCompleted,
    numberOfTodos,
    addTodo,
    toggleAllTodos,
    filter,
    changeFilter,
    numberOfActiveTodos,
    toggleTodo,
    removeTodo,
    removeCompletedTodos,
  } = useTodos();

  return (
    <main>
      <h1>Todos</h1>
      <div class="container">
        <Top
          allCompleted={isAllCompleted()}
          numberOfTodos={numberOfTodos()}
          onAddTodo={addTodo}
          onToggleAllTodos={toggleAllTodos}
        />
        <ul>
          <For each={todos}>
            {(todo) => (
              <TodoItem
                todo={todo}
                onToggle={toggleTodo}
                onRemove={removeTodo}
              />
            )}
          </For>
        </ul>
        {numberOfTodos() > 0 && (
          <Bottom
            filter={filter()}
            numberOfActiveTodos={numberOfActiveTodos()}
            onFilterChange={changeFilter}
            onRemoveCompleted={removeCompletedTodos}
          />
        )}
      </div>
    </main>
  );
}

render(() => <App />, document.getElementById("root")!);

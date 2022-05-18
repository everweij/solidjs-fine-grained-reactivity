import { describe, it, expect } from "vitest";
import plugin from "./babel-plugin";
import { format } from "prettier";
import { transformSync } from "@babel/core";

function transform(code: string): string {
  return transformSync(code, {
    plugins: ["@babel/plugin-syntax-jsx", plugin],
  })!.code!;
}

function formatCode(code: string): string {
  return format(code, {
    trailingComma: "none",
    parser: "babel",
  });
}

function check(code: string, expected: string) {
  expect(formatCode(transform(code))).toEqual(formatCode(expected));
}

describe("babel-transform-fluid", () => {
  it("components", () => {
    const code = `
      import { createSignal, createStore } from "fluid";

      const Component = () => null;

      function MyComponent() {
        const [count, setCount] = createSignal(0);
        const [state] = createStore({ a: 1 });

        return (
          <Component
            propA={count}
            propB={count()}
            propC={() => setCount(count() + 1)}
            propD={state}
            propE={state.a}
          />
        )
      }
    `;

    const result = `
      import { jsx, createSignal, createStore } from "fluid";

      const Component = () => null;
      
      function MyComponent() {
        const [count, setCount] = createSignal(0);
        const [state] = createStore({
          a: 1
        });
        return jsx(Component, {
          propA: count,
      
          get propB() {
            return count();
          },
      
          propC: () => setCount(count() + 1),
          propD: state,
      
          get propE() {
            return state.a;
          }
      
        });
      }
    `;

    check(code, result);
  });

  it("elements", () => {
    const code = `
      import { createSignal, createStore } from "fluid";

      function MyComponent() {
        const [count, setCount] = createSignal(0);
        const [state] = createStore({ a: 1 });

        return (
          <div
            propA={count}
            propB={count()}
            propC={() => setCount(count() + 1)}
            propD={state}
            propE={state.a}
          />
        )
      }
    `;

    const result = `
      import { createSignal, createStore } from "fluid";

      function MyComponent() {
        const [count, setCount] = createSignal(0);
        const [state] = createStore({
          a: 1
        });
        return <div propA={count} propB={() => count()} propC={() => setCount(count() + 1)} propD={state} propE={() => state.a} />;
      }
    `;

    check(code, result);
  });

  it("children", () => {
    const code = `
      import { createSignal, createStore } from "fluid";

      function MyComponent() {
        const [count, setCount] = createSignal(0);
        const [state] = createStore({ a: 1 });

        return (
          <div>
            <div>Child A</div>
            <div>{count()}</div>
            {state.a}
          </div>
        );
      }
    `;

    const result = `
      import { createSignal, createStore } from "fluid";

      function MyComponent() {
        const [count, setCount] = createSignal(0);
        const [state] = createStore({
          a: 1
        });
        return <div>
                  <div>Child A</div>
                  <div>{() => count()}</div>
                  {() => state.a}
                </div>;
      }
    `;

    check(code, result);
  });

  it("conditional memo's", () => {
    // TODO: somehow ternary expression like {signal() ? <div /> : <div />} causes a
    // maximum call stack size exceeded error

    const code = `
    function MyComponent() {
      const x1 = <div>{y > 1 && <div>Yes</div>}</div>;
      const x2 = <div>{y && <div>Yes</div>}</div>;
      const x3 = <Component propA={y > 1 && signal()} />;
      const x4 = <Component propA={signal() ? 1 : 2 } />;
      const x5 = <Component propA={signal() && other() ? 1 : 2 } />;
      }
    `;

    const result = `
      import { jsx, createMemo as __createMemo } from "fluid";

      function MyComponent() {
        const _memo = __createMemo(() => y > 1);
      
        const x1 = <div>{() => _memo() && <div>Yes</div>}</div>;
      
        const _memo2 = __createMemo(() => y);
      
        const x2 = <div>{() => _memo2() && <div>Yes</div>}</div>;
      
        const _memo3 = __createMemo(() => y > 1 && signal());
      
        const x3 = jsx(Component, {
          get propA() {
            return _memo3();
          }
      
        });
      
        const _memo4 = __createMemo(() => signal());
      
        const x4 = jsx(Component, {
          get propA() {
            return _memo4() ? 1 : 2;
          }
      
        });
      
        const _memo5 = __createMemo(() => signal() && other());
      
        const x5 = jsx(Component, {
          get propA() {
            return _memo5() ? 1 : 2;
          }
      
        });
      }
    `;

    check(code, result);
  });

  it.skip("check", () => {
    const code = `
    const x = <main>
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
  </main>;
    `;

    console.log(transform(code));
  });
});

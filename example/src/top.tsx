import { createSignal } from "fluid";
import chevron from "../../shared/chevron.svg";

type Props = {
  onAddTodo: (title: string) => void;
  onToggleAllTodos: () => void;
  numberOfTodos: number;
  allCompleted: boolean;
};

export function Top(props: Props) {
  const [title, setTitle] = createSignal("");

  function handleKeyDown(evt: KeyboardEvent) {
    const value = title().trim();
    const shouldSubmit = evt.key === "Enter" && value.length > 0;
    if (shouldSubmit) {
      setTitle("");

      props.onAddTodo(value);
    }
  }

  return (
    <div class="top row">
      {props.numberOfTodos > 0 && (
        <button
          data-testid="toggle-all-btn"
          class="toggle-all-btn"
          data-highlight={props.allCompleted}
          onClick={props.onToggleAllTodos}
        >
          <img src={chevron} />
        </button>
      )}
      <input
        class="new-todo-input center"
        type="text"
        placeholder="What needs to be done?"
        value={title()}
        onInput={(evt) => {
          setTitle(evt.currentTarget.value);
        }}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

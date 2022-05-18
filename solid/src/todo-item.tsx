import type { Todo } from "./index";

type Props = {
  todo: Todo;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export function TodoItem(props: Props) {
  return (
    <li class="todo-item row">
      <input
        type="checkbox"
        checked={props.todo.completed}
        onChange={() => props.onToggle(props.todo.id)}
      />
      <div class="center" data-completed={props.todo.completed}>
        {props.todo.title}
      </div>
      <button class="remove-btn" onClick={() => props.onRemove(props.todo.id)}>
        ✕
      </button>
    </li>
  );
}

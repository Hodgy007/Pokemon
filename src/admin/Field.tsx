import { cloneElement, useId, type ReactElement } from "react";

/** A label above its control, with a hint or error the control is described by. */
export function Field({ label, hint, error, wide, children }: { label: string; hint?: string; error?: string; wide?: boolean; children: ReactElement<Record<string, unknown>> }) {
  const id = useId();
  const note = error ?? hint;
  return (
    <div className={`field ${wide ? "field--wide" : ""}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {cloneElement(children, { id, "aria-describedby": note ? `${id}-note` : undefined, "aria-invalid": error ? true : undefined })}
      {note && (
        <span id={`${id}-note`} className={error ? "field__error" : "field__hint"}>
          {note}
        </span>
      )}
    </div>
  );
}

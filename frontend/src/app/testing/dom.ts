type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function buttonWithText(root: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!button) throw new Error(`No button with text "${text}"`);
  return button;
}

export function buttonTexts(root: HTMLElement, selector = 'button'): string[] {
  return Array.from(root.querySelectorAll(selector)).map((button) => button.textContent!.trim());
}

/** Fires both events so it works for (input) and (change) bindings as well as reactive form controls. */
export function enterValue(field: FormField, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('change'));
}

export function selectFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
}

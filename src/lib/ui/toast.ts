export type ToastVariant = 'default' | 'error' | 'success';
export type ToastPosition = 'top' | 'bottom';

export type ToastOptions = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  position?: ToastPosition;
  animatedIcon?: boolean;
};

const TOAST_ROOT_ID = 'umc-toast-root';
const TOAST_TOP_ROOT_ID = 'umc-toast-root-top';
const DEFAULT_DURATION_MS = 2600;
const DISMISS_ANIMATION_MS = 220;
const MAX_TOASTS = 3;

const ROOT_CLASS: Record<ToastPosition, string> = {
  bottom:
    'pointer-events-none fixed inset-x-0 bottom-8 z-[120] grid justify-items-center gap-2 px-4',
  top: 'pointer-events-none fixed inset-x-0 top-8 z-[120] grid justify-items-center gap-2 px-4',
};
const TOAST_BASE_CLASS =
  'pointer-events-auto inline-flex min-h-12 w-fit max-w-[calc(100vw-32px)] items-center gap-2 rounded-full px-6 py-3 text-left text-body-2-medium shadow-[0_8px_28px_rgba(22,25,25,0.16)] transition-all duration-200 ease-out sm:max-w-[420px]';
const TOAST_VARIANT_CLASS: Record<ToastVariant, string> = {
  default: 'bg-teal-gray-900 text-white',
  error: 'bg-ds-error-soft text-ds-error',
  success: 'bg-ds-success-soft text-ds-success',
};
const TOAST_VISIBLE_CLASSES = ['translate-y-0', 'opacity-100'];
const TOAST_HIDDEN_CLASSES: Record<ToastPosition, string[]> = {
  bottom: ['translate-y-2', 'opacity-0'],
  top: ['-translate-y-2', 'opacity-0'],
};
const TOAST_MESSAGE_CLASS = 'min-w-0 break-words';
const TOAST_ICON_CLASS = 'relative size-5 shrink-0';
const TOAST_ICON_RING_CLASS = 'absolute inset-0 rounded-full border-2 border-current opacity-25';
const TOAST_ICON_PULSE_CLASS =
  'absolute inset-1 rounded-full bg-current opacity-30 motion-safe:animate-ping';
const TOAST_ICON_DOT_CLASS = 'absolute inset-[7px] rounded-full bg-current';

function getRootId(position: ToastPosition): string {
  return position === 'top' ? TOAST_TOP_ROOT_ID : TOAST_ROOT_ID;
}

function getToastRoot(position: ToastPosition): HTMLElement {
  const rootId = getRootId(position);
  const existing = document.getElementById(rootId);
  if (existing) return existing;

  const root = document.createElement('div');
  root.id = rootId;
  root.className = ROOT_CLASS[position];
  document.body.append(root);
  return root;
}

function removeToast(toast: HTMLElement, root: HTMLElement, position: ToastPosition): void {
  toast.classList.remove(...TOAST_VISIBLE_CLASSES);
  toast.classList.add(...TOAST_HIDDEN_CLASSES[position]);

  window.setTimeout(() => {
    toast.remove();
    if (root.children.length === 0) root.remove();
  }, DISMISS_ANIMATION_MS);
}

function createAnimatedIcon(): HTMLElement {
  const icon = document.createElement('span');
  icon.className = TOAST_ICON_CLASS;
  icon.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('span');
  ring.className = TOAST_ICON_RING_CLASS;
  const pulse = document.createElement('span');
  pulse.className = TOAST_ICON_PULSE_CLASS;
  const dot = document.createElement('span');
  dot.className = TOAST_ICON_DOT_CLASS;

  icon.append(ring, pulse, dot);
  return icon;
}

export function showToast({
  message,
  variant = 'default',
  durationMs = DEFAULT_DURATION_MS,
  position = 'bottom',
  animatedIcon = false,
}: ToastOptions): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!message.trim()) return;

  const root = getToastRoot(position);
  const toast = document.createElement('div');
  toast.className = `${TOAST_BASE_CLASS} ${TOAST_VARIANT_CLASS[variant]} ${TOAST_HIDDEN_CLASSES[position].join(' ')}`;
  if (animatedIcon) toast.append(createAnimatedIcon());

  const messageElement = document.createElement('span');
  messageElement.className = TOAST_MESSAGE_CLASS;
  messageElement.textContent = message;
  toast.append(messageElement);

  toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');
  root.append(toast);

  while (root.children.length > MAX_TOASTS) root.firstElementChild?.remove();

  window.requestAnimationFrame(() => {
    toast.classList.remove(...TOAST_HIDDEN_CLASSES[position]);
    toast.classList.add(...TOAST_VISIBLE_CLASSES);
  });

  window.setTimeout(() => removeToast(toast, root, position), durationMs);
}

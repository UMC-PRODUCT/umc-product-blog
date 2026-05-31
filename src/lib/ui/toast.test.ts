import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from './toast';

class FakeClassList {
  constructor(private readonly element: FakeElement) {}

  add(...classes: string[]): void {
    const next = new Set(this.element.className.split(/\s+/).filter(Boolean));
    for (const className of classes) next.add(className);
    this.element.className = [...next].join(' ');
  }

  remove(...classes: string[]): void {
    const next = new Set(this.element.className.split(/\s+/).filter(Boolean));
    for (const className of classes) next.delete(className);
    this.element.className = [...next].join(' ');
  }
}

class FakeElement {
  id = '';
  className = '';
  private ownTextContent = '';
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  readonly classList = new FakeClassList(this);

  append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      node.parentElement = this;
      this.children.push(node);
    }
  }

  remove(): void {
    if (!this.parentElement) return;
    const index = this.parentElement.children.indexOf(this);
    if (index >= 0) this.parentElement.children.splice(index, 1);
    this.parentElement = null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  get firstElementChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  get textContent(): string {
    return `${this.ownTextContent}${this.children.map((child) => child.textContent).join('')}`;
  }

  set textContent(value: string) {
    this.ownTextContent = value;
  }
}

function findById(root: FakeElement, id: string): FakeElement | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const match = findById(child, id);
    if (match) return match;
  }
  return null;
}

function createFakeDocument() {
  const body = new FakeElement();

  return {
    body,
    createElement: () => new FakeElement(),
    getElementById: (id: string) => findById(body, id),
  };
}

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', createFakeDocument());
    vi.stubGlobal('window', {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
      setTimeout,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders reusable error toast and dismisses it after the duration', () => {
    showToast({
      message: '좋아요 변경에 실패했습니다.',
      variant: 'error',
      durationMs: 1000,
    });

    const root = document.getElementById('umc-toast-root');
    expect(root).not.toBeNull();

    const toast = root!.children[0];
    expect(toast.textContent).toContain('좋아요 변경에 실패했습니다.');
    expect(toast.getAttribute('role')).toBe('alert');
    expect(root!.className).toContain('bottom-8');
    expect(toast.className).toContain('rounded-full');
    expect(toast.className).toContain('px-6');
    expect(toast.className).toContain('w-fit');
    expect(toast.className).toContain('max-w-[calc(100vw-32px)]');
    expect(toast.className.split(/\s+/)).not.toContain('w-full');
    expect(toast.className).toContain('bg-ds-error-soft');
    expect(toast.className).toContain('text-ds-error');
    expect(toast.className).toContain('shadow-');
    expect(toast.className.split(/\s+/).some((className) => className.startsWith('border'))).toBe(
      false,
    );

    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(250);

    expect(document.getElementById('umc-toast-root')).toBeNull();
  });

  it('uses borderless solid backgrounds with variant text colors', () => {
    showToast({ message: '기본 알림', durationMs: 1000 });
    showToast({ message: '성공 알림', variant: 'success', durationMs: 1000 });
    showToast({ message: '오류 알림', variant: 'error', durationMs: 1000 });

    const root = document.getElementById('umc-toast-root');
    expect(root).not.toBeNull();

    const [defaultToast, successToast, errorToast] = root!.children;
    expect(defaultToast.className).toContain('bg-teal-gray-900');
    expect(defaultToast.className).toContain('text-white');
    expect(successToast.className).toContain('bg-ds-success-soft');
    expect(successToast.className).toContain('text-ds-success');
    expect(errorToast.className).toContain('bg-ds-error-soft');
    expect(errorToast.className).toContain('text-ds-error');

    for (const toast of root!.children) {
      expect(toast.className.split(/\s+/).some((className) => className.startsWith('border'))).toBe(
        false,
      );
    }
  });

  it('can render at the top and include an animated left icon', () => {
    showToast({
      message: '상단 알림입니다.',
      position: 'top',
      animatedIcon: true,
      durationMs: 1000,
    });

    expect(document.getElementById('umc-toast-root')).toBeNull();

    const root = document.getElementById('umc-toast-root-top');
    expect(root).not.toBeNull();
    expect(root!.className).toContain('top-8');
    expect(root!.className).not.toContain('bottom-8');

    const toast = root!.children[0];
    expect(toast.textContent).toContain('상단 알림입니다.');
    expect(toast.children.length).toBe(2);
    expect(toast.children[0].getAttribute('aria-hidden')).toBe('true');
    expect(toast.children[0].className).toContain('size-5');
    expect(toast.children[0].children[1].className).toContain('animate-ping');
    expect(toast.children[1].textContent).toBe('상단 알림입니다.');
  });
});

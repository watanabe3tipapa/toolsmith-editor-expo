import React, { useEffect, useRef, useState } from 'react';
import { Link2, X } from 'lucide-react';

type LinkEditorModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
};

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function LinkEditorModal({ open, onClose, onSubmit }: LinkEditorModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const url = normalizeUrl(value);
    if (!url) {
      setError('URLを入力してください。');
      return;
    }
    onSubmit(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation">
      <section
        className="w-full max-w-md rounded-xl border border-primary/50 bg-background p-6 shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="toolsmith-link-modal-title"
      >
        <div className="flex items-center justify-between">
          <p className="font-orbitron text-xs tracking-[0.18em] text-primary">INSERT LINK</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded p-1.5 text-foreground/60 transition-colors hover:bg-primary/15 hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="toolsmith-link-modal-title" className="mt-3 text-2xl font-semibold text-foreground">
          リンクを挿入
        </h2>
        <form onSubmit={handleSubmit} className="mt-5">
          <label htmlFor="toolsmith-link-url" className="block text-xs text-foreground/60">
            URL
          </label>
          <div className="mt-2 flex items-center gap-2 rounded border border-primary/30 bg-black/30 px-3">
            <Link2 size={16} className="text-primary" />
            <input
              ref={inputRef}
              id="toolsmith-link-url"
              type="text"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError('');
              }}
              placeholder="https://example.com"
              className="w-full bg-transparent px-1.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none"
              aria-describedby={error ? 'toolsmith-link-error' : undefined}
            />
          </div>
          {error && (
            <p id="toolsmith-link-error" className="mt-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-primary/40 px-4 py-2.5 font-semibold text-foreground transition-colors hover:bg-primary/10"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded bg-primary px-4 py-2.5 font-semibold text-background transition-colors hover:brightness-110"
            >
              挿入
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default LinkEditorModal;
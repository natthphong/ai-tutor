"use client";

import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EbookOriginalBook } from "./EbookTypes";

export default function OriginalBookDialog({
  book,
  pageCount,
}: {
  book: EbookOriginalBook;
  pageCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(book.page);
  const [missing, setMissing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => setPage(book.page), [book.page]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => trigger.current?.focus());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function changePage(next: number) {
    setMissing(false);
    setPage(Math.max(1, Math.min(pageCount, next)));
  }

  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  if (book.available === false || pageCount < 1) return null;

  return (
    <>
      <button ref={trigger} type="button" className="button ebook-book-trigger" onClick={() => { setMissing(false); setOpen(true); }}><FileText size={17} />Open Original Book</button>
      {open && (
        <div className="ebook-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className="card ebook-book-dialog" role="dialog" aria-modal="true" aria-labelledby="ebook-book-title">
            <div className="ebook-dialog-header"><div><span className="eyebrow">OPTIONAL REFERENCE</span><h2 id="ebook-book-title">{book.label || "Original Book"}</h2></div><button type="button" className="icon-button" aria-label="Close book dialog" onClick={close}><X /></button></div>
            <p>The lesson stays here while you check the private book at page {page}.</p>
            <div className="ebook-book-page-nav"><button type="button" className="icon-button" aria-label="Previous book page" disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft /></button><span>Page <strong>{page}</strong> / {pageCount}</span><button type="button" className="icon-button" aria-label="Next book page" disabled={page >= pageCount} onClick={() => changePage(page + 1)}><ChevronRight /></button></div>
            <img className="ebook-page" src={`/api/ebook/pages/${page}`} alt={`หนังสือต้นฉบับ หน้า ${page}`} onError={() => setMissing(true)} />
            {missing && <div className="ebook-book-missing" role="status"><FileText size={24} /><strong>This page is not available yet.</strong><p>Your lesson is still available. Try another page later.</p></div>}
            <button type="button" className="button wide" onClick={close}>Close Original Book</button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type GalleryItem = { image: string; alt: string; contain?: boolean };

export default function ApprovalGallery({ items, className, sizes }: { items: GalleryItem[]; className: string; sizes: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const dialog = useRef<HTMLDialogElement>(null);
  const open = index !== null;

  const close = useCallback(() => { setIndex(null); setZoomed(false); }, []);
  const step = useCallback((delta: number) => {
    setZoomed(false);
    setIndex((i) => (i === null ? i : (i + delta + items.length) % items.length));
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.current?.open) dialog.current?.showModal();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open, step]);

  const track = (event: ReactMouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  const current = open ? items[index] : null;
  const many = items.length > 1;

  return <>
    <div className={className}>
      {items.map((item, i) => (
        <button key={i} type="button" aria-haspopup="dialog" aria-label={`View larger: ${item.alt}`} onClick={() => setIndex(i)} className="card-hover relative aspect-[271/336] w-full cursor-zoom-in overflow-hidden rounded-sm">
          <Image src={item.image} alt={item.alt} fill sizes={sizes} className={item.contain ? "object-contain" : "object-cover"} />
        </button>
      ))}
    </div>
    {current && <dialog ref={dialog} aria-label={current.alt} onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-dark-300/90">
      <div className="flex h-full w-full items-center justify-center p-4 sm:p-12" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div
          className={`relative h-full w-full max-w-[60rem] overflow-hidden ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          onClick={(event) => { track(event); setZoomed((z) => !z); }}
          onPointerMove={(event) => { if (zoomed) track(event); }}
        >
          <Image key={current.image} src={current.image} alt={current.alt} fill sizes="(min-width:1024px) 60rem, 100vw" quality={90} priority className="object-contain transition-transform duration-300 ease-out" style={{ transform: zoomed ? "scale(2.25)" : "scale(1)", transformOrigin: origin }} />
        </div>
      </div>
      <button type="button" autoFocus onClick={close} aria-label="Close" className="absolute right-3 top-3 grid size-11 cursor-pointer place-items-center rounded-full bg-light-50 shadow-md"><img src="/icons/close.svg" width={24} height={24} alt="" /></button>
      {many && <>
        <button type="button" onClick={() => step(-1)} aria-label="Previous image" className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-light-50 shadow-md sm:left-4"><img src="/icons/arrow-back.svg" width={24} height={24} alt="" /></button>
        <button type="button" onClick={() => step(1)} aria-label="Next image" className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-light-50 shadow-md sm:right-4"><img src="/icons/arrow-forward.svg" width={24} height={24} alt="" /></button>
      </>}
      <p className="t-body3 pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-dark-300/70 px-3 py-1 text-light-50">{many && index !== null ? `${index + 1} / ${items.length} · ` : ""}{zoomed ? "Click to zoom out" : "Click image to zoom"}</p>
    </dialog>}
  </>;
}

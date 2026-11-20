const paths = {
  book: 'M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z M12 6v14',
  file: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
  folder: 'M3 6h6l2 2h10v11H3z',
  check: 'm5 12 4 4 10-10',
  alert: 'm12 3 10 17H2z M12 9v5 M12 17h.01',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v6l4 2',
  edit: 'm4 16-1 5 5-1L20 8l-4-4z M14 6l4 4',
  reset: 'M4 5v5h5 M4 10a8 8 0 1 1 .5 6',
  search: 'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0 M15 15l6 6',
  close: 'm6 6 12 12 M18 6 6 18',
  list: 'M8 6h12 M8 12h12 M8 18h12 M3 6h1 M3 12h1 M3 18h1',
  note: 'M4 4h16v12l-5 4H4z M8 8h8 M8 12h6',
  arrow: 'M5 12h14 m-5-5 5 5-5 5',
};
export function Icon({ name, size = 16 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

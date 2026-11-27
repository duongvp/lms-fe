/** Shared with schedule editing: replace occurrence markers and keep the existing 400-character limit. */
export function calendarLessonDisplayName(source:unknown,prefix:unknown,suffix:unknown,occurrence=1):string {
 const render=(pattern:unknown)=>String(pattern||'').replaceAll('{n}',String(occurrence));
 return `${render(prefix)}${String(source??'')}${render(suffix)}`.slice(0,400);
}

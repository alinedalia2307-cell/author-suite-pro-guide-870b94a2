import { useState, useEffect, useCallback, useRef } from "react";

export interface Chapter {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

const STORAGE_KEY = "manuscript_chapters";
const ACTIVE_KEY = "manuscript_active_chapter";
const DEBOUNCE_MS = 800;

function loadChapters(): Chapter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const initial: Chapter[] = [
    {
      id: crypto.randomUUID(),
      title: "Capítulo 1",
      content: "",
      updatedAt: new Date().toISOString(),
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveChapters(chapters: Chapter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chapters));
}

export function useManuscript() {
  const [chapters, setChapters] = useState<Chapter[]>(loadChapters);
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_KEY);
    const chapters = loadChapters();
    if (saved && chapters.some((c) => c.id === saved)) return saved;
    return chapters[0]?.id ?? "";
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const activeChapter = chapters.find((c) => c.id === activeId) ?? chapters[0];

  // Persist active id
  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  // Persist chapters (immediate for structural changes)
  const persistNow = useCallback((updated: Chapter[]) => {
    setChapters(updated);
    saveChapters(updated);
  }, []);

  const updateContent = useCallback(
    (content: string) => {
      setChapters((prev) => {
        const next = prev.map((c) =>
          c.id === activeId
            ? { ...c, content, updatedAt: new Date().toISOString() }
            : c
        );
        // Debounced save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => saveChapters(next), DEBOUNCE_MS);
        return next;
      });
    },
    [activeId]
  );

  const addChapter = useCallback(() => {
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: `Capítulo ${chapters.length + 1}`,
      content: "",
      updatedAt: new Date().toISOString(),
    };
    const updated = [...chapters, newChapter];
    persistNow(updated);
    setActiveId(newChapter.id);
  }, [chapters, persistNow]);

  const renameChapter = useCallback(
    (id: string, title: string) => {
      persistNow(
        chapters.map((c) =>
          c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
        )
      );
    },
    [chapters, persistNow]
  );

  const deleteChapter = useCallback(
    (id: string) => {
      if (chapters.length <= 1) return;
      const updated = chapters.filter((c) => c.id !== id);
      persistNow(updated);
      if (activeId === id) setActiveId(updated[0].id);
    },
    [chapters, activeId, persistNow]
  );

  const wordCount = (activeChapter?.content ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const charCount = (activeChapter?.content ?? "").length;

  return {
    chapters,
    activeChapter,
    activeId,
    setActiveId,
    updateContent,
    addChapter,
    renameChapter,
    deleteChapter,
    wordCount,
    charCount,
  };
}

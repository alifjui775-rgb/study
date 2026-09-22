CREATE INDEX IF NOT EXISTS idx_paper_chapters_paper_id
  ON public.paper_chapters(paper_id);


CREATE INDEX IF NOT EXISTS idx_chapter_topics_chapter_id
  ON public.chapter_topics(chapter_id);

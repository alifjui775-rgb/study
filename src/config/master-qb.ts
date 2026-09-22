export interface MasterQbStream {
  id: string;
  title: string;
}

export const MASTER_QB_STREAMS: Record<string, MasterQbStream> = {
  "varsity-a": { id: "varsity-a", title: "ভার্সিটি “ক” মাস্টার প্রশ্নব্যাংক" },
  "varsity-b": { id: "varsity-b", title: "ভার্সিটি “খ” মাস্টার প্রশ্নব্যাংক" },
  engineering: { id: "engineering", title: "ইঞ্জিনিয়ারিং মাস্টার প্রশ্নব্যাংক" },
  medical: { id: "medical", title: "মেডিকেল মাস্টার প্রশ্নব্যাংক" },
};

export type MasterQbStreamId = keyof typeof MASTER_QB_STREAMS;

export function isMasterQbStream(id: string | undefined): id is MasterQbStreamId {
  return !!id && id in MASTER_QB_STREAMS;
}

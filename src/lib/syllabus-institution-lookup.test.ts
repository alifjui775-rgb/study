import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

const mock = vi.hoisted(() => ({
  results: {} as Record<string, { data: unknown; error: unknown }>,
  fromCalls: [] as string[],
}));

vi.mock("@/lib/supabase", () => {
  const makeBuilder = (table: string) => {
    const builder: any = {
      select: () => builder,
      is: () => builder,
      eq: () => builder,
      maybeSingle: () => {
        mock.fromCalls.push(table);
        return Promise.resolve(mock.results[table] ?? { data: null, error: null });
      },
    };
    return builder;
  };
  return { supabase: { from: (table: string) => makeBuilder(table) } };
});

import { getInstitutionBySlug } from "./syllabus-queries";

const uniRow = { id: "u1", slug: "du", name_bn: "ঢাকা বিশ্ববিদ্যালয়", name_en: "University of Dhaka" };
const clusterRow = { id: "c1", slug: "gst-cluster", name_bn: "ক্লাস্টার", name_en: "Cluster" };

beforeEach(() => {
  mock.results = {};
  mock.fromCalls = [];
});

describe("getInstitutionBySlug — concurrency", () => {
  it("issues both table lookups before awaiting either", async () => {
    mock.results = {
      universities: { data: null, error: null },
      clusters: { data: null, error: null },
    };
    const promise = getInstitutionBySlug("du");
    // Synchronously, before any await resolves, both queries must have started.
    expect(mock.fromCalls).toEqual(["universities", "clusters"]);
    await promise;
  });
});

describe("getInstitutionBySlug — resolution precedence (matches old sequential loop)", () => {
  it("university match wins when both match", async () => {
    mock.results = {
      universities: { data: uniRow, error: null },
      clusters: { data: clusterRow, error: null },
    };
    const r = await getInstitutionBySlug("du");
    expect(r).toMatchObject({ id: "u1", type: "university" });
  });

  it("returns the cluster when only the cluster matches", async () => {
    mock.results = {
      universities: { data: null, error: null },
      clusters: { data: clusterRow, error: null },
    };
    const r = await getInstitutionBySlug("gst-cluster");
    expect(r).toMatchObject({ id: "c1", type: "cluster" });
  });

  it("returns null when neither matches and nothing errored", async () => {
    mock.results = {
      universities: { data: null, error: null },
      clusters: { data: null, error: null },
    };
    await expect(getInstitutionBySlug("nope")).resolves.toBeNull();
  });

  it("ignores a cluster error when the university matched (old loop never queried clusters)", async () => {
    const clusterErr = new Error("cluster boom");
    mock.results = {
      universities: { data: uniRow, error: null },
      clusters: { data: null, error: clusterErr },
    };
    const r = await getInstitutionBySlug("du");
    expect(r).toMatchObject({ id: "u1", type: "university" });
  });

  it("returns the cluster when the university lookup errored", async () => {
    mock.results = {
      universities: { data: null, error: new Error("uni boom") },
      clusters: { data: clusterRow, error: null },
    };
    const r = await getInstitutionBySlug("gst-cluster");
    expect(r).toMatchObject({ id: "c1", type: "cluster" });
  });

  it("throws the university error when only universities errored", async () => {
    const uniErr = new Error("uni boom");
    mock.results = {
      universities: { data: null, error: uniErr },
      clusters: { data: null, error: null },
    };
    await expect(getInstitutionBySlug("x")).rejects.toBe(uniErr);
  });

  it("throws the cluster error when only clusters errored", async () => {
    const clusterErr = new Error("cluster boom");
    mock.results = {
      universities: { data: null, error: null },
      clusters: { data: null, error: clusterErr },
    };
    await expect(getInstitutionBySlug("x")).rejects.toBe(clusterErr);
  });

  it("throws the LAST lookup's error when both errored (old: clusters overwrote)", async () => {
    const uniErr = new Error("uni boom");
    const clusterErr = new Error("cluster boom");
    mock.results = {
      universities: { data: null, error: uniErr },
      clusters: { data: null, error: clusterErr },
    };
    await expect(getInstitutionBySlug("x")).rejects.toBe(clusterErr);
  });
});

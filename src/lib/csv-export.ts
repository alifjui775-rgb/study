/**
 * CSV export utilities - replaces /api/export-results-csv
 * Generates and downloads CSV files directly from the browser
 */

export function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportResultsAsCsv(examId: string, results: Record<string, unknown>[]) {
  if (results.length === 0) {
    throw new Error("No results to export");
  }

  downloadCsv(results as Record<string, unknown>[], `results_${examId}`);
}

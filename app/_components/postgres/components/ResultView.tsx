"use client";

import type { MockResult } from "../stores/usePostgresPlaygroundStore";

export function ResultView({ result }: { result: MockResult | null }) {
  if (!result) {
    return (
      <div className="sql-result-empty postgres-placeholder">
        Run a mock query to preview the future PostgreSQL result grid.
      </div>
    );
  }
  return (
    <div className="sql-result-table-wrap">
      <table className="sql-result-table">
        <thead>
          <tr>{result.columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

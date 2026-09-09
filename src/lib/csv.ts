export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

export function parseCsv(text: string): ParsedCsv {
  const input = text.replace(/^\uFEFF/, "");
  const records = parseRecords(input);
  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0];
  const width = headers.length;
  const rows = records.slice(1).map((row) => {
    if (row.length >= width) return row;
    return [...row, ...Array(width - row.length).fill("")];
  });

  return { headers, rows };
}

function parseRecords(input: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    records.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      pushField();
      pushRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  if (inQuotes || field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  if (
    records.length > 0 &&
    records[records.length - 1].every((cell) => cell === "") &&
    /[\r\n]$/.test(input)
  ) {
    records.pop();
  }

  return records;
}

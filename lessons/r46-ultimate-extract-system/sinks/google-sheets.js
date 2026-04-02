export async function writeGoogleSheetsPlaceholder({ platform }) {
  return {
    sink: 'google-sheets',
    status: 'blocked-not-implemented',
    notes: [
      `Google Sheets export is not wired yet for ${platform.label}.`,
      `Original template target: ${platform.sink.documentName} / ${platform.sink.sheetName}`,
    ],
  };
}


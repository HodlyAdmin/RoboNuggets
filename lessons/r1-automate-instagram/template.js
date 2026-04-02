import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TEMPLATE_PATH = join(__dirname, 'assets', 'original', 'Automate Instagram.json');

function cleanLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function sanitizeSlug(value) {
  return cleanLabel(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeHeader(value) {
  return sanitizeSlug(value);
}

function parseFieldReference(expression) {
  if (typeof expression !== 'string') return null;
  const match = expression.match(/\{\{[^.]+\.\`?([^}`]+)\`?\}\}/);
  return match?.[1] || null;
}

function parseHandle(label) {
  const match = cleanLabel(label).match(/\(@([^)\s]+)\)/);
  return match ? `@${match[1]}` : null;
}

function parseSourceFolder(pathTemplate) {
  if (typeof pathTemplate !== 'string') return null;
  const match = pathTemplate.match(/^\/([^/]+)\//);
  return match?.[1] || null;
}

function parseSheetColumns(sheetModule) {
  const fields = sheetModule?.metadata?.interface || [];

  return fields
    .filter((field) => /^\d+$/.test(String(field.name)))
    .map((field) => {
      const label = cleanLabel(field.label);
      const match = label.match(/^(.*?)(?: \(([A-Z]+)\))?$/);
      const header = cleanLabel(match?.[1] || label);
      const column = match?.[2] || null;

      return {
        fieldId: String(field.name),
        header,
        key: normalizeHeader(header),
        column,
      };
    })
    .filter((field) => field.header && !/^\([A-Z]+\)$/.test(field.header));
}

export async function buildTemplateModel() {
  const raw = await readFile(TEMPLATE_PATH, 'utf8');
  const blueprint = JSON.parse(raw);
  const modules = blueprint.flow || [];

  const counterModule = modules.find((module) => module.module === 'util:FunctionIncrement');
  const dropboxModule = modules.find((module) => module.module === 'dropbox:createShareLink');
  const sheetModule = modules.find((module) => module.module === 'google-sheets:filterRows');
  const instagramModule = modules.find((module) => module.module === 'instagram-business:CreatePostPhoto');
  const sheetColumns = parseSheetColumns(sheetModule).slice(0, 5);
  const instagramAccountLabel = instagramModule?.metadata?.restore?.expect?.accountId?.label || null;

  return {
    lessonName: 'R1 | Automate Instagram for 365 days',
    templatePath: TEMPLATE_PATH,
    scenarioName: blueprint.name || null,
    flowModules: modules.map((module) => ({
      id: module.id,
      module: module.module,
      mapperKeys: Object.keys(module.mapper || {}),
    })),
    counter: {
      reset: counterModule?.parameters?.reset || null,
      valueField: 'i',
    },
    dropbox: {
      pathTemplate: dropboxModule?.mapper?.path || null,
      sourceFolder: parseSourceFolder(dropboxModule?.mapper?.path),
      access: dropboxModule?.mapper?.settings?.access || null,
      connectionLabel: dropboxModule?.metadata?.restore?.parameters?.__IMTCONN__?.label || null,
    },
    sheet: {
      spreadsheetId: sheetModule?.mapper?.spreadsheetId || null,
      spreadsheetLabel: sheetModule?.metadata?.restore?.expect?.spreadsheetId?.label || null,
      sheetId: sheetModule?.mapper?.sheetId || null,
      columnRange: sheetModule?.mapper?.tableFirstRow || null,
      filterColumn: sheetModule?.mapper?.filter?.[0]?.[0]?.a || null,
      filterValueReference: parseFieldReference(sheetModule?.mapper?.filter?.[0]?.[0]?.b),
      captionFieldId: parseFieldReference(instagramModule?.mapper?.caption),
      columns: sheetColumns,
    },
    instagram: {
      accountId: instagramModule?.mapper?.accountId || null,
      accountLabel: instagramAccountLabel,
      handle: parseHandle(instagramAccountLabel),
      imageSourceReference: parseFieldReference(instagramModule?.mapper?.image_url),
      connectionLabel: instagramModule?.metadata?.restore?.parameters?.__IMTCONN__?.label || null,
    },
  };
}

export function inferProjectName(templateModel) {
  return sanitizeSlug(
    templateModel?.instagram?.handle ||
    templateModel?.instagram?.accountLabel ||
    templateModel?.dropbox?.sourceFolder ||
    'r1-automate-instagram'
  );
}

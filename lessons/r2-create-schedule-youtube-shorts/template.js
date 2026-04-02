import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_TEMPLATE_PATH = join(__dirname, 'assets', 'original', 'Quotes - YT Shorts v1.json');

function sanitizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function getModule(flow, moduleName) {
  return (flow || []).find((step) => step.module === moduleName) || null;
}

function getDesignerName(step) {
  return step?.metadata?.designer?.name || step?.module || null;
}

function parseRouterDestinations(routerStep) {
  return (routerStep?.routes || []).map((route) => {
    const destination = route?.flow?.[0] || null;
    return {
      id: destination?.id || null,
      module: destination?.module || null,
      disabled: Boolean(route?.disabled),
      label: getDesignerName(destination),
      mapper: destination?.mapper || null,
    };
  });
}

export async function buildTemplateModel(templatePath = DEFAULT_TEMPLATE_PATH) {
  const raw = await readFile(templatePath, 'utf8');
  const blueprint = JSON.parse(raw);
  const flow = blueprint.flow || [];

  const sheetStep = getModule(flow, 'google-sheets:filterRows');
  const sheetUpdateStep = getModule(flow, 'google-sheets:updateRow');
  const audioStep = getModule(flow, 'elevenlabs:createTextToSpeech');
  const dropboxUploadStep = getModule(flow, 'dropbox:uploadLargeFile');
  const dropboxShareStep = getModule(flow, 'dropbox:createShareLink');
  const createVideoStep = getModule(flow, 'http:ActionSendDataAPIKeyAuth');
  const waitStep = getModule(flow, 'util:FunctionSleep');
  const getVideoStep = flow.find((step) => step.id === 11) || null;
  const storeVideoStep = getModule(flow, 'http:ActionGetFile');
  const routerStep = getModule(flow, 'builtin:BasicRouter');
  const routerDestinations = parseRouterDestinations(routerStep);
  const youtubeStep = routerDestinations.find((route) => route.module === 'youtube:uploadVideo') || null;
  const instagramStep = routerDestinations.find((route) => route.module === 'instagram-business:CreateAReelPost') || null;

  const json2videoPayload = (() => {
    const payload = createVideoStep?.mapper?.data;
    if (!payload || typeof payload !== 'string') return null;
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  })();

  return {
    lessonId: 'R2',
    lessonName: 'R2 | Create & Schedule 100 YouTube Shorts',
    templatePath,
    scenarioName: blueprint.name || 'Quotes to YT Shorts',
    makeZone: blueprint.metadata?.zone || null,
    flowModules: flow.map((step) => ({
      id: step.id,
      module: step.module,
      label: getDesignerName(step),
    })),
    sheet: {
      spreadsheetId: sheetStep?.mapper?.spreadsheetId || null,
      sheetId: sheetStep?.mapper?.sheetId || null,
      orderBy: sheetStep?.mapper?.orderBy || null,
      limit: Number(sheetStep?.mapper?.limit || 1),
      statusColumn: sheetStep?.mapper?.filter?.[0]?.[0]?.a || 'D',
      statusValue: sheetStep?.mapper?.filter?.[0]?.[0]?.b || 'Not Posted',
      updateStatusValue: sheetUpdateStep?.mapper?.values?.['3'] || 'Posted',
    },
    audio: {
      voiceId: audioStep?.mapper?.voice_id || null,
      modelId: audioStep?.mapper?.model_id || null,
      textField: audioStep?.mapper?.text || null,
      uploadPath: dropboxUploadStep?.mapper?.path || null,
      fileNameTemplate: dropboxUploadStep?.mapper?.filename || null,
      sharePathTemplate: dropboxShareStep?.mapper?.path || null,
    },
    video: {
      createUrl: createVideoStep?.mapper?.url || null,
      pollUrl: getVideoStep?.mapper?.url || null,
      waitSeconds: Number(waitStep?.mapper?.duration || 90),
      templateVideoSrc: json2videoPayload?.scenes?.[0]?.elements?.find((element) => element.type === 'video')?.src || null,
      width: json2videoPayload?.width || 1080,
      height: json2videoPayload?.height || 1920,
      subtitlesStyle: json2videoPayload?.scenes?.[0]?.elements?.find((element) => element.type === 'subtitles')?.settings || null,
      storeVideoUrl: storeVideoStep?.mapper?.url || null,
    },
    youtube: {
      titleField: youtubeStep?.mapper?.title || null,
      description: youtubeStep?.mapper?.description || null,
      privacyStatus: youtubeStep?.mapper?.privacyStatus || 'public',
      categoryId: youtubeStep?.mapper?.categoryId || null,
      madeForKids: youtubeStep?.mapper?.selfDeclaredMadeForKids || false,
    },
    instagramFallback: {
      enabledInBlueprint: Boolean(instagramStep && !instagramStep.disabled),
      captionField: instagramStep?.mapper?.caption || null,
      accountId: instagramStep?.mapper?.accountId || null,
    },
    originalDestinations: routerDestinations,
  };
}

export function inferProjectName(templateModel) {
  const base = templateModel?.scenarioName || templateModel?.lessonId || 'r2-youtube-shorts';
  return sanitizeSlug(base.replace(/^quotes\s*->/i, '').trim()) || 'r2-youtube-shorts';
}

export { sanitizeSlug, DEFAULT_TEMPLATE_PATH };

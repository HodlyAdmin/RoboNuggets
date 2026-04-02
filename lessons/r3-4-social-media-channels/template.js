import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_TEMPLATE_PATH = join(__dirname, 'assets', 'original', 'News to Social Media roboflow v1.json');

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

function extractRouteMap(routerStep) {
  const routes = routerStep?.routes || [];
  const map = {};

  for (const route of routes) {
    const modules = route?.flow || [];
    const publisher = modules.at(-1)?.module || '';

    if (publisher.includes('twitter:')) {
      map.twitter = modules;
    } else if (publisher.includes('linkedin:')) {
      map.linkedin = modules;
    } else if (publisher.includes('facebook-pages:')) {
      map.facebook = modules;
    } else if (publisher.includes('instagram-business:')) {
      map.instagram = modules;
    }
  }

  return map;
}

function routeSummary(routeModules) {
  return (routeModules || []).map((step) => ({
    id: step.id,
    module: step.module,
    label: step.metadata?.designer?.name || null,
  }));
}

export async function buildTemplateModel(templatePath = DEFAULT_TEMPLATE_PATH) {
  const raw = await readFile(templatePath, 'utf8');
  const blueprint = JSON.parse(raw);
  const flow = blueprint.flow || [];

  const sheetStep = getModule(flow, 'google-sheets:watchRows');
  const bitlyStep = getModule(flow, 'bitly:shortenUrl');
  const perplexityStep = getModule(flow, 'perplexity-ai:createAChatCompletion');
  const routerStep = getModule(flow, 'builtin:BasicRouter');
  const routes = extractRouteMap(routerStep);

  const twitterDraftStep = routes.twitter?.find((step) => step.module === 'openai-gpt-3:CreateCompletion') || null;
  const linkedinDraftStep = routes.linkedin?.find((step) => step.module === 'openai-gpt-3:CreateCompletion') || null;
  const facebookDraftStep = routes.facebook?.find((step) => step.module === 'openai-gpt-3:CreateCompletion') || null;
  const instagramDraftStep = routes.instagram?.find((step) => step.module === 'openai-gpt-3:CreateCompletion') || null;
  const instagramImageStep = routes.instagram?.find((step) => step.module === 'openai-gpt-3:GenerateImage') || null;
  const twitterPublishStep = routes.twitter?.find((step) => step.module === 'twitter:createATweet') || null;
  const linkedinPublishStep = routes.linkedin?.find((step) => step.module === 'linkedin:CreatePost') || null;
  const facebookPublishStep = routes.facebook?.find((step) => step.module === 'facebook-pages:CreatePost') || null;
  const instagramPublishStep = routes.instagram?.find((step) => step.module === 'instagram-business:CreatePostPhoto') || null;

  return {
    lessonId: 'R3',
    lessonName: 'R3 | 4 Social Media Channels, 1 AI Agent',
    templatePath,
    scenarioName: blueprint.name || 'News to Social Media',
    makeZone: blueprint.metadata?.zone || null,
    sheet: {
      spreadsheetId: sheetStep?.parameters?.spreadsheetId || null,
      sheetId: sheetStep?.parameters?.sheetId || null,
      limit: Number(sheetStep?.parameters?.limit || 1),
      articleUrlField: 'News link (A)',
      notesField: 'My notes (B)',
    },
    bitly: {
      enabled: Boolean(bitlyStep),
      longUrlField: bitlyStep?.mapper?.long_url || null,
    },
    research: {
      provider: perplexityStep?.module || null,
      model: perplexityStep?.mapper?.model || null,
      prompt: perplexityStep?.mapper?.messages?.[0]?.content || null,
    },
    routes: {
      twitter: {
        steps: routeSummary(routes.twitter),
        prompt: twitterDraftStep?.mapper?.messages?.[0]?.content || null,
        publishTextField: twitterPublishStep?.mapper?.text || null,
      },
      linkedin: {
        steps: routeSummary(routes.linkedin),
        prompt: linkedinDraftStep?.mapper?.messages?.[0]?.content || null,
        visibility: linkedinPublishStep?.mapper?.visibility || null,
      },
      facebook: {
        steps: routeSummary(routes.facebook),
        prompt: facebookDraftStep?.mapper?.messages?.[0]?.content || null,
        pageId: facebookPublishStep?.mapper?.page_id || null,
      },
      instagram: {
        steps: routeSummary(routes.instagram),
        prompt: instagramDraftStep?.mapper?.messages?.[0]?.content || null,
        imagePrompt: instagramImageStep?.mapper?.prompt || null,
        accountId: instagramPublishStep?.mapper?.accountId || null,
      },
    },
  };
}

export function inferProjectName(templateModel) {
  return sanitizeSlug(templateModel?.scenarioName || templateModel?.lessonId || 'r3-social-agent') || 'r3-social-agent';
}

export { sanitizeSlug, DEFAULT_TEMPLATE_PATH };

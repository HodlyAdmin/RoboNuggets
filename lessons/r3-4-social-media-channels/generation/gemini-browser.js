import { generateJSON } from '../../../shared/chrome-ai.js';

function truncate(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function buildPrompt({ article, linkUrl }) {
  return [
    'Return only valid JSON.',
    '',
    'You are rebuilding a social automation workflow that turns one news article into four social posts.',
    `Article URL: ${article.articleUrl || 'n/a'}`,
    `Link to include in every post exactly once: ${linkUrl}`,
    `Article title: ${article.articleTitle}`,
    `Author notes / tone guidance: ${article.notes || 'None provided.'}`,
    '',
    'Tasks:',
    '1. Write a concise but thoughtful article summary.',
    '2. Extract the single strongest key insight.',
    '3. Create platform-native drafts for Twitter, LinkedIn, Facebook, and Instagram.',
    '4. Create a visually rich Instagram image concept that does not require text inside the image.',
    '',
    'Rules:',
    '- Every post must include the link exactly once.',
    '- Put hashtags before the link.',
    '- Use no more than 2 hashtags per post.',
    '- Twitter must be under 250 characters total.',
    '- LinkedIn should be 2-4 short paragraphs.',
    '- Facebook should be conversational and concise.',
    '- Instagram caption should feel polished and audience-friendly.',
    '- Do not wrap output in markdown fences.',
    '',
    'Return this exact JSON shape:',
    '{"articleSummary":"...","keyInsight":"...","twitterPost":"...","linkedinPost":"...","facebookPost":"...","instagramCaption":"...","instagramImageConcept":"...","hashtags":["tag1","tag2"]}',
    '',
    'Article text:',
    truncate(article.articleText, 12000),
  ].join('\n');
}

export async function generateSocialDrafts({ article, linkUrl, timeoutMs }) {
  const prompt = buildPrompt({ article, linkUrl });
  const response = await generateJSON(prompt, {
    timeout: Number(timeoutMs) || 120000,
  });

  return {
    prompt,
    response,
    drafts: {
      articleSummary: String(response.articleSummary || '').trim(),
      keyInsight: String(response.keyInsight || '').trim(),
      twitterPost: String(response.twitterPost || '').trim(),
      linkedinPost: String(response.linkedinPost || '').trim(),
      facebookPost: String(response.facebookPost || '').trim(),
      instagramCaption: String(response.instagramCaption || '').trim(),
      instagramImageConcept: String(response.instagramImageConcept || '').trim(),
      hashtags: Array.isArray(response.hashtags)
        ? response.hashtags.map((tag) => String(tag).trim()).filter(Boolean)
        : [],
    },
  };
}

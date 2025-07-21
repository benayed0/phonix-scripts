import { Injectable } from '@nestjs/common';
import OpenAIApi, { OpenAI } from 'openai';

@Injectable()
export class LlmService {
  private client = new OpenAI();
  constructor() {}
  private async askAi(prompt: string) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });
    return JSON.parse(this.extractJson(response.choices[0].message.content));
  }

  private extractJson(raw: string): string {
    const trimmed = raw.trim();

    // If markdown-style block: remove ```json and ```
    if (trimmed.startsWith('```json') || trimmed.startsWith('```')) {
      return trimmed.replace(/```json|```/g, '').trim();
    }

    // Else: return raw as-is
    return trimmed;
  }

  async getDomainCategory(domain: string): Promise<string> {
    const prompt = `
You are a strict domain classifier.

Your task is to classify a website based solely on its domain name. You must choose **only one** of the following categories:

- streaming: online video/audio platforms (e.g., netflix.com, spotify.com)
- adult: sexually explicit or NSFW content (e.g., pornhub.com)
- dictionary: word definitions or translation tools (e.g., dictionary.com, deepl.com)
- gaming: video games, game platforms, or communities (e.g., steamcommunity.com)
- news: news outlets or journalism (e.g., cnn.com, bbc.com)
- social: social networks or discussion forums (e.g., facebook.com, reddit.com)
- unknown: if the domain is ambiguous or unfamiliar

Return **only** a strict JSON object in this format:  
{ "response": "category_name" }

Do not include any explanations or formatting (no markdown).

Domain to classify:
${domain}
`;

    const { response } = await this.askAi(prompt);
    return response;
  }

  async getWebsiteCategory(url: string, content: string): Promise<string> {
    const prompt = `
    You are an expert web classifier.

Your job is to classify websites into **one of the following categories** based on both the domain and the visible content. If you're uncertain or the content lacks enough signal, return "other".

Categories:
- streaming: online video/audio platforms (e.g., Netflix, YouTube, Spotify)
- adult: sexually explicit or NSFW material
- dictionary: word definitions or language translation
- gaming: online games or game-related content
- news: journalism, news articles, or press outlets
- social: social media platforms or forums (e.g., Facebook, Reddit)
- other: if it clearly does not fit any of the above

Analyze the following website content and return **only** a strict JSON object with this format:  
\`\`\`json
{ "response": "category_name" }
\`\`\`

Domain: ${url}

Website content:
"""
${content}
"""
    `;
    const { response } = await this.askAi(prompt);
    return response;
  }
}

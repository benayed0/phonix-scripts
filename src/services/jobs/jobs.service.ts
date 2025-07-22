import { Injectable, OnModuleInit } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ScraperService } from '../scraper/scraper.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class JobsService implements OnModuleInit {
  constructor(
    private firebase: FirebaseService,
    private scrapper: ScraperService,
    private llm: LlmService,
  ) {}
  async onModuleInit() {
    await this.processUncuratedWebsitesBatch();
    this.firebase.listenToUncuratedChanges(this.processWebsite.bind(this));
  }
  async processWebsite(url: string) {
    const category = await this.getWebsiteCategory(url);
    await this.appendWebsite(url, category);
  }
  async appendWebsite(url: string, category: string): Promise<void> {
    // 1. Fetch current state from Realtime DB
    const current = await this.firebase.getCuratedWebsites();
    const final: Record<string, string[]> = {};

    for (const [cat, urls] of Object.entries(current)) {
      if (cat === category) {
        console.log('already rightly categorized');

        // Preserve target category, add url if missing
        final[cat] = [...new Set([...urls, url])]; // prevent duplicates
      } else {
        // Remove url from all other categories
        if (urls.includes(url)) {
          console.log('removing from previous category ', cat);
        }
        final[cat] = urls.filter((u) => u !== url);
      }
    }

    // 4. Remove from Firestore uncurated list
    await this.firebase.removeWebsitesFromFirestore([url]);

    // 5. Update batch in Realtime DB
    await this.firebase.updateWebsitesBatch(final);

    console.log(`📦 [Updated] "${url}" added to category "${category}".\n`);
  }
  async getWebsiteCategory(url: string) {
    console.log('processing ', url);

    let category = await this.llm.getDomainCategory(url);

    if (category === 'unknown') {
      const websiteContent = await this.scrapper.getWebsite(url);
      if (!websiteContent || websiteContent.trim() === '') {
        console.warn(`❌ Skipping (no content): ${url}, adding to uncurated`);
        category = 'other';
      } else {
        category = await this.llm.getWebsiteCategory(url, websiteContent);
        if (category === 'unknown') {
          console.warn(`🤷 Skipping (unclassified): ${url}`);
          category = 'other';
        }
      }
    }

    return `${this.capitalize(category)}Websites`;
  }
  async processUncuratedWebsitesBatch() {
    console.log('\n🔍 [Start] Processing all uncurated websites...\n');

    const curated = await this.firebase.getUncuratedWebsites();

    const newState: Record<string, Set<string>> = {};

    for (const url of curated) {
      if (!url) continue;
      const newCategory = await this.getWebsiteCategory(url);
      if (!newState[newCategory]) {
        newState[newCategory] = new Set();
      }
      newState[newCategory].add(url);
    }

    // 1. Fetch full current state
    const current = await this.firebase.getCuratedWebsites();

    // 2. Build the new final state: clean all previous category mentions
    const final: Record<string, string[]> = {};

    for (const [category, urls] of Object.entries(current)) {
      final[category] = urls.filter(
        (url) => !Object.values(newState).some((set) => set.has(url)), // remove if it's going to be moved
      );
    }

    // 3. Merge the new categorization
    for (const [category, urls] of Object.entries(newState)) {
      final[category] = final[category] || [];
      for (const url of urls) {
        if (!final[category].includes(url)) {
          final[category].push(url);
        }
      }
    }
    await this.firebase.removeWebsitesFromFirestore(curated);

    // 4. Batch update
    await this.firebase.updateWebsitesBatch(final);

    console.log('🏁 [Done] Categorization and update complete.\n');
  }
  async processCuratedWebsite() {
    console.log('\n🔍 [Start] Processing one uncurated website...\n');

    const curated = await this.firebase.getCuratedWebsites();
    for (const oldCategory in curated) {
      for (const url of curated[oldCategory]) {
        console.log(url, oldCategory);
        let category = await this.llm.getDomainCategory(url);

        if (!url) {
          console.warn('⚠️  No website found in OtherWebsites.');
          continue;
        }
        if (category === 'unknown') {
          console.warn(
            `🤷 [Uncategorized] Could not classify with only domain: ${url}`,
          );

          console.log(`🌐 [Fetching] Scraping content for: ${url}`);
          const websiteContent = await this.scrapper.getWebsite(url);

          if (!websiteContent || websiteContent.trim() === '') {
            console.error(`❌ [Failed] No content found for: ${url}`);
            continue;
          }

          console.log(`🤖 [LLM] Categorizing website...`);
          console.log(websiteContent);

          category = await this.llm.getWebsiteCategory(url, websiteContent);

          if (category === 'unknown') {
            console.warn(
              `🤷 ABORTING -- [Uncategorized] Could not classify: ${url}`,
            );
            continue;
          }
        }

        const newCategory = `${this.capitalize(category)}Websites`;
        if (newCategory === oldCategory) {
          console.log(
            `✅ [Already Categorized] "${url}" classified as ➜ "${newCategory}".`,
          );
          continue;
        }
        console.log(
          `✅ [Categorized] "${url}" classified as ➜ "${newCategory}". Updating database...`,
        );

        await this.firebase.addWebsiteToCategory(url, newCategory);

        console.log(
          `📦 [Updated] "${url}" moved to category "${newCategory}".\n`,
        );
      }
    }
  }
  private capitalize(str: string) {
    if (!str) return '';

    const firstCodePoint = str.codePointAt(0);
    const index = firstCodePoint > 0xffff ? 2 : 1;

    return (
      String.fromCodePoint(firstCodePoint).toUpperCase() + str.slice(index)
    );
  }
}

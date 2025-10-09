import { All, Injectable } from '@nestjs/common';
import { FirebaseService } from 'src/services/firebase/firebase.service';
import { LlmService } from 'src/services/llm/llm.service';
import { ScraperService } from 'src/services/scraper/scraper.service';
import * as cheerio from 'cheerio';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class JobAppWebCatService {
  constructor(
    private firebase: FirebaseService,
    private scrapper: ScraperService,
    private llm: LlmService,
    private http: HttpService,
  ) {}
  async processWebsite(url: string) {
    try {
      const alreadyCategorized = await this.firebase.WebsiteCategorized(url);
      if (alreadyCategorized) {
        console.log('Website already categorized:', url);

        return { success: true, message: 'Website already categorized' };
      }
      const category = await this.getWebsiteCategory(url);
      await this.appendWebsite(url, category);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
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
        console.warn(`❌ Skipping (no content): ${url}, adding to Uncurated`);
        category = 'Uncurated';
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
    const current = await this.firebase.getCuratedWebsites();
    const exisiting = Object.values(current).flat();
    const newState: Record<string, Set<string>> = {};

    console.log(`Total uncurated websites: ${curated.length}`);
    let processedCount = 0;

    for (const url of curated) {
      if (!url) continue;
      if (exisiting.includes(url)) {
        console.log(`⏩ [Skipped] Already categorized: ${url}`);
        continue;
      }

      console.log(`🔎 [Processing] ${url}`);
      const newCategory = await this.getWebsiteCategory(url);
      console.log(`➡️ [Categorized] "${url}" as "${newCategory}"`);

      if (!newState[newCategory]) {
        newState[newCategory] = new Set();
      }
      newState[newCategory].add(url);
      processedCount++;
    }

    console.log(`\n📝 [Summary] Processed ${processedCount} new websites.`);

    // 1. Fetch full current state

    // 2. Build the new final state: clean all previous category mentions
    const final: Record<string, string[]> = {};

    for (const [category, urls] of Object.entries(current)) {
      final[category] = urls.filter(
        (url) => !Object.values(newState).some((set) => set.has(url)), // remove if it's going to be moved
      );
      if (final[category].length !== urls.length) {
        console.log(`🧹 [Cleaned] Removed moved URLs from "${category}"`);
      }
    }

    // 3. Merge the new categorization
    for (const [category, urls] of Object.entries(newState)) {
      final[category] = final[category] || [];
      for (const url of urls) {
        if (!final[category].includes(url)) {
          final[category].push(url);
          console.log(`✅ [Added] "${url}" to "${category}"`);
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

  async getUncuratedAppsCategory() {
    const AllAppsRef = await this.firebase
      .getRef('Production/CuratedData/SmartphonePackages/Android/')
      .once('value');
    const AllApps: {
      UncuratedPackages: string[];
      GamingPackages: { [x: string]: string };
      AdultPackages: { [x: string]: string };
      InternetPackages: { [x: string]: string };
      StreamingPackages: { [x: string]: string };
      SocialPackages: { [x: string]: string };
      WorkingPackages: { [x: string]: string };
      OtherPackages: { [x: string]: string };
      SystemPackages: { [x: string]: string };
    } = AllAppsRef.val();

    const start = Date.now();
    console.log(
      'Processing uncurated apps...',
      Object.keys(AllApps.UncuratedPackages).length,
    );
    const curatedApps = [
      'GamingPackages',
      'AdultPackages',
      'InternetPackages',
      'StreamingPackages',
      'SocialPackages',
      'WorkingPackages',
      'OtherPackages',
      'SystemPackages',
    ].flatMap((key) => Object.values(AllApps[key as keyof typeof AllApps]));
    for (let i = 0; i < AllApps.UncuratedPackages.length; i++) {
      const packname = AllApps.UncuratedPackages[i];
      console.log(`Processing item : ${i}`);
      if (curatedApps.includes(packname)) {
        AllApps.UncuratedPackages.splice(i, 1);
        console.log('Found duplicate', packname);
        continue;
      }
      if (packname) {
        const appname = await this.getname(packname);
        if (appname) {
          console.log(appname, packname);

          AllApps.UncuratedPackages.splice(i, 1);

          AllApps.GamingPackages[this.replaceforFB(appname)] = packname;
        }
      }
    }

    await AllAppsRef.ref.update(AllApps);
    console.log('time : ' + (Date.now() - start));
  }

  async getAppNames() {
    const AllApps: {
      UncuratedPackages: string[];
      GamingPackages: { [x: string]: string };
      AdultPackages: { [x: string]: string };
      InternetPackages: { [x: string]: string };
      StreamingPackages: { [x: string]: string };
      SocialPackages: { [x: string]: string };
      WorkingPackages: { [x: string]: string };
      OtherPackages: { [x: string]: string };
      SystemPackages: { [x: string]: string };
    } = (
      await this.firebase
        .getRef(
          'Production/CuratedData/SmartphonePackages/Android/UncuratedPackages/',
        )
        .once('value')
    ).val();
    let uncuratedApps: string[] = AllApps.UncuratedPackages;
    let apps = AllApps.SocialPackages;
    const unknownapps = [];
    for (const app in apps) {
      if (app === apps[app]) {
        unknownapps.push(app);
      }
    }
    // const promises = uncuratedApps.map((packname, i) => {
    // 	console.log(packname);
    // 	if (packname) {
    // 		return getname(packname).then((appname) => {
    // 			if (appname) {
    // 				uncuratedApps.splice(i, 1);
    // 				apps[replaceforFB(appname)] = packname;
    // 				return Promise.all([uncuratedref.ref.set(uncuratedApps), appref.ref.set(apps)]);
    // 			}
    // 		});
    // 	}
    // });
    for (let i = 0; i < uncuratedApps.length; i++) {
      const packname = uncuratedApps[i];
      if (packname) {
        const appname = await this.getname(packname);
        if (appname) {
          console.log(appname, packname);
          uncuratedApps.splice(i, 1);
          apps[this.replaceforFB(appname)] = packname;
        }
      }
    }

    const start = Date.now();

    // uncuratedref.ref.set(uncuratedApps).then(async() => await appref.ref.set(apps));

    // await Promise.all(promises);
    console.log('time : ' + (Date.now() - start));

    // uncuratedApps.forEach(async (packname, i) => {

    // unknownapps.forEach(async (packname, i) => {
    // 	const appname = await getname(packname);
    // 	if (appname) {
    // 		// delete apps[packname];
    // 		// apps[replaceforFB(appname)] = packname;
    // 		// console.log(apps);
    // 	}
    // });
    // appref.ref.set(apps);
  }
  async getname(packname: string) {
    //TODO check with llm
    const url = `https://play.google.com/store/apps/details?id=${packname.replace(/_/g, '.')}&hl=FR&gl=US`;
    const content = await this.scrapper.getWebsite(url);
    if (!content) return null;
    const category = await this.llm.getAppCategory(packname, content);
    if (category !== 'unknown') {
      return category;
    }
    return null;
    try {
      const $ = cheerio.load((await lastValueFrom(this.http.get(url))).data);
      const app_title = $('h1[itemprop="name"]').text().trim();
      const social = $('a[href^="/store/apps/category/SOCIAL"]').length > 0;
      const gaming = $('a[href^="/store/apps/category/GAME"]').length > 0;
      const entertainment =
        $('a[href^="/store/apps/category/ENTERTAINMENT"]').length > 0;
      const streaming =
        $('a[href^="/store/apps/category/MUSIC_AND_AUDIO"]').length > 0;
      if (gaming) {
        return app_title;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
  replaceforFB(str: string) {
    return str.replace(/[.#\$\/\[\]]/g, ' ');
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

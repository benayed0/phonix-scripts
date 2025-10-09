import { Inject, Injectable } from '@nestjs/common';
import { app, database } from 'firebase-admin';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  #db: FirebaseFirestore.Firestore;
  #websiteCollection: FirebaseFirestore.CollectionReference;
  #rtdb: database.Database;
  curatedWebsitesPath = 'Production/CuratedData/Websites';
  constructor(@Inject('FIREBASE_APP') private firebaseApp: app.App) {
    this.#db = firebaseApp.firestore();
    this.#websiteCollection = this.#db.collection('uncurated_websites');
    this.#rtdb = firebaseApp.database(); // ✅ RTDB instance
  }
  getRef(path: string) {
    return this.#rtdb.ref(path);
  }
  WebsiteCategorized(url: string): Promise<boolean> {
    return this.#rtdb
      .ref(this.curatedWebsitesPath)
      .once('value')
      .then((snapshot) => {
        const categories: { [category: string]: string[] } =
          snapshot.val() || {};
        for (const category of Object.keys(categories)) {
          const websites = categories[category];
          if (Array.isArray(websites) && websites.includes(url)) {
            return true;
          }
        }
        return false;
      });
  }
  async removeWebsitesFromFirestore(urls: string[]): Promise<void> {
    if (!urls.length) return;

    const docRef = this.#websiteCollection.doc('uncurated');

    await docRef.update({
      websites: admin.firestore.FieldValue.arrayRemove(...urls),
    });

    console.log(
      `🧹 [Firestore] Removed ${urls.length} URLs from 'websites' array in firestore.`,
    );
  }
  async getCuratedWebsites(): Promise<{ [category: string]: string[] }> {
    return (
      await this.#rtdb.ref('Production/CuratedData/Websites').once('value')
    ).val();
  }
  async addWebsiteToCategory(website: string, category: string) {
    // 1. Get all current categories
    const snapshot = await this.#rtdb
      .ref(this.curatedWebsitesPath)
      .once('value');
    const data = snapshot.val() || {};

    const updates: { [key: string]: any } = {};
    let duplicate = false;
    // 2. Remove website from all categories it exists in
    for (const [cat, websites] of Object.entries(data)) {
      if (Array.isArray(websites) && websites.includes(website)) {
        // console.log(cat, category);
        if (cat === category) {
          duplicate = true;
          return;
        }
        updates[`${this.curatedWebsitesPath}/${cat}`] = websites.filter(
          (w) => w !== website,
        );
      }
    }
    if (duplicate) {
      return;
    }
    // 3. Add website to the given category (append if it exists)
    const currentCategory = data[category] || [];
    if (!currentCategory.includes(website)) {
      updates[`${this.curatedWebsitesPath}/${category}`] = [
        ...currentCategory,
        website,
      ];
    }

    // 4. Apply updates in one atomic write
    await this.#rtdb.ref().update(updates);
    console.log(
      `[🔥 RTDB] Updated: Moved "${website}" to category "${category}"`,
    );
  }
  async updateWebsitesBatch(updates: { [category: string]: string[] }) {
    const updatePayload: { [key: string]: string[] } = {};

    for (const [category, websites] of Object.entries(updates)) {
      updatePayload[`${this.curatedWebsitesPath}/${category}`] = websites;
    }

    await this.#rtdb.ref().update(updatePayload);
    console.log(
      '✅ [Batch Update] Firebase updated with new website categorization.',
    );
  }
  async getUncuratedWebsites(): Promise<string[]> {
    const doc = await this.#websiteCollection.doc('uncurated').get();

    if (!doc.exists) {
      throw new Error('Document not found');
    }

    const data = doc.data();

    return data.websites;
  }
  async removeWebsiteFromAllCategories(url: string): Promise<void> {
    const path = 'Production/CuratedData/Websites';

    // 1. Get the full structure
    const snapshot = await this.#rtdb.ref(path).once('value');
    const data = snapshot.val() || {};

    const updates: { [key: string]: string[] } = {};
    let found = false;

    // 2. Check each category for the URL
    for (const [category, websites] of Object.entries(data)) {
      if (Array.isArray(websites) && websites.includes(url)) {
        // 3. Remove the URL from the list
        const filtered = websites.filter((w) => w !== url);
        updates[`${path}/${category}`] = filtered;
        found = true;
      }
    }

    if (!found) {
      console.log(`🔍 [Not Found] "${url}" not present in any category.`);
      return;
    }

    // 4. Apply batch update
    await this.#rtdb.ref().update(updates);
    console.log(`🧹 [Cleaned] "${url}" removed from all categories.`);
  }
  listenToUncuratedChanges(onNewUrl: (url: string) => Promise<void>) {
    const docRef = this.#websiteCollection.doc('uncurated');
    let previousData: any = null;

    docRef.onSnapshot(
      async (doc) => {
        if (!doc.exists) {
          console.warn('[⚠️ Firestore] Document does not exist.');
          return;
        }

        const currentData = doc.data();

        if (previousData === null) {
          previousData = currentData;
          console.log('[📡 Firestore Init] Initial data loaded.');
          return;
        }

        const addedData: any = this.findAddedData(previousData, currentData);
        previousData = currentData;

        if (!addedData?.websites || !Array.isArray(addedData.websites)) return;

        for (const url of addedData.websites) {
          try {
            await onNewUrl(url);
          } catch (err) {
            console.error(`❌ Error processing ${url}:`, err);
          }
        }
      },
      (error) => {
        console.error('[❌ Firestore Listener Error]', error);
      },
    );
  }

  findAddedData(previous, current) {
    const added = {};

    for (const [key, value] of Object.entries(current)) {
      if (!(key in previous)) {
        // New key added
        added[key] = value;
      } else if (Array.isArray(value) && Array.isArray(previous[key])) {
        // Handle arrays - find new items
        const newItems = value.filter((item) => !previous[key].includes(item));
        if (newItems.length > 0) {
          added[key] = newItems;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects
        const nestedAdded = this.findAddedData(previous[key] || {}, value);
        if (Object.keys(nestedAdded).length > 0) {
          added[key] = nestedAdded;
        }
      }
    }

    return added;
  }
}

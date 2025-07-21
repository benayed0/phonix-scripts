import { Inject, Injectable } from '@nestjs/common';
import { app } from 'firebase-admin';

@Injectable()
export class FirebaseService {
  #db: FirebaseFirestore.Firestore;
  #collection: FirebaseFirestore.CollectionReference;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: app.App) {
    this.#db = firebaseApp.firestore();
    this.#collection = this.#db.collection('uncurated_websites');
    console.log('initialized');

    // this.listenToUncuratedChanges();
  }
  async getUncuratedWebsites(): Promise<any[]> {
    const doc = await this.#collection.doc('uncurated').get();

    if (!doc.exists) {
      throw new Error('Document not found');
    }

    const data = doc.data();
    // console.log(data);

    // Assuming the document has a field like: { websites: ["example.com", ...] }
    return Object.values(data || {});
  }
  listenToUncuratedChanges() {
    const docRef = this.#collection.doc('uncurated');
    let previousData = null;

    docRef.onSnapshot(
      (doc) => {
        if (doc.exists) {
          const currentData = doc.data();

          if (previousData === null) {
            // First load - store initial data but don't process as "added"
            previousData = currentData;
            console.log('[📡 Firestore Init] Initial data loaded');
            return;
          }

          // Find what was added
          const addedData = this.findAddedData(previousData, currentData);

          if (addedData && Object.keys(addedData).length > 0) {
            console.log('[📡 Firestore Update] New data added:', addedData);
            // Process only the added data
            // this.handleNewData(addedData);
          }

          // Update previous data for next comparison
          previousData = currentData;
        } else {
          console.warn('[⚠️ Firestore] Document does not exist.');
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

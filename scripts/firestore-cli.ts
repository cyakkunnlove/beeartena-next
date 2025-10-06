#!/usr/bin/env tsx
/**
 * Firestore CLI - Direct Firestore operations for Codex
 *
 * This script initializes Firebase Admin SDK directly and provides
 * convenient Firestore operations without Next.js dependencies.
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import * as admin from 'firebase-admin'

// Initialize Firebase Admin
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Firebase Admin credentials not found in .env.local')
    console.error('Required variables:')
    console.error('  - FIREBASE_ADMIN_PROJECT_ID')
    console.error('  - FIREBASE_ADMIN_CLIENT_EMAIL')
    console.error('  - FIREBASE_ADMIN_PRIVATE_KEY')
    process.exit(1)
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })

  console.log(`✅ Firebase Admin initialized for project: ${projectId}`)
}

const db = admin.firestore()

/**
 * List all documents in a collection
 */
export async function listCollection(collectionName: string, limit = 100) {
  try {
    const snapshot = await db.collection(collectionName).limit(limit).get()
    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    console.log(`✅ Found ${docs.length} documents in ${collectionName}`)
    return docs
  } catch (error) {
    console.error(`❌ Failed to list ${collectionName}:`, error)
    throw error
  }
}

/**
 * Get a specific document
 */
export async function getDocument(collectionName: string, docId: string) {
  try {
    const doc = await db.collection(collectionName).doc(docId).get()
    if (!doc.exists) {
      console.log(`⚠️  Document ${collectionName}/${docId} not found`)
      return null
    }
    console.log(`✅ Retrieved ${collectionName}/${docId}`)
    return { id: doc.id, ...doc.data() }
  } catch (error) {
    console.error(`❌ Failed to get ${collectionName}/${docId}:`, error)
    throw error
  }
}

/**
 * Create a new document
 */
export async function createDocument(collectionName: string, data: any, docId?: string) {
  try {
    const now = admin.firestore.Timestamp.now()
    const docData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    }

    if (docId) {
      await db.collection(collectionName).doc(docId).set(docData)
      console.log(`✅ Created ${collectionName}/${docId}`)
      return { id: docId, ...docData }
    } else {
      const docRef = await db.collection(collectionName).add(docData)
      console.log(`✅ Created ${collectionName}/${docRef.id}`)
      return { id: docRef.id, ...docData }
    }
  } catch (error) {
    console.error(`❌ Failed to create document in ${collectionName}:`, error)
    throw error
  }
}

/**
 * Update a document
 */
export async function updateDocument(collectionName: string, docId: string, data: any) {
  try {
    const updateData = {
      ...data,
      updatedAt: admin.firestore.Timestamp.now(),
    }
    await db.collection(collectionName).doc(docId).update(updateData)
    console.log(`✅ Updated ${collectionName}/${docId}`)
    return { id: docId, ...updateData }
  } catch (error) {
    console.error(`❌ Failed to update ${collectionName}/${docId}:`, error)
    throw error
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(collectionName: string, docId: string) {
  try {
    await db.collection(collectionName).doc(docId).delete()
    console.log(`✅ Deleted ${collectionName}/${docId}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to delete ${collectionName}/${docId}:`, error)
    throw error
  }
}

/**
 * Query documents with conditions
 */
export async function queryDocuments(
  collectionName: string,
  conditions: Array<{ field: string; operator: any; value: any }> = [],
  limit = 100
) {
  try {
    let query: any = db.collection(collectionName)

    for (const condition of conditions) {
      query = query.where(condition.field, condition.operator, condition.value)
    }

    const snapshot = await query.limit(limit).get()
    const docs = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`✅ Found ${docs.length} documents matching query in ${collectionName}`)
    return docs
  } catch (error) {
    console.error(`❌ Failed to query ${collectionName}:`, error)
    throw error
  }
}

/**
 * Batch update multiple documents
 */
export async function batchUpdate(updates: Array<{ collection: string; id: string; data: any }>) {
  try {
    const batch = db.batch()
    const now = admin.firestore.Timestamp.now()

    for (const update of updates) {
      const docRef = db.collection(update.collection).doc(update.id)
      batch.update(docRef, { ...update.data, updatedAt: now })
    }

    await batch.commit()
    console.log(`✅ Batch updated ${updates.length} documents`)
    return true
  } catch (error) {
    console.error('❌ Batch update failed:', error)
    throw error
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]

  ;(async () => {
    try {
      switch (command) {
        case 'list':
          if (!args[1]) {
            console.error('Usage: npm run firestore list <collection> [limit]')
            process.exit(1)
          }
          const limit = args[2] ? parseInt(args[2]) : 100
          const docs = await listCollection(args[1], limit)
          console.log(JSON.stringify(docs, null, 2))
          break

        case 'get':
          if (!args[1] || !args[2]) {
            console.error('Usage: npm run firestore get <collection> <docId>')
            process.exit(1)
          }
          const doc = await getDocument(args[1], args[2])
          console.log(JSON.stringify(doc, null, 2))
          break

        case 'test':
          console.log('🔥 Testing Firestore connection...')
          const collections = ['users', 'service-plans', 'announcements']
          for (const col of collections) {
            const count = await listCollection(col, 1)
            console.log(`  - ${col}: ${count.length > 0 ? 'OK' : 'Empty'}`)
          }
          console.log('✅ Connection test complete')
          break

        default:
          console.log('Available commands:')
          console.log('  npm run firestore list <collection> [limit]')
          console.log('  npm run firestore get <collection> <docId>')
          console.log('  npm run firestore test')
          break
      }
      process.exit(0)
    } catch (error) {
      console.error('❌ Command failed:', error)
      process.exit(1)
    }
  })()
}

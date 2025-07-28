import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  WhereFilterOp,
  OrderByDirection,
  CollectionReference,
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore'

import { cache } from '@/lib/api/cache'
import { db } from '@/lib/firebase/config'

export interface QueryOptions {
  where?: Array<{
    field: string
    operator: WhereFilterOp
    value: any
  }>
  orderBy?: Array<{
    field: string
    direction?: OrderByDirection
  }>
  limit?: number
  cursor?: any
  cache?: {
    ttl?: number
    tags?: string[]
  }
}

export interface BatchOperation<T> {
  type: 'create' | 'update' | 'delete'
  id?: string
  data?: Partial<T>
}

export abstract class BaseRepository<T extends { id: string }> {
  protected collectionName: string
  protected collectionRef: CollectionReference

  constructor(collectionName: string) {
    this.collectionName = collectionName
    this.collectionRef = collection(db, collectionName)
  }

  // Find by ID with caching
  async findById(id: string, options?: { cache?: boolean }): Promise<T | null> {
    const cacheKey = `${this.collectionName}:${id}`

    // Check cache first
    if (options?.cache !== false) {
      const cached = await cache.get<T>(cacheKey)
      if (cached) return cached
    }

    try {
      const docRef = doc(this.collectionRef, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const data = { id: docSnap.id, ...docSnap.data() } as T

      // Cache the result
      if (options?.cache !== false) {
        await cache.set(cacheKey, data, 300, { tags: [this.collectionName] })
      }

      return data
    } catch (error) {
      console.error(`Error finding document by ID: ${id}`, error)
      throw error
    }
  }

  // Find multiple by IDs with batching
  async findByIds(ids: string[]): Promise<T[]> {
    const results: T[] = []
    const uncachedIds: string[] = []

    // Check cache for each ID
    for (const id of ids) {
      const cached = await cache.get<T>(`${this.collectionName}:${id}`)
      if (cached) {
        results.push(cached)
      } else {
        uncachedIds.push(id)
      }
    }

    // Fetch uncached documents in batches
    const batchSize = 10 // Firestore 'in' query limit
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize)
      const q = query(this.collectionRef, where('__name__', 'in', batch))
      const snapshot = await getDocs(q)

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as T
        results.push(data)

        // Cache each result
        cache.set(`${this.collectionName}:${doc.id}`, data, 300, {
          tags: [this.collectionName],
        })
      })
    }

    return results
  }

  // Find with query options
  async find(options: QueryOptions = {}): Promise<T[]> {
    const constraints: QueryConstraint[] = []

    // Build query constraints
    if (options.where) {
      options.where.forEach(({ field, operator, value }) => {
        constraints.push(where(field, operator, value))
      })
    }

    if (options.orderBy) {
      options.orderBy.forEach(({ field, direction = 'asc' }) => {
        constraints.push(orderBy(field, direction))
      })
    }

    if (options.limit) {
      constraints.push(limit(options.limit))
    }

    if (options.cursor) {
      constraints.push(startAfter(options.cursor))
    }

    // Generate cache key from query
    const cacheKey = this.generateQueryCacheKey(options)

    // Check cache
    if (options.cache) {
      const cached = await cache.get<T[]>(cacheKey)
      if (cached) return cached
    }

    try {
      const q = query(this.collectionRef, ...constraints)
      const snapshot = await getDocs(q)

      const results: T[] = []
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as T)
      })

      // Cache query results
      if (options.cache) {
        await cache.set(cacheKey, results, options.cache.ttl || 300, {
          tags: [this.collectionName, ...(options.cache.tags || [])],
        })
      }

      return results
    } catch (error) {
      console.error('Error executing query:', error)
      throw error
    }
  }

  // Create with automatic ID
  async create(data: Omit<T, 'id'>): Promise<T> {
    try {
      const docRef = doc(this.collectionRef)
      const timestamp = new Date()
      const docData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await setDoc(docRef, docData)

      const created = { id: docRef.id, ...docData } as unknown as T

      // Invalidate collection cache
      await cache.invalidateByTag(this.collectionName)

      return created
    } catch (error) {
      console.error('Error creating document:', error)
      throw error
    }
  }

  // Update document
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const docRef = doc(this.collectionRef, id)
      const updateData = {
        ...data,
        updatedAt: new Date(),
      }

      await updateDoc(docRef, updateData)

      // Get updated document
      const updated = await this.findById(id, { cache: false })
      if (!updated) {
        throw new Error('Document not found after update')
      }

      // Update cache
      await cache.set(`${this.collectionName}:${id}`, updated, 300, {
        tags: [this.collectionName],
      })

      // Invalidate collection cache
      await cache.invalidateByTag(this.collectionName)

      return updated
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  }

  // Delete document
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, id)
      await deleteDoc(docRef)

      // Remove from cache
      await cache.delete(`${this.collectionName}:${id}`)

      // Invalidate collection cache
      await cache.invalidateByTag(this.collectionName)
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  // Batch operations
  async batch(operations: BatchOperation<T>[]): Promise<void> {
    const { writeBatch } = await import('firebase/firestore')
    const batch = writeBatch(db)

    for (const op of operations) {
      switch (op.type) {
        case 'create':
          const newDocRef = doc(this.collectionRef)
          batch.set(newDocRef, {
            ...op.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          break

        case 'update':
          if (!op.id) throw new Error('Update operation requires ID')
          const updateDocRef = doc(this.collectionRef, op.id)
          batch.update(updateDocRef, {
            ...op.data,
            updatedAt: new Date(),
          })
          break

        case 'delete':
          if (!op.id) throw new Error('Delete operation requires ID')
          const deleteDocRef = doc(this.collectionRef, op.id)
          batch.delete(deleteDocRef)
          break
      }
    }

    await batch.commit()

    // Invalidate collection cache
    await cache.invalidateByTag(this.collectionName)
  }

  // Count documents
  async count(options: QueryOptions = {}): Promise<number> {
    const cacheKey = `${this.collectionName}:count:${JSON.stringify(options)}`

    // Check cache
    const cached = await cache.get<number>(cacheKey)
    if (cached !== null) return cached

    const { getCountFromServer } = await import('firebase/firestore')
    const constraints: QueryConstraint[] = []

    if (options.where) {
      options.where.forEach(({ field, operator, value }) => {
        constraints.push(where(field, operator, value))
      })
    }

    const q = query(this.collectionRef, ...constraints)
    const snapshot = await getCountFromServer(q)
    const count = snapshot.data().count

    // Cache count
    await cache.set(cacheKey, count, 60, { tags: [this.collectionName] })

    return count
  }

  // Generate cache key from query options
  private generateQueryCacheKey(options: QueryOptions): string {
    const parts = [this.collectionName, 'query']

    if (options.where) {
      parts.push('where', JSON.stringify(options.where))
    }

    if (options.orderBy) {
      parts.push('orderBy', JSON.stringify(options.orderBy))
    }

    if (options.limit) {
      parts.push('limit', options.limit.toString())
    }

    if (options.cursor) {
      parts.push('cursor', JSON.stringify(options.cursor))
    }

    return parts.join(':')
  }
}

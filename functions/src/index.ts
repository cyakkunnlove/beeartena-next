import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

/**
 * ユーザー削除時に関連データを処理するCloud Function
 * Firestoreのusersコレクションでdeleted=trueが設定されたときにトリガーされる
 */
export const onUserDeleted = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // deleted フラグが false から true に変わった場合のみ処理
    if (!before.deleted && after.deleted) {
      const userId = context.params.userId;
      const batch = db.batch();
      
      try {
        // 1. 予約データの論理削除
        const reservationsSnapshot = await db
          .collection('reservations')
          .where('customerId', '==', userId)
          .get();
        
        reservationsSnapshot.forEach(doc => {
          batch.update(doc.ref, {
            deleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            // 個人情報を匿名化
            customerName: '削除済みユーザー',
            customerPhone: 'DELETED',
            customerEmail: 'deleted@example.com',
            notes: ''
          });
        });
        
        // 2. ポイント履歴の論理削除
        const pointsSnapshot = await db
          .collection('points')
          .where('userId', '==', userId)
          .get();
        
        pointsSnapshot.forEach(doc => {
          batch.update(doc.ref, {
            deleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        
        // 3. お問い合わせ履歴の匿名化
        const inquiriesSnapshot = await db
          .collection('inquiries')
          .where('userId', '==', userId)
          .get();
        
        inquiriesSnapshot.forEach(doc => {
          batch.update(doc.ref, {
            deleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            // 個人情報を匿名化
            name: '削除済みユーザー',
            email: 'deleted@example.com',
            phone: 'DELETED'
          });
        });
        
        // バッチ処理を実行
        await batch.commit();
        
        console.log(`Successfully processed deletion for user: ${userId}`);
      } catch (error) {
        console.error(`Error processing deletion for user ${userId}:`, error);
        throw error;
      }
    }
  });

/**
 * アカウント完全削除のスケジュール関数（30日後に実行）
 * 毎日午前3時に実行され、30日以上前に削除されたデータを物理削除
 */
export const cleanupDeletedData = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
      // 30日以上前に削除されたユーザーを検索
      const deletedUsersSnapshot = await db
        .collection('users')
        .where('deleted', '==', true)
        .where('deletedAt', '<=', thirtyDaysAgo)
        .get();
      
      const batch = db.batch();
      let deleteCount = 0;
      
      for (const userDoc of deletedUsersSnapshot.docs) {
        const userId = userDoc.id;
        
        // 関連する全てのデータを物理削除
        // 1. 予約データ
        const reservations = await db
          .collection('reservations')
          .where('customerId', '==', userId)
          .where('deleted', '==', true)
          .get();
        
        reservations.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // 2. ポイント履歴
        const points = await db
          .collection('points')
          .where('userId', '==', userId)
          .where('deleted', '==', true)
          .get();
        
        points.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // 3. お問い合わせ履歴
        const inquiries = await db
          .collection('inquiries')
          .where('userId', '==', userId)
          .where('deleted', '==', true)
          .get();
        
        inquiries.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // 4. ユーザーデータ自体を削除
        batch.delete(userDoc.ref);
        deleteCount++;
      }
      
      if (deleteCount > 0) {
        await batch.commit();
        console.log(`Permanently deleted ${deleteCount} users and their data`);
      }
    } catch (error) {
      console.error('Error in cleanup function:', error);
      throw error;
    }
  });

/**
 * 管理者による強制削除API
 * 即座に物理削除を実行（慎重に使用すること）
 */
export const forceDeleteUser = functions.https.onCall(async (data, context) => {
  // 管理者権限チェック
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can perform this action'
    );
  }
  
  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'User ID is required'
    );
  }
  
  try {
    const batch = db.batch();
    
    // 全ての関連データを即座に削除
    const collections = ['reservations', 'points', 'inquiries'];
    
    for (const collectionName of collections) {
      const snapshot = await db
        .collection(collectionName)
        .where('customerId', '==', userId)
        .get();
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    }
    
    // ユーザーデータを削除
    batch.delete(db.collection('users').doc(userId));
    
    // Firebase Authenticationからも削除
    await admin.auth().deleteUser(userId);
    
    await batch.commit();
    
    return { success: true, message: 'User and all related data have been permanently deleted' };
  } catch (error) {
    console.error('Error in force delete:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete user'
    );
  }
});
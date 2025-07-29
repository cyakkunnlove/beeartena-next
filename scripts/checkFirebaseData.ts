import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase/config'

/**
 * Firebaseのデータを確認するスクリプト
 */

async function checkFirebaseData() {
  try {
    console.log('Firebaseのデータを確認します...\n')

    // 各コレクションのデータ数を確認
    const collections = ['users', 'reservations', 'points', 'inquiries', 'settings']
    
    for (const collectionName of collections) {
      console.log(`📁 ${collectionName}コレクション:`)
      
      try {
        const querySnapshot = await getDocs(collection(db, collectionName))
        console.log(`  - ドキュメント数: ${querySnapshot.size}`)
        
        if (querySnapshot.size > 0) {
          console.log('  - ドキュメント一覧:')
          querySnapshot.forEach((doc) => {
            console.log(`    - ${doc.id}: ${JSON.stringify(doc.data(), null, 2).substring(0, 100)}...`)
          })
        }
      } catch (error) {
        console.log(`  ❌ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      console.log('')
    }
    
    console.log('✅ 確認が完了しました')
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

// 実行
checkFirebaseData().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
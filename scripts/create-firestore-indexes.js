/**
 * Firestoreインデックス作成用の設定
 * このファイルの内容をfirestore.indexes.jsonにコピーして使用
 */

const indexes = {
  indexes: [
    {
      collectionGroup: "reservations",
      queryScope: "COLLECTION",
      fields: [
        {
          fieldPath: "customerId",
          order: "ASCENDING"
        },
        {
          fieldPath: "createdAt",
          order: "DESCENDING"
        }
      ]
    },
    {
      collectionGroup: "reservations",
      queryScope: "COLLECTION",
      fields: [
        {
          fieldPath: "date",
          order: "ASCENDING"
        },
        {
          fieldPath: "status",
          arrayConfig: "CONTAINS"
        }
      ]
    },
    {
      collectionGroup: "reservations",
      queryScope: "COLLECTION",
      fields: [
        {
          fieldPath: "createdAt",
          order: "ASCENDING"
        }
      ]
    },
    {
      collectionGroup: "pointTransactions",
      queryScope: "COLLECTION",
      fields: [
        {
          fieldPath: "userId",
          order: "ASCENDING"
        },
        {
          fieldPath: "createdAt",
          order: "DESCENDING"
        }
      ]
    },
    {
      collectionGroup: "inquiries",
      queryScope: "COLLECTION",
      fields: [
        {
          fieldPath: "status",
          order: "ASCENDING"
        },
        {
          fieldPath: "createdAt",
          order: "DESCENDING"
        }
      ]
    }
  ],
  fieldOverrides: []
};

console.log('Firestoreインデックス設定:');
console.log(JSON.stringify(indexes, null, 2));
console.log('\n上記の内容をfirestore.indexes.jsonファイルに保存してください。');
console.log('その後、以下のコマンドを実行:');
console.log('firebase deploy --only firestore:indexes');
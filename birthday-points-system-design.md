# Birthday Points System Design

## Overview
Design for an automated birthday points system that grants 1000 points to users on their birthday, with duplicate prevention and daily processing.

## 1. Database Schema Modifications

### User Type Modifications
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  points: number;
  birthday: string; // ISO date format YYYY-MM-DD
  birthdayYear?: number; // Optional: birth year if needed
  lastBirthdayPointsYear?: number; // Year when last birthday points were granted
  createdAt: Date;
  updatedAt: Date;
}
```

### New Type: BirthdayPointsLog
```typescript
interface BirthdayPointsLog {
  id: string;
  userId: string;
  grantedYear: number;
  grantedAt: Date;
  pointsAmount: number;
  status: 'success' | 'failed' | 'duplicate';
  errorMessage?: string;
}
```

### PointTransaction Type (No changes needed)
```typescript
interface PointTransaction {
  id: string;
  userId: string;
  type: 'birthday' | 'purchase' | 'redemption' | 'manual' | 'other';
  amount: number;
  balance: number;
  reason: string;
  createdAt: Date;
}
```

## 2. Birthday Point Grant Tracking Strategy

### Primary Approach: Year-Based Tracking
```typescript
// Check if birthday points already granted this year
const hasBirthdayPointsThisYear = (user: User): boolean => {
  const currentYear = new Date().getFullYear();
  return user.lastBirthdayPointsYear === currentYear;
};
```

### Secondary Approach: Log-Based Verification
```typescript
// Query birthday points log for additional verification
const checkBirthdayPointsLog = async (userId: string, year: number): Promise<boolean> => {
  const log = await db.collection('birthdayPointsLogs')
    .where('userId', '==', userId)
    .where('grantedYear', '==', year)
    .where('status', '==', 'success')
    .get();
  
  return !log.empty;
};
```

## 3. Efficient Query Strategy for Daily Birthday Checks

### Approach 1: Indexed Query on Birthday Month-Day
```typescript
// Add composite index on birthday month and day
const getTodaysBirthdays = async (): Promise<User[]> => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const currentYear = today.getFullYear();
  
  // Query users with birthday today who haven't received points this year
  const users = await db.collection('users')
    .where('birthday', '>=', `${month}-${day}`)
    .where('birthday', '<=', `${month}-${day}`)
    .where('lastBirthdayPointsYear', '!=', currentYear)
    .get();
  
  return users.docs.map(doc => doc.data() as User);
};
```

### Approach 2: Computed Field Strategy
```typescript
// Store birthday as separate fields for efficient querying
interface UserWithBirthdayFields extends User {
  birthdayMonth: number; // 1-12
  birthdayDay: number;   // 1-31
}

// Composite index on [birthdayMonth, birthdayDay, lastBirthdayPointsYear]
const getTodaysBirthdaysEfficient = async (): Promise<User[]> => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentYear = today.getFullYear();
  
  const users = await db.collection('users')
    .where('birthdayMonth', '==', currentMonth)
    .where('birthdayDay', '==', currentDay)
    .where('lastBirthdayPointsYear', '<', currentYear)
    .get();
  
  return users.docs.map(doc => doc.data() as User);
};
```

## 4. Edge Cases and Considerations

### 4.1 Leap Year Handling
```typescript
const handleLeapYearBirthday = (birthday: string): { month: number; day: number } => {
  const [year, month, day] = birthday.split('-').map(Number);
  
  // February 29 birthdays
  if (month === 2 && day === 29) {
    const currentYear = new Date().getFullYear();
    const isCurrentYearLeap = isLeapYear(currentYear);
    
    return {
      month: 2,
      day: isCurrentYearLeap ? 29 : 28 // Celebrate on Feb 28 in non-leap years
    };
  }
  
  return { month, day };
};

const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};
```

### 4.2 Timezone Handling
```typescript
const getBirthdayInUserTimezone = (user: User): Date => {
  // Store user timezone preference
  const userTimezone = user.timezone || 'Asia/Tokyo'; // Default for Japan
  
  // Convert current date to user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(new Date());
  const dateInUserTz = {
    year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
    month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
    day: parseInt(parts.find(p => p.type === 'day')?.value || '0')
  };
  
  return new Date(dateInUserTz.year, dateInUserTz.month - 1, dateInUserTz.day);
};
```

### 4.3 Other Edge Cases
```typescript
// Edge case handlers
const edgeCaseHandlers = {
  // User registered on their birthday
  sameDay: (user: User): boolean => {
    const registrationDate = new Date(user.createdAt);
    const birthday = parseUserBirthday(user.birthday);
    
    return registrationDate.getMonth() === birthday.getMonth() &&
           registrationDate.getDate() === birthday.getDate();
  },
  
  // Invalid or missing birthday
  invalidBirthday: (birthday: string | undefined): boolean => {
    if (!birthday) return true;
    
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(birthday)) return true;
    
    const date = new Date(birthday);
    return isNaN(date.getTime());
  },
  
  // Future birthday (data entry error)
  futureBirthday: (birthday: string): boolean => {
    const birthdayDate = new Date(birthday);
    return birthdayDate > new Date();
  }
};
```

## 5. Recommended Implementation Approach

### 5.1 Daily Batch Job Implementation
```typescript
class BirthdayPointsProcessor {
  private readonly BIRTHDAY_POINTS = 1000;
  private readonly BATCH_SIZE = 100;
  
  async processDailyBirthdays(): Promise<void> {
    try {
      // 1. Get today's birthday users
      const birthdayUsers = await this.getTodaysBirthdayUsers();
      
      // 2. Process in batches for scalability
      for (let i = 0; i < birthdayUsers.length; i += this.BATCH_SIZE) {
        const batch = birthdayUsers.slice(i, i + this.BATCH_SIZE);
        await this.processBatch(batch);
      }
      
      // 3. Log completion
      await this.logJobCompletion(birthdayUsers.length);
      
    } catch (error) {
      await this.handleError(error);
    }
  }
  
  private async processBatch(users: User[]): Promise<void> {
    const batch = db.batch();
    const currentYear = new Date().getFullYear();
    
    for (const user of users) {
      // Double-check to prevent duplicates
      if (await this.hasReceivedPointsThisYear(user.id, currentYear)) {
        continue;
      }
      
      // Update user points
      const userRef = db.collection('users').doc(user.id);
      batch.update(userRef, {
        points: user.points + this.BIRTHDAY_POINTS,
        lastBirthdayPointsYear: currentYear,
        updatedAt: new Date()
      });
      
      // Create transaction record
      const transactionRef = db.collection('pointTransactions').doc();
      batch.set(transactionRef, {
        id: transactionRef.id,
        userId: user.id,
        type: 'birthday',
        amount: this.BIRTHDAY_POINTS,
        balance: user.points + this.BIRTHDAY_POINTS,
        reason: `Birthday points for ${currentYear}`,
        createdAt: new Date()
      });
      
      // Create log entry
      const logRef = db.collection('birthdayPointsLogs').doc();
      batch.set(logRef, {
        id: logRef.id,
        userId: user.id,
        grantedYear: currentYear,
        grantedAt: new Date(),
        pointsAmount: this.BIRTHDAY_POINTS,
        status: 'success'
      });
    }
    
    await batch.commit();
  }
}
```

### 5.2 Firebase Cloud Function Setup
```typescript
// Cloud Function for daily birthday processing
export const processBirthdayPoints = functions.pubsub
  .schedule('0 0 * * *') // Run at midnight daily
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const processor = new BirthdayPointsProcessor();
    await processor.processDailyBirthdays();
  });
```

### 5.3 Manual Trigger for Testing
```typescript
// Admin endpoint for manual birthday processing
export const triggerBirthdayPoints = functions.https.onRequest(async (req, res) => {
  // Verify admin authentication
  if (!isAdmin(req)) {
    return res.status(403).send('Unauthorized');
  }
  
  const processor = new BirthdayPointsProcessor();
  const result = await processor.processDailyBirthdays();
  
  res.json({ success: true, processed: result });
});
```

## 6. Performance Optimizations

### 6.1 Database Indexes
```javascript
// Firestore indexes needed
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "birthdayMonth", "order": "ASCENDING" },
        { "fieldPath": "birthdayDay", "order": "ASCENDING" },
        { "fieldPath": "lastBirthdayPointsYear", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "birthdayPointsLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "grantedYear", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 6.2 Caching Strategy
```typescript
// Cache birthday users for the day
class BirthdayCache {
  private cache: Map<string, Set<string>> = new Map();
  
  getCacheKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }
  
  async getTodaysBirthdayUserIds(): Promise<Set<string>> {
    const key = this.getCacheKey(new Date());
    
    if (!this.cache.has(key)) {
      const users = await this.fetchTodaysBirthdayUsers();
      this.cache.set(key, new Set(users.map(u => u.id)));
      
      // Clear old cache entries
      this.cleanupCache();
    }
    
    return this.cache.get(key)!;
  }
}
```

## 7. Monitoring and Alerts

### 7.1 Metrics to Track
```typescript
interface BirthdayJobMetrics {
  totalUsersProcessed: number;
  pointsGranted: number;
  duplicatesSkipped: number;
  errors: number;
  processingTimeMs: number;
  date: Date;
}
```

### 7.2 Alert Conditions
- No birthdays processed when expected
- High error rate (>5%)
- Processing time exceeds threshold
- Duplicate grants detected

## 8. Testing Strategy

### 8.1 Unit Tests
```typescript
describe('BirthdayPointsProcessor', () => {
  it('should grant points to birthday users', async () => {
    // Test implementation
  });
  
  it('should handle leap year birthdays', async () => {
    // Test Feb 29 birthdays
  });
  
  it('should prevent duplicate grants', async () => {
    // Test duplicate prevention
  });
  
  it('should handle timezone differences', async () => {
    // Test timezone handling
  });
});
```

### 8.2 Integration Tests
- Test with multiple timezones
- Test batch processing
- Test error recovery
- Test performance with large datasets

## Summary

This design provides a robust, scalable birthday points system with:
- Efficient daily processing
- Duplicate prevention
- Edge case handling
- Performance optimization
- Comprehensive monitoring

The system can handle thousands of users efficiently through batch processing and proper indexing strategies.
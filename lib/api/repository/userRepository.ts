import { BaseRepository } from './base';
import { User } from '@/lib/types';
import { cache } from '@/lib/api/cache';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  // Find user by email with caching
  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:email:${email}`;
    
    // Check cache first
    const cached = await cache.get<User>(cacheKey);
    if (cached) return cached;

    // Query database
    const users = await this.find({
      where: [{ field: 'email', operator: '==', value: email }],
      limit: 1
    });

    const user = users[0] || null;
    
    // Cache result
    if (user) {
      await cache.set(cacheKey, user, 3600, { tags: ['users'] }); // 1 hour cache
    }

    return user;
  }

  // Find users by role
  async findByRole(role: 'customer' | 'admin'): Promise<User[]> {
    return this.find({
      where: [{ field: 'role', operator: '==', value: role }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      cache: { ttl: 300, tags: ['users', `role:${role}`] }
    });
  }

  // Find users with birthday today
  async findBirthdayUsers(): Promise<User[]> {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // This is a simplified query - in production, you'd need a more sophisticated approach
    const allUsers = await this.find({
      where: [{ field: 'birthday', operator: '!=', value: null }]
    });

    return allUsers.filter(user => {
      if (!user.birthday) return false;
      return user.birthday.slice(5) === monthDay; // MM-DD comparison
    });
  }

  // Update user points
  async updatePoints(userId: string, points: number): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await this.update(userId, {
      points: (user.points || 0) + points
    });

    // Invalidate user cache
    await cache.delete(`user:email:${user.email}`);
    
    return updatedUser;
  }

  // Search users
  async search(query: string, limit: number = 20): Promise<User[]> {
    const cacheKey = `users:search:${query}:${limit}`;
    
    // Check cache
    const cached = await cache.get<User[]>(cacheKey);
    if (cached) return cached;

    // In a real implementation, you'd use a full-text search index
    // For now, we'll do a simple implementation
    const allUsers = await this.find({
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    const results = allUsers.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      user.phone.includes(query)
    ).slice(0, limit);

    // Cache results
    await cache.set(cacheKey, results, 300, { tags: ['users', 'search'] });

    return results;
  }

  // Get user statistics
  async getStatistics(): Promise<{
    total: number;
    byRole: Record<string, number>;
    newThisMonth: number;
    activeToday: number;
  }> {
    const cacheKey = 'users:statistics';
    
    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const [total, customers, admins] = await Promise.all([
      this.count(),
      this.count({ where: [{ field: 'role', operator: '==', value: 'customer' }] }),
      this.count({ where: [{ field: 'role', operator: '==', value: 'admin' }] })
    ]);

    // Calculate new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await this.find({
      where: [{ field: 'createdAt', operator: '>=', value: startOfMonth }]
    });

    const stats = {
      total,
      byRole: {
        customer: customers,
        admin: admins
      },
      newThisMonth: newUsersThisMonth.length,
      activeToday: 0 // Would need activity tracking
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, stats, 300, { tags: ['users', 'statistics'] });

    return stats;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
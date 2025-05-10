import { Request, Response } from 'express';
import { User } from '../entities/User';
import { Post } from '../entities/Post';
import { Like } from '../entities/Like';
import { AppDataSource } from '../data-source';

interface Activity {
  type: string;
  subtype?: string;
  content: Record<string, any>;
  createdAt: Date;
}

export class UserController {
  private userRepository = AppDataSource.getRepository(User);
  private postRepository = AppDataSource.getRepository(Post);
  private likeRepository = AppDataSource.getRepository(Like);

  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await this.userRepository.find();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const user = await this.userRepository.findOneBy({
        id: parseInt(req.params.id),
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user', error });
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      const user = this.userRepository.create(req.body);
      const result = await this.userRepository.save(user);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const user = await this.userRepository.findOneBy({
        id: parseInt(req.params.id),
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      this.userRepository.merge(user, req.body);
      const result = await this.userRepository.save(user);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error updating user', error });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const result = await this.userRepository.delete(parseInt(req.params.id));
      if (result.affected === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting user', error });
    }
  }

  async followUser(req: Request, res: Response) {
    try {
      const { followerId, followingId } = req.body;

      if (followerId === followingId) {
        return res.status(400).json({ message: 'Users cannot follow themselves' });
      }

      const follower = await this.userRepository.findOne({
        where: { id: followerId },
        relations: ['following'],
      });

      const following = await this.userRepository.findOneBy({ id: followingId });

      if (!follower || !following) {
        return res.status(404).json({ message: 'One or both users not found' });
      }

      if (follower.following && follower.following.some((u) => u.id === following.id)) {
        return res.status(400).json({ message: 'Already following this user' });
      }

      if (!follower.following) {
        follower.following = [];
      }

      follower.following.push(following);
      await this.userRepository.save(follower);

      res.status(201).json({ message: 'Successfully followed user' });
    } catch (error) {
      res.status(500).json({ message: 'Error following user', error });
    }
  }

  async unfollowUser(req: Request, res: Response) {
    try {
      const { followerId, followingId } = req.body;

      const follower = await this.userRepository.findOne({
        where: { id: followerId },
        relations: ['following'],
      });

      if (!follower) {
        return res.status(404).json({ message: 'Follower not found' });
      }

      if (!follower.following || !follower.following.some((u) => u.id === followingId)) {
        return res.status(400).json({ message: 'Not following this user' });
      }

      follower.following = follower.following.filter((u) => u.id !== followingId);
      await this.userRepository.save(follower);

      res.status(200).json({ message: 'Successfully unfollowed user' });
    } catch (error) {
      res.status(500).json({ message: 'Error unfollowing user', error });
    }
  }

  async getUserFollowers(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const { limit = 10, offset = 0 } = req.query;

      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const [followers, count] = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.following', 'following')
        .where('following.id = :userId', { userId })
        .orderBy('user.createdAt', 'DESC')
        .skip(Number(offset))
        .take(Number(limit))
        .getManyAndCount();

      res.json({
        followers,
        count,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error) {
      res.status(500).json({ message: 'Error getting user followers', error });
    }
  }

  async getUserActivity(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const { type, startDate, endDate, limit = 10, offset = 0 } = req.query;
      const limitNum = Number(limit);
      const offsetNum = Number(offset);

      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const dateFilter: Record<string, any> = {};
      if (startDate) {
        const startDateObj = new Date(startDate as string);
        if (!isNaN(startDateObj.getTime())) {
          dateFilter.createdAt_gte = startDateObj;
        }
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        if (!isNaN(endDateObj.getTime())) {
          dateFilter.createdAt_lte = endDateObj;
        }
      }

      if (type === 'post') {
        const [posts, count] = await this.postRepository
          .createQueryBuilder('post')
          .where('post.author.id = :userId', { userId })
          .orderBy('post.createdAt', 'DESC')
          .skip(offsetNum)
          .take(limitNum)
          .getManyAndCount();

        return res.json({
          activities: posts.map((post) => ({
            type: 'post',
            content: post,
            createdAt: post.createdAt,
          })),
          count,
          limit: limitNum,
          offset: offsetNum,
        });
      } else if (type === 'like') {
        const [likes, count] = await this.likeRepository
          .createQueryBuilder('like')
          .leftJoinAndSelect('like.post', 'post')
          .leftJoinAndSelect('post.author', 'author')
          .where('like.user.id = :userId', { userId })
          .orderBy('like.createdAt', 'DESC')
          .skip(offsetNum)
          .take(limitNum)
          .getManyAndCount();

        return res.json({
          activities: likes.map((like) => ({
            type: 'like',
            content: like.post,
            createdAt: new Date(),
          })),
          count,
          limit: limitNum,
          offset: offsetNum,
        });
      } else if (type === 'follow') {
        const [following, followingCount] = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.following', 'following')
          .where('user.id = :userId', { userId })
          .skip(offsetNum)
          .take(limitNum)
          .getManyAndCount();

        const [followers, followersCount] = await this.userRepository
          .createQueryBuilder('follower')
          .leftJoinAndSelect('follower.following', 'user')
          .where('user.id = :userId', { userId })
          .skip(offsetNum)
          .take(limitNum)
          .getManyAndCount();

        const followActivities: Activity[] = [];

        if (following.length > 0 && following[0].following) {
          following[0].following.forEach((followed) => {
            followActivities.push({
              type: 'follow',
              subtype: 'following',
              content: {
                user: followed,
                action: 'followed',
              },
              createdAt: followed.createdAt || new Date(),
            });
          });
        }

        followers.forEach((follower) => {
          followActivities.push({
            type: 'follow',
            subtype: 'follower',
            content: {
              user: follower,
              action: 'followed by',
            },
            createdAt: follower.createdAt || new Date(),
          });
        });

        followActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const paginatedActivities = followActivities.slice(0, limitNum);

        return res.json({
          activities: paginatedActivities,
          count: followingCount + followersCount,
          limit: limitNum,
          offset: offsetNum,
        });
      }

      const [posts, likes, following, followers] = await Promise.all([
        this.postRepository
          .createQueryBuilder('post')
          .where('post.author.id = :userId', { userId })
          .orderBy('post.createdAt', 'DESC')
          .getMany(),

        this.likeRepository
          .createQueryBuilder('like')
          .leftJoinAndSelect('like.post', 'post')
          .leftJoinAndSelect('post.author', 'author')
          .where('like.user.id = :userId', { userId })
          .orderBy('like.createdAt', 'DESC')
          .getMany(),

        this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.following', 'following')
          .where('user.id = :userId', { userId })
          .getOne(),

        this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.followers', 'follower')
          .where('user.id = :userId', { userId })
          .getOne(),
      ]);

      const activities: Activity[] = [];

      posts.forEach((post) => {
        activities.push({
          type: 'post',
          content: post,
          createdAt: post.createdAt,
        });
      });

      likes.forEach((like) => {
        activities.push({
          type: 'like',
          content: like.post,
          createdAt: new Date(),
        });
      });

      if (following && following.following) {
        following.following.forEach((followed) => {
          activities.push({
            type: 'follow',
            subtype: 'following',
            content: {
              user: followed,
              action: 'followed',
            },
            createdAt: followed.createdAt || new Date(),
          });
        });
      }

      if (followers && followers.followers) {
        followers.followers.forEach((follower) => {
          activities.push({
            type: 'follow',
            subtype: 'follower',
            content: {
              user: follower,
              action: 'followed by',
            },
            createdAt: follower.createdAt || new Date(),
          });
        });
      }

      activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const paginatedActivities = activities.slice(offsetNum, offsetNum + limitNum);

      return res.json({
        activities: paginatedActivities,
        count: activities.length,
        limit: limitNum,
        offset: offsetNum,
      });
    } catch (error) {
      console.error('Error getting user activity:', error);
      res.status(500).json({ message: 'Error getting user activity' });
    }
  }

  async getFeed(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const { limit = 10, offset = 0 } = req.query;

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['following'],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.following || user.following.length === 0) {
        return res.json({
          posts: [],
          count: 0,
          limit: Number(limit),
          offset: Number(offset),
        });
      }

      const followingIds = user.following.map((f) => f.id);

      const [posts, count] = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.hashtags', 'hashtags')
        .leftJoinAndSelect('post.likes', 'likes')
        .where('author.id IN (:...followingIds)', { followingIds })
        .orderBy('post.createdAt', 'DESC')
        .skip(Number(offset))
        .take(Number(limit))
        .getManyAndCount();

      const formattedPosts = posts.map((post) => ({
        ...post,
        likeCount: post.likes.length,
        likes: undefined,
      }));

      res.json({
        posts: formattedPosts,
        count,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error) {
      console.error('Error getting feed:', error);
      res.status(500).json({ message: 'Error getting feed' });
    }
  }

  async getFeedFromQuery(req: Request, res: Response) {
    try {
      const { userId, limit = 10, offset = 0 } = req.query;
      const userIdNum = Number(userId);
      const limitNum = Number(limit);
      const offsetNum = Number(offset);

      if (isNaN(userIdNum)) {
        return res.status(400).json({ message: 'Invalid userId format' });
      }

      const user = await this.userRepository.findOne({
        where: { id: userIdNum },
        relations: ['following'],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.following || user.following.length === 0) {
        return res.json({
          posts: [],
          count: 0,
          limit: limitNum,
          offset: offsetNum,
        });
      }

      const followingIds = user.following.map((f) => f.id);

      const [posts, count] = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.hashtags', 'hashtags')
        .leftJoinAndSelect('post.likes', 'likes')
        .select([
          'post.id',
          'post.content',
          'post.createdAt',
          'author.id',
          'author.firstName',
          'author.lastName',
          'author.email',
          'hashtags.id',
          'hashtags.tag',
        ])
        .where('author.id IN (:...followingIds)', { followingIds })
        .orderBy('post.createdAt', 'DESC')
        .skip(offsetNum)
        .take(limitNum)
        .getManyAndCount();

      const formattedPosts = posts.map((post) => ({
        ...post,
        likeCount: post.likes.length,
        likes: undefined,
      }));

      return res.json({
        posts: formattedPosts,
        count,
        limit: limitNum,
        offset: offsetNum,
      });
    } catch (error) {
      console.error('Error getting feed:', error);
      res.status(500).json({ message: 'Error getting feed' });
    }
  }
}

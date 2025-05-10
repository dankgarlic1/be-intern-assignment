import { Request, Response } from 'express';
import { Like } from '../entities/Like';
import { User } from '../entities/User';
import { Post } from '../entities/Post';
import { AppDataSource } from '../data-source';

export class LikeController {
  private likeRepository = AppDataSource.getRepository(Like);
  private userRepository = AppDataSource.getRepository(User);
  private postRepository = AppDataSource.getRepository(Post);

  async getAllLikes(req: Request, res: Response) {
    try {
      const likes = await this.likeRepository.find({
        relations: ['user', 'post'],
      });
      res.json(likes);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching likes', error });
    }
  }

  async getLikeById(req: Request, res: Response) {
    try {
      const like = await this.likeRepository.findOne({
        where: { id: parseInt(req.params.id) },
        relations: ['user', 'post'],
      });

      if (!like) {
        return res.status(404).json({ message: 'Like not found' });
      }

      res.json(like);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching like', error });
    }
  }

  async createLike(req: Request, res: Response) {
    try {
      const { userId, postId } = req.body;

      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const post = await this.postRepository.findOneBy({ id: postId });
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const existingLike = await this.likeRepository.findOne({
        where: {
          user: { id: userId },
          post: { id: postId },
        },
      });

      if (existingLike) {
        return res.status(400).json({ message: 'User has already liked this post' });
      }

      const like = this.likeRepository.create({
        user,
        post,
      });

      const result = await this.likeRepository.save(like);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error creating like', error });
    }
  }

  async deleteLike(req: Request, res: Response) {
    try {
      const result = await this.likeRepository.delete(parseInt(req.params.id));

      if (result.affected === 0) {
        return res.status(404).json({ message: 'Like not found' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting like', error });
    }
  }

  async getLikesByUserId(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);

      const likes = await this.likeRepository.find({
        where: { user: { id: userId } },
        relations: ['post', 'post.author', 'post.hashtags'],
      });

      res.json(likes);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching likes by user', error });
    }
  }

  async getLikesByPostId(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.postId);

      const likes = await this.likeRepository.find({
        where: { post: { id: postId } },
        relations: ['user'],
      });

      res.json(likes);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching likes by post', error });
    }
  }

  async unlikePost(req: Request, res: Response) {
    try {
      const { userId, postId } = req.body;

      const like = await this.likeRepository.findOne({
        where: {
          user: { id: userId },
          post: { id: postId },
        },
      });

      if (!like) {
        return res.status(404).json({ message: 'Like not found' });
      }

      await this.likeRepository.delete(like.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error unliking post', error });
    }
  }
}

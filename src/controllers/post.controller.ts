import { Request, Response } from 'express';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { Hashtag } from '../entities/Hashtag';
import { AppDataSource } from '../data-source';

export class PostController {
  private postRepository = AppDataSource.getRepository(Post);
  private userRepository = AppDataSource.getRepository(User);
  private hashtagRepository = AppDataSource.getRepository(Hashtag);

  async getAllPosts(req: Request, res: Response) {
    try {
      const posts = await this.postRepository.find({
        relations: ['author', 'hashtags', 'likes'],
        order: { createdAt: 'DESC' },
      });

      const postsWithLikeCount = posts.map((post) => ({
        ...post,
        likeCount: post.likes.length,
        likes: undefined,
      }));

      res.json(postsWithLikeCount);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching posts', error });
    }
  }

  async getPostById(req: Request, res: Response) {
    try {
      const post = await this.postRepository.findOne({
        where: { id: parseInt(req.params.id) },
        relations: ['author', 'hashtags', 'likes'],
      });

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const postWithLikeCount = {
        ...post,
        likeCount: post.likes.length,
        likes: undefined,
      };

      res.json(postWithLikeCount);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching post', error });
    }
  }

  async createPost(req: Request, res: Response) {
    try {
      const { content, authorId, hashtags } = req.body;

      const author = await this.userRepository.findOneBy({ id: authorId });
      if (!author) {
        return res.status(404).json({ message: 'Author not found' });
      }

      const post = this.postRepository.create({
        content,
        author,
      });

      if (hashtags && hashtags.length > 0) {
        const hashtagEntities = [];

        for (const tag of hashtags) {
          let hashtag = await this.hashtagRepository.findOneBy({ tag });

          if (!hashtag) {
            hashtag = this.hashtagRepository.create({ tag });
            await this.hashtagRepository.save(hashtag);
          }

          hashtagEntities.push(hashtag);
        }

        post.hashtags = hashtagEntities;
      }

      const savedPost = await this.postRepository.save(post);

      const result = await this.postRepository.findOne({
        where: { id: savedPost.id },
        relations: ['author', 'hashtags'],
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error creating post', error });
    }
  }

  async updatePost(req: Request, res: Response) {
    try {
      const { content, hashtags } = req.body;

      const post = await this.postRepository.findOne({
        where: { id: parseInt(req.params.id) },
        relations: ['hashtags'],
      });

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (content !== undefined) {
        post.content = content;
      }

      if (hashtags && hashtags.length > 0) {
        const hashtagEntities = [];

        for (const tag of hashtags) {
          let hashtag = await this.hashtagRepository.findOneBy({ tag });

          if (!hashtag) {
            hashtag = this.hashtagRepository.create({ tag });
            await this.hashtagRepository.save(hashtag);
          }

          hashtagEntities.push(hashtag);
        }

        post.hashtags = hashtagEntities;
      }

      const result = await this.postRepository.save(post);

      const updatedPost = await this.postRepository.findOne({
        where: { id: result.id },
        relations: ['author', 'hashtags', 'likes'],
      });

      if (!updatedPost) {
        return res.status(404).json({ message: 'Post not found after update' });
      }

      const postWithLikeCount = {
        ...updatedPost,
        likeCount: updatedPost.likes.length,
        likes: undefined,
      };

      res.json(postWithLikeCount);
    } catch (error) {
      res.status(500).json({ message: 'Error updating post', error });
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      const result = await this.postRepository.delete(parseInt(req.params.id));

      if (result.affected === 0) {
        return res.status(404).json({ message: 'Post not found' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting post', error });
    }
  }

  async getPostsByHashtag(req: Request, res: Response) {
    try {
      const { tag } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const hashtag = await this.hashtagRepository.findOne({
        where: { tag: tag.toLowerCase() },
      });

      if (!hashtag) {
        return res.json({ posts: [], count: 0 });
      }

      const [posts, count] = await this.postRepository.findAndCount({
        relations: ['author', 'hashtags', 'likes'],
        where: { hashtags: { id: hashtag.id } },
        order: { createdAt: 'DESC' },
        take: Number(limit),
        skip: Number(offset),
      });

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
      res.status(500).json({ message: 'Error fetching posts by hashtag', error });
    }
  }
}

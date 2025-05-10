import { Request, Response } from 'express';
import { Hashtag } from '../entities/Hashtag';
import { AppDataSource } from '../data-source';

export class HashtagController {
  private hashtagRepository = AppDataSource.getRepository(Hashtag);

  async getAllHashtags(req: Request, res: Response) {
    try {
      const hashtags = await this.hashtagRepository.find({
        relations: ['posts'],
      });

      const formattedHashtags = hashtags.map((hashtag) => ({
        ...hashtag,
        postCount: hashtag.posts.length,
        posts: undefined,
      }));

      res.json(formattedHashtags);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching hashtags', error });
    }
  }

  async getHashtagById(req: Request, res: Response) {
    try {
      const hashtag = await this.hashtagRepository.findOne({
        where: { id: parseInt(req.params.id) },
        relations: ['posts', 'posts.author'],
      });

      if (!hashtag) {
        return res.status(404).json({ message: 'Hashtag not found' });
      }

      const formattedHashtag = {
        ...hashtag,
        postCount: hashtag.posts.length,
      };

      res.json(formattedHashtag);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching hashtag', error });
    }
  }

  async createHashtag(req: Request, res: Response) {
    try {
      const { tag } = req.body;
      const lowercaseTag = tag.toLowerCase();

      const existingHashtag = await this.hashtagRepository.findOneBy({ tag: lowercaseTag });
      if (existingHashtag) {
        return res
          .status(409)
          .json({ message: 'Hashtag already exists', hashtag: existingHashtag });
      }

      const hashtag = this.hashtagRepository.create({ tag: lowercaseTag });
      const result = await this.hashtagRepository.save(hashtag);

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error creating hashtag', error });
    }
  }

  async updateHashtag(req: Request, res: Response) {
    try {
      const { tag } = req.body;
      const lowercaseTag = tag.toLowerCase();

      const hashtag = await this.hashtagRepository.findOneBy({ id: parseInt(req.params.id) });
      if (!hashtag) {
        return res.status(404).json({ message: 'Hashtag not found' });
      }

      if (hashtag.tag !== lowercaseTag) {
        const existingHashtag = await this.hashtagRepository.findOneBy({ tag: lowercaseTag });
        if (existingHashtag) {
          return res
            .status(409)
            .json({ message: 'Hashtag with new tag already exists', hashtag: existingHashtag });
        }
      }

      hashtag.tag = lowercaseTag;
      const result = await this.hashtagRepository.save(hashtag);

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error updating hashtag', error });
    }
  }

  async deleteHashtag(req: Request, res: Response) {
    try {
      const result = await this.hashtagRepository.delete(parseInt(req.params.id));

      if (result.affected === 0) {
        return res.status(404).json({ message: 'Hashtag not found' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting hashtag', error });
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

      const posts = await this.hashtagRepository
        .createQueryBuilder('hashtag')
        .where('hashtag.id = :id', { id: hashtag.id })
        .innerJoinAndSelect('hashtag.posts', 'post')
        .innerJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.likes', 'likes')
        .leftJoinAndSelect('post.hashtags', 'hashtags')
        .orderBy('post.createdAt', 'DESC')
        .skip(Number(offset))
        .take(Number(limit))
        .getOne();

      if (!posts || !posts.posts) {
        return res.json({ posts: [], count: 0 });
      }

      const formattedPosts = posts.posts.map((post) => ({
        ...post,
        likeCount: post.likes.length,
        likes: undefined,
      }));

      res.json({
        posts: formattedPosts,
        count: formattedPosts.length,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching posts by hashtag', error });
    }
  }
}

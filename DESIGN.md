# Social Media Platform - Design Documentation

## Database Schema Design and Entity Relationships

### Explicit Database Design with Clear Relationships

**Decision**
Modeled core entities (User, Post, Like, Follow, Hashtag) with explicit, normalized relationships

| Relationship          | Type         | Modeling                    |
| --------------------- | ------------ | --------------------------- |
| User → Post           | 1-to-many    | userId FK in Post           |
| User ↔ User (Follow) | many-to-many | Junction table: Follow      |
| Post ↔ Hashtag       | many-to-many | Junction table: PostHashtag |
| Post ↔ Like          | 1-to-many    | Post reference in Like      |

**Why?**
Ensures data integrity, predictable foreign key constraints, and fast joins

**Trade-off**
I avoided embedding arrays or JSON columns (though SQLite supports this).
Relational modeling keeps queries composable and migration-friendly when scaling beyond SQLite.

### Self-Referential User Relationship

**Decision**
Implemented user follows as a self-referential many-to-many relationship with a junction table

**Why?**

- Enables bidirectional queries (find followers or following)
- Simplifies implementation of social features
- Keeps related queries performant with proper indexing

**Trade-off**
This adds complexity compared to a simple array of IDs, but provides better query flexibility and performance.

### Strategic Entity Selection

**Decision**
Made Like a full entity rather than just a counter or flag on posts

**Why?**

- Enables activity tracking with timestamps
- Supports the activity endpoint requirements
- Maintains a clear record of user interactions

## Indexing Strategy for Performance Optimization

### Strategic Index Selection

**Decision**
Indexed only the hot paths used by critical queries

| Table       | Index                                  | Why                                                   |
| ----------- | -------------------------------------- | ----------------------------------------------------- |
| Follow      | (followerId), (followingId)            | For /api/feed and follower lists                      |
| PostHashtag | (hashtag) (case-insensitive collation) | For /api/posts/hashtag/:tag                           |
| Post        | (authorId, createdAt DESC)             | For feed retrieval (fast author posts sorted by date) |

**Why?**
Indexes improve reads but hurt writes, optimized where it matters most

**Trade-off**
Did not index like counts to avoid expensive updates.
Like counts are fetched via COUNT() only when needed, fast enough at this scale.

### Composite Unique Constraints

**Decision**
Applied unique constraint on the Like entity combining user and post

**Why?**

- Enforces business rule: One like per user-post
- Speeds up queries on (user, post) combinations
- Prevents data inconsistency at the database level

### Email and Hashtag Indexing

**Decision**

- Unique index on email for fast lookups
- Case-insensitive index on hashtag names

**Why?**
These fields are frequently used in WHERE clauses and need optimization for user authentication and hashtag searches.

## Scalability Considerations and Solutions

### Feed Computation: Fan-out-on-read

**Decision**
Generate feeds at read-time rather than update-time

**Why?**

- Avoids computation overhead when posts are created
- Prevents data duplication across multiple user feeds
- Better supports users with large follower counts
- Simplifies database schema and write operations

**Trade-off**
Read operations are more expensive, but this approach prevents write amplification and scales better for users with many followers.

### N+1 Query Prevention

**Decision**
Used eager loading and optimized queries to fetch related data in a single round trip

**Why?**

- Prevents dozens of separate database queries
- Significantly reduces API response time
- Improves server throughput under load

### Parameterized Query Enforcement

**Decision**
Used parameterized queries throughout the application

**Why?**

- Prevents SQL injection vulnerabilities
- Improves query plan caching in the database
- Creates cleaner, more maintainable code

### Pagination Implementation

**Decision**
All list endpoints implement pagination with limit and offset parameters

**Why?**

- Controls response size to prevent memory issues
- Improves perceived performance for users
- Reduces network bandwidth usage
- Supports infinitely scrollable client interfaces

## Additional Design Considerations

### Security Measures

- Input validation using Joi schemas
- Query parameter sanitization
- Structured error responses

### API Design

- RESTful endpoint structure
- Consistent response formats

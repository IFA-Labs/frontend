import React from 'react';
import BlogCard from '../blog-card';
import Blog1 from '../../../public/images/blog/1.jpg';
import Blog2 from '../../../public/images/blog/2.jpg';
import Blog3 from '../../../public/images/blog/3.jpg';
import Link from 'next/link';
const blogPosts = [
  {
    title:
      'Inside IFÁ Labs: Building the Infrastructure for Global Stablecoin Utility Vol 1.0',
    date: 'May 15, 2025',
    link: 'https://mirror.xyz/0x4801BcefA7Af2Af79Ee7132A4B317fb62A77b9C7/QOytHQar8Lq_OGttcf1U1bbm0OoLXlfULnygE8x-_ro',
    cover: Blog1,
  },
  {
    title: 'Why Africans Should Build Solutions to Solve Local Problems',
    date: 'May 15, 2025',
    link: 'https://mirror.xyz/0x4801BcefA7Af2Af79Ee7132A4B317fb62A77b9C7/FbAIyvz3l1kb5SEGdY4ru2ueYNN_kOz6PZzT9yp8URk',
    cover: Blog3,
  },
  {
    title:
      'How Stablecoin Adoption is Reshaping the Financial Landscape in Africa',
    date: 'May 15, 2025',
    link: 'https://mirror.xyz/0x4801BcefA7Af2Af79Ee7132A4B317fb62A77b9C7/MEqxodP2KpHLJUaF7kCmBobjzOvKiD2c-k4uAk6hZwE',
    cover: Blog2,
  },
];
const Blog = () => {
  return (
    <section className="blog-container">
      <div className="header">
        <div className="title">Blog</div>
        <div className="desc">
          Explore Ifa Labs insights on trustless oracles, multi-chain data
          feeds, engineering, blockchain trends, and Blockradar API integration.
        </div>
      </div>

      <div className="blog-cards">
        {blogPosts.map((post, idx) => (
          <Link
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            key={idx}
          >
            <BlogCard title={post.title} date={post.date} cover={post.cover} />
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Blog;

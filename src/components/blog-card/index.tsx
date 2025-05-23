'use client';
import React from 'react';
import { StaticImageData } from 'next/image';
import Image from 'next/image';

interface BlogCardProps {
  title: string;
  date: string;
  cover: string | StaticImageData;
}

const BlogCard: React.FC<BlogCardProps> = ({ title, date, cover }) => {
  return (
    <div className="blog-card">
      <div className="image-placeholder">
        <Image src={cover} alt={title} />
      </div>

      <main>
        <div className="card-body">
          <h3>{title}</h3>
          <p className="date">{date}</p>
        </div>
      </main>
    </div>
  );
};

export default BlogCard;

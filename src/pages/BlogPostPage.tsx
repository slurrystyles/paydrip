import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Helmet } from 'react-helmet-async';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchBlog() {
      if (!slug) return;
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setBlog(data);
        }
      } catch (err) {
        console.error('Error fetching blog post:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchBlog();
  }, [slug]);

  // Format full date
  const formatFullDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#EEEEEE] flex flex-col font-sans">
        <PublicHeader />
        <main className="max-w-3xl mx-auto px-6 py-20 flex-grow w-full space-y-8 animate-pulse">
          <div className="h-4 bg-[#161616] rounded w-24 mb-12" />
          <div className="space-y-4">
            <div className="h-10 bg-[#161616] rounded w-3/4" />
            <div className="h-4 bg-[#161616] rounded w-1/3" />
          </div>
          <div className="h-64 bg-[#161616] rounded-xl w-full" />
          <div className="space-y-3">
            <div className="h-4 bg-[#161616] rounded w-full" />
            <div className="h-4 bg-[#161616] rounded w-full" />
            <div className="h-4 bg-[#161616] rounded w-5/6" />
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#EEEEEE] flex flex-col font-sans">
        <PublicHeader />
        <main className="max-w-md mx-auto px-6 py-32 flex-grow w-full text-center">
          <div className="bg-[#111111] border border-[#222222] rounded-3xl p-8 space-y-6">
            <div className="w-16 h-16 bg-[#161616] rounded-full flex items-center justify-center text-red-500 mx-auto">
              ⚠️
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#EEEEEE] mb-2">Post Not Found</h1>
              <p className="text-[#888888] text-sm leading-relaxed">
                This article doesn't exist or has been removed.
              </p>
            </div>
            <button
              onClick={() => navigate('/blog')}
              className="px-6 py-2.5 bg-[#C8FF00] text-[#080808] rounded-xl text-xs font-semibold hover:bg-[#b8ef00] transition-colors cursor-pointer"
            >
              Back to Blog
            </button>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#EEEEEE] flex flex-col font-sans selection:bg-[#C8FF00] selection:text-[#080808]">
      <Helmet>
        <title>{blog.title} — Paydrip</title>
        <meta name="description" content={blog.excerpt} />
        <link rel="canonical" href={`https://paydripapp.com/blog/${blog.slug}`} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={`${blog.title} — Paydrip`} />
        <meta property="og:description" content={blog.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://paydripapp.com/blog/${blog.slug}`} />
        {blog.cover_image_url && <meta property="og:image" content={blog.cover_image_url} />}
      </Helmet>

      {/* Styled Embed for the Post Content */}
      <style>{`
        .prose-paydrip {
          color: #888888;
          line-height: 1.8;
          font-size: 0.9375rem;
        }
        .prose-paydrip h2 {
          color: #EEEEEE;
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
        }
        .prose-paydrip h3 {
          color: #EEEEEE;
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .prose-paydrip p {
          margin-bottom: 1.25rem;
        }
        .prose-paydrip ul, 
        .prose-paydrip ol {
          margin-bottom: 1.25rem;
          padding-left: 1.5rem;
        }
        .prose-paydrip ul {
          list-style-type: disc;
        }
        .prose-paydrip ol {
          list-style-type: decimal;
        }
        .prose-paydrip li {
          margin-bottom: 0.5rem;
        }
        .prose-paydrip strong {
          color: #EEEEEE;
          font-weight: 600;
        }
        .prose-paydrip a {
          color: #C8FF00;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .prose-paydrip a:hover {
          opacity: 0.8;
        }
        .prose-paydrip code {
          background: #111111;
          border: 1px solid #222222;
          border-radius: 4px;
          padding: 0.2em 0.4em;
          font-size: 0.875em;
          color: #C8FF00;
          font-family: monospace;
        }
        .prose-paydrip pre {
          background: #111111;
          border: 1px solid #222222;
          border-radius: 8px;
          padding: 1.25rem;
          overflow-x: auto;
          margin-bottom: 1.25rem;
        }
        .prose-paydrip blockquote {
          border-left: 3px solid #C8FF00;
          padding-left: 1rem;
          color: #888888;
          font-style: italic;
          margin-bottom: 1.25rem;
        }
        .prose-paydrip hr {
          border-color: #222222;
          margin: 2rem 0;
        }
      `}</style>

      <PublicHeader />

      <main className="max-w-3xl mx-auto px-6 py-20 flex-grow w-full">
        {/* Back Link */}
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 text-xs text-[#888888] hover:text-[#C8FF00] transition-colors mb-12 font-mono uppercase tracking-widest cursor-pointer"
        >
          ← Back to Blog
        </button>

        {/* Tags Row */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {blog.tags.map((tag: string) => (
              <span
                key={tag}
                className="bg-[#111111] border border-[#222222] text-[#888888] text-[10px] font-mono px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] leading-tight tracking-tight mt-4 mb-6">
          {blog.title}
        </h1>

        {/* Meta Row */}
        <div className="flex items-center gap-4 text-xs text-[#444444] font-mono mb-8">
          <span>{blog.author_name}</span>
          <span>·</span>
          <span>{formatFullDate(blog.published_at)}</span>
        </div>

        {/* Cover Image */}
        {blog.cover_image_url ? (
          <img
            src={blog.cover_image_url}
            alt={blog.title}
            className="w-full rounded-xl object-cover max-h-96 mb-10"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="bg-[#161616] h-64 w-full rounded-xl flex items-center justify-center select-none mb-10 border border-[#222222]">
            <span className="text-6xl font-extrabold text-[#C8FF00] font-mono tracking-tighter">P</span>
          </div>
        )}

        {/* Content Body */}
        <div className="prose-paydrip" dangerouslySetInnerHTML={{ __html: blog.content }} />

        {/* Bottom CTA */}
        <div className="mt-20 pt-10 border-t border-[#222222] text-center">
          <p className="text-sm text-[#888888] mb-4">
            Ready to automate your invoice recovery?
          </p>
          <a
            href="https://paydripapp.com"
            className="inline-block px-6 py-3 bg-[#C8FF00] text-[#080808] rounded-lg text-sm font-semibold hover:bg-[#b8ef00] transition-colors"
          >
            Try Paydrip Free
          </a>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

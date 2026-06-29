import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Helmet } from 'react-helmet-async';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

export default function BlogsPage() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('id, title, slug, excerpt, cover_image_url, author_name, published_at, tags')
          .eq('is_published', true)
          .order('published_at', { ascending: false });

        if (error) {
          console.error('Error fetching blogs:', error);
        } else {
          setBlogs(data || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching blogs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, []);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(blogs.flatMap((blog) => blog.tags || []))
  ) as string[];

  // Filter blogs based on selected tag
  const filteredBlogs = selectedTag
    ? blogs.filter((blog) => blog.tags && blog.tags.includes(selectedTag))
    : blogs;

  // Formatting date helper
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#EEEEEE] flex flex-col font-sans selection:bg-[#C8FF00] selection:text-[#080808]">
      <Helmet>
        <title>Paydrip — Get Paid Faster | Invoice Recovery for Freelancers</title>
        <meta name="description" content="Paydrip helps freelancers recover overdue invoices with automated Email, SMS, and WhatsApp reminders. Track payments, score client risk, and collect via UPI or card. Built for India, available worldwide." />
        <link rel="canonical" href="https://paydripapp.com/" />
        <meta property="og:title" content="Paydrip — Get Paid Faster | Invoice Recovery for Freelancers" />
        <meta property="og:description" content="Automate your invoice follow-ups and recover overdue payments with Paydrip. Email, SMS, and WhatsApp reminders. UPI and card payments." />
        <meta property="og:url" content="https://paydripapp.com/" />
        <meta property="og:image" content="https://paydripapp.com/og-image.png" />
      </Helmet>

      <PublicHeader />

      <main className="max-w-6xl mx-auto px-6 py-20 flex-grow w-full">
        {/* Page Header */}
        <div className="mb-16 text-center">
          <p className="text-xs text-[#888888] uppercase tracking-widest mb-3 font-mono">Blog</p>
          <h1 className="text-4xl md:text-5xl font-bold text-[#EEEEEE] tracking-tight">
            Insights & Updates
          </h1>
          <p className="text-[#888888] text-base mt-4 max-w-xl mx-auto leading-relaxed">
            Tips on invoice recovery, freelance finance, and getting paid faster.
          </p>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedTag === null
                  ? 'bg-[#C8FF00] text-[#080808]'
                  : 'bg-[#111111] border border-[#222222] text-[#888888] hover:text-[#EEEEEE]'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-[#C8FF00] text-[#080808]'
                    : 'bg-[#111111] border border-[#222222] text-[#888888] hover:text-[#EEEEEE]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Blog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-[#111111] border border-[#222222] rounded-xl h-[420px] animate-pulse overflow-hidden flex flex-col"
              >
                <div className="h-48 bg-[#161616] w-full" />
                <div className="p-6 flex-grow space-y-4">
                  <div className="h-4 bg-[#161616] rounded w-1/4" />
                  <div className="h-6 bg-[#161616] rounded w-3/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-[#161616] rounded w-full" />
                    <div className="h-4 bg-[#161616] rounded w-5/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20 bg-[#111111] border border-[#222222] rounded-2xl p-8 max-w-md mx-auto">
            <p className="text-[#888888] text-sm">No posts yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} formatDate={formatDate} navigate={navigate} />
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

function BlogCard({
  blog,
  formatDate,
  navigate,
}: {
  blog: any;
  formatDate: (date: string) => string;
  navigate: any;
}) {
  return (
    <div
      onClick={() => navigate(`/blog/${blog.slug}`)}
      className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden hover:border-[#333333] transition-colors cursor-pointer group flex flex-col h-full"
    >
      {/* Cover Image */}
      {blog.cover_image_url ? (
        <img
          src={blog.cover_image_url}
          alt={blog.title}
          className="h-48 w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="bg-[#161616] h-48 w-full flex items-center justify-center select-none group-hover:scale-[1.02] transition-transform duration-300">
          <span className="text-4xl font-extrabold text-[#C8FF00] font-mono tracking-tighter">P</span>
        </div>
      )}

      {/* Card Body */}
      <div className="p-6 flex flex-col flex-grow">
        {/* Tags Row */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {blog.tags.map((tag: string) => (
              <span
                key={tag}
                className="bg-[#080808] border border-[#222222] text-[#888888] text-[10px] font-mono px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-semibold text-[#EEEEEE] group-hover:text-[#C8FF00] transition-colors leading-snug">
          {blog.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-[#888888] mt-2 mb-4 leading-relaxed line-clamp-3 flex-grow">
          {blog.excerpt}
        </p>

        {/* Footer Row */}
        <div className="mt-auto pt-4 border-t border-[#222222]/50 flex items-center justify-between">
          <span className="text-xs text-[#444444] font-medium">{blog.author_name}</span>
          <span className="text-xs text-[#444444] font-mono">{formatDate(blog.published_at)}</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../utils/api', () => ({ default: apiMock }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import WebsitePostsPage, { slugify, imageSrc, API_ORIGIN } from './WebsitePostsPage';

const posts = [
  { _id: 'p1', kind: 'blog', slug: 'age-limit-for-ame', title: 'Age limit for AME', excerpt: 'A', image: '/storage/blogs/a.jpg', date: '2025-10-01', status: 'published', updatedAt: '2025-10-02T10:00:00Z' },
  { _id: 'p2', kind: 'blog', slug: 'draft-notes', title: 'Draft notes', excerpt: 'B', image: '', date: '2025-09-01', status: 'draft' },
];

describe('WebsitePostsPage', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.put.mockReset();
    apiMock.delete.mockReset();
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/posts/admin/blog') return { data: { posts, total: posts.length } };
      if (url === '/posts/admin/blog/p1') return { data: { ...posts[0], html: '<p>Body</p>' } };
      throw new Error(`unexpected GET ${url}`);
    });
  });

  it('slugify and imageSrc follow the API rules', () => {
    expect(slugify('What Is The Age Limit For AME?')).toBe('what-is-the-age-limit-for-ame');
    expect(imageSrc('/uploads/posts/x.png')).toBe(`${API_ORIGIN}/uploads/posts/x.png`);
    expect(API_ORIGIN).toMatch(/^https?:\/\/[^/]+$/);
    expect(imageSrc('/storage/blogs/a.jpg')).toBe('https://iiae.in/storage/blogs/a.jpg');
    expect(imageSrc('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
  });

  it('lists posts with their status and filters drafts', async () => {
    render(<WebsitePostsPage kind="blog" />);
    expect(await screen.findByText('Age limit for AME')).toBeInTheDocument();
    expect(screen.getByText('Draft notes')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Drafts (1)' }));
    expect(screen.queryByText('Age limit for AME')).not.toBeInTheDocument();
    expect(screen.getByText('Draft notes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All (2)' }));
    fireEvent.change(screen.getByLabelText('Search posts'), { target: { value: 'age' } });
    expect(screen.getByText('Age limit for AME')).toBeInTheDocument();
    expect(screen.queryByText('Draft notes')).not.toBeInTheDocument();
  });

  it('creates a post with a slug generated from the title', async () => {
    apiMock.post.mockResolvedValue({ data: { _id: 'p3' } });
    render(<WebsitePostsPage kind="blog" />);
    await screen.findByText('Age limit for AME');

    fireEvent.click(screen.getByRole('button', { name: /New blog post/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Can Girls Apply for AME?' } });
    expect(within(dialog).getByLabelText('URL slug')).toHaveValue('can-girls-apply-for-ame');

    fireEvent.change(within(dialog).getByLabelText('Excerpt'), { target: { value: 'Yes.' } });
    fireEvent.change(within(dialog).getByLabelText('Publish date'), { target: { value: '2025-10-05' } });
    fireEvent.change(within(dialog).getByLabelText('Status'), { target: { value: 'draft' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    expect(apiMock.post).toHaveBeenCalledWith('/posts/admin/blog', {
      title: 'Can Girls Apply for AME?',
      slug: 'can-girls-apply-for-ame',
      date: '2025-10-05',
      status: 'draft',
      excerpt: 'Yes.',
      image: '',
      html: '',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the API field error when the slug is taken', async () => {
    apiMock.post.mockRejectedValue({ response: { status: 409, data: { message: 'A post with this slug already exists', errors: { slug: 'Already in use' } } } });
    render(<WebsitePostsPage kind="blog" />);
    await screen.findByText('Age limit for AME');
    fireEvent.click(screen.getByRole('button', { name: /New blog post/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Age limit for AME' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish' }));
    expect(await within(dialog).findByText('Already in use')).toBeInTheDocument();
  });

  it('loads the full post for editing and sends the changed fields', async () => {
    apiMock.put.mockResolvedValue({ data: {} });
    render(<WebsitePostsPage kind="blog" />);
    await screen.findByText('Age limit for AME');
    fireEvent.click(screen.getByRole('button', { name: 'Edit Age limit for AME' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByLabelText('Title')).toHaveValue('Age limit for AME'));
    expect(within(dialog).getByTestId('html-editor-visual').innerHTML).toBe('<p>Body</p>');

    // Editing the title of an existing post keeps its slug
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Age limit for AME (2026)' } });
    expect(within(dialog).getByLabelText('URL slug')).toHaveValue('age-limit-for-ame');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    expect(apiMock.put.mock.calls[0][0]).toBe('/posts/admin/blog/p1');
    expect(apiMock.put.mock.calls[0][1]).toMatchObject({ title: 'Age limit for AME (2026)', slug: 'age-limit-for-ame', html: '<p>Body</p>' });
  });

  it('deletes after confirmation', async () => {
    apiMock.delete.mockResolvedValue({ data: { message: 'ok' } });
    render(<WebsitePostsPage kind="blog" />);
    await screen.findByText('Draft notes');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Draft notes' }));
    expect(await screen.findByText('Delete this blog post?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/posts/admin/blog/p2'));
    await waitFor(() => expect(screen.queryByText('Draft notes')).not.toBeInTheDocument());
  });
});

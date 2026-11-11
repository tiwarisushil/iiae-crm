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

import SeoPage, { mergeRows } from './SeoPage';

const routes = [
  { route: '/', label: 'Home', group: 'Pages', defaultTitle: 'Default home title', defaultDescription: 'Default home description' },
  { route: '/about-us', label: 'About Us', group: 'Pages', defaultTitle: 'About default', defaultDescription: '' },
  { route: '/blog/new-post', label: 'New Post', group: 'Blog', defaultTitle: 'New Post | IIAE Delhi', defaultDescription: 'Excerpt' },
];
const entries = [
  { _id: 'e1', route: '/about-us', title: 'Custom about', description: 'Custom description' },
  { _id: 'e2', route: '/blog/deleted', title: 'Gone', description: '' },
];

const mockLoad = () => {
  apiMock.get.mockImplementation((url) => Promise.resolve({ data: url === '/seo/admin/routes' ? { routes } : { entries } }));
};

describe('mergeRows', () => {
  it('attaches entries to their pages and keeps entries for pages no longer listed', () => {
    const rows = mergeRows(routes, entries);
    expect(rows).toHaveLength(4);
    expect(rows[1].entry.title).toBe('Custom about');
    expect(rows[0].entry).toBeNull();
    expect(rows[3]).toMatchObject({ route: '/blog/deleted', group: 'Not on the site' });
  });
});

describe('SeoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoad();
  });

  it('lists every page with its custom or default SEO', async () => {
    render(<SeoPage />);
    expect(await screen.findByText('Custom about')).toBeInTheDocument();
    expect(screen.getByText('Default home title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom (2)' })).toBeInTheDocument();
  });

  it('creates an entry for a page picked from the website routes', async () => {
    apiMock.post.mockResolvedValue({ data: {} });
    render(<SeoPage />);
    await screen.findByText('Custom about');
    fireEvent.click(screen.getByRole('button', { name: /New SEO entry/ }));
    const dialog = screen.getByRole('dialog', { name: 'New SEO entry' });
    const select = within(dialog).getByRole('combobox', { name: 'Page' });
    // Pages that already have an entry are not offered again
    expect(within(select).queryByText(/About Us/)).toBeNull();
    fireEvent.change(select, { target: { value: '/' } });
    expect(within(dialog).getByPlaceholderText('Default home title')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByPlaceholderText('Default home title'), { target: { value: '  New home title ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/seo/admin', { route: '/', title: 'New home title', description: '' }));
  });

  it('edits and resets an existing entry', async () => {
    apiMock.put.mockResolvedValue({ data: {} });
    apiMock.delete.mockResolvedValue({ data: {} });
    render(<SeoPage />);
    await screen.findByText('Custom about');
    fireEvent.click(screen.getByRole('button', { name: 'Edit SEO of /about-us' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit SEO' });
    fireEvent.change(within(dialog).getByDisplayValue('Custom about'), { target: { value: 'Updated about' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/seo/admin/e1', { title: 'Updated about', description: 'Custom description' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Reset SEO of /about-us' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/seo/admin/e1'));
  });
});

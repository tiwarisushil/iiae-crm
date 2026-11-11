import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TermsModal, { TERMS } from './TermsModal';

describe('TermsModal', () => {
  it('renders nothing when closed', () => {
    render(<TermsModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists every term and closes on Escape, backdrop or the close button', () => {
    const onClose = vi.fn();
    render(<TermsModal open onClose={onClose} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('Terms and Conditions');
    TERMS.forEach((term, index) => expect(screen.getByText(`${index + 1}. ${term.title}`)).toBeInTheDocument());
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByText('Close'));
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('I agree calls onAccept', () => {
    const onAccept = vi.fn();
    render(<TermsModal open onClose={() => {}} onAccept={onAccept} />);
    fireEvent.click(screen.getByRole('button', { name: /i agree/i }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});

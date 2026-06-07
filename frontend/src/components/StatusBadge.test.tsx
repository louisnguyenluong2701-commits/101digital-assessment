import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the status label', () => {
    render(<StatusBadge status="Overdue" />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('applies a distinct style per status', () => {
    const { rerender } = render(<StatusBadge status="Paid" />);
    expect(screen.getByText('Paid').className).toContain('emerald');

    rerender(<StatusBadge status="Overdue" />);
    expect(screen.getByText('Overdue').className).toContain('red');
  });
});

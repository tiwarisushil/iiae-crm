import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AutocompleteSelect from './AutocompleteSelect';
import { INDIA_STATES, districtsForState } from '../data/indiaStatesDistricts';

const Harness = () => {
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  return (
    <>
      <AutocompleteSelect name="state" value={state} onChange={(v) => { setState(v); setDistrict(''); }} options={INDIA_STATES} placeholder="State" />
      <AutocompleteSelect name="district" value={district} onChange={setDistrict} options={districtsForState(state)} disabled={!state} placeholder="District" />
    </>
  );
};

describe('AutocompleteSelect state/district', () => {
  it('filters states while typing and enables districts for the chosen state', () => {
    render(<Harness />);
    const state = screen.getByPlaceholderText('State');
    const district = screen.getByPlaceholderText('District');
    expect(district).toBeDisabled();

    fireEvent.change(state, { target: { value: 'utt' } });
    const options = screen.getAllByRole('option').map((el) => el.textContent);
    expect(options).toEqual(['Uttar Pradesh', 'Uttarakhand']);

    fireEvent.mouseDown(screen.getByText('Uttarakhand'));
    expect(state).toHaveValue('Uttarakhand');
    expect(district).toBeEnabled();

    fireEvent.change(district, { target: { value: 'deh' } });
    expect(screen.getAllByRole('option').map((el) => el.textContent)).toEqual(['Dehradun']);
    fireEvent.keyDown(district, { key: 'Enter' });
    expect(district).toHaveValue('Dehradun');

    // Changing the state clears a district that no longer applies
    fireEvent.change(state, { target: { value: 'Delhi' } });
    expect(district).toHaveValue('');
  });

  it('dataset covers all 36 states and union territories', () => {
    expect(INDIA_STATES).toHaveLength(36);
    expect(districtsForState('delhi')).toContain('New Delhi');
    expect(districtsForState('Nowhere')).toEqual([]);
  });
});

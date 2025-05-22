'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

interface SearchBarProps {
  onSubmit: (searchText: string) => void;
  loading: boolean;
}

export interface SearchBarRef {
  triggerSubmit: () => void;
}

const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(({ onSubmit, loading }, ref) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (input.trim() !== '') {
      onSubmit(input.trim());
      setInput('');
    }
  };

  useImperativeHandle(ref, () => ({
    triggerSubmit: () => {
      handleSubmit();
    },
  }));

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md flex flex-col items-center space-y-4"
    >
      <input
        type="text"
        placeholder="I need..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full rounded-full border border-green-300 p-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
      />

      {loading && (
        <p className="text-melon font-medium text-lg">🍈 Searching for a provider…</p>
      )}
    </form>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import Fuse from "fuse.js";
import { TextField } from "@shopify/polaris";

interface Category {
  id: string;
  name: string;
  fully_qualified_type: string;
}

interface CategorySelectorProps {
  categories: Category[];
  handleCategorySelect: (categoryId: string) => void;
  initValue: any;
}

interface FuseSearchProps {
  categories: Category[];
  onSelect: (categoryId: string) => void;
  initValue: any;
}

export default function CategorySelector({
  categories,
  handleCategorySelect,
  initValue,
}: CategorySelectorProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // const handleCategorySelect = (categoryId: string) => {
  //   setSelectedCategoryId(categoryId);
  // };

  return (
    <Suspense fallback={<div>Loading categories...</div>}>
      <FuseSearch
        categories={categories}
        onSelect={handleCategorySelect}
        initValue={initValue}
      />
      {/* {selectedCategoryId && (
        <p className="mt-4">Selected Category ID: {selectedCategoryId}</p>
      )} */}
    </Suspense>
  );
}

function FuseSearch({ categories, onSelect, initValue }: FuseSearchProps) {
  const [typed, setTyped] = useState(false);
  const [query, setQuery] = useState(initValue);
  const [results, setResults] = useState<any>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fuse, setFuse] = useState<Fuse<Category> | null>(null);

  useEffect(() => {
    const fuseInstance = new Fuse(categories, {
      keys: ["name", "fully_qualified_type"],
      includeMatches: true,
      minMatchCharLength: 2,
      threshold: 0.3,
    });
    setFuse(fuseInstance);
  }, [categories]);

  const debouncedSearch = useCallback(
    (value: string) => {
      if (fuse && value.trim()) {
        const searchResults = fuse.search(value, { limit: 10 });
        setResults(searchResults);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    },
    [fuse],
  );

  useEffect(() => {
    const timer = setTimeout(() => debouncedSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (category: Category) => {
    onSelect(category.id);
    setQuery(category.fully_qualified_type);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <TextField
          label={"Category"}
          value={query}
          onChange={(newValue) => {
            setQuery(newValue);
            setTyped(true);
          }}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
          suffix={
            query ? (
              <SearchIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronsUpDownIcon className="w-5 h-5 text-gray-400" />
            )
          }
        />
      </div>
      {(typed && isOpen) && (
        <ul className="absolute z-30 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
          {results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-700">
              No results found
            </li>
          ) : (
            results.map((result: any) => (
              <li
                key={result.item.id}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleSelect(result.item)}
              >
                {result.item.fully_qualified_type}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

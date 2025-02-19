import { fetchGraphQL } from "../lib/graphql";
import { useEffect, useRef, useState } from "react";
import { TextField } from "@shopify/polaris";
import { ChevronsUpDownIcon, SearchIcon } from "lucide-react";

export default function MetaobjectSearch({
  objectType,
  label,
  onChange,
  value,
  error,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  useEffect(() => {
    if (query) {
      const fetchData = async () => {
        const graphQLQuery = `{
            metaobjects(type: "${objectType}", first: 25, query:"display_name:*${query}*") {
              edges {
                node {
                  id
                  type
                  displayName
                  fields {
                    key
                    value
                    jsonValue
                  }
                }
              }
            }
          }`;
        const respdata = await fetchGraphQL(graphQLQuery);
        const data = respdata?.metaobjects?.edges.map((edge) => {
          const fields = edge.node.fields.reduce((acc, field) => {
            acc[field.key] = field.jsonValue;
            return acc;
          }, {});
          return {
            id: edge.node.id,
            type: edge.node.type,
            display_name: edge.node?.displayName || "",
            ...fields,
          };
        });
        console.log("data", respdata, data);
        setResults(data || []);
      };
      fetchData();
    } else {
      setResults([]);
    }
  }, [query, objectType]);

  const handleSelect = (item) => {
    onChange(item.display_name);
    setIsOpen(false);
    setQuery(item.display_name);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <TextField
        label={label}
        value={value}
        onChange={(newValue) => {
          setQuery(newValue);
          onChange(newValue);
        }}
        onFocus={() => setIsOpen(true)}
        autoComplete="off"
        error={error}
        suffix={
          query ? (
            <SearchIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronsUpDownIcon className="w-5 h-5 text-gray-400" />
          )
        }
      />
      {isOpen && (
        <ul className="absolute z-30 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border">
          {results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-700">
              No results found
            </li>
          ) : (
            results.map((result) => (
              <li
                key={result.id}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleSelect(result)}
              >
                {result.display_name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

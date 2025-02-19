import { useState, useMemo, useCallback, useEffect } from "react";
import { Combobox, Listbox, Icon } from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { usaStates } from "../../data/states";

const StateSelect = ({ value, onChange, error }) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const selectedState = usaStates.find((state) => state.value === value);
    if (selectedState) {
      setInputValue(selectedState.value);
    } else {
      setInputValue("");
    }
  }, [value]);

  const escapeRegExp = useCallback(
    (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    [],
  );

  const filteredStates = useMemo(() => {
    if (!inputValue) return usaStates;
    const regex = new RegExp(escapeRegExp(inputValue), "i");
    return usaStates.filter(
      (state) => state.value.match(regex) || state.key.match(regex),
    );
  }, [inputValue, escapeRegExp]);

  const handleSelect = useCallback(
    (selectedValue) => {
      const selectedState = usaStates.find(
        (state) => state.key === selectedValue,
      );
      if (selectedState) {
        onChange(selectedState.value);
        setInputValue(selectedState.value);
      }
      setShowOptions(false);
    },
    [onChange],
  );

  return (
    <Combobox
      activator={
        <Combobox.TextField
          prefix={<Icon source={SearchIcon} />}
          onChange={(value) => {
            setInputValue(value);
            setShowOptions(true);
          }}
          value={inputValue}
          label="State"
          placeholder="Search state..."
          autoComplete="off"
          error={error}
        />
      }
      visible={showOptions}
      onClose={() => setShowOptions(false)}
    >
      {filteredStates.length > 0 ? (
        <Listbox onSelect={handleSelect}>
          {filteredStates.map((state) => (
            <div className="px-2 py-1">
              <Listbox.Option
                key={state.key}
                value={state.key}
                selected={value === state.value}
              >
                {state.value} ({state.key})
              </Listbox.Option>
            </div>
          ))}
        </Listbox>
      ) : (
        <Listbox.Empty>No states found</Listbox.Empty>
      )}
    </Combobox>
  );
};

export default StateSelect;

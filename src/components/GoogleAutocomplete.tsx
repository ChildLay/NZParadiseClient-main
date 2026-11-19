
/* 
//old implementation
import React, { useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { TextField } from '@mui/material';

interface GoogleAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const GoogleAutocomplete: React.FC<GoogleAutocompleteProps> = ({
  value,
  onChange,
  label = "Location",
  required = false,
  error = false,
  helperText = '',
}) => {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handleLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        onChange(place.formatted_address);
      }
    }
  };

  return (
    <Autocomplete onLoad={handleLoad} onPlaceChanged={handlePlaceChanged}>
      <TextField
        fullWidth
        variant="outlined"
        label={label}
        required={required}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        error={error}
        helperText={helperText}
      />
    </Autocomplete>
  );
};

export default GoogleAutocomplete; */

// New implementation using Places API (New)

import React, { useEffect, useRef, useState } from 'react';
import {
  Autocomplete as MuiAutocomplete,
  CircularProgress,
  TextField,
} from '@mui/material';

interface GoogleAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

interface LocationSuggestion {
  id: string;
  description: string;
  placePrediction: any;
}

const GoogleAutocomplete: React.FC<GoogleAutocompleteProps> = ({
  value,
  onChange,
  label = 'Location',
  required = false,
  error = false,
  helperText = '',
}) => {
  const [options, setOptions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionTokenRef = useRef<any>(null);

  const loadSuggestions = async (searchText: string) => {
    const input = searchText.trim();

    if (input.length < 3) {
      setOptions([]);
      return;
    }

    if (!window.google?.maps) {
      console.error('Google Maps has not loaded.');
      return;
    }

    setLoading(true);

    try {
      const placesLibrary: any =
        await window.google.maps.importLibrary('places');

      if (!sessionTokenRef.current) {
        sessionTokenRef.current =
          new placesLibrary.AutocompleteSessionToken();
      }

      const response =
        await placesLibrary.AutocompleteSuggestion
          .fetchAutocompleteSuggestions({
            input,
            sessionToken: sessionTokenRef.current,
            includedRegionCodes: ['nz'],
          });

      const suggestions: LocationSuggestion[] =
        response.suggestions
          .filter((suggestion: any) => suggestion.placePrediction)
          .map((suggestion: any) => {
            const prediction = suggestion.placePrediction;

            return {
              id: prediction.placeId,
              description: prediction.text?.text ?? '',
              placePrediction: prediction,
            };
          });

      setOptions(suggestions);
    } catch (error) {
      console.error(
        'Unable to load location suggestions:',
        error
      );

      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    _event: React.SyntheticEvent,
    inputValue: string,
    reason: string
  ) => {
    onChange(inputValue);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (reason !== 'input') {
      return;
    }

    debounceTimer.current = setTimeout(() => {
      void loadSuggestions(inputValue);
    }, 350);
  };

  const handleSelection = async (
    _event: React.SyntheticEvent,
    selectedOption: LocationSuggestion | string | null
  ) => {
    if (!selectedOption) {
      return;
    }

    if (typeof selectedOption === 'string') {
      onChange(selectedOption);
      return;
    }

    try {
      const place =
        selectedOption.placePrediction.toPlace();

      await place.fetchFields({
        fields: ['formattedAddress', 'location'],
      });

      onChange(
        place.formattedAddress ??
          selectedOption.description
      );

      setOptions([]);
      sessionTokenRef.current = null;
    } catch (error) {
      console.error(
        'Unable to retrieve place details:',
        error
      );
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <MuiAutocomplete<LocationSuggestion, false, false, true>
      freeSolo
      fullWidth
      options={options}
      loading={loading}
      inputValue={value}
      filterOptions={(items) => items}
      getOptionLabel={(option) =>
        typeof option === 'string'
          ? option
          : option.description
      }
      onInputChange={handleInputChange}
      onChange={handleSelection}
      noOptionsText={
        value.trim().length < 3
          ? 'Enter at least 3 characters'
          : 'No New Zealand locations found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          fullWidth
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && (
                  <CircularProgress
                    color="inherit"
                    size={20}
                  />
                )}

                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default GoogleAutocomplete;
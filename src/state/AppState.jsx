// src/state/AppState.jsx
//
// The whole app's state machine, per the spec:
//   landing -> processing -> results (mode locked) | error
//   library is a parallel view reachable from the nav at any time.
// `results` never exposes a way to switch modes in place — "New URL" is the
// only way back to landing, which re-runs processing for the new mode.

import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import { analyzeUrl } from '../api/client.js';

const AppStateContext = createContext(null);

const MODES = ['tldr', 'song', 'kid'];

const initialState = {
  // 'landing' | 'processing' | 'results' | 'error' | 'library' | 'about' | 'how'
  screen: 'landing',
  pendingUrl: '',
  selectedMode: 'tldr', // landing's mode picker; default per spec
  result: null, // last successful /api/analyze payload
  error: null, // { code, message }
  library: [], // [{ id, site, mode, savedAt, data }]
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SELECTED_MODE':
      return { ...state, selectedMode: action.mode };
    case 'START_TRANSFORM':
      return {
        ...state,
        screen: 'processing',
        pendingUrl: action.url,
        selectedMode: action.mode,
        error: null,
      };
    case 'TRANSFORM_SUCCESS':
      return { ...state, screen: 'results', result: action.data, error: null };
    case 'TRANSFORM_ERROR':
      return { ...state, screen: 'error', error: action.error, result: null };
    case 'RESET_TO_LANDING':
      return { ...state, screen: 'landing', pendingUrl: '', result: null, error: null };
    case 'GO_TO_LIBRARY':
      return { ...state, screen: 'library' };
    // Static content pages (About / How it works). They don't touch `result`,
    // so returning Home from one leaves any existing result intact.
    case 'GO_TO_SCREEN':
      return { ...state, screen: action.screen };
    case 'OPEN_LIBRARY_ITEM': {
      const item = state.library.find((i) => i.id === action.id);
      if (!item) return state;
      return { ...state, screen: 'results', result: item.data, selectedMode: item.mode };
    }
    case 'SAVE_CURRENT_RESULT': {
      if (!state.result || state.result.status !== 'ok') return state;
      const { site, mode } = state.result;
      const id = `${site.url}::${mode}`;
      if (state.library.some((i) => i.id === id)) return state; // already saved
      const item = { id, site, mode, savedAt: new Date().toISOString(), data: state.result };
      return { ...state, library: [item, ...state.library] };
    }
    case 'UNSAVE_RESULT': {
      return { ...state, library: state.library.filter((i) => i.id !== action.id) };
    }
    default:
      return state;
  }
}

// Steps 1-3 of the processing animation always get to play out fully before
// we act on a real response, even if the API was faster than that — see
// docs/FEATURES.md#processing-screen. If the API is slower, this resolves
// immediately once the real call finishes; step 4 just stays visually
// "active" in the meantime, which is the intended fallback state.
const MIN_PROCESSING_MS = 2800;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const requestSeq = useRef(0);

  const setSelectedMode = useCallback((mode) => {
    if (MODES.includes(mode)) dispatch({ type: 'SET_SELECTED_MODE', mode });
  }, []);

  const startTransform = useCallback(async (url, modeOverride) => {
    const mode = modeOverride || state.selectedMode;
    const mySeq = ++requestSeq.current;
    dispatch({ type: 'START_TRANSFORM', url, mode });

    const [data] = await Promise.all([analyzeUrl(url, mode), wait(MIN_PROCESSING_MS)]);

    if (mySeq !== requestSeq.current) return; // a newer request superseded this one

    if (data?.status === 'error') {
      dispatch({ type: 'TRANSFORM_ERROR', error: { code: data.code, message: data.message } });
    } else {
      dispatch({ type: 'TRANSFORM_SUCCESS', data });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedMode]);

  const resetToLanding = useCallback(() => dispatch({ type: 'RESET_TO_LANDING' }), []);
  const goToLibrary = useCallback(() => dispatch({ type: 'GO_TO_LIBRARY' }), []);
  const goToScreen = useCallback((screen) => dispatch({ type: 'GO_TO_SCREEN', screen }), []);
  const openLibraryItem = useCallback((id) => dispatch({ type: 'OPEN_LIBRARY_ITEM', id }), []);
  const saveCurrentResult = useCallback(() => dispatch({ type: 'SAVE_CURRENT_RESULT' }), []);
  const unsaveResult = useCallback((id) => dispatch({ type: 'UNSAVE_RESULT', id }), []);

  // In-place regenerate for the Results screen action row — does NOT route
  // through the processing screen, just quietly re-runs the same transform
  // and swaps the content in place. Returns success bool so the caller (the
  // regenerate button) can stop its own spin animation.
  const refreshResult = useCallback(async () => {
    if (!state.result || state.result.status !== 'ok') return false;
    const { site, mode } = state.result;
    try {
      const data = await analyzeUrl(site.url, mode);
      if (data?.status === 'ok') {
        dispatch({ type: 'TRANSFORM_SUCCESS', data });
        return true;
      }
    } catch (err) {
      console.warn('[Prism] regenerate failed', err);
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result]);

  const isCurrentResultSaved = useMemo(() => {
    if (!state.result || state.result.status !== 'ok') return false;
    const id = `${state.result.site.url}::${state.result.mode}`;
    return state.library.some((i) => i.id === id);
  }, [state.result, state.library]);

  const value = useMemo(
    () => ({
      state,
      setSelectedMode,
      startTransform,
      resetToLanding,
      goToLibrary,
      goToScreen,
      openLibraryItem,
      saveCurrentResult,
      unsaveResult,
      refreshResult,
      isCurrentResultSaved,
    }),
    [
      state,
      setSelectedMode,
      startTransform,
      resetToLanding,
      goToLibrary,
      goToScreen,
      openLibraryItem,
      saveCurrentResult,
      unsaveResult,
      refreshResult,
      isCurrentResultSaved,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

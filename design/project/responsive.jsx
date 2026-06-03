/* responsive.jsx — viewport helpers shared across the app.
   Loaded AFTER signature.jsx (which destructures React hooks into scope),
   BEFORE the page scripts so every page can call useIsMobile().
*/

// Breakpoints (px). mobile = phones + small tablets in portrait.
const BP = { mobile: 820, narrow: 520 };

// useMediaQuery — re-renders the calling component when the query flips.
function useMediaQuery(query) {
  const get = () =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches
      : false;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatch(get());
    onChange();
    // addEventListener is the modern API; addListener is the Safari<14 fallback.
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    // Also recompute on resize — belt & suspenders for embedded/preview frames.
    window.addEventListener("resize", onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [query]);
  return match;
}

// true on phones / small tablets — the main responsive switch.
function useIsMobile() {
  const read = () => {
    if (typeof window !== "undefined" && window.__forceMobile != null) return !!window.__forceMobile;
    return typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(`(max-width: ${BP.mobile}px)`).matches
      : false;
  };
  const [mobile, setMobile] = useState(read);
  useEffect(() => {
    let raf = 0;
    const onChange = () => {
      // Debounce to a frame so a burst of resize events can't thrash layout.
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMobile(read()));
    };
    setMobile(read());
    window.addEventListener("resize", onChange);
    let mql;
    if (window.matchMedia) {
      mql = window.matchMedia(`(max-width: ${BP.mobile}px)`);
      if (mql.addEventListener) mql.addEventListener("change", onChange);
      else mql.addListener(onChange);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener("change", onChange);
        else mql.removeListener(onChange);
      }
    };
  }, []);
  return mobile;
}

// true on very narrow phones — for extra-tight reflows.
function useIsNarrow() {
  return useMediaQuery(`(max-width: ${BP.narrow}px)`);
}

Object.assign(window, { BP, useMediaQuery, useIsMobile, useIsNarrow });

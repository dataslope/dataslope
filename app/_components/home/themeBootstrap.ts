/**
 * Pre-hydration theme bootstrap for standalone pages that use the home shell
 * (share pages, the branded 404 / error pages). Applies the shared `theme`
 * localStorage choice to the root element before first paint so dark mode
 * never flashes. Inline it via <script dangerouslySetInnerHTML>.
 */
export const THEME_BOOTSTRAP = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

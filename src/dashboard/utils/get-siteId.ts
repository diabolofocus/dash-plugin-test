
// export const getCurrentSiteId = (): string | null => {
//     const url = window.location.href;
//     const match = url.match(/dashboard\/([a-f0-9-]{36})/);
//     return match ? match[1] : null;
// };

// utils/get-siteId.ts - Improved version with better URL detection
export const getCurrentSiteId = (): string | null => {
    const url = window.location.href;

    console.log('🔍 Debugging Site ID extraction:', {
        fullURL: url,
        pathname: window.location.pathname,
        search: window.location.search
    });

    // Try multiple URL patterns for site ID extraction
    const patterns = [
        // Pattern 1: Dashboard URLs like /dashboard/12345678-1234-1234-1234-123456789abc
        /dashboard\/([a-f0-9-]{36})/i,

        // Pattern 2: URLs with siteId parameter
        /siteId[=:]([a-f0-9-]{36})/i,

        // Pattern 3: URLs with metasiteId parameter  
        /metasiteId[=:]([a-f0-9-]{36})/i,

        // Pattern 4: Sites URLs like /sites/12345678-1234-1234-1234-123456789abc
        /sites\/([a-f0-9-]{36})/i,

        // Pattern 5: Apps URLs like /apps/12345678-1234-1234-1234-123456789abc
        /apps\/([a-f0-9-]{36})/i,

        // Pattern 6: Query parameters
        /[?&](?:siteId|metasiteId|site)[=]([a-f0-9-]{36})/i,

        // Pattern 7: Fragment/hash parameters
        /#.*(?:siteId|metasiteId|site)[=:]([a-f0-9-]{36})/i
    ];

    for (let i = 0; i < patterns.length; i++) {
        const match = url.match(patterns[i]);
        if (match && match[1]) {
            console.log(`✅ Site ID found using pattern ${i + 1}:`, match[1]);
            return match[1];
        }
    }

    // If no pattern matches, try extracting any UUID-like string
    const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
    const uuidMatch = url.match(uuidPattern);

    if (uuidMatch && uuidMatch[1]) {
        console.log('🔍 Found UUID-like string (might be site ID):', uuidMatch[1]);
        return uuidMatch[1];
    }

    console.warn('❌ No site ID found in URL using any pattern');
    return null;
};

// Alternative function to get site ID from various sources
export const getSiteIdFromContext = (): string | null => {
    // Method 1: Try the URL-based approach
    let siteId = getCurrentSiteId();
    if (siteId) return siteId;

    // Method 2: Try localStorage
    const storedSiteId = localStorage.getItem('wix-site-id') ||
        localStorage.getItem('siteId') ||
        localStorage.getItem('metasiteId');
    if (storedSiteId) {
        console.log('🔑 Site ID found in localStorage:', storedSiteId);
        return storedSiteId;
    }

    // Method 3: Try sessionStorage
    const sessionSiteId = sessionStorage.getItem('wix-site-id') ||
        sessionStorage.getItem('siteId') ||
        sessionStorage.getItem('metasiteId');
    if (sessionSiteId) {
        console.log('🔑 Site ID found in sessionStorage:', sessionSiteId);
        return sessionSiteId;
    }

    // Method 4: Try global window variables (sometimes Wix sets these)
    if (typeof window !== 'undefined') {
        const wixGlobals = (window as any);
        const globalSiteId = wixGlobals.siteId ||
            wixGlobals.metasiteId ||
            wixGlobals.SITE_ID ||
            wixGlobals.META_SITE_ID;
        if (globalSiteId) {
            console.log('🔑 Site ID found in global variables:', globalSiteId);
            return globalSiteId;
        }
    }

    console.warn('❌ Site ID not found in any source');
    return null;
};

// Debug function to help identify the site ID in your environment
export const debugSiteIdSources = () => {
    console.log('🔍 Site ID Debug Information:');
    console.log('URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    console.log('Search:', window.location.search);
    console.log('Hash:', window.location.hash);

    console.log('LocalStorage keys:', Object.keys(localStorage));
    console.log('SessionStorage keys:', Object.keys(sessionStorage));

    const wixGlobals = (window as any);
    console.log('Window.siteId:', wixGlobals.siteId);
    console.log('Window.metasiteId:', wixGlobals.metasiteId);

    // Check if there are any Wix-related objects
    const wixObjects = Object.keys(wixGlobals).filter(key =>
        key.toLowerCase().includes('wix') ||
        key.toLowerCase().includes('site')
    );
    console.log('Wix-related window objects:', wixObjects);

    return {
        url: window.location.href,
        currentSiteId: getCurrentSiteId(),
        contextSiteId: getSiteIdFromContext()
    };
};
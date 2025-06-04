
export const getCurrentSiteId = (): string | null => {
    const url = window.location.href;
    const match = url.match(/dashboard\/([a-f0-9-]{36})/);
    return match ? match[1] : null;
};
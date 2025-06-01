// utils/image-processor.ts
export const processWixImageUrl = (imageString: string): string => {
  if (!imageString || typeof imageString !== 'string') return '';

  if (imageString.startsWith('wix:image://v1/')) {
    const imageId = imageString
      .replace('wix:image://v1/', '')
      .split('#')[0]
      .split('~')[0];
    return `https://static.wixstatic.com/media/${imageId}`;
  }

  if (imageString.startsWith('wix:image://')) {
    const imageId = imageString
      .replace(/^wix:image:\/\/[^\/]*\//, '')
      .split('#')[0]
      .split('~')[0];
    return `https://static.wixstatic.com/media/${imageId}`;
  }

  if (imageString.startsWith('http')) return imageString;

  return `https://static.wixstatic.com/media/${imageString}`;
};
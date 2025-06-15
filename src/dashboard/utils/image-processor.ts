// // utils/image-processor.ts
// export const processWixImageUrl = (imageString: string): string => {
//   if (!imageString || typeof imageString !== 'string') return '';

//   if (imageString.startsWith('wix:image://v1/')) {
//     const imageId = imageString
//       .replace('wix:image://v1/', '')
//       .split('#')[0]
//       .split('~')[0];
//     return `https://static.wixstatic.com/media/${imageId}`;
//   }

//   if (imageString.startsWith('wix:image://')) {
//     const imageId = imageString
//       .replace(/^wix:image:\/\/[^\/]*\//, '')
//       .split('#')[0]
//       .split('~')[0];
//     return `https://static.wixstatic.com/media/${imageId}`;
//   }

//   if (imageString.startsWith('http')) return imageString;

//   return `https://static.wixstatic.com/media/${imageString}`;
// };

// utils/image-processor.ts - Enhanced with OrdersTable functionality

// Your existing function (kept as-is for backward compatibility)
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

// Enhanced version with optimization parameters for OrdersTable
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp';
  fit?: 'fill' | 'crop' | 'fit';
}

export const processWixImageUrlWithOptimization = (
  imageString: string,
  options: ImageOptimizationOptions = {}
): string => {
  const {
    width = 100,
    height = 100,
    quality = 80,
    format = 'jpg',
    fit = 'fill'
  } = options;

  // Get base URL using your existing function
  const baseUrl = processWixImageUrl(imageString);
  if (!baseUrl) return '';

  try {
    // If it's already a full HTTP URL, add optimization parameters
    if (baseUrl.startsWith('http')) {
      const url = new URL(baseUrl);

      // Add optimization parameters
      url.searchParams.set('w', width.toString());
      url.searchParams.set('h', height.toString());
      url.searchParams.set('fit', fit);
      url.searchParams.set('f', format);

      if (quality && quality !== 80) {
        url.searchParams.set('q', quality.toString());
      }

      return url.toString();
    }

    // For non-HTTP URLs, create optimized static URL
    const imageId = baseUrl.replace('https://static.wixstatic.com/media/', '');
    return `https://static.wixstatic.com/media/${imageId}/v1/fill/w_${width},h_${height},al_c,q_${quality},usm_0.66_1.00_0.01,enc_auto/${imageId}.${format}`;
  } catch (error) {
    console.warn('Error optimizing image URL:', error);
    return baseUrl; // Fallback to non-optimized URL
  }
};

// Extract image URL from various order item locations
export const extractImageUrl = (item: any): string => {
  const possibleImagePaths = [
    item.image,
    item.imageUrl,
    item.mediaUrl,
    item.thumbnail,
    item.catalogReference?.options?.image,
    item.productSnapshot?.image,
    item.productSnapshot?.media?.[0]?.url,
    item.catalogReference?.catalogItemId
  ];

  for (const path of possibleImagePaths) {
    if (path && typeof path === 'string' && path.trim() !== '') {
      console.log('Found image URL:', path);
      return path;
    }
  }

  console.log('No image URL found for item:', item.productName?.original);
  return '';
};

// Convert image to base64 for PDF generation
export const convertImageToBase64 = async (imageUrl: string): Promise<string> => {
  try {
    if (!imageUrl || imageUrl.trim() === '') {
      console.log('No image URL provided');
      return '';
    }

    console.log('Original image URL:', imageUrl);

    // Use your enhanced function with PDF-optimized settings
    const optimizedUrl = processWixImageUrlWithOptimization(imageUrl, {
      width: 100,
      height: 100,
      quality: 80,
      format: 'jpg',
      fit: 'fill'
    });

    console.log('Optimized image URL:', optimizedUrl);

    // Create fallback URLs using your existing function
    const urlsToTry = [
      optimizedUrl,
      processWixImageUrl(imageUrl), // Your original function as fallback
      imageUrl // Original URL as last resort
    ].filter(Boolean);

    for (const urlToTry of urlsToTry) {
      try {
        console.log('Trying URL:', urlToTry);

        const response = await fetch(urlToTry, {
          mode: 'cors',
          headers: {
            'Accept': 'image/*'
          }
        });

        if (!response.ok) {
          console.warn(`HTTP error for ${urlToTry}! status: ${response.status}`);
          continue;
        }

        const blob = await response.blob();
        console.log('Image blob size:', blob.size, 'bytes');

        if (blob.size === 0) {
          console.warn('Empty blob received');
          continue;
        }

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            console.log('Base64 conversion successful, length:', result.length);
            resolve(result);
          };
          reader.onerror = () => reject(new Error('Failed to convert image to base64'));
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn(`Failed to fetch from ${urlToTry}:`, error);
        continue;
      }
    }

    throw new Error('All image URL attempts failed');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return '';
  }
};

// Utility function for different image size presets
export const getImagePresets = () => ({
  thumbnail: { width: 50, height: 50, quality: 70 },
  small: { width: 100, height: 100, quality: 80 },
  medium: { width: 200, height: 200, quality: 85 },
  large: { width: 400, height: 400, quality: 90 },
  print: { width: 100, height: 100, quality: 80, format: 'jpg' as const }
});

// Convenience functions using presets
export const getWixImageThumbnail = (imageString: string): string => {
  return processWixImageUrlWithOptimization(imageString, getImagePresets().thumbnail);
};

export const getWixImageForPrint = (imageString: string): string => {
  return processWixImageUrlWithOptimization(imageString, getImagePresets().print);
};

export const getWixImageMedium = (imageString: string): string => {
  return processWixImageUrlWithOptimization(imageString, getImagePresets().medium);
};

// Backward compatibility - alias your original function
export const convertWixImageUrl = processWixImageUrl;
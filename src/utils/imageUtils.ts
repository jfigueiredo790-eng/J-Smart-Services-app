import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Checks if an avatar URL is an Unsplash/stock/fake placeholder
 * that should NOT be displayed as a real user profile photo.
 */
export const isStockOrFictitiousAvatar = (avatarUrl?: string | null): boolean => {
  if (!avatarUrl || typeof avatarUrl !== 'string') return true;
  const trimmed = avatarUrl.trim();
  if (trimmed === '') return true;
  
  if (
    trimmed.includes('unsplash.com') || 
    trimmed.includes('example.com') || 
    trimmed.includes('via.placeholder.com') ||
    trimmed.includes('placeholder.com') ||
    trimmed.includes('pravatar.cc') ||
    trimmed.includes('ui-avatars.com')
  ) {
    return true;
  }
  return false;
};

/**
 * Returns clean user initials for avatar fallback (e.g., "Mateus Agostinho" -> "MA")
 */
export const getUserInitials = (name?: string): string => {
  if (!name || typeof name !== 'string') return 'JS';
  const cleanName = name.trim().replace(/\s+/g, ' ');
  if (!cleanName) return 'JS';
  
  const parts = cleanName.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Utility to compress and resize images from camera or device gallery.
 * Handles mobile formats (JPEG, PNG, WEBP, HEIC/HEIF converted by browser).
 * Guaranteed to NEVER hang with an internal timeout fallback.
 * Converts large Megapixel photos into optimized JPEG Data URLs (~15KB-35KB for avatars).
 */
export const compressImageFile = (
  file: File, 
  maxDimension = 500, 
  quality = 0.80
): Promise<string> => {
  return new Promise((resolve) => {
    // Safety fail-safe timeout: never let the app hang on slow or non-responsive mobile decoders
    const safetyTimeout = setTimeout(() => {
      console.warn('compressImageFile timeout de segurança atingido, tentando conversão directa');
      // If canvas took too long or stalled, read raw file as fallback
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => resolve((fallbackReader.result as string) || '');
      fallbackReader.onerror = () => resolve('');
      fallbackReader.readAsDataURL(file);
    }, 4000);

    const cleanupAndResolve = (result: string) => {
      clearTimeout(safetyTimeout);
      resolve(result);
    };

    try {
      const reader = new FileReader();
      
      reader.onerror = () => {
        console.warn('Erro no FileReader ao ler ficheiro de imagem');
        cleanupAndResolve('');
      };

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          cleanupAndResolve('');
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onerror = () => {
          console.warn('Formato de imagem não decodificado pelo Image(), usando fallback direto');
          // If Image() fails to decode (e.g. rare format), return the original dataUrl
          cleanupAndResolve(dataUrl);
        };

        img.onload = () => {
          try {
            let width = img.naturalWidth || img.width || maxDimension;
            let height = img.naturalHeight || img.height || maxDimension;

            if (width <= 0 || height <= 0) {
              cleanupAndResolve(dataUrl);
              return;
            }

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.max(1, Math.round((height * maxDimension) / width));
                width = maxDimension;
              } else {
                width = Math.max(1, Math.round((width * maxDimension) / height));
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              cleanupAndResolve(dataUrl);
              return;
            }

            // High quality downsampling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const compressed = canvas.toDataURL('image/jpeg', quality);
            cleanupAndResolve(compressed || dataUrl);
          } catch (canvasErr) {
            console.warn('Erro no canvas durante a compressão, usando DataURL original:', canvasErr);
            cleanupAndResolve(dataUrl);
          }
        };

        img.src = dataUrl;
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Exceção ao ler imagem:', err);
      cleanupAndResolve('');
    }
  });
};

/**
 * Uploads a profile photo to storage and returns a valid photo URL.
 * Guarantees zero-hang execution:
 * 1. Rapidly compresses image into a lightweight ~15KB-30KB high-clarity JPEG.
 * 2. Attempts Firebase Storage upload with a strict 2.0-second race.
 * 3. If Firebase Storage succeeds, returns public download URL.
 * 4. If Firebase Storage fails, times out, or has permission/CORS restrictions,
 *    returns the compressed Data URL directly for immediate Firestore persistence.
 */
export const uploadProfilePhotoToStorage = async (
  fileOrDataUrl: File | string,
  userId: string
): Promise<{ success: boolean; url: string; storagePath?: string; error?: string }> => {
  if (!userId) {
    return { success: false, url: '', error: 'Identificador de utilizador inválido.' };
  }

  let compressedDataUrl = '';

  try {
    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
        return { success: true, url: fileOrDataUrl };
      }
      compressedDataUrl = fileOrDataUrl;
    } else {
      compressedDataUrl = await compressImageFile(fileOrDataUrl, 450, 0.80);
    }

    if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/')) {
      return { success: false, url: '', error: 'Não foi possível ler esta imagem. Tente outra foto da sua galeria.' };
    }

    const timestamp = Date.now();
    const cleanUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `profile_photos/${cleanUserId}_${timestamp}.jpg`;

    // Attempt Firebase Storage with a strict 1.8-second timeout race
    const storagePromise = (async () => {
      try {
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadString(storageRef, compressedDataUrl, 'data_url', {
          contentType: 'image/jpeg'
        });
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        return { success: true, url: downloadUrl, storagePath };
      } catch (err: any) {
        return { success: false, url: '', error: err?.message || 'Storage error' };
      }
    })();

    const timeoutPromise = new Promise<{ success: false; url: ''; error: string }>((res) => {
      setTimeout(() => res({ success: false, url: '', error: 'Storage timeout' }), 1800);
    });

    const storageOutcome = await Promise.race([storagePromise, timeoutPromise]);

    if (storageOutcome.success && storageOutcome.url) {
      return {
        success: true,
        url: storageOutcome.url,
        storagePath: storageOutcome.storagePath
      };
    }

    // High-performance fallback: Data URL is persisted directly into Firestore & localStorage
    return {
      success: true,
      url: compressedDataUrl
    };
  } catch (err: any) {
    console.error('Erro no processamento da imagem de perfil:', err);
    if (compressedDataUrl && compressedDataUrl.startsWith('data:image/')) {
      return {
        success: true,
        url: compressedDataUrl
      };
    }
    return {
      success: false,
      url: '',
      error: err.message || 'Erro ao processar imagem de perfil.'
    };
  }
};

/**
 * Uploads a work feed post photo with fail-safe fallback.
 */
export const uploadWorkPostImageToStorage = async (
  fileOrDataUrl: File | string,
  userId: string
): Promise<{ success: boolean; url: string; storagePath?: string; error?: string }> => {
  if (!userId) {
    return { success: false, url: '', error: 'Identificador de utilizador inválido.' };
  }

  let compressedDataUrl = '';

  try {
    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
        return { success: true, url: fileOrDataUrl };
      }
      compressedDataUrl = fileOrDataUrl;
    } else {
      compressedDataUrl = await compressImageFile(fileOrDataUrl, 1000, 0.82);
    }

    if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/')) {
      return { success: false, url: '', error: 'Formato de imagem inválido.' };
    }

    const timestamp = Date.now();
    const cleanUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `work_photos/${cleanUserId}_${timestamp}.jpg`;

    // Attempt Firebase Storage with a strict 2.0-second race
    const storagePromise = (async () => {
      try {
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadString(storageRef, compressedDataUrl, 'data_url', {
          contentType: 'image/jpeg'
        });
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        return { success: true, url: downloadUrl, storagePath };
      } catch (err: any) {
        return { success: false, url: '', error: err?.message || 'Storage error' };
      }
    })();

    const timeoutPromise = new Promise<{ success: false; url: ''; error: string }>((res) => {
      setTimeout(() => res({ success: false, url: '', error: 'Storage timeout' }), 2000);
    });

    const storageOutcome = await Promise.race([storagePromise, timeoutPromise]);

    if (storageOutcome.success && storageOutcome.url) {
      return {
        success: true,
        url: storageOutcome.url,
        storagePath: storageOutcome.storagePath
      };
    }

    return {
      success: true,
      url: compressedDataUrl
    };
  } catch (err: any) {
    console.error('Erro no processamento da imagem de trabalho:', err);
    if (compressedDataUrl && compressedDataUrl.startsWith('data:image/')) {
      return {
        success: true,
        url: compressedDataUrl
      };
    }
    return {
      success: false,
      url: '',
      error: err.message || 'Erro ao processar imagem da publicação.'
    };
  }
};



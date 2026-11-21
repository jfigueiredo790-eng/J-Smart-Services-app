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
export const compressImageFile = async (
  file: File, 
  maxDimension = 500, 
  quality = 0.80
): Promise<string> => {
  // Fast path: use native createImageBitmap if supported (skips intermediate FileReader base64 overhead)
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > 0 && height > 0) {
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
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, width, height);
          if (typeof bitmap.close === 'function') {
            bitmap.close();
          }
          const compressed = canvas.toDataURL('image/jpeg', quality);
          if (compressed && compressed.startsWith('data:image/jpeg')) {
            return compressed;
          }
        }
      }
    } catch (bitmapErr) {
      // Fall through to FileReader fallback if bitmap decoding fails on certain custom camera formats
    }
  }

  // Robust fallback: FileReader + HTMLImageElement with safety timeout
  return new Promise((resolve) => {
    // Safety fail-safe timeout: never let the app hang on slow or non-responsive mobile decoders
    const safetyTimeout = setTimeout(() => {
      console.warn('compressImageFile timeout de segurança atingido, tentando conversão directa');
      // If canvas took too long or stalled, read raw file as fallback
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => resolve((fallbackReader.result as string) || '');
      fallbackReader.onerror = () => resolve('');
      fallbackReader.readAsDataURL(file);
    }, 3000);

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
      compressedDataUrl = await compressImageFile(fileOrDataUrl, 380, 0.76);
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
      compressedDataUrl = await compressImageFile(fileOrDataUrl, 900, 0.78);
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

/**
 * Processes and uploads a private payment proof (image or PDF) to `payment_proofs/{userId}/...`.
 * Compresses images to keep receipts sharp and compact, attempts Firebase Storage upload,
 * and falls back safely to a Firestore-compatible Data URL if Storage is unavailable/unconfigured.
 */
export const uploadPaymentProofToStorage = async (
  file: File,
  userId: string
): Promise<{ success: boolean; url: string; fileType: 'image' | 'pdf'; storagePath?: string; error?: string }> => {
  if (!userId) {
    return { success: false, url: '', fileType: 'image', error: 'Sessão inválida. Inicie sessão novamente.' };
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const fileMime = file.type.toLowerCase();
  const isPdf = fileMime === 'application/pdf' || fileExt === 'pdf';
  const isImage = !isPdf && (fileMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt));

  if (!isPdf && !isImage) {
    return {
      success: false,
      url: '',
      fileType: 'image',
      error: 'Formato inválido. Selecione uma imagem (JPG, JPEG, PNG, WEBP) ou documento PDF.'
    };
  }

  const cleanUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeBaseName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || (isPdf ? 'comprovativo.pdf' : 'comprovativo.jpg');
  const timestamp = Date.now();
  const storagePath = `payment_proofs/${cleanUserId}/${timestamp}_${safeBaseName}`;

  if (isPdf) {
    // Attempt Firebase Storage upload first for PDFs (especially >700KB)
    try {
      const storagePromise = (async () => {
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        return { success: true as const, url: downloadUrl, fileType: 'pdf' as const, storagePath };
      })();
      const timeoutPromise = new Promise<{ success: false }>((res) => setTimeout(() => res({ success: false }), 3500));
      const outcome = await Promise.race([storagePromise, timeoutPromise]);
      if (outcome.success) {
        return outcome;
      }
    } catch {
      // Fallback below for smaller PDFs
    }

    if (file.size > 700 * 1024) {
      return {
        success: false,
        url: '',
        fileType: 'pdf',
        error: 'O ficheiro PDF é demasiado grande para envio direto (>700 KB). Tente um PDF menor ou envie uma captura de ecrã (imagem).'
      };
    }

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

    if (!dataUrl.startsWith('data:application/pdf')) {
      return { success: false, url: '', fileType: 'pdf', error: 'Não foi possível ler o documento PDF.' };
    }
    return { success: true, url: dataUrl, fileType: 'pdf' };
  }

  // Image proof: high legibility compression (1400px max dimension, quality 0.82)
  const compressedDataUrl = await compressImageFile(file, 1400, 0.82);
  if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/')) {
    return { success: false, url: '', fileType: 'image', error: 'Não foi possível ler a imagem do comprovativo.' };
  }

  try {
    const storagePromise = (async () => {
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadString(storageRef, compressedDataUrl, 'data_url', {
        contentType: 'image/jpeg'
      });
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      return { success: true as const, url: downloadUrl, fileType: 'image' as const, storagePath };
    })();
    const timeoutPromise = new Promise<{ success: false }>((res) => setTimeout(() => res({ success: false }), 2500));
    const outcome = await Promise.race([storagePromise, timeoutPromise]);
    if (outcome.success) {
      return outcome;
    }
  } catch {
    // Safe fallback to compressed Data URL in owner-private Firestore doc
  }

  return { success: true, url: compressedDataUrl, fileType: 'image' };
};




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
 * Converts large Megapixel photos into optimized JPEG Data URLs (~30KB-60KB).
 */
export const compressImageFile = (
  file: File, 
  maxDimension = 600, 
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (file.type && !validTypes.includes(file.type.toLowerCase())) {
      console.warn('Tipo de imagem não padrão, prosseguindo com conversão canvas:', file.type);
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(new Error('Falha ao ler o ficheiro da galeria.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido ou corrompido.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Draw with smooth interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (e) {
          resolve(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a profile photo to Firebase Storage under profile_photos/{userId}_{timestamp}.jpg
 * and retrieves the permanent public download URL.
 * Falls back gracefully to the optimized compressed Data URL if Storage permissions/CORS fail,
 * guaranteeing the photo is NEVER lost and is saved in Firestore.
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
      compressedDataUrl = fileOrDataUrl;
    } else {
      compressedDataUrl = await compressImageFile(fileOrDataUrl, 600, 0.85);
    }

    if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/')) {
      // If it's already an external HTTP URL, return as is
      if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
        return { success: true, url: fileOrDataUrl };
      }
      return { success: false, url: '', error: 'Formato de imagem inválido.' };
    }

    const timestamp = Date.now();
    const storagePath = `profile_photos/${userId}_${timestamp}.jpg`;
    const storageRef = ref(storage, storagePath);

    try {
      // Attempt upload to Firebase Storage
      const uploadResult = await uploadString(storageRef, compressedDataUrl, 'data_url', {
        contentType: 'image/jpeg'
      });
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      return {
        success: true,
        url: downloadUrl,
        storagePath
      };
    } catch (storageError: any) {
      console.warn('Firebase Storage upload notice (usando fallback persistente no Firestore):', storageError.message || storageError);
      // Fallback: Return the high-quality compressed DataURL (~30KB) which is saved directly to Firestore
      return {
        success: true,
        url: compressedDataUrl,
        error: storageError.message
      };
    }
  } catch (err: any) {
    console.error('Erro ao processar e fazer upload da imagem:', err);
    return {
      success: false,
      url: '',
      error: err.message || 'Erro ao processar imagem de perfil.'
    };
  }
};

/**
 * Uploads a work feed post photo to Firebase Storage under work_photos/{userId}_{timestamp}.jpg
 * and retrieves the permanent public download URL.
 * Falls back gracefully to the optimized compressed Data URL if Storage permissions/CORS fail,
 * guaranteeing the work photo is NEVER lost and is saved in Firestore.
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
      compressedDataUrl = fileOrDataUrl;
    } else {
      compressedDataUrl = await compressImageFile(fileOrDataUrl, 1200, 0.85);
    }

    if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/')) {
      if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
        return { success: true, url: fileOrDataUrl };
      }
      return { success: false, url: '', error: 'Formato de imagem inválido.' };
    }

    const timestamp = Date.now();
    const storagePath = `work_photos/${userId}_${timestamp}.jpg`;
    const storageRef = ref(storage, storagePath);

    try {
      const uploadResult = await uploadString(storageRef, compressedDataUrl, 'data_url', {
        contentType: 'image/jpeg'
      });
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      return {
        success: true,
        url: downloadUrl,
        storagePath
      };
    } catch (storageError: any) {
      console.warn('Firebase Storage work photo upload notice (fallback persistente no Firestore):', storageError.message || storageError);
      return {
        success: true,
        url: compressedDataUrl,
        error: storageError.message
      };
    }
  } catch (err: any) {
    console.error('Erro ao processar e fazer upload da imagem de trabalho:', err);
    return {
      success: false,
      url: '',
      error: err.message || 'Erro ao processar imagem da publicação.'
    };
  }
};



export const useFileValidation = () => {
  const validatePaymentProofFile = async (file: File): Promise<string | null> => {
    // Size check: max 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum 5MB allowed.';
    }
    
    if (file.size < 1024) {
      return 'File too small. Minimum 1KB required.';
    }
    
    // Type check: only specific image types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only JPG and PNG images allowed.';
    }
    
    // Block SVG explicitly (can contain JavaScript)
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      return 'SVG files not allowed for security reasons.';
    }
    
    // Verify magic numbers (file signature)
    try {
      const buffer = await file.arrayBuffer();
      const header = new Uint8Array(buffer.slice(0, 4));
      
      // JPEG: FF D8 FF
      const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
      
      // PNG: 89 50 4E 47
      const isPNG = header[0] === 0x89 && header[1] === 0x50 && 
                    header[2] === 0x4E && header[3] === 0x47;
      
      if (!isJPEG && !isPNG) {
        return 'File signature does not match a valid image format.';
      }
    } catch (error) {
      return 'Could not verify file format.';
    }
    
    return null; // Valid
  };

  return { validatePaymentProofFile };
};

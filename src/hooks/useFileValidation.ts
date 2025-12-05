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

  const validateTicketFile = async (file: File): Promise<string | null> => {
    // Size check: max 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum 10MB allowed.';
    }
    
    if (file.size < 1024) {
      return 'File too small. Minimum 1KB required.';
    }
    
    // Allowed types for tickets: images, videos, PDFs
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf'
    ];
    
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.mp4', '.webm', '.mov', '.pdf'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      return 'Invalid file type. Allowed: JPG, PNG, MP4, WebM, MOV, PDF.';
    }
    
    // Block SVG explicitly (can contain JavaScript)
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      return 'SVG files not allowed for security reasons.';
    }
    
    // Verify magic numbers for images and PDFs
    try {
      const buffer = await file.arrayBuffer();
      const header = new Uint8Array(buffer.slice(0, 8));
      
      // JPEG: FF D8 FF
      const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
      
      // PNG: 89 50 4E 47
      const isPNG = header[0] === 0x89 && header[1] === 0x50 && 
                    header[2] === 0x4E && header[3] === 0x47;
      
      // PDF: 25 50 44 46 (%PDF)
      const isPDF = header[0] === 0x25 && header[1] === 0x50 && 
                    header[2] === 0x44 && header[3] === 0x46;
      
      // MP4/MOV: ftyp at offset 4-7
      const isMp4OrMov = header[4] === 0x66 && header[5] === 0x74 && 
                         header[6] === 0x79 && header[7] === 0x70;
      
      // WebM: 1A 45 DF A3
      const isWebM = header[0] === 0x1A && header[1] === 0x45 && 
                     header[2] === 0xDF && header[3] === 0xA3;
      
      const isValidSignature = isJPEG || isPNG || isPDF || isMp4OrMov || isWebM;
      
      if (!isValidSignature) {
        // Allow through if extension matches but signature check fails (some valid files may have different signatures)
        if (!allowedExtensions.includes(fileExt)) {
          return 'File signature does not match expected format.';
        }
      }
    } catch (error) {
      return 'Could not verify file format.';
    }
    
    return null; // Valid
  };

  return { validatePaymentProofFile, validateTicketFile };
};

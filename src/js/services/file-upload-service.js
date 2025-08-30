const supportedFileTypes = {
  template: ['.xlsx', '.xls', '.csv', '.json'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.svg'],
  document: ['.pdf', '.doc', '.docx', '.txt']
};
const maxFileSize = 10 * 1024 * 1024; // 10MB

/**
 * Validate file before upload
 */
function validateFile(file, type = 'template') {
  const errors = [];

  if (!file) {
    errors.push('No file selected');
    return errors;
  }

  // Check file size
  if (file.size > maxFileSize) {
    errors.push(`File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`);
  }

  // Check file type
  const allowedTypes = supportedFileTypes[type] || [];
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

  if (allowedTypes.length > 0 && !allowedTypes.includes(fileExtension)) {
    errors.push(`File type not supported. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return errors;
}

/**
 * Read file content based on file type
 */
async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    reader.onload = (event) => {
      try {
        const content = event.target.result;

        switch (fileExtension) {
          case '.json':
            resolve(JSON.parse(content));
            break;
          case '.csv':
            resolve(_parseCSV(content));
            break;
          case '.txt':
            resolve(content);
            break;
          default:
            resolve(content);
        }
      } catch (error) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read as text for most file types
    if (['.json', '.csv', '.txt'].includes(fileExtension)) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * Parse CSV content into array of objects
 */
function _parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = _parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = _parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      data.push(row);
    }
  }

  return data;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function _parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i - 1] === ',')) {
      inQuotes = true;
    } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
      inQuotes = false;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/**
 * Create file download
 */
function downloadFile(content, filename, contentType = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Upload file with progress tracking
 */
async function uploadFileWithProgress(file, uploadUrl, onProgress = null) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          resolve({ success: true, message: 'File uploaded successfully' });
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

/**
 * Create a file preview for supported file types
 */
async function createFilePreview(file) {
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

  if (supportedFileTypes.image.includes(fileExtension)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  if (['.json', '.csv', '.txt'].includes(fileExtension)) {
    try {
      const content = await readFile(file);
      return {
        type: 'text',
        content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      };
    } catch (error) {
      return { type: 'error', content: `Failed to preview file: ${error.message}` };
    }
  }

  return { type: 'info', content: `Preview not available for ${fileExtension} files` };
}

/**
 * Get file information
 */
function getFileInfo(file) {
  return {
    name: file.name,
    size: file.size,
    sizeFormatted: _formatFileSize(file.size),
    type: file.type,
    extension: '.' + file.name.split('.').pop().toLowerCase(),
    lastModified: new Date(file.lastModified)
  };
}

/**
 * Format file size for display
 */
function _formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
  validateFile,
  readFile,
  downloadFile,
  uploadFileWithProgress,
  createFilePreview,
  getFileInfo
};

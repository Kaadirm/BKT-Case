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
  getFileInfo
};

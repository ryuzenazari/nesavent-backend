/**
 * Utilitas untuk format respons API yang konsisten
 */

/**
 * Format respons sukses standar
 * @param {Object} res - Response object
 * @param {String} message - Pesan sukses
 * @param {*} data - Data yang ingin dikembalikan ke client
 * @param {Number} statusCode - Status code HTTP (default: 200)
 */
const success = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message: message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Format respons error standar
 * @param {Object} res - Response object
 * @param {String} message - Pesan error
 * @param {*} errors - Detail error (opsional)
 * @param {Number} statusCode - Status code HTTP (default: 500)
 */
const error = (res, message, errors = null, statusCode = 500) => {
  const response = {
    success: false,
    message: message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Format respons untuk data dengan pagination
 * @param {Object} res - Response object
 * @param {String} message - Pesan sukses
 * @param {Array} data - Data yang ingin dikembalikan
 * @param {Object} pagination - Informasi pagination (total, page, limit, pages)
 * @param {Number} statusCode - Status code HTTP (default: 200)
 */
const paginated = (res, message, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message: message,
    data: data,
    pagination: pagination
  });
};

/**
 * Format respons untuk data tidak ditemukan
 * @param {Object} res - Response object
 * @param {String} message - Pesan error (default: "Data tidak ditemukan")
 */
const notFound = (res, message = "Data tidak ditemukan") => {
  return res.status(404).json({
    success: false,
    message: message
  });
};

/**
 * Format respons untuk unauthorized access
 * @param {Object} res - Response object
 * @param {String} message - Pesan error (default: "Akses tidak diizinkan")
 */
const unauthorized = (res, message = "Akses tidak diizinkan") => {
  return res.status(401).json({
    success: false,
    message: message
  });
};

/**
 * Format respons untuk forbidden access
 * @param {Object} res - Response object
 * @param {String} message - Pesan error (default: "Tidak memiliki izin")
 */
const forbidden = (res, message = "Tidak memiliki izin") => {
  return res.status(403).json({
    success: false,
    message: message
  });
};

/**
 * Format respons untuk validasi error
 * @param {Object} res - Response object
 * @param {String} message - Pesan error (default: "Validasi gagal")
 * @param {Array} errors - Detail validasi error
 */
const validationError = (res, message = "Validasi gagal", errors) => {
  return res.status(400).json({
    success: false,
    message: message,
    errors: errors
  });
};

module.exports = {
  success,
  error,
  paginated,
  notFound,
  unauthorized,
  forbidden,
  validationError
}; 
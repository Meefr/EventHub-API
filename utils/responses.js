/**
 * Standard API response generator
 */
class ApiResponse {
    /**
     * Create a successful response
     * @param {object} res - Express response object
     * @param {string} message - Success message
     * @param {*} data - Response data
     * @param {number} statusCode - HTTP status code
     */
    static success(res, message, data = null, statusCode = 200) {
      return res.status(statusCode).json({
        success: true,
        message,
        data
      });
    }
  
    /**
     * Create a paged response with pagination metadata
     * @param {object} res - Express response object
     * @param {string} message - Success message
     * @param {*} data - Response data array
     * @param {object} pagination - Pagination metadata
     * @param {number} statusCode - HTTP status code
     */
    static paged(res, message, data, pagination, statusCode = 200) {
      return res.status(statusCode).json({
        success: true,
        message,
        data,
        pagination
      });
    }
  
    /**
     * Create an error response
     * @param {object} res - Express response object
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    static error(res, message, statusCode = 400) {
      return res.status(statusCode).json({
        success: false,
        error: message
      });
    }
  
    /**
     * Create a not found response
     * @param {object} res - Express response object
     * @param {string} message - Not found message
     */
    static notFound(res, message = 'Resource not found') {
      return this.error(res, message, 404);
    }
  
    /**
     * Create an unauthorized response
     * @param {object} res - Express response object
     * @param {string} message - Unauthorized message
     */
    static unauthorized(res, message = 'Unauthorized access') {
      return this.error(res, message, 401);
    }
  
    /**
     * Create a forbidden response
     * @param {object} res - Express response object
     * @param {string} message - Forbidden message
     */
    static forbidden(res, message = 'Forbidden') {
      return this.error(res, message, 403);
    }
  }
  
  module.exports = ApiResponse;
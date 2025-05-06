/**
 * Role configuration for the application
 */
const roles = {
    ADMIN: 'admin',
    ORGANIZER: 'organizer',
    USER: 'user'
  };
  
  /**
   * Permission definitions for different roles
   */
  const permissions = {
    [roles.ADMIN]: [
      'manage_users',
      'view_users',
      'create_event',
      'update_event',
      'delete_event',
      'approve_event',
      'view_event',
      'view_all_events',
      'create_booking',
      'view_booking',
      'view_all_bookings',
      'delete_booking',
      'manage_categories',
      'manage_tags'
    ],
    [roles.ORGANIZER]: [
      'create_event',
      'update_own_event',
      'delete_own_event',
      'view_event',
      'view_own_events',
      'view_own_event_bookings',
      'manage_own_categories',
      'manage_own_tags'
    ],
    [roles.USER]: [
      'view_event',
      'create_booking',
      'view_own_bookings',
      'cancel_own_booking'
    ]
  };
  
  module.exports = {
    roles,
    permissions,
    getPermissions: (role) => permissions[role] || []
  };
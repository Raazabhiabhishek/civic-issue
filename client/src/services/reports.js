import api from './api'

export const reportsService = {
  getAll: (params) => api.get('/reports', { params }),
  getNearbyIssues: (params) => api.get('/issues/nearby', { params }),

  detectImage: (formData) =>
    api.post('/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getById: (id) => api.get(`/reports/${id}`),

  create: (formData) =>
    api.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getIssueById: (id) => api.get(`/issues/${id}`),

  updateStatus: (id, payloadOrStatus, adminNotes) => {
    const payload =
      typeof payloadOrStatus === 'object'
        ? payloadOrStatus
        : { status: payloadOrStatus, adminNotes }

    return api.patch(`/reports/${id}/status`, payload)
  },

  updateIssueStatus: (id, payload) => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData
    if (isFormData) {
      return api.patch(`/issues/${id}/status`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.patch(`/issues/${id}/status`, payload)
  },

  upvote: (id) => api.post(`/reports/${id}/upvote`),

  addComment: (id, text) => api.post(`/reports/${id}/comment`, { text }),

  delete: (id) => api.delete(`/reports/${id}`),
}

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markAllRead: () => api.patch('/notifications/read-all'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
}

export const adminService = {
  getAnalytics: () => api.get('/admin/analytics'),
  getReports: (params) => api.get('/admin/reports', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  getWorkers: () => api.get('/admin/workers'),
  toggleUser: (id) => api.patch(`/admin/users/${id}/toggle`),
}
